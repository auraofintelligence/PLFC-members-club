import assert from 'node:assert/strict';
import test from 'node:test';
import { getConditions } from '../worker/conditions.mjs';

const NOW = '2026-11-20T05:00:00.000Z';
const DATE = '2026-11-22';
const start = Date.parse(`${DATE}T00:00:00+10:00`) / 1000;

function fixture(kind) {
  const time = Array.from({ length: 26 }, (_, i) => start + (i - 1) * 3600);
  const repeated = (value) => time.map(() => value);
  return kind === 'weather' ? {
    hourly: { time, temperature_2m: repeated(24), apparent_temperature: repeated(26), wind_speed_10m: repeated(38), wind_gusts_10m: repeated(48), wind_direction_10m: repeated(90), precipitation_probability: repeated(60), weather_code: repeated(3), is_day: time.map((_, i) => i > 5 && i < 19 ? 1 : 0) },
    daily: { time: [start], sunrise: [start + 5 * 3600], sunset: [start + 18 * 3600] },
  } : { hourly: { time, wave_height: repeated(1.8), wave_period: repeated(10), wave_direction: repeated(110), swell_wave_height: repeated(1.2), swell_wave_period: repeated(11), swell_wave_direction: repeated(120) } };
}

function fakeFetch(failKind) {
  return async (input) => {
    const kind = new URL(input).hostname.startsWith('marine-') ? 'marine' : 'weather';
    if (kind === failKind) throw new Error('Fictional provider failure');
    return Response.json(fixture(kind));
  };
}

test('returns only requested Brisbane hours, expected units and honest source timestamps', async () => {
  const result = await getConditions(DATE, 'point-lookout', { now: NOW, fetchImpl: fakeFetch(), cache: null });
  assert.equal(result.status, 'available');
  assert.equal(result.weather.hours.length, 24);
  assert.equal(result.marine.hours.length, 24);
  assert.equal(result.weather.hours[0].time, '2026-11-21T14:00:00.000Z');
  assert.equal(result.weather.hours[23].time, '2026-11-22T13:00:00.000Z');
  assert.equal(result.weather.summary.maxWindKmh, 38);
  assert.equal(result.marine.summary.maxWaveHeight, 1.8);
  assert.equal(result.weather.forecastIssuedAt, null);
  assert.equal(result.weather.retrievedAt, NOW);
  assert.ok(result.advice.some((item) => item.title === 'Stronger wind forecast'));
  assert.ok(result.advice.some((item) => item.title === 'Daylight planning'));
  assert.match(result.demoLicenceNotice, /commercial API plan/);
});

test('marine and weather failures do not suppress the other provider', async () => {
  for (const kind of ['weather', 'marine']) {
    const result = await getConditions(DATE, 'amity', { now: NOW, fetchImpl: fakeFetch(kind), cache: null });
    assert.equal(result.status, 'partial');
    assert.equal(result[kind].status, 'unavailable');
    assert.deepEqual(result[kind].hours, []);
    assert.equal(result[kind].summary, null);
    assert.equal(result[kind === 'weather' ? 'marine' : 'weather'].status, 'available');
  }
});

test('provider bounds avoid requests for past dates and beyond the supported horizon', async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return Response.json(fixture(new URL(url).hostname.startsWith('marine-') ? 'marine' : 'weather')); };
  const past = await getConditions('2026-11-19', 'point-lookout', { now: NOW, fetchImpl, cache: null });
  assert.equal(past.status, 'unavailable');
  assert.equal(calls.length, 0);
  const distant = await getConditions('2026-12-06', 'point-lookout', { now: NOW, fetchImpl, cache: null });
  assert.equal(distant.status, 'unavailable');
  assert.equal(calls.length, 0);
  const weatherOnly = await getConditions('2026-11-28', 'point-lookout', { now: NOW, fetchImpl, cache: null });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].startsWith('https://api.open-meteo.com/'));
  assert.equal(weatherOnly.marine.forecastEnd, '2026-11-27');
});

test('cache retains the actual retrieval time, expires after fifteen minutes and tolerates cache errors', async () => {
  const entries = new Map();
  const cache = { match: async (request) => entries.get(request.url)?.clone(), put: async (request, response) => entries.set(request.url, response.clone()) };
  let calls = 0;
  const fetchImpl = async (url) => { calls += 1; return fakeFetch()(url); };
  await getConditions(DATE, 'point-lookout', { now: NOW, fetchImpl, cache });
  const cached = await getConditions(DATE, 'point-lookout', { now: '2026-11-20T05:14:59Z', fetchImpl, cache });
  assert.equal(calls, 2);
  assert.equal(cached.weather.cached, true);
  assert.equal(cached.weather.retrievedAt, NOW);
  await getConditions(DATE, 'point-lookout', { now: '2026-11-20T05:15:01Z', fetchImpl, cache });
  assert.equal(calls, 4);
  const brokenCache = { match: async () => { throw new Error('cache unavailable'); }, put: async () => { throw new Error('cache unavailable'); } };
  assert.equal((await getConditions(DATE, 'point-lookout', { now: NOW, fetchImpl, cache: brokenCache })).status, 'available');
});

test('missing forecast values remain missing and all-null data is unavailable', async () => {
  const fetchImpl = async (url) => {
    const kind = new URL(url).hostname.startsWith('marine-') ? 'marine' : 'weather';
    const data = fixture(kind);
    if (kind === 'weather') data.hourly.temperature_2m = data.hourly.time.map(() => null);
    else for (const field of Object.keys(data.hourly)) if (field !== 'time') data.hourly[field] = data.hourly.time.map(() => null);
    return Response.json(data);
  };
  const result = await getConditions(DATE, 'dunwich', { now: NOW, fetchImpl, cache: null });
  assert.equal(result.weather.summary.maxTemp, null);
  assert.equal(result.weather.hours[0].temperature, null);
  assert.equal(result.marine.status, 'unavailable');
  assert.equal(result.marine.summary, null);
});

test('timeouts settle independently even when a fetch implementation ignores abort', async () => {
  const fetchImpl = async (url) => new URL(url).hostname.startsWith('marine-') ? new Promise(() => {}) : Response.json(fixture('weather'));
  const result = await getConditions(DATE, 'jumpinpin', { now: NOW, fetchImpl, cache: null, timeoutMs: 10 });
  assert.equal(result.weather.status, 'available');
  assert.equal(result.marine.status, 'unavailable');
});

test('invalid dates, unknown locations and malformed provider payloads fail explicitly', async () => {
  await assert.rejects(getConditions('2026-02-30', 'point-lookout', { now: NOW }), RangeError);
  await assert.rejects(getConditions(DATE, '__proto__', { now: NOW }), RangeError);
  const result = await getConditions(DATE, 'point-lookout', { now: NOW, fetchImpl: async () => Response.json({ error: true }), cache: null });
  assert.equal(result.status, 'unavailable');
  assert.ok(result.weather.hours.length === 0 && result.marine.hours.length === 0);
});
