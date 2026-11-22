import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import { getTripBrief } from '../public/fish-guide.js';
import {rigMethods} from '../public/rig-methods.js';
import {pelagicRigs} from '../public/pelagic-rigs.js';
import {rigStepPhotos} from '../public/rig-step-photos.js';

test('every rig assembly step has its own captioned, credited local picture', () => {
  for (const [method, rig] of Object.entries({...rigMethods, ...pelagicRigs})) {
    const pictures = rigStepPhotos[method];
    assert.equal(pictures?.length, rig.steps.length, method);
    assert.equal(new Set(pictures.map(picture => picture.src)).size, rig.steps.length, method);
    for (const picture of pictures) {
      assert.match(picture.src, /^\/assets\/.+\.webp$/);
      assert.ok(existsSync(new URL('../public' + picture.src, import.meta.url)), picture.src);
      for (const key of ['alt', 'caption', 'credit']) assert.ok(picture[key]?.trim(), method + ' ' + key);
    }
  }
});

test('each supported target has a sourced, illustrated setup for a matching outing', () => {
  const trips = {
    'sand-whiting': 'beach', 'yellowfin-bream': 'estuary', 'dusky-flathead': 'estuary',
    tailor: 'beach', snapper: 'boat', 'spanish-mackerel': 'boat', 'swallowtail-dart': 'beach', mulloway: 'beach',
  };
  for (const [target, method] of Object.entries(trips)) {
    const { setup } = getTripBrief({ date: '2026-11-22', method, target });
    assert.ok(setup, target);
    assert.match(setup.trace, /\d\s*(cm|m)\b/);
    assert.match(setup.trace, /\d\s*(lb|kg)\b/);
    for (const key of ['hook', 'image', 'presentation', 'adjust']) assert.ok(setup[key], target + ' ' + key);
    assert.ok(setup.sources.length > 0 && setup.sources.every(source => source.url.startsWith('https://')));
  }
});

test('a seasonal closure, review date or incompatible outing suppresses a targeted rig', () => {
  const trips = [
    { date: '2026-07-15', method: 'boat', target: 'snapper' },
    { date: '2027-02-01', method: 'boat', target: 'spanish-mackerel' },
    { date: '2028-01-01', method: 'boat', target: 'snapper' },
    { date: '2026-11-22', method: 'spearfishing', target: 'sand-whiting' },
    { date: '2026-11-22', method: 'beach', target: 'snapper' },
  ];
  for (const trip of trips) assert.equal(getTripBrief(trip).setup, null, JSON.stringify(trip));
});

const closures = brief => brief.ruleChecks.filter(check => check.level === 'closure');
const hasClosure = (brief, title) => closures(brief).some(check => check.title.includes(title));

