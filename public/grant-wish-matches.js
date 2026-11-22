import {opportunities} from './grant-opportunities.mjs';

// Use the same evidence in both directions. Each theme names a specific need
// and an example the committee can edit when it starts a wish from a grant.
const needs = {
  fishing: {
    label: 'fishing equipment',
    equipment: /\b(rods?|reels?|brag ?mats?|measuring (mats?|boards?)|release mats?|tackle kits?|fishing kits?)\b/,
    name: 'Loan rods and reels for beginners',
    purpose: 'Lend a shared set to people learning to fish at local come-and-try days.'
  },
  clinic: {
    label: 'gear for a public fishing activity',
    equipment: /\b(rods?|reels?|brag ?mats?|measuring (mats?|boards?)|release mats?|fish id cards?|species cards?|clinic kits?)\b/,
    audience: /\b(clinics?|public|workshops?|schools?|families|come and try|community day|open day|citizen science)\b/,
    exclude: /\b(members? only|club only|private|invitation only)\b/,
    name: 'Measuring mats for public catch-and-release clinics',
    purpose: 'Help families measure, photograph and release fish during public fishing clinics on the island.'
  },
  safety: {
    label: 'first aid or water safety equipment',
    equipment: /\b(first aid|life ?jackets?|pfds?|defibrillators?|aed|rescue equipment)\b/,
    name: 'Shared first aid kit',
    purpose: 'Give volunteer first aiders a stocked kit to take to shore-based club fishing days.'
  },
  portable: {
    label: 'portable equipment for events',
    equipment: /\b(marquees?|gazebos?|pop up shelters?|folding tables?|portable (shelters?|tables?|shade|bbqs?|barbecues?)|water stations?|handover kits?)\b/,
    name: 'Portable shade for community fishing days',
    purpose: 'Set up a shaded welcome point at public fishing days and workshops run by local volunteers.'
  },
  eventKit: {
    label: 'portable event or check-in gear',
    equipment: /\b(portable (pa|public address|speakers?|sound systems?)|pa (systems?|speakers?)|(sign on|check in|registration) (kits?|gear|equipment|tablets?|stations?))\b/,
    audience: /\b(events?|meets?|comps?|competitions?|public|families|volunteers?|fishing days?|sign on days?)\b/,
    name: 'Portable PA and check-in kit',
    purpose: 'Use the same kit for sign-on and short safety briefings at public fishing days and club competitions.'
  },
  coldStorage: {
    label: 'shared cold storage',
    equipment: /\b(esky|eskys|eskies|ice ?box(es)?|insulated coolers?|freezers?|fridges?)\b/,
    name: 'Shared eskies for club fishing days',
    purpose: 'Keep drinks and food cool for volunteers and families at local fishing events. Use separate, labelled equipment for bait.'
  },
  catering: {
    label: 'food or drinking water equipment',
    equipment: /\b(bbqs?|barbecues?|barbeques?|water stations?)\b/,
    name: 'Refillable water station',
    purpose: 'Bring drinking water to local club fishing days in a station the club can keep and reuse.'
  },
  access: {
    label: 'equipment for young people with access needs',
    equipment: /\b(adapt(ed|ive)|accessible|wheelchairs?|limited grip|one handed|disabilit(y|ies))\b/,
    audience: /\b(juniors?|kids?|children|child|youth|young people|school|students?|teenagers?)\b/,
    name: 'Adaptive rod holders for junior anglers',
    purpose: 'Give children with limited grip a way to take part in supervised fishing. Ask participating families which supports would suit their children.'
  },
  stewardship: {
    label: 'discarded fishing line or marine litter',
    equipment: /\b(tackle bins?|line (bins?|disposal|recycling|collection)|marine (litter|debris)|litter (pickers?|tongs?)|clean ?up kits?)\b/,
    name: 'Fishing line collection kit',
    purpose: 'Show residents how to collect discarded line and tackle safely at a public workshop, with local carers helping plan disposal.'
  },
  habitatSurvey: {
    label: 'fish habitat surveys',
    equipment: /\b(survey kits?|photo surveys?|survey cameras?)\b/,
    audience: /\b(shellfish reefs?|oyster reefs?|fish habitat|fish nurser(y|ies))\b/,
    name: 'Shore survey kit for fish habitat',
    purpose: 'Work with an island research partner to record fish habitat from agreed shore sites. Check what observations would help before choosing the kit.'
  },
  energy: {
    label: 'energy upgrades',
    equipment: /\b(solar (panels?|batter(y|ies))|energy efficient light(s|ing)?|led lighting|battery storage)\b/,
    name: 'Energy-efficient lighting for a shared venue',
    purpose: 'Plan a lighting upgrade with the venue operator. Check who owns the building and collect energy use figures before seeking quotes.'
  }
};

