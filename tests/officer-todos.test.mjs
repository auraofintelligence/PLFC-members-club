import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {todoTiming} from '../public/officer-todos.js';

const endpoint='/api/committee/todos',origin='https://club.example';

test('officer work lists label deadlines from the Queensland day and distinguish event dates',()=>{
  const today='2026-12-29';
  const timing=(dueDate,source='manual')=>todoTiming({source,dueDate},today);
  assert.deepEqual(timing('2026-12-28'),{light:'red',label:'Overdue',dateLabel:'28 Dec 2026'});
  assert.equal(timing(today).label,'Due today');
  assert.equal(timing(today).light,'amber');
  assert.deepEqual(timing('2027-01-05'),{light:'amber',label:'Due soon',dateLabel:'5 Jan 2027'});
  assert.deepEqual(timing('2027-01-06'),{light:'green',label:'On track',dateLabel:'6 Jan 2027'});
  assert.deepEqual(timing(''),{light:'neutral',label:'No due date',dateLabel:''});
  assert.deepEqual(timing('2026-12-28','event'),{light:'neutral',label:'Event day',dateLabel:'28 Dec 2026'});
  assert.deepEqual(timing('','event'),{light:'neutral',label:'Event date to agree',dateLabel:''});
});

test('a committee action links to its notice and a returned list completes its original task',async t=>{
  const {db,submit,view}=await fixture(t),id=randomUUID();
  const {today}=await submit('secretary',{action:'add',id,office:'treasurer',title:'Price the ice',details:'For the club BBQ',dueDate:'2026-12-28'});
  await db.prepare(`INSERT INTO committee_notices(id,kind,title,details,created_at,author_id,author_label,updated_by,task_id)
    VALUES(?,'action','Price the ice','For the club BBQ',?,'user-secretary','Secretary','user-secretary',?)`).bind(id,today,id).run();
  const {tasks}=await view('treasurer');
  const task=tasks.find(task=>task.id===id);
  assert.equal(task.source,'manual');
  assert.equal(task.sourceLabel,'Committee notice');
  assert.equal(task.noticeId,id);
  assert.equal(task.href,'#committee/notices');
  assert.ok(!(await view('other-officer')).tasks.some(task=>task.id===id));
  await submit('assistantsecretary',{action:'complete',source:task.source,id,version:task.version,paper:true});
  assert.ok(!(await view('treasurer')).tasks.some(task=>task.id===id));
  const entry=await db.prepare('SELECT t.done_at FROM committee_notices n JOIN officer_todo_items t ON t.id=n.task_id WHERE n.id=?').bind(id).first();
  assert.ok(entry.done_at);
});

