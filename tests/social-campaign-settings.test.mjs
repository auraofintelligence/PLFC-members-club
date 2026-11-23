import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {defaultCampaignSettings} from '../public/social-campaign-engine.js';

const origin='https://club.example',endpoint='/api/committee/social-campaign-settings';
async function fixture(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql','0007_members_and_conversation.sql','0022_committee_social_planner.sql','0059_social_campaign_settings.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'local-test'},tokens={};
  for(const [name,role] of [['secretary','committee'],['president','committee'],['member','member']]){
    const token=randomBytes(32).toString('hex');
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')").bind('test-'+name,name,role),
      db.prepare('INSERT INTO club_sessions(digest,account_id,expires) VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),'test-'+name)
    ]);
    tokens[name]=token;
  }
  function call(name,body){
    const headers={Origin:origin};
    if(tokens[name])headers.Cookie='__Host-plfc_session='+tokens[name];
    if(body)headers['Content-Type']='application/json';
    return handleRequest(new Request(origin+endpoint,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env);
  }
  return {call,db};
}
test('committee settings are guarded, versioned and remain configuration only',async t=>{
  const {call,db}=await fixture(t),defaults=defaultCampaignSettings();
  assert.equal((await call(null)).status,401);
  assert.equal((await call('member')).status,403);
  const initial=await(await call('secretary')).json();
  assert.equal(initial.version,0);assert.equal(initial.settings,null);
  const denied=await call('member',{version:0,settings:defaults});assert.equal(denied.status,403);
  const saved=await call('secretary',{version:0,settings:defaults});assert.equal(saved.status,200);
  const first=await saved.json();assert.equal(first.version,1);
  assert.equal(first.settings.layers.nswHolidays.weekly,2);
  const modified=structuredClone(first.settings);
  modified.layers.nswHolidays.weekly=1;
  modified.layers.nswHolidays.audience.place=['tourist'];
  const next=await call('president',{version:1,settings:modified});assert.equal(next.status,200);
  const second=await next.json();assert.equal(second.version,2);
  assert.deepEqual(second.settings.layers.nswHolidays.audience.place,['tourist']);
  assert.equal((await call('secretary',{version:1,settings:defaults})).status,409);
  assert.equal((await call('secretary',{version:0,settings:defaults})).status,409);
  const table=await db.prepare('SELECT count(*) n FROM committee_social_campaign_settings').first();
  assert.equal(table.n,1);
  const audits=await db.prepare("SELECT count(*) n FROM audit_log WHERE action='social_campaign_settings_saved'").first();
  assert.equal(audits.n,2);
});
test('invalid audience categories and video ratios are rejected',async t=>{
  const {call}=await fixture(t);
  const s=defaultCampaignSettings();s.videoShare=120;
  assert.equal((await call('secretary',{version:0,settings:s})).status,400);
  s.videoShare=67;s.layers.nswHolidays.audience.place=['tourist','unknown'];
  assert.equal((await call('secretary',{version:0,settings:s})).status,400);
});
