import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {returningActivationToken} from '../worker/returning-members.mjs';

const pending='/api/accounts/invitations',issue='/api/accounts/invite',inspect='/api/auth/invitation',activate='/api/auth/activate';
const hex=()=>randomBytes(32).toString('hex'),hash=s=>createHash('sha256').update(s).digest('hex');

test('authorised invitation list, recovery, explicit replacement and activation preserve role, expiry and application records',async t=>{
  const db=database(t,readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort());
  const env={DB:db,PRIVATE_AUTH_KEY:hex()},clock=Math.floor(Date.now()/1000),until=clock+3600,cookies={};
  for(const [id,role] of [['web','administrator'],['finance','treasurer'],['secretary','committee'],['public-member','member']]){
    const value=hex();cookies[id]='__Host-plfc_session='+value;
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',1,'2099-12-31')").bind(id,id,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,?)').bind(hash(value),id,until)]);
  }
  async function api(who,path,body,expected=200){
    const origin='https://club.test';
    const res=await handleRequest(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookies[who]||'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),env);
    assert.equal(res.status,expected,path);assert.match(res.headers.get('cache-control'),/no-store/);
    return res.json();
  }
  const add=async(login,role,made='old',exp=until,reset=null)=>{
    const token=hex();
    await db.prepare('INSERT INTO club_invites(digest,login,role,created_by,expires,reset_id) VALUES(?,?,?,?,?,?)').bind(hash(token),login,role,made,exp,reset).run();
    return token;
  };
  const list=async(actor='web')=>(await api(actor,pending)).invitations;
  const find=async login=>(await list()).find(i=>i.login===login);
  await api(null,pending,null,401);await api('secretary',pending,null,403);await api('public-member',pending,null,403);
  const club=await api('web',issue,{role:'committee',login:'new-officer'},201);
  const paid=await api('finance',issue,{role:'member',login:'paid-member',verified:true,paidThrough:'2099-12-31'},201);
  const bootstrap=await add(null,'administrator'),expired=await add('expired','member','old',clock-30);
  const reset=await add('secretary','committee','old',until,'secretary');
  const entries=await list();assert.equal(entries.length,2);assert.equal((await list('finance')).length,1);
  for(const e of entries)assert.deepEqual(Object.keys(e).sort(),['id','login','role','expires','paidThrough','source','canCopy'].sort());
  const officer=await find('new-officer');assert.equal(officer.canCopy,true);assert.equal(officer.id.length,32);
  const dto={action:'copy',id:officer.id};
  await api('finance',pending,dto,404);await api('secretary',pending,dto,403);
  assert.ok((await api('web',pending,dto)).token===club.token);
  assert.ok((await api('finance',pending,{action:'copy',id:(await find('paid-member')).id})).token===paid.token);
  const atRest=await db.prepare("SELECT invite_copy FROM club_invites WHERE login='new-officer'").first();
  assert.ok(atRest.invite_copy&&!atRest.invite_copy.includes(club.token));
  for(const token of [bootstrap,reset,club.token])assert.equal((await api(null,inspect,{token,keepForWebmaster:true})).savedForWebmaster,undefined);
  await api(null,inspect,{token:expired,keepForWebmaster:true},400);
  await api('web',pending,{action:'replace',id:officer.id},409);
  await api(null,activate,{token:club.token,login:club.login,password:'x'});
  assert.equal((await find(club.login)),undefined);await api('web',pending,dto,404);
  assert.equal((await db.prepare('SELECT invite_copy FROM club_invites WHERE digest=?').bind(hash(club.token)).first()).invite_copy,null);

  const handoff=await add('treasurer','treasurer','plfc-officer-invitation-handoff');
  assert.equal((await find('treasurer')).canCopy,false);
  for(const token of [await add('officer.fake','committee','plfc-officer-invitation-handoff'),await add('president','committee','other')])
    assert.equal((await api(null,inspect,{token,keepForWebmaster:true})).savedForWebmaster,undefined);
  assert.equal((await api(null,inspect,{token:handoff})).savedForWebmaster,undefined);assert.equal((await find('treasurer')).canCopy,false);
  assert.equal((await api(null,inspect,{token:handoff,keepForWebmaster:true})).savedForWebmaster,true);
  assert.equal((await api(null,inspect,{token:handoff,keepForWebmaster:true})).savedForWebmaster,true);
  const backfilled=await find('treasurer');assert.equal(backfilled.expires,until);assert.equal(backfilled.canCopy,true);
  assert.ok((await api('web',pending,{action:'copy',id:backfilled.id})).token===handoff);
  await api('finance',pending,{action:'copy',id:backfilled.id},404);

  const memberToken=await add('legacy-member','member');
  const app=randomUUID();
  await db.prepare(`INSERT INTO membership_applications(id,request_id,full_name,membership_type,pack_method,status,invite_login,invite_digest,invite_expires)
    VALUES(?,?,'Fixture','adult','collect','invited','legacy-member',?,?)`).bind(app,randomUUID(),hash(memberToken),until).run();
  const legacy=await find('legacy-member');assert.equal(legacy.source,'application');assert.equal(legacy.canCopy,false);
  await api('finance',pending,{action:'copy',id:legacy.id},409);
  const migrated=await api('finance',pending,{action:'replace',id:legacy.id});assert.equal(migrated.expires,until);assert.ok(migrated.token!==memberToken);
  await api('finance',pending,{action:'replace',id:legacy.id},409);await api(null,inspect,{token:memberToken},400);
  assert.equal((await find('legacy-member')).id,legacy.id);
  await api(null,activate,{login:migrated.login,token:migrated.token,password:'x'});
  assert.equal((await db.prepare('SELECT status FROM membership_applications WHERE id=?').bind(app).first()).status,'active');
  const newApp=randomUUID();await db.prepare("INSERT INTO membership_applications(id,request_id,full_name,membership_type,pack_method,status) VALUES(?,?,'New applicant','adult','collect','approved')").bind(newApp,randomUUID()).run();
  const approved=await api('finance',issue,{role:'member',login:'new-applicant',verified:true,applicationId:newApp,paidThrough:'2099-12-31'},201);
  const approvedCard=await find(approved.login);assert.equal(approvedCard.source,'application');assert.equal(approvedCard.canCopy,true);
  assert.ok((await api('finance',pending,{action:'copy',id:approvedCard.id})).token===approved.token);

  const returnId=randomUUID(),returnApp=randomUUID();
  const returnToken=await returningActivationToken(env.PRIVATE_AUTH_KEY,returnId,2),returnKey=hash(returnToken);
  await db.batch([
    db.prepare("INSERT INTO membership_applications(id,request_id,full_name,membership_type,pack_method,status,invite_login,invite_digest,invite_expires) VALUES(?,?,'Return','adult','collect','invited','returnee',?,?)").bind(returnApp,randomUUID(),returnKey,until),
    db.prepare("INSERT INTO returning_member_offers(id,target_type,register_digest,application_id,status,proposed_by,proposed_at,approved_by,activation_digest,activation_generation) VALUES(?,'application',?,?,'activation','secretary','today','finance',?,2)").bind(returnId,hex(),returnApp,returnKey),
    db.prepare("INSERT INTO club_invites(digest,login,role,created_by,expires) VALUES(?,'returnee','member','finance',?)").bind(returnKey,until)]);
  const returning=await find('returnee');assert.equal(returning.source,'returning');assert.equal(returning.canCopy,true);
  await api('finance',pending,{action:'replace',id:returning.id},409);
  assert.ok((await api('finance',pending,{action:'copy',id:returning.id})).token===returnToken);
  await api(null,activate,{login:'returnee',token:returnToken,password:'x'});
  assert.equal((await db.prepare('SELECT status FROM returning_member_offers WHERE id=?').bind(returnId).first()).status,'granted');
  await api('finance',pending,{action:'copy',id:returning.id},404);

  const old=await add('concurrent','committee');const race=await find('concurrent');
  await db.prepare("INSERT INTO officer_price_changes(kind,item_id,title,old_cents,new_cents,actor_id,actor_login,changed_at) VALUES('merchandise','test','Test',100,200,'finance','finance','today')").run();
  const challenge=()=>handleRequest(new Request('https://club.test'+pending,{method:'POST',headers:{Origin:'https://club.test',Cookie:cookies.web,'Content-Type':'application/json'},body:JSON.stringify({action:'replace',id:race.id})}),env);
  const both=await Promise.all([challenge(),challenge()]);assert.deepEqual(both.map(r=>r.status).sort(),[200,409]);
  const winner=await both.find(r=>r.status===200).json();
  assert.equal((await db.prepare('SELECT count(*) AS n FROM officer_price_recipients WHERE recipient=?').bind('invite:'+hash(old)).first()).n,0);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM officer_price_recipients WHERE recipient=?').bind('invite:'+hash(winner.token)).first()).n,1);
  await api(null,inspect,{token:old},400);
  await db.prepare("UPDATE club_invites SET expires=0 WHERE login='concurrent'").run();await api('web',pending,{action:'copy',id:race.id},404);
});
