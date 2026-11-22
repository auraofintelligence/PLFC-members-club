import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,webcrypto} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {readdirSync} from 'node:fs';
import {accountEndpoint,passwordIdentity} from '../worker/accounts.mjs';
import {handleRequest} from '../worker/index.mjs';
import {handleApplications,issueApplicationInvite,canJoinConversation} from '../worker/applications.mjs';

globalThis.crypto??=webcrypto;
const pricingDate='2099-01-31';
const origin='https://club.example', path='/api/applications';
const standard={id:'committee-id',role:'committee',accountRole:'committee',canManageStock:false};
const treasurer={id:'treasurer-id',role:'committee',accountRole:'treasurer',canManageStock:true};
const digest = value => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('hex');
class HttpError extends Error {constructor(status,message,code){super(message);this.status=status;this.code=code;}}
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
const helpers={HttpError,json,bodyJson:req=>req.json()};
function fixture(t) {
  const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>/^\d{4}.*\.sql$/.test(f)&&f.slice(0,4)<='0030').sort();
  return {DB:database(t,files),PRIVATE_AUTH_KEY:random()};
}
const post=(endpoint,data)=>new Request(origin+endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
function call(env,endpoint,identity,data) {
  const req=data?post(endpoint,data):new Request(origin+endpoint);
  return handleApplications(new URL(req.url).pathname,req,env,identity,helpers);
}
const draft=()=>({requestId:crypto.randomUUID(),fullName:'Member Example',category:'adult',mobile:'0400 000 000',email:'person@example.test',
  packMethod:'collect',adultDeclaration:true,consent:true});
const issue=async(env,id,admin=treasurer)=>{
  const token=random();
  return issueApplicationInvite({db:env.DB,id,login:'member.test',admin,token,key:digest(token),
    expires:Math.floor(Date.now()/1000)+3600,paidThrough:pricingDate,...helpers});
};
const statusCode = expected => error => error.status===expected;

test('application intake is private, validated, idempotent and does not issue access',async t=>{
  const env=fixture(t), app=draft();
  await assert.rejects(call(env,path+'/apply',null,{...app,consent:false}),statusCode(400));
  await assert.rejects(call(env,path+'/apply',null,{...app,category:'junior'}),statusCode(400));
  await assert.rejects(call(env,path+'/apply',null,{...app,packMethod:'post'}),statusCode(400));
  await assert.rejects(call(env,path+'/apply',null,{...app,email:'',mobile:''}),statusCode(400));
  app.address='Should be discarded when collecting';
  for(let i=0;i<2;i++) {
    const response=await call(env,path+'/apply',null,app);
    assert.equal(response.status,202);
    assert.deepEqual(await response.json(),{received:true});
  }
  await assert.rejects(call(env,path,null),statusCode(401));
  await assert.rejects(call(env,path,{id:'member',role:'member'}),statusCode(403));
  const group=await (await call(env,path,standard)).json();
  assert.equal(group.applications.length,1);
  assert.equal(group.applications[0].email,undefined);
  const record=group.applications[0];
  assert.deepEqual(await env.DB.prepare('SELECT postal_address,status,account_id FROM membership_applications').first(),{postal_address:'',status:'pending',account_id:null});
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM club_accounts').first()).n,0);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM club_invites').first()).n,0);
  await assert.rejects(call(env,path+'/'+record.id,null),statusCode(401));
  await assert.rejects(issue(env,record.id),statusCode(409));
  await assert.rejects(call(env,path+'/'+record.id+'/review',standard,{decision:'approved',socialChecked:true}),statusCode(400));
  await call(env,path+'/'+record.id+'/review',standard,{decision:'approved'});
  await assert.rejects(issue(env,record.id,standard),statusCode(403));
  assert.equal((await issue(env,record.id)).status,201);
  await assert.rejects(issue(env,record.id),statusCode(409));
});

