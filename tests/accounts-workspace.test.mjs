import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,webcrypto} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
globalThis.crypto??=webcrypto;
const origin='https://club.example';
const hash = value => createHash('sha256').update(value).digest('hex');
const pass='a long unique example for the club tests';
const future=()=>new Date(Date.now()+31*86400000).toISOString().slice(0,10);
const secret=()=>randomBytes(32).toString('hex');
function call(env,path,{method='GET',data,cookie}={}) {
  const headers={Origin:origin};if(cookie)headers.Cookie=cookie;
  if(data)headers['Content-Type']='application/json';
  return handleRequest(new Request(origin+path,{method,headers,body:data?JSON.stringify(data):undefined}),env);
}
function cookieOf(r) {return r.headers.get('set-cookie')?.split(';')[0];}
async function owner(env) {
  const token=secret();
  await env.DB.prepare("INSERT INTO club_invites(digest,role,created_by,expires) VALUES(?,'administrator','test',?)").bind(hash(token),Math.floor(Date.now()/1000)+600).run();
  const r=await call(env,'/api/auth/activate',{method:'POST',data:{login:'chair.test',password:pass,token}});
  assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=/);
  return cookieOf(r);
}
test('a token-only officer shortcut identifies its desk without consuming its invitation',async t=>{
  const env={DB:database(t),PRIVATE_AUTH_KEY:secret()};
  const token=secret(), now=Math.floor(Date.now()/1000), lookup=data=>call(env,'/api/auth/invitation',{method:'POST',data});
  const issue=()=>env.DB.prepare("INSERT INTO club_invites(digest,login,role,created_by,expires) VALUES(?,'treasurer','treasurer','test',?)").bind(hash(token),now+900).run();
  await issue();
  for(const payload of [{login:'Treasurer'},{token:secret()},{token:[]}]){
    const result=await lookup(payload);assert.equal(result.status,400);assert.ok(!(await result.text()).includes('treasurer'));
  }
  const valid=await lookup({token,login:'ignored'});
  assert.deepEqual(await valid.json(),{login:'treasurer',destination:'stock',resetting:false});
  assert.equal(valid.headers.get('set-cookie'),null);assert.match(valid.headers.get('cache-control'),/no-store/);
  assert.equal((await call(env,'/api/stock')).status,401);
  await env.DB.prepare('UPDATE club_invites SET expires=? WHERE digest=?').bind(now-1,hash(token)).run();
  assert.equal((await lookup({token})).status,400);
  await env.DB.prepare('UPDATE club_invites SET expires=? WHERE digest=?').bind(now+900,hash(token)).run();
  const chosen='1234';
  const empty=await call(env,'/api/auth/activate',{method:'POST',data:{token,login:'Treasurer',password:''}});
  assert.equal(empty.status,400);
  const activated=await call(env,'/api/auth/activate',{method:'POST',data:{token,login:'Treasurer',password:chosen}});
  assert.equal(activated.status,200);assert.equal((await lookup({token})).status,400);
  const session=await (await call(env,'/api/session',{cookie:cookieOf(activated)})).json();
  assert.equal(session.canManageStock,true);
  const returning=await call(env,'/api/auth/login',{method:'POST',data:{login:'Treasurer',password:chosen}});
  assert.equal(returning.status,200);
  const reset=secret(), replacement='x';
  await env.DB.prepare("INSERT INTO club_invites(digest,login,role,created_by,expires,reset_id) VALUES(?,'treasurer','treasurer','test',?,?)").bind(hash(reset),now+900,session.identity.id).run();
  assert.equal((await (await lookup({token:reset})).json()).resetting,true);
  assert.equal((await call(env,'/api/auth/activate',{method:'POST',data:{token:reset,login:'treasurer',password:replacement}})).status,200);
  assert.equal((await call(env,'/api/auth/login',{method:'POST',data:{login:'treasurer',password:replacement}})).status,200);
});
test('owner setup leaves reserved officer usernames and both invitations intact',async t=>{
  const env={DB:database(t),PRIVATE_AUTH_KEY:secret()}, ownerToken=secret(), secretaryToken=secret();
  const expires=Math.floor(Date.now()/1000)+900;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO club_invites(digest,role,created_by,expires) VALUES(?,'administrator','test',?)").bind(hash(ownerToken),expires),
    env.DB.prepare("INSERT INTO club_invites(digest,login,role,created_by,expires) VALUES(?,'secretary','committee','test',?)").bind(hash(secretaryToken),expires)
  ]);
  const activate=(token,login)=>call(env,'/api/auth/activate',{method:'POST',data:{token,login,password:pass}});
  const ownerInfo=await (await call(env,'/api/auth/invitation',{method:'POST',data:{token:ownerToken}})).json();
  assert.equal(ownerInfo.suggestedLogin,'webmaster');
  const rejected=await activate(ownerToken,'Secretary');
  assert.equal(rejected.status,409);assert.equal(rejected.headers.get('set-cookie'),null);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM club_invites WHERE used_by IS NULL').first()).n,2);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM club_accounts').first()).n,0);
  assert.equal((await activate(ownerToken,'webmaster')).status,200);
  const officer=await activate(secretaryToken,'Secretary');assert.equal(officer.status,200);
  const session=await (await call(env,'/api/session',{cookie:cookieOf(officer)})).json();
  assert.equal(session.accountRole,'committee');assert.equal(session.canManageStock,false);
});
test('club-issued invitations check payment, expire, and keep committee data private',async t=>{
  const env={DB:database(t),PRIVATE_AUTH_KEY:secret()}, staff=await owner(env);
  const invite=(data)=>call(env,'/api/accounts/invite',{cookie:staff,method:'POST',data});
  assert.equal((await invite({role:'member',login:'member.test'})).status,400);
  const issued=await invite({role:'member',login:'member.test',verified:true,paidThrough:future()});
  assert.equal(issued.status,201);const {token}=await issued.json();
  const activate=()=>call(env,'/api/auth/activate',{method:'POST',data:{login:'member.test',password:pass,token}});
  const opened=await activate();assert.equal(opened.status,200);const member=cookieOf(opened);
  assert.equal((await activate()).status,400);
  const session=await (await call(env,'/api/session',{cookie:member})).json();
  assert.equal(session.role,'member');assert.equal(session.canManageStock,false);
  assert.equal((await call(env,'/api/meeting',{cookie:member})).status,403);
  assert.equal((await call(env,'/api/stock',{cookie:member})).status,403);
  await env.DB.prepare("UPDATE club_accounts SET paid_through='2000-01-01' WHERE login='member.test'").run();
  assert.equal((await call(env,'/api/member/minutes',{cookie:member})).status,403);
  assert.equal((await call(env,'/api/auth/logout',{cookie:member,method:'POST',data:{}})).status,200);
  assert.equal((await (await call(env,'/api/session',{cookie:member})).json()).authenticated,false);
  const login=await call(env,'/api/auth/login',{method:'POST',data:{login:'chair.test',password:pass}});
  assert.equal(login.status,200);
  const stored=await env.DB.prepare("SELECT verifier FROM club_accounts WHERE login='chair.test'").first();
  assert.notEqual(stored.verifier,pass);
});
test('scheduled committee meeting can be approved and released separately with a private calendar entry',async t=>{
  const env={DB:database(t),PRIVATE_AUTH_KEY:secret()}, staff=await owner(env);
  const data={id:crypto.randomUUID(),title:'Monthly planning',date:'2027-02-01',time:'17:30',location:'Club room'};
  const schedule=()=>call(env,'/api/meetings',{cookie:staff,method:'POST',data});
  assert.equal((await schedule()).status,201);assert.equal((await schedule()).status,200);
  const path='/api/meeting?id='+data.id;
  const agendaPath='/api/meetings/'+data.id+'/agenda';
  const agenda=(await (await call(env,agendaPath,{cookie:staff})).json()).agenda;
  agenda.quorumStatus='present';
  assert.equal((await call(env,agendaPath,{cookie:staff,method:'PUT',data:{agenda,version:0}})).status,200);
  const draft={notes:'These are the original discussion notes.',decisions:['Run a local meet.'],actions:[],version:0,status:'approved',agendaVersion:1};
  assert.equal((await call(env,path,{cookie:staff,method:'PUT',data:draft})).status,200);
  assert.deepEqual((await (await call(env,'/api/member/minutes',{cookie:staff})).json()).minutes,[]);
  const share=()=>call(env,'/api/meetings/'+data.id+'/release',{cookie:staff,method:'POST',data:{text:'The club agreed to run a local meet.',version:1}});
  assert.equal((await share()).status,200);assert.equal((await share()).status,200);
  const content=await (await call(env,'/api/member/minutes',{cookie:staff})).text();
  assert.ok(content.includes('agreed to run'));assert.ok(!content.includes('original discussion'));
  assert.equal((await call(env,path,{cookie:staff,method:'PUT',data:{...draft,version:1,notes:'altered'}})).status,409);
  const calendar=await (await call(env,'/api/meetings/calendar.ics',{cookie:staff})).text();
  assert.match(calendar,/DTSTART:20270201T073000Z/);
  assert.equal((await call(env,'/api/meetings/calendar.ics')).status,401);
});
test('a separately invited Assistant Secretary can run meetings and receive price alerts with normal committee access',async t=>{
  const migrations=['0000_clubhouse.sql','0001_access_and_meetings.sql','0002_stock.sql','0003_stock_history.sql',
    '0005_meeting_register.sql','0007_members_and_conversation.sql','0011_meeting_reminders.sql','0014_merch_orders.sql','0015_fees_and_alerts.sql','0018_formal_meeting_agendas.sql'];
  const env={DB:database(t,migrations),PRIVATE_AUTH_KEY:secret()},admin=await owner(env);
  const invite=await call(env,'/api/accounts/invite',{method:'POST',cookie:admin,data:{login:'assistantsecretary',role:'committee'}});
  assert.equal(invite.status,201);
  const {token}=await invite.json();
  const activated=await call(env,'/api/auth/activate',{method:'POST',data:{login:'assistantsecretary',password:pass,token}});
  assert.equal(activated.status,200);
  const cookie=cookieOf(activated),session=await(await call(env,'/api/session',{cookie})).json();
  assert.equal(session.identity.name,'assistantsecretary');
  assert.equal(session.role,'committee');
  assert.equal(session.canManageStock,false);
  assert.equal(session.administrator,false);
  assert.equal((await call(env,'/api/member/minutes',{cookie})).status,200);
  assert.equal((await call(env,'/api/meetings',{method:'POST',cookie,data:{
    id:crypto.randomUUID(),title:'Committee catch-up',date:'2027-03-07',time:'10:00',location:'Club room'
  }})).status,201);
  const fee={id:'membership-adult',kind:'membership',category:'adult',title:'Adult membership',priceCents:1234,active:true,version:0,mutation:crypto.randomUUID()};
  assert.equal((await call(env,'/api/treasurer/fees',{method:'POST',cookie:admin,data:fee})).status,200);
  const inbox=await(await call(env,'/api/committee/price-alerts',{cookie})).json();
  assert.equal(inbox.unread,1);
  assert.equal(inbox.alerts[0].newCents,1234);
  for(const path of ['/api/stock','/api/stock/shop','/api/treasurer/fees','/api/accounts']){
    assert.equal((await call(env,path,{cookie})).status,403,path);
  }
});
test('the member room stores private messages and replies and removes their contents on request',async t=>{
  const env={DB:database(t),PRIVATE_AUTH_KEY:secret()},staff=await owner(env);
  const send=data=>call(env,'/api/community',{method:'POST',cookie:staff,data});
  const post={id:crypto.randomUUID(),author:'Island angler',message:'Conditions were calm at the jetty.'};
  assert.equal((await send(post)).status,201);
  assert.equal((await send(post)).status,200);
  assert.equal((await send({...post,id:crypto.randomUUID(),message:'Thanks for sharing!',parentId:post.id})).status,201);
  assert.equal((await call(env,'/api/community')).status,401);
  const feed=await (await call(env,'/api/community',{cookie:staff})).json();
  assert.equal(feed.posts.length,2);assert.equal(feed.posts[0].parentId,post.id);
  assert.equal((await call(env,'/api/community',{cookie:staff,method:'DELETE',data:{id:post.id}})).status,200);
  const after=await (await call(env,'/api/community',{cookie:staff})).text();
  assert.ok(!after.includes(post.message));
});
