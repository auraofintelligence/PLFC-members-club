import { FISHING_LOCATIONS } from './astronomy.mjs';

const DAY_MS = 86_400_000;
const CACHE_MS = 15 * 60 * 1000;
const OFFSET_MS = 10 * 3_600_000;
const TIMEZONE = 'Australia/Brisbane';
const SOURCES = {
  weather: { source: 'Open-Meteo weather forecast', sourceUrl: 'https://open-meteo.com/en/docs', maxDays: 16 },
  marine: { source: 'Open-Meteo marine forecast', sourceUrl: 'https://open-meteo.com/en/docs/marine-weather-api', maxDays: 8 },
};

function localDate(instant) {
  return new Date(instant + OFFSET_MS).toISOString().slice(0, 10);
}

function calendarDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('Use a calendar date in YYYY-MM-DD format.');
  const instant = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== date) throw new RangeError('Choose a valid calendar date.');
  return instant;
}

function number(value, min = -Infinity, max = Infinity) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function maximum(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => value !== null);
  return values.length ? Math.max(...values) : null;
}

function minimum(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => value !== null);
  return values.length ? Math.min(...values) : null;
}

function selectedHours(data, date, fields) {
  if (!data || data.error || !Array.isArray(data.hourly?.time)) throw new Error('The provider returned no hourly forecast.');
  const rows = [];
  const seen = new Set();
  data.hourly.time.forEach((seconds, index) => {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return;
    const millis = seconds * 1000;
    if (localDate(millis) !== date || seen.has(seconds)) return;
    const row = { time: new Date(millis).toISOString() };
    for (const [field, [providerField, min, max]] of Object.entries(fields)) row[field] = number(data.hourly[providerField]?.[index], min, max);
    seen.add(seconds);
    rows.push(row);
  });
  rows.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  if (!rows.length || !rows.some((row) => Object.keys(fields).some((field) => row[field] !== null))) throw new Error('No usable forecast values are available for this day.');
  return rows;
}

function weatherData(data, date) {
  const hours = selectedHours(data, date, {
    temperature: ['temperature_2m', -90, 65], feelsLike: ['apparent_temperature', -100, 90],
    windKmh: ['wind_speed_10m', 0, 400], gustKmh: ['wind_gusts_10m', 0, 500],
    windDirection: ['wind_direction_10m', 0, 360], rainChance: ['precipitation_probability', 0, 100],
    weatherCode: ['weather_code', 0, 99], isDay: ['is_day', 0, 1],
  });
  const noon = hours.find((row) => new Date(Date.parse(row.time) + OFFSET_MS).getUTCHours() === 12) || hours[0];
  const dailyIndex = data.daily?.time?.findIndex((seconds) => typeof seconds === 'number' && localDate(seconds * 1000) === date) ?? -1;
  const dailyTime = (key) => {
    const seconds = data.daily?.[key]?.[dailyIndex];
    return typeof seconds === 'number' && Number.isFinite(seconds) && localDate(seconds * 1000) === date ? new Date(seconds * 1000).toISOString() : null;
  };
  return {
    hours,
    summary: { maxTemp: maximum(hours, 'temperature'), minTemp: minimum(hours, 'temperature'), maxWindKmh: maximum(hours, 'windKmh'), maxGustKmh: maximum(hours, 'gustKmh'), rainChance: maximum(hours, 'rainChance'), weatherCode: noon.weatherCode, sunrise: dailyTime('sunrise'), sunset: dailyTime('sunset') },
    units: { temperature: '°C', feelsLike: '°C', windKmh: 'km/h', gustKmh: 'km/h', windDirection: 'degrees from north', rainChance: '%' },
  };
}

