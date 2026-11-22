export const CLUB = {
  name: 'Point Lookout Fishing Club',
  shortName: 'PLFC',
  location: 'Minjerribah / North Stradbroke Island, Queensland',
  timezone: 'Australia/Brisbane',
};

export const EVENTS = [{
  id: 'hotel-meeting-2026-11-22',
  title: 'Informal catch-up with Point Lookout Hotel',
  startsAt: '2026-11-22T00:00:00.000Z',
  endsAt: '2026-11-22T01:00:00.000Z',
  location: 'Point Lookout Hotel, Point Lookout, Queensland',
  description: 'The club and the hotel are meeting to talk about local fishing days, the school holiday period and where help would be useful.',
  type: 'meeting',
  format: 'informal',
  durationConfirmed: false,
  calendarUrl: '/calendar/hotel-meeting-2026-11-22.ics',
}];

const largerCompetition = {
  title: 'An occasional bigger competition',
  summary: 'Once the local calendar takes shape, members and the committee can decide together whether a bigger event would suit the island.',
  date: null,
};

export const PROGRAMME = [
  {
    id: 'local-meets',
    title: 'Regular local fishing meets',
    summary: 'Join other island fishers for a cast and a yarn. On competition days, a photo of the whole fish on a brag mat records its length so you can release your catch.',
    status: 'undated',
    date: null,
  },
  {
    id: 'interclub-invitationals',
    title: 'Small interclub invitationals',
    summary: 'Invite a few anglers from another club to join the locals for a friendly fish. Have a club in mind? Bring its name to a club meeting.',
    status: 'undated',
    date: null,
  },
  { id: 'larger-competition', ...largerCompetition, status: 'proposal' },
];

export const COMPETITION = {
  ...largerCompetition,
  status: 'planning',
  prizesConfirmed: false,
};

export const FEATURES = [
  { id: 'fishing', title: 'Plan a day on the water', status: 'available' },
  { id: 'members', title: 'Your catches and club calendar', status: 'available-with-membership-access' },
  { id: 'committee', title: 'Meeting notes and actions', status: 'available-with-committee-access' },
  { id: 'finnius', title: 'Finnius the Fishing Mate', status: 'planned' },
];

const utf8 = new TextEncoder();

export function escapeIcs(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// RFC 5545 limits content lines to 75 octets, including continuation spaces.
export function foldIcsLine(value) {
  let line = '';
  let length = 0;
  const lines = [];
  for (const character of String(value)) {
    const size = utf8.encode(character).length;
    if (length + size > 75) {
      lines.push(line);
      line = ' ';
      length = 1;
    }
    line += character;
    length += size;
  }
  lines.push(line);
  return lines.join('\r\n');
}

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function makeCalendar(events = EVENTS) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Point Lookout Fishing Club//Clubhouse//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Point Lookout Fishing Club', 'X-WR-TIMEZONE:Australia/Brisbane'];
  for (const event of events) {
    const description = event.durationConfirmed === false
      ? `${event.description} The finish time is an estimate.`
      : event.description;
    lines.push('BEGIN:VEVENT', `UID:${escapeIcs(event.id)}@pointlookoutfishingclub.com`, 'DTSTAMP:20261120T000000Z', `DTSTART:${icsDate(event.startsAt)}`, `DTEND:${icsDate(event.endsAt)}`, `SUMMARY:${escapeIcs(event.title)}`, `LOCATION:${escapeIcs(event.location)}`, `DESCRIPTION:${escapeIcs(description)}`, 'STATUS:CONFIRMED', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
