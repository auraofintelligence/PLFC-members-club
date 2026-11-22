import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const jpeg='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/AOXr/9k=';
async function setup(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0007_members_and_conversation.sql','0025_member_network.sql','0027_club_honours.sql','0028_member_safeguards.sql','0029_competition_results.sql','0033_competition_targets.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'honours local test'},cookies={};
  for(const [name,role] of [['secretary','committee'],['amy','member'],['bob','member']]){
    const value=randomBytes(32).toString('hex');cookies[name]='__Host-plfc_session='+value;
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')").bind(name,name,role),db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(value).digest('hex'),name)]);
  }
  await db.batch([db.prepare("INSERT INTO member_age_checks VALUES('amy','16+',0,1,'2025-01-01','secretary')"),
    db.prepare("INSERT INTO member_terms_acceptance SELECT 'amy',terms_version,1,1,'2025-01-01' FROM member_safeguard_policy WHERE id=1")]);
  const origin='https://club.example';
  const r=(user,path,body)=>handleRequest(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookies[user]?{Cookie:cookies[user]}:{})},body:body?JSON.stringify(body):undefined}),env);
  async function req(user,path,body,status=200){const result=await r(user,path,body),data=await result.json();assert.equal(result.status,status,JSON.stringify(data));return data;}
  return {db,r,req};
}
test('honours protect photo checks, keep species ties and year counts, and publish only selected monthly awards and confirmed competition copy',async t=>{
  const {db,r,req}=await setup(t),member='/api/member/honours?year=2024&month=8',staff='/api/committee/honours?year=2024&month=8';
  const cmd=(action,body)=>({action,mutationId:randomUUID(),...body});
  for(const path of [member,staff])await req('anonymous',path,undefined,401);
  await req('amy',staff,undefined,403);
  assert.deepEqual((await req('amy',member)).standings,[]);
  const comp=cmd('competition',{id:randomUUID(),version:0,year:2024,title:'Club invitation',details:'Member details',prizes:'Confirmed club shirt',sponsors:'Consenting supporter',published:false});
  await req('amy',member,comp,403);await req('secretary',staff,comp);
  assert.equal((await req('bob',member)).competitions.length,0);
  await req('secretary',staff,cmd('competition',{...comp,mutationId:randomUUID(),version:1,published:true}),400);
  await req('secretary',staff,cmd('competition',{...comp,mutationId:randomUUID(),version:1,published:true,allAges:true}));
  const id=randomUUID(),basic={alias:'Island angler',species:'sand-whiting',cm:'32.4',date:'2024-08-12',consent:true,competitionId:comp.id};
  const entered=cmd('enter',{id,...basic,photo:'data:image/jpeg;base64,'+jpeg});
  await req('bob',member,entered,403);
  await req('amy',member,{...entered,consent:false},400);
  await req('amy',member,{...entered,species:'reef-manta-ray'},400);
  await req('amy',member,{...entered,lat:-27.2},400);
  await req('amy',member,{...entered,photo:''},400);
  let view=await req('amy',member,entered);assert.equal(view.myEntries[0].status,'pending');assert.equal(view.standings.length,0);assert.ok(!JSON.stringify(view).includes(jpeg));
  assert.equal((await req('amy',member,entered)).myEntries.length,1);
  const image='/api/committee/honours/'+id+'/photo';
  await req('amy',image,undefined,403);await req('bob',image,undefined,403);
  assert.ok(!(await db.prepare('SELECT photo_cipher AS p FROM honours_entries WHERE id=?').bind(id).first()).p.includes(jpeg));
  const approvedPhoto=await r('secretary',image);assert.equal(approvedPhoto.status,200);assert.match(approvedPhoto.headers.get('Cache-Control'),/private/);
  assert.equal(new Uint8Array(await approvedPhoto.arrayBuffer())[0],255);
  assert.equal((await req('bob',member)).myEntries.length,0);
  const checked=cmd('review',{id,decision:'verified',version:1,checked:true,note:''});
  await req('secretary',staff,{...checked,checked:false},400);
  view=await req('secretary',staff,checked);assert.equal(view.standings[0].count,1);
  const paper=(alias,cm,date='2024-08-15',species='sand-whiting')=>cmd('sighted',{id:randomUUID(),...basic,competitionId:'',alias,cm,date,species,checked:true,confirmed16:true,sightedNote:'Checked the number on the original mat.'});
  await req('secretary',staff,{...paper('Unconfirmed',35),confirmed16:false},400);
  await req('secretary',staff,{...paper('No permissions',35),entrantId:'bob'},403);
  await req('secretary',staff,paper('Another angler','32.4'));await req('secretary',staff,paper('A smaller fish','27.8'));
  await req('secretary',staff,paper('Last year','98.2','2023-11-11'));await req('secretary',staff,paper('A ray','45','2024-08-11','smooth-stingray'));
  const board=await req('bob',member),whiting=board.standings.find(s=>s.species==='sand-whiting');
  assert.deepEqual([whiting.mm,whiting.count,whiting.leaders.length],[324,3,2]);assert.ok(!JSON.stringify(board).includes('Last year'));
  const prize=cmd('award',{month:'2024-08',version:0,entryId:id,reason:'A helpful release story.'});
  await req('secretary',staff,{...prize,month:'2024-09'},409);await req('secretary',staff,prize);
  assert.equal((await req('amy',member)).awards[0].alias,basic.alias);
  await db.prepare("UPDATE member_terms_acceptance SET accepted=0,version=version+1 WHERE account_id='amy'").run();
  const hidden=await req('amy',member);assert.equal(hidden.canEnter,false);assert.equal(hidden.awards.length,0);
  assert.ok(!hidden.standings.find(s=>s.species==='sand-whiting').leaders.some(l=>l.id===id));
  assert.equal(hidden.myEntries[0].eligibleNow,0);await req('secretary',image,undefined,404);
  await db.batch([db.prepare("INSERT INTO member_age_checks VALUES('bob','under16',1,1,'2025-01-01','secretary')"),
    db.prepare("INSERT INTO member_terms_acceptance SELECT 'bob',terms_version,1,1,'2025-01-01' FROM member_safeguard_policy WHERE id=1")]);
  assert.equal((await req('bob',member)).canEnter,false);
  await req('bob',member,{...entered,id:randomUUID(),mutationId:randomUUID()},403);
  await req('bob',member,cmd('withdraw',{id,version:2}),409);
  await req('amy',member,cmd('withdraw',{id,version:2}));await req('secretary',image,undefined,404);
  const final=await req('bob',member);assert.equal(final.awards.length,0);assert.equal(final.standings.find(s=>s.species==='sand-whiting').leaders.length,1);
  assert.ok(!JSON.stringify(final).includes('sightedNote')&&!JSON.stringify(final).includes('hasPhoto'));
  await req('secretary',staff,cmd('competition',{...comp,mutationId:randomUUID(),version:2,published:false}));assert.equal((await req('amy',member)).competitions.length,0);
});

