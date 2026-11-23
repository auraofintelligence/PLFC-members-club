import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAssetGuide,renderDestinationChoices} from '../public/social-format-guide.js';
import {MASTER_ASSET_PRESETS,PUBLISHING_DESTINATIONS} from '../public/social-placements.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
test('production formats use realistic aspect ratios and labelled master sizes',()=>{
  const html=renderAssetGuide({presets:MASTER_ASSET_PRESETS,esc,version:'test'});
  assert.equal((html.match(/class="annual-format-card"/g)||[]).length,5);
  for(const ratio of ['9/16','4/5','3/4','1/1','16/9'])assert.ok(html.includes('aspect-ratio:'+ratio));
  assert.ok(html.includes('1080 × 1920'));
  assert.ok(html.includes('1920 × 1080'));
  assert.match(html,/not platform upload requirements/);
});
test('SNN is linked to the public project, not a live posting account',()=>{
  const html=renderDestinationChoices({destinations:PUBLISHING_DESTINATIONS,selected:['facebook','noticeboard'],
    mode:'organic',prefix:'data-month-destination',esc});
  assert.ok(html.includes('Open public SNN site'));
  assert.ok(html.includes('https://straddie-noticeboard-cloudflare.auraofintelligence.workers.dev/'));
  assert.ok(html.includes('data-month-destination="organic" value="noticeboard" checked'));
  assert.ok(html.includes('Proposed'));
  assert.equal(PUBLISHING_DESTINATIONS.find(x=>x.id==='noticeboard').status,'proposed');
});