test('snapper and pearl perch closure reminders include both published boundaries in 2026 and 2027', () => {
  for (const year of [2026, 2027]) {
    for (const target of ['snapper', 'pearl-perch']) {
      for (const day of ['07-15', '08-15']) {
        const brief = getTripBrief({ date: `${year}-${day}`, method: 'boat', target });
        assert.equal(hasClosure(brief, 'Snapper and pearl perch'), true, `${target} ${year}-${day}`);
        assert.match(closures(brief)[0].url, /^https:\/\/www\.dpi\.qld\.gov\.au\//);
        assert.match(closures(brief)[0].body, /Choose another target/);
      }
    }
  }
});

test('snapper and pearl perch reminders do not extend to 14 July or 16 August', () => {
  for (const year of [2026, 2027]) {
    for (const target of ['snapper', 'pearl-perch']) {
      for (const day of ['07-14', '08-16']) {
        assert.equal(hasClosure(getTripBrief({ date: `${year}-${day}`, method: 'boat', target }), 'Snapper and pearl perch'), false, `${target} ${year}-${day}`);
      }
    }
  }
});

test('southern Spanish mackerel reminders include 1 and 21 February and March in both reviewed years', () => {
  for (const year of [2026, 2027]) {
    for (const month of ['02', '03']) {
      for (const day of ['01', '21']) {
        const brief = getTripBrief({ date: `${year}-${month}-${day}`, method: 'boat', target: 'spanish-mackerel' });
        assert.equal(hasClosure(brief, 'Southern Spanish mackerel'), true, `${year}-${month}-${day}`);
        assert.match(closures(brief)[0].body, /Point Lookout is in the southern area/);
      }
    }
  }
});

test('southern Spanish mackerel reminders end after 21 February and March', () => {
  for (const year of [2026, 2027]) {
    for (const day of ['01-31', '02-22', '03-22', '04-01']) {
      assert.equal(hasClosure(getTripBrief({ date: `${year}-${day}`, target: 'spanish-mackerel' }), 'Southern Spanish mackerel'), false, `${year}-${day}`);
    }
  }
});

test('mixed targets receive the relevant closure while unrelated named targets retain general checks', () => {
  assert.equal(hasClosure(getTripBrief({ date: '2026-07-20', target: 'any' }), 'Snapper and pearl perch'), true);
  assert.equal(hasClosure(getTripBrief({ date: '2027-02-10', target: 'any' }), 'Southern Spanish mackerel'), true);
  const whiting = getTripBrief({ date: '2026-07-20', target: 'whiting' });
  assert.deepEqual(closures(whiting), []);
  assert.ok(whiting.ruleChecks.some(check => check.title === 'Check the exact fishing spot'));
  assert.ok(whiting.ruleChecks.some(check => check.title === 'Identify before you retain'));
});

test('2028 explicitly needs fresh rules review instead of silently reusing the seasonal assessment', () => {
  for (const target of ['snapper', 'spanish-mackerel', 'any']) {
    for (const date of ['2028-07-15', '2028-02-01']) {
      const brief = getTripBrief({ date, target });
      assert.ok(brief.ruleChecks.some(check => check.level === 'review' && check.title === 'This date needs a fresh rules check'));
      assert.deepEqual(closures(brief), []);
      assert.match(brief.validityNote, /2026 and 2027 only/);
      assert.match(brief.validityNote, /do not determine whether a trip, location or catch is lawful or safe/);
    }
  }
});

test('invalid dates request correction and never produce closure clearance', () => {
  for (const date of ['2026-02-30', '2026-02-29', '2026-13-01', '2026-7-15', 'not-a-date', '', null]) {
    const brief = getTripBrief({ date, target: 'snapper' });
    assert.ok(brief.ruleChecks.some(check => check.level === 'review' && check.title === 'Choose a valid trip date'), String(date));
    assert.deepEqual(closures(brief), []);
    assert.match(brief.summary, /Recheck the weather, location and official rules/);
  }
});

test('common fish aliases and normalised names select the intended target and closure checks', () => {
  const groups = [
    ['whiting', 'sand-whiting', ' Sand_Whiting '],
    ['bream', 'yellowfin-bream', ' BREAM '],
    ['flathead', 'dusky-flathead'],
    ['dart', 'swallowtail-dart'],
    ['mackerel', 'spaniard', 'spanish-mackerel', ' Spanish Mackerel '],
  ];
  for (const group of groups) {
    const expected = getTripBrief({ date: '2027-02-01', method: 'boat', target: group[0] });
    for (const target of group.slice(1)) {
      const actual = getTripBrief({ date: '2027-02-01', method: 'boat', target });
      assert.equal(actual.title, expected.title, target);
      assert.deepEqual(actual.targetTips, expected.targetTips, target);
      assert.deepEqual(closures(actual), closures(expected), target);
    }
  }
});

test('spearfishing provides diving and equipment guidance instead of line fishing bait or rigs', () => {
  for (const target of ['sand-whiting', 'snapper', 'spanish-mackerel']) {
    const spear = getTripBrief({ date: '2026-11-22', method: 'spearfishing', target });
    const line = getTripBrief({ date: '2026-11-22', method: 'boat', target });
    assert.match(spear.title, /^Spearfishing plan:/);
    assert.ok(spear.methodTips.some(tip => /experienced buddy/.test(tip)));
    assert.ok(spear.targetTips.every(tip => tip !== line.targetTips[0] && tip !== line.targetTips[1]));
    assert.ok(spear.targetTips.some(tip => /bait and rig suggestions.*for line fishing/.test(tip)));
    assert.ok(spear.ruleChecks.some(check => check.title === 'Check spearfishing access and equipment'));
    assert.ok(spear.sources.some(source => source.url.includes('/sharksmart/tips/spearfishing')));
  }
});

test('unsupported methods fall back safely without prototype-property access', () => {
  for (const method of ['unknown', '__proto__', 'constructor']) {
    const brief = getTripBrief({ date: '2026-11-22', method, target: 'whiting' });
    assert.match(brief.title, /^Beach plan:/);
    assert.ok(brief.methodTips.length > 0);
  }
});
