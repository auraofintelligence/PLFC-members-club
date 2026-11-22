import test from 'node:test';
import assert from 'node:assert/strict';
import { getTides } from '../worker/tides.mjs';

test('Sunday reference tides match the official Brisbane Bar CSV', () => {
  const tide = getTides('2026-11-22', 'point-lookout');
  assert.equal(tide.status, 'available');
  assert.equal(tide.station.name, 'Brisbane Bar');
  assert.equal(tide.station.referenceOnly, true);
  assert.deepEqual(tide.events, [
    { time: '2026-11-21T15:12:00.000Z', height: 0.38, type: 'low' },
    { time: '2026-11-21T21:29:00.000Z', height: 2.27, type: 'high' },
    { time: '2026-11-22T03:45:00.000Z', height: 0.63, type: 'low' },
    { time: '2026-11-22T09:25:00.000Z', height: 2.03, type: 'high' },
  ]);
  assert.match(tide.source.url, /q046046a_brisbane-bar_2026_hilo\.csv$/);
  assert.match(tide.source.licence, /Attribution 4\.0/);
  assert.match(tide.station.datum, /LAT/);
  assert.match(tide.notes[0], /not locally corrected/);
});

test('Tangalooma is a separately labelled official reference, with no station blending', () => {
  const tide = getTides('2026-11-22', 'tangalooma');
  assert.equal(tide.station.gaugeId, '101023');
  assert.equal(tide.events[0].time, '2026-11-21T14:45:00.000Z');
  assert.equal(tide.events[0].height, 0.4);
  assert.equal(tide.events[1].height, 2.12);
  assert.match(tide.source.url, /q101023_tangalooma-jetty_2026_hilo\.csv$/);
});

test('2027 predictions are supplied and other years are honestly unavailable', () => {
  const available = getTides('2027-01-01', 'amity');
  assert.equal(available.status, 'available');
  assert.equal(available.events[0].time, '2026-12-31T18:27:00.000Z');
  assert.equal(available.events[0].height, 1.98);
  assert.match(available.source.url, /2027_hilo\.csv$/);
  for (const date of ['2025-12-31', '2028-01-01']) {
    const missing = getTides(date, 'dunwich');
    assert.equal(missing.status, 'unavailable');
    assert.deepEqual(missing.events, []);
    assert.deepEqual(missing.curve, []);
  }
});

test('the schematic line has explicit provenance and stays between actual extrema', () => {
  const tide = getTides('2026-11-22', 'jumpinpin');
  assert.equal(tide.curve.length, 49);
  assert.match(tide.curveMethod, /schematic interpolation/);
  assert.ok(tide.curve.every(point => point.interpolated));
  assert.ok(tide.curve.every(point => point.height >= 0.38 && point.height <= 2.27));
  assert.equal(tide.curve[0].time, '2026-11-21T14:00:00.000Z');
  assert.equal(tide.curve.at(-1).time, '2026-11-22T14:00:00.000Z');
});

test('dataset edges are never extrapolated beyond the available predictions', () => {
  const first = getTides('2026-01-01', 'brisbane-bar');
  assert.ok(first.curve.every(point => point.time >= first.events[0].time));
  const last = getTides('2027-12-31', 'brisbane-bar');
  assert.ok(last.curve.every(point => point.time <= last.events.at(-1).time));
});

test('calendar dates and location keys are validated', () => {
  for (const date of ['2026-02-30', '2026-13-01', 'not-a-date', '', null]) assert.throws(() => getTides(date), RangeError);
  for (const location of ['somewhere', '__proto__', 'constructor']) assert.throws(() => getTides('2026-11-22', location), RangeError);
});
