import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const origin='https://club.example',path='/api/committee/social-planner';
const newIdea=(values={})=>({id:randomUUID(),version:0,title:'Local meet photographs',body:'Ask the club photographers for a picture.',
  plannedDate:'',channels:['facebook','instagram'],status:'idea',links:{},...values});
async function fixture(t) {
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0007_members_and_conversation.sql','0022_committee_social_planner.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'local-test'},cookies={};
  for(const [login,role] of [['secretary','committee'],['assistantsecretary','committee'],['president','committee'],['other-officer','committee'],['treasurer','treasurer'],['paid','member'],['lapsed','member']]){
    const token=randomBytes(32).toString('hex');
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,?)")
        .bind('test-'+login,login,role,login==='lapsed'?'2000-01-01':'2099-12-31'),
      db.prepare('INSERT INTO club_sessions(digest,account_id,expires) VALUES(?,?,4102444800)')
        .bind(createHash('sha256').update(token).digest('hex'),'test-'+login)]);
    cookies[login]='__Host-plfc_session='+token;
  }
  function call(login,body,month,method=body?'POST':'GET',post) {
    const headers={Origin:origin};
    if(cookies[login])headers.Cookie=cookies[login];if(body)headers['Content-Type']='application/json';
    const url=new URL(path,origin);
    if(month)url.searchParams.set('month',month);if(post)url.searchParams.set('post',post);
    return handleRequest(new Request(url,{method,headers,body:body?JSON.stringify(body):undefined}),env);
  }
  return {db,call};
}
test('committee share draft plans, undated ideas and dated months, while all public/member reads and edits stay closed',async t=>{
  const {db,call}=await fixture(t),idea=newIdea(),future=newIdea({title:'December update',plannedDate:'2026-12-01',channels:['youtube','tiktok']});
  for(const [login,code] of [['guest',401],['paid',403],['lapsed',403]]){
    assert.equal((await call(login,null,'2026-11')).status,code);assert.equal((await call(login,idea)).status,code);
  }
  assert.equal((await call('president',null,'2026-13')).status,400);
  const first=await call('other-officer',idea,null);assert.equal(first.status,201);
  const made=(await first.json()).plan;assert.equal(made.createdBy,'other-officer');
  assert.equal((await call('assistantsecretary',future,'2026-11')).status,201);
  const nov=await(await call('treasurer',null,'2026-11')).json(),dec=await(await call('president',null,'2026-12')).json();
  assert.deepEqual(nov.plans.map(p=>p.id),[idea.id]);assert.deepEqual(dec.plans.map(p=>p.id),[future.id,idea.id]);
  assert.equal(dec.viewer.office,'President');
  const update={...future,version:1,body:'Checked the wording.',status:'ready',plannedDate:'2027-01-04'};
  const updated=(await(await call('secretary',update,'2026-12')).json());
  assert.deepEqual(updated.plans.map(p=>p.id),[idea.id]);assert.equal(updated.plan.version,2);
  assert.equal(updated.plan.updatedBy,'secretary');assert.equal(updated.plan.createdBy,'assistantsecretary');
  assert.equal((await call('secretary',update)).status,200);
  assert.equal((await call('assistantsecretary',{...update,body:'Lost concurrent edit'})).status,409);
  const reopened=await (await call('assistantsecretary',null,'2026-12','GET',future.id)).json();
  assert.equal(reopened.month,'2027-01');
  assert.deepEqual(reopened.plans.map(p=>p.id),[future.id,idea.id]);assert.equal(reopened.plans[0].version,2);
  assert.equal((await (await call('assistantsecretary',null,'2026-12','GET',idea.id)).json()).month,'2026-12');
  assert.equal((await call('assistantsecretary',null,'2026-12','GET',randomUUID())).status,404);
  assert.equal((await call('paid',null,'2026-12','GET',future.id)).status,403);
  const marked={...update,version:2,status:'published',links:{youtube:'https://youtu.be/club-example',tiktok:'https://www.tiktok.com/@plfc/video/example'}};
  const result=await call('treasurer',marked,'2027-01');assert.equal(result.status,200);
  const listed=(await result.json()).plans[0];
  assert.equal(listed.status,'published');assert.equal(listed.links.youtube,marked.links.youtube);
  assert.equal((await db.prepare('SELECT count(*) n FROM committee_social_revisions WHERE plan_id=?').bind(future.id).first()).n,3);
  const audit=await db.prepare("SELECT actor_id,action FROM audit_log WHERE entity_id=? ORDER BY rowid").bind(future.id).all();
  assert.deepEqual(audit.results,[
    {actor_id:'test-assistantsecretary',action:'social_plan_created'},{actor_id:'test-secretary',action:'social_plan_marked_ready'},
    {actor_id:'test-treasurer',action:'social_plan_marked_published'}
  ]);
  assert.equal((await call('secretary',null,null,'DELETE')).status,405);
});

