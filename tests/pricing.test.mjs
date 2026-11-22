import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {pricingEndpoint} from '../worker/pricing.mjs';
import {accountEndpoint} from '../worker/accounts.mjs';

const migrations=['0000_clubhouse.sql','0001_access_and_meetings.sql','0002_stock.sql','0003_stock_history.sql',
  '0005_meeting_register.sql','0007_members_and_conversation.sql','0014_merch_orders.sql','0015_fees_and_alerts.sql'];
const admin={id:'admin',role:'committee',accountRole:'administrator'},cash={id:'cash',role:'committee',accountRole:'treasurer'},
  chair={id:'chair',role:'committee',accountRole:'committee'},member={id:'member',role:'member',accountRole:'member'};
class HttpError extends Error {constructor(status,message,code){super(message);this.status=status;this.code=code;}}
const helpers={HttpError,requireDb:env=>env.DB,bodyJson:req=>req.json(),json:(data,status=200,headers={})=>Response.json(data,{status,headers})};
const request=(path,data)=>new Request('https://club.example'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
const call=(env,path,user,data)=>pricingEndpoint(path.split('?')[0],request(path,data),env,user,helpers);
const fees='/api/treasurer/fees',alerts='/api/committee/price-alerts',published='/api/fees';
const tier=(fields={})=>({id:'membership-adult',kind:'membership',category:'adult',title:'Adult membership',priceCents:7500,active:true,version:0,mutation:crypto.randomUUID(),...fields});
const status=n=>e=>e.status===n;
async function fixture(t){
  const env={DB:database(t,migrations),PRIVATE_AUTH_KEY:randomBytes(32).toString('hex')};
  for(const user of [admin,cash,chair,member]){
    await env.DB.prepare('INSERT INTO club_accounts(id,login,role,salt,verifier,created_at) VALUES(?,?,?,?,?,1)')
      .bind(user.id,user.id,user.accountRole,'test','test').run();
  }
  return env;
}
const read=async(env,path,user)=>(await call(env,path,user)).json();

test('only explicit published club fees are public and only verified finance officers may change them',async t=>{
  const env=await fixture(t);
  assert.deepEqual(await read(env,published,null),{fees:[]});
  const settings=await read(env,fees,cash);assert.equal(settings.fees.length,6);assert.ok(settings.fees.every(f=>f.priceCents===null&&!f.active));
  await assert.rejects(call(env,fees,null),status(401));await assert.rejects(call(env,fees,chair,tier()),status(403));
  await assert.rejects(call(env,alerts,member),status(403));
  await assert.rejects(call(env,fees,cash,tier({active:true,priceCents:null})),status(400));
  const original=tier();
  assert.equal((await call(env,fees,cash,original)).status,200);
  const result=await read(env,published,null);
  assert.equal(result.fees.length,1);assert.equal(result.fees[0].priceCents,7500);assert.equal(result.fees[0].version,undefined);
  assert.equal((await read(env,alerts,cash)).unread,0);
  assert.ok((await read(env,alerts,cash)).alerts[0].readAt);
  const first=(await read(env,alerts,chair)).alerts[0];assert.equal(first.actor,'cash');assert.equal(first.oldCents,null);assert.equal(first.newCents,7500);
  await call(env,fees,cash,original);
  await call(env,fees,cash,tier({version:1}));
  assert.equal((await read(env,alerts,chair)).unread,1);
  await assert.rejects(call(env,fees,cash,{...original,priceCents:4500}),status(409));
  await assert.rejects(call(env,fees,cash,tier({version:0,priceCents:4500})),status(409));
  await call(env,fees,cash,tier({version:1,active:false}));
  assert.deepEqual(await read(env,published,null),{fees:[]});
  const withdrawn=(await read(env,alerts,chair)).alerts[0];
  assert.equal(withdrawn.oldCents,7500);assert.equal(withdrawn.newCents,null);
  assert.equal((await read(env,alerts,chair)).unread,2);
  await call(env,alerts,chair,{through:withdrawn.seq});assert.equal((await read(env,alerts,chair)).unread,0);assert.equal((await read(env,alerts,admin)).unread,2);
  const edit=tier({version:2,priceCents:7000});
  await call(env,fees,cash,edit);await call(env,fees,cash,edit);
  const history=(await read(env,alerts,chair)).alerts;assert.equal(history.length,3);
  assert.equal(history[0].oldCents,null);assert.equal(history[0].newCents,7000);
  assert.equal((await read(env,alerts+'?before='+history[0].seq,chair)).alerts.length,2);
});

test('draft prices stay private, and bulk retries and version conflicts preserve every row in a save',async t=>{
  const env=await fixture(t),adult=tier({active:false}),cadet=tier({id:'membership-cadet',category:'cadet',title:'Cadet membership',priceCents:4500,active:false});
  const draft=await call(env,fees,cash,{fees:[adult,cadet]});assert.equal(draft.status,200);
  assert.deepEqual(await read(env,published),{fees:[]});assert.equal((await read(env,alerts,chair)).unread,0);
  const adultLive={...adult,version:1,mutation:crypto.randomUUID(),active:true};
  const staleCadet={...cadet,version:0,mutation:crypto.randomUUID(),active:true};
  await assert.rejects(call(env,fees,cash,{fees:[adultLive,staleCadet]}),status(409));
  assert.deepEqual(await read(env,published),{fees:[]});assert.equal((await read(env,alerts,chair)).unread,0);
  const batch={fees:[adultLive,{...staleCadet,version:1}]};
  assert.equal((await (await call(env,fees,cash,batch)).json()).fees.length,2);
  await call(env,fees,cash,batch);assert.equal((await read(env,alerts,chair)).unread,2);
  assert.equal((await read(env,alerts,cash)).unread,0);
  assert.equal((await read(env,published)).fees.length,2);
});

test('treasurer can add a linked or standalone event fee and extra approved membership tier',async t=>{
  const env=await fixture(t);const {events}=await read(env,fees,cash);
  const base={kind:'event',version:0,priceCents:0,active:true};
  await call(env,fees,cash,{...base,id:crypto.randomUUID(),mutation:crypto.randomUUID(),eventId:events[0].id,title:'Local junior entry'});
  await call(env,fees,cash,{...base,id:crypto.randomUUID(),mutation:crypto.randomUUID(),title:'Club invitational family entry',priceCents:1250});
  await assert.rejects(call(env,fees,cash,{...base,id:crypto.randomUUID(),mutation:crypto.randomUUID(),eventId:'invented-event',title:'Example'}),status(400));
  const extra=tier({id:crypto.randomUUID(),category:'lifetime',title:'Approved lifetime level',priceCents:100000});
  await call(env,fees,cash,extra);
  const visible=(await read(env,published)).fees;
  assert.equal(visible.length,3);assert.ok(visible.some(f=>f.priceCents===0&&f.eventId===events[0].id));
});

test('merchandise changes fan out atomically for single and bulk writes, price-neutral edits stay quiet',async t=>{
  const env=await fixture(t), db=env.DB;
  const insert=(id,cents)=>db.prepare("INSERT INTO merch_shop_offers(product_id,price_cents,version,updated_by,updated_at,last_key,mutation) VALUES(?,?,1,'cash','2026-11-21T01:00:00Z','test','test')").bind(id,cents);
  await db.batch([insert('shirt',null),insert('sticker',100),insert('cooler',500)]);
  const first=await read(env,alerts,chair);assert.equal(first.unread,2);
  await db.prepare("UPDATE merch_shop_offers SET sizes_json='[\"L\"]',price_cents=price_cents WHERE product_id='shirt'").run();
  assert.equal((await read(env,alerts,chair)).unread,2);
  await db.prepare("UPDATE merch_shop_offers SET price_cents=NULL WHERE product_id='cooler'").run();
  const row=(await read(env,alerts,chair)).alerts[0];assert.equal(row.kind,'merchandise');assert.equal(row.oldCents,500);assert.equal(row.newCents,null);
  await assert.rejects(db.batch([db.prepare("UPDATE merch_shop_offers SET price_cents=2300 WHERE product_id='shirt'"),insert('shirt',100)]));
  assert.equal((await read(env,alerts,chair)).unread,3);
});

test('only the officer who activates an eligible pending invitation inherits its earlier alerts',async t=>{
  const env=await fixture(t), token=randomBytes(32).toString('hex'), login='new.officer';
  const digest=createHash('sha256').update(token).digest('hex');
  await env.DB.prepare("INSERT INTO club_invites(digest,login,role,created_by,expires) VALUES(?,?,'committee','fixture',?)").bind(digest,login,Math.floor(Date.now()/1000)+100).run();
  await call(env,fees,cash,tier());
  const activate='/api/auth/activate';
  const res=await accountEndpoint(activate,request(activate,{token,login,password:'a unique activation passphrase'}),env,helpers);
  assert.equal(res.status,200);
  const owner=await env.DB.prepare('SELECT id FROM club_accounts WHERE login=?').bind(login).first();
  assert.equal((await read(env,alerts,{...chair,id:owner.id})).unread,1);
  assert.equal((await read(env,alerts,{...chair,id:'unrelated'})).unread,0);
});
