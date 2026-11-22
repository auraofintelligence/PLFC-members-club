import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {eventOpenOfficerJobs,eventJobCompletionWrites} from '../worker/fundraising-events.mjs';
import {eventTypes} from '../public/event-templates.js';

const endpoint='/api/committee/events',origin='https://club.example';
async function fixture(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql',
    '0007_members_and_conversation.sql','0024_club_events.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'test-fixture'},cookies={};
  for(const [login,role] of [['secretary','committee'],['assistantsecretary','committee'],['president','committee'],['other','committee'],
    ['treasurer','treasurer'],['admin','administrator'],['member','member']]){
    const token=randomBytes(32).toString('hex');
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')")
      .bind(login,login,role),db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),login)]);
    cookies[login]='__Host-plfc_session='+token;
  }
  async function api(login,body,status=200){
    const headers={Origin:origin,'Content-Type':'application/json'};if(cookies[login])headers.Cookie=cookies[login];
    const r=await handleRequest(new Request(origin+endpoint,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env);
    const parsed=await r.json();assert.equal(r.status,status,JSON.stringify(parsed));return parsed;
  }
  const packet=(action,id,fields={})=>({action,id,mutationId:randomUUID(),...fields});
  return {api,packet,db};
}

test('committee event templates create genuine unassigned jobs, including lead; each volunteer controls their own claim',async t=>{
  const {api,packet,db}=await fixture(t),id=randomUUID(),event=packet('create',id,{type:'bbq',title:'Club BBQ',goal:'Junior fishing gear'});
  for(const [role,status] of [['visitor',401],['member',403]]){await api(role,null,status);await api(role,event,status);}
  const created=(await api('secretary',event,201)).events[0];
  assert.equal(created.createdBy,'Secretary');assert.equal(created.status,'open');
  assert.equal(created.takingsCents,null);assert.equal(created.netCents,null);
  assert.deepEqual(created.jobs.map(j=>j.key),eventTypes.bbq.tasks.map(j=>j.key));
  assert.ok(created.jobs.every(j=>j.ownerKind===null && j.ownerName===null && j.doneAt===null && !j.canManage));
  await api('secretary',event);await api('secretary',{...event,title:'Rewrite the original'},409);
  await api('other',packet('create',id,{title:'Different event',type:'raffle'}),409);
  const claim=packet('claim',id,{key:'lead',version:1});
  const claimed=(await api('president',claim)).events[0];assert.equal(claimed.version,2);
  assert.equal(claimed.jobs[0].ownerName,'President');assert.equal(claimed.jobs[0].canManage,true);
  assert.equal((await api('president',claim)).events[0].version,2);
  await api('secretary',packet('claim',id,{key:'lead',version:1}),409);
  await api('secretary',packet('done',id,{key:'lead',version:2}),403);
  await api('other',packet('helper',id,{key:'venue',version:1,helperName:'Sam',agreed:false}),400);
  const helper=packet('helper',id,{key:'venue',version:1,helperName:'Sam',agreed:true});
  const named=(await api('other',helper)).events[0].jobs.find(j=>j.key==='venue');
  assert.equal(named.canManage,true);assert.equal(named.ownerKind,'helper');assert.equal(named.ownerName,'Sam');
  await api('treasurer',packet('done',id,{key:'venue',version:2}),403);
  const done=packet('done',id,{key:'venue',version:2});
  const recorded=(await api('president',done)).events[0].jobs.find(j=>j.key==='venue');
  assert.equal(recorded.doneBy,'President');assert.equal(recorded.ownerName,'Sam');assert.ok(recorded.doneAt);
  await api('president',done);await api('assistantsecretary',packet('reopen',id,{key:'venue',version:3}));
  await api('other',packet('release',id,{key:'venue',version:4}));
  assert.deepEqual((await db.prepare(eventOpenOfficerJobs).all()).results.map(j=>j.id),['lead']);
  const args={eventId:id,key:'lead',version:2,ownerId:'president',actorId:'assistantsecretary',actorName:'Assistant Secretary',stamp:'2026-11-21'};
  const wrong=await db.batch(eventJobCompletionWrites(db,{...args,ownerId:'secretary'}));
  assert.equal(wrong[0].meta.changes,0);assert.equal(wrong[1].meta.changes,0);
  const paper=await db.batch(eventJobCompletionWrites(db,args));
  assert.equal(paper[0].meta.changes,1);assert.equal(paper[1].meta.changes,1);assert.deepEqual((await db.prepare(eventOpenOfficerJobs).all()).results,[]);
  assert.equal((await api('other')).events[0].jobs[0].doneBy,'Assistant Secretary');
  assert.equal((await db.prepare("SELECT count(*) n FROM club_event_activity WHERE action='create'").first()).n,1);
});

