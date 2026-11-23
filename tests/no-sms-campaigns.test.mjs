import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateCampaignYear} from '../public/social-campaign-engine.js';
import {noticeEmailReady} from '../worker/notice-email.mjs';

test('annual PLFC social campaigns have no SMS channel or automatic sending',()=>{
  const calendar=generateCampaignYear('2026-12');
  assert.ok(calendar.posts.length>0);
  assert.ok(calendar.posts.every(p=>p.status==='suggestion'));
  assert.ok(calendar.posts.every(p=>!p.channels.includes('sms')&&!p.destinations.includes('sms')));
  assert.ok(calendar.posts.every(p=>p.creativeVariants.every(v=>v.platform!=='sms')));
});

test('existing paused-SMS migrations remain intact',async()=>{
  const meeting=await readFile(new URL('../drizzle/0052_pause_meeting_sms.sql',import.meta.url),'utf8');
  const members=await readFile(new URL('../drizzle/0053_pause_member_sms.sql',import.meta.url),'utf8');
  assert.match(meeting,/WHERE channel='sms'/);
  assert.match(meeting,/SELECT 'email' AS channel/);
  assert.match(meeting,/UNION ALL SELECT 'chat'/);
  assert.match(members,/DELETE FROM member_delivery_queue WHERE channel='sms'/);
  assert.match(members,/UPDATE member_profiles SET pref_sms=0/);
});

test('email delivery is disabled in Preview even with provider credentials present',()=>{
  const env={ENVIRONMENT:'preview',OUTBOUND_ENABLED:'false',NOTICE_EMAIL_PROVIDER:'resend',RESEND_API_KEY:'fictional',NOTICE_EMAIL_FROM:'example@example.invalid'};
  assert.equal(noticeEmailReady(env),false);
  assert.equal(noticeEmailReady({...env,ENVIRONMENT:'production'}),false);
});
