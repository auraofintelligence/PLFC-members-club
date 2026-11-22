import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { database } from './d1-fixture.mjs';
import { newslettersEndpoint } from '../worker/newsletters.mjs';
import { recipeBody,readRecipe,recipeExample } from '../public/newsletter-recipe.mjs';
import { lifecycleEndpoint, runMemberCycle } from '../worker/member-lifecycle.mjs';

const migrations=['0000_clubhouse.sql','0001_access_and_meetings.sql','0007_members_and_conversation.sql','0008_member_lifecycle.sql','0017_secretary_news.sql','0021_monthly_birthdays.sql','0035_newsletter_recipes.sql','0046_notice_email_choices.sql'];
const officers=['secretary','assistantsecretary','president','vicepresident','treasurer'];
const officer=name=>({id:'office-'+name,name,accountRole:name==='treasurer'?'treasurer':'committee',role:'committee'});
const active=id=>({id,role:'member'});
const today=new Date(Date.now()+36000000).toISOString().slice(0,10);
const month=today.slice(0,7);
const rejects=(promise,status)=>assert.rejects(promise,error=>error.status===status);
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function fixture(t) {
  const db=database(t,migrations),env={DB:db};
  const helpers={json:data=>data,bodyJson:r=>r.json(),requireDb:()=>db,HttpError};
  function call(identity,path,data) {
    const url=new URL(path,'https://club.example');
    const request=new Request(url,data?{method:'POST',body:JSON.stringify(data)}:{});
    return newslettersEndpoint(url.pathname,request,env,identity,helpers);
  }
  const desk=(who='secretary',which=month)=>call(officer(who),'/api/committee/news?month='+which);
  const post=(who,action,version,fields={})=>call(officer(who),'/api/committee/news',{action,month,version,...fields});
  const read=id=>call(active(id),'/api/member/news');
  async function add(id,type='adult',newsletters=null,paid='2199-12-31') {
    await db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,'member','s','v',1,?)").bind(id,id,paid).run();
    await db.prepare('UPDATE member_profiles SET membership_type=?,newsletters=? WHERE account_id=?').bind(type,newsletters,id).run();
  }
  return {db,env,helpers,call,desk,post,read,add};
}