test('private event details, closing records and treasurer-only figures remain consistent on retry and failed writes',async t=>{
  const {api,packet,db}=await fixture(t);
  const ids={};
  for(const type of Object.keys(eventTypes)){
    const id=ids[type]=randomUUID(),c=packet('create',id,{type,title:'Club '+type});
    const entry=(await api('other',c,201)).events.find(e=>e.id===id);
    assert.deepEqual(entry.jobs.map(j=>j.key),eventTypes[type].tasks.map(j=>j.key));
  }
  const id=ids.raffle,find=desk=>desk.events.find(e=>e.id===id);
  const edit=packet('edit',id,{version:1,title:'Raffle night',date:'2026-12-03',location:'Club',goal:'Junior gear',notes:'Collect the prizes'});
  const saved=find(await api('president',edit));assert.equal(saved.title,edit.title);assert.equal(saved.date,edit.date);
  await api('other',{...edit,mutationId:randomUUID(),location:'Different place'},409);
  const close=packet('close',id,{version:2,closeNote:'Closing the run sheet after the event'});
  const closed=find(await api('other',close));assert.equal(closed.status,'closed');assert.ok(closed.jobs.every(j=>!j.doneAt));
  assert.equal(closed.closedBy,'other');assert.equal(closed.closeNote,close.closeNote);
  await api('other',close);await api('other',packet('claim',id,{key:'lead',version:1}),409);
  await api('other',packet('addJob',id,{version:3,title:'Second shift'}),409);
  await api('president',{...edit,version:3,mutationId:randomUUID()},409);
  const money=packet('money',id,{version:3,takingsCents:10005,expensesCents:1500});
  for(const role of ['president','secretary','other'])await api(role,money,403);
  const amounts=find(await api('treasurer',money));assert.equal(amounts.moneyRecordedBy,'Treasurer');assert.equal(amounts.netCents,8505);
  await api('treasurer',money);assert.equal(find(await api('secretary')).netCents,8505);
  for(const invalid of [-1,0.01,'1560'])await api('admin',packet('money',id,{version:4,takingsCents:invalid,expensesCents:0}),400);
  await api('admin',packet('money',id,{version:4,takingsCents:0,expensesCents:1500}));
  const reopen=packet('reopenEvent',id,{version:5});assert.equal(find(await api('assistantsecretary',reopen)).status,'open');
  await db.prepare("CREATE TRIGGER refuse_event_audit BEFORE INSERT ON audit_log WHEN NEW.action='club_event_claim' BEGIN SELECT raise(abort,'fixture failure'); END").run();
  await api('other',packet('claim',id,{key:'prizes',version:1}),500);
  const final=find(await api('other'));assert.equal(final.jobs.find(j=>j.key==='prizes').ownerName,null);assert.equal(final.version,6);
  const idBBQ=ids.bbq,shift=packet('addJob',idBBQ,{version:1,title:'Second grill shift, noon to 1 pm',detail:'Meet the first cook at ten to noon.'});
  const roster=await api('other',shift);
  const last=roster.events.find(e=>e.id===idBBQ).jobs.at(-1);
  assert.equal(last.key,'job-'+shift.mutationId);assert.equal(last.title,shift.title);assert.equal(last.detail,shift.detail);assert.equal(last.ownerKind,null);
  const retried=await api('other',shift);assert.equal(retried.events.find(e=>e.id===idBBQ).jobs.length,eventTypes.bbq.tasks.length+1);
  await api('other',{...shift,mutationId:randomUUID()},409);
  await db.prepare('DROP TRIGGER refuse_event_audit').run();
  const volunteered=await api('president',packet('claim',idBBQ,{key:last.key,version:1}));
  assert.equal(volunteered.events.find(e=>e.id===idBBQ).jobs.at(-1).ownerName,'President');
  assert.equal((await db.prepare("SELECT count(*) n FROM club_event_activity WHERE event_id=? AND action='money'").bind(id).first()).n,2);
  assert.equal((await db.prepare("SELECT count(*) n FROM club_event_activity WHERE action='close'").first()).n,1);
});
