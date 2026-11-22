import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {canManageStock, stockEndpoint} from '../worker/stock.mjs';
import {handleRequest} from '../worker/index.mjs';

const treasurer = {id:'account:test-treasurer', role:'committee', canManageStock:true};
const member = {id:'account:test-member', role:'member'};
const helpers = {
  json: payload => Response.json(payload),
  requireDb: env => env.DB,
  bodyJson: req => req.json(),
  HttpError: class extends Error { constructor(status, message) { super(message); this.status = status; } },
};
const envFor = t => ({DB: database(t, ['0000_clubhouse.sql', '0002_stock.sql', '0003_stock_history.sql','0016_stock_costs.sql'])});
function call(env, identity, body, path = '/api/stock') {
  const request = new Request('https://club.example.test' + path, body ? {method:'POST', body: JSON.stringify(body)} : {});
  return stockEndpoint(new URL(request.url).pathname, request, env, identity, helpers).then(r => r.json());
}
const move = (kind, units, revision, amountCents = null) => ({id:randomUUID(), itemId:'shirt-member', kind, units, revision, amountCents});

test('a late or corrected supplier invoice records its history without receiving the units twice', async t => {
  const env=envFor(t), path='/api/stock/delivery-costs';
  const delivery=move('delivery',8,1), donated={...move('delivery',2,2),costCents:0,costSource:'Donated'};
  await call(env,treasurer,{...move('count',3,0),unitCostCents:250,costSource:'Opening stocktake'});
  await call(env,treasurer,delivery);
  await call(env,treasurer,donated);
  assert.deepEqual((await call(env,treasurer,null,path)).deliveries.map(d=>d.id),[delivery.id]);
  const invoice={id:delivery.id,version:0,costCents:3200,costSource:'Invoice A'};
  const saved=await call(env,treasurer,invoice,path);
  assert.equal(saved.version,1);
  assert.deepEqual(await call(env,treasurer,invoice,path),saved);
  assert.deepEqual((await call(env,treasurer,null,path)).deliveries,[]);
  const corrected=await call(env,treasurer,{...invoice,version:1,costCents:3250},path);
  assert.equal(corrected.version,2);
  await assert.rejects(call(env,treasurer,invoice,path),{status:409});
  const replay=await call(env,treasurer,delivery);
  assert.equal(replay.items.find(i=>i.id===delivery.itemId).onHand,13);
  assert.equal(replay.movements.find(m=>m.id===delivery.id).costCents,3250);
  const audit=await env.DB.prepare('SELECT cost_cents FROM merch_cost_history WHERE movement_id=? ORDER BY version').bind(delivery.id).all();
  assert.deepEqual(audit.results.map(a=>a.cost_cents),[3200,3250]);
  await assert.rejects(call(env,treasurer,{...delivery,costCents:3250}),{status:409});
  await assert.rejects(call(env,member,invoice,path),{status:403});
  await assert.rejects(call(env,null,null,path),{status:401});
  await env.DB.prepare("CREATE TRIGGER refuse_cost_history BEFORE INSERT ON merch_cost_history BEGIN SELECT RAISE(ABORT, 'test'); END").run();
  await assert.rejects(call(env,treasurer,{...invoice,version:2,costCents:3300},path),{status:503});
  const rows=(await call(env,treasurer,null,path+'?filter=all')).deliveries;
  assert.equal(rows.find(d=>d.id===delivery.id).costCents,3250);
  assert.equal(rows.find(d=>d.id===donated.id).costCents,0);
});

