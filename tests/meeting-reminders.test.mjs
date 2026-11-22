import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,randomBytes} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {runMeetingReminders} from '../worker/meeting-reminders.mjs';
import {handleRequest} from '../worker/index.mjs';

const previousFiles=['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0007_members_and_conversation.sql','0011_meeting_reminders.sql','0013_reminder_snapshots.sql','0018_formal_meeting_agendas.sql'];
const pauseSms='0052_pause_meeting_sms.sql';
const files=[...previousFiles,pauseSms];
const hotel='hotel-meeting-2026-11-22';
const time=when=>new Date(when+'+10:00');

test('the hotel catch-up has a one-hour chat reminder, an earlier email example, and no SMS slot for a newly registered meeting',async t=>{
  const env={DB:database(t,files)};
  const db=env.DB;
  const rows=()=>db.prepare("SELECT channel,state,due_at,expires_at FROM meeting_reminders WHERE meeting_id=? AND channel IN ('email','chat') ORDER BY due_at").bind(hotel).all();
  const planned=(await rows()).results;
  assert.deepEqual(planned.map(r=>[r.channel,new Date(r.due_at*1000).toISOString(),r.state]),[
    ['email','2026-11-15T00:00:00.000Z','scheduled'],['chat','2026-11-21T23:00:00.000Z','scheduled'],
  ]);
  assert.deepEqual(await runMeetingReminders(env,time('2026-11-15T09:59:59')),{ready:0,elapsed:0});
  assert.deepEqual(await runMeetingReminders(env,time('2026-11-15T10:00:00')),{ready:0,elapsed:1});
  assert.deepEqual(await runMeetingReminders(env,time('2026-11-15T10:00:00').getTime()),{ready:0,elapsed:0});
  assert.deepEqual(await runMeetingReminders(env,time('2026-11-22T09:47:00')),{ready:1,elapsed:0});
  assert.deepEqual((await rows()).results.map(r=>r.state),['elapsed','ready']);
  assert.deepEqual(await runMeetingReminders(env,time('2026-11-22T10:00:00')),{ready:0,elapsed:1});
  assert.deepEqual(await runMeetingReminders(env,time('2026-11-22T10:05:00')),{ready:0,elapsed:0});
  await db.prepare("INSERT INTO meeting_register(id,title,date,time,location,created_by,created_at) VALUES('next','Evening club meeting','2027-03-01','19:30','Club room','chair','2026-11-01')").run();
  const next=await db.prepare("SELECT channel,due_at FROM meeting_reminders WHERE meeting_id='next' ORDER BY due_at").all();
  assert.deepEqual(next.results.map(row=>row.channel),['email','chat']);
  assert.equal(new Date(next.results[0].due_at*1000).toISOString(),'2027-02-22T09:30:00.000Z');
});

test('SMS pause retires pending prompts and preserves an existing reviewed SMS snapshot',async t=>{
  const db=database(t,previousFiles);
  await db.prepare("INSERT INTO meeting_register(id,title,date,time,location,created_by,created_at) VALUES('earlier','Earlier meeting','2026-05-01','10:00','Club room','chair','2026-03-01')").run();
  await db.prepare("UPDATE meeting_reminders SET state='reviewed',reviewed_at=123,reviewed_by='chair',reviewed_text='Saved historical wording' WHERE meeting_id='earlier' AND channel='sms'").run();
  await db.prepare("UPDATE meeting_reminders SET state='ready' WHERE meeting_id=? AND channel='sms'").bind(hotel).run();
  db.migrate(pauseSms);
  assert.deepEqual(await db.prepare("SELECT state,reviewed_at,reviewed_text FROM meeting_reminders WHERE meeting_id='earlier' AND channel='sms'").first(),{state:'reviewed',reviewed_at:123,reviewed_text:'Saved historical wording'});
  assert.equal((await db.prepare("SELECT state FROM meeting_reminders WHERE meeting_id=? AND channel='sms'").bind(hotel).first()).state,'elapsed');
  assert.equal((await db.prepare("SELECT count(*) AS n FROM planned_meeting_reminders WHERE channel='sms'").first()).n,0);
});

