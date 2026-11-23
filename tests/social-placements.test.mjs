import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATIVE_PRESETS,PUBLISHING_DESTINATIONS,MASTER_ASSET_PRESETS,CREATIVE_SPEC_VERSION,creativeVariantsFor} from '../public/social-placements.js';
import {defaultCampaignSettings,generateCampaignYear} from '../public/social-campaign-engine.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';

test('Facebook Feed uses distinct organic and paid ad presets; 4:5 is not paid-only',()=>{
  const organic=CREATIVE_PRESETS.find(p=>p.id==='facebook-feed');
  const paid=CREATIVE_PRESETS.find(p=>p.id==='facebook-feed-ad');
  assert.deepEqual([organic.width,organic.height,organic.ratio,organic.distribution],[1080,1350,'4:5','organic']);
  assert.deepEqual([paid.width,paid.height,paid.ratio,paid.distribution],[1440,1800,'4:5','paid']);
  assert.ok(organic.note.includes('not a mandatory'));
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


test('Instagram Feed photo ads and video ads remain different technical export presets',()=>{
  const image=CREATIVE_PRESETS.find(p=>p.id==='instagram-feed-image-ad');
  const video=CREATIVE_PRESETS.find(p=>p.id==='instagram-feed-video-ad');
  assert.deepEqual([image.width,image.height,image.ratio,image.kind],[1440,1800,'4:5','image']);
  assert.deepEqual([video.width,video.height,video.ratio,video.kind],[1080,1920,'9:16','video']);
  const organic=CREATIVE_PRESETS.find(p=>p.id==='instagram-photo-3x4');
  assert.deepEqual([organic.width,organic.height,organic.ratio],[1080,1440,'3:4']);
  const videoVariants=creativeVariantsFor({durationSeconds:30},{organic:[],paid:['instagram'],paidPlanning:true});
  assert.ok(videoVariants.some(v=>v.id==='instagram-feed-video-ad'));
  assert.ok(!videoVariants.some(v=>v.id==='instagram-feed-image-ad'));
  const imageVariants=creativeVariantsFor({durationSeconds:null},{organic:[],paid:['instagram'],paidPlanning:true});
  assert.ok(imageVariants.some(v=>v.id==='instagram-feed-image-ad'));
  assert.ok(!imageVariants.some(v=>v.id==='instagram-feed-video-ad'));
});

test('TikTok organic slides and paid Standard Carousel use different image dimensions',()=>{
  const organic=CREATIVE_PRESETS.find(p=>p.id==='tiktok-carousel');
  const paid=CREATIVE_PRESETS.find(p=>p.id==='tiktok-standard-carousel-ad');
  assert.deepEqual([organic.width,organic.height,organic.ratio],[1080,1920,'9:16']);
  assert.deepEqual([paid.width,paid.height,paid.ratio],[720,1280,'9:16']);
  assert.equal(paid.carousel.min,2);assert.equal(paid.carousel.max,35);
  const imageVariants=creativeVariantsFor({durationSeconds:null},{organic:['tiktok'],paid:['tiktok'],paidPlanning:true});
  assert.ok(imageVariants.some(v=>v.id==='tiktok-standard-carousel-ad'&&v.carousel.requiresMusic));
});

test('versioned master-asset library and video production QA carry through to each export',()=>{
  assert.equal(CREATIVE_SPEC_VERSION.id,'2026-11-23.2');
  assert.equal(MASTER_ASSET_PRESETS.length,8);
  const thumbnail=MASTER_ASSET_PRESETS.find(p=>p.id==='youtube-video-thumbnail');
  assert.deepEqual([thumbnail.width,thumbnail.height],[3840,2160]);
  const variants=creativeVariantsFor({durationSeconds:30},{organic:['youtube'],paid:['facebook'],paidPlanning:true});
  const short=variants.find(v=>v.id==='youtube-shorts');
  assert.equal(short.maximumDurationSeconds,180);
  assert.deepEqual([short.thumbnail.width,short.thumbnail.height],[2160,3840]);
  assert.ok(short.checklist.includes('Captions/subtitles'));
  const paid=variants.find(v=>v.id==='facebook-reels-ad');
  assert.deepEqual([paid.safeZone.topPercent,paid.safeZone.bottomPercent,paid.safeZone.sidePercent],[14,35,6]);
  assert.ok(paid.safeZone.topPixels>0&&paid.safeZone.bottomPixels>0);
  assert.ok(paid.approval.includes('budget'));
  assert.equal(paid.specVersion,CREATIVE_SPEC_VERSION.id);
});