// Each note is tied to the corresponding official funding page in the finder.
// Rounds that do not support an identifiable equipment use are left out.
const programmes = {
  'Community Fishing Grants': {
    clinic: 'A public fishing clinic could use this gear to teach responsible catch and release. Check the project costs with Fisheries Queensland.',
    habitatSurvey: 'Fisheries Queensland lists habitat and community monitoring projects. Agree on a question that matters to local fishers and check which survey costs the round covers.'
  },
  'Club House Grant': {
    coldStorage: 'The guidelines cover club-owned equipment and list white goods. Describe who will use the cold storage and ask whether the proposed item and use qualify.',
    eventKit: 'The round covers club-owned equipment and technology. Explain how the kit will help volunteers welcome and brief participants.',
    fishing: 'The equipment category covers shared sporting gear kept by the club. Check the item against the round guidelines.',
    safety: 'The guidelines list safety and first aid equipment that the club keeps for its activities.',
    catering: 'The guidelines list water stations and food preparation equipment for club use. Check the proposed purchase before seeking a quote.'
  },
  'Rapid Response Grant': {
    eventKit: 'Council considers small portable equipment for community use. Explain how volunteers will use the kit at local events and check the round before buying.',
    portable: 'Council can consider small portable equipment that benefits the Redlands community. Describe who will use it and wait for approval before buying.'
  },
  'Community Grants for Children': {
    access: 'Variety considers equipment for children facing barriers to participation. Document the need with families and obtain a supplier quote.'
  },
  'Community Support Grant': {
    stewardship: 'This could support a public stewardship workshop. Ask Council which equipment costs the round allows.'
  },
  'Game On, Teaming Up for Climate Action': {
    energy: 'This could fit an energy upgrade at a shared sporting venue. Confirm the next round, site control and owner consent.'
  }
};

const clean = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const brisbaneNow = () => new Date(Date.now() + 10 * 3600000).toISOString().slice(0,16);
const unsuitable = /\b(prizes?|raffles?|alcohol|beer|resale|retail sale|gift (cards?|vouchers?))\b/;

function catalogueRecord(grant) {
  const source = grant?.sourceUrl || grant?.url;
  return opportunities.find(item => source === item.url)
    || opportunities.find(item => clean(item.name) === clean(grant?.name || grant?.title) &&
      (!grant?.funder || clean(item.funder) === clean(grant.funder)));
}

function acceptingLeads(record, today) {
  if (!['Open','Upcoming'].includes(record?.status)) return false;
  if (!record.closing) return true;
  const lastMinute = record.closing + 'T' + (record.closingTime || '24:00');
  if (today === record.closing) {
    const now = brisbaneNow();
    if (now.startsWith(today + 'T')) return now < lastMinute;
  }
  return today < lastMinute;
}

function themesFor(grant, today) {
  if (!grant || (grant.stage && !['checking','preparing'].includes(grant.stage))) return [];
  if (grant.deadline && grant.deadline < today.slice(0,10)) return [];
  const record = catalogueRecord(grant);
  if (record) return acceptingLeads(record, today) ? Object.entries(programmes[record.name] || {}) : [];
  // An officer may have entered a local grant that is outside the directory.
  // Use only the grant title as evidence. An officer's private next step may
  // mention expenses specifically excluded by the funder.
  const title = clean(grant.title);
  if (!title || unsuitable.test(title)) return [];
  return Object.entries(needs).filter(([,need]) => describes(title, need)).map(([key,need]) =>
    [key, 'The saved grant and this wish both mention ' + need.label + '. Check the funder’s guidelines for this item.']);
}

function describes(text, {equipment, audience, exclude}) {
  return equipment.test(text) && (!audience || audience.test(text)) && !exclude?.test(text);
}

function match(wish, themes) {
  if (!wish || wish.status === 'fulfilled') return;
  // A project description may mention event equipment as context for a major asset.
  if (/\b(tractors?|boat ramps?|surf ramps?|permanent ramps?|boat launch (ramp|vehicle)s?|trailers?|gear store|wash down bay)\b/.test(clean(wish.name))) return;
  const text = clean([wish.name, wish.purpose].filter(Boolean).join(' '));
  if (unsuitable.test(text.replace(/\bprize presentations?\b/g, 'presentation'))) return;
  return themes.find(([key]) => describes(text, needs[key]))?.[1];
}

export function recommendedGrantsForWish(wish, today = brisbaneNow()) {
  return opportunities.map(grant => ({grant, reason:match(wish, themesFor(grant, today))}))
    .filter(result => result.reason)
    .sort((a,b) => Number(b.grant.status === 'Open') - Number(a.grant.status === 'Open'));
}

export function recommendedWishesForGrant(grant, wishes, today = brisbaneNow()) {
  const themes = themesFor(grant, today);
  return wishes.map(wish => ({wish, reason:match(wish, themes)})).filter(result => result.reason);
}

export function recommendedSavedGrantsForWish(wish, grants, today = brisbaneNow()) {
  return grants.map(grant => ({grant, reason:match(wish, themesFor(grant, today))})).filter(result => result.reason);
}

export function wishIdeasForGrant(grant, today = brisbaneNow()) {
  return themesFor(grant, today).map(([key]) => {
    const {name, purpose} = needs[key];
    return {name, purpose};
  });
}