test('event tasks reach a personal list only after volunteering; a returned sheet updates the event',async t=>{
  const {db,view,submit,send}=await fixture(t),eventId=randomUUID();
  await db.batch([
    db.prepare("INSERT INTO club_events(id,type,title,created_at,created_by,creator_name) VALUES(?,'bbq','Club BBQ','2026-11-21','user-secretary','Secretary')").bind(eventId),
    db.prepare("INSERT INTO club_event_jobs(event_id,key,position,title,detail) VALUES(?,'lead',0,'Coordinate the BBQ','Agree the roster')").bind(eventId),
    db.prepare("INSERT INTO club_event_jobs(event_id,key,position,title,detail,owner_kind,owner_id,owner_name) VALUES(?,'supplies',1,'Collect the food','Bring receipts','officer','user-treasurer','Treasurer')").bind(eventId),
    db.prepare("INSERT INTO club_event_jobs(event_id,key,position,title,detail,owner_kind,owner_name,helper_recorded_by) VALUES(?,'cook',2,'Cook','Check the shift','helper','Willing Helper','user-secretary')").bind(eventId)
  ]);
  const secretary=await view('secretary');
  assert.deepEqual(secretary.tasks.filter(t=>t.source==='event').map(t=>t.office),['treasurer']);
  const [job]=(await view('treasurer')).tasks.filter(t=>t.source==='event');
  const finish={action:'complete',source:'event',id:job.id,meetingId:job.meetingId,paper:true,version:job.version};
  assert.equal((await send('secretary',{...finish,action:'assign',office:'secretary'})).status,403);
  assert.equal((await send('secretary',{...finish,paper:false})).status,403);
  await submit('assistantsecretary',finish);await submit('assistantsecretary',finish);
  const confirmed=await db.prepare("SELECT done_at,done_by,owner_id FROM club_event_jobs WHERE event_id=? AND key='supplies'").bind(eventId).first();
  assert.ok(confirmed.done_at);assert.equal(confirmed.done_by,'user-assistantsecretary');assert.equal(confirmed.owner_id,'user-treasurer');
  assert.equal((await db.prepare('SELECT version FROM club_events WHERE id=?').bind(eventId).first()).version,2);
  assert.equal((await view('treasurer')).tasks.some(t=>t.source==='event'),false);
});
async function fixture(t) {
  const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>/^\d+.*\.sql$/.test(f)).sort();
  const db=database(t,files),env={DB:db,PRIVATE_AUTH_KEY:'test-only'};
  const cookies={};
  async function register(login,role='committee') {
    const token=randomBytes(32).toString('hex');
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')").bind('user-'+login,login,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),'user-'+login)]);
    cookies[login]='__Host-plfc_session='+token;
  }
  for(const [login,role] of [['secretary','committee'],['assistantsecretary','committee'],['treasurer','treasurer'],['other-officer','committee'],['owner','administrator'],['member','member']])await register(login,role);
  async function send(login,body,path=endpoint) {
    const headers={Origin:origin};if(cookies[login])headers.Cookie=cookies[login];if(body)headers['Content-Type']='application/json';
    return handleRequest(new Request(origin+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env);
  }
  const view=async(login)=>{const r=await send(login);assert.equal(r.status,200);return r.json();};
  const submit=async(login,data)=>{const r=await send(login,data);const body=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;};
  return {db,send,view,submit,register};
}
test('only the two secretaries can allocate across offices or record a returned paper sheet',async t=>{
  const {db,send,view,submit,register}=await fixture(t);
  const add={action:'add',id:randomUUID(),office:'president',title:'Call the venue',details:'Confirm the meeting room',dueDate:''};
  assert.equal((await send('visitor')).status,401);
  assert.equal((await send('member')).status,403);
  for(const who of ['treasurer','other-officer','owner']){
    const personal=await view(who);assert.equal(personal.offices.length,1);assert.equal(personal.canAssign,false);
    assert.equal((await send(who,null,endpoint+'?office=president')).status,403);
    assert.equal((await send(who,add)).status,403);
  }
  const before=await submit('secretary',add);assert.ok(before.offices.some(o=>o.key==='president'));
  assert.equal((await submit('secretary',add)).tasks.filter(t=>t.id===add.id).length,1);
  const second=await submit('assistantsecretary',{...add,id:randomUUID(),office:'treasurer',title:'Treasurer only'});
  assert.ok(second.tasks.some(t=>t.title==='Treasurer only'));
  await register('president');
  const own=await view('president');assert.deepEqual(own.tasks.map(t=>t.title),['Call the venue']);
  assert.ok(!JSON.stringify(own).includes('Treasurer only'));
  const job=own.tasks[0],done={action:'complete',source:'manual',id:job.id,version:job.version,paper:true};
  assert.equal((await send('owner',done)).status,403);
  assert.equal((await send('president',done)).status,403);
  assert.equal((await send('secretary',{...done,paper:false})).status,403);
  const completed=await submit('assistantsecretary',done);
  assert.equal(completed.completions[0].recordedBy,'assistantsecretary');assert.equal(completed.completions[0].office,'president');assert.equal(completed.completions[0].paper,true);
  await submit('assistantsecretary',done);
  assert.equal((await db.prepare("SELECT count(*) n FROM officer_todo_log WHERE action='complete'").first()).n,1);
  const treasurer=await view('treasurer');
  assert.equal(treasurer.tasks.length,1);assert.deepEqual(treasurer.completions,[]);
  await submit('treasurer',{action:'complete',source:'manual',id:treasurer.tasks[0].id,version:1,paper:false});
});

