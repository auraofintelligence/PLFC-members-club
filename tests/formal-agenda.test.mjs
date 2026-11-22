import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {handleRequest} from '../worker/index.mjs';
import {database} from './d1-fixture.mjs';

const hotel='hotel-meeting-2026-11-22',origin='https://club.example';
async function fixture(t) {
  const db=database(t),env={DB:db,PRIVATE_AUTH_KEY:'test-only'};
  async function login(login,role) {
    const token=randomBytes(32).toString('hex');
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')").bind(login,login,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),login)
    ]);
    return '__Host-plfc_session='+token;
  }
  const secretary=await login('secretary','committee'),member=await login('member','member');
  async function call(path,method='GET',data,who=secretary) {
    const headers={Origin:origin};if(who)headers.Cookie=who;if(data)headers['Content-Type']='application/json';
    return handleRequest(new Request(origin+path,{method,headers,body:data?JSON.stringify(data):undefined}),env);
  }
  async function scheduled(kind,date='2026-11-22') {
    const id=crypto.randomUUID(),data={id,kind,date,time:'10:00',title:'Club meeting',location:'Club room'};
    assert.equal((await call('/api/meetings','POST',data)).status,201);
    assert.equal((await call('/api/meetings','POST',data)).status,200);
    return id;
  }
  const get=async id=>(await call('/api/meetings/'+id+'/agenda')).json();
  const save=(id,agenda,version)=>call('/api/meetings/'+id+'/agenda','PUT',{agenda,version});
  const approve=(id,agendaVersion,more={})=>call('/api/meeting?id='+id,'PUT',{notes:'',actions:[],decisions:[],status:'approved',version:0,agendaVersion,...more});
  return {db,member,call,scheduled,get,save,approve};
}
const ballot=()=>({text:'That the club hold a local meet.',movedBy:'Member A',secondedBy:'',outcome:'carried',vote:'Chair declared the motion carried.'});

test('migration preserves historical agendas, issued reminder wording, approved records and custom titles',async t=>{
  const old=['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0011_meeting_reminders.sql','0013_reminder_snapshots.sql'];
  for(const approved of [true,false]){
    const db=database(t,old);
    if(approved)await db.prepare("INSERT INTO meeting_notes(id,status,updated_at,updated_by,last_mutation_id) VALUES(?,'approved','2026','sec','a')").bind(hotel).run();
    else await db.prepare("UPDATE meeting_register SET title='Existing custom title' WHERE id=?").bind(hotel).run();
    await db.batch([
      db.prepare("INSERT INTO meeting_agendas VALUES(?,'Original topics',3,'2026','sec')").bind(hotel),
      db.prepare("UPDATE meeting_reminders SET state='reviewed',reviewed_text='Previously issued wording' WHERE channel='email' AND meeting_id=?").bind(hotel)
    ]);
    db.migrate('0018_formal_meeting_agendas.sql');
    assert.deepEqual(await db.prepare('SELECT agenda_kind,title FROM meeting_register WHERE id=?').bind(hotel).first(),
      approved?{agenda_kind:'committee',title:'Club meeting at Point Lookout Hotel'}:{agenda_kind:'informal',title:'Existing custom title'});
    assert.deepEqual(await db.prepare('SELECT topics,revision,formal_json FROM meeting_agendas WHERE meeting_id=?').bind(hotel).first(),
      {topics:'Original topics',revision:3,formal_json:null});
    assert.equal((await db.prepare("SELECT reviewed_text FROM meeting_reminders WHERE channel='email' AND meeting_id=?").bind(hotel).first()).reviewed_text,'Previously issued wording');
  }
});

