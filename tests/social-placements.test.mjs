import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATIVE_PRESETS,PUBLISHING_DESTINATIONS,creativeVariantsFor} from '../public/social-placements.js';
import {defaultCampaignSettings,generateCampaignYear} from '../public/social-campaign-engine.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';

test('Facebook Feed uses distinct organic and paid ad presets; 4:5 is not paid-only',()=>{
  const organic=CREATIVE_PRESETS.find(p=>p.id==='facebook-feed');
  const paid=CREATIVE_PRESETS.find(p=>p.id==='facebook-feed-ad');
  assert.deepEqual([organic.width,organic.height,organic.ratio,organic.distribution],[1080,1350,'4:5','organic']);
  assert.deepEqual([paid.width,paid.height,paid.ratio,paid.distribution],[1440,1800,'4:5','paid']);
  assert.ok(organic.note.includes('not a Facebook Feed requirement'));
});

test('video-first ideas yield multiple platform exports but do not create extra posts',()=>{
  const settings=defaultCampaignSettings();
  const calendar=generateCampaignYear('2027-03',settings),clip=calendar.posts.find(p=>p.durationSeconds===30);
  assert.ok(clip);
  const variants=clip.creativeVariants;
  assert.ok(variants.some(v=>v.id==='facebook-feed-ad'&&v.distribution==='paid'));
  assert.ok(variants.some(v=>v.id==='youtube-shorts'&&v.ratio==='9:16'));
  assert.ok(variants.some(v=>v.id==='youtube-instream-ad'&&v.ratio==='16:9'));
  assert.ok(variants.some(v=>v.id==='tiktok-infeed-ad'));
  assert.ok(variants.some(v=>v.id==='noticeboard-tv'&&v.provisional&&v.asset==='Still-image adaptation'));
  assert.ok(variants.some(v=>v.id==='noticeboard-kiosk-ad'&&v.provisional));
  assert.ok(!clip.channels.includes('noticeboard'),'the current PLFC social endpoint cannot publish to a noticeboard pilot');
  assert.equal(calendar.totals.posts,calendar.posts.length);
  assert.equal(PUBLISHING_DESTINATIONS.length,5);
});

test('paid exports and platforms can be independently disabled without suppressing an organic draft',()=>{
  const settings=defaultCampaignSettings();
  settings.delivery.paidPlanning=false;
  settings.delivery.organic=['facebook','noticeboard'];
  settings.delivery.paid=['youtube','facebook'];
  const post={durationSeconds:30};
  const variants=creativeVariantsFor(post,settings.delivery);
  assert.ok(variants.every(v=>v.distribution==='organic'));
  assert.deepEqual([...new Set(variants.map(v=>v.platform))],['facebook','noticeboard']);
  assert.ok(validateCampaignSettings(settings,()=>{throw new Error('invalid')}));
  const calendar=generateCampaignYear('2027-03',settings);
  assert.ok(calendar.posts.every(p=>p.channels.every(c=>c==='facebook')));
  settings.delivery.paid=['unknown'];
  assert.throws(()=>validateCampaignSettings(settings,()=>{throw new Error('invalid')}));
});

test('proposed Noticeboard uses still-only display exports rather than invented video capabilities',()=>{
  const placements=CREATIVE_PRESETS.filter(p=>p.platform==='noticeboard');
  assert.equal(placements.length,6);
  assert.ok(placements.every(p=>p.kind==='poster'&&p.provisional));
  assert.deepEqual([...new Set(placements.map(p=>p.placement.includes('kiosk')?'kiosk':p.placement.includes('landscape')||p.placement.includes('TV')?'tv':'web'))].sort(),['kiosk','tv','web']);
  const variant=creativeVariantsFor({durationSeconds:30},{organic:['noticeboard'],paid:['noticeboard'],paidPlanning:true});
  assert.ok(variant.every(v=>v.asset==='Still-image adaptation'&&v.provisional));
});
