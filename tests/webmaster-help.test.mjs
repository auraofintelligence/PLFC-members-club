import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const path='/api/access-help',desk='/api/committee/access-help';
const token=()=>randomBytes(32).toString('hex');
async function fixture(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0007_members_and_conversation.sql','0050_access_help.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'help-fixture-secret'},cookies={};
  const records=[];
  for(const [name,role] of [['secretary','committee'],['webmaster','administrator'],['assistantsecretary','committee'],['member','member'],['treasurer','treasurer']]){
    const secret=token();
    records.push(db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'x','x',0,'2099-12-31')").bind(name,name,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(secret).digest('hex'),name));
    cookies[name]='__Host-plfc_session='+secret;
  }
  await db.batch(records);
  async function call(url,data,who,status=200){
    const origin='https://club.test',headers={Origin:origin};
    if(cookies[who])headers.Cookie=cookies[who];if(data)headers['Content-Type']='application/json';
    const response=await handleRequest(new Request(origin+url,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined}),env);
    const body=await response.json();assert.equal(response.status,status,JSON.stringify(body));return body;
  }
  return {db,call};
}

test('locked-out requester gets one case, distinct personal receipts, shared progress, and a private status-only link',async t=>{
  const {db,call}=await fixture(t);
  const input={key:token(),topic:'password',source:'signin',contactType:'email',contact:'PERSON@example.test',question:'The next screen stays blank.'};
  const received=await call(path,input,null,201);
  assert.match(received.reference,/^PLFC-[A-F0-9]{12}$/);assert.equal(received.state,'new');
  assert.deepEqual(await call(path,input,null,201),received);
  await call(path,{...input,contact:'different@example.test'},null,409);
  const stored=await db.prepare('SELECT * FROM webmaster_help_requests').all();assert.equal(stored.results.length,1);
  assert.doesNotMatch(JSON.stringify(stored),/person@example|screen stays blank/i);assert.ok(!JSON.stringify(stored).includes(input.key));
  const publicStatus=await call(path+'/status',{key:input.key},null);
  assert.deepEqual(Object.keys(publicStatus).sort(),['createdAt','reference','state','updatedAt']);
  await call(path+'/status',{key:token()},null,404);
  await call(desk,null,null,401);
  for(const who of ['member','assistantsecretary','treasurer'])await call(desk,null,who,403);
  const master=await call(desk,null,'webmaster'),sec=await call(desk,null,'secretary');
  assert.equal(master.role,'webmaster');assert.equal(sec.role,'secretary');
  assert.deepEqual(master.requests,sec.requests);assert.equal(master.counts.unread,1);
  const item=master.requests[0],action=(what,version=1)=>({id:item.id,action:what,version});
  assert.equal(item.contact,'person@example.test');
  assert.equal(item.question,input.question);
  assert.doesNotMatch(JSON.stringify(await call(desk+'?summary=1',null,'secretary')),/screen stays blank|person@example/i);
  await call(desk,action('seen'),'secretary');
  assert.equal((await call(desk+'?summary=1',null,'webmaster')).counts.unread,1);
  assert.equal((await call(desk+'?summary=1',null,'secretary')).counts.unread,0);
  await call(desk,action('claim'),'secretary');await call(desk,action('claim'),'secretary');
  await call(desk,action('claim'),'webmaster',409);
  assert.equal((await call(path+'/status',{key:input.key},null)).state,'in_progress');
  await call(desk,action('seen'),'webmaster');
  assert.equal((await call(desk,null,'webmaster')).requests[0].unread,true);
  await call(desk,action('resolve',2),'secretary');
  assert.deepEqual((await call(desk,null,'webmaster')).requests,[]);
  const closed=await call(desk+'?folder=resolved',null,'webmaster');
  assert.equal(closed.counts.unreadResolved,1);assert.equal(closed.requests[0].assignedRole,'secretary');
  assert.equal((await call(path+'/status',{key:input.key},null)).state,'resolved');
  assert.equal((await db.prepare("SELECT count(*) AS n FROM audit_log WHERE action LIKE 'webmaster_help_%'").first()).n,2);
  const counts=await db.prepare('SELECT count(*) AS n FROM club_invites').first();assert.equal(counts.n,0);
});

test('support accepts structured categories and contacts, limits submissions and never accepts credentials or private links',async t=>{
  const {call,db}=await fixture(t);
  const input={key:token(),topic:'invitation',source:'invitation',contactType:'phone',contact:'0400 000 001'};
  await call(path,{...input,password:'not allowed'},null,400);
  await call(path,{...input,question:'The code was 123456'},null,400);
  await call(path,{...input,question:'Here is https://club.test/#activate=hidden'},null,400);
  await call(path,{...input,source:'https://club.test/#activate=secret'},null,400);
  await call(path,{...input,contact:'https://club.test/#activate=secret'},null,400);
  await call(path,{...input,contactType:'email',contact:'person@example.test/?key=secret'},null,400);
  const result=await call(path,input,null,201);
  const current=await db.prepare('SELECT key FROM club_auth_attempts WHERE count=1').first();
  await db.prepare('UPDATE club_auth_attempts SET count=12 WHERE key=?').bind(current.key).run();
  assert.equal((await call(path,input,null,201)).reference,result.reference);
  await call(path,{...input,key:token()},null,429);
  await call(desk,{id:'bad',version:1,action:'seen'},'member',403);
});