test('officer print lists omit empty owner accounts and preserve owner work and its completion record',async t=>{
  const {db,send,view,submit}=await fixture(t);
  // Reproduce the review sign-in while preserving the existing account and its session.
  await db.prepare("UPDATE club_accounts SET login='secretary-review' WHERE id='user-owner'").run();
  const extra=await view('assistantsecretary');
  assert.ok(extra.offices.some(o=>o.label==='other-officer'),'an actual extra committee member keeps a list');
  await db.prepare("UPDATE club_accounts SET disabled=1 WHERE id='user-other-officer'").run();
  const expected=['president','vicepresident','secretary','assistantsecretary','treasurer'];
  for(const who of ['secretary','assistantsecretary']){
    const all=await (await send(who,null,endpoint+'?office=all')).json();
    assert.deepEqual(all.offices.map(o=>o.key),expected);assert.ok(!JSON.stringify(all).includes('secretary-review'));
  }
  const ownOffice='other:user-owner',ownList={key:ownOffice,label:'Webmaster'};
  assert.deepEqual((await view('owner')).offices,[ownList]);
  assert.equal((await send('owner',null,endpoint+'?office=all')).status,403);
  const id=randomUUID();
  await db.prepare(`INSERT INTO officer_todo_items(id,office,title,details,due_date,created_at,created_by)
    VALUES(?,?,'Bring the display board','','','2026-11-01','user-owner')`).bind(id,ownOffice).run();
  const legacy=await (await send('assistantsecretary',null,endpoint+'?office='+encodeURIComponent(ownOffice))).json();
  assert.deepEqual(legacy.offices,[ownList]);assert.equal(legacy.tasks[0].id,id);
  const returned=await submit('owner',{action:'complete',source:'manual',id,version:1,paper:false});
  assert.deepEqual(returned.offices,[ownList]);assert.equal(returned.completions[0].recordedBy,'Webmaster');
  const finished=await view('secretary');assert.deepEqual(finished.offices.at(-1),ownList);
  assert.equal(finished.completions[0].title,'Bring the display board');
  assert.ok(!JSON.stringify(finished).includes('secretary-review'));
  assert.equal((await db.prepare("SELECT recorded_by FROM officer_todo_log WHERE action='complete' AND task_id=?").bind(id).first()).recorded_by,'user-owner');
  assert.deepEqual((await view('treasurer')).completions,[]);
});

test('name mapping applies to the individual confirmed action; a paper return updates its source without changing any decision',async t=>{
  const {db,send,view,submit,register}=await fixture(t);await register('president');
  const meeting='hotel-meeting-2026-11-22',jobs=[{id:'venue',owner:'Pat',text:'Check visit time',dueDate:'2026-11-30',done:false},{id:'another',owner:'Pat',text:'Different work',dueDate:'2026-12-01',done:false}];
  await db.prepare("INSERT INTO meeting_notes(id,notes,actions_json,decisions_json,status,version,updated_at,updated_by,last_mutation_id) VALUES(?,'Private original',?,'[]','approved',1,'2026','secretary','m')")
    .bind(meeting,JSON.stringify(jobs)).run();
  const unknown=(await view('secretary')).tasks.find(t=>t.id==='venue');
  assert.equal(unknown.office,null);assert.equal(unknown.ownerText,'Pat');assert.equal(unknown.canComplete,false);
  const assign={action:'assign',source:'meeting',id:unknown.id,meetingId:meeting,version:1,office:'president'};
  assert.equal((await send('president',assign)).status,403);
  await submit('assistantsecretary',assign);
  const own=await view('president');assert.deepEqual(own.tasks.map(t=>t.id),['venue']);
  const completed={action:'complete',source:'meeting',id:'venue',meetingId:meeting,version:2,paper:true};
  assert.equal((await send('secretary',{...completed,version:1})).status,409);
  await submit('secretary',completed);
  const original=await db.prepare('SELECT notes,actions_json,decisions_json,status,updated_by FROM meeting_notes WHERE id=?').bind(meeting).first();
  assert.deepEqual(JSON.parse(original.actions_json),[{...jobs[0],done:true},jobs[1]]);
  assert.equal(original.notes,'Private original');assert.equal(original.updated_by,'user-secretary');assert.equal(original.status,'approved');assert.equal(original.decisions_json,'[]');
  assert.deepEqual((await(await send('president',null,'/api/meetings')).json()).openJobs.map(t=>t.id),['another']);
});

