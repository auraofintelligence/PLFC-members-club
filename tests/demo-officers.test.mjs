import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {handleRequest,OfficerDemoRoom} from '../worker/index.mjs';
import {database} from './d1-fixture.mjs';

const origin='https://club.example', legacy='__Host-plfc_demo=previous-room', previous='__Host-plfc_session='+('b'.repeat(64));
const both=legacy+'; '+previous;
const hash=value=>createHash('sha256').update(value).digest('hex');
function call(env,path,cookie,data) {
  const headers={Origin:origin};
  if(cookie)headers.Cookie=cookie;
  if(data)headers['Content-Type']='application/json';
  return handleRequest(new Request(origin+path,{headers,method:data?'POST':'GET',body:data?JSON.stringify(data):undefined}),env);
}
const neverUseBindings=new Proxy({}, {get(){throw Error('A retired officer room tried to use a live binding.');}});
const cookieLines=response=>response.headers.getSetCookie();
const removed=(r,name)=>cookieLines(r).some(x=>x.startsWith(name+'=;')&&x.includes('Max-Age=0'));

test('retired sign-in returns 410 for every former role without accessing any binding',async()=>{
  for(const login of ['secretary','president','vicepresident','treasurer']) {
    const result=await call(neverUseBindings,'/api/demo/login',null,{login,password:'password'});
    assert.equal(result.status,410);
    assert.equal(cookieLines(result).length,0);
  }
  const active=await call(neverUseBindings,'/api/demo/login',both,{login:'secretary',password:'password'});
  assert.equal(active.status,410);assert.ok(removed(active,'__Host-plfc_session'));assert.ok(removed(active,'__Host-plfc_demo'));
  const oldLogout=await call(neverUseBindings,'/api/demo/logout',previous,{});
  assert.equal(oldLogout.status,200);assert.equal(cookieLines(oldLogout).length,0);
});

test('old officer cookies can neither open a practice room nor reveal a previous club account',async()=>{
  const session=await call(neverUseBindings,'/api/session',both);
  assert.equal(session.status,200);
  const info=await session.json();assert.equal(info.authenticated,false);assert.equal(info.identity,null);assert.equal(info.role,'anonymous');
  assert.ok(removed(session,'__Host-plfc_session'));assert.ok(removed(session,'__Host-plfc_demo'));
  for(const path of ['/api/stock','/api/committee/lifecycle','/api/meeting/assist','/api/library','/api/accounts/invite']) {
    const result=await call(neverUseBindings,path,both);
    assert.equal(result.status,401);assert.ok(removed(result,'__Host-plfc_session'));assert.ok(removed(result,'__Host-plfc_demo'));
  }
  const onlyOld=await call(neverUseBindings,'/api/session',legacy);
  assert.ok(!removed(onlyOld,'__Host-plfc_session'));assert.ok(removed(onlyOld,'__Host-plfc_demo'));
});

test('real officer activation and login work immediately in a former rehearsal browser',async t=>{
  const env={DB:database(t),PRIVATE_AUTH_KEY:randomBytes(32).toString('hex')};
  const token=randomBytes(32).toString('hex'),login='secretary',password='example private test passphrase';
  await env.DB.prepare("INSERT INTO club_invites(digest,login,role,created_by,expires) VALUES(?,?,'committee','test',?)")
    .bind(hash(token),login,Math.floor(Date.now()/1000)+120).run();
  const activated=await call(env,'/api/auth/activate',both,{login,password,token});
  assert.equal(activated.status,200);assert.ok(removed(activated,'__Host-plfc_demo'));assert.ok(!removed(activated,'__Host-plfc_session'));
  const first=cookieLines(activated).find(x=>x.startsWith('__Host-plfc_session=')).split(';')[0];
  const realSession=await (await call(env,'/api/session',first)).json();
  assert.equal(realSession.identity.name,login);assert.equal(realSession.accountRole,'committee');
  const hidden=await (await call(env,'/api/session',first+'; '+legacy)).json();assert.equal(hidden.authenticated,false);
  const wrong=await call(env,'/api/auth/login',both,{login,password:'password'});
  assert.equal(wrong.status,401);assert.ok(removed(wrong,'__Host-plfc_session'));assert.ok(removed(wrong,'__Host-plfc_demo'));
  const loginAgain=await call(env,'/api/auth/login',both,{login,password});
  assert.equal(loginAgain.status,200);assert.ok(removed(loginAgain,'__Host-plfc_demo'));assert.ok(!removed(loginAgain,'__Host-plfc_session'));
});

test('existing Durable Object rooms only support expiry and can never restart',async()=>{
  let deleted=0;
  const room=new OfficerDemoRoom({storage:{deleteAll:async()=>{deleted++;}}});
  assert.equal((await room.fetch(new Request('https://officer-room.internal/open',{method:'POST'}))).status,410);
  assert.equal((await room.fetch(new Request(origin+'/api/session'))).status,410);
  assert.equal(deleted,0);await room.alarm();assert.equal(deleted,1);
});