test('five officers send private versioned contributions, editors assemble one approved edition and paid members read it', async t=>{
  const {db,desk,post,read,add,call}=fixture(t);
  await add('pat');await add('quiet','adult',0);await add('social','social');await add('late','adult',1,'2001-01-01');
  const first=await desk();
  assert.deepEqual(first.edition,{month,title:'',body:'',presidentMessage:'',status:'draft',version:0,publishedAt:null});
  assert.equal(first.monthlyPrompt.dueDay,month+'-01');assert.equal(first.monthlyPrompt.status,'due');
  await rejects(call(null,'/api/member/news'),401);
  await rejects(call(active('pat'),'/api/committee/news'),403);
  await rejects(call({id:'old',role:'signed_in'},'/api/member/news'),403);
  await rejects(read('late'),403);
  await rejects(read('allowlist-only'),403);
  await rejects(post('treasurer','save',0,{title:'No'}),403);
  await rejects(post('president','submit-contribution',0,{office:'treasurer',title:'Spoof',body:'No'}),403);
  for(const who of officers) {
    const own=await desk(who);assert.equal(own.rights.office,who);
    await post(who,'save-contribution',0,{title:who+' report',body:'Private draft '+who});
    assert.equal((await desk(who)).contributionHistory[0].status,'draft');
    const other=await desk(who==='secretary'?'assistantsecretary':'secretary');
    assert.ok(!JSON.stringify(other).includes('Private draft '+who));
    await post(who,'submit-contribution',1,{title:who+' report',body:'Approved text '+who});
    assert.equal((await desk()).contributions.find(c=>c.office===who).status,'submitted');
  }
  await post('assistantsecretary','return-contribution',2,{office:'treasurer'});
  assert.ok(!(await desk()).contributions.some(c=>c.office==='treasurer'));
  await post('treasurer','submit-contribution',3,{title:'Treasurer report',body:'Treasury update'});
  for(const who of officers) await post('assistantsecretary','include-contribution',who==='treasurer'?4:2,{office:who});
  const revision=(await desk()).edition.version;
  const saved=await post('assistantsecretary','save',revision,{title:'Club news'});
  await rejects(post('secretary','save',revision,{title:'Stale'}),409);
  const reviewing=await post('secretary','submit',saved.edition.version);
  await rejects(post('secretary','publish',reviewing.edition.version),409);
  await rejects(post('vicepresident','approve',reviewing.edition.version),403);
  await rejects(post('assistantsecretary','exclude-contribution',3,{office:'secretary'}),409);
  assert.equal((await read('pat')).editions.length,0);
  const approval=await post('president','approve',reviewing.edition.version);
  const release=await post('assistantsecretary','publish',approval.edition.version);
  assert.equal(release.edition.status,'published');
  assert.deepEqual(await post('assistantsecretary','publish',approval.edition.version),release);
  assert.equal((await desk()).monthlyPrompt.status,'published');
  await add('newcomer');
  for(const id of ['pat','quiet','social','newcomer']) {
    const edition=(await read(id)).editions[0];
    assert.equal(edition.title,'Club news');
    assert.deepEqual(edition.contributions.map(c=>c.office).sort(),[...officers].sort());
    assert.ok(edition.contributions.some(c=>c.body==='Treasury update'));
    assert.ok(!JSON.stringify(edition).includes('Private draft'));
  }
  assert.equal((await desk('treasurer')).contributionHistory[0].editionStatus,'published');
  assert.deepEqual((await db.prepare("SELECT account_id FROM member_notices WHERE kind='newsletter'").all()).results,[{account_id:'pat'}]);
  assert.equal((await db.prepare("SELECT count(*) n FROM audit_log WHERE action='newsletter_publish'").first()).n,1);
  assert.equal((await db.prepare("SELECT count(*) n FROM newsletter_contribution_revisions WHERE office='treasurer'").first()).n,5);
  await rejects(post('secretary','save',release.edition.version,{title:'Overwrite'}),409);
});

test('recipes and usual articles can be independently edited, selected and archived for the same officer',async t=>{
  const {db,desk,post,read,add}=fixture(t);
  await add('reader');
  const recipe={kind:'recipe',title:recipeExample.title,body:recipeBody(recipeExample)};
  const {ingredients,method}=recipeExample;
  assert.deepEqual(readRecipe(recipe.body),{ingredients,method});
  await rejects(post('treasurer','submit-contribution',0,{...recipe,body:recipeBody({ingredients,method:''})}),400);
  await rejects(post('treasurer','submit-contribution',0,{...recipe,office:'president'}),403);
  await post('treasurer','submit-contribution',0,{title:'Shirt stock',body:'Merchandise update'});
  await post('treasurer','save-contribution',0,{...recipe,title:'A private recipe'});
  assert.ok(!JSON.stringify(await desk('president')).includes('A private recipe'));
  await post('treasurer','submit-contribution',1,recipe);
  await post('secretary','return-contribution',2,{kind:'recipe',office:'treasurer'});
  await post('treasurer','submit-contribution',3,{...recipe,title:'Lemon squid'});
  await post('assistantsecretary','include-contribution',4,{kind:'recipe',office:'treasurer'});
  await post('secretary','include-contribution',1,{office:'treasurer'});
  assert.equal((await desk('treasurer')).contributionHistory.length,2);
  const {edition}=await post('secretary','save',(await desk()).edition.version,{title:'From the club kitchen'});
  const {edition:reviewed}=await post('secretary','submit',edition.version);
  assert.equal((await read('reader')).editions.length,0);
  await post('secretary','publish',reviewed.version);
  const articles=(await read('reader')).editions[0].contributions;
  assert.deepEqual(articles.map(c=>[c.kind,c.title]),[['article','Shirt stock'],['recipe','Lemon squid']]);
  assert.equal(articles[1].body,recipe.body);
  assert.match((await db.prepare('SELECT body FROM member_bulletins WHERE edition_month=?').bind(month).first()).body,/Ingredients\n250 g/);
  assert.equal((await db.prepare("SELECT count(*) n FROM newsletter_recipe_revisions WHERE office='treasurer'").first()).n,5);
  await rejects(post('secretary','return-contribution',5,{office:'treasurer',kind:'recipe'}),409);
});

