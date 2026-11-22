import {reefSpecies} from './reef-species.mjs';
import {tunaSpecies} from './tuna-species.mjs';
import {coastSharks} from './shark-coast.mjs';

// A stable ID keeps the same species together across seasons and different club forms.
const finfish=[
  ['sand-whiting','Sand whiting'],['yellowfin-bream','Yellowfin bream'],['dusky-flathead','Dusky flathead'],
  ['tailor','Tailor'],['snapper','Snapper'],['spanish-mackerel','Spanish mackerel'],
  ['swallowtail-dart','Swallowtail dart'],['mulloway','Mulloway'],['winter-whiting','Winter whiting'],
  ['bartail-flathead','Bartail flathead'],['sand-flathead','Northern sand flathead'],['tarwhine','Tarwhine'],
  ['luderick','Luderick'],['silver-trevally','Silver trevally'],['golden-trevally','Golden trevally'],
  ['australian-bonito','Australian bonito'],['spotted-mackerel','Spotted mackerel'],
  ['school-mackerel','School mackerel'],['pearl-perch','Pearl perch'],['cobia','Cobia'],
];
const sharks=[
  ['spotted-wobbegong','Spotted wobbegong'],['dusky-whaler','Dusky whaler'],
  ['grey-nurse-shark','Grey nurse shark',false],['sandtiger-shark','Sandtiger shark (Odontaspis ferox)',false],
  ['scalloped-hammerhead','Scalloped hammerhead',false],
];
const rays=[
  ['eastern-shovelnose-ray','Eastern shovelnose ray',true,'length'],
  ['eastern-fiddler-ray','Eastern fiddler ray',true,'length'],
  ['smooth-stingray','Smooth stingray'],['australian-cownose-ray','Australian cownose ray'],
  ['reef-manta-ray','Reef manta ray',false],
];
const group=(label,rows,defaultMeasure)=>rows.map(([id,name,eligible=true,measure=defaultMeasure])=>({id,name,group:label,measure,eligible}));
const families = {
  'Whiting': ['sand-whiting','winter-whiting'],
  'Flatheads': ['dusky-flathead','bartail-flathead','sand-flathead'],
  'Bream and snapper': ['yellowfin-bream','tarwhine','snapper'],
  'Trevallies and dart': ['silver-trevally','golden-trevally','swallowtail-dart'],
  'Mackerels': ['school-mackerel','spotted-mackerel','spanish-mackerel'],
  'Tunas and bonitos': ['australian-bonito'],
  'Other finfish': ['luderick','pearl-perch','tailor','mulloway','cobia'],
  'Whaler sharks': ['dusky-whaler','bull-shark','common-blacktip-shark','australian-blacktip-shark','australian-sharpnose-shark'],
  'Other sharks': ['spotted-wobbegong','grey-nurse-shark','sandtiger-shark','scalloped-hammerhead'],
  'Shovelnose and fiddler rays': ['eastern-shovelnose-ray','eastern-fiddler-ray'],
  'Other rays': ['smooth-stingray','australian-cownose-ray','reef-manta-ray'],
};
const familyById = new Map(Object.entries(families).flatMap(([family,ids])=>ids.map(id=>[id,family])));
const all = [...group('Fish',finfish,'length'), ...tunaSpecies.map(s=>({...s,family:'Tunas and bonitos'})), ...reefSpecies.map(s=>({...s,reefGuide:true})),
  ...group('Sharks',sharks,'length'), ...coastSharks, ...group('Rays',rays,'disc width')];
const familyOrder = [...Object.keys(families).slice(0,6), ...new Set(reefSpecies.map(s=>s.family)), ...Object.keys(families).slice(6)];
export const catchSpecies = all.map(s=>({...s,family:s.family||familyById.get(s.id)}))
  .sort((a,b)=>familyOrder.indexOf(a.family)-familyOrder.indexOf(b.family));

// Keep related species together even when search or competition filters narrow the list.
export function speciesFamilies(species) {
  const groups = new Map();
  for (const fish of species) {
    if (!groups.has(fish.family)) groups.set(fish.family, []);
    groups.get(fish.family).push(fish);
  }
  return [...groups.entries()];
}
