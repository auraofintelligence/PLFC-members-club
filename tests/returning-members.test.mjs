import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const committee='/api/committee/returning-members',member='/api/member/returning-members',link='/api/returning-offer';
const host='https://club.example';
async function fixture(t){
  const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>/^\d{4}.*\.sql$/.test(f)&&f.slice(0,4)<='0030').sort();
  const db=database(t,files),env={DB:db,PRIVATE_AUTH_KEY:'returning-test-secret'},cookies={};
  for(const [login,role] of [['secretary','committee'],['assistantsecretary','committee'],['treasurer','treasurer'],['president','committee'],['owner','administrator'],['fisher','member'],['other','member']]){
    const token=randomBytes(32).toString('hex');cookies[login]='__Host-plfc_session='+token;
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,?)").bind(login,login,role,role==='member'?'2022-06-30':null),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),login)]);
  }
  const raw=(who,path,data)=>handleRequest(new Request(host+path,{method:data?'POST':'GET',headers:{Origin:host,'Content-Type':'application/json',Cookie:cookies[who]||''},body:data?JSON.stringify(data):undefined}),env);
  const call=async(who,path,data,status=200)=>{
    const response=await raw(who,path,data),v=await response.json();assert.equal(response.status,status,JSON.stringify(v));
    assert.match(response.headers.get('Cache-Control'),/no-store/);return v;
  };
  const proposal=(targetType,extra)=>({action:'propose',id:randomUUID(),targetType,registerChecked:true,registerRef:'File '+randomUUID(),...extra});
  return {db,raw,call,proposal};
}

test('Secretary and independent Treasurer approve a single member waiver, preserving intervening paid time and a fee snapshot',async t=>{
  const {db,call,proposal}=await fixture(t),request=proposal('account',{targetId:'fisher',registerRef:'Book A-077'});
  const summary=committee+'?summary=1';
  await call('guest',committee,null,401);await call('president',committee,null,403);await call('owner',committee,null,403);
  await call('guest',summary,null,401);await call('president',summary,null,403);await call('fisher',summary,null,403);
  await call('fisher',committee,null,403);await call('treasurer',committee,request,403);
  await call('secretary',committee,{...request,registerChecked:false},400);
  assert.equal((await call('secretary',committee+'?q=fish')).matches[0].targetId,'fisher');
  const first=(await call('assistantsecretary',committee,request,201)).offer;
  assert.deepEqual(await call('treasurer',summary),{count:1});assert.deepEqual(await call('assistantsecretary',summary),{count:0});
  await call('assistantsecretary',committee,request);await call('secretary',committee,{...request,id:randomUUID(),registerRef:'booka077',targetId:'other'},409);
  await call('secretary',committee,{...request,id:randomUUID(),registerRef:'Other record'},409);
  await call('secretary',committee,{action:'approve',id:first.id,version:1},403);
  assert.deepEqual((await call('fisher',member)).offers,[]);
  const approve={action:'approve',id:first.id,version:1},approved=(await call('treasurer',committee,approve)).offer;
  assert.deepEqual(await call('treasurer',summary),{count:0});assert.deepEqual(await call('secretary',summary),{count:1});
  await call('treasurer',committee,approve,409);
  const token=(await call('secretary',committee,{action:'link',id:first.id,version:approved.version})).token;
  assert.deepEqual(await call('assistantsecretary',summary),{count:0});
  assert.equal((await call('guest',link,{action:'check',token})).signInRequired,true);
  assert.equal((await call('other',link,{action:'check',token})).wrongAccount,true);
  await call('other',link,{action:'accept',token,confirm:true},403);
  const accept={action:'accept',id:first.id,confirm:true,version:approved.version};
  await call('other',member,accept,404);await call('fisher',member,{...accept,confirm:false},400);
  await call('treasurer','/api/accounts/renew',{id:'fisher',verified:true,paidThrough:'2096-02-29'});
  await db.prepare("UPDATE member_profiles SET membership_type='adult' WHERE account_id='fisher'").run();
  const publish=(priceCents,version)=>call('treasurer','/api/treasurer/fees',{id:'membership-adult',kind:'membership',category:'adult',active:true,priceCents,version,mutation:randomUUID()});
  await publish(4800,0);
  const granted=(await call('fisher',member,accept)).offer;assert.equal(granted.paidThrough,'2097-02-28');
  assert.deepEqual(await call('secretary',summary),{count:0});
  await call('fisher',member,accept);await call('fisher',link,{action:'accept',token,confirm:true});
  await call('treasurer','/api/accounts/renew',{id:'fisher',verified:true,paidThrough:'2096-06-30'},409);
  await publish(5900,1);
  const row=await db.prepare('SELECT * FROM returning_member_waivers WHERE id=?').bind(first.id).first();
  assert.equal(row.previousThrough,'2096-02-29');assert.equal(row.waivedFeeCents,4800);assert.equal(row.approvedBy,'treasurer');
  assert.equal(row.proposedBy,'assistantsecretary');
  assert.equal((await db.prepare("SELECT count(*) n FROM member_notices WHERE account_id='fisher' AND kind='payment'").first()).n,1);
  assert.equal((await db.prepare("SELECT count(*) n FROM audit_log WHERE action='complimentary_year_granted'").first()).n,1);
  assert.equal((await db.prepare('SELECT count(*) n FROM returning_credit_write').first()).n,0);
  assert.equal((await call('fisher','/api/member/safeguards')).socialAccess,false);
});

