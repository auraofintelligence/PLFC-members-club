import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderMonthCalendar} from '../public/social-visual-ui.js';
import {defaultCampaignSettings,generateCampaignYear} from '../public/social-campaign-engine.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
test('monthly calendar draws one icon for each post even when every topic icon repeats',()=>{
  const day='2026-12-25';
  const posts=Array.from({length:10},(_,i)=>({id:'p'+i,date:day,layerIds:['fish'],title:'Species tip '+(i+1)}));
  const html=renderMonthCalendar({month:'2026-12',days:[{date:day,publicHoliday:true,
    publicHolidayName:'Christmas Day',longWeekend:true}],posts,esc,today:'2026-12-23'});
  assert.equal((html.match(/class="annual-calendar-post-icon"/g)||[]).length,10);
  assert.equal((html.match(/🐟/g)||[]).length,10);
  assert.ok(html.includes('title="Species tip 10"'));
  assert.ok(html.includes('class="annual-cal-notation ph"'));
  assert.ok(html.includes('class="annual-cal-notation lw"'));
  assert.ok(html.includes('title="Christmas Day"'));
  assert.match(html,/aria-label="[^"]*10 planned posts[^"]*Christmas Day/);
});
test('public holidays have a separate PH badge; a non-PH long weekend shows LW alone',()=>{
  const days=[
    {date:'2027-08-07',publicHoliday:false,longWeekend:true},
    {date:'2027-08-09',publicHoliday:true,publicHolidayName:'Royal Queensland Show (City of Redland)',longWeekend:true},
    {date:'2027-08-11',publicHoliday:false,longWeekend:false}
  ];
  const html=renderMonthCalendar({month:'2027-08',days,posts:[],esc,today:'2027-08-01'});
  const cell=date=>html.match(new RegExp('<button[^>]*data-calendar-day="'+date+'"[\\s\\S]*?<\\/button>'))?.[0]||'';
  assert.ok(cell('2027-08-07').includes('annual-cal-notation lw'));
  assert.ok(!cell('2027-08-07').includes('annual-cal-notation ph'));
  assert.ok(cell('2027-08-09').includes('annual-cal-notation ph'));
  assert.ok(cell('2027-08-09').includes('Royal Queensland Show'));
  assert.ok(!cell('2027-08-11').includes('annual-cal-notation ph'));
});
test('calendar never clips post icons on narrow screens',()=>{
  const css=readFileSync(new URL('../public/social-campaigns.css',import.meta.url),'utf8');
  assert.match(css,/\.annual-calendar-icons\{display:flex;flex-wrap:wrap/);
  assert.doesNotMatch(css,/\.annual-calendar-icons span:nth-child\(n\+3\)\{display:none\}/);
  assert.match(css,/\.annual-cal-notation\.ph/);
});
test('real December holiday calendar displays one icon per generated idea',()=>{
  const settings=defaultCampaignSettings(),plan=generateCampaignYear('2026-11',settings);
  const posts=plan.posts.filter(p=>p.date.startsWith('2026-12'));
  const html=renderMonthCalendar({month:'2026-12',days:plan.days,posts,esc,today:'2026-12-20'});
  assert.equal((html.match(/class="annual-calendar-post-icon"/g)||[]).length,posts.length);
  assert.match(html,/class="annual-cal-notation ph"/);
});
