import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {monthlyStockReport, stockPeriodReport} from '../worker/stock-reports.mjs';

const migrations = ['0000_clubhouse.sql', '0002_stock.sql', '0003_stock_history.sql', '0014_merch_orders.sql', '0016_stock_costs.sql'];
const noCosts = {knownDeliveryCostCents:0, deliveriesWithCost:0, deliveriesWithoutCost:0};
class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
function posting(db, item, revision, time, kind, units, balance, cents = null) {
  return db.prepare(`INSERT INTO merch_movements
    (id,item_id,kind,units,amount_cents,after_units,item_revision,actor_id,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind('entry-' + item + '-' + revision, item, kind, units, cents, balance, revision, 'staff-only-test', time);
}

test('stock report uses Brisbane midnights, separates archive evidence and preserves unknown balances', async t => {
  const db = database(t, migrations);
  await db.batch([
    posting(db, 'shirt-member', 1, '2024-01-31T13:59:59.999Z', 'count', 10, 10),
    posting(db, 'shirt-member', 2, '2024-01-31T14:00:00.000Z', 'sale', 2, 8, 3100),
    posting(db, 'cooler', 1, '2024-02-05T12:00:00.000Z', 'delivery', 4, null),
    posting(db, 'cooler', 2, '2024-02-05T12:00:00.000Z', 'count', 7, 7),
    posting(db, 'shirt-member', 3, '2024-02-29T13:59:59.999Z', 'sale', 1, 7, 1515),
    posting(db, 'shirt-member', 4, '2024-02-29T14:00:00.000Z', 'count', 6, 6),
    db.prepare("INSERT INTO merch_source_records VALUES ('feb','shirt','2024-02-29','sale','Earlier meeting sale',9,5000,'Meeting notes')"),
    db.prepare("INSERT INTO merch_source_records VALUES ('mar','shirt','2024-03-01','order','Earlier order',2,NULL,'Order book')"),
  ]);
  const result = await monthlyStockReport(db, '2024-02', HttpError);
  assert.deepEqual(result.totals, {salesCount:2, unitsSold:3, receivedCents:4615, unitsDelivered:4, stocktakes:1,
    ...noCosts, deliveriesWithoutCost:1});
  assert.deepEqual(result.period, {type:'month', key:'2024-02', label:'February 2024', startDate:'2024-02-01', endDate:'2024-02-29'});
  assert.deepEqual(result.history.map(r => r.source), ['Meeting notes']);
  assert.equal(result.movements.length, 4);
  const item = id => result.items.find(row => row.itemId === id);
  assert.deepEqual([item('shirt-member').openingUnits, item('shirt-member').closingUnits], [10, 7]);
  assert.deepEqual([item('cooler').openingUnits, item('cooler').closingUnits, item('cooler').stocktakes], [null, 7, 1]);
  assert.deepEqual([item('sticker').openingUnits, item('sticker').closingUnits], [null, null]);
  assert.equal(result.movements[0].paymentMethod, null);
  assert.equal(result.movements[1].afterUnits, null);
  const empty = await monthlyStockReport(db, '2024-04', HttpError);
  assert.deepEqual([empty.movements.length, empty.history.length, empty.totals.receivedCents], [0, 0, 0]);
  assert.equal(empty.items.find(r => r.itemId === 'shirt-member').openingUnits, 6);
  assert.equal(empty.items.find(r => r.itemId === 'shirt-member').closingUnits, 6);
});

test('stock report includes every receipt, including collected pickup once without its customer details', async t => {
  const db = database(t, migrations);
  const date = '2026-12-15T04:05:06.000Z';
  await db.batch([
    posting(db, 'sticker', 1, '2026-11-30T13:59:59.999Z', 'count', 200, 200),
    ...Array.from({length:101}, (_, n) => posting(db, 'sticker', n+2, date, 'sale', 1, 199-n, 100)),
    db.prepare(`INSERT INTO merch_shop_requests
      (request_id, reference, kind, product_id, name, email, mobile, quantity, consent_version,
       created_at, updated_at, status, quote_cents, stock_item_id, stock_revision)
      VALUES ('test-request','PLFC-COLLECT123','pickup','sticker','Sample Private Person','person@example.test',
       'private-mobile',2,'test',?,?,'confirmed',350,'sticker',102)`).bind(date,date),
    db.prepare(`UPDATE merch_shop_requests SET status='collected', updated_at=?,
      updated_by='staff-only-test', amount_cents=350, payment_method='square' WHERE request_id='test-request'`).bind(date),
    posting(db, 'cooler', 1, '2026-12-31T14:00:00.000Z', 'count', 3, 3),
  ]);
  const result = await monthlyStockReport(db, '2026-12', HttpError);
  assert.equal(result.movements.length, 102);
  assert.deepEqual(result.totals, {salesCount:102, unitsSold:103, receivedCents:10450, unitsDelivered:0, stocktakes:0, ...noCosts});
  assert.deepEqual(result.movements.filter(row => row.paymentMethod), [{
    occurredAt:date, label:'Round club sticker', kind:'sale', units:2, amountCents:350, afterUnits:97,
    paymentMethod:'square', costCents:null, costSource:null, unitCostCents:null,
  }]);
  assert.equal(result.items.find(row => row.itemId === 'sticker').closingUnits, 97);
  assert.doesNotMatch(JSON.stringify(result), /Sample Private Person|person@example\.test|private-mobile|PLFC-COLLECT123|staff-only-test/);
});

test('stock report rejects missing and malformed months before reading the database', async () => {
  for (const month of [null, undefined, 202611, '', '2026-1', '2026-00', '2026-13', '0000-01', '2026-11-21', '2026-11\n']) {
    await assert.rejects(monthlyStockReport(null, month, HttpError), {status:400, code:'invalid_report_month'});
  }
});

test('stock periods reject ambiguous and malformed selections before reading the database', async () => {
  for (const query of ['', 'month=2026-11&quarter=2026-Q4','year=2026&year=2026','year=2026&unexpected=1',
    'quarter=2026-Q0','quarter=2026-Q5','quarter=26-Q2','quarter=2026-q3','financialYear=2025-26',
    'financialYear=0000','year=%202026','year=2026%0A','year=20267']) {
    await assert.rejects(stockPeriodReport(null,new URLSearchParams(query),HttpError), {status:400, code:'invalid_report_period'});
  }
});

test('quarterly and annual periods calculate balances and known delivery costs across the entire range', async t => {
  const db = database(t, migrations);
  const report = query => stockPeriodReport(db,new URLSearchParams(query),HttpError);
  const purchase = (revision, cents, source) => db.prepare(
    'INSERT INTO merch_movement_costs(movement_id,cost_cents,source) VALUES(?,?,?)')
    .bind('entry-cooler-'+revision,cents,source);
  await db.batch([
    posting(db,'cooler',1,'2023-12-31T13:59:59.999Z','count',8,8),
    posting(db,'cooler',2,'2023-12-31T14:00:00.000Z','delivery',5,13), purchase(2,300,'Receipt A'),
    posting(db,'cooler',3,'2024-06-30T13:59:59.999Z','sale',1,12,1050),
    posting(db,'cooler',4,'2024-06-30T14:00:00.000Z','delivery',2,14), purchase(4,0,'Donated stock'),
    posting(db,'cooler',5,'2024-09-30T13:59:59.999Z','delivery',3,17),
    posting(db,'cooler',6,'2024-09-30T14:00:00.000Z','sale',2,15,2000),
    posting(db,'cooler',7,'2024-12-31T13:59:59.999Z','delivery',5,20), purchase(7,2775,'Receipt B'),
    posting(db,'cooler',8,'2024-12-31T14:00:00.000Z','count',22,22),
    posting(db,'cooler',9,'2025-06-30T13:59:59.999Z','sale',1,21,1100),
    posting(db,'cooler',10,'2025-06-30T14:00:00.000Z','sale',1,20,800),
    db.prepare("INSERT INTO merch_source_records VALUES ('past','cooler','2024-06-30','purchase','Earlier',1,1700,'Earlier report')"),
    db.prepare("INSERT INTO merch_source_records VALUES ('new','cooler','2024-07-01','purchase','Later',2,9999,'Later report')"),
  ]);
  const item = result => result.items.find(row => row.itemId === 'cooler');
  const stock = result => [item(result).openingUnits, item(result).closingUnits, result.totals.knownDeliveryCostCents];
  const quarter = await report('quarter=2024-Q4');
  assert.deepEqual(quarter.period, {type:'quarter',key:'2024-Q4',label:'Q4 2024',startDate:'2024-10-01',endDate:'2024-12-31'});
  assert.deepEqual(stock(quarter), [17,20,2775]);
  assert.equal(quarter.month, undefined);
  const q3 = await report('quarter=2024-Q3');
  assert.deepEqual(stock(q3), [12,17,0]);
  assert.deepEqual([item(q3).deliveriesWithCost, item(q3).deliveriesWithoutCost], [1,1]);
  assert.deepEqual(q3.movements.map(m=>[m.costCents,m.costSource]), [[0,'Donated stock'],[null,null]]);
  const year = await report('year=2024');
  assert.deepEqual(year.period, {type:'year',key:'2024',label:'Calendar year 2024',startDate:'2024-01-01',endDate:'2024-12-31'});
  assert.deepEqual(stock(year), [8,20,3075]);
  assert.deepEqual([year.totals.salesCount,year.totals.receivedCents,year.totals.deliveriesWithCost,year.totals.deliveriesWithoutCost], [2,3050,3,1]);
  const financial = await report('financialYear=2025');
  assert.deepEqual(financial.period, {type:'financialYear',key:'2025',label:'Financial year 2024/25',startDate:'2024-07-01',endDate:'2025-06-30'});
  assert.deepEqual(stock(financial), [12,21,2775]);
  assert.deepEqual(financial.history.map(r=>r.source), ['Later report']);
  assert.deepEqual([financial.totals.salesCount,financial.totals.receivedCents,financial.totals.deliveriesWithCost,financial.totals.deliveriesWithoutCost], [2,3100,2,1]);
});

test('closing stock values keep separate SKU cost bases and explicitly identify partial category totals', async t => {
  const db = database(t, migrations);
  const jan = '2026-01-05T05:00:00.000Z', feb = '2026-02-05T05:00:00.000Z';
  const march = '2026-02-28T14:00:00.000Z';
  await db.batch([
    posting(db,'shirt-member',1,jan,'count',2,2),
    posting(db,'shirt-member',2,jan,'delivery',3,5),
    db.prepare("INSERT INTO merch_movement_costs(movement_id,cost_cents,source) VALUES('entry-shirt-member-2',100,'Invoice A')"),
    posting(db,'shirt-promo',1,jan,'count',4,4),
    posting(db,'sticker',1,jan,'count',0,0),
    posting(db,'shirt-promo',2,feb,'count',4,4),
    db.prepare("UPDATE merch_movements SET unit_cost_cents=55, initial_cost_source='Count sheet' WHERE id='entry-shirt-promo-2'"),
    posting(db,'cooler',1,feb,'count',1,1),
    posting(db,'cooler',2,feb,'delivery',1,2),
    db.prepare("INSERT INTO merch_movement_costs(movement_id,cost_cents) VALUES('entry-cooler-2',0)"),
    posting(db,'shirt-member',3,march,'count',5,5),
    db.prepare("UPDATE merch_movements SET unit_cost_cents=800 WHERE id='entry-shirt-member-3'"),
  ]);
  const janReport = await monthlyStockReport(db,'2026-01',HttpError);
  assert.deepEqual(janReport.valuation, {knownValueCents:167, valuedItems:2, uncountedItems:1, unpricedItems:1});
  assert.deepEqual(janReport.categories.find(c=>c.id==='shirt'),
    {id:'shirt',name:'Club shirt',knownValueCents:167, valuedItems:1,uncountedItems:0,unpricedItems:1});
  assert.equal(janReport.items.find(i=>i.itemId==='sticker').closingValueCents,0);
  assert.equal(janReport.items.find(i=>i.itemId==='cooler').closingValueCents,null);
  assert.equal(janReport.items.find(i=>i.itemId==='shirt-promo').closingValueCents,null);
  const febReport = await monthlyStockReport(db,'2026-02',HttpError);
  assert.deepEqual(febReport.valuation,{knownValueCents:387,valuedItems:4,uncountedItems:0,unpricedItems:0});
  assert.equal(febReport.categories.find(c=>c.id==='shirt').knownValueCents, 167 + 4*55);
  assert.equal(febReport.categories.find(c=>c.id==='cooler').knownValueCents,0);
  const member = febReport.items.find(i=>i.itemId==='shirt-member');
  assert.deepEqual([member.basisDate,member.basisKind,member.basisCents,member.basisUnits,member.basisUnitCents,member.basisSource],
    [jan,'delivery',100,3,100/3,'Invoice A']);
  const promo = febReport.items.find(i=>i.itemId==='shirt-promo');
  assert.deepEqual([promo.basisDate,promo.basisKind,promo.basisUnitCents,promo.basisSource], [feb,'count',55,'Count sheet']);
  assert.equal(febReport.movements.find(m=>m.label==='Promotional shirt').unitCostCents,55);
  const marchReport = await monthlyStockReport(db,'2026-03',HttpError);
  assert.equal(marchReport.items.find(i=>i.itemId==='shirt-member').closingValueCents, 5*800);
});

test('the report route allows read-only access to the treasurer and owner for every period', async t => {
  const db = database(t, [...migrations, '0001_access_and_meetings.sql', '0007_members_and_conversation.sql']);
  const env = {DB:db, PRIVATE_AUTH_KEY:'fixture-only'};
  const request = (cookie = '', method = 'GET', query = 'month=2026-11') => handleRequest(
    new Request('https://club.example/api/stock/report?' + query, {method, headers:{Cookie:cookie, Origin:'https://club.example'}}), env);
  assert.equal((await request()).status, 401);
  for (const [role, expected] of [['member',403], ['committee',403], ['treasurer',200], ['administrator',200]]) {
    const token = randomBytes(32).toString('hex');
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',1,'2099-12-31')")
        .bind(role,role,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,?)')
        .bind(createHash('sha256').update(token).digest('hex'),role,Math.ceil(Date.now()/1000)+300),
    ]);
    const cookie = '__Host-plfc_session=' + token;
    const result = await request(cookie);
    assert.equal(result.status, expected);
    if (expected === 200) {
      assert.match(result.headers.get('cache-control'), /no-store/);
      assert.equal((await result.json()).month, '2026-11');
      assert.equal((await request(cookie, 'POST')).status, 405);
    }
    for (const query of ['quarter=2026-Q3', 'year=2026', 'financialYear=2026']) {
      const range = await request(cookie, 'GET', query);
      assert.equal(range.status, expected);
      if(expected === 200) assert.equal((await range.json()).period.type, query.split('=')[0]);
    }
  }
});
