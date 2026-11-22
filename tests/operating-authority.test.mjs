import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './d1-fixture.mjs';
import {operatingAuthority} from '../worker/operating-authority.mjs';

test('delegated work requires an authorised enquiry, a recorded decision and written acceptance, and closes on withdrawal',async t=>{
  const DB=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0009_handoffs.sql','0012_operating_authority.sql','0011_meeting_reminders.sql','0018_formal_meeting_agendas.sql','0019_agm_jobs.sql']);
  const id=crypto.randomUUID(),meetingId='properly-called-committee',motion='Seek external welcome desk staffing for the club meet.';
  const user={role:'committee',id:'club-secretary'};
  const helpers={requireRole:(u,roles)=>assert.ok(roles.includes(u.role)),requireDb:()=>DB,bodyJson:r=>r.json(),textField:v=>v,dateField:v=>v,json:v=>v,HttpError:class extends Error{constructor(status,message){super(message);this.status=status;}}};
  const call=(obj,viewer=user)=>operatingAuthority(new Request('https://test.example/api/committee/operating-authority',obj?{method:'POST',body:JSON.stringify(obj)}:{}),{DB},viewer,helpers);
  await DB.prepare("INSERT INTO partner_handoffs(id,kind,owner_id,owner_name,scope,status,consent_version,consent_at,mutation) VALUES(?,'event','club','Secretary','Welcome desk only','authorised','test','2026-01-01','test')").bind(id).run();
  await DB.prepare("INSERT INTO meeting_register (id,title,date,time,location,created_by,created_at) VALUES(?,'Committee meeting','2026-11-21','10:00','Club room','secretary','2026-11-01')").bind(meetingId).run();
  await DB.prepare("INSERT INTO meeting_notes(id,updated_at,updated_by,last_mutation_id,decisions_json,status) VALUES(?,'2026-01-01','club','fixture',?,'approved')").bind(meetingId,JSON.stringify([motion])).run();
  const record={action:'record',id,meetingId,motion,work:'Roster volunteers',retained:'Run the event',lead:'Club lead',review:'2099-10-01'};
  await assert.rejects(call(undefined,{role:'member'}));
  await assert.rejects(call({...record,motion:'Unapproved wording'}),e=>e.status===409);
  await call(record);await assert.rejects(call(record),e=>e.status===409);
  const accepted={id,action:'accept',partnerLead:'Partner lead',reference:'Signed event agreement',confirm:true};
  await assert.rejects(call({...accepted,confirm:false}),e=>e.status===400);
  await call(accepted);
  assert.equal((await call()).tasks[0].acceptanceRef,accepted.reference);
  await DB.prepare("UPDATE partner_handoffs SET status='withdrawn',revoked_at='2026-12-01',revoked_by='secretary' WHERE id=?").bind(id).run();
  const closed=(await call()).tasks[0];
  assert.equal(closed.closedAt,'2026-12-01');
  await assert.rejects(call(accepted),e=>e.status===409);
  assert.equal((await DB.prepare("SELECT count(*) AS n FROM audit_log WHERE entity_id=?").bind(id).first()).n,2);
});
