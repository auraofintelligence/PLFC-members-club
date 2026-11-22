// Version 2.1.19's ESM entry is missing its package type marker under Node 20.
// Its published CommonJS build works in Node and is bundled for the Worker.
import Astronomy from '../node_modules/astronomy-engine/astronomy.js';

const {
  Body,
  Illumination,
  MoonPhase,
  Observer,
  SearchHourAngle,
  SearchRiseSet,
} = Astronomy;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const BRISBANE_OFFSET_MS = 10 * HOUR_MS;

// Representative coastal planning locations, not navigation waypoints.
export const FISHING_LOCATIONS = Object.freeze({
  'point-lookout': Object.freeze({ key: 'point-lookout', name: 'Point Lookout', latitude: -27.433, longitude: 153.545 }),
  amity: Object.freeze({ key: 'amity', name: 'Amity Point', latitude: -27.398, longitude: 153.438 }),
  dunwich: Object.freeze({ key: 'dunwich', name: 'Dunwich', latitude: -27.499, longitude: 153.401 }),
  jumpinpin: Object.freeze({ key: 'jumpinpin', name: 'Jumpinpin', latitude: -27.727, longitude: 153.444 }),
});

function todayInBrisbane() {
  return new Date(Date.now() + BRISBANE_OFFSET_MS).toISOString().slice(0, 10);
}

function parseDay(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError('Use a calendar date in YYYY-MM-DD format.');
  }
  const year = Number(date.slice(0, 4));
  const calendarDate = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) {
    throw new RangeError('Choose a valid calendar date.');
  }
  if (year < 1900 || year > 2100) {
    throw new RangeError('Choose a date between 1900 and 2100.');
  }
  return calendarDate.getTime() - BRISBANE_OFFSET_MS;
}

function phaseName(angle) {
  const names = [
    'New moon',
    'Waxing crescent',
    'First quarter',
    'Waxing gibbous',
    'Full moon',
    'Waning gibbous',
    'Last quarter',
    'Waning crescent',
  ];
  return names[Math.floor((angle + 22.5) / 45) % 8];
}

function withinDay(time, startMs, endMs) {
  if (!time) return null;
  const value = time.date.getTime();
  return value >= startMs && value < endMs ? time.date.toISOString() : null;
}

/**
 * Astronomical events for a Brisbane civil day, calculated locally with
 * Astronomy Engine. Lunar activity windows are traditional estimates only.
 * All event instants are UTC ISO timestamps; format them in Australia/Brisbane.
 */
export function getFishingDay(date = todayInBrisbane(), location = 'point-lookout') {
  const startMs = parseDay(date);
  if (typeof location !== 'string' || !Object.hasOwn(FISHING_LOCATIONS, location)) {
    throw new RangeError(`Choose a known location: ${Object.keys(FISHING_LOCATIONS).join(', ')}.`);
  }
  const place = FISHING_LOCATIONS[location];
  const endMs = startMs + DAY_MS;
  const start = new Date(startMs);
  const noon = new Date(startMs + 12 * HOUR_MS);
  const observer = new Observer(place.latitude, place.longitude, 0);
  const riseSet = (body, direction) => withinDay(
    SearchRiseSet(body, observer, direction, start, 1), startMs, endMs,
  );
  const lunarTransit = (hourAngle) => withinDay(
    SearchHourAngle(Body.Moon, observer, hourAngle, start, 1).time, startMs, endMs,
  );

  const sunrise = riseSet(Body.Sun, 1);
  const sunset = riseSet(Body.Sun, -1);
  const moonrise = riseSet(Body.Moon, 1);
  const moonset = riseSet(Body.Moon, -1);
  const transit = lunarTransit(0);
  const lowerTransit = lunarTransit(12);
  const angle = MoonPhase(noon);
  const illumination = Illumination(Body.Moon, noon).phase_fraction;

  const windowFor = (kind, event, label, center, halfHours) => {
    if (!center) return null;
    const centerMs = Date.parse(center);
    return {
      kind,
      event,
      label,
      center,
      start: new Date(Math.max(startMs, centerMs - halfHours * HOUR_MS)).toISOString(),
      end: new Date(Math.min(endMs, centerMs + halfHours * HOUR_MS)).toISOString(),
      estimated: true,
    };
  };

  return {
    date,
    timezone: 'Australia/Brisbane',
    location: { ...place },
    dayStart: start.toISOString(),
    dayEnd: new Date(endMs).toISOString(),
    phase: {
      name: phaseName(angle),
      angle,
      illumination,
      calculatedAt: noon.toISOString(),
    },
    sunrise,
    sunset,
    moonrise,
    moonset,
    transit,
    lowerTransit,
    activityWindows: [
      windowFor('major', 'upper-transit', 'Moon overhead', transit, 1),
      windowFor('major', 'lower-transit', 'Moon underfoot', lowerTransit, 1),
      windowFor('minor', 'moonrise', 'Moonrise', moonrise, 0.5),
      windowFor('minor', 'moonset', 'Moonset', moonset, 0.5),
    ].filter(Boolean).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    methodology: {
      source: 'Astronomy Engine',
      sourceUrl: 'https://github.com/cosinekitty/astronomy',
      phaseAt: 'Local noon. Phase angle is Sun-Moon ecliptic longitude separation in degrees, from 0 to 360. Illumination is a fraction from 0 to 1.',
      periods: 'Estimated major periods are one hour either side of separately calculated upper and lower lunar transits. Estimated minor periods are 30 minutes either side of moonrise and moonset. Only events in the selected local day are included; windows are clipped to that day.',
      disclaimer: 'Lunar activity periods are traditional planning estimates, not catch forecasts. Astronomical times assume a sea-level observer and standard refraction. Local terrain and conditions affect visibility. Check official weather, tides and marine warnings before fishing.',
    },
  };
}
