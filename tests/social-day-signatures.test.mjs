import test from 'node:test';
import assert from 'node:assert/strict';
import {stampDayPlanSignatures,validateCampaignSettings} from '../worker/social-campaign-settings.mjs';
import {defaultCampaignSettings,generateCampaignYear} from '../public/social-campaign-engine.js';
import {renderDaySignature,signatureOfficer} from '../public/social-day-signatures.js';
import {renderMonthCalendar,renderCalendarDialog} from '../public/social-visual-ui.js';
import {renderItemisedDay,renderWeekItemised,mondayOf,nextDay} from '../public/social-day-ui.js';
import {BUILTIN_DAY_PATTERNS,planFromPattern} from '../public/social-day-patterns.js';

const clone=x=>structuredClone(x);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const invalid=()=>{throw Error('Invalid day-signature data');};
const date='2026-11-24';
const t1='2026-11-23T10:05:00.000Z';
const t2='2026-11-24T05:12:00.000Z';

test('first daily save is attributed to the authenticated officer, not untrusted browser fields',()=>{
  const c=defaultCampaignSettings(),start=defaultCampaignSettings();
  c.dayPlans[date]={...planFromPattern(BUILTIN_DAY_PATTERNS.weekday[0]),
    signature:{preparedBy:'Spoofed',preparedOffice:'President',preparedAt:t1,
      editedBy:'Spoofed',editedOffice:'President',editedAt:t1}};
  validateCampaignSettings(c,invalid);
  stampDayPlanSignatures(c,start,{name:'secretary',id:'account-sec',accountRole:'committee'},t1);
  assert.equal(c.dayPlans[date].signature.preparedOffice,'Secretary');
  assert.equal(c.dayPlans[date].signature.preparedBy,'secretary');
  assert.equal(c.dayPlans[date].signature.editedOffice,'Secretary');
  assert.notEqual(c.dayPlans[date].signature.preparedBy,'Spoofed');
});

test('monthly changes and signature tampering do not change who prepared a saved day',()=>{
  const saved=defaultCampaignSettings();
  saved.dayPlans[date]=planFromPattern(BUILTIN_DAY_PATTERNS.weekday[0]);
  stampDayPlanSignatures(saved,defaultCampaignSettings(),{name:'secretary'},t1);
  const update=clone(saved);
  update.videoShare=30;
  update.dayPlans[date].signature.preparedOffice='Forged office';
  stampDayPlanSignatures(update,saved,{name:'president'},t2);
  assert.deepEqual(update.dayPlans[date].signature,saved.dayPlans[date].signature);
});

test('later edits record the new editor without replacing the original preparer',()=>{
  const prior=defaultCampaignSettings();
  prior.dayPlans[date]=planFromPattern(BUILTIN_DAY_PATTERNS.weekday[0]);
  stampDayPlanSignatures(prior,defaultCampaignSettings(),{name:'secretary'},t1);
  const revised=clone(prior);
  revised.dayPlans[date].items[0].title='Revised PLFC community tip';
  stampDayPlanSignatures(revised,prior,{name:'assistantsecretary'},t2);
  const sig=revised.dayPlans[date].signature;
  assert.equal(sig.preparedOffice,'Secretary');
  assert.equal(sig.preparedAt,t1);
  assert.equal(sig.editedOffice,'Assistant Secretary');
  assert.equal(sig.editedAt,t2);
  validateCampaignSettings(revised,invalid);
  const calendar=generateCampaignYear('2026-11',revised);
  const info=calendar.days.find(day=>day.date===date);
  assert.deepEqual(info.signature,sig);
  const monthPosts=calendar.posts.filter(p=>p.date.startsWith('2026-11'));
  const month=renderMonthCalendar({month:'2026-11',days:calendar.days,posts:monthPosts,esc,today:date});
  assert.match(month,/annual-calendar-signed/);
  assert.match(month,/Prepared by Secretary/i);
  const popup=renderCalendarDialog({day:date,view:'day',posts:calendar.posts,
    plan:calendar,esc,getEdit:()=>({})});
  assert.match(popup,/Prepared by Secretary/);
  assert.match(popup,/Last edited by Assistant Secretary/);
  assert.match(popup,/Speak with this office holder/);
  const daily=renderItemisedDay({day:date,type:'weekday',dayPlan:revised.dayPlans[date],
    savedPatterns:{},layers:[{id:'fish',label:'Fish'}],esc});
  assert.match(daily,/Prepared by Secretary/);
  const monday=mondayOf(date);
  const weekly=renderWeekItemised({day:date,startDate:monday,esc,savedPatterns:{},
    dates:Array.from({length:7},(_,i)=>{
      const d=nextDay(monday,i),plan=revised.dayPlans[d];
      return {date:d,type:'weekday',inside:true,items:plan?.items||[],curated:Boolean(plan),
        signature:plan?.signature||null,patternId:plan?.patternId||''};
    })});
  assert.match(weekly,/annual-week-owner/);
  assert.match(weekly,/Secretary/);
});

test('generated suggestions have no falsely assigned officer signature',()=>{
  const plan=generateCampaignYear('2026-11');
  assert.ok(plan.days.every(day=>!day.signature));
  assert.equal(renderDaySignature(null,esc,true),'');
  assert.match(renderDaySignature(null,esc,false),/No office holder has signed this day yet/);
  assert.equal(signatureOfficer({preparedOffice:'Secretary',preparedBy:'secretary'}),'Secretary');
});
