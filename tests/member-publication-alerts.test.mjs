import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

async function fixture(t) {
  const migration='0048_member_publication_alerts.sql';
  const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(file=>/^\d+.*\.sql$/.test(file) && file<migration).sort();
  const db=database(t,files),env={DB:db,PRIVATE_AUTH_KEY:'test-only'},cookies={};
  const accounts=[
    ['secretary','committee',0,0,0],['angler','member',1,0,1],['volunteer','member',0,1,0],
    ['both','member',1,1,1],['neither','member',0,0,0],['expired','member',1,1,1],['disabled','member',1,1,1]
  ];
  for(const [name,role,fish,work,meetings] of accounts){
    const token=randomBytes(32).toString('hex');
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,?)")
        .bind(name,name,role,name==='expired'?'2000-01-01':'2099-01-01'),
      db.prepare("UPDATE member_profiles SET competitions=?,working_bees=?,meetings=?,pref_sms=1,pref_email=1,contact_email='test@example.test',contact_mobile='0411223344' WHERE account_id=?").bind(fish,work,meetings,name),
      db.prepare('UPDATE club_accounts SET disabled=? WHERE id=?').bind(Number(name==='disabled'),name),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),name)
    ]);
    cookies[name]='__Host-plfc_session='+token;
  }
  const addPlan=async type=>{
    const id=randomUUID();
    await db.prepare("INSERT INTO club_events(id,type,title,notes,created_at,created_by,creator_name) VALUES(?,?,'Private run sheet','Secret supplier','2026-01-01','secretary','Secretary')").bind(id,type).run();
    return id;
  };
  const historical=await addPlan('bbq');
  await db.prepare("INSERT INTO member_event_notices VALUES(?,'Earlier member event','2026-03-01','','','',1,1,'2026-01-01')").bind(historical).run();
  await db.prepare("INSERT INTO member_minutes VALUES('hotel-meeting-2026-11-22',1,'Earlier member minutes','2026-11-23','secretary','old')").run();
  db.migrate(migration);
  const notices=async kind=>(await db.prepare('SELECT id,account_id AS member,kind,title,body,read_at AS readAt FROM member_notices WHERE kind=? ORDER BY account_id').bind(kind).all()).results;
  async function call(user,path,body,status=200) {
    const origin='https://club.example',response=await handleRequest(new Request(origin+path,{
      method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookies[user]||''},
      body:body?JSON.stringify(body):undefined
    }),env);
    const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;
  }
  return {db,addPlan,notices,call};
}