test('the planner enforces valid target platforms and dates and atomically rolls back an unconfirmed revision',async t=>{
  const {db,call}=await fixture(t),idea=newIdea({channels:[]});
  for(const update of [
    {channels:['not-a-platform']},{channels:[],status:'ready'},{plannedDate:'2027-02-29'},
    {channels:['facebook'],links:{instagram:'https://www.instagram.com/p/photo'}},
    {channels:['facebook'],links:{facebook:'https://facebook.com.outside.example/post'}},
    {channels:['facebook'],links:{facebook:'https://password@facebook.com/post'}},
    {channels:['tiktok'],links:{tiktok:'javascript:hello'}},{status:'post_now'},{createdBy:'president'}
  ]) assert.equal((await call('president',{...idea,...update})).status,400);
  const date=await call('secretary',{...idea,plannedDate:'2028-02-29'},'2028-02');assert.equal(date.status,201);
  await db.prepare("CREATE TRIGGER refuse_social_audit BEFORE INSERT ON audit_log BEGIN SELECT raise(abort,'test failure'); END").run();
  const failed=await call('secretary',{...idea,version:1,title:'Unconfirmed change'});
  assert.ok(failed.status>=500);
  const plan=await db.prepare('SELECT version,title,plannedDate FROM committee_social_current WHERE id=?').bind(idea.id).first();
  assert.deepEqual(plan,{version:1,title:idea.title,plannedDate:'2028-02-29'});
});

test('PLFC controls creation, approval and posting independently without publishing',async t=>{
  const {call}=await fixture(t);
  const workflow={preparation:'ready-set-coop',publication:'club',approved:false};
  const draft=newIdea({status:'draft',workflow,body:'Proposed club-approved story'});
  const made=await call('secretary',draft);
  assert.equal(made.status,201);
  const first=(await made.json()).plan;
  assert.equal(first.workflow.preparation,'ready-set-coop');
  assert.equal(first.workflow.publication,'club');
  assert.equal(first.workflow.approved,false);
  assert.equal((await call('president',{...draft,version:1,status:'ready'})).status,400,
    'a co-op preparation request cannot authorise publication');
  const approved={...draft,version:1,status:'ready',workflow:{...workflow,approved:true}};
  const authorised=await call('president',approved);
  assert.equal(authorised.status,200);
  const second=(await authorised.json()).plan;
  assert.equal(second.workflow.approved,true);
  assert.ok(second.workflow.approvedAt);
  assert.equal(second.workflow.publication,'club');
  const changedAfterApproval=await call('secretary',{...approved,version:2,body:'Updated after approval'});
  assert.equal(changedAfterApproval.status,400,
    'substantial changes require returning to draft and fresh club approval');
  const posting={...approved,version:2,workflow:{...approved.workflow,publication:'ready-set-coop'}};
  const queued=await call('secretary',posting);
  assert.equal(queued.status,200);
  const third=(await queued.json()).plan;
  assert.equal(third.workflow.preparation,'ready-set-coop');
  assert.equal(third.workflow.publication,'ready-set-coop');
  assert.equal(third.workflow.approved,true);
  assert.equal(third.status,'ready','choosing a provider does not publish the post');
  const revision=await call('president',{...posting,version:3,status:'draft',
    body:'Revised by PLFC',workflow:{...posting.workflow,approved:false}});
  assert.equal(revision.status,200);
  assert.equal((await revision.json()).plan.workflow.approved,false);
});
