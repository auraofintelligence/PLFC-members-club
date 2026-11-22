import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const base='https://club.example',manage='/api/stock/shop/listings',catalogue='/api/shop/catalogue',intake='/api/shop/requests',desk='/api/stock/shop';
async function fixture(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0002_stock.sql','0003_stock_history.sql','0007_members_and_conversation.sql',
    '0014_merch_orders.sql','0015_fees_and_alerts.sql','0016_stock_costs.sql','0041_shop_listings.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'isolated-test'},cookies={};
  for(const [login,role] of [['treasurer','treasurer'],['webmaster','administrator'],['president','committee']]){
    const token=randomBytes(32).toString('hex');
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at) VALUES(?,?,?,'s','v',1)").bind(login,login,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),login)]);
    cookies[login]='__Host-plfc_session='+token;
  }
  async function api(path,method='GET',b=null,role='visitor',status=200){
    const headers={Origin:base,'Content-Type':'application/json'};if(cookies[role])headers.Cookie=cookies[role];
    const response=await handleRequest(new Request(base+path,{method,headers,body:b?JSON.stringify(b):undefined}),env),data=await response.json();
    assert.equal(response.status,status,JSON.stringify(data));return data;
  }
  const write=(b,status=200)=>api(manage,'POST',b,'treasurer',status);
  const cmd=(id,action,extra={})=>({id,action,mutationId:randomUUID(),...extra});
  const buy=(productId,variantId,extra={})=>({requestId:randomUUID(),kind:'pickup',productId,variantId,quantity:1,name:'Example Visitor',
    email:'example@invalid.test',mobile:'',size:'',message:'',consent:true,...extra});
  const report=()=>api('/api/stock/report?month='+new Date(Date.now()+36000000).toISOString().slice(0,7),'GET',null,'treasurer');
  return {db,api,write,cmd,buy,report};
}

test('sellable shirt combinations, separate counts and costs, reservations, and published price alerts share the existing stock book',async t=>{
  const {db,api,write,cmd,buy,report}=await fixture(t), id='shirt';
  const add=cmd(id,'addVariants',{version:1,variants:[{style:'Polo',colour:'Navy',size:'M',units:2,unitCostCents:700,costSource:'Test invoice'},
    {style:'Polo',colour:'Navy',size:'L',units:4,unitCostCents:800}]});
  await api(manage,'POST',add,'visitor',401);await api(manage,'POST',add,'president',403);
  const {listings}=await write(add),shirt=listings.find(p=>p.id===id),[m,l]=shirt.variants;
  assert.equal(m.label,'Polo / Navy / M');assert.equal(l.onHand,4);assert.equal(m.onHand,2);assert.equal(m.size,'M');
  assert.equal((await write(add)).listings.find(p=>p.id===id).variants.length,2);
  await write({...add,mutationId:randomUUID()},409);
  await write(cmd(id,'addVariants',{version:2,variants:[{style:'New',units:1},{style:'polo',colour:'navy',size:'m',units:3}]}),409);
  assert.equal((await api(manage,'GET',null,'webmaster')).listings.find(p=>p.id===id).variants.length,2);
  const listing=(await api(catalogue)).products.find(p=>p.id===id);
  assert.equal(listing.variants[0].available,true);assert.ok(!JSON.stringify(listing).includes('Test invoice'));
  assert.ok(!Object.hasOwn(listing.variants[0],'onHand'));assert.ok(!Object.hasOwn(listing.variants[0],'reserved'));
  const inventory=await api('/api/stock','GET',null,'treasurer');
  assert.equal(inventory.items.find(i=>i.id==='shirt-member').onHand,null);assert.equal(inventory.items.find(i=>i.id==='shirt-member').productId,id);
  const version=(await api(desk+'/offers','GET',null,'treasurer')).offers.find(o=>o.productId===id).version;
  const price={version,priceCents:1500,sizes:[],confirmed:true,checkoutUrl:null};
  await api(desk+'/'+id,'PUT',price,'treasurer');assert.equal((await db.prepare('SELECT count(*) AS n FROM officer_price_recipients WHERE recipient=?').bind('account:president').first()).n,1);
  const req=buy(id,m.id,{quantity:2}), ref=(await api(intake,'POST',req,'visitor',201)).reference;
  const at=new Date(Date.now()+86400000+36000000).toISOString().slice(0,16);
  const confirm={version:1,action:'confirmed',itemId:l.id,stockRevision:1,quoteCents:3000,pickupAt:at,pickupDetails:'Club stall'};
  const path='/api/stock/requests/'+ref;
  await api(path,'POST',confirm,'treasurer',409);await api(path,'POST',{...confirm,itemId:m.id},'treasurer');
  await write(cmd(id,'retireVariant',{version:2,variantId:m.id}),409);
  assert.equal((await api(catalogue)).products.find(p=>p.id===id).variants.find(v=>v.id===m.id).available,false);
  await api(path,'POST',{action:'collected',version:2,itemId:m.id,stockRevision:1,paymentMethod:'cash',amountCents:3000,received:true},'treasurer');
  const reportData=await report(), row=reportData.items.find(i=>i.itemId===l.id);
  assert.equal(reportData.totals.unitsSold,2);assert.equal(row.closingValueCents,3200);assert.equal(reportData.items.find(i=>i.itemId===m.id).closingUnits,0);
  await write(cmd(id,'retireVariant',{variantId:m.id,version:2}));assert.equal((await api(catalogue)).products.find(p=>p.id===id).variants.length,1);
  await write(cmd(id,'restoreVariant',{variantId:m.id,version:3}));assert.equal((await api(catalogue)).products.find(p=>p.id===id).variants.length,2);
  await write(cmd(id,'retireVariant',{variantId:m.id,version:4}));await write(cmd(id,'retireVariant',{variantId:l.id,version:5}));
  const retired=(await api(catalogue)).products.find(p=>p.id===id);
  assert.equal(retired.hasVariants,true);assert.deepEqual(retired.variants,[]);
  await api(intake,'POST',buy(id,null),'visitor',409);
});

