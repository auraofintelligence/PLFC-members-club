import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {noticeEmailProfile} from '../worker/notice-email-profile.mjs';
import {lifecycleEndpoint} from '../worker/member-lifecycle.mjs';

test('personal confirmation, opt out and guardian controls apply before any notices can be delivered',async t=>{
  const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();
  const db=database(t,files),env={DB:db},member={id:'angler',role:'member'},junior={id:'junior',role:'member'};
  class HttpError extends Error {constructor(status,detail){super(detail);this.status=status;}}
  const helpers={requireRole:(who,allowed)=>{if(!allowed.includes(who?.role))throw new HttpError(403,'Sign in');},
    requireDb:()=>db,json:x=>x,bodyJson:r=>r.json(),HttpError};
  for(const id of [member.id,junior.id]){
    await db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,'member','x','y',0,'2099-01-01')").bind(id,id).run();
  }
  await db.prepare("UPDATE member_profiles SET membership_type='junior',contact_email='guardian@example.test' WHERE account_id='junior'").run();
  let code;
  const call=(who,body)=>noticeEmailProfile(new Request('https://club.test/api/account/notice-email',
    body?{method:'POST',body:JSON.stringify(body)}:{}),env,who,helpers,async(config,mail)=>{code=mail.text.match(/code is (\d{6})/)[1];});
  const save={action:'save',email:'Angler@example.test',important:true,weekly:true};
  const pending=await call(member,save);
  assert.equal(pending.email,'angler@example.test');assert.equal(pending.senderReady,false);assert.equal(code,undefined);
  assert.equal(await db.prepare('SELECT email FROM notice_email_choices').first(),null);
  await assert.rejects(call(junior,save),e=>e.status===403);
  assert.equal((await call(junior)).email,'guardian@example.test');
  Object.assign(env,{RESEND_API_KEY:'fixture',NOTICE_EMAIL_FROM:'club@example.test'});
  assert.equal((await call(member,save)).pendingCode,true);
  await assert.rejects(call(member,save),e=>e.status===429);
  await assert.rejects(call(junior,{action:'confirm',code}),e=>e.status===409);
  await assert.rejects(call(member,{action:'confirm',code:code==='000000'?'000001':'000000'}),e=>e.status===400);
  assert.equal((await call(member,{action:'confirm',code})).verified,true);
  assert.equal((await db.prepare('SELECT email FROM notice_email_recipients').first()).email,'angler@example.test');
  await call(member,{...save,weekly:false,important:false});
  assert.equal(await db.prepare('SELECT email FROM notice_email_recipients').first(),null);

  const request=new Request('https://club.test/api/member/lifecycle?summary=1');
  const count=()=>lifecycleEndpoint('/api/member/lifecycle',request,env,member,helpers);
  const before=(await count()).unread;
  const officer={id:'fixture-secretary',role:'committee'};
  const bulletin={action:'publish',id:crypto.randomUUID(),kind:'working_bee',title:'BBQ start time',message:'Check the new start time.',audience:'all',approved:true,important:true};
  const publish=body=>lifecycleEndpoint('/api/committee/lifecycle',new Request('https://club.test/api/committee/lifecycle',{method:'POST',body:JSON.stringify(body)}),env,officer,helpers);
  await publish(bulletin);await publish(bulletin);
  assert.deepEqual(await count(),{unread:before+1});
  await assert.rejects(publish({...bulletin,important:false}),e=>e.status===409);
});
