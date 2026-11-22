import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const migrations=['0000_clubhouse.sql','0001_access_and_meetings.sql','0002_stock.sql','0003_stock_history.sql','0007_members_and_conversation.sql','0014_merch_orders.sql','0015_fees_and_alerts.sql','0016_stock_costs.sql','0041_shop_listings.sql'];
const origin='https://club.example', settings='/api/stock/shop', publicOffers='/api/shop/offers', intake='/api/shop/requests';
const future=()=>new Date(Date.now()+2*86400000+36000000).toISOString().slice(0,16);
async function sandbox(t) {
  const env={DB:database(t,migrations),PRIVATE_AUTH_KEY:'fictional-test-key'};
  async function account(role) {
    const token=randomBytes(32).toString('hex');
    await env.DB.batch([
      env.DB.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',1,'2099-12-31')").bind(role,role,role),
      env.DB.prepare('INSERT INTO club_sessions VALUES(?,?,?)').bind(createHash('sha256').update(token).digest('hex'),role,Math.floor(Date.now()/1000)+3600),
    ]);
    return '__Host-plfc_session='+token;
  }
  const treasurer=await account('treasurer'), committee=await account('committee');
  async function req(path,method='GET',data,cookie,other={}) {
    const headers={Origin:origin,...other};
    if(data)headers['Content-Type']='application/json';
    if(cookie)headers.Cookie=cookie;
    return handleRequest(new Request(origin+path,{method,headers,body:data?JSON.stringify(data):undefined}),env);
  }
  return {db:env.DB,req,treasurer,committee};
}
const make=(extra={})=>({requestId:randomUUID(),kind:'pickup',productId:'shirt',name:'Example buyer',email:'buyer@example.invalid',mobile:'',
  quantity:2,size:'',message:'',consent:true,...extra});
const base=(number,extra={})=>({version:0,confirmed:true,priceCents:number,sizes:[],checkoutUrl:null,...extra});

test('public offers only publish treasurer-confirmed price, size and recognised Square links, with stale bulk edits all or nothing',async t=>{
  const {req,treasurer,committee,db}=await sandbox(t);
  const get=async()=>await(await req(publicOffers)).json();
  assert.equal((await req(settings)).status,401);assert.equal((await req(settings,'GET',null,committee)).status,403);
  assert.ok((await get()).offers.every(o=>o.priceCents===null&&o.checkoutUrl===null));
  const square='https://square.link/u/Abc12345';
  assert.equal((await req(settings+'/cooler','PUT',base(1500,{checkoutUrl:square}),treasurer)).status,400);
  for(const link of ['https://square.link.example/u/Abc123','https://square.link@other.example/u/Abc123','http://square.link/u/Abc123','https://square.link/u/Abc123?redirect=https://other.example','https://square.link/u/A%2fb123','a payment link'])
    assert.equal((await req(settings+'/cooler','PUT',base(1500,{checkoutUrl:link}),treasurer)).status,400);
  assert.equal((await req(settings+'/shirt','PUT',base(3000,{checkoutUrl:square}),treasurer)).status,400);
  assert.equal((await req(settings+'/shirt','PUT',base(null,{sizes:['M'],checkoutUrl:square}),treasurer)).status,400);
  const first=base(3000,{sizes:['M','L'],checkoutUrl:square+'?src=sheet',checkoutReconfirmed:true});
  assert.equal((await req(settings+'/shirt','PUT',first,committee)).status,403);
  assert.equal((await req(settings+'/shirt','PUT',first,treasurer)).status,200);
  assert.equal((await req(settings+'/shirt','PUT',first,treasurer)).status,200);
  const shop=(await get()).offers;
  const staffOffers=await(await req(settings+'/offers','GET',null,treasurer)).json();
  assert.deepEqual(Object.keys(staffOffers),['offers']);assert.equal(staffOffers.offers.find(o=>o.productId==='shirt').version,1);
  assert.deepEqual(shop.find(o=>o.productId==='shirt'),{productId:'shirt',priceCents:3000,sizes:['M','L'],checkoutUrl:square});
  assert.deepEqual(Object.keys(shop[0]).sort(),['checkoutUrl','priceCents','productId','sizes']);
  const both={confirmed:true,offers:[{productId:'shirt',...base(3200,{version:1,checkoutUrl:square,sizes:['M','L']})},{productId:'cooler',...base(1000)}]};
  assert.equal((await req(settings,'PUT',{...both,offers:[both.offers[0],{...both.offers[1],version:9}]},treasurer)).status,409);
  assert.equal((await get()).offers.find(r=>r.productId==='shirt').priceCents,3000);
  assert.equal((await req(settings,'PUT',both,treasurer)).status,200);assert.equal((await req(settings,'PUT',both,treasurer)).status,200);
  assert.equal((await get()).offers.find(r=>r.productId==='shirt').checkoutUrl,null);
  const long='https://checkout.square.site/merchant/SELLER123/checkout/ITEM12345';
  const newer=base(3300,{version:2,sizes:['M','L'],checkoutUrl:long,checkoutReconfirmed:true});
  assert.equal((await req(settings+'/shirt','PUT',newer,treasurer)).status,200);
  assert.equal((await get()).offers.find(r=>r.productId==='shirt').checkoutUrl,long);
  const logs=await db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='shop_offer_confirmed'").first();assert.equal(logs.n,4);
  const onlySizes={...newer,version:3,sizes:['M','L','XL'],checkoutReconfirmed:false};
  assert.equal((await req(settings+'/shirt','PUT',onlySizes,treasurer)).status,200);
  assert.equal((await get()).offers.find(r=>r.productId==='shirt').checkoutUrl,null);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM officer_price_changes WHERE kind='merchandise' AND actor_id='treasurer'").first()).n,4);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM officer_price_recipients WHERE recipient='account:committee'").first()).n,4);
});

