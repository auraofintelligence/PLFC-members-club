import { RETRIEVED_AT, TIDE_SOURCE_DATA } from './tides-data.mjs';
import { FISHING_LOCATIONS } from './astronomy.mjs';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const OFFSET = 10 * 60 * MINUTE;
const COVERAGE = Object.freeze({ start: '2026-01-01', end: '2027-12-31' });
const STATIONS = Object.freeze({
  'brisbane-bar': Object.freeze({ id: 'brisbane-bar', gaugeId: '046046A', name: 'Brisbane Bar', latitude: -27.4, longitude: 153.15, datum: 'Lowest Astronomical Tide (LAT)' }),
  tangalooma: Object.freeze({ id: 'tangalooma', gaugeId: '101023', name: 'Tangalooma Jetty', latitude: -(27 + 10 / 60), longitude: 153 + 22 / 60, datum: 'Lowest Astronomical Tide (LAT)' }),
});

const stationEvents = new Map();

function parseDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('Use a calendar date in YYYY-MM-DD format.');
  const utc = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > '2100-12-31') throw new RangeError('Choose a valid calendar date from 1900 to 2100.');
  return utc - OFFSET;
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const latitude = (b.latitude - a.latitude) * rad;
  const longitude = (b.longitude - a.longitude) * rad;
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(longitude / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function allEvents(stationId) {
  if (stationEvents.has(stationId)) return stationEvents.get(stationId);
  const events = [];
  for (const year of Object.values(TIDE_SOURCE_DATA[stationId].years)) {
    for (const [date, rows] of Object.entries(year.rows)) {
      const start = parseDate(date);
      for (const [minute, height, indicator] of rows) {
        events.push({ timestamp: start + minute * MINUTE, height, type: indicator === 1 ? 'high' : 'low' });
      }
    }
  }
  events.sort((a, b) => a.timestamp - b.timestamp);
  stationEvents.set(stationId, events);
  return events;
}

// The official source contains extrema, not a continuous curve. This visual
// interpolation is deliberately labelled, never extrapolated and never sold
// as measured water level, a tidal-current prediction or a navigation product.
function schematicCurve(events, start, end) {
  const output = [];
  let index = 0;
  for (let timestamp = start; timestamp <= end; timestamp += 30 * MINUTE) {
    while (index + 1 < events.length && events[index + 1].timestamp < timestamp) index += 1;
    const before = events[index];
    const after = events[index + 1];
    if (!before || !after || timestamp < before.timestamp || timestamp > after.timestamp) continue;
    const fraction = (timestamp - before.timestamp) / (after.timestamp - before.timestamp);
    const height = before.height + (after.height - before.height) * (1 - Math.cos(Math.PI * fraction)) / 2;
    output.push({ time: new Date(timestamp).toISOString(), height: Math.round(height * 1000) / 1000, interpolated: true });
  }
  return output;
}

export function getTides(date, locationKey = 'point-lookout') {
  const start = parseDate(date);
  const requested = Object.hasOwn(FISHING_LOCATIONS, locationKey) ? FISHING_LOCATIONS[locationKey] : null;
  const explicitStation = Object.hasOwn(STATIONS, locationKey) ? STATIONS[locationKey] : null;
  if (!requested && !explicitStation) throw new RangeError('Choose a supported fishing location or tide reference station.');
  // Brisbane Bar is a published Moreton Bay reference. No unverified local
  // timing or height corrections are applied to island fishing locations.
  const station = explicitStation || STATIONS['brisbane-bar'];
  const stationSource = TIDE_SOURCE_DATA[station.id];
  const sourceYear = stationSource.years[date.slice(0, 4)];
  const datasetUrl = Object.values(stationSource.years)[0].datasetUrl;
  const notes = [
    requested ? `${station.name} reference predictions, approximately ${distanceKm(requested, station)} km from ${requested.name}. These are not locally corrected tide predictions for ${requested.name}.` : `${station.name} reference-station predictions.`,
    'Heights are metres above Lowest Astronomical Tide (LAT). All displayed times use Brisbane time, UTC+10.',
    'High and low times and heights are the official predictions. The line between them is a schematic interpolation, not a continuous official prediction or a current-speed forecast.',
    'Astronomical predictions do not include storm surge or weather effects. Check official local marine information before going on the water.',
  ];
  const result = {
    status: sourceYear ? 'available' : 'unavailable',
    date,
    requestedLocation: locationKey,
    station: { ...station, distanceKm: requested ? distanceKm(requested, station) : 0, referenceOnly: true },
    timezone: 'Australia/Brisbane',
    coverage: COVERAGE,
    events: [],
    curve: [],
    curveMethod: 'schematic interpolation between official high and low predictions',
    source: {
      name: 'Maritime Safety Queensland / Bureau of Meteorology',
      url: sourceYear?.url || datasetUrl,
      datasetUrl,
      licence: 'Creative Commons Attribution 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Source: Maritime Safety Queensland, Queensland Government Open Data, CC BY 4.0. Predictions produced by the Bureau of Meteorology. Data reformatted for PLFC; the plotted curve is an illustrative interpolation.',
      sha256: sourceYear?.sha256 || null,
      predictionPrepared: sourceYear?.predictionPrepared || null,
    },
    retrievedAt: RETRIEVED_AT,
    notes,
  };
  if (!sourceYear) {
    result.notes.unshift('This demo includes official reference predictions for 2026 and 2027 only. No tide data is invented for other years.');
    return result;
  }
  const all = allEvents(station.id);
  const end = start + DAY;
  result.events = all.filter(event => event.timestamp >= start && event.timestamp < end).map(event => ({ time: new Date(event.timestamp).toISOString(), height: event.height, type: event.type }));
  result.curve = schematicCurve(all, start, end);
  if (!result.events.length) result.status = 'unavailable';
  return result;
}