function marineData(data, date) {
  const hours = selectedHours(data, date, {
    waveHeight: ['wave_height', 0, 30], wavePeriod: ['wave_period', 0, 60], waveDirection: ['wave_direction', 0, 360],
    swellHeight: ['swell_wave_height', 0, 30], swellPeriod: ['swell_wave_period', 0, 60], swellDirection: ['swell_wave_direction', 0, 360],
  });
  return {
    hours,
    summary: { maxWaveHeight: maximum(hours, 'waveHeight'), maxWavePeriod: maximum(hours, 'wavePeriod'), maxSwellHeight: maximum(hours, 'swellHeight') },
    units: { waveHeight: 'm', wavePeriod: 's', waveDirection: 'degrees from north', swellHeight: 'm', swellPeriod: 's' },
    gridNotice: 'Forecast is for the model sea grid near this location. It does not resolve individual beaches, bars, launches or sheltered waterways. Wave direction is where waves come from. This is not a tide table.',
  };
}

function providerUrl(kind, date, location) {
  const url = new URL(kind === 'weather' ? 'https://api.open-meteo.com/v1/forecast' : 'https://marine-api.open-meteo.com/v1/marine');
  for (const [key, value] of Object.entries({ latitude: location.latitude, longitude: location.longitude, timezone: TIMEZONE, timeformat: 'unixtime', start_date: date, end_date: date })) url.searchParams.set(key, String(value));
  if (kind === 'weather') {
    url.searchParams.set('hourly', 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day');
    url.searchParams.set('daily', 'sunrise,sunset');
    url.searchParams.set('wind_speed_unit', 'kmh');
  } else {
    url.searchParams.set('hourly', 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction');
    url.searchParams.set('cell_selection', 'sea');
  }
  return url;
}

async function timedJSON(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
        return response.json();
      })(),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Provider did not respond within six seconds.')); }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function provider(kind, date, place, context) {
  const { maxDays, ...source } = SOURCES[kind];
  const forecastStart = localDate(context.now);
  const forecastEnd = localDate(context.todayStart + (maxDays - 1) * DAY_MS);
  const base = { ...source, forecastStart, forecastEnd, forecastIssuedAt: null, timestampNotice: 'The API does not expose the forecast model issue time. retrievedAt is when this application fetched the response.', attribution: 'Open-Meteo and its underlying weather/model providers. See source documentation for provider credits.' };
  const unavailable = (reason) => ({ ...base, status: 'unavailable', reason, retrievedAt: null, cached: false, hours: [], summary: null });
  if (date < forecastStart || date > forecastEnd) return unavailable(`Choose a forecast date from ${forecastStart} to ${forecastEnd}.`);
  const url = providerUrl(kind, date, place);
  const parser = kind === 'weather' ? weatherData : marineData;
  const cacheKey = new Request(url.toString());
  if (context.cache) {
    try {
      const hit = await context.cache.match(cacheKey);
      if (hit) {
        const record = await hit.json();
        const age = context.now - Date.parse(record.retrievedAt);
        if (age >= 0 && age < CACHE_MS) return { ...base, status: 'available', ...parser(record.data, date), retrievedAt: record.retrievedAt, cached: true };
      }
    } catch { /* Cache trouble must not hide a valid provider response. */ }
  }
  try {
    const data = await timedJSON(url, context.fetchImpl, context.timeoutMs);
    const parsed = parser(data, date);
    const retrievedAt = new Date(context.clock()).toISOString();
    if (context.cache) {
      try {
        await context.cache.put(cacheKey, new Response(JSON.stringify({ retrievedAt, data }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' } }));
      } catch { /* A forecast can still be returned when cache storage fails. */ }
    }
    return { ...base, status: 'available', ...parsed, retrievedAt, cached: false };
  } catch (error) {
    return unavailable(error?.name === 'AbortError' ? 'Provider request timed out.' : 'The provider forecast is temporarily unavailable.');
  }
}

function adviceFor(weather, marine) {
  const advice = [];
  if (weather.status === 'available') {
    const { maxWindKmh, maxGustKmh, rainChance, sunrise, sunset } = weather.summary;
    const windValues = [maxWindKmh === null ? null : `${Math.round(maxWindKmh)} km/h sustained wind`, maxGustKmh === null ? null : `${Math.round(maxGustKmh)} km/h gusts`].filter(Boolean).join(' and ');
    if (windValues) advice.push({
      title: maxWindKmh >= 37 || maxGustKmh >= 46 ? 'Stronger wind forecast' : 'Wind outlook',
      body: `The day's model forecast reaches ${windValues}. Compare the hourly changes with your intended location and check BOM marine warnings.`,
      type: maxWindKmh >= 37 || maxGustKmh >= 46 ? 'caution' : 'info',
    });
    if (rainChance !== null && rainChance >= 50) advice.push({ title: 'Rain is possible', body: `The highest hourly precipitation chance is ${Math.round(rainChance)}%. Check the hour you plan to go and the latest BOM radar and warnings.`, type: 'caution' });
    if (sunrise && sunset) {
      const clock = (instant) => new Date(Date.parse(instant) + OFFSET_MS).toISOString().slice(11, 16);
      advice.push({ title: 'Daylight planning', body: `Forecast sunrise is ${clock(sunrise)} and sunset is ${clock(sunset)}, Brisbane time. Allow time for launching, returning and packing up.`, type: 'info' });
    }
  }
  if (marine.status === 'available' && marine.summary.maxWaveHeight !== null) advice.push({ title: 'Wave outlook', body: `The model's significant wave height reaches ${marine.summary.maxWaveHeight.toFixed(1)} m. Individual waves can be higher; coastal features and local exposure are not resolved by this grid. Check official marine information before choosing a plan.`, type: marine.summary.maxWaveHeight >= 1.5 ? 'caution' : 'info' });
  if (weather.status !== 'available' || marine.status !== 'available') advice.push({ title: 'Some forecast data is unavailable', body: 'Missing values are left blank. Use the official forecast and warnings; this page does not infer conditions from missing data.', type: 'info' });
  return advice;
}

/** Independent live model forecasts for the non-commercial demo. */
export async function getConditions(date, key = 'point-lookout', options = {}) {
  const now = new Date(typeof options.now === 'function' ? options.now() : options.now ?? Date.now()).getTime();
  if (!Number.isFinite(now)) throw new RangeError('A valid current time is required.');
  date ??= localDate(now);
  calendarDate(date);
  if (typeof key !== 'string' || !Object.hasOwn(FISHING_LOCATIONS, key)) throw new RangeError('Choose a known fishing location.');
  const place = FISHING_LOCATIONS[key];
  const context = {
    now,
    todayStart: calendarDate(localDate(now)) - OFFSET_MS,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    cache: options.cache === undefined ? globalThis.caches?.default : options.cache,
    timeoutMs: options.timeoutMs ?? 6000,
    clock: options.now === undefined ? Date.now : typeof options.now === 'function' ? () => new Date(options.now()).getTime() : () => now,
  };
  const [weather, marine] = await Promise.all([provider('weather', date, place, context), provider('marine', date, place, context)]);
  return {
    date,
    timezone: TIMEZONE,
    location: { ...place },
    retrievedAt: new Date(now).toISOString(),
    status: weather.status === 'available' && marine.status === 'available' ? 'available' : weather.status === 'available' || marine.status === 'available' ? 'partial' : 'unavailable',
    weather,
    marine,
    advice: adviceFor(weather, marine),
    warningsUrl: 'https://www.bom.gov.au/qld/warnings/',
    guidanceNotice: 'Model forecasts and general planning observations are not a safety clearance, local bar report or catch forecast. BOM warnings and current local conditions take priority.',
    demoLicenceNotice: 'The free Open-Meteo API is configured for this non-commercial demonstration. A sponsored or promotional public launch needs an appropriate commercial API plan and server-side credentials before this integration is enabled there. Data attribution: Open-Meteo and its model providers, CC BY 4.0.',
    licenceUrl: 'https://open-meteo.com/en/terms',
    attributionUrl: 'https://open-meteo.com/en/docs',
  };
}