test('Sunday has its own listening agenda and never becomes a voting meeting; access and reminders follow the meeting',async t=>{
  const {call,get,save,member,scheduled}=await fixture(t);
  const initial=await get(hotel),path='/api/meetings/'+hotel+'/agenda';
  assert.equal(initial.fixedKind,'informal');
  assert.equal(initial.agenda.kind,'informal');
  assert.ok(initial.agenda.items.some(i=>i.title==='Hear from the hotel'));
  const other=await get(await scheduled('informal'));
  assert.equal(other.fixedKind,null);
  assert.ok(other.agenda.items.every(i=>!i.title.includes('hotel')));
  assert.equal((await call(path,'GET',null,null)).status,401);
  assert.equal((await call(path,'GET',null,member)).status,403);
  assert.equal((await save(hotel,{...initial.agenda,kind:'committee'},0)).status,400);
  const bad=structuredClone(initial.agenda);bad.items[0].motions.push(ballot());
  assert.equal((await save(hotel,bad,0)).status,400);
  const agenda=initial.agenda;agenda.items[0].notes='Private follow-up note';agenda.attendance='Private list';
  assert.equal((await save(hotel,agenda,0)).status,200);
  const reminder=await (await call('/api/meetings/reminders?id='+hotel)).json();
  assert.match(reminder.agenda,/Welcome and introductions/);
  assert.deepEqual(reminder.examples,[{channel:'email'}]);
  assert.deepEqual(reminder.reminders.map(row=>row.channel),['chat']);
  assert.doesNotMatch(JSON.stringify(reminder),/Private list|Private follow-up/);
  const accidental=await call('/api/meeting?id='+hotel,'PUT',{notes:'Suggestions recorded',actions:[],decisions:['Book the hotel'],version:0});
  assert.equal(accidental.status,400);
});

test('legacy topics retain their order; formal saves guard conflicting editors, reminders and approval',async t=>{
  const {call,db,get,save,scheduled,approve}=await fixture(t);
  const id=await scheduled('committee');
  await db.prepare('INSERT INTO meeting_agendas(meeting_id,topics,revision,updated_at,updated_by) VALUES(?,?,3,?,?)')
    .bind(id,'First original topic\nSecond original topic','2026-11-01','original').run();
  const initial=await get(id),agenda=initial.agenda;
  assert.equal(initial.legacy,true);assert.deepEqual(agenda.items.map(i=>i.title),['First original topic','Second original topic']);
  agenda.quorumStatus='present';agenda.quorum='Quorum checked by the chair';agenda.openedAt='10:05';
  agenda.items.reverse();agenda.items[0].motions.push(ballot());
  const saved=await(await save(id,agenda,3)).json();assert.equal(saved.version,4);assert.equal(saved.legacy,false);
  assert.equal((await(await save(id,agenda,3)).json()).version,4);
  assert.equal((await save(id,{...agenda,chair:'Different chair'},3)).status,409);
  assert.equal((await call('/api/meetings/reminders','PUT',{id,agenda:'Overwritten',version:4})).status,409);
  const draftClock=t.mock.method(Date,'now',()=>Date.parse('2026-11-15T02:00:00Z'));
  const reminder=await(await call('/api/meetings/reminders?id='+id)).json();
  draftClock.mock.restore();
  assert.equal(reminder.reminders[0].state,'ready');
  assert.match(reminder.reminders[0].text,/1\. Second original topic\n2\. First original topic/);
  assert.doesNotMatch(reminder.reminders[0].text,/Member A|Quorum checked|chair declared/i);
  assert.equal((await approve(id,3)).status,409);
  assert.equal((await approve(id,undefined)).status,409);
  assert.equal((await approve(id,4)).status,200);
  assert.equal((await save(id,{...agenda,closedAt:'11:00'},4)).status,409);
  assert.deepEqual((await(await call('/api/member/minutes')).json()).minutes,[]);
  assert.equal((await get(id)).locked,true);
});

test('an AGM attempt can record no quorum and adjournment without claiming a vote or publishing its private notes',async t=>{
  const {call,member,get,save,scheduled,approve}=await fixture(t);
  const id=await scheduled('agm','2024-01-01'),{agenda}=await get(id);
  assert.ok(agenda.items.some(i=>i.title.includes('remuneration')));
  assert.ok(agenda.items.some(i=>i.title.includes('Election')));
  assert.equal((await approve(id,0)).status,400);
  assert.equal((await approve(id,0,{notes:'The proposed motion appeared in draft notes.',decisions:['Elect the committee']})).status,400);
  agenda.quorumStatus='absent';agenda.adjournment='No quorum at 10:30. Secretary to advise members of the adjournment.';
  agenda.attendance='Private attendance';agenda.items[1].motions=[ballot()];
  assert.equal((await save(id,agenda,0)).status,400);
  agenda.items[1].motions=[];assert.equal((await save(id,agenda,0)).status,200);
  assert.equal((await approve(id,1,{decisions:['Elected an officer']})).status,400);
  assert.equal((await approve(id,1)).status,200);
  assert.deepEqual((await(await call('/api/member/minutes','GET',null,member)).json()).minutes,[]);
  assert.equal((await call('/api/meetings/'+id+'/release','POST',{version:1,text:'The AGM was adjourned for lack of a quorum.'})).status,200);
  const shared=(await(await call('/api/member/minutes','GET',null,member)).json()).minutes[0];
  assert.equal(shared.kind,'agm');assert.equal(shared.quorumStatus,'absent');assert.ok(!JSON.stringify(shared).includes('Private attendance'));
});

