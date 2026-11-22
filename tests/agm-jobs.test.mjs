import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './d1-fixture.mjs';
import {agmJobs,readPlans} from '../worker/agm-jobs.mjs';

test('AGM follow-up jobs reflect the confirmed quorum and use a calendar month for the return',async t=>{
  const db=database(t);
  db.migrate('0019_agm_jobs.sql');
  const examples=[
    ['ordinary','2023-01-31','present','approved','filing','2023-02-28'],
    ['leap','2024-01-31','present','approved','filing','2024-02-29'],
    ['adjourned','2024-05-25','absent','approved','resume','2024-05-25'],
    ['lost','2024-02-10','lost','approved','resume','2024-02-10'],
    ['unconfirmed','2024-05-25','present','draft','record','2024-05-25']
  ];
  for(const [id,date,quorum,status] of examples){
    await db.batch([
      db.prepare("INSERT INTO meeting_register(id,title,date,time,location,created_by,created_at,agenda_kind) VALUES(?,'AGM',?,'10:00','Club room','secretary',?,'agm')").bind(id,date,date),
      db.prepare("INSERT INTO meeting_agendas(meeting_id,topics,revision,updated_at,updated_by,formal_json) VALUES(?,'Attendance',1,?,'secretary',?)").bind(id,date,JSON.stringify({kind:'agm',quorumStatus:quorum})),
      db.prepare("INSERT INTO meeting_notes(id,updated_at,updated_by,last_mutation_id,status) VALUES(?,?,'secretary',?,?)").bind(id,date,id,status)
    ]);
  }
  const plans=await readPlans(db,'2024-06-01');
  for(const [id,,,,key,due] of examples)assert.deepEqual(plans.find(p=>p.id===id).jobs.map(job=>[job.key,job.due]),[[key,due]]);
});

test('AGM jobs calculate dates across years, protect claims, remember handovers and export a private calendar',async t=>{
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0011_meeting_reminders.sql','0018_formal_meeting_agendas.sql','0019_agm_jobs.sql']);
  await db.prepare("INSERT INTO meeting_register(id,title,date,time,location,created_by,created_at,agenda_kind) VALUES('agm','Club AGM','2090-01-09','10:00','Club room','secretary','2089-10-01','agm')").run();
  class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
  const helpers={requireRole:(who,allowed)=>{if(!who||!allowed.includes(who.role))throw new HttpError(who?403:401,'Sign in');},
    requireDb:()=>db,HttpError,bodyJson:req=>req.json(),json:v=>v,
    response:(body,status,headers)=>new Response(body,{status,headers})};
  const person=name=>({id:name,name,role:'committee'});
  const secretary=person('secretary'),vice=person('vicepresident');
  const read=(who=secretary,suffix='')=>agmJobs(new Request('https://club.test/api/meetings/agm-jobs'+suffix),{},who,helpers);
  const act=(who,body)=>agmJobs(new Request('https://club.test/api/meetings/agm-jobs',{method:'POST',body:JSON.stringify({id:'agm',...body})}),{},who,helpers);
  const due=(await read()).plans[0].jobs.map(j=>[j.key,j.due]);
  assert.deepEqual(due,[['papers','2089-12-19'],['notice','2089-12-26'],['nominations','2089-12-26'],['candidates','2090-01-02'],['attendance','2090-01-09']]);
  await assert.rejects(read(null),{status:401});
  await assert.rejects(read({id:'m',role:'member'}),{status:403});
  const take={action:'claim',key:'notice',version:0,planVersion:0};
  await act(vice,take);
  await assert.rejects(act(secretary,take),{status:409});
  await assert.rejects(act(secretary,{...take,action:'release',version:1}),{status:403});
  assert.equal((await read()).plans[0].jobs[1].ownerId,vice.id);
  await act(vice,{...take,action:'release',version:1});
  await act(secretary,{...take,action:'done',version:2});
  const cal=await read(secretary,'?calendar=agm');
  assert.equal(cal.headers.get('cache-control'),'private, no-store');
  const text=await cal.text();
  assert.ok(text.includes('BEGIN:VALARM') && !text.includes('UID:agm-notice@'));
  await assert.rejects(act(vice,{...take,action:'reopen',version:3}),{status:403});
  await act(secretary,{...take,action:'reopen',version:3});
  const changed=await act(vice,{action:'basis',basis:'adjourned',version:0});
  assert.deepEqual(changed.plans[0].jobs.map(j=>j.key),['adjournment','attendance']);
  await assert.rejects(act(secretary,{action:'basis',basis:'fresh',version:0}),{status:409});
  await assert.rejects(act(secretary,{key:'attendance',action:'claim',version:0,planVersion:0}),{status:409});
});
