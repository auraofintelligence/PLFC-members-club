import test from 'node:test';
import assert from 'node:assert/strict';
import {assistMinutes} from '../worker/minute-assistant.mjs';
import {database} from './d1-fixture.mjs';

const identity = {id:'example-secretary',role:'committee'};
const helpers = {
  json: payload => Response.json(payload),
  bodyJson: request => {
    assert.equal(request.headers.get('Origin'), 'https://club.example.test');
    return request.json();
  },
  requireDb: env => env.DB,
  HttpError: class extends Error { constructor(status,message) { super(message); this.status=status; } },
};
const url = 'https://club.example.test/api/meeting/assist';
const request = notes => new Request(url,{method:'POST',headers:{Origin:new URL(url).origin},body:JSON.stringify({notes})});
const first = 'We agreed to hold a Sunday stocktake.';
const second = 'Alex will bring the tally sheets by 25 November 2026.';
const notes = first+' '+second;
const decision = {kind:'decision',quote:first,text:first,owner:'Alex',dateText:'2026-11-25'};
const action = {kind:'action',quote:second,text:'bring the tally sheets',owner:'Alex',dateText:'25 November 2026'};
function environment(t, run) {
  return {DB:database(t,['0006_minute_usage.sql']),AI:{run}};
}

test('committee request returns only excerpt-backed rows and supported owners and dates',async t => {
  const env = environment(t, async (model, input) => {
    assert.equal(model,'@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    assert.deepEqual(JSON.parse(input.messages[1].content),{meetingNotes:notes});
    assert.equal(input.response_format.type,'json_schema');
    return {response:JSON.stringify({suggestions:[
      decision, {...action,quote:'A quote that never appeared.'}, {...action,text:'Order 50 stickers'}, action, action,
    ]})};
  });
  const response=await assistMinutes(request(notes),env,identity,helpers);
  assert.deepEqual(await response.json(), {remaining:4,suggestions:[
    {kind:'decision',quote:first,text:first,owner:'',dueDate:''},
    {kind:'action',quote:second,text:'bring the tally sheets',owner:'Alex',dueDate:'2026-11-25'},
  ]});
  env.AI.run=async()=>({response:{suggestions:[{...action,owner:'Al',dateText:'2028-01-01'}]}});
  const next=await (await assistMinutes(request(notes),env,identity,helpers)).json();
  assert.equal(next.suggestions[0].owner,''); assert.equal(next.suggestions[0].dueDate,'');
});

test('unapproved, empty, oversized and unavailable requests avoid inference and leave the quota alone',async t=>{
  let calls=0;
  const env=environment(t,async()=>{calls++;return {response:{suggestions:[]}}});
  for(const visitor of [null,{role:'member'}, {role:'signed_in'}]){
    await assert.rejects(assistMinutes(request(notes),env,visitor,helpers),{status:visitor?403:401});
  }
  for(const invalid of ['', '  ', 'a'.repeat(8001)]) {
    await assert.rejects(assistMinutes(request(invalid),env,identity,helpers),{status:400});
  }
  await assert.rejects(assistMinutes(new Request(url),env,identity,helpers),{status:405});
  await assert.rejects(assistMinutes(request(notes),{DB:env.DB},identity,helpers),{status:503});
  const rows=await env.DB.prepare('SELECT COUNT(*) AS n FROM minute_assist_usage').first();
  assert.equal(rows.n,0); assert.equal(calls,0);
});

test('quota caps attempts per committee user and resets on the next Brisbane date',async t=>{
  let calls=0;
  const env=environment(t,async()=>{calls++;return {response:{suggestions:[]}}});
  for(let i=1;i<=5;i++){
    const result=await (await assistMinutes(request(notes),env,identity,helpers)).json();
    assert.equal(result.remaining,5-i);
  }
  await assert.rejects(assistMinutes(request(notes),env,identity,helpers),{status:429});
  assert.equal(calls,5);
  const other=await (await assistMinutes(request(notes),env,{...identity,id:'different'},helpers)).json();
  assert.equal(other.remaining,4);
  await env.DB.prepare("UPDATE minute_assist_usage SET local_day='1999-01-01' WHERE actor_id=?").bind(identity.id).run();
  const tomorrow=await (await assistMinutes(request(notes),env,identity,helpers)).json();
  assert.equal(tomorrow.remaining,4);
  env.AI.run=async()=>({response:'unparseable'});
  await assert.rejects(assistMinutes(request(notes),env,identity,helpers),{status:503});
  const row=await env.DB.prepare('SELECT used FROM minute_assist_usage WHERE actor_id=?').bind(identity.id).first();
  assert.equal(row.used,2);
});
