import test from 'node:test';
import assert from 'node:assert/strict';
import {DAY_TYPES,BUILTIN_DAY_PATTERNS,DAY_ARCHETYPE_LABELS,allDayPresets,
  patternFor,planFromPattern,planFromPosts,newDaySlot,validSlot} from '../public/social-day-patterns.js';
import {renderItemisedDay,renderWeekItemised,mondayOf,nextDay} from '../public/social-day-ui.js';
import {CAMPAIGN_LAYERS,defaultCampaignSettings,generateCampaignYear,copyMonthSettings,dayPostingBounds} from '../public/social-campaign-engine.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const invalid=()=>{throw new Error('Invalid custom day plan');};

test('each day archetype offers multiple short presets, and officers may save named versions',()=>{
  const settings=defaultCampaignSettings();
  assert.equal(DAY_TYPES.length,6);
  for(const type of DAY_TYPES){
    assert.ok(BUILTIN_DAY_PATTERNS[type].length>=2&&BUILTIN_DAY_PATTERNS[type].length<=3,type);
    for(const template of BUILTIN_DAY_PATTERNS[type]){
      assert.ok(template.items.length>=1&&template.items.length<=12);
      assert.ok(template.items.every(validSlot));
      assert.equal(planFromPattern(template).items.length,template.items.length);
    }
  }
  const custom={id:'custom-abc12345',name:'Community-first weekday',items:[newDaySlot(1)]};
  settings.dayArchetypes.weekday=[custom];
  assert.equal(allDayPresets('weekday',settings.dayArchetypes).at(-1).id,custom.id);
  assert.equal(patternFor('weekday',custom.id,settings.dayArchetypes).name,custom.name);
  validateCampaignSettings(settings,invalid);
});

test('Day is pure item-by-item, Week is seven day archetypes, and neither contains monthly sliders',()=>{
  const settings=defaultCampaignSettings(),day='2026-11-24',type=dayPostingBounds(day,settings.limits).category;
  const plan=planFromPattern(BUILTIN_DAY_PATTERNS[type][1]);
  const daily=renderItemisedDay({day,type,dayPlan:plan,savedPatterns:settings.dayArchetypes,
    layers:CAMPAIGN_LAYERS,esc});
  assert.match(daily,/data-day-editor="2026-11-24"/);
  for(const field of ['time','layerId','format','title','brief'])assert.ok(daily.includes('data-day-item-field="'+field+'"'));
  for(const action of ['data-day-add-item','data-day-remove-item','data-day-save','data-day-reset','data-day-save-pattern'])
    assert.ok(daily.includes(action),action);
  assert.doesNotMatch(daily,/type="range"|annual-limit-pair|annual-day-limit-grid/);
  const monday=mondayOf(day),days=Array.from({length:7},(_,index)=>({
    date:nextDay(monday,index),type:'weekday',inside:true,curated:false,items:[newDaySlot(1)]
  }));
  const weekly=renderWeekItemised({day,startDate:monday,dates:days,savedPatterns:settings.dayArchetypes,esc});
  assert.equal((weekly.match(/class="annual-week-day"/g)||[]).length,7);
  assert.equal((weekly.match(/data-week-pattern="/g)||[]).length,7);
  for(const action of ['data-week-apply','data-week-edit','data-week-fill','data-week-save'])
    assert.ok(weekly.includes(action),action);
  assert.doesNotMatch(weekly,/type="range"|annual-limit-pair|annual-day-limit-grid/);
});

test('Curated day replaces suggestions; month limits, formats and video ratios cannot overwrite it',()=>{
  const settings=defaultCampaignSettings(),day='2026-11-24';
  const original=generateCampaignYear('2026-11',settings);
  const posts=original.posts.filter(post=>post.date===day);
  assert.ok(posts.length>0);
  const plan=planFromPosts(posts);
  plan.items[0].time='07:35';plan.items[0].title='Custom PLFC verified story';
  plan.items[0].brief='Specific club-edited content awaiting approval.';
  plan.items[0].format='video';
  settings.dayPlans[day]=plan;
  validateCampaignSettings(settings,invalid);
  const year=generateCampaignYear('2026-11',settings);
  const chosen=year.posts.filter(post=>post.date===day);
  assert.equal(chosen.length,plan.items.length);
  assert.ok(chosen.every(post=>post.curated));
  assert.equal(chosen[0].suggestedTime,'07:35');
  assert.equal(chosen[0].title,'Custom PLFC verified story');
  assert.equal(chosen[0].durationSeconds,30);
  const prior=structuredClone(chosen);
  const month=copyMonthSettings(settings);
  month.videoShare=0;month.limits.weekdayMin=3;month.limits.weekday=4;month.layers.fish.weekly=0;
  settings.monthOverrides['2026-11']=month;
  validateCampaignSettings(settings,invalid);
  assert.deepEqual(generateCampaignYear('2026-11',settings).posts.filter(post=>post.date===day),prior);
  const adjacent=generateCampaignYear('2026-11',settings).days.find(d=>d.date==='2026-11-25');
  assert.ok(adjacent.count>=3,'uncurated Wednesday follows the monthly minimum');
});

test('Invalid manual daily posts and invented fields fail before shared committee save',()=>{
  const settings=defaultCampaignSettings();
  const wrong=[
    {patternId:'',items:[]},
    {patternId:'',items:[{...newDaySlot(1),time:'25:00'}]},
    {patternId:'',items:[{...newDaySlot(1),title:''}]},
    {patternId:'',items:[{...newDaySlot(1),unknown:'x'}]}
  ];
  for(const plan of wrong){
    const candidate=structuredClone(settings);
    candidate.dayPlans['2026-11-24']=plan;
    assert.throws(()=>validateCampaignSettings(candidate,invalid));
  }
  const custom=structuredClone(settings);
  custom.dayArchetypes.weekday=[{id:'custom-ok1234',name:'A weekday pattern',items:[newDaySlot(1)]}];
  validateCampaignSettings(custom,invalid);
});
