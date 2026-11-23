import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clubEventCandidates,meetingCandidates,parseAnnualCalendarCSV,importCalendarAnchors,
  mergeEventCandidates,importKey,validCalendarDate,surpriseDayItem
} from '../public/social-event-import.js';
import {renderCalendarImportPanel} from '../public/social-event-import-ui.js';
import {defaultCampaignSettings,generateCampaignYear,copyMonthSettings} from '../public/social-campaign-engine.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';
import {renderMonthCalendar,renderCalendarDialog} from '../public/social-visual-ui.js';

const invalid=()=>{throw Error('Invalid social planning settings');};
const esc=v=>String(v??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const id='b239f1d1-dedf-4403-aa19-fff36b9fa9c2';

test('club annual event run sheets and meetings import dates, never implying they are confirmed',()=>{
  const source=[
    {id,type:'local',title:'PLFC annual local fishing meet',date:'2027-03-05',status:'open',goal:'Community fishing day'},
    {id:'closed',title:'Closed event',date:'2027-05-01',status:'closed'},
    {id:'undated',title:'Undated planning sheet',date:'',status:'open'}
  ];
  const events=clubEventCandidates(source,'2026-11');
  assert.equal(events.length,2);
  assert.equal(events[0].kind,'event');
  assert.equal(events[1].inactive,true);
  assert.match(events[1].status,/Closed run sheet/);
  assert.match(events[0].origin,/run sheet/);
  assert.equal(events[0].status,'Planning run sheet');
  const meetings=meetingCandidates([{id:'meeting-2027',date:'2027-03-04',title:'PLFC quarterly meeting',status:'draft'}],'2026-11');
  assert.equal(meetings.length,1);
  assert.equal(meetings[0].kind,'meeting');
  assert.equal(importKey('event',id),events[0].id,'Stable source ID');
  const selected=[events[0].id,meetings[0].id];
  const result=importCalendarAnchors([],mergeEventCandidates(events,meetings),selected,[]);
  assert.equal(result.milestones.length,2);
  assert.ok(result.milestones.every(m=>!m.confirmed),'Event records alone never prove public promotional approval');
  const cfg=defaultCampaignSettings();cfg.milestones=result.milestones;
  validateCampaignSettings(cfg,invalid);
});

test('closing a source event cancels previously granted promotional verification on reimport',()=>{
  const id='event-close-123',open=clubEventCandidates([
    {id,title:'Proposed club fundraiser',date:'2027-03-06',status:'open'}
  ],'2026-11')[0];
  const saved=importCalendarAnchors([],[open],[open.id],[open.id]).milestones;
  const closed=clubEventCandidates([
    {id,title:'Proposed club fundraiser',date:'2027-03-06',status:'closed'}
  ],'2026-11')[0];
  const updated=importCalendarAnchors(saved,[closed],[closed.id],[closed.id]);
  assert.equal(updated.verificationReset,1);
  assert.equal(updated.milestones[0].confirmed,false);
  assert.equal(updated.milestones[0].date,'2027-03-06');
});

test('annual calendar CSV parses ordinary event and fishing season records, skipping invalid dates',()=>{
  const csv='title,date,type,id,notes\r\n"Island community festival",2027-04-01,event,festival27,Confirmed separately\r\n'+
    '"Fishing season closes",2027-05-15,season_close,season-end,Check QLD fisheries\r\n'+
    '"Impossible date",2027-02-31,event,bad,Never import\r\n';
  const result=parseAnnualCalendarCSV(csv,'2026-11');
  assert.equal(result.candidates.length,2);
  assert.deepEqual(result.invalidRows,[4]);
  assert.equal(result.candidates[1].kind,'season_close');
  assert.ok(result.candidates.every(row=>row.origin==='Annual calendar CSV'));
  assert.equal(validCalendarDate('2027-02-31'),false);
  assert.equal(validCalendarDate('2027-02-28'),true);
  assert.throws(()=>parseAnnualCalendarCSV('banana,orange\nx,y','2026-11'),/title and date/i);
});

test('import reviews are idempotent, reconfirm moved dates and retain manual milestones',()=>{
  const date='2027-03-05',source=clubEventCandidates([{id,title:'PLFC fishing day',date,status:'open'}],'2026-11');
  const manual={id:'m-season-note',kind:'season_open',title:'Verified fish season date',date:'2027-01-15',sourceUrl:'',confirmed:true};
  let merged=importCalendarAnchors([manual],source,[source[0].id],[source[0].id]);
  assert.equal(merged.added,1);
  assert.equal(merged.milestones.length,2);
  assert.equal(merged.milestones[0].title,manual.title);
  merged=importCalendarAnchors(merged.milestones,source,[source[0].id],[source[0].id]);
  assert.equal(merged.unchanged,1);
  const revised=clubEventCandidates([{id,title:'PLFC fishing day',date:'2027-03-12',status:'open'}],'2026-11');
  const unverified=importCalendarAnchors(merged.milestones,revised,[revised[0].id],[]);
  assert.equal(unverified.verificationReset,1);
  assert.equal(unverified.milestones.find(m=>m.id===source[0].id).confirmed,false);
  const verified=importCalendarAnchors(merged.milestones,revised,[revised[0].id],[revised[0].id]);
  assert.equal(verified.milestones.find(m=>m.id===source[0].id).confirmed,true,
    'A fresh explicit verification can approve the updated date');
  assert.equal(verified.verificationReset,0);
});

test('confirmed annual events create lead-ins, event-day ideas and cautious follow-ups',()=>{
  const cfg=defaultCampaignSettings(),date='2027-03-05';
  const source=clubEventCandidates([{id,title:'PLFC fishing day',date,status:'open'}],'2026-11');
  cfg.milestones=importCalendarAnchors([],source,[source[0].id],[source[0].id]).milestones;
  validateCampaignSettings(cfg,invalid);
  const plan=generateCampaignYear('2026-11',cfg),ideas=plan.posts.filter(p=>p.timingSignal?.targetDate===date);
  assert.ok(['lead','day','follow'].every(stage=>ideas.some(p=>p.timingSignal?.phase===stage)),
    'Lead-in, on-the-day and careful post-event follow-up are all generated');
  assert.ok(ideas.some(p=>p.timingSignal?.phase==='follow'&&/verif|confirm/i.test(p.brief)));
  assert.ok(plan.days.find(d=>d.date===date).eventAnchors.some(m=>m.confirmed));
  assert.ok(plan.posts.every(p=>p.status==='suggestion'),'Importing cannot approve or publish content');
  const day=renderCalendarDialog({day:date,view:'day',posts:plan.posts,plan,esc,getEdit:()=>({})});
  assert.match(day,/Committee annual event anchors/);
  assert.match(day,/PLFC fishing day/);
});

test('tentative imported dates show internal planning reminders and a labelled date without public claims',()=>{
  const cfg=defaultCampaignSettings(),date='2027-03-05';
  const source=clubEventCandidates([{id,title:'Potential celebrity guest appearance',date,status:'open'}],'2026-11');
  cfg.milestones=importCalendarAnchors([],source,[source[0].id],[]).milestones;
  const plan=generateCampaignYear('2026-11',cfg);
  const ideas=plan.posts.filter(p=>p.timingSignal?.targetDate===date);
  assert.ok(ideas.some(p=>p.timingSignal?.tentative&&/Internal draft only/.test(p.brief)));
  assert.ok(!ideas.some(p=>['day','follow'].includes(p.timingSignal?.phase)),
    'No confirmed day-of or results recap for tentative guest visits');
  const dateRow=plan.days.find(d=>d.date===date);
  assert.ok(dateRow.eventAnchors.length===1&&!dateRow.eventAnchors[0].confirmed);
  const preview=renderMonthCalendar({month:'2027-03',days:plan.days,
    posts:plan.posts.filter(p=>p.date.startsWith('2027-03')),esc,today:'2027-03-01'});
  assert.match(preview,/club event/);
  assert.match(preview,/planning only/);
});

test('saved day plans remain authoritative and whimsical additions are valid',()=>{
  const cfg=defaultCampaignSettings(),date='2027-03-05';
  const source=clubEventCandidates([{id,title:'PLFC fishing day',date,status:'open'}],'2026-11');
  cfg.milestones=importCalendarAnchors([],source,[source[0].id],[source[0].id]).milestones;
  const dayItem=surpriseDayItem(1);
  cfg.dayPlans[date]={patternId:'',items:[dayItem]};
  validateCampaignSettings(cfg,invalid);
  const first=generateCampaignYear('2026-11',cfg);
  const saved=first.posts.filter(p=>p.date===date);
  assert.equal(saved.length,1);
  assert.equal(saved[0].title,dayItem.title);
  assert.equal(saved[0].layerIds[0],'surprise');
  const month=copyMonthSettings(cfg);month.videoShare=100;month.layers.events.weekly=7;
  cfg.monthOverrides['2027-03']=month;
  const second=generateCampaignYear('2026-11',cfg).posts.filter(p=>p.date===date);
  assert.deepEqual(second,saved,'Bulk month adjustments never rewrite a curated day');
});

test('import UI requires an explicit review, verification and import action',()=>{
  const cfg=defaultCampaignSettings();
  const item=clubEventCandidates([{id,date:'2027-03-05',title:'PLFC local fishing day',status:'open'}],'2026-11')[0];
  const html=renderCalendarImportPanel({candidates:[item],selected:new Set([item.id]),
    verified:new Set(),milestones:cfg.milestones,reviewOnly:false,esc});
  assert.match(html,/data-events-fetch/);
  assert.match(html,/data-events-csv/);
  assert.match(html,/data-calendar-import-verify/);
  assert.match(html,/data-events-apply/);
  assert.match(html,/Tentative|Not yet imported/i);
  assert.doesNotMatch(html,/data-publish|automatic publication/);
  const review=renderCalendarImportPanel({candidates:[],selected:new Set(),verified:new Set(),
    milestones:[],reviewOnly:true,esc});
  assert.doesNotMatch(review,/data-events-fetch/);
  assert.match(review,/Private club calendars cannot be loaded/);
});