for (const allowSocial of [false,true]) {
  test('a verified cadet invitation links the account; legacy social consent does not unlock conversation '+allowSocial,async t=>{
    const env=fixture(t), app={...draft(),category:'cadet',guardianName:'Guardian Example',guardianSocial:allowSocial,guardianAuthorised:true};
    await call(env,path+'/apply',null,app);
    const {id}=await env.DB.prepare('SELECT id FROM membership_applications').first();
    const review=values=>call(env,path+'/'+id+'/review',standard,values);
    await assert.rejects(review({decision:'approved'}),statusCode(400));
    if (!allowSocial) await assert.rejects(review({decision:'approved',guardianChecked:true,socialChecked:true}),statusCode(400));
    await review({decision:'approved',guardianChecked:true,socialChecked:allowSocial});
    await assert.rejects(review({decision:'declined'}),statusCode(409));
    const invitation=await (await issue(env,id)).json();
    const req=post('/api/auth/activate',{login:invitation.login,token:invitation.token,password:'A unique string for a local test'});
    const activated=await accountEndpoint('/api/auth/activate',req,env,helpers);
    assert.equal(activated.status,200);
    const cookie=activated.headers.get('set-cookie').split(';')[0];
    const member=await passwordIdentity(new Request(origin,{headers:{cookie}}),env);
    assert.equal(member.role,'member');
    assert.equal((await env.DB.prepare('SELECT status,account_id FROM membership_applications WHERE id=?').bind(id).first()).account_id,member.id);
    assert.deepEqual(await env.DB.prepare('SELECT membership_type,contact_email,contact_mobile,pack_method,pref_email FROM member_profiles WHERE account_id=?').bind(member.id).first(),
      {membership_type:'cadet',contact_email:app.email,contact_mobile:app.mobile,pack_method:'collect',pref_email:0});
    assert.equal(await canJoinConversation(env.DB,member),false);
    assert.equal(await canJoinConversation(env.DB,{...member,role:'signed_in'}),false);
    await env.DB.prepare("UPDATE member_profiles SET membership_type='adult' WHERE account_id=?").bind(member.id).run();
    assert.equal(await canJoinConversation(env.DB,member),false);
    await env.DB.prepare("UPDATE member_profiles SET membership_type='unconfirmed' WHERE account_id=?").bind(member.id).run();
    assert.equal(await canJoinConversation(env.DB,member),false);
    assert.equal(await canJoinConversation(env.DB,standard),true);
  });
}

test('rate limit does not create an application after the threshold',async t=>{
  const env=fixture(t), app=draft();
  for (let i=0;i<12;i++) await call(env,path+'/apply',null,app);
  await assert.rejects(call(env,path+'/apply',null,{...app,requestId:crypto.randomUUID()}),statusCode(429));
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM membership_applications').first()).n,1);
});

test('website routes keep the verified payment step with the treasurer and issue an application-bound account',async t=>{
  const env=fixture(t), app=draft(), staffToken=random(), committeeToken=random();
  async function staffSession(role,token) {
    await env.DB.prepare('INSERT INTO club_accounts(id,login,role,salt,verifier,created_at) VALUES(?,?,?,?,?,?)')
      .bind(role,role,role,'test','test',0).run();
    await env.DB.prepare('INSERT INTO club_sessions(digest,account_id,expires) VALUES(?,?,?)').bind(digest(token),role,4102444800).run();
  }
  await staffSession('treasurer',staffToken);await staffSession('committee',committeeToken);
  const request=(endpoint,data,cookie)=>{
    const headers={Origin:origin,'Content-Type':'application/json'};
    if (cookie) headers.Cookie='__Host-plfc_session='+cookie;
    return handleRequest(new Request(origin+endpoint,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined}),env);
  };
  assert.equal((await request(path+'/apply',app)).status,202);
  assert.equal((await request(path)).status,401);
  const listed=await (await request(path,null,committeeToken)).json();
  const {id}=listed.applications[0];
  assert.equal((await request(path+'/'+id+'/review',{decision:'approved'},committeeToken)).status,200);
  const invite={applicationId:id,role:'member',login:'person.test',paidThrough:pricingDate,verified:true};
  assert.equal((await request('/api/accounts/invite',invite,committeeToken)).status,403);
  assert.equal((await request('/api/accounts/invite',{...invite,verified:false},staffToken)).status,400);
  const response=await request('/api/accounts/invite',invite,staffToken);
  assert.equal(response.status,201);
  const issued=await response.json();
  const activation=await request('/api/auth/activate',{login:invite.login,password:'Long test-only club password',token:issued.token});
  assert.equal(activation.status,200);
  assert.equal((await env.DB.prepare('SELECT status FROM membership_applications WHERE id=?').bind(id).first()).status,'active');
});
