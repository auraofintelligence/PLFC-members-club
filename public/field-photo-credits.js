// Credits for the source-sized reference photographs served with the species guide.
const qldSpecies='https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/fish-species-guide/fish-species-id/species-page?';
const flatheadGroup='grid=aCdT5EmDvH6FjVjwy1ZNg&id=';
const northernSand=flatheadGroup+'1A2Cx0v4f6tiEchh2JiqgB',bartail=flatheadGroup+'7soBOcap7S6aTwPkbwd57n',dusky=flatheadGroup+'422UQoyv7tWnMybkeCaxCN';
function fisheriesPhoto(title,record,alt,changes){
  return {title,credit:'© The State of Queensland (Fisheries Queensland)',sourceUrl:qldSpecies+record,
    license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',alt,changes};
}
export const flatheadTails={
  'sand-flathead':{...fisheriesPhoto('Northern sand flathead tail',northernSand,'A spread northern sand flathead tail with multiple narrow dark stripes above two broad lower stripes.','Converted to WebP'),src:'/assets/fish/sand-flathead-tail.webp'},
  'bartail-flathead':{...fisheriesPhoto('Bartail flathead tail',bartail,'A spread bartail flathead tail with yellow between dark bars.','Black frame trimmed and converted to WebP'),src:'/assets/fish/bartail-flathead-tail.webp'},
  'dusky-flathead':{...fisheriesPhoto('Dusky flathead tail',dusky,'A bluish-grey dusky flathead tail with a dark blotch towards its upper outer edge.','Converted to WebP'),src:'/assets/fish/dusky-flathead-tail.webp'},
};
export const fieldPhotoCredits = {
  'spotted-mackerel': {
    title: 'Spotted Mackerel, Status of Australian Fish Stocks 2023',
    credit: 'Fisheries Research and Development Corporation', license: 'CC BY 3.0 AU',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/au/',
    sourceUrl: 'https://www.fish.gov.au/report/396-Spotted-Mackerel-2023',
    alt: 'A silver spotted mackerel with rows of round dark spots along its sides and a forked tail.',
    changes: 'Web-sized JPEG copy'
  },
  'australian-bonito': {
    title: 'Australian Bonito, Status of Australian Fish Stocks 2023',
    credit: 'Fisheries Research and Development Corporation', license: 'CC BY 3.0 AU',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/au/',
    sourceUrl: 'https://www.fish.gov.au/report/398-Australian-Bonito-2023',
    alt: 'An Australian bonito in side view, with dark lengthwise stripes on its upper body.',
    changes: 'Web-sized JPEG copy'
  },
  "australian-cownose-ray": {
    title: "Rhinoptera neglecta.jpg",
    credit: "Richard ling",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Rhinoptera_neglecta.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0"
  },
  'bartail-flathead':{...fisheriesPhoto('Bartail flathead',bartail,'A whole bartail flathead on a pale surface. Its fanned tail shows a yellow patch between dark bars.','Black frame trimmed and resized'),tailPhoto:flatheadTails['bartail-flathead']},
  "cobia": {
    title: "Rachycentron canadum.jpg",
    credit: "Jorge Alarcon or Dr. Daniel Benetti",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Rachycentron_canadum.jpg",
    license: "Public domain",
    licenseUrl: ""
  },
  "dusky-whaler": {
    title: "Carcharhinus obscurus gold coast.jpg",
    credit: "Steve Garner",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Carcharhinus_obscurus_gold_coast.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0"
  },
  "eastern-fiddler-ray": {
    title: "Trygonorrhina fasciata jervis bay.jpg",
    credit: "Sylke Rohrlach from Sydney",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Trygonorrhina_fasciata_jervis_bay.jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "eastern-shovelnose-ray": {
    title: "Aptychotrema rostrata sydney.jpg",
    credit: "Taso Viglas from Sydney, Australia",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aptychotrema_rostrata_sydney.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0"
  },
  "golden-trevally": {
    title: "Gnathanodon speciosus 1.jpg",
    credit: "Stan Shebs",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Gnathanodon_speciosus_1.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0"
  },
  luderick:{title:'Luderick in side profile',credit:'hazelvalerie',sourceUrl:'https://www.inaturalist.org/observations/104954125',
    license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',changes:'Cropped around the single whole fish',
    alt:'One luderick lying side-on on timber boards, with the tail, short mouth and dark upright bars on its silver flank visible.'},
  'pearl-perch':fisheriesPhoto('Pearl perch','grid=5SpSTPupxoJTvvHgS1ae7h&id=7u0xUXD9va2LeSOusbFmRn','One pearl perch in side profile on white, showing a deep silver body, large eye, gill cover and dark fins.','Outer white margin trimmed'),
  'sand-flathead':{...fisheriesPhoto('Northern sand flathead',northernSand,'One long northern sand flathead seen from the side on a pale surface, with a spread tail showing dark stripes.','Black frame trimmed and resized'),tailPhoto:flatheadTails['sand-flathead']},
  "sandtiger-shark": {
    title: "Odontaspis ferox 2.jpg",
    credit: "NOAA",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Odontaspis_ferox_2.jpg",
    license: "Public domain",
    licenseUrl: ""
  },
  "scalloped-hammerhead": {
    title: "Scalloped Hammerhead Shark Sphyrna Lewini (226845659).jpeg",
    credit: "Kris Mikael Krister",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Scalloped_Hammerhead_Shark_Sphyrna_Lewini_(226845659).jpeg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0"
  },
  "school-mackerel": {
    title: "Queensland School Mackerel (Scomberomorus queenslandicus) in a sink.jpg",
    credit: "Alan Couch from Canberra, ACT, Australia",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Queensland_School_Mackerel_(Scomberomorus_queenslandicus)_in_a_sink.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0"
  },
  "silver-trevally": {
    title: "Silver trevally.jpg",
    credit: "Kare Kare",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Silver_trevally.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0"
  },
  "smooth-stingray": {
    title: "Dasyatis brevicaudata schnapper.jpg",
    credit: "Alpha from Melbourne, Australia",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dasyatis_brevicaudata_schnapper.jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "spotted-wobbegong": {
    title: "Orectolobus maculatus sydney.jpg",
    credit: "Taso Viglas from Sydney, Australia",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Orectolobus_maculatus_sydney.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0"
  },
  "tarwhine": {
    title: "Rhabdosargus sarba 188695576.jpg",
    credit: "Greg Tasney",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Rhabdosargus_sarba_188695576.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0"
  },
  'winter-whiting':fisheriesPhoto('Trumpeter whiting','grid=4x0LLvbAQ88zafhqiDCque&id=4azaVtX9u7W0ZTFw7PfIK3','One whole silver winter whiting in side profile, with irregular dark blotches along its upper flank and a forked tail.','Outer white margin trimmed')
};