test('Sunday’s informal catch-up only contributes finalised follow-ups to office lists and the register',async t=>{
  const {db,send,view,register,submit}=await fixture(t),meetingId='hotel-meeting-2026-11-22';
  await register('president');await register('vicepresident');
  const officers=['secretary','assistantsecretary','president','vicepresident','treasurer','owner'];
  const snapshot=async()=>{
    const response=await send('secretary',null,'/api/meetings');assert.equal(response.status,200);
    const {meetings,openJobs}=await response.json();
    return {record:meetings.find(item=>item.id===meetingId),open:openJobs.filter(job=>job.meetingId===meetingId)};
  };
  const initial=await snapshot();assert.equal(initial.record.kind,'informal');assert.equal(initial.record.openActions,0);
  for(const login of officers)assert.deepEqual((await view(login)).tasks,[],login+' has an empty work list before anyone assigns work');

  const job={id:'check-ice',text:'Confirm ice for the local meet',owner:'Treasurer',dueDate:'2026-11-25',done:false};
  await db.prepare(`INSERT INTO meeting_notes(id,actions_json,version,updated_at,updated_by,last_mutation_id,status)
    VALUES(?,?,1,'2026-11-21','user-secretary','draft','draft')`).bind(meetingId,JSON.stringify([job])).run();
  assert.equal((await snapshot()).record.openActions,0);
  assert.deepEqual((await snapshot()).open,[]);
  assert.deepEqual((await view('assistantsecretary')).tasks,[]);
  assert.deepEqual((await view('treasurer')).tasks,[]);

  const originalId=randomUUID();
  await submit('treasurer',{action:'add',id:originalId,office:'treasurer',title:'Follow up an old receipt',details:'Already assigned',dueDate:'2026-11-12'});
  await db.prepare("UPDATE meeting_notes SET status='approved',approved_at='2026-11-22T02:00:00Z',version=2 WHERE id=?").bind(meetingId).run();
  const final=await snapshot();assert.equal(final.record.openActions,1);assert.deepEqual(final.open.map(item=>item.id),[job.id]);
  for(const login of ['assistantsecretary','treasurer'])assert.deepEqual((await view(login)).tasks.map(t=>t.id),[originalId,job.id]);
  const personal=await view('president');assert.deepEqual(personal.tasks,[]);
});

test('the Secretary can assign an unclaimed AGM task to a paper-only seat; paper recording never grants newsletter approval',async t=>{
  const {db,send,view,submit,register}=await fixture(t);
  await db.prepare("INSERT INTO meeting_register(id,title,date,time,location,created_by,created_at,agenda_kind) VALUES('test-agm','Future AGM','2099-02-01','10:00','Club','sec','2026','agm')").run();
  await db.prepare("INSERT INTO newsletter_editions(month,bulletin_id,title,status,president_message) VALUES('2026-10','b','Club issue','review','Message for approval')").run();
  const home=await view('secretary');
  const prep=home.tasks.find(t=>t.source==='agm'&&t.id==='papers');assert.ok(prep);assert.equal(prep.office,null);
  const assigned=await submit('secretary',{action:'assign',source:'agm',id:prep.id,meetingId:prep.meetingId,version:0,planVersion:0,office:'president'});
  const ready=assigned.tasks.find(t=>t.source==='agm'&&t.id==='papers');
  assert.equal(ready.office,'president');assert.equal(ready.version,1);
  const row=await db.prepare("SELECT owner_id,owner_name,done_at FROM agm_job_state WHERE job='papers'").first();assert.deepEqual(row,{owner_id:'office:president',owner_name:'President',done_at:null});
  await register('president');
  const president=await view('president');assert.ok(president.tasks.some(t=>t.source==='agm'&&t.id==='papers'));
  const signoff=president.tasks.find(t=>t.source==='newsletter');assert.ok(signoff);assert.equal(signoff.canComplete,false);
  assert.equal((await send('assistantsecretary',{action:'complete',source:'newsletter',id:signoff.id,version:signoff.version,paper:true})).status,403);
  const done={action:'complete',source:'agm',id:'papers',meetingId:ready.meetingId,version:1,planVersion:0,paper:true};
  assert.equal((await send('assistantsecretary',{...done,planVersion:99})).status,409);
  await submit('assistantsecretary',done);
  assert.equal((await db.prepare("SELECT done_by FROM agm_job_state WHERE job='papers'").first()).done_by,'assistantsecretary');
  assert.equal((await db.prepare("SELECT status FROM newsletter_editions WHERE month='2026-10'").first()).status,'review');
  assert.equal((await view('president')).tasks.filter(t=>t.id==='papers').length,0);
});
