const qldTuna = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/fish-species-guide/fish-species-id/species-page?grid=5rr72qrvZLBqeT3iK6bghN&id=';
const longtailGuide = qldTuna + '3BiGai2L9L5ku8pOjQq1eI';
const localSurvey = 'https://doi.org/10.1186/s40064-015-1391-y';
const museumCredit = 'Jeffrey Williams, Smithsonian National Museum of Natural History, via the US Food and Drug Administration';
const collectionLicence = 'Public domain, US Government work';
const collectionLicenceUrl = 'https://commons.wikimedia.org/wiki/Template:PD-USGov-HHS-FDA';
const generalRule = 'Queensland lists no size limit and a general recreational possession limit of 20 for this species. Count fish you still have at home as well as those on board.';

const records = [
  {
    id: 'longtail-tuna', name: 'Longtail tuna', scientificName: 'Thunnus tonggol',
    reference: 'https://fishesofaustralia.net.au/home/species/734',
    feature: 'Look for a long, slender stretch of body just in front of the tail. The back is plain dark blue. Faint oval spots can show on the belly.',
    habitatNote: 'Moreton Bay and the open coast. Longtails follow baitfish in clear coastal water.',
    habitatSource: longtailGuide,
    rulesNote: 'Queensland lists no size limit and a general possession limit of 20 for longtail tuna. Count fish already at home.',
    rulesUrl: longtailGuide,
    photo: {
      alt: 'Side view of a longtail tuna showing the long, narrow section between its body and tail',
      credit: museumCredit, sourceUrl: 'https://www.flickr.com/photos/fdaphotos/53251861454/',
      license: collectionLicence, licenseUrl: collectionLicenceUrl,
      changes: 'Resized for the guide'
    }
  },
  {
    id: 'mackerel-tuna', name: 'Mackerel tuna', scientificName: 'Euthynnus affinis',
    reference: 'https://fishesofaustralia.net.au/home/species/720',
    feature: 'Dark scribbles cover the back behind the first dorsal fin. Look for small black spots between the side and belly fins. Australian bonito have long stripes along the back.',
    habitatNote: 'Also called mac tuna. Researchers recorded this schooling coastal tuna between Bribie and Moreton islands.',
    habitatSource: localSurvey, rulesNote: generalRule, rulesUrl: qldTuna + '4TKvXSmhq32yEdbwvxMXg1',
    photo: {
      alt: 'Side view of a mackerel tuna with dark, wavy markings on its upper back',
      credit: 'Wibowo Djatmiko (Wie146)',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Euthyn_affin_101018-8107_tdp.jpg',
      license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
      changes: 'Cropped from the resized Catch Signal copy and compressed for the guide'
    }
  },
  {
    id: 'skipjack-tuna', name: 'Skipjack tuna', scientificName: 'Katsuwonus pelamis',
    reference: 'https://fishesofaustralia.net.au/home/species/724',
    feature: 'Check the silver belly for four to six dark stripes running lengthways. On a mac tuna the obvious wavy markings sit high on the back.',
    habitatNote: 'An open-water schooling tuna. A Queensland research crew recorded skipjack on a trip in the northern Moreton Bay area.',
    habitatSource: localSurvey, rulesNote: generalRule, rulesUrl: qldTuna + '5EK06WY7iMfVHEAl11FkX',
    photo: {
      alt: 'Side view of a skipjack tuna with several dark stripes running along its lower flank',
      credit: museumCredit, sourceUrl: 'https://www.flickr.com/photos/fdaphotos/53251781073/',
      license: collectionLicence, licenseUrl: collectionLicenceUrl,
      changes: 'Resized for the guide'
    }
  },
  {
    id: 'yellowfin-tuna', name: 'Yellowfin tuna', scientificName: 'Thunnus albacares',
    reference: 'https://fishesofaustralia.net.au/home/species/731',
    feature: 'Large adults have two long, curved yellow fins, one above and one below the body. Small yellow finlets run towards the tail. Young yellowfin resemble bigeye tuna and need a closer ID.',
    habitatNote: 'Offshore Queensland. Yellowfin travel in open water and can school with other tunas.',
    habitatSource: 'https://www.afma.gov.au/species/yellowfin-tuna',
    rulesNote: generalRule, rulesUrl: qldTuna + '52HrlZQRZjeOFABbWdK6D8',
    photo: {
      alt: 'Adult yellowfin tuna swimming side-on, with two long curved fins and a row of bright yellow finlets',
      credit: 'Al McGlashan', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Al_mcglashan_tuna.jpg',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      changes: 'Cropped and resized. This version is shared under the same licence'
    }
  }
];

export const tunaSpecies = records.map(species => ({
  ...species, group: 'Fish', family: 'Tunas', measure: 'length', eligible: true,
  photo: {...species.photo, src: '/assets/fish/' + species.id + '.jpg'}
}));
