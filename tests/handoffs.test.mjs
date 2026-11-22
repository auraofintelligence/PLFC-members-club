import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,randomBytes} from 'node:crypto';
import {handleRequest} from '../worker/index.mjs';
import {database} from './d1-fixture.mjs';

test('event authority, individual consent, role-specific review and withdrawal are enforced in the private register',async t=>{
  const env={DB:database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0007_members_and_conversation.sql','0009_handoffs.sql','0011_meeting_reminders.sql','0018_formal_meeting_agendas.sql','0019_agm_jobs.sql']),PRIVATE_AUTH_KEY:'fixture'};
  const db=env.DB, root='/api/handoffs', origin='https://club.example';
  async function signIn(id,role) {
    const token=randomBytes(32).toString('hex'),digest=createHash('sha256').update(token).digest('hex');
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES (?,?,?,'fixture','fixture',?,'2099-01-01')").bind(id,id,role,Math.floor(Date.now()/1000)),
      db.prepare('INSERT INTO club_sessions(digest,account_id,expires) VALUES(?,?,?)').bind(digest,id,Math.floor(Date.now()/1000)+3600)
    ]);
    return '__Host-plfc_session='+token;
  }
  function call(cookie,path=root,data) {
    const headers={Origin:origin};
    if(cookie)headers.Cookie=cookie;
    if(data)headers['Content-Type']='application/json';
    return handleRequest(new Request(origin+path,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined}),env);
  }
  const chair=await signIn('club-chair','committee'),member=await signIn('paid-member','member'),other=await signIn('another-member','member');
  assert.equal((await call(null)).status,401);
  const start=await(await call(member)).json();
  assert.equal(start.queue,undefined);assert.equal(start.motions,undefined);
  const consent={consent:true,consentVersion:start.consentVersion};
  const motion='Seek help staffing the welcome desk at the family photo meet.';
  const meetingId='properly-called-committee';
  const event={id:crypto.randomUUID(),kind:'event',eventTitle:'Family photo meet',eventDate:'2027-03-10',scope:'Coordinate the welcome desk only.',meetingId,motion,...consent};
  assert.equal((await call(member,root,event)).status,403);
  assert.equal((await call(chair,root,event)).status,409);
  const informal='hotel-meeting-2026-11-22';
  await db.prepare("INSERT INTO meeting_notes(id,updated_at,updated_by,last_mutation_id,decisions_json,status) VALUES(?,'2026-11-22','club-chair','informal',?,'approved')").bind(informal,JSON.stringify([motion])).run();
  assert.equal((await call(chair,root,{...event,meetingId:informal})).status,409);
  await db.prepare("INSERT INTO meeting_register (id,title,date,time,location,created_by,created_at) VALUES(?,'Committee meeting','2026-11-21','10:00','Club room','secretary','2026-11-01')").bind(meetingId).run();
  await db.prepare("INSERT INTO meeting_notes(id,updated_at,updated_by,last_mutation_id,decisions_json,status) VALUES(?,'2026-11-22','club-chair','fixture',?,'draft')").bind(meetingId,JSON.stringify([motion])).run();
  assert.equal((await call(chair,root,event)).status,409);
  await db.prepare("UPDATE meeting_notes SET status='approved' WHERE id=?").bind(meetingId).run();
  await db.prepare("INSERT INTO meeting_agendas(meeting_id,topics,revision,updated_at,updated_by,formal_json) VALUES(?,'Attendance',1,'2026-11-21','club-chair',?)")
    .bind(meetingId,JSON.stringify({kind:'committee',quorumStatus:'absent',items:[]})).run();
  assert.equal((await call(chair,root,event)).status,409);
  await db.prepare("UPDATE meeting_agendas SET formal_json=json_set(formal_json,'$.quorumStatus','present') WHERE meeting_id=?").bind(meetingId).run();
  assert.equal((await call(chair,root,{...event,motion:'Use every volunteer for every event.'})).status,409);
  assert.equal((await call(chair,root,event)).status,201);
  assert.equal((await call(chair,root,event)).status,200);
  const voluntary={id:crypto.randomUUID(),kind:'volunteer',scope:'Help set up tables.',eventId:event.id,...consent};
  const paid={id:crypto.randomUUID(),kind:'employment',scope:'Enquire about paid event setup.',eventId:event.id,...consent};
  assert.equal((await call(member,root,voluntary)).status,409);
  const decision=(cookie,id,action,version)=>call(cookie,root+'/'+id,{action,version,confirm:true});
  assert.equal((await decision(chair,event.id,'authorise',1)).status,200);
  const available=await(await call(member)).json();
  assert.deepEqual(available.events,[{id:event.id,title:event.eventTitle,date:event.eventDate}]);
  assert.equal((await call(member,root,{...voluntary,consent:false})).status,400);
  assert.equal((await call(member,root,{...voluntary,owner_id:'another-member'})).status,400);
  assert.equal((await call(member,root,{...paid,consentVersion:'old'})).status,400);
  assert.equal((await call(member,root,voluntary)).status,201);
  assert.equal((await call(member,root,paid)).status,201);
  assert.equal((await call(member,root,{...voluntary,scope:'A larger scope.'})).status,409);
  assert.equal((await decision(member,voluntary.id,'authorise',1)).status,404);
  assert.equal((await decision(other,voluntary.id,'withdraw',1)).status,404);
  assert.deepEqual((await(await call(other)).json()).mine,[]);
  assert.equal((await decision(chair,voluntary.id,'authorise',1)).status,200);
  assert.equal((await decision(chair,voluntary.id,'decline',1)).status,409);
  const mine=(await(await call(member)).json()).mine;
  assert.deepEqual(new Set(mine.map(r=>r.kind)),new Set(['volunteer','employment']));
  assert.ok(mine.every(r=>r.mine&&r.owner==='paid-member'&&r.eventTitle===event.eventTitle));
  assert.equal((await decision(chair,event.id,'withdraw',2)).status,200);
  assert.equal((await decision(chair,event.id,'withdraw',2)).status,200);
  const after=await(await call(member)).json();
  assert.ok(after.mine.every(r=>r.status==='withdrawn'&&r.revokedBy==='club-chair'));
  assert.deepEqual(after.events,[]);
  assert.equal((await decision(chair,paid.id,'authorise',1)).status,409);
  const audit=await db.prepare("SELECT action,COUNT(*) AS qty FROM audit_log GROUP BY action").all();
  assert.deepEqual(Object.fromEntries(audit.results.map(r=>[r.action,r.qty])),{handoff_requested:3,handoff_authorised:2,handoff_withdrawn:1,handoff_event_withdrawn:2});
  const separate={id:crypto.randomUUID(),kind:'employment',scope:'Enquire about general paid opportunities.',...consent};
  assert.equal((await call(member,root,separate)).status,201);
  assert.equal((await decision(member,separate.id,'withdraw',1)).status,200);
  assert.equal((await decision(chair,separate.id,'authorise',1)).status,409);
});