test('published placings and timed sponsor offers follow the confirmed competition and entrant permissions',async t=>{
  const {req,db}=await setup(t);
  const now=new Date(Date.now()+36000000).toISOString().slice(0,10),year=Number(now.slice(0,4));
  const member='/api/member/honours?year='+year,staff='/api/committee/honours?year='+year;
  const post=(action,fields)=>({action,mutationId:randomUUID(),...fields});
  const comp={id:randomUUID(),year,title:'Test invitational',details:'',prizes:'',sponsors:'Local tackle shop',published:true,allAges:true,offer:'Collect a club sticker',offerFrom:now,offerUntil:now};
  let view=await req('secretary',staff,post('competition',{...comp,version:0}));
  assert.equal((await req('bob',member)).competitions[0].offer,comp.offer);
  const id=randomUUID();
  await req('secretary',staff,post('sighted',{id,entrantId:'amy',alias:'Island angler',species:'eastern-shovelnose-ray',cm:'68',date:now,consent:true,competitionId:comp.id,checked:true,confirmed16:true,sightedNote:'Photo checked.'}));
  const place={id,version:1,place:1,prize:'Club tackle voucher',confirmed:true};
  await req('amy',member,post('placing',place),403);
  await req('secretary',staff,post('placing',place));
  const row=(await req('bob',member)).competitions[0].results[0];
  assert.equal(row.alias,'Island angler');assert.equal(row.placing,1);assert.equal(row.prize,place.prize);
  await req('secretary',staff,post('competition',{...comp,version:1,offerFrom:'2000-01-01',offerUntil:'2000-02-01'}));
  assert.equal((await req('bob',member)).competitions[0].offer,'');
  await db.prepare("UPDATE member_terms_acceptance SET accepted=0,version=version+1 WHERE account_id='amy'").run();
  assert.deepEqual((await req('bob',member)).competitions[0].results,[]);
});

test('a competition target list guides members and protects accepted entries',async t=>{
  const {req}=await setup(t),staff='/api/committee/honours?year=2024',board='/api/member/honours?year=2024';
  const comp={action:'competition',id:randomUUID(),year:2024,version:0,title:'Whiting morning',published:true,allAges:true};
  const save=(fields,status=200)=>req('secretary',staff,{...comp,...fields,mutationId:randomUUID()},status);
  await save({targets:['grey-nurse-shark']},400);
  await save({targets:['sand-whiting','winter-whiting','sand-whiting']});
  assert.deepEqual((await req('amy',board)).competitions[0].targets,['sand-whiting','winter-whiting']);
  const entry={action:'enter',id:randomUUID(),competitionId:comp.id,alias:'Angler',cm:'32',species:'snapper',date:'2024-03-01',consent:true,photo:'data:image/jpeg;base64,'+jpeg};
  await req('amy',board,{...entry,mutationId:randomUUID()},400);
  await req('amy',board,{...entry,species:'sand-whiting',mutationId:randomUUID()});
  await save({version:1,targets:['snapper']},409);
  await save({version:1,title:'Whiting morning updated'});
  assert.deepEqual((await req('amy',board)).competitions[0].targets,['sand-whiting','winter-whiting']);
  await save({version:2,targets:[]});
  assert.deepEqual((await req('amy',board)).competitions[0].targets,[]);
});