test('a future AGM can be prepared but cannot be finalised',async t=>{
  const {scheduled,get,save,approve}=await fixture(t),id=await scheduled('agm','2099-05-01');
  const {agenda}=await get(id);agenda.quorumStatus='present';
  assert.equal((await save(id,agenda,0)).status,200);
  const res=await approve(id,1,{notes:'Draft minutes.'});
  assert.equal(res.status,400);assert.match(JSON.stringify(await res.json()),/day of the AGM/);
  assert.equal((await get(id)).locked,false);
});

test('loss of quorum preserves earlier votes and bars further decisions',async t=>{
  const {get,save,scheduled}=await fixture(t),id=await scheduled('general');
  const {agenda}=await get(id);agenda.items[0].motions.push(ballot());
  assert.equal((await save(id,agenda,0)).status,400);
  agenda.quorumStatus='present';assert.equal((await save(id,agenda,0)).status,200);
  agenda.quorumStatus='lost';agenda.adjournment='The meeting adjourned at 11:20.';assert.equal((await save(id,agenda,1)).status,200);
  const extra=structuredClone(agenda);extra.items[0].motions.push(ballot());
  assert.equal((await save(id,extra,2)).status,400);
  const removed=structuredClone(agenda);removed.items[0].motions=[];assert.equal((await save(id,removed,2)).status,400);
  const special=await get(await scheduled('special'));assert.ok(special.agenda.items.every(i=>!i.title.toLowerCase().includes('other business')));
});

test('the committee can see every open job with an owner, including follow-ups from informal notes',async t=>{
  const {call,approve,scheduled,member}=await fixture(t);
  const earlier=await scheduled('committee','2026-11-02'),later=await scheduled('informal','2026-11-15'),draft=await scheduled('general','2026-11-20');
  const action=(id,owner,dueDate,done=false)=>({id,text:'Job '+id,owner,dueDate,done});
  const carriedOver=action('j1','Secretary','2026-12-12'),closeLater=action('j2','President','2026-12-01'),earlyDue=action('j3','Vice President','2026-11-28');
  const repeated={...carriedOver,owner:'Assistant Secretary',dueDate:'2026-12-05'};
  assert.equal((await approve(earlier,0,{notes:'Record confirmed',actions:[carriedOver,closeLater]})).status,200);
  const laterActions=[repeated,{...closeLater,done:true},earlyDue];
  assert.equal((await approve(later,0,{notes:'Catch-up notes confirmed',actions:laterActions})).status,200);
  assert.equal((await call('/api/meeting?id='+draft,'PUT',{notes:'Ideas only',version:0,actions:[action('draft','Treasurer','2026-11-25')]})).status,200);
  const jobs=async()=>(await(await call('/api/meetings')).json()).openJobs;
  const open=await jobs();assert.deepEqual(open.map(j=>[j.id,j.owner,j.meetingId]),[['j3','Vice President',later],['j1','Assistant Secretary',later]]);
  assert.equal(open[0].dueDate,earlyDue.dueDate);
  assert.equal((await call('/api/meetings','GET',null,member)).status,403);
  const after=await call('/api/meeting?id='+later,'PUT',{notes:'Catch-up notes confirmed',actions:laterActions.map(j=>({...j,done:j.id!=='j2'})),version:1,status:'approved'});
  assert.equal(after.status,200);assert.deepEqual((await jobs()).map(j=>j.id),['j2']);
});