test('calendar publication, edits and withdrawal maintain one current, preference-matched inbox message',async t=>{
  const {db,addPlan,notices,call}=await fixture(t),id=await addPlan('bbq');
  const kind='calendar_event',path='/api/committee/events/'+id+'/member-notice';
  assert.deepEqual(await notices(kind),[]);
  for(const type of ['local','interclub','workshop','bbq','raffle','fundraiser']){
    const eventId=await addPlan(type);
    const {results}=await db.prepare('SELECT account_id AS member FROM member_calendar_alert_recipients WHERE event_id=? ORDER BY account_id').bind(eventId).all();
    assert.deepEqual(results.map(row=>row.member),['local','interclub','workshop'].includes(type)?['angler','both']:['both','volunteer']);
  }
  const first={action:'publish',mutationId:randomUUID(),version:0,title:'Member BBQ',date:'2027-03-20',place:'Meet at the park',time:'11:00',details:'Wear a hat'};
  await call('secretary',path,first);
  const original=await notices(kind);
  assert.deepEqual(original.map(n=>n.member),['both','volunteer']);
  assert.ok(original.every(n=>n.title===first.title));
  assert.doesNotMatch(JSON.stringify(original),/Private run sheet|Secret supplier|Meet at the park|Wear a hat/);
  await db.prepare("UPDATE member_notices SET read_at='earlier' WHERE id=?").bind(original[0].id).run();
  await call('secretary',path,first);
  await call('secretary',path,{...first,version:1,mutationId:randomUUID()});
  assert.equal((await notices(kind))[0].readAt,'earlier','identical details retain the read receipt');
  const corrected={...first,version:2,mutationId:randomUUID(),date:'2027-03-21',title:'New BBQ day'};
  await call('secretary',path,corrected);
  const updated=await notices(kind);
  assert.deepEqual(updated.map(n=>n.id),original.map(n=>n.id));assert.ok(updated.every(n=>n.readAt===null && n.title===corrected.title));
  assert.equal((await db.prepare("SELECT count(*) AS n FROM member_delivery_queue q JOIN member_notices n ON n.id=q.notice_id WHERE n.kind='calendar_event'").first()).n,0);
  await db.prepare("UPDATE member_profiles SET working_bees=0 WHERE account_id='volunteer'").run();
  await db.prepare("UPDATE member_profiles SET working_bees=1 WHERE account_id='neither'").run();
  await db.prepare("UPDATE member_notice_posted SET posted_at='2000-01-01' WHERE notice_id=?").bind(original[0].id).run();
  const withdraw={action:'withdraw',mutationId:randomUUID(),version:3};
  await call('secretary',path,withdraw);await call('secretary',path,withdraw);
  const removed=await notices(kind);
  assert.deepEqual(removed.map(n=>n.member),['both']);
  assert.doesNotMatch(JSON.stringify(removed),/Member BBQ|New BBQ day|2027-03-21|Meet at the park|Wear a hat/);
  assert.match(removed[0].title,/removed/);
  assert.notEqual((await db.prepare('SELECT posted_at FROM member_notice_posted WHERE notice_id=?').bind(original[0].id).first()).posted_at,'2000-01-01');
  await call('both','/api/member/calendar/'+id+'.ics',undefined,404);
  const inbox=await call('both','/api/member/lifecycle');
  assert.ok(inbox.notices.some(n=>n.id===removed[0].id));assert.doesNotMatch(JSON.stringify(inbox.notices),/New BBQ day/);
  await call('secretary',path,{...corrected,mutationId:randomUUID(),version:4});
  assert.deepEqual((await notices(kind)).map(n=>n.member),['both','neither']);
});

test('only the explicit release of the member copy generates a minutes notice',async t=>{
  const {db,notices,call}=await fixture(t),id=randomUUID(),path='/api/meetings/'+id+'/release';
  const release={text:'Approved member copy',version:1};
  await db.batch([
    db.prepare("INSERT INTO meeting_register(id,title,date,time,location,created_by,created_at) VALUES(?,'Committee planning','2027-02-06','09:00','Private venue','secretary','2027-02-06')").bind(id),
    db.prepare("INSERT INTO meeting_notes(id,notes,actions_json,status,version,updated_at,updated_by,last_mutation_id) VALUES(?,'Confidential minutes','[]','draft',1,'2027-02-06','secretary','test')").bind(id)
  ]);
  assert.deepEqual(await notices('minutes_release'),[]);
  await call('secretary',path,release,409);
  await db.prepare("UPDATE meeting_notes SET status='approved' WHERE id=?").bind(id).run();
  assert.deepEqual(await notices('minutes_release'),[]);
  await call('secretary',path,release);await call('secretary',path,release);
  const released=await notices('minutes_release');
  assert.deepEqual(released.map(n=>n.member),['angler','both']);
  assert.doesNotMatch(JSON.stringify(released),/Confidential minutes|Private venue|Committee planning|Approved member copy/);
  assert.ok((await call('angler','/api/member/minutes')).minutes.some(m=>m.id===id && m.text===release.text));
  await db.prepare("UPDATE club_accounts SET paid_through='2000-01-01' WHERE id='angler'").run();
  assert.ok(!(await call('angler','/api/member/lifecycle')).notices.some(n=>n.kind==='minutes_release'));
  await call('angler','/api/member/minutes',undefined,403);
});
