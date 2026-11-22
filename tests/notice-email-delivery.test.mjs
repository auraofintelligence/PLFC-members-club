import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {noticeEmailReady,runNoticeEmail,sendNoticeEmail} from '../worker/notice-email.mjs';

const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>/^\d+.*\.sql$/.test(n)).sort();
// Monday morning in Brisbane falls on Sunday evening UTC.
const monday=new Date('2030-04-07T22:00:00.000Z');
const before='2030-04-01T01:00:00.000Z', joined='2030-04-02T01:00:00.000Z', posted='2030-04-05T01:00:00.000Z';
const later=(date,minutes)=>new Date(+date+minutes*60000);
const gmail={NOTICE_GMAIL_CLIENT_ID:'test',NOTICE_GMAIL_CLIENT_SECRET:'fixture',NOTICE_GMAIL_REFRESH_TOKEN:'test-refresh'};
async function setup(t,accounts) {
  const db=database(t,files);
  const statements=[];
  for(const [id,role,important,weekly] of accounts) {
    statements.push(db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'x','x',0,'2099-01-01')").bind(id,id,role),
      db.prepare('INSERT INTO notice_email_choices(account_id,email,important,weekly,enabled_at) VALUES(?,?,?,?,?)').bind(id,id+'@example.test',important,weekly,joined));
  }
  await db.batch(statements);
  return {DB:db,RESEND_API_KEY:'fixture',NOTICE_EMAIL_FROM:'plfc@example.test'};
}
function post(db,id,important,author,at=posted){
  return db.prepare(`INSERT INTO committee_notices(id,kind,title,details,created_at,author_id,author_label,updated_by,review_date,important)
    VALUES(?,'info',?,'Private detail',?,?,'Office',?,'2030-05-01',?)`).bind(id,id,at,author,author,important);
}
const accepted=()=>Response.json({id:crypto.randomUUID()});

