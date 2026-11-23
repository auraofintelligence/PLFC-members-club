import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN_LAYERS,defaultCampaignSettings,generateCampaignYear,holidayInfluences} from '../public/social-campaign-engine.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';

const defaults=()=>defaultCampaignSettings();
const weekday=day=>new Date(day+'T00:00:00Z').getUTCDay();

test('12-month preview is deterministic, respects daily limits and targets two-thirds videos',()=>{
  const settings=defaults(),a=generateCampaignYear('2026-12',settings),b=generateCampaignYear('2026-12',settings);
  assert.deepEqual(a,b);
  assert.equal(a.days.length,365);
  assert.ok(a.posts.length>500);
  for(const day of a.days){
    const limit=day.holiday?settings.limits.holiday:weekday(day.date)===5?settings.limits.friday:[0,6].includes(weekday(day.date))?settings.limits.weekend:settings.limits.weekday;
    assert.ok(day.count<=limit,day.date);
  }
  assert.ok(Math.abs(a.totals.videos/a.totals.posts-.67)<.005);
  assert.ok(a.totals.combined>0);
  assert.ok(a.posts.every(p=>p.status==='suggestion'&&p.size&&p.cta&&p.channels.length));
});

test('weather is a fixed Thursday/Friday/Saturday pattern and warns against stale forecasts',()=>{
  const a=generateCampaignYear('2026-12');
  const wx=a.posts.filter(p=>p.layerIds.includes('weather'));
  assert.ok(wx.length>=150);
  assert.deepEqual([...new Set(wx.map(p=>weekday(p.date)))].sort(),[4,5,6]);
  assert.ok(wx.every(p=>p.brief.includes('freshly verified marine forecast')));
});

test('layers and frequencies work independently with optional audience targeting',()=>{
  const config=defaults();
  config.layers.weather.weekly=0;config.layers.bait.enabled=false;config.layers.fish.audience.place=['local','regional'];
  const a=generateCampaignYear('2027-02',config);
  assert.ok(a.posts.every(p=>!p.layerIds.includes('weather')&&!p.layerIds.includes('bait')));
  assert.ok(a.posts.some(p=>p.layerIds.includes('fish')&&p.audience.place.includes('local')));
  config.layers.fish.visible=false;
  assert.deepEqual(a,generateCampaignYear('2027-02',config),'calendar display visibility must not delete suggestions');
});

test('holiday previews include the day-before prompt and intensify around the holidays',()=>{
  const y=generateCampaignYear('2026-12');
  assert.ok(y.posts.some(p=>p.date==='2027-03-25'&&p.layerIds.includes('holidays')) ||
    generateCampaignYear('2027-03').posts.some(p=>p.date==='2027-03-25'&&p.layerIds.includes('holidays')));
  assert.ok(y.days.some(d=>d.date==='2027-03-26'&&d.holiday));
  assert.ok(y.days.some(d=>d.date==='2027-04-12'&&!d.holiday));
});

test('settings validation refuses unknown fields, extra audiences and invalid values',()=>{
  const invalid=()=>{throw new Error('invalid');};
  assert.deepEqual(validateCampaignSettings(defaults(),invalid),defaults());
  for(const mutate of [
    s=>s.videoShare=101,
    s=>s.limits.friday=-1,
    s=>s.layers.weather.weekly=8,
    s=>s.layers.fish.audience.gender=['all','women'],
    s=>s.layers.fish.audience.place=['local','unknown'],
    s=>s.layers.unauthorised={}
  ]){const settings=defaults();mutate(settings);assert.throws(()=>validateCampaignSettings(settings,invalid));}
  assert.equal(CAMPAIGN_LAYERS.length,16);
});

test('NSW summer, autumn, winter and spring generate an independent smaller visitor wave',()=>{
  const year=generateCampaignYear('2027-01');
  const qldOnly=holidayInfluences('2027-03-29');
  const nswOnly=holidayInfluences('2027-04-19');
  const both=holidayInfluences('2027-07-06');
  const western=holidayInfluences('2027-02-01');
  assert.deepEqual([qldOnly.qld,qldOnly.nswEastern],[true,false]);
  assert.deepEqual([nswOnly.qld,nswOnly.nswEastern],[false,true]);
  assert.deepEqual([both.qld,both.nswEastern],[true,true]);
  assert.deepEqual([western.nswEastern,western.nswWestern],[false,true]);
  assert.ok(year.posts.some(p=>p.date>='2027-04-12'&&p.date<='2027-04-23'&&p.layerIds.includes('nswHolidays')));
  assert.ok(year.posts.some(p=>p.date==='2027-04-11'&&p.layerIds.includes('nswHolidays')),'NSW-specific lead-in is generated');
  assert.ok(year.posts.filter(p=>p.layerIds.includes('nswHolidays')).every(p=>p.audience.place.includes('tourist')));
  assert.ok(year.posts.filter(p=>p.layerIds.includes('weather')).every(p=>[4,5,6].includes(weekday(p.date))));
});
test('NSW holiday layer can be independently switched off without changing Queensland breaks',()=>{
  const cfg=defaults();cfg.layers.nswHolidays.enabled=false;
  const year=generateCampaignYear('2027-01',cfg);
  assert.equal(year.posts.filter(p=>p.layerIds.includes('nswHolidays')).length,0);
  assert.ok(year.posts.some(p=>p.date==='2027-03-25'&&p.layerIds.includes('holidays')));
  assert.ok(year.days.some(p=>p.date==='2027-04-12'&&p.nswHoliday&&!p.holiday));
});
