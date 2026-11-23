import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCampaignSettings,generateCampaignYear,copyMonthSettings,weekStart} from '../public/social-campaign-engine.js';
import {renderMonthCalendar,renderCalendarDialog} from '../public/social-visual-ui.js';
import {parseDelimited,suggestedMapping,metricFromRow,linkMetrics,latestMetrics,summarizeMetrics,compareContentPatterns,planMetricsCSV}
  from '../public/social-performance.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';
const invalid=()=>{throw Error('Invalid campaign settings');};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
test('every calendar day has at least one idea, including Monday to Wednesday',()=>{
  const plan=generateCampaignYear('2026-11');
  assert.equal(plan.days.length,365);
  assert.ok(plan.days.every(day=>day.count>=1));
  assert.ok(plan.days.filter(day=>new Date(day.date+'T00:00:00Z').getUTCDay()>=1&&
    new Date(day.date+'T00:00:00Z').getUTCDay()<=3).every(day=>day.count>=1));
  const november=plan.days.filter(day=>day.date.startsWith('2026-11'));
  assert.equal(november.length,30);
  const calendar=renderMonthCalendar({month:'2026-11',days:plan.days,
    posts:plan.posts.filter(post=>post.date.startsWith('2026-11')),today:'2026-11-23',esc});
  assert.equal((calendar.match(/data-calendar-day=/g)||[]).length,30);
  assert.equal((calendar.match(/annual-calendar-week-total/g)||[]).length,6);
  assert.match(calendar,/aria-current="date"/);
  assert.match(calendar,/annual-calendar-day past/);
  assert.match(calendar,/annual-calendar-day future/);
});
test('day, week and month timing overrides are independent and time-precise',()=>{
  const c=defaultCampaignSettings(),date='2026-11-23';
  const month=copyMonthSettings(c);month.postingTime='06:55';
  c.monthOverrides['2026-11']=month;
  const week=copyMonthSettings(c);week.postingTime='09:11';
  c.weekOverrides[weekStart(date)]=week;
  const day=copyMonthSettings(c);day.postingTime='07:35';
  c.dayOverrides[date]=day;
  validateCampaignSettings(c,invalid);
  const plan=generateCampaignYear('2026-11',c);
  assert.ok(plan.posts.some(p=>p.date===date&&p.suggestedTime==='07:35'));
  assert.ok(plan.posts.some(p=>p.date==='2026-11-24'&&p.suggestedTime==='09:11'));
  assert.ok(plan.posts.some(p=>p.date==='2026-11-16'&&p.suggestedTime==='06:55'));
  const post=plan.posts.find(p=>p.date===date);
  const dialog=renderCalendarDialog({day:date,view:'edit',postId:post.id,posts:plan.posts,
    plan,esc,getEdit:()=>({time:'18:12'})});
  assert.match(dialog,/data-post-time/);
  assert.match(dialog,/18:12/);
  assert.match(dialog,/data-calendar-hour/);
  assert.match(dialog,/data-calendar-time-preset/);
});
test('holiday seeding and confirmed milestones create configurable lead-in suggestions',()=>{
  const c=defaultCampaignSettings();
  c.limits={weekday:8,friday:8,weekend:8,holiday:8};
  c.timingSignals.holidays.leadDays=[14,7];
  c.milestones=[{id:'m-fake-event1',kind:'event',title:'Fictional tested event',date:'2027-02-20',sourceUrl:'https://example.org/test',confirmed:false}];
  let year=generateCampaignYear('2027-01',c);
  assert.ok(year.posts.some(p=>p.timingSignal?.kind==='holidays'&&p.timingSignal?.leadDays===14));
  assert.ok(!year.posts.some(p=>p.timingSignal?.title==='Fictional tested event'));
  c.milestones[0].confirmed=true;
  year=generateCampaignYear('2027-01',c);
  assert.ok(year.posts.some(p=>p.timingSignal?.kind==='event'&&p.timingSignal?.targetDate==='2027-02-20'));
  c.timingSignals.event.enabled=false;
  year=generateCampaignYear('2027-01',c);
  assert.ok(!year.posts.some(p=>p.timingSignal?.kind==='event'));
});
test('timing rules reject impossible dates, bad leads and invented fields',()=>{
  const c=defaultCampaignSettings();
  c.timingSignals.holidays.leadDays=[14,14];
  assert.throws(()=>validateCampaignSettings(c,invalid));
  c.timingSignals.holidays.leadDays=[14];
  c.milestones=[{id:'m-invalid01',kind:'season_open',title:'Test open season',date:'2027-02-30',sourceUrl:'',confirmed:true}];
  assert.throws(()=>validateCampaignSettings(c,invalid));
});
test('platform CSV imports are mapped deliberately; content and metrics export together',()=>{
  const c=defaultCampaignSettings(),plan=generateCampaignYear('2026-11',c);
  const first=plan.posts[0],second=plan.posts[1];
  const csv='Post ID,Post URL,Views,Likes,Comments,Shares\n"platform-100","https://example.org/a","1,240",12,4,3\n"platform-101","https://example.org/b","2,340",31,9,6';
  const parsed=parseDelimited(csv),mapping=suggestedMapping(parsed.headers);
  const raw=parsed.rows.map((row,i)=>({...metricFromRow(row,mapping,{
    platform:'facebook',filename:'platform.csv',importedAt:'2026-11-23T00:00:00Z'}),id:'row-'+i}));
  assert.equal(raw[0].views,1240);
  assert.equal(linkMetrics(raw,plan.posts,{})[0].matchedPostId,'');
  const edits={
    [first.id]:{externalRefs:[{platform:'facebook',externalId:'platform-100',postUrl:'https://example.org/a'}]},
    [second.id]:{externalRefs:[{platform:'facebook',externalId:'platform-101',postUrl:'https://example.org/b'}]}
  };
  const matched=linkMetrics(raw,plan.posts,edits);
  assert.equal(matched[0].matchedPostId,first.id);
  assert.equal(matched[1].matchedPostId,second.id);
  const totals=summarizeMetrics(matched,[first,second]);
  assert.equal(totals[0].views,3580);
  const insights=compareContentPatterns(matched,[first,second]);
  assert.ok(Array.isArray(insights));
  const exportText=planMetricsCSV([first,second],edits,matched);
  for(const field of ['plfc_post_id','time_AEST','brief','storyboard','external_post_id','views'])assert.ok(exportText.includes(field));
  assert.ok(exportText.includes('1240'));
  assert.equal(latestMetrics(matched).length,2);
});