test('committee can save the real agenda, read a timely draft and record review once',async t=>{
  const env={DB:database(t,files),PRIVATE_AUTH_KEY:'fixture'};
  const id='regular-committee-meeting';
  await env.DB.prepare("INSERT INTO meeting_register(id,title,date,time,location,created_by,created_at) VALUES(?,'Committee meeting','2026-11-22','10:00','Club room','chair','2026-10-01T00:00:00Z')").bind(id).run();
  let now=time('2026-11-15T10:05:00').getTime();
  t.mock.method(Date,'now',()=>now);
  async function login(name,role) {
    const token=randomBytes(32).toString('hex'),digest=createHash('sha256').update(token).digest('hex');
    await env.DB.batch([
      env.DB.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')").bind(name,name,role),
      env.DB.prepare('INSERT INTO club_sessions(digest,account_id,expires) VALUES(?,?,4102444800)').bind(digest,name),
    ]);
    return '__Host-plfc_session='+token;
  }
  const staff=await login('test-chair','committee'),member=await login('test-member','member');
  const url='https://club.example/api/meetings/reminders?id='+id;
  async function call(cookie,method='GET',body) {
    const headers={Origin:'https://club.example'};
    if(cookie)headers.Cookie=cookie;if(body)headers['Content-Type']='application/json';
    return handleRequest(new Request(url,{method,headers,body:body && JSON.stringify(body)}),env);
  }
  assert.equal((await call(null)).status,401);
  assert.equal((await call(member)).status,403);
  const initial=await(await call(staff)).json();assert.equal(initial.version,0);
  assert.equal(initial.reminders[0].state,'ready');
  const edit={id,agenda:'Welcome families\nBrag mat photo meet',version:0};
  assert.equal((await call(staff,'PUT',edit)).status,200);
  const saved=await(await call(staff,'PUT',edit)).json();
  assert.equal(saved.version,1);assert.match(saved.reminders[0].text,/• Welcome families\n• Brag mat photo meet/);
  assert.equal((await call(staff,'PUT',{...edit,agenda:'Stale agenda'})).status,409);
  const review={id,version:saved.version,preparedAt:saved.preparedAt};
  assert.equal((await call(staff,'POST',{...review,channel:'chat'})).status,409);
  assert.equal((await call(staff,'POST',{...review,version:0,channel:'email'})).status,409);
  const reviewed=await(await call(staff,'POST',{...review,channel:'email'})).json();
  assert.equal(reviewed.reminders[0].state,'reviewed');assert.equal(reviewed.reminders[0].reviewedBy,'test-chair');
  assert.equal((await call(staff,'POST',{...review,channel:'email'})).status,200);
  const updated=await(await call(staff,'PUT',{id,version:1,agenda:'Added treasurer update after the email review.'})).json();
  assert.equal(updated.reminders[0].text,saved.reminders[0].text);
  now=time('2026-11-22T09:50:00').getTime();
  const late=await(await call(staff)).json();
  assert.deepEqual(late.reminders.map(r=>r.state),['reviewed','ready']);
  assert.match(late.reminders[1].text,/starts in 10 minutes/);
  await env.DB.prepare("INSERT INTO meeting_notes(id,updated_at,updated_by,last_mutation_id,status) VALUES(?,'2026-11-22','chair','fixture','approved')").bind(id).run();
  assert.equal((await call(staff,'PUT',{...edit,version:1,agenda:'Late change'})).status,409);
  const audit=await env.DB.prepare('SELECT action,COUNT(*) AS n FROM audit_log GROUP BY action').all();
  assert.deepEqual(audit.results,[{action:'meeting_agenda_saved',n:2},{action:'meeting_reminder_reviewed_email',n:1}]);
  const hotelRead=async()=>await(await handleRequest(new Request('https://club.example/api/meetings/reminders?id='+hotel,{headers:{Cookie:staff}}),env)).json();
  now=time('2026-11-21T14:00:00').getTime();
  // An earlier deployment may already have marked the three-day template ready.
  await env.DB.prepare("UPDATE meeting_reminders SET state='ready' WHERE meeting_id=? AND channel='sms'").bind(hotel).run();
  const saturday=await hotelRead();
  assert.deepEqual(saturday.examples,[{channel:'email'}]);
  assert.deepEqual(saturday.reminders.map(r=>[r.channel,r.state]),[['chat','scheduled']]);
  assert.equal((await call(staff,'POST',{id:hotel,version:0,preparedAt:saturday.preparedAt,channel:'sms'})).status,400);
  await env.DB.prepare("UPDATE meeting_reminders SET state='reviewed',reviewed_at=?,reviewed_by='chair',reviewed_text='Original handwritten follow-up' WHERE meeting_id=? AND channel='email'").bind(saturday.preparedAt,hotel).run();
  now=time('2026-11-22T09:00:00').getTime();
  const sunday=await hotelRead();
  assert.deepEqual(sunday.reminders.map(r=>[r.channel,r.state]),[['email','reviewed'],['chat','ready']]);
  assert.equal(sunday.reminders[0].text,'Original handwritten follow-up');assert.equal(sunday.reminders[0].exampleReview,true);
  assert.match(sunday.reminders[1].text,/starts in 60 minutes/);
  now=time('2026-11-22T10:00:00').getTime();
  const closed=await hotelRead();assert.equal(closed.started,true);
  assert.deepEqual(closed.reminders.map(r=>[r.state,r.text]),[['reviewed','Original handwritten follow-up'],['elapsed','']]);
  await env.DB.prepare("UPDATE meeting_reminders SET state='reviewed',reviewed_at=?,reviewed_by='chair',reviewed_text='Archived SMS' WHERE meeting_id=? AND channel='sms'").bind(saturday.preparedAt,hotel).run();
  const archived=(await hotelRead()).reminders.find(row=>row.channel==='sms');
  assert.equal(archived.state,'reviewed');
  assert.equal(archived.text,'Archived SMS');
});
