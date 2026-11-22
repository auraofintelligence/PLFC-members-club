import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const origin='https://club.example';
async function fixture(t) {
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0007_members_and_conversation.sql','0024_club_events.sql','0026_member_calendar.sql']);
  const cookies={},env={DB:db,PRIVATE_AUTH_KEY:'test-fixture'};
  for(const [name,role] of [['secretary','committee'],['treasurer','treasurer'],['member','member'],['expired','member']]){
    const token=randomBytes(32).toString('hex');
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,?)").bind(name,name,role,name==='expired'?'2000-01-01':'2099-12-31'),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),name)]);
    cookies[name]='__Host-plfc_session='+token;
  }
  const get=(user,path,body)=>handleRequest(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookies[user]?{Cookie:cookies[user]}:{})},body:body?JSON.stringify(body):undefined}),env);
  async function json(user,path,body,status=200){
    const r=await get(user,path,body),data=await r.json(); assert.equal(r.status,status,JSON.stringify(data));return data;
  }
  return {get,json};
}

test('members see public dates and explicitly published event copy, without committee records or financials',async t=>{
  const {get,json}=await fixture(t),id=randomUUID(),events='/api/committee/events',notice=events+'/'+id+'/member-notice',calendar='/api/member/calendar',file=calendar+'/'+id+'.ics';
  const nov=calendar+'?month=2026-11',dec=calendar+'?month=2026-12';
  const privateValues=['Internal run sheet café','Private room contact','Purpose for committee','Hidden planning note','Private helper name'];
  const plan={action:'create',id,mutationId:randomUUID(),type:'bbq',date:'2026-11-21',title:privateValues[0],location:privateValues[1],goal:privateValues[2],notes:privateValues[3]};
  await json('secretary',events,plan,201);
  await json('secretary',events,{action:'helper',id,mutationId:randomUUID(),key:'venue',version:1,helperName:privateValues[4],agreed:true});
  await json('treasurer',events,{action:'money',id,mutationId:randomUUID(),version:2,takingsCents:20789,expensesCents:15555});
  for(const path of [nov,file,notice])await json('visitor',path,undefined,401);
  for(const path of [nov,file])await json('expired',path,undefined,403);
  await json('member',notice,undefined,403);
  const initial=await json('member',nov);
  assert.ok(initial.events.every(e=>e.id!=='hotel-meeting-2026-11-22'));
  assert.ok(initial.events.every(e=>e.id!==id));
  assert.deepEqual(await json('secretary',notice),{notice:{id,title:'',date:'',time:'',place:'',details:'',published:false,version:0},canPublish:true});
  await json('member',file,undefined,404);
  const publish={action:'publish',mutationId:randomUUID(),version:0,title:'Family fishing catch-up',date:'2026-12-05',time:'09:30',place:'Meet at the signed club table',details:'Look for the club flag.\nBring a hat, water and a mug.'};
  await json('member',notice,publish,403);
  await json('secretary',notice,{...publish,goal:'unexpected'},400);
  await json('secretary',notice,{...publish,date:'2026-11-31'},400);
  await json('secretary',notice,{...publish,time:'25:30'},400);
  assert.equal((await json('secretary',notice,publish)).notice.version,1);
  assert.equal((await json('secretary',notice,publish)).notice.version,1);
  await json('secretary',notice,{...publish,mutationId:randomUUID(),title:'Stale wording'},409);
  await json('treasurer',notice,{...publish,title:'Changed stale retry'},409);
  const member=(await json('member',dec)).events.find(e=>e.id===id);
  assert.deepEqual(member,{id,source:'members',title:publish.title,date:publish.date,time:publish.time,place:publish.place,details:publish.details,calendarUrl:file});
  assert.ok(!(await json('member',nov)).events.some(e=>e.id===id));
  const download=await get('member',file),ics=await download.text();
  assert.equal(download.status,200);assert.match(download.headers.get('Cache-Control'),/private, no-store/);
  assert.match(ics,/DTSTART:20261204T233000Z/);assert.match(ics,/CLASS:PRIVATE/);assert.match(ics,/DESCRIPTION:Look for the club flag\.\\nBring a hat\\, water/);
  const publicData=JSON.stringify(await json('visitor','/api/club'));
  assert.ok(!publicData.includes(publish.title));
  for(const text of [...privateValues,'20789','15555']) for(const output of [JSON.stringify(member),ics,publicData]) assert.ok(!output.includes(text));
  const dayOnly={...publish,mutationId:randomUUID(),version:1,date:'2027-01-10',time:''};
  await json('secretary',notice,dayOnly);assert.ok(!(await json('member',dec)).events.some(e=>e.id===id));
  assert.match(await(await get('member',file)).text(),/DTSTART;VALUE=DATE:20270110/);
  const withdrawal={action:'withdraw',version:2,mutationId:randomUUID()};
  await json('secretary',events,{action:'close',id,mutationId:randomUUID(),version:3,closeNote:'End of the run sheet.'});
  const withdrawn=await json('secretary',notice,withdrawal);assert.equal(withdrawn.notice.published,false);assert.equal(withdrawn.canPublish,false);
  await json('secretary',notice,withdrawal);await json('member',file,undefined,404);
  assert.ok(!(await json('member',calendar+'?month=2027-01')).events.some(e=>e.id===id));
  await json('secretary',notice,{...publish,mutationId:randomUUID(),version:3},409);
});
