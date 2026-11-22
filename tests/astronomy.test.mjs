import assert from 'node:assert/strict';
import test from 'node:test';
import Astronomy from '../node_modules/astronomy-engine/astronomy.js';
import { FISHING_LOCATIONS, getFishingDay } from '../worker/astronomy.mjs';

const { HourAngle, Body, Observer } = Astronomy;

test('Sunday meeting day uses Brisbane boundaries and plausible lunar phase', () => {
  const day = getFishingDay('2026-11-22');
  assert.equal(day.dayStart, '2026-11-21T14:00:00.000Z');
  assert.equal(day.dayEnd, '2026-11-22T14:00:00.000Z');
  assert.equal(day.timezone, 'Australia/Brisbane');
  assert.equal(day.phase.calculatedAt, '2026-11-22T02:00:00.000Z');
  assert.equal(day.phase.name, 'Waxing gibbous');
  assert.ok(day.phase.angle > 90 && day.phase.angle < 180);
  assert.ok(day.phase.illumination > 0.75 && day.phase.illumination < 1);
  const localHour = (value) => new Date(Date.parse(value) + 10 * 3_600_000).getUTCHours();
  assert.ok(localHour(day.sunrise) >= 4 && localHour(day.sunrise) <= 5);
  assert.ok(localHour(day.sunset) >= 18 && localHour(day.sunset) <= 19);
});

test('events and clipped estimated windows belong to the selected local day', () => {
  for (const date of ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-30']) {
    const day = getFishingDay(date, 'amity');
    const start = Date.parse(day.dayStart);
    const end = Date.parse(day.dayEnd);
    for (const name of ['sunrise', 'sunset', 'moonrise', 'moonset', 'transit', 'lowerTransit']) {
      if (day[name] === null) continue;
      assert.ok(Date.parse(day[name]) >= start && Date.parse(day[name]) < end, `${date} ${name}`);
    }
    for (const period of day.activityWindows) {
      assert.equal(period.estimated, true);
      assert.ok(Date.parse(period.start) >= start);
      assert.ok(Date.parse(period.end) <= end);
      assert.ok(Date.parse(period.start) <= Date.parse(period.center));
      assert.ok(Date.parse(period.end) >= Date.parse(period.center));
    }
  }
});

test('upper and lower transit centers solve the actual lunar hour angles', () => {
  const day = getFishingDay('2026-11-22', 'point-lookout');
  const observer = new Observer(day.location.latitude, day.location.longitude, 0);
  assert.ok(day.transit);
  assert.ok(day.lowerTransit);
  const upper = HourAngle(Body.Moon, new Date(day.transit), observer);
  const lower = HourAngle(Body.Moon, new Date(day.lowerTransit), observer);
  assert.ok(Math.min(Math.abs(upper), Math.abs(upper - 24)) < 0.0001);
  assert.ok(Math.abs(lower - 12) < 0.0001);
  const separationHours = Math.abs(Date.parse(day.transit) - Date.parse(day.lowerTransit)) / 3_600_000;
  assert.ok(Math.abs(separationHours - 12) > 0.05, 'Lower transit must not be an upper transit plus 12 clock hours.');
});

test('a missing moon event stays null rather than leaking into the next day', () => {
  const days = Array.from({ length: 30 }, (_, index) => getFishingDay(`2026-11-${String(index + 1).padStart(2, '0')}`));
  const missing = days.filter((day) => !day.moonrise || !day.moonset);
  assert.ok(missing.length > 0, 'A lunar month includes a local day without a rise or set.');
  for (const day of missing) {
    if (!day.moonrise) assert.ok(!day.activityWindows.some((window) => window.event === 'moonrise'));
    if (!day.moonset) assert.ok(!day.activityWindows.some((window) => window.event === 'moonset'));
  }
});

test('all supported locations calculate independently', () => {
  for (const [key, expected] of Object.entries(FISHING_LOCATIONS)) {
    const day = getFishingDay('2026-11-22', key);
    assert.deepEqual(day.location, expected);
    assert.ok(day.sunrise && day.sunset);
  }
  assert.notEqual(getFishingDay('2026-11-22', 'point-lookout').sunrise, getFishingDay('2026-11-22', 'dunwich').sunrise);
});

test('invalid dates and unknown locations fail explicitly', () => {
  for (const date of ['2026-02-30', '2026-11-31', '2026-13-01', '2026-1-2', '2026-11-22T00:00:00Z', '1899-12-31', '2101-01-01', '', null, 20261122]) {
    assert.throws(() => getFishingDay(date), RangeError, String(date));
  }
  for (const location of ['brisbane', '__proto__', 'constructor', null, {}]) {
    assert.throws(() => getFishingDay('2026-11-22', location), RangeError);
  }
  assert.equal(getFishingDay('2028-02-29').date, '2028-02-29');
});