test('President message approval survives retries, future edition publishes today, legacy targeted notices stay scoped',async t=>{
  const {db,env,helpers,add,call,post,desk,read}=fixture(t);
  await add('adult');await add('cadet','cadet');
  await db.prepare("UPDATE member_profiles SET contact_email='club@example.test',pref_email=1 WHERE account_id='adult'").run();
  await db.prepare("INSERT INTO member_bulletins(id,kind,audience,title,body,issue_day,created_by) VALUES('earlier','newsletter','cadet','Cadet news','Cadets only',?,'old-editor')").bind(today).run();
  await post('president','message',0,{presidentMessage:'A few words'});
  await post('secretary','save',1,{title:'Members news'});
  await post('assistantsecretary','submit',2);
  await post('president','return',3);
  await post('secretary','save',4,{presidentMessage:'Updated, needs approval'});
  await post('secretary','submit',5);
  await rejects(post('secretary','publish',6),409);
  await post('president','approve',6);await post('secretary','publish',7);
  assert.deepEqual((await read('adult')).editions.map(e=>e.title),['Members news']);
  assert.deepEqual((await read('cadet')).editions.map(e=>e.title).sort(),['Cadet news','Members news']);
  assert.equal((await db.prepare("SELECT count(*) n FROM member_notices WHERE kind='newsletter' AND account_id='cadet'").first()).n,1);
  assert.equal((await db.prepare("SELECT count(*) n FROM member_delivery_queue WHERE channel='email' AND notice_id LIKE 'bulletin:%'").first()).n,1);
  const future='2131-03';
  await post('assistantsecretary','save',0,{month:future,title:'Future edition',body:'News'});
  await post('assistantsecretary','submit',1,{month:future});
  await post('assistantsecretary','publish',2,{month:future});
  assert.equal((await desk('secretary',future)).edition.status,'published');
  const futureBulletin=await db.prepare('SELECT issue_day,edition_month FROM member_bulletins WHERE edition_month=?').bind(future).first();
  assert.deepEqual(futureBulletin,{issue_day:today,edition_month:future});
  const staffPath='/api/committee/lifecycle';
  const staffHome=await lifecycleEndpoint(staffPath,new Request('https://club.example'+staffPath),env,officer('secretary'),helpers);
  assert.equal(staffHome.newsletter.month,month);assert.equal(staffHome.newsletter.publishedBy,'office-secretary');
  const preferences={action:'preferences',revision:0,birthdayEnabled:false,emailEnabled:true,email:'club@example.test',smsEnabled:false,mobile:'',
    newsletters:false,meetings:true,competitions:true,workingBees:true};
  const memberPath='/api/member/lifecycle';
  await lifecycleEndpoint(memberPath,new Request('https://club.example'+memberPath,{method:'POST',body:JSON.stringify(preferences)}),env,active('adult'),helpers);
  assert.equal((await db.prepare("SELECT count(*) n FROM member_delivery_queue WHERE notice_id LIKE 'bulletin:%'").first()).n,0);
  assert.equal((await read('adult')).editions.length,2);
  const third='2131-04';
  await post('secretary','save',0,{month:third,title:'Missing words'});
  await rejects(post('secretary','submit',1,{month:third}),400);
  const owner={id:'owner',role:'committee',accountRole:'administrator',administrator:true};
  const ownerDesk=await call(owner,'/api/committee/news');
  assert.deepEqual(ownerDesk.rights,{office:null,canEdit:true,canApprove:true,canReviewBirthdays:false});
  const externalDesk=await call({id:'access:1',name:'president',role:'committee'},'/api/committee/news');
  assert.deepEqual(externalDesk.rights,{office:null,canEdit:false,canApprove:false,canReviewBirthdays:false});
});