test('formally reviewed paper-only returning junior joins once without a payment, guardian shortcut or lost password-setup link',async t=>{
  const {db,call,raw,proposal}=await fixture(t);
  const o=(await call('secretary',committee,proposal('paper',{label:'Former fisher'}),201)).offer;
  await call('treasurer',committee,{action:'approve',id:o.id,version:1});
  const token=(await call('assistantsecretary',committee,{action:'link',id:o.id,version:2})).token;
  const check=()=>call('guest',link,{action:'check',token});
  const initial=await check();assert.ok(initial.needsApplication);assert.ok(!JSON.stringify(initial).includes('Former fisher'));
  const accept={action:'accept',token,confirm:true,login:'returning.junior'};
  await call('guest',link,accept,409);
  assert.equal((await call('other',link,{action:'check',token})).signOutRequired,true);
  const application={requestId:randomUUID(),fullName:'Former Junior',category:'junior',mobile:'0400 000 999',packMethod:'collect',adultDeclaration:true,consent:true};
  await call('guest',link,{action:'apply',token,application},400);
  Object.assign(application,{guardianName:'Guardian Example',guardianAuthorised:true});
  const apply={action:'apply',token,application};
  assert.equal((await call('guest',link,apply,201)).applicationStatus,'pending');await call('guest',link,apply);
  await call('guest',link,accept,409);
  const {application_id:id}=await db.prepare('SELECT application_id FROM returning_member_offers WHERE id=?').bind(o.id).first();
  assert.equal((await call('secretary','/api/applications/'+id)).application.returningStatus,'approved');
  await call('secretary','/api/applications/'+id+'/review',{decision:'approved'},400);
  await call('secretary','/api/applications/'+id+'/review',{decision:'approved',guardianChecked:true});
  await call('treasurer','/api/accounts/invite',{role:'member',verified:true,applicationId:id,login:accept.login,paidThrough:'2099-12-31'},409);
  assert.equal((await check()).canAccept,true);
  const activation=(await call('guest',link,accept)).activation;
  assert.equal((await call('guest',link,accept)).activation.token,activation.token);
  assert.equal((await db.prepare('SELECT status FROM returning_member_waivers WHERE id=?').bind(o.id).first()).status,'activation');
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM club_accounts WHERE login=?').bind(accept.login).first()).n,0);
  await db.prepare("UPDATE club_invites SET expires=0 WHERE login=?").bind(accept.login).run();
  await db.prepare("UPDATE membership_applications SET invite_expires=0 WHERE id=?").bind(id).run();
  const replacement=(await call('guest',link,accept)).activation;assert.notEqual(replacement.token,activation.token);
  const open=(token)=>raw('guest','/api/auth/activate',{token,login:accept.login,password:'1234'});
  assert.equal((await open(activation.token)).status,400);const signed=await open(replacement.token);assert.equal(signed.status,200);
  assert.equal((await open(replacement.token)).status,400);
  const grant=await db.prepare('SELECT * FROM returning_member_waivers WHERE id=?').bind(o.id).first();
  const expected=await db.prepare("SELECT date('now','+10 hours','+1 year','-1 day') AS end").first();
  assert.equal(grant.status,'granted');assert.equal(grant.category,'junior');assert.equal(grant.paidThrough,expected.end);
  assert.equal(grant.waivedFeeCents,null);
  const ac=await db.prepare('SELECT id,paid_through FROM club_accounts WHERE login=?').bind(accept.login).first();
  assert.equal(ac.paid_through,expected.end);const app=await db.prepare('SELECT account_id,status FROM membership_applications WHERE id=?').bind(id).first();
  assert.equal(app.account_id,ac.id);assert.equal(app.status,'active');
  assert.equal((await db.prepare('SELECT socialAccess FROM member_safeguard_flags WHERE accountId=?').bind(ac.id).first()).socialAccess,0);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action LIKE '%payment%'").first()).n,0);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM member_notices WHERE kind='payment'").first()).n,0);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM member_delivery_queue').first()).n,0);
});

test('cancelled or suspended records and officer accounts cannot receive a complimentary year',async t=>{
  const {db,call,proposal}=await fixture(t);
  await call('secretary',committee,proposal('account',{targetId:'secretary'}),409);
  const a=(await call('secretary',committee,proposal('account',{targetId:'fisher'}),201)).offer;
  await call('treasurer',committee,{action:'approve',id:a.id,version:1});const token=(await call('secretary',committee,{action:'link',id:a.id,version:2})).token;
  await db.prepare("UPDATE club_accounts SET disabled=1 WHERE id='fisher'").run();await call('fisher',member,null,401);
  await call('fisher',link,{action:'accept',token,confirm:true},401);
  await call('secretary',committee,{action:'cancel',id:a.id,version:2});await call('guest',link,{action:'check',token},404);
  assert.equal((await db.prepare("SELECT paid_through FROM club_accounts WHERE id='fisher'").first()).paid_through,'2022-06-30');
  assert.equal((await db.prepare("SELECT date('2027-06-30','+1 day','+1 year','-1 day') AS end").first()).end,'2028-06-30');
  assert.equal((await db.prepare("SELECT date('2028-02-29','+1 year','-1 day') AS end").first()).end,'2029-02-28');
});