test('priced tickets, variable donations, draft merchandise and guided services use the existing shop without mixing seats into valuations',async t=>{
  const {db,api,write,cmd,buy,report}=await fixture(t),ticket=randomUUID(),donation=randomUUID(),tour=randomUUID(),merch=randomUUID();
  const open=(id,version=1)=>write(cmd(id,'publish',{version}));
  const setup=(id,kind,mode,fields)=>cmd(id,'create',{name:'Test '+kind,description:'Committee-approved public copy',kind,mode,priceCents:null,variants:[],...fields});
  const create=setup(ticket,'ticket','places',{priceCents:2500,eventDate:'2090-06-21',variants:[{label:'Tickets',units:2}]});
  const data=await write(create,201),place=data.listings.find(p=>p.id===ticket).variants[0];
  await write(create);assert.ok(!(await api(catalogue)).products.some(p=>p.id===ticket));
  assert.ok(!(await api('/api/shop/offers')).offers.some(p=>p.productId===ticket));await api(intake,'POST',buy(ticket,place.id),'visitor',409);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM officer_price_changes').first()).n,0);
  await open(ticket);assert.equal((await db.prepare('SELECT COUNT(*) n FROM officer_price_changes').first()).n,1);
  const link={priceCents:2500,sizes:[],checkoutUrl:'https://square.link/u/Example123',checkoutReconfirmed:true,confirmed:true,version:1};
  await api(desk+'/'+ticket,'PUT',link,'treasurer',400);await api(intake,'POST',buy(ticket,place.id,{quantity:3}),'visitor',409);
  const receipt=await api(intake,'POST',buy(ticket,place.id,{quantity:2}),'visitor',201),path='/api/stock/requests/'+receipt.reference;
  const at=new Date(Date.now()+86400000+36000000).toISOString().slice(0,16);
  await api(path,'POST',{version:1,action:'confirmed',itemId:place.id,stockRevision:1,quoteCents:5000,pickupAt:at,pickupDetails:'Event desk'},'treasurer',400);
  await api(path,'POST',{version:1,action:'confirmed',itemId:place.id,stockRevision:1,quoteCents:5000,pickupAt:'2090-06-21T10:00',pickupDetails:'Event desk'},'treasurer');
  await api(intake,'POST',buy(ticket,place.id),'visitor',409);
  await api(path,'POST',{version:2,action:'collected',itemId:place.id,stockRevision:1,paymentMethod:'square',amountCents:5000,received:true},'treasurer');
  const r=await report();assert.equal(r.totals.unitsSold,0);assert.equal(r.totals.stocktakes,0);assert.equal(r.totals.receivedCents,0);
  assert.ok(r.items.every(i=>i.categoryId!==ticket));assert.ok(r.categories.every(i=>i.id!==ticket));assert.equal(r.movements.length,0);
  assert.equal(r.bookings.placesSold,2);assert.equal(r.bookings.receivedCents,5000);assert.equal(r.bookings.receipts[0].paymentMethod,'square');
  assert.equal(r.bookings.receipts[0].productId,ticket);
  const ledger=await api('/api/stock','GET',null,'treasurer');assert.equal(ledger.sales.units,0);assert.equal(ledger.bookingSales.units,2);
  await api('/api/stock','POST',{id:randomUUID(),kind:'count',itemId:place.id,revision:2,units:2,unitCostCents:100},'treasurer',400);
  await write(setup(donation,'donation','donation',{variableAmount:true}),201);await open(donation);
  const donate=buy(donation,null,{kind:'enquiry',message:'I would like to donate.',requestedAmountCents:1250});
  await api(intake,'POST',donate,'visitor',201);await api(intake,'POST',donate);
  const donateReq=(await api(desk,'GET',null,'treasurer')).requests.find(x=>x.productId===donation);
  assert.equal(donateReq.requestedAmountCents,1250);assert.equal(donateReq.amountCents,null);
  await api(desk+'/'+donation,'PUT',{...link,priceCents:null},'treasurer');
  assert.equal((await api('/api/shop/offers')).offers.find(x=>x.productId===donation).checkoutUrl,link.checkoutUrl);
  await write(setup(tour,'service','enquiry',{description:'Local guide by appointment'}),201);await open(tour);
  await api(intake,'POST',buy(tour,null),'visitor',409);await api(intake,'POST',buy(tour,null,{kind:'enquiry',message:'Please contact me.'}),'visitor',201);
  const guided=randomUUID();
  const scheduled=await write(setup(guided,'service','places',{eventDate:'2090-07-01',variants:[{units:5}]}),201);
  const seats=scheduled.listings.find(p=>p.id===guided).variants[0];await open(guided);
  await api(intake,'POST',buy(guided,seats.id),'visitor',201);
  assert.equal((await api(desk,'GET',null,'treasurer')).requests.find(x=>x.productId===guided).eventDate,'2090-07-01');
  await write(setup(merch,'merchandise','stock',{variants:[{label:'Signed print',units:3,unitCostCents:0}]}),201);
  await open(merch);await write(cmd(merch,'unpublish',{version:2}));
  assert.ok(!(await api(catalogue)).products.some(p=>p.id===merch));
  assert.ok((await api('/api/stock','GET',null,'treasurer')).items.some(i=>i.productId===merch&&i.onHand===3));
  await write(setup(randomUUID(),'ticket','places',{variants:[]}),400);
});
