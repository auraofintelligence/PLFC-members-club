import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCampaignSettings,copyMonthSettings,monthSettingsFor,generateCampaignYear} from '../public/social-campaign-engine.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';

const invalid=()=>{throw Error('invalid monthly campaign');};
const monthly=(base,month)=>{const snapshot=copyMonthSettings(base);base.monthOverrides[month]=snapshot;return snapshot;};
test('applied monthly batch changes only that month, keeping other holiday and weather patterns intact',()=>{
  const base=defaultCampaignSettings(),before=generateCampaignYear('2027-01',base),april=monthly(base,'2027-04');
  april.videoShare=100;april.layers.weather.weekly=0;april.limits.weekdayMin=1;april.limits.weekday=1;
  validateCampaignSettings(base,invalid);
  const changed=generateCampaignYear('2027-01',base);
  const apr=changed.posts.filter(p=>p.date.startsWith('2027-04'));
  assert.ok(apr.length>0);
  assert.equal(apr.filter(p=>p.durationSeconds===30).length,apr.length);
  assert.ok(apr.every(p=>!p.layerIds.includes('weather')));
  assert.deepEqual(changed.posts.filter(p=>p.date.startsWith('2027-03')),before.posts.filter(p=>p.date.startsWith('2027-03')));
  assert.deepEqual(changed.posts.filter(p=>p.date.startsWith('2027-05')),before.posts.filter(p=>p.date.startsWith('2027-05')));
  assert.equal(monthSettingsFor(base,'2027-03'),base);
  assert.equal(monthSettingsFor(base,'2027-04'),april);
});
test('independent audience and destinations can be adjusted for one month in a batch',()=>{
  const base=defaultCampaignSettings(),july=monthly(base,'2027-07');
  july.layers.fish.audience.place=['tourist'];july.layers.fish.weekly=7;
  july.delivery.organic=['youtube','facebook'];july.delivery.paidPlanning=false;
  const plan=generateCampaignYear('2027-06',base);
  assert.ok(plan.posts.filter(p=>p.date.startsWith('2027-07')&&p.layerIds.includes('fish')).every(p=>p.audience.place.includes('tourist')));
  assert.ok(plan.posts.filter(p=>p.date.startsWith('2027-07')).every(p=>p.creativeVariants.every(v=>v.distribution==='organic'&&['youtube','facebook'].includes(v.platform))));
  assert.ok(plan.posts.filter(p=>p.date.startsWith('2027-06')).some(p=>p.creativeVariants.some(v=>v.distribution==='paid')));
});
test('monthly overrides allow copy-to-next-month while preserving the original annual settings',()=>{
  const base=defaultCampaignSettings(),january=monthly(base,'2027-01');
  january.videoShare=85;january.layers.fundraisers.weekly=5;
  const feb=copyMonthSettings(january);
  base.monthOverrides['2027-02']=feb;
  feb.layers.fundraisers.weekly=2;
  assert.equal(base.monthOverrides['2027-01'].layers.fundraisers.weekly,5);
  assert.equal(base.monthOverrides['2027-02'].layers.fundraisers.weekly,2);
  assert.equal(base.layers.fundraisers.weekly,2);
  assert.equal(base.monthOverrides['2027-02'].videoShare,85);
});
test('monthly override validator rejects unknown months, nested overrides and bad audiences',()=>{
  const config=defaultCampaignSettings();
  for(const edit of [
    c=>{c.monthOverrides['2027-13']=copyMonthSettings(c);},
    c=>{c.monthOverrides['2027-04']={...copyMonthSettings(c),monthOverrides:{}};},
    c=>{c.monthOverrides['2027-04']=copyMonthSettings(c);c.monthOverrides['2027-04'].layers.fish.audience.gender=['all','women'];},
    c=>{for(let n=0;n<25;n++){const month=new Date(Date.UTC(2027,n,1)).toISOString().slice(0,7);c.monthOverrides[month]=copyMonthSettings(c);}}
  ]){const item=structuredClone(config);edit(item);assert.throws(()=>validateCampaignSettings(item,invalid));}
});