test('weekly help alerts distinguish both offices and send one case per verified mailbox',async t=>{
  const env=await setup(t,[['webmaster','administrator',1,1],['secretary','committee',1,1],['assistantsecretary','committee',1,1],['angler','member',1,1]]);
  const db=env.DB, id='ac'.repeat(32);
  await db.prepare(`INSERT INTO webmaster_help_requests(id,topic,source,contact_type,contact_box,submitted_hash,created_at,state,updated_at)
    VALUES(?,'password','signin','email','sensitive contact','private hash',?,'new',?)`).bind(id,posted,posted).run();
  const cases=()=>db.prepare("SELECT account_id,section,important FROM notice_email_delivery_items WHERE item_key=? ORDER BY account_id").bind('help:'+id).all();
  assert.deepEqual((await cases()).results.map(r=>[r.account_id,r.section,r.important]),[
    ['secretary','Secretary copies of Webmaster requests',0],['webmaster','Webmaster help requests',0]
  ]);
  await db.prepare("UPDATE notice_email_choices SET email='secretary@example.test' WHERE account_id='webmaster'").run();
  assert.deepEqual((await cases()).results.map(r=>r.account_id),['secretary']);
  const mail=[],fetcher=async(_url,init)=>{mail.push(JSON.parse(init.body));return accepted();};
  assert.equal((await runNoticeEmail(env,later(monday,-1),{fetcher})).sent,0);
  assert.equal((await runNoticeEmail(env,monday,{fetcher})).sent,1);
  assert.match(mail[0].text,/Secretary copies of Webmaster requests/);
  assert.match(mail[0].text,/PLFC-ACACACACACAC/);
  assert.match(mail[0].text,/\?inbox=webmaster-help#committee\/notices/);
  assert.doesNotMatch(mail[0].text,/sensitive contact|private hash|password/);
});

test('email recipients, priority, weekly cutoff, distinct scopes and guardian consent',async t=>{
  const env=await setup(t,[['officer','committee',1,1],['member','member',1,1],['junior','member',1,1],['lapsed','member',1,1]]);
  const db=env.DB;
  await db.batch([
    post(db,'Committee update',1,'writer'),post(db,'Ordinary officer news',0,'writer'),post(db,'Written by me',1,'officer'),
    post(db,'Predates consent',1,'writer',before),
    ...Array.from({length:11},(_,i)=>post(db,'Agenda item '+(i+1),0,'writer')),
    db.prepare("UPDATE member_profiles SET membership_type='junior',contact_email='different@example.test' WHERE account_id='junior'"),
    db.prepare("INSERT INTO member_bulletins(id,kind,audience,title,body,issue_day,created_by,important) VALUES('b','competition','all','Member update','Private body','2030-04-05','writer',1)"),
    db.prepare("INSERT INTO member_notices(id,account_id,kind,title,body,issue_day) VALUES('old','member','welcome','Predates consent','Private','2030-04-04')"),
    db.prepare("UPDATE member_notice_posted SET posted_at=? WHERE notice_id LIKE 'bulletin:%'").bind(posted),
    db.prepare("UPDATE member_notice_posted SET posted_at=? WHERE notice_id='old'").bind(before),
    db.prepare("INSERT INTO club_events(id,type,title,notes,created_at,created_by,creator_name) VALUES('lunch','bbq','Private planning','Sensitive notes',?,'writer','Secretary'),('meet','local','Private meet name','Private detail',?,'writer','Secretary')").bind(posted,posted),
    db.prepare("INSERT INTO member_event_notices VALUES('lunch','Island BBQ','2030-04-10','','Private place','Sensitive details',1,1,?),('meet','Withdrawn title','2030-04-11','','Private place','Private notes',1,1,?)").bind(posted,posted),
    db.prepare("UPDATE member_event_notices SET published=0 WHERE event_id='meet'"),
    db.prepare("UPDATE member_notice_posted SET posted_at=? WHERE notice_id LIKE 'calendar:%'").bind(posted),
    db.prepare("UPDATE club_accounts SET paid_through='2030-03-01' WHERE id='lapsed'"),
    db.prepare(`INSERT INTO officer_price_changes(kind,item_id,title,actor_id,actor_login,changed_at)
      VALUES('merchandise','cooler','Stubby cooler','writer','Treasurer',?)`).bind(posted)
  ]);
  const mail=[], fetcher=async (url,init)=>{assert.equal(url,'https://api.resend.com/emails');mail.push(JSON.parse(init.body));return accepted();};
  assert.equal((await runNoticeEmail(env,later(monday,-1),{fetcher})).sent,2);
  assert.equal(mail.filter(m=>m.subject.includes('Important')).length,2);
  assert.equal((await runNoticeEmail(env,monday,{fetcher})).sent,2);
  assert.equal((await runNoticeEmail(env,later(monday,5),{fetcher})).sent,0);
  for(const m of mail) {
    assert.equal(m.to.length,1);
    assert.ok(['officer@example.test','member@example.test'].includes(m.to[0]));
    assert.doesNotMatch(m.text,/Predates consent|Private body|Private detail|Written by me|Withdrawn title|Private place|Sensitive details/);
    if(m.to[0]==='member@example.test') {assert.match(m.text,/Member update/);assert.doesNotMatch(m.text,/Committee update|Stubby cooler|#committee/);}
    if(m.to[0]==='officer@example.test' && m.subject.includes('weekly')) {
      assert.match(m.text,/Ordinary officer news/);assert.match(m.text,/Stubby cooler/);
      assert.equal((m.text.match(/Agenda item \d+/g) || []).length,11);
    }
    if(m.to[0]==='member@example.test' && m.subject.includes('weekly')) {assert.match(m.text,/Island BBQ/);assert.match(m.text,/removed from the calendar/);}
  }
});

test('provider retries reuse the same key, and a revoked choice cancels a waiting email',async t=>{
  const env=await setup(t,[['officer','committee',1,0]]);
  await env.DB.batch([post(env.DB,'Important',1,'writer')]);
  const keys=[];
  const fetcher=async(_url,init)=>{keys.push(init.headers['Idempotency-Key']);return keys.length===1 ? new Response('',{status:503}):accepted();};
  assert.equal((await runNoticeEmail(env,monday,{fetcher})).retry,1);
  assert.equal((await runNoticeEmail(env,later(monday,5),{fetcher})).sent,1);
  assert.equal(keys[0],keys[1]);
  await env.DB.batch([post(env.DB,'Another update',1,'writer')]);
  assert.equal((await runNoticeEmail(env,monday,{fetcher:async()=>new Response('',{status:429})})).throttled,1);
  await env.DB.prepare('UPDATE notice_email_choices SET important=0').run();
  assert.equal((await runNoticeEmail(env,later(monday,5),{fetcher})).cancelled,1);
  assert.equal(keys.length,2);
});

function gmailMock(email, outcome, calls, verified=true) {
  return async (url,init)=>{
    calls.push({url,init});
    if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture-token'});
    if(url.endsWith('/userinfo'))return Response.json({email,email_verified:verified});
    assert.equal(url,'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    return outcome();
  };
}
test('Gmail verifies the specific club mailbox and does not repeat an uncertain handoff',async t=>{
  const env={...await setup(t,[['officer','committee',1,0]]),...gmail};
  const disabled={...env,NOTICE_EMAIL_PROVIDER:'unknown'};
  assert.equal(noticeEmailReady(disabled),false);
  assert.deepEqual(await runNoticeEmail(disabled),{configured:false,sent:0});
  const body={to:'recipient@example.test',key:'fixture',subject:'Club email',text:'Hello from PLFC.'}, checks=[];
  await assert.rejects(sendNoticeEmail(env,body,gmailMock('different@example.test',accepted,checks)));
  await assert.rejects(sendNoticeEmail(env,body,gmailMock('pointlookoutfc@gmail.com',accepted,checks,false)));
  assert.equal(checks.filter(c=>c.url.endsWith('/messages/send')).length,0);
  await sendNoticeEmail(env,body,gmailMock('pointlookoutfc@gmail.com',accepted,checks));
  const envelope=JSON.parse(checks.at(-1).init.body);
  const mime=Buffer.from(envelope.raw,'base64url').toString('utf8');
  assert.match(mime,/From: Point Lookout Fishing Club <pointlookoutfc@gmail\.com>/);
  assert.match(mime,/To: recipient@example\.test/);
  const calls=[], fetcher=gmailMock('pointlookoutfc@gmail.com',async()=>{throw new TypeError('Disconnected');},calls);
  await env.DB.batch([post(env.DB,'Gmail update',1,'writer')]);
  assert.equal((await runNoticeEmail(env,monday,{fetcher})).check,1);
  assert.equal((await runNoticeEmail(env,later(monday,10),{fetcher})).sent,0);
  assert.equal(calls.filter(c=>c.url.endsWith('/messages/send')).length,1);
  const stored=await env.DB.prepare("SELECT state,items_json FROM notice_email_outbox WHERE kind='important'").first();
  assert.deepEqual(stored,{state:'check',items_json:'[]'});
});
