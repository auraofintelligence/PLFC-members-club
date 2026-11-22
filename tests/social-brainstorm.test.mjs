import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const path='/api/committee/social-brainstorm',planner='/api/committee/social-planner';
async function fixture(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql',
    '0007_members_and_conversation.sql','0022_committee_social_planner.sql','0023_committee_social_brainstorms.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'private-fixture'},cookies={};
  for(const [login,role] of [['secretary','committee'],['treasurer','treasurer'],['other','committee'],['member','member']]){
    const token=randomBytes(32).toString('hex');
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')").bind(login,login,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),login)]);
    cookies[login]='__Host-plfc_session='+token;
  }
  const send=(role,body,route=path)=>{
    const headers={Origin:'https://club.example','Content-Type':'application/json'};if(cookies[role])headers.Cookie=cookies[role];
    return handleRequest(new Request(headers.Origin+route,{headers,method:body?'POST':'GET',body:body&&JSON.stringify(body)}),env);
  };
  const read=async(role,body,expected=200,route=path)=>{
    const response=await send(role,body,route),json=await response.json();assert.equal(response.status,expected,JSON.stringify(json));return json;
  };
  return {db,send,read};
}
test('one private shared session feeds real planner posts and survives retries, edits and a simultaneous close',async t=>{
  const {db,read}=await fixture(t),id=randomUUID(),start={action:'start',id,topic:'Ideas for the next club meet'};
  for(const [role,status] of [['guest',401],['member',403]]){
    await read(role,null,status);await read(role,start,status);
  }
  assert.deepEqual(await read('other'),{active:null,recent:[]});
  const opened=await read('secretary',start,201);
  assert.equal(opened.active.version,1);assert.equal(opened.active.startedBy,'secretary');
  await read('secretary',start);
  await read('treasurer',{...start,id:randomUUID()},409);
  const idea={action:'idea',sessionId:id,id:randomUUID(),title:'Photo of the junior catch',channels:['instagram','facebook']};
  const room=await read('treasurer',idea,201),post=room.active.ideas[0];
  assert.equal(room.active.version,2);assert.equal(post.id,idea.id);assert.equal(post.status,'idea');assert.equal(post.plannedDate,'');
  assert.equal(post.createdBy,'treasurer');assert.deepEqual(post.channels,['facebook','instagram']);
  await read('treasurer',idea);
  await read('other',{...idea,title:'Overwrite another officer'},409);
  const drafted={id:post.id,version:1,title:'Junior catch photo call',body:'Bring a photo to the next local meet.',
    channels:post.channels,status:'draft',plannedDate:'2027-01-16',links:{}};
  await read('other',drafted,200,planner);
  const retry=await read('treasurer',idea);
  assert.equal(retry.active.ideas[0].title,drafted.title);assert.equal(retry.active.ideas[0].version,2);
  assert.equal(retry.active.ideas[0].plannedDate,'2027-01-16');
  const second={action:'idea',sessionId:id,id:randomUUID(),title:'Ask for volunteer yarns'};
  await read('other',second,201);
  await read('secretary',{action:'finish',sessionId:id,version:2},409);
  const finish={action:'finish',sessionId:id,version:3};
  const closed=await read('secretary',finish);
  assert.equal(closed.active,null);assert.equal(closed.recent[0].finishedBy,'secretary');
  assert.equal(closed.recent[0].version,4);assert.deepEqual(closed.recent[0].ideas.map(p=>p.id),[idea.id,second.id]);
  await read('secretary',finish);await read('treasurer',idea);
  await read('other',{...second,id:randomUUID()},409);
  const next=await read('other',{...start,id:randomUUID(),topic:'The next newsletter'},201);
  assert.equal(next.recent.length,1);assert.equal(next.active.topic,'The next newsletter');
  const audit=await db.prepare("SELECT action,count(*) n FROM audit_log GROUP BY action ORDER BY action").all();
  assert.deepEqual(Object.fromEntries(audit.results.map(r=>[r.action,r.n])),{
    social_brainstorm_finished:1,social_brainstorm_idea_added:2,social_brainstorm_started:2,social_plan_created:2,social_plan_marked_draft:1
  });
});

test('brainstorm validation and atomic writes protect the session and planner when a save fails',async t=>{
  const {db,read}=await fixture(t),id=randomUUID();
  const start={action:'start',id,topic:'Club news'},idea={action:'idea',sessionId:id,id:randomUUID(),title:'First idea'};
  await read('secretary',{...start,id:'not-an-id'},400);
  await read('secretary',start,201);
  for(const extra of [{channels:['unknown']},{title:'line\nbreak'},{status:'published'},{createdBy:'other'}])
    await read('treasurer',{...idea,...extra},400);
  const existing={id:idea.id,version:0,title:'Existing planner item',plannedDate:'',status:'idea',channels:[],links:{}};
  await read('secretary',existing,201,planner);
  await read('secretary',idea,409);
  await db.prepare("CREATE TRIGGER refuse_brainstorm_action BEFORE INSERT ON audit_log WHEN NEW.action='social_brainstorm_idea_added' BEGIN SELECT raise(abort,'fixture failure'); END").run();
  const rejected={...idea,id:randomUUID()};await read('treasurer',rejected,500);
  const desk=await read('secretary');assert.deepEqual(desk.active.ideas,[]);assert.equal(desk.active.version,1);
  const plans=await read('secretary',null,200,planner);assert.deepEqual(plans.plans.map(i=>i.id),[existing.id]);
  const log=await db.prepare("SELECT count(*) n FROM audit_log WHERE entity_id=?").bind(rejected.id).first();assert.equal(log.n,0);
});
