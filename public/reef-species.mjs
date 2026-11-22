const pointLookoutSurvey = 'https://epic.awi.de/id/eprint/37389/1/Unidive_PLEA_2014_Final_Report.pdf#page=55';
const keepingRules = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal#coral-reef-fin-fish-closures';
const qldPhotoGuide = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/fish-species-guide/fish-species-id/species-page/';
const attributionLicence = 'https://creativecommons.org/licenses/by/4.0/';
const regionalNote = 'Listed in UniDive’s Point Lookout reef survey. The checklist covers Flat Rock, Shag Rock and Manta Ray Bommie together.';
const reefPossession = 'The combined Queensland possession limit for coral reef fin fish is 20.';
const parrotfishLimits = 'Minimum 25 cm. You can possess up to 5 of this parrotfish species.';
const tuskfishLimits = 'Minimum 30 cm. You can possess up to 6 tuskfish across all tuskfish species together.';

function qldPhoto(species, group, alt) {
  return {
    credit: '© The State of Queensland (Fisheries Queensland)',
    sourceUrl: qldPhotoGuide + '?id=' + species + '&grid=' + group,
    alt, changes: 'Resized for the guide'
  };
}

function observationPhoto(id, credit, alt, cropped = false) {
  return {
    credit, sourceUrl: 'https://www.inaturalist.org/photos/' + id, alt,
    changes: cropped ? 'Cropped around the whole fish and resized for the guide' : 'Resized for the guide'
  };
}

const entries = [
  {
    id: 'red-emperor', name: 'Red emperor', family: 'Tropical snappers', scientificName: 'Lutjanus sebae',
    guide: 567, feature: 'Look for a deep body with a steep forehead. Young red emperor have three broad red bands. Large adults can be pinkish red with very faint bands. This species belongs to the tropical snapper family.',
    rulesNote: 'Minimum 55 cm. You can possess up to 5 red emperor.',
    photo: qldPhoto('2gv3Q1NPuupf08YfbOmHcs', '2qL25r5IQOdazrR88tcpwN',
      'A whole pink-red adult red emperor in profile, showing its deep body, steep forehead and dorsal fin.')
  },
  {
    id: 'bluebarred-parrotfish', name: 'Bluebarred parrotfish', family: 'Parrotfish', scientificName: 'Scarus ghobban',
    guide: 2360, feature: 'Look for a beak made of fused teeth. The yellow-brown colour phase has blue markings on the face and irregular bars on the side. Large males can look blue-green.',
    rulesNote: parrotfishLimits,
    photo: observationPhoto(162883222, 'Paul Asman and Jill Lenoble',
      'A single bluebarred parrotfish swimming above coral, with blue lines around its lips and eye.', true)
  },
  {
    id: 'swarthy-parrotfish', name: 'Swarthy parrotfish', family: 'Parrotfish', scientificName: 'Scarus niger',
    guide: 926, feature: 'Also called dusky or black parrotfish. Large males have a dark body and a small, dark-edged yellow to green spot high behind the gill cover. Juveniles have two black spots at the white base of the tail.',
    rulesNote: parrotfishLimits,
    photo: observationPhoto(160741196, 'Paul Asman and Jill Lenoble',
      'A single dark, blue-green swarthy parrotfish among coral, with reddish margins on its fins.', true)
  },
  {
    id: 'venus-tuskfish', name: 'Venus tuskfish', family: 'Tuskfish', scientificName: 'Choerodon venustus',
    guide: 1929, feature: 'Look for separate front tusks, tiny blue spots on the adult’s scales and a pink-red area near the side fin. True parrotfish have teeth fused into a beak.',
    rulesNote: tuskfishLimits,
    photo: qldPhoto('24sROQKqDDB7I6wxzkUuHV', '7xqcxm19XUqBrq2kHYwWY5',
      'Fisheries photograph of a Venus tuskfish with blue-dotted scales and the pink flank marked by a circle.')
  },
  {
    id: 'blackspot-tuskfish', name: 'Blackspot tuskfish', family: 'Tuskfish', scientificName: 'Choerodon schoenleinii',
    guide: 1928, feature: 'Look for a black spot where the last dorsal-fin spine meets the back. It can be faint. Check the blue marks on the scales and the separate front tusks.',
    rulesNote: tuskfishLimits,
    photo: qldPhoto('6DlGnD3iiXp0gIF2UhAAMP', '7xqcxm19XUqBrq2kHYwWY5',
      'A whole blackspot tuskfish with the dark spot at its dorsal fin and the stripes near its tail circled.')
  },
  {
    id: 'goldspotted-sweetlips', name: 'Goldspotted sweetlips', family: 'Sweetlips', scientificName: 'Plectorhinchus flavomaculatus',
    guide: 454, feature: 'Follow the orange and blue lines across the face. Small gold-orange spots cover the upper sides and fins. Look for a dark edge along the bottom of the tail.',
    rulesNote: 'Minimum 25 cm. You can possess up to 5 of this sweetlips species.',
    photo: observationPhoto(429197067, 'Hayley P',
      'Side view of a whole goldspotted sweetlips, showing fine gold spots and stripes on its cheek.')
  }
];

export const reefSpecies = entries.map(({ guide, photo, rulesNote, ...entry }) => ({
  ...entry, group: 'Fish', measure: 'length', eligible: true,
  searchNames: ['Point Lookout reef', 'Flat Rock', 'Flatrock',
    entry.family === 'Parrotfish' ? 'parrot fish' : '', entry.id === 'red-emperor' ? 'red emporer red emperer' : ''].join(' '),
  reference: 'https://fishesofaustralia.net.au/home/species/' + guide,
  localUrl: pointLookoutSurvey, localNote: regionalNote,
  rulesUrl: keepingRules, rulesNote: rulesNote + ' ' + reefPossession,
  photo: {
    ...photo, title: entry.name, license: 'CC BY 4.0', licenseUrl: attributionLicence,
    src: '/assets/fish/' + entry.id + '.webp'
  }
}));