test('an expired account can sign in and accept; current membership, journal permission and unpaid ledger entries remain distinct',async t=>{
  const {db,call,proposal}=await fixture(t),id='fisher';
  const offered=(await call('secretary',committee,proposal('account',{targetId:id}),201)).offer;
  await call('treasurer',committee,{action:'approve',id:offered.id,version:1});
  const inbox=await call(id,member);assert.equal(inbox.offers[0].status,'approved');
  const payload={action:'accept',id:offered.id,version:2,confirm:true};
  const result=await Promise.all([call(id,member,payload),call(id,member,payload)]);
  assert.ok(result.every(r=>r.offer.status==='granted'));
  const single=await db.prepare("SELECT count(*) n FROM audit_log WHERE action='complimentary_year_granted'").first();
  assert.equal(single.n,1);assert.equal((await call(id,member)).offers[0].status,'granted');
  const expected=await db.prepare("SELECT date('now','+10 hours','+1 year','-1 day') AS end").first();
  assert.equal((await db.prepare('SELECT paid_through FROM club_accounts WHERE id=?').bind(id).first()).paid_through,expected.end);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM member_notices WHERE kind='payment'").first()).n,0);
  const safeguards=await call(id,'/api/member/safeguards');assert.equal(safeguards.ageBand,'unconfirmed');assert.equal(safeguards.canUseJournal,false);
});

test('an already approved online application attaches directly, and replacing an expired offer link does not issue another grant',async t=>{
  const {db,call,proposal}=await fixture(t),app={requestId:randomUUID(),fullName:'Former Angler',category:'social',
    email:'fixture@example.test',packMethod:'collect',adultDeclaration:true,consent:true};
  await call('guest','/api/applications/apply',app,202);
  const {id}=await db.prepare('SELECT id FROM membership_applications WHERE request_id=?').bind(app.requestId).first();
  await call('secretary','/api/applications/'+id+'/review',{decision:'approved'});
  assert.equal((await call('assistantsecretary',committee+'?q=Former')).matches[0].targetId,id);
  const o=(await call('assistantsecretary',committee,proposal('application',{targetId:id}),201)).offer;
  await call('treasurer',committee,{action:'approve',id:o.id,version:1});
  const getLink=async()=>(await call('secretary',committee,{action:'link',id:o.id,version:2})).token;
  const original=await getLink();assert.equal(await getLink(),original);
  await db.prepare('UPDATE returning_member_offers SET link_expires=0 WHERE id=?').bind(o.id).run();
  assert.deepEqual(await call('assistantsecretary',committee+'?summary=1'),{count:1});
  await call('guest',link,{action:'check',token:original},404);
  const token=await getLink();assert.notEqual(original,token);
  assert.deepEqual(await call('secretary',committee+'?summary=1'),{count:0});
  const opened=await call('guest',link,{action:'check',token});assert.equal(opened.needsApplication,false);assert.equal(opened.canAccept,true);
  assert.ok(!JSON.stringify(opened).includes('fixture@example.test'));assert.ok(!JSON.stringify(opened).includes(app.fullName));
  const setup=(await call('guest',link,{action:'accept',token,confirm:true,login:'returning.social'})).activation;
  await call('guest','/api/auth/activate',{...setup,password:'1234'});
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM membership_applications').first()).n,1);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM returning_member_waivers WHERE status='granted' AND category='social'").first()).n,1);
  await call('guest',link,{action:'accept',token:original,confirm:true,login:'new.second'},404);
});

test('all open and historic offers are reachable beyond two hundred, with name search applied before the page limit',async t=>{
  const {db,call}=await fixture(t);
  const insert=`INSERT INTO returning_member_offers(id,target_type,register_digest,paper_label,status,proposed_by,proposed_at)
    VALUES(?,'paper',?,?,'proposed','secretary','2026-11-21')`;
  const synthetic=Array.from({length:205},(_,i)=>[randomUUID(),'fixture-'+i,'Private return '+String(i).padStart(3,'0')]);
  // A single batch creates the size of a full handover queue without sending invitations.
  await db.batch(synthetic.map(args=>db.prepare(insert).bind(...args)));
  const first=await call('secretary',committee);assert.equal(first.offers.length,200);assert.ok(first.nextOffers);
  const remainder=await call('secretary',committee+'?before='+encodeURIComponent(first.nextOffers));
  assert.equal(remainder.offers.length,5);assert.equal(remainder.nextOffers,null);
  assert.equal(new Set([...first.offers,...remainder.offers].map(o=>o.id)).size,205);
  assert.equal((await call('treasurer',committee+'?q=return%20000')).offers[0].id,synthetic[0][0]);
});
