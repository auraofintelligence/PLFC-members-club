const qldSharkGuide = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/fish-species-guide/fish-species-id/species-page?grid=60FYIdGuFdOxvsDxHj3wR2&id=';
const attribution = 'https://creativecommons.org/licenses/by/';

export const coastSharkResearch = {
  moretonBay: 'https://pubmed.ncbi.nlm.nih.gov/23331147/',
  brisbaneRiver: 'https://sharkrayareas.org/portfolio-item/brisbane-river-isra/',
};

const records = [
  {
    id: 'bull-shark', name: 'Bull shark', scientificName: 'Carcharhinus leucas',
    feature: 'A heavy-bodied shark with a short, rounded snout and a much taller first dorsal fin than second. Young bull sharks use the Brisbane River as a nursery. The pigeye shark looks similar.',
    reference: qldSharkGuide + '4AVjmsLJkvvX7o2Br3nK8w',
    research: coastSharkResearch.brisbaneRiver,
    photo: {
      title: 'Bull shark off Playa del Carmen, Mexico', credit: "João D'Andretta",
      alt: 'A broad-snouted bull shark swimming just above the sand, showing both dorsal fins in profile.',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bull_shark_(Carcharhinus_leucas).jpg',
      license: 'CC BY 4.0', licenseUrl: attribution + '4.0/',
      changes: 'Cropped and colour-corrected by Lamnid13 on Wikimedia Commons. WebP copy.',
    },
  },
  {
    id: 'australian-sharpnose-shark', name: 'Australian sharpnose shark', scientificName: 'Rhizoprionodon taylori',
    feature: 'Look for a slender body and a narrow, pointed snout. This small whaler occurs in Moreton Bay and resembles the grey sharpnose shark. Size alone cannot settle the identification.',
    reference: qldSharkGuide + '6V6JPuXPGkevOXp46rKrAE',
    research: coastSharkResearch.moretonBay,
    photo: {
      title: 'Australian sharpnose shark', credit: '© The State of Queensland (Fisheries Queensland)',
      alt: 'A whole small grey shark beside a ruler, showing its slender body and pointed snout.',
      sourceUrl: qldSharkGuide + '6V6JPuXPGkevOXp46rKrAE',
      license: 'CC BY 4.0', licenseUrl: attribution + '4.0/',
      changes: 'Black borders trimmed and converted to WebP.',
    },
  },
  {
    id: 'common-blacktip-shark', name: 'Common blacktip shark', scientificName: 'Carcharhinus limbatus',
    feature: 'Look for dark tips on several fins. They can fade with age. The common and Australian blacktips look so alike that a catch photograph cannot reliably separate them.',
    reference: qldSharkGuide + '78oKBfcbiXVYid6BPIEaUE',
    research: coastSharkResearch.moretonBay,
    photo: {
      title: 'Common blacktip shark at Santa Cruz, Galápagos', credit: 'John G. Phillips',
      alt: 'A free-swimming common blacktip shark seen from above. The dark tips of its dorsal and pectoral fins are visible.',
      sourceUrl: 'https://www.inaturalist.org/observations/23586182',
      license: 'CC BY 4.0', licenseUrl: attribution + '4.0/', changes: 'Resized and converted to WebP.',
    },
  },
  {
    id: 'australian-blacktip-shark', name: 'Australian blacktip shark', scientificName: 'Carcharhinus tilstoni',
    feature: 'A grey or bronze whaler with a pale belly. The fin tips can be darker on young sharks. Specialists use DNA or vertebral counts to tell this species from the common blacktip.',
    reference: qldSharkGuide + '6fodWP5IMQXvBdrnuGSuVD',
    research: coastSharkResearch.moretonBay,
    photo: {
      title: 'Australian blacktip shark from the CSIRO National Fish Collection', credit: 'CSIRO National Fish Collection',
      alt: 'CSIRO reference photograph of an Australian blacktip in full side view, showing the tail and both dorsal fins.',
      sourceUrl: 'https://fishesofaustralia.net.au/home/species/1957',
      license: 'CC BY 3.0', licenseUrl: attribution + '3.0/', changes: 'Converted to WebP.',
    },
  },
];

export const coastSharks = records.map(record => ({
  ...record,
  group: 'Sharks', family: 'Whaler sharks', measure: 'length', eligible: true,
  photo: {...record.photo, src: '/assets/fish/' + record.id + '.webp'},
}));
