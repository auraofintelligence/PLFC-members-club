import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {defaultCampaignSettings,copyMonthSettings} from '../public/social-campaign-engine.js';
import {describeCampaignChanges} from '../worker/social-campaign-history.mjs';

const origin='https://club.example',url=origin+'/api/committee/social-campaign-settings';
async function fixture(t){
  const db=database(t,[
    '0000_clubhouse.sql','0001_access_and_meetings.sql','0005_meeting_register.sql',
    '0007_members_and_conversation.sql','0022_committee_social_planner.sql',
    '0059_social_campaign_settings.sql'
  ]);
  const tokens={};
  for(const [login,role] of [['secretary','committee'],['webmaster','administrator'],
      ['president','committee'],['member','member']]){
    const token=randomBytes(32).toString('hex');
    await db.batch([
      db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')")
        .bind('test-'+login,login,role),
      db.prepare('INSERT INTO club_sessions(digest,account_id,expires) VALUES(?,?,4102444800)')
        .bind(createHash('sha256').update(token).digest('hex'),'test-'+login)
    ]);
    tokens[login]=token;
  }
  function call(login,body,query=''){
    const headers={Origin:origin};
    if(tokens[login])headers.Cookie='__Host-plfc_session='+tokens[login];
    if(body)headers['Content-Type']='application/json';
    return handleRequest(new Request(url+query,{method:body?'POST':'GET',headers,
      body:body?JSON.stringify(body):undefined}),{DB:db,PRIVATE_AUTH_KEY:'local-test'});
  }
  return {call,db};
}
test('month presets persist across GET refreshes and every shared save has a signed historical version',async t=>{
  const {call,db}=await fixture(t);
  const first=defaultCampaignSettings();
  const month=copyMonthSettings(first);
  month.limits.weekdayMin=3;
  month.limits.weekday=5;
  month.layers.fish.weekly=5;
  first.monthOverrides['2026-11']=month;
  const save=await call('secretary',{version:0,settings:first});
  assert.equal(save.status,200,await save.text());
  const result=await(await call('secretary')).json();
  assert.equal(result.version,1);
  assert.equal(result.updatedOffice,'Secretary');
  assert.equal(result.updatedByName,'secretary');
  assert.equal(result.settings.monthOverrides['2026-11'].limits.weekdayMin,3);
  assert.equal(result.settings.monthOverrides['2026-11'].layers.fish.weekly,5);
  const history=await(await call('secretary',null,'?history=1')).json();
  assert.equal(history.history.length,1);
  assert.equal(history.history[0].actorOffice,'Secretary');
  assert.ok(history.history[0].changes.count>0);
  const snapshot=await(await call('secretary',null,'?version=1')).json();
  assert.equal(snapshot.revision.settings.monthOverrides['2026-11'].limits.weekdayMin,3);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM committee_social_campaign_history').first()).n,1);
});
test('Webmaster saves have their own account attribution and cannot overwrite earlier revision snapshots',async t=>{
  const {call,db}=await fixture(t);
  const first=defaultCampaignSettings();
  assert.equal((await call('secretary',{version:0,settings:first})).status,200);
  const second=structuredClone(first);
  const month=copyMonthSettings(second);
  month.limits.fridayMin=3;
  month.limits.friday=5;
  second.monthOverrides['2027-01']=month;
  const webmaster=await call('webmaster',{version:1,settings:second});
  assert.equal(webmaster.status,200,await webmaster.text());
  const latest=await(await call('secretary')).json();
  assert.equal(latest.updatedOffice,'Webmaster');
  assert.equal(latest.updatedByName,'webmaster');
  assert.equal(latest.version,2);
  const result=await(await call('webmaster',null,'?history=1')).json();
  assert.deepEqual(result.history.map(item=>item.version),[2,1]);
  assert.equal(result.history[0].actorRole,'administrator');
  assert.equal(result.history[0].actorOffice,'Webmaster');
  assert.equal(result.history[0].actorName,'webmaster');
  assert.ok(result.history[0].changes.changes.some(item=>item.field.includes('monthOverrides.2027-01')));
  const original=await(await call('secretary',null,'?version=1')).json();
  assert.deepEqual(original.revision.settings.monthOverrides,{});
  const savedByWebmaster=await(await call('secretary',null,'?version=2')).json();
  assert.equal(savedByWebmaster.revision.settings.monthOverrides['2027-01'].limits.fridayMin,3);
  const conflict=await call('president',{version:1,settings:second});
  assert.equal(conflict.status,409);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM committee_social_campaign_history').first()).n,2,
    'conflicting save creates no history entry');
});
test('history is committee-only; rejected saves have no revision record',async t=>{
  const {call,db}=await fixture(t);
  assert.equal((await call('member',null,'?history=1')).status,403);
  assert.equal((await call(null,null,'?history=1')).status,401);
  const invalid=defaultCampaignSettings();
  invalid.videoShare=105;
  assert.equal((await call('webmaster',{version:0,settings:invalid})).status,400);
  assert.equal((await db.prepare("SELECT name FROM sqlite_master WHERE name='committee_social_campaign_history'").first()),null);
});
test('existing shared campaign settings are retained as a labelled baseline when history is introduced',async t=>{
  const {call,db}=await fixture(t);
  const saved=defaultCampaignSettings();
  await db.prepare('INSERT INTO committee_social_campaign_settings (id,version,settings_json,updated_at,updated_by) VALUES(1,7,?,?,?)')
    .bind(JSON.stringify(saved),'2026-11-01T01:10:00.000Z','test-secretary').run();
  const first=await(await call('webmaster',null,'?history=1')).json();
  assert.equal(first.history.length,1);
  assert.equal(first.history[0].version,7);
  assert.match(first.history[0].changes.note,/Existing saved settings/);
  const newer=structuredClone(saved);
  newer.limits.weekdayMin=3;
  assert.equal((await call('webmaster',{version:7,settings:newer})).status,200);
  const history=await(await call('president',null,'?history=1')).json();
  assert.deepEqual(history.history.map(item=>item.version),[8,7]);
  assert.equal(history.history[0].actorOffice,'Webmaster');
});
test('diffs include min-max changes without recording unchanged fields',()=>{
  const before=defaultCampaignSettings(),after=structuredClone(before);
  after.monthOverrides['2027-02']=copyMonthSettings(after);
  after.monthOverrides['2027-02'].limits.weekdayMin=3;
  const report=describeCampaignChanges(before,after);
  assert.ok(report.count>0);
  assert.ok(report.changes.some(item=>item.field.includes('monthOverrides')));
  assert.equal(describeCampaignChanges(before,before).count,0);
});
