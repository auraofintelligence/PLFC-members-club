import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDaySignals} from '../public/social-holiday-calendar.js';
import {POSTING_DAY_TYPES,defaultCampaignSettings,copyMonthSettings,normaliseDailyLimits,
  dayPostingBounds,generateCampaignYear} from '../public/social-campaign-engine.js';
import {validateCampaignSettings} from '../worker/social-campaign-settings.mjs';

const fail=()=>{throw Error('invalid posting limits');};
test('Queensland and Redland public holidays correctly identify long-weekend spans',()=>{
  assert.equal(calendarDaySignals('2027-08-09').publicHolidayName,'Royal Queensland Show (City of Redland)');
  assert.equal(calendarDaySignals('2027-08-11').publicHoliday,false,'Brisbane Ekka day is not a Redland public holiday');
  assert.equal(calendarDaySignals('2026-08-10').redlandShowHoliday,true);
  assert.equal(calendarDaySignals('2027-08-07').longWeekend,true);
  assert.equal(calendarDaySignals('2027-08-08').longWeekend,true);
  assert.equal(calendarDaySignals('2027-08-09').longWeekend,true);
  assert.equal(calendarDaySignals('2027-03-26').publicHoliday,true,'Good Friday');
  assert.equal(calendarDaySignals('2027-03-27').longWeekend,true,'Easter Saturday');
  assert.equal(calendarDaySignals('2027-03-29').longWeekend,true,'Easter Monday');
  assert.equal(calendarDaySignals('2026-12-24').publicHoliday,false,'Christmas Eve is a part-day evening holiday');
  assert.match(calendarDaySignals('2026-12-24').partialPublicHoliday,/6 pm/);
  assert.equal(calendarDaySignals('2028-08-14').redlandShowHoliday,false,'2028 show day not yet appointed');
});
test('post controls use six independent min-max day types, with explicit priority on overlaps',()=>{
  const settings=defaultCampaignSettings();
  assert.deepEqual(POSTING_DAY_TYPES.map(day=>day.id),
    ['weekday','friday','weekend','longWeekend','publicHoliday','holiday']);
  assert.equal(dayPostingBounds('2026-11-23',settings.limits).category,'weekday');
  assert.equal(dayPostingBounds('2026-11-27',settings.limits).category,'friday');
  assert.equal(dayPostingBounds('2026-11-28',settings.limits).category,'weekend');
  assert.equal(dayPostingBounds('2026-12-20',settings.limits).category,'holiday');
  assert.equal(dayPostingBounds('2027-04-24',settings.limits).category,'longWeekend');
  assert.equal(dayPostingBounds('2027-03-26',settings.limits).category,'publicHoliday');
  assert.equal(dayPostingBounds('2027-08-09',settings.limits).category,'publicHoliday');
  validateCampaignSettings(settings,fail);
});
test('each posting category meets its minimum and maximum, including overridden months',()=>{
  const settings=defaultCampaignSettings();
  for(const type of POSTING_DAY_TYPES){
    settings.limits[type.id+'Min']=type.id==='weekday'?3:2;
    settings.limits[type.id]=type.id==='weekday'?3:4;
  }
  const feb=copyMonthSettings(settings);
  feb.limits.weekdayMin=1;feb.limits.weekday=1;
  settings.monthOverrides['2027-02']=feb;
  validateCampaignSettings(settings,fail);
  const year=generateCampaignYear('2026-11',settings);
  assert.ok(year.days.every(day=>day.count>=day.minimum && day.count<=day.maximum),
    'Every day honours the selected day-type interval');
  assert.ok(year.days.filter(day=>day.date.startsWith('2027-02')&&day.postingCategory==='weekday')
    .every(day=>day.count===1),'February has a separate weekday range');
  assert.ok(year.days.filter(day=>day.date.startsWith('2026-11')&&day.postingCategory==='weekday')
    .every(day=>day.count===3),'Non-overridden weekdays keep their three-post minimum');
  assert.equal(new Set(year.posts.map(post=>post.id)).size,year.posts.length,'No duplicate suggestion IDs');
});
test('invalid range values are rejected while older limits load with new default types',()=>{
  const current=defaultCampaignSettings();
  current.limits.weekendMin=5;current.limits.weekend=4;
  assert.throws(()=>validateCampaignSettings(current,fail));
  current.limits.weekend=5;current.limits.weekdayMin=0;
  assert.throws(()=>validateCampaignSettings(current,fail));
  const old=defaultCampaignSettings();
  old.limits={weekday:2,friday:3,weekend:4,holiday:5};
  old.monthOverrides['2027-04']={...copyMonthSettings(defaultCampaignSettings()),
    limits:{weekday:2,friday:3,weekend:4,holiday:5}};
  validateCampaignSettings(old,fail);
  assert.equal(old.limits.weekdayMin,1);
  assert.equal(old.limits.weekday,4,'Legacy unchosen weekday ceiling of 2 is superseded');
  assert.equal(old.monthOverrides['2027-04'].limits.publicHolidayMin,2);
  assert.equal(normaliseDailyLimits({weekday:2,friday:3,weekend:4,holiday:5}).weekday,4);
});
