const qldGuide = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/fish-species-guide/fish-species-id/species-page?';
const qldLimits = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal';
const foa = 'https://fishesofaustralia.net.au/home/species/';
const mulletRule = 'No minimum size. Up to 50 other mullet in total, excluding sea, diamondscale and freshwater mullet.';
const largeMulletRule = 'Minimum 30 cm, possession limit 20. This also applies when the fish is for bait.';
const noLimits = 'Fisheries Queensland lists no size or possession limit for this species. Check the local zone and gear rules.';
const observerPhoto = (id, credit, observation, alt) => ({
  src: '/assets/fish/' + id + '.webp', alt, credit,
  sourceUrl: 'https://www.inaturalist.org/observations/' + observation,
  license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  changes: 'Cropped and converted to WebP'
});
function guidePhoto(id, credit, speciesNumber, alt) {
  return {src:'/assets/fish/'+id+'.webp',alt,credit,sourceUrl:foa+speciesNumber,
    license:'Creative Commons Attribution, as credited by Fishes of Australia',licenseUrl:foa+speciesNumber,changes:'Resized and converted to WebP'};
}

export const baitfishPhotos = [
  {
    id: 'australian-sardine', name: 'Australian sardine (pilchard)', scientificName: 'Sardinops sagax',
    feature: 'Look along the blue-green back for a line of small dark spots just above the silver sides.',
    reference: 'https://fishesofaustralia.net.au/home/species/2067', rulesNote: noLimits,
    rulesUrl: qldGuide + 'grid=5G8Kbeu89yqMDJENDpRsDl&id=2dEYexHqiGGG2wsWsuD9XU',
    photo: {
      src: '/assets/fish/australian-sardine.webp', alt: 'Side of an Australian sardine with small dark spots high on the flank',
      credit: 'Fisheries Research and Development Corporation',
      sourceUrl: 'https://www.fish.gov.au/report/311-Australian-Sardine-2023',
      license: 'CC BY 3.0 AU', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/au/',
      changes: 'Resized and converted to WebP'
    }
  },
  {
    id: 'australian-anchovy', name: 'Australian anchovy', scientificName: 'Engraulis australis',
    feature: 'A short, round snout overhangs a large mouth. A broad silver stripe runs along the slender body.',
    reference: 'https://fishesofaustralia.net.au/home/species/2071', rulesNote: noLimits,
    rulesUrl: qldGuide + 'grid=5G8Kbeu89yqMDJENDpRsDl&id=1ltReDl2dZENRM56dzH1MS',
    photo: observerPhoto('australian-anchovy', 'Thomas Mesaglio', 217199985, 'Single silvery Australian anchovy on sand, with a rounded snout and large mouth')
  },
  {
    id: 'common-hardyhead', name: 'Common hardyhead', scientificName: 'Atherinomorus vaigiensis',
    feature: 'A small coastal fish with a narrow silver stripe through the middle of its side. Look closely for dark edges on the side fins and tail.',
    reference: 'https://fishesofaustralia.net.au/home/species/4631', rulesNote: noLimits,
    rulesUrl: qldGuide + 'grid=5Af8uMIgobTIFmwLJeKoou&id=4LhpTeX27EPwWaH5l6cTAh',
    photo: observerPhoto('common-hardyhead', 'Tom Ferguson', 412381483, 'One common hardyhead swimming side-on, showing its silver flank and forked tail')
  },
  {
    id: 'yellowtail-pike', name: 'Yellowtail pike', scientificName: 'Sphyraena obtusata',
    feature: 'Look for the pointed snout, long narrow body and two faint lines along the sides. Some have a yellow stripe and a bright yellow tail.',
    reference: 'https://fishesofaustralia.net.au/home/species/2547',
    rulesNote: 'Fisheries Queensland lists no size limit and a possession limit of 50. Check the local zone and gear rules.',
    rulesUrl: qldGuide + 'grid=2jRGx1xl8IOUBVCaZ6IvyA&id=obfR4TPoNmYnJfbrBphsl',
    photo: observerPhoto('yellowtail-pike', 'Tim', 241634084, 'A yellowtail pike over kelp with a pointed head, yellow side stripe and forked yellow tail')
  },
  {
    id:'sea-mullet', name:'Sea mullet', scientificName:'Mugil cephalus',
    feature:'Broad, flat head and a dark patch at the base of the side fin. Larger fish have a clear, thick eyelid partly covering the eye.',
    reference:foa+'3880', rulesNote:largeMulletRule,
    rulesUrl:qldGuide+'grid=3DYExi0mkn7plZNRo9jzs2&id=6arKszwzGNX4aiyHUfGLQS',
    photo:guidePhoto('sea-mullet','Rick Stuart-Smith / Reef Life Survey',3880,'Sea mullet side-on above a school, with a broad head and dark lines along the flanks')
  },
  {
    id:'diamondscale-mullet', name:'Diamondscale mullet', scientificName:'Ellochelon vaigiensis',
    feature:'Dark edges make a net-like pattern on the scales. Look for a nearly square tail. Young fish often have striking black side fins.',
    reference:foa+'4420', rulesNote:largeMulletRule,
    rulesUrl:qldGuide+'grid=3DYExi0mkn7plZNRo9jzs2&id=4QfxpgxYM2vbXIRHjlNbKs',
    photo:guidePhoto('diamondscale-mullet','Anne Hoggett / Lizard Island Field Guide',4420,'Several diamondscale mullet showing their blunt-ended tails and large scales')
  },
  {
    id:'goldspot-mullet', name:'Goldspot mullet (flat-tail)', scientificName:'Gracilimugil argentea',
    feature:'A gold patch high on the rear of the gill cover. Also look for dark back and tail fins. Sand mullet can have a gold gill mark too.',
    reference:foa+'4538', rulesNote:mulletRule,
    rulesUrl:qldGuide+'grid=3DYExi0mkn7plZNRo9jzs2&id=3yaJNlo8Gs5UE50RL6gc9G',
    photo:observerPhoto('goldspot-mullet','James H',218012413,'One whole goldspot mullet with dark fins and a small gold mark on the gill cover')
  },
  {
    id:'sand-mullet', name:'Sand mullet', scientificName:'Myxus elongatus',
    feature:'Look for a gold patch on the gill cover, a black spot above the side-fin base and a pale margin on the fin beneath the tail end. Small mullet can be hard to separate.',
    reference:foa+'3487', rulesNote:mulletRule,
    rulesUrl:qldGuide+'grid=3DYExi0mkn7plZNRo9jzs2&id=7pycpSKa8Ayvpjfac3Eksk',
    photo:{...observerPhoto('sand-mullet','Lawrence Hylton',326300433,'A sand mullet at the water surface, showing the dark mark where the side fin meets the body'),
      changes:'Resized and converted to WebP'}
  },
  {
    id:'yellowtail-scad', name:'Yellowtail scad (yakka)', scientificName:'Trachurus novaezelandiae',
    feature:'Large eye, forked yellow tail and a small dark patch on the gill cover. The body is much deeper than a pike and the snout is short.',
    reference:'https://australian.museum/learn/animals/fishes/yellowtail-scad-trachurus-novaezelandiae/',
    rulesNote:'No minimum size. Count yakkas towards Queensland’s combined limit of 20 for the trevally group. Some trevallies have separate limits.',
    rulesUrl:qldGuide+'grid=10IvgwBGiAgoa5CXg3bLhx&id=45fMe53YwLA6gLzybifmwj',
    photo:observerPhoto('yellowtail-scad','Lek Khauv',103464060,'Whole yellowtail scad with a bright yellow forked tail, round eye and dark gill mark')
  },
  {
    id:'eastern-sea-garfish', name:'Eastern sea garfish', scientificName:'Hyporhamphus australis',
    feature:'The lower jaw forms a long, thin beak below a short upper jaw. Look for a blue-edged silver side stripe. Longtoms have two long, toothed jaws.',
    reference:foa+'4490', rulesNote:'No minimum size. All garfish species count towards one combined possession limit of 50.',
    rulesUrl:qldLimits+'#garfish',
    photo:observerPhoto('eastern-sea-garfish','Thomas Mesaglio',15385992,'Side view of an eastern sea garfish with the long lower jaw extending to the left')
  },
  {
    id:'southern-herring', name:'Southern herring', scientificName:'Herklotsichthys castelnaui',
    feature:'Silvery, deep-bodied schooling fish. Adults may show a brown shoulder mark and fine gold streaks along the back. A wolf herring has a much longer body and prominent teeth.',
    reference:foa+'2054', rulesNote:'No size or possession limit for these herring. Dorab wolf herring is a different fish with its own limit of 10.',
    rulesUrl:qldGuide+'grid=5G8Kbeu89yqMDJENDpRsDl&id=7jSIerRh0kenMOk6Nyo1uP',
    photo:observerPhoto('southern-herring','Greg Wallis',358687444,'Southern herring swimming side-on in shallow water with dark marks near the gill covers')
  },
  {
    id:'silver-biddy', name:'Common silver biddy', scientificName:'Gerres subfasciatus',
    feature:'A deep silver body, tall dark-tipped spines at the front of the back fin, and a little mouth that extends forwards and down to feed on the bottom.',
    reference:foa+'2435', rulesNote:noLimits, rulesUrl:qldLimits+'#worms',
    photo:{...observerPhoto('silver-biddy','Tricia Kaye',259108238,'A common silver biddy beside seaweed, showing its tall front dorsal spines'),
      license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'}
  }
];

export const pikeComparisons=[
  {name:'Longfin pike',scientificName:'Dinolestes lewini',reference:foa+'4241',
    feature:'The second back fin and the fin underneath run a long way towards the tail. Museums Victoria places its eastern range from about Forster, NSW, southwards.',
    photo:{...observerPhoto('longfin-pike-comparison','Josh Nitschke',303395325,'Longfin pike in side view with its long rear fins'),
      changes:'Rotated, cropped and converted to WebP'}},
  {name:'Snook (shortfin pike)',scientificName:'Sphyraena novaehollandiae',reference:foa+'2550',
    feature:'Two short back fins, a narrow pointed head and a long greenish body. Museums Victoria lists this species in southern Australia.',
    photo:guidePhoto('snook-comparison','Rick Stuart-Smith / Reef Life Survey',2550,'Long greenish snook with two widely spaced short back fins')},
];