test('member archive pages through distinct months and retains all permitted group editions on the final month of a page', async t=>{
  const {db,call,add}=fixture(t);await add('member');
  const insert=(id,year,audience)=>db.prepare("INSERT INTO member_bulletins(id,kind,audience,title,body,issue_day,created_by) VALUES(?,'newsletter',?,?,?,?,'old-editor')")
    .bind(id,audience,id,'Original content',year+'-01-05');
  const bulletins=Array.from({length:15},(_,i)=>insert('year-'+i,2001+i,'all'));
  bulletins.unshift(insert('personal-edition',2004,'adult'));
  await db.batch(bulletins);
  const first=await call(active('member'),'/api/member/news');
  assert.equal(first.nextBefore,'2004-01');
  assert.equal(first.editions.length,13);
  const second=await call(active('member'),'/api/member/news?before='+first.nextBefore);
  assert.equal(second.nextBefore,null);assert.equal(second.editions.length,3);
  assert.equal(new Set([...first.editions,...second.editions].map(e=>e.title)).size,16);
  await rejects(call(officer('secretary'),'/api/committee/news?month=2029-32'),400);
  await rejects(call(active('member'),'/api/member/news?before=unusable'),400);
});

test('migration preserves previously published all-club and group editions and legacy birthday deduplication',()=>{
  const sql=migrations.map(name=>readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  const oldRecords=`INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES('m','m','member','s','v',1,'2099-01-01');
    UPDATE member_profiles SET membership_type='adult' WHERE account_id='m';
    INSERT INTO member_bulletins VALUES('A','newsletter','all','Older club edition','Complete text','2025-10-07','secretary');
    INSERT INTO member_bulletins VALUES('B','newsletter','cadet','Cadet edition','Limited','2025-10-10','president');
    INSERT INTO member_notices(id,account_id,kind,title,body,issue_day,cycle) VALUES('birthday:m:2025','m','birthday','Birthday','Private','2025-09-17','2025');`;
  const python=`import json, sqlite3, sys
db=sqlite3.connect(':memory:')
for migration in json.load(sys.stdin): db.executescript(migration)
assert db.execute("SELECT month,bulletin_id,title,status,version FROM newsletter_editions").fetchall()==[('2025-10','A','Older club edition','published',1)]
assert db.execute("SELECT count(*) FROM member_bulletins").fetchone()[0]==2
assert db.execute("SELECT id FROM member_notices WHERE kind='newsletter'").fetchall()==[('bulletin:A:m',)]
assert db.execute("SELECT account_id,issue_year FROM member_birthday_issued").fetchall()==[('m','2025')]
assert db.execute("SELECT month,reviewed_at,reviewed_by FROM member_newsletter_jobs WHERE month='2025-10'").fetchone()==('2025-10',None,None)
`;
  const beforeNews=migrations.indexOf('0017_secretary_news.sql');
  const result=spawnSync('python',['-c',python],{input:JSON.stringify([...sql.slice(0,beforeNews),oldRecords,...sql.slice(beforeNews)]),encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});

test('a birthday review covers the current Brisbane month and is recorded once for both secretaries',async t=>{
  const {db,add,desk,post,call}=fixture(t);
  const [year,number]=month.split('-').map(Number);
  const last=new Date(Date.UTC(year,number,0)).toISOString().slice(0,10);
  const following=new Date(Date.UTC(year,number,1)).toISOString().slice(0,10);
  for(const [id,day] of [['first',month+'-01'],['last',last],['next',following]]){
    await add(id);
    await db.prepare('UPDATE member_profiles SET birthday_md=? WHERE account_id=?').bind(day.slice(5),id).run();
  }
  const oldEdition=await desk('assistantsecretary','2020-01');
  assert.deepEqual(oldEdition.birthdays.map(d=>d.day),[month+'-01',last]);
  assert.deepEqual(oldEdition.birthdayReview,{month,reviewedAt:null,reviewedBy:null});
  for(const who of ['president','vicepresident','treasurer']){
    const restricted=await desk(who);
    assert.deepEqual(restricted.birthdays,[]);assert.equal(restricted.birthdayReview,null);
    await rejects(post(who,'review-birthdays',0),403);
  }
  const request={action:'review-birthdays',month};
  await rejects(call({...officer('owner'),accountRole:'administrator',administrator:true},'/api/committee/news',request),403);
  await rejects(call(active('first'),'/api/committee/news',request),403);
  await rejects(call(null,'/api/committee/news',request),401);
  await rejects(post('secretary','review-birthdays',0,{month:following.slice(0,7)}),409);
  const before=(await db.prepare("SELECT COUNT(*) n FROM member_notices WHERE kind='birthday'").first()).n;
  const [a,b]=await Promise.all(['assistantsecretary','secretary'].map(who=>call(officer(who),'/api/committee/news',request)));
  assert.deepEqual(a,b);assert.equal(a.birthdayReview.month,month);assert.ok(a.birthdayReview.reviewedAt);
  assert.ok(['secretary','assistantsecretary'].includes(a.birthdayReview.reviewedBy));
  assert.deepEqual((await desk('assistantsecretary')).birthdayReview,a.birthdayReview);
  assert.deepEqual(await call(officer('secretary'),'/api/committee/news',request),a);
  const audit=await db.prepare("SELECT actor_id FROM audit_log WHERE action='newsletter_review-birthdays'").all();
  assert.deepEqual(audit.results,[{actor_id:'office-'+a.birthdayReview.reviewedBy}]);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM member_notices WHERE kind='birthday'").first()).n,before);
  assert.equal((await desk('secretary')).edition.version,0);
});

test('opt-in birthday reminders display only totals, deduplicate by year, honour opt-outs and handle leap day',async t=>{
  const {db,env,helpers,add,desk}=fixture(t);
  await add('private-alice');await add('opted-out');await add('expired','adult',null,'2000-01-01');
  for(const id of ['private-alice','expired'])await db.prepare("UPDATE member_profiles SET birthday_md=?,contact_email='hidden@example.test' WHERE account_id=?").bind(today.slice(5),id).run();
  const data=await desk();
  assert.deepEqual(data.birthdays,[{day:today,due:1,greeted:1}]);
  assert.ok(!/private-alice|hidden@example/.test(JSON.stringify(data)));
  const preferences={action:'preferences',revision:0,birthdayEnabled:false,emailEnabled:false,smsEnabled:false,newsletters:true,meetings:true,competitions:true,workingBees:true,email:'',mobile:''};
  async function preferencesFor(body) {
    const path='/api/member/lifecycle',request=new Request('https://club.example'+path,{method:'POST',body:JSON.stringify(body)});
    return lifecycleEndpoint(path,request,env,active('private-alice'),helpers);
  }
  assert.ok(!(await preferencesFor(preferences)).notices.some(n=>n.kind==='birthday'));
  assert.equal((await desk()).birthdays.length,0);
  assert.ok(!(await preferencesFor({...preferences,birthdayEnabled:true,birthday:today.slice(5),revision:1})).notices.some(n=>n.kind==='birthday'));
  assert.equal((await db.prepare("SELECT count(*) n FROM member_birthday_issued WHERE account_id='private-alice'").first()).n,1);
  await db.prepare("UPDATE member_profiles SET birthday_md='02-29' WHERE account_id='private-alice'").run();
  for(const date of ['2031-02-28','2031-02-28','2032-02-28','2032-02-29'])await runMemberCycle(env,new Date(date+'T00:00:00Z'));
  assert.deepEqual((await db.prepare("SELECT cycle,issue_day FROM member_notices WHERE account_id='private-alice' AND kind='birthday' ORDER BY cycle").all()).results,
    [{cycle:'2031',issue_day:'2031-02-28'},{cycle:'2032',issue_day:'2032-02-29'}]);
});
