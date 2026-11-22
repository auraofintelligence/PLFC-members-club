import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const route='https://club.test/api/committee/membership-waivers/report';

test('the Treasurer can reconcile Brisbane periods using only actual milestones and fees captured at grant',async t=>{
  const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
  const db=database(t,migrations),env={DB:db,PRIVATE_AUTH_KEY:'test'},cookies={};
  const accounts=[];
  for(const [login,role] of [['finance','treasurer'],['owner','administrator'],['secretary','committee'],['paid','member'],['lapsed','member'],['one','member'],['two','member'],['three','member']]){
    const token=randomBytes(32).toString('hex');
    cookies[login]='__Host-plfc_session='+token;
    accounts.push(db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,?)")
        .bind(login,login+'@private.invalid',role,login==='lapsed'?'2000-01-01':'2099-12-31'),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),login));
  }
  await db.batch(accounts);
  const call=(login,query,csv=false,method='GET')=>handleRequest(new Request(route+(csv?'.csv':'')+'?'+query,{
    method,headers:cookies[login]?{cookie:cookies[login]}:{}
  }),env);
  const setPrice=(category,cents)=>db.prepare("UPDATE club_fees SET price_cents=?,active=1,updated_by='finance',updated_at='2026-07-01T00:00:00.000Z' WHERE category=?")
    .bind(cents,category).run();
  await setPrice('adult',3500);
  await setPrice('social',0);
  await setPrice('lifetime',8900);
  const approval='2026-06-30T13:59:59.999Z',acceptance='2026-06-30T14:00:00.000Z',grant='2026-07-31T13:59:59.999Z';
  const refs=[];
  for(const [member,category] of [['one','adult'],['two','social'],['three','lifetime']]){
    const id=randomUUID();refs.push(id);
    await db.batch([
      db.prepare(`INSERT INTO returning_member_offers(id,target_type,account_id,register_digest,paper_label,status,proposed_by,proposed_at,approved_by,approved_at,accepted_at,category)
        VALUES(?,'account',?,?,'Private reference for testing','approved','secretary',?,'finance',?,?,?)`).bind(id,member,'sensitive-digest-'+member,approval,approval,acceptance,category),
      db.prepare("UPDATE returning_member_offers SET status='granted',granted_at=?,previous_through='2026-06-30',paid_through='2027-06-30' WHERE id=?").bind(grant,id),
    ]);
  }
  const cancelled=randomUUID(),unfinished=randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO returning_member_offers(id,target_type,register_digest,status,proposed_by,proposed_at,approved_by,approved_at,cancelled_at)
      VALUES(?,'paper','cancelled-private','cancelled','secretary',?,'finance',?,?)`).bind(cancelled,approval,approval,acceptance),
    db.prepare(`INSERT INTO returning_member_offers(id,target_type,register_digest,status,proposed_by,proposed_at,approved_by,approved_at,accepted_at)
      VALUES(?,'paper','unfinished-private','activation','secretary',?,'finance','2026-07-31T14:00:00.000Z','2026-07-31T14:00:00.000Z')`).bind(unfinished,acceptance),
  ]);
  await setPrice('adult',5100);

  for(const [login,status] of [['guest',401],['paid',403],['lapsed',403],['secretary',403]]){
    for(const csv of [false,true]){
      const response=await call(login,'month=2026-07',csv);
      assert.equal(response.status,status);assert.match(response.headers.get('Cache-Control'),/no-store/);
    }
  }
  assert.equal((await call('owner','year=2026')).status,200);
  assert.equal((await call('finance','month=2026-07',false,'POST')).status,405);
  for(const query of ['month=2026-13','quarter=2026-Q5','month=2026-07&year=2026','']){
    assert.equal((await call('finance',query)).status,400);
  }
  const july=await call('finance','month=2026-07');
  assert.equal(july.status,200);assert.match(july.headers.get('Cache-Control'),/private, no-store/);
  const julyBody=await july.json();
  assert.deepEqual(julyBody.totals,{approvedCount:0,acceptedCount:3,grantedCount:3,knownWaivedFeeCents:3500,valuedGrantCount:2,unpricedGrantCount:1,cashReceivedCents:0});
  const grants=julyBody.rows.filter(row=>row.event==='granted');
  assert.deepEqual(grants.map(row=>[row.reference,row.waivedFeeCents]).sort(),[[refs[0],3500],[refs[1],0],[refs[2],null]].sort());
  for(const row of julyBody.rows){
    assert.deepEqual(Object.keys(row).sort(),['reference','category','event','occurredAt','previousThrough','paidThrough','waivedFeeCents'].sort());
    if(row.event==='accepted') assert.ok(row.waivedFeeCents===null && row.previousThrough===null && row.paidThrough===null);
    else assert.equal(row.paidThrough,'2027-06-30');
  }
  for(const query of ['quarter=2026-Q2','financialYear=2026','month=2026-06']){
    const previous=await (await call('finance',query)).json();
    assert.equal(previous.rows.length,4);assert.equal(previous.totals.approvedCount,4);assert.equal(previous.totals.grantedCount,0);
  }
  for(const query of ['quarter=2026-Q3','financialYear=2027']){
    const next=await (await call('finance',query)).json();
    assert.equal(next.totals.acceptedCount,4);assert.equal(next.totals.approvedCount,1);assert.equal(next.totals.grantedCount,3);
  }
  const annual=await(await call('finance','year=2026')).json();
  assert.equal(annual.totals.approvedCount,5);assert.equal(annual.totals.grantedCount,3);
  const empty=await(await call('finance','month=2025-01')).json();
  assert.equal(empty.rows.length,0);assert.equal(empty.totals.knownWaivedFeeCents,0);
  const csv=await call('finance','month=2026-07',true);
  assert.match(csv.headers.get('Content-Disposition'),/PLFC-membership-waivers-month-2026-07.csv/);
  assert.match(csv.headers.get('Content-Type'),/text\/csv/);
  const raw=new Uint8Array(await csv.arrayBuffer()),csvText=new TextDecoder().decode(raw);
  assert.deepEqual([...raw.slice(0,3)],[239,187,191]);
  assert.match(csvText,/"Known annual fees waived \(AUD\)","35.00"/);assert.match(csvText,/"Cash received \(AUD\)","0.00"/);
  assert.match(csvText,/"Unknown"/);assert.match(csvText,/"Free year granted"/);
  assert.doesNotMatch(csvText+JSON.stringify(julyBody),/private\.invalid|sensitive-digest|Private reference|activation_digest|51\.00/i);
  const head=await call('finance','year=2026',true,'HEAD');assert.equal(head.status,200);assert.equal(await head.text(),'');
});