test('public request privacy, consent, duplicate receipts, size validation, origin and rate limit',async t=>{
  const {req,treasurer,committee}=await sandbox(t);
  await req(settings+'/shirt','PUT',base(3000,{sizes:['S','M']}),treasurer);
  const form=make({size:'M'});
  assert.equal((await req(intake,'POST',{...form,size:'XL'})).status,409);
  assert.equal((await req(intake,'POST',{...form,consent:false})).status,400);
  assert.equal((await req(intake,'POST',{...form,email:'',mobile:''})).status,400);
  assert.equal((await req(intake,'POST',{...form,kind:'enquiry'})).status,400);
  assert.equal((await req(intake,'POST',form,null,{Origin:'https://elsewhere.invalid'})).status,403);
  const first=await req(intake,'POST',form);assert.equal(first.status,201);const receipt=await first.json();
  assert.deepEqual(Object.keys(receipt).sort(),['kind','reference','status']);assert.match(receipt.reference,/^PLFC-[A-F0-9]{12}$/);
  assert.equal((await req(intake,'POST',form)).status,200);
  assert.equal((await req(intake,'POST',{...form,name:'Someone else'})).status,409);
  assert.equal((await req(intake)).status,405);
  assert.equal((await req(settings,'GET',null,committee)).status,403);
  const listing=await(await req(settings,'GET',null,treasurer)).json();
  assert.equal(listing.requests[0].email,form.email);assert.equal(listing.requests[0].listedUnitCents,3000);
  for(let i=0;i<9;i++)assert.equal((await req(intake,'POST',make({kind:'enquiry',message:'Is a smaller size available?'}))).status,201);
  assert.equal((await req(intake,'POST',make({size:'M'}))).status,429);
  assert.equal((await req(intake,'POST',form)).status,200);
});

test('confirmed pickups reserve actual units, manual sales respect holds, and collecting posts once to stock and audit',async t=>{
  const {req,treasurer,db}=await sandbox(t);
  async function order(qty) {
    const create=await req(intake,'POST',make({quantity:qty}));
    assert.equal(create.status,201);return '/api/stock/requests/'+(await create.json()).reference;
  }
  const first=await order(3),second=await order(2);
  const move=(kind,units,revision,amountCents)=>req('/api/stock','POST',{id:randomUUID(),kind,units,itemId:'shirt-member',revision,...(kind==='sale'?{amountCents}:{})},treasurer);
  const action=(path,data)=>req(path,'POST',data,treasurer);
  const confirm={version:1,action:'confirmed',itemId:'shirt-member',stockRevision:0,quoteCents:9000,pickupDetails:'Meet at the club table.',pickupAt:future()};
  assert.equal((await action(first,confirm)).status,409);
  assert.equal((await move('count',4,0)).status,200);
  assert.equal((await action(first,{...confirm,stockRevision:1,pickupAt:'2027-02-31T10:00'})).status,400);
  assert.equal((await action(first,{...confirm,stockRevision:1,itemId:'cooler'})).status,409);
  const held={...confirm,stockRevision:1};
  assert.equal((await action(first,held)).status,200);assert.equal((await action(first,held)).status,200);
  assert.equal((await action(second,held)).status,409);
  let desk=await(await req(settings,'GET',null,treasurer)).json(),item=desk.items.find(i=>i.id==='shirt-member');
  assert.equal(item.availableUnits,1);assert.equal(item.reservedUnits,3);
  assert.equal((await move('sale',2,1,6000)).status,409);
  assert.equal((await move('count',2,1)).status,409);
  assert.equal((await move('sale',1,1,3000)).status,200);
  const collected={version:2,action:'collected',itemId:'shirt-member',stockRevision:2,amountCents:9000,paymentMethod:'square',received:true};
  assert.equal((await action(first,{...collected,stockRevision:1})).status,409);
  assert.equal((await action(first,{...collected,amountCents:1})).status,400);
  assert.equal((await action(first,{...collected,paymentMethod:'unconfirmed-bank'})).status,400);
  assert.equal((await action(first,collected)).status,200);assert.equal((await action(first,collected)).status,200);
  const led=await(await req('/api/stock','GET',null,treasurer)).json();
  assert.deepEqual(led.sales,{saleCount:2,units:4,totalCents:12000});assert.equal(led.items.find(i=>i.id==='shirt-member').onHand,0);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='shop_request_collected'").first()).n,1);
  await move('delivery',2,3);
  assert.equal((await action(second,{...held,stockRevision:4,quoteCents:6000})).status,200);
  assert.equal((await action(second,{version:2,action:'closed'})).status,200);
  desk=await(await req(settings,'GET',null,treasurer)).json();item=desk.items.find(i=>i.id==='shirt-member');
  assert.equal(item.reservedUnits,0);assert.equal(item.availableUnits,2);
});
