import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const endpoint='/api/committee/notices', todos='/api/committee/todos';
const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
async function setup(t) {
  const db=database(t,files), env={DB:db,PRIVATE_AUTH_KEY:'fixture-key'};
  const accounts=[['secretary','committee'],['assistantsecretary','committee'],['treasurer','treasurer'],['president','committee'],['member','member'],['webmaster','administrator']];
  const cookies=new Map();
  const writes=[];
  for(const [login,role] of accounts){
    const token=randomBytes(32).toString('hex'),id='fixture-'+login;
    writes.push(db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'salt','hash',0,'2099-01-01')").bind(id,login,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),id));
    cookies.set(login,'__Host-plfc_session='+token);
  }
  await db.batch(writes);
  async function send(who,data,path=endpoint,status=200){
    const origin='https://plfc.test',headers={Origin:origin};
    if(cookies.has(who))headers.Cookie=cookies.get(who);
    if(data)headers['Content-Type']='application/json';
    const response=await handleRequest(new Request(origin+path,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined}),env);
    const payload=await response.json();assert.equal(response.status,status,JSON.stringify(payload));return payload;
  }
  return {db,send};
}
function plus(day,count){return new Date(Date.parse(day+'T00:00:00Z')+count*86400000).toISOString().slice(0,10);}

test('private officer notice status, review and personal alerts survive retries and distinguish review from completion',async t=>{
  const {send,db}=await setup(t);
  await send('anonymous',null,endpoint+'?summary=1',401);
  await send('member',null,endpoint+'?archive=1',403);
  const {today}=await send('treasurer',null,endpoint+'?summary=1');
  const id=randomUUID(),post={action:'post',id,kind:'info',title:'Hotel catch-up',details:'Ask about the event date.',reviewDate:today,important:true};
  const own=await send('treasurer',post);
  assert.deepEqual(own.counts,{unread:0,amber:1,red:0});
  assert.equal(own.notices[0].status,'stale');
  assert.equal(own.notices[0].important,true);
  assert.equal(own.notices[0].canArchive,true);
  assert.deepEqual(own.offices,[{key:'treasurer',label:'Treasurer'}]);
  assert.deepEqual((await send('president',null,endpoint+'?summary=1')).counts,{unread:1,amber:1,red:0});
  await send('president',{action:'seen',id,version:1});
  assert.equal((await send('assistantsecretary')).counts.unread,1);
  assert.equal((await send('president')).notices[0].canReview,false);
  const confirm={action:'review',id,version:1,reviewDate:plus(today,15)};
  await send('president',confirm,endpoint,403);
  await send('secretary',{...confirm,reviewDate:today},endpoint,400);
  const fresh=await send('secretary',confirm);
  assert.equal(fresh.notices[0].status,'current');
  assert.equal(fresh.notices[0].version,2);
  await send('secretary',confirm);
  await send('treasurer',post);
  assert.equal((await send('president',{action:'seen',id,version:1})).counts.unread,1);
  await send('treasurer',{...post,details:'different'},endpoint,409);
  await send('treasurer',{...post,important:false},endpoint,409);
  await send('treasurer',{...post,important:'yes'},endpoint,400);
  await send('assistantsecretary',{action:'archive',id,version:1},endpoint,409);
  await send('assistantsecretary',{action:'archive',id,version:2});
  await send('assistantsecretary',{action:'archive',id,version:2});
  assert.deepEqual((await send('treasurer')).notices,[]);
  assert.equal((await send('treasurer',null,endpoint+'?archive=1')).notices[0].status,'archived');
  assert.equal((await db.prepare('SELECT count(*) AS count FROM audit_log WHERE entity_id=?').bind(id).first()).count,3);
  const unspecified=await send('treasurer',{action:'post',id:randomUUID(),kind:'info',title:'Contact change'});
  assert.equal(unspecified.notices[0].reviewDate,plus(today,30));
  assert.equal(unspecified.notices[0].important,false);
});

test('posting a job creates one printable task, respects office boundaries and clears overdue when the underlying job is completed',async t=>{
  const {send,db}=await setup(t),{today}=await send('secretary');
  const id=randomUUID(),post={action:'post',kind:'action',id,title:'Collect the raffle prizes',details:'Check the store room.',office:'treasurer',dueDate:plus(today,-1)};
  await send('president',post,endpoint,403);
  await send('secretary',{...post,dueDate:''},endpoint,400);
  await send('secretary',post);
  await send('secretary',post);
  const row=(await send('treasurer')).notices[0];
  assert.equal(row.taskId,id);assert.equal(row.light,'red');assert.equal(row.unread,true);assert.equal(row.canArchive,false);
  assert.equal(row.canReview,false);
  await send('secretary',{action:'archive',id,version:1},endpoint,409);
  await send('assistantsecretary',{action:'review',id,version:1},endpoint,400);
  const job=(await send('treasurer',null,todos)).tasks.find(task=>task.id===id);
  assert.equal(job.title,post.title);assert.equal(job.details,post.details);
  await send('assistantsecretary',{action:'complete',id,source:'manual',version:job.version,paper:true},todos);
  const resolved=await send('treasurer');
  assert.equal(resolved.notices[0].status,'done');assert.equal(resolved.notices[0].canArchive,true);
  assert.equal(resolved.counts.red,0);
  await send('treasurer',{action:'archive',id,version:1});
  const info={action:'post',kind:'info',id:randomUUID(),title:'Safety update',reviewDate:plus(today,7)};
  const n1=await send('secretary',info);assert.equal(n1.notices[0].status,'reviewSoon');
  for(const [difference,status] of [[0,'dueToday'],[7,'dueSoon'],[8,'current']]){
    const action={...post,id:randomUUID(),dueDate:plus(today,difference)};
    const board=await send('treasurer',action);assert.equal(board.notices.find(n=>n.id===action.id).status,status);
  }
  const collision=randomUUID();
  await send('treasurer',{action:'add',id:collision,office:'treasurer',title:'Existing private task',details:'Keep this private.',dueDate:''},todos);
  await send('secretary',{...post,id:collision},endpoint,409);
  assert.equal(await db.prepare('SELECT id FROM committee_notices WHERE id=?').bind(collision).first(),null);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM officer_todo_items WHERE id=?').bind(id).first()).n,1);
});