test('the public shop route lists only the approved product names while the stock book stays private', async t => {
  const env = envFor(t);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO merch_products VALUES ('draft','Unpublished sample','Supplier invoice details',4)"),
    env.DB.prepare("UPDATE merch_products SET public_note='Private archive note' WHERE id='shirt'"),
    env.DB.prepare("UPDATE merch_stock_items SET on_hand=384 WHERE id='shirt-member'"),
    env.DB.prepare("INSERT INTO merch_source_records(id,product_id,reported_on,kind,description,units,amount_cents,source) VALUES ('private','shirt','2025-01-09','purchase','Wholesale invoice',384,15246,'Supplier record')"),
  ]);
  const url='https://club.example.test/api/shop/catalogue';
  const publicResponse = await handleRequest(new Request(url),env);
  assert.equal(publicResponse.status,200);
  const catalogue = await publicResponse.json();
  assert.deepEqual(catalogue.products.map(row => row.id), ['shirt', 'cooler', 'sticker']);
  assert.deepEqual(Object.keys(catalogue),['products']);
  for (const row of catalogue.products) assert.deepEqual(Object.keys(row), ['id','name']);
  for (const visitor of [null, member, {id:'expired',role:'signed_in'}, {id:'account:committee',role:'committee'}, treasurer]) {
    assert.deepEqual(await call(env,visitor,null,'/api/shop/catalogue'),catalogue);
    await assert.rejects(call(env,visitor,move('sale',1,0,3500),'/api/shop/catalogue'),{status:405});
    if(visitor!==treasurer){
      await assert.rejects(call(env,visitor),{status:visitor?403:401});
      await assert.rejects(call(env,visitor,move('delivery',2,0)),{status:visitor?403:401});
    }
  }
  assert.equal((await handleRequest(new Request(url.replace('shop/catalogue','stock')),env)).status,401);
  assert.equal(canManageStock({id:'access:one', role:'committee', email:'Treasurer@example.test'}, {TREASURER_EMAILS:'treasurer@example.test'}), true);
  assert.equal(canManageStock({id:'account:one', role:'committee', email:'treasurer@example.test'}, {TREASURER_EMAILS:'treasurer@example.test'}), false);
});

test('historical merchandise import does not create an opening count or duplicate sale receipts', async t => {
  const env = envFor(t);
  await env.DB.prepare("INSERT INTO merch_source_records (id, product_id, reported_on, kind, description, units, source) VALUES ('document-1', 'shirt', '2025-06-28', 'sale', 'Earlier sale', 3, 'Meeting record')").run();
  const snap = await call(env, treasurer);
  assert.equal(snap.evidence[0].units, 3);
  assert.equal(snap.sales.saleCount, 0);
  assert(snap.items.every(item => item.onHand === null));
  const sale = await call(env, treasurer, move('sale', 1, 0, 1500));
  assert.equal(sale.movements[0].afterUnits, null);
  assert.deepEqual(sale.sales, {saleCount:1, units:1, totalCents:1500});
});

test('stock saves atomically update the shelf, sale totals and audit and support exact retries', async t => {
  const env = envFor(t), first = move('count', 6, 0), delivery = move('delivery', 2, 1), sold = move('sale', 3, 2, 6350);
  await call(env, treasurer, first);
  await call(env, treasurer, delivery);
  await assert.rejects(call(env, treasurer, move('count', 9, 1)), {status:409});
  await assert.rejects(call(env, treasurer, move('sale', 9, 2, 1000)), {status:409});
  const saved = await call(env, treasurer, sold);
  assert.equal(saved.items.find(i=>i.id === 'shirt-member').onHand, 5);
  assert.deepEqual((await call(env, treasurer, sold)).sales, saved.sales);
  assert.deepEqual((await call(env, treasurer, first)).movements, saved.movements);
  await assert.rejects(call(env, treasurer, {...sold, units:1}), {status:409});
  await assert.rejects(call(env, treasurer, move('sale', 1, 3, null)), {status:400});
  const audit = await env.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE actor_role='treasurer'").first();
  assert.equal(audit.n, 3);
  await env.DB.prepare("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT, 'test'); END").run();
  await assert.rejects(call(env, treasurer, move('sale', 2, 3, 3000)), {status:503});
  const final = await call(env, treasurer);
  assert.deepEqual(final.items, saved.items);
  assert.deepEqual(final.sales, saved.sales);
});
