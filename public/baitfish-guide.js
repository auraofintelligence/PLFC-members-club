import {baitfishPhotos,pikeComparisons} from './baitfish-photos.mjs';
import {fieldPhotoCredit} from './field-species.js';

const gear='https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/equipment';
const zones='https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps';
const closures='https://www.dpi.qld.gov.au/services/fisheries/closures/regulated-waters';
const bait='https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/bait';
const more=(href,label)=>'<a href="'+href+'" target="_blank" rel="noopener">'+label+'</a>';
const groups=[
  {title:'Mullet',hint:'Sea, diamondscale, goldspot and sand mullet',ids:['sea-mullet','diamondscale-mullet','goldspot-mullet','sand-mullet'],
    help:'“Poddy” is used for young mullet of several species. A small fish can already be an undersize sea, diamondscale or freshwater mullet. If you cannot tell which it is, slip it back.'},
  {title:'Pike and yellowtail scad',hint:'Pointed snout or short head and a big eye?',ids:['yellowtail-pike','yellowtail-scad'],
    help:'“Yellowtail” can mean a pike or a yakka. Their possession limits are different. Start with the shape of the head.'},
  {title:'Small schooling fish',hint:'Pilchards, anchovies, herring and hardyhead',ids:['australian-sardine','australian-anchovy','southern-herring','common-hardyhead'],
    help:'Schools can contain more than one species. Sort a small catch immediately and release anything you cannot identify.'},
  {title:'Garfish and silver biddy',hint:'Long-jawed surface feeders or deep-bodied bottom feeders',ids:['eastern-sea-garfish','silver-biddy'],
    help:'Look at which part of the water the fish uses. A small float suits a surface feeder; a lightly weighted bait can reach a biddy below.'}
];
const methods={
  'sea-mullet':['Look for a steady school cruising sheltered estuary edges or the inside of a surf gutter.','Drift a small piece of bread on a small single hook beneath a float. Let the fish take it before lifting. Measure the whole fish.'],
  'diamondscale-mullet':['Watch shallow, quiet estuary edges for large scales and a square-ended tail.','Where cast nets are permitted, make one small cast ahead of the school from firm footing. Release the other fish and measure any diamondscale.'],
  'goldspot-mullet':['Look in bays and lower estuaries for mullet feeding near the surface.','Let a small bread bait on a single fine hook drift with the school. Check the gill cover and fins in good light.'],
  'sand-mullet':['Watch sandy shallows in a lower estuary for slender mullet moving in a group.','Drift a pinched flake of bread just below the surface on a small hook and light float. Keep the fish in the water while checking its markings.'],
  'yellowtail-pike':['Look for pointed fish patrolling the edge of a small bait school in a bay or estuary.','Retrieve a small shiny lure beside the school. Use long-nose pliers to remove the hook and keep your fingers clear of its teeth.'],
  'yellowtail-scad':['Look for a tight school partway down in clear water beside a wharf or a boat. Leave ferry and boat traffic room.','Lower a small bait jig to the school and lift gently. Bring it back as soon as a fish is on so spare hooks stay manageable.'],
  'australian-sardine':['Look for a fast, flashing school near the surface in sheltered coastal water.','If a cast net is permitted here and the school comes within reach, cast over its edge. Check for the row of flank spots before keeping a few.'],
  'australian-anchovy':['Watch for very slim silver fish in bays and lower estuaries. Check the large mouth beneath the nose.','Use a permitted cast net from a clear bank when the school is close. Wet your hands, sort promptly and let surplus fish go while lively.'],
  'southern-herring':['Watch for a school turning together in a sheltered inlet or lower estuary.','Drop a small bait jig alongside the passing school and lift gently. Check the shoulder mark, fins and body shape against the photo.'],
  'common-hardyhead':['Look in very shallow, sheltered coastal water for a pencil-like silver stripe on a small fish.','One small cast with a permitted cast net at the edge of a school is enough to check what is there. Release juvenile whiting and other bycatch straightaway.'],
  'eastern-sea-garfish':['Watch the surface of sheltered coastal bays for slender fish with a long lower jaw.','Suspend a tiny piece of prawn sold as fishing bait under a small float. Let it drift near the surface and lift gently when the float moves away.'],
  'silver-biddy':['Look for small, deep-bodied fish feeding over a sandy or muddy estuary bottom.','Try a tiny piece of marine worm on a small single hook with just enough weight to reach the bottom. Compare the mouth and dorsal spines with a juvenile bream.']
};
const byId=new Map(baitfishPhotos.map(fish=>[fish.id,fish]));
function card(fish){
  const [where,how]=methods[fish.id];
  return `<details class="field-card field-more bait-id-card" name="bait-fish"><summary>
    <span class="field-photo"><img src="${fish.photo.src}" alt="${fish.photo.alt}" loading="lazy"></span>
    <span class="field-card-label"><strong>${fish.name}</strong><span class="field-open-label">Identify and catch</span></span></summary>
    <div class="field-card-copy"><p><i>${fish.scientificName}</i></p><p><strong>Look for</strong> ${fish.feature}</p>
    <ol><li>${where}</li><li>${how}</li></ol><p><strong>Before keeping one</strong> ${fish.rulesNote}</p>
    <p>${more(fish.rulesUrl,'Queensland limits')} · ${more(fish.reference,'Compare identification photos')}</p>
    <details><summary>Photo credit</summary><small>${fieldPhotoCredit(fish.photo)}</small></details></div></details>`;
}
function pikeNames(){
  return `<details class="care-further"><summary>What about longfin pike and snook?</summary><p>The Queensland bait listing names yellowtail pike, <i>Sphyraena obtusata</i>. These two southern lookalikes have their own names and ranges.</p>
    <div class="guide-species-grid">${pikeComparisons.map(f=>`<figure class="field-photo"><img src="${f.photo.src}" alt="${f.photo.alt}" loading="lazy">
    <figcaption><strong>${f.name}</strong> · <i>${f.scientificName}</i><p>${f.feature} ${more(f.reference,'Museum guide')}.</p>
    <details><summary>Photo credit</summary>${fieldPhotoCredit(f.photo)}</details></figcaption></figure>`).join('')}</div></details>`;
}
export function baitfishGuideHtml(){
  return `<section class="bait-shore" aria-label="Tidal baitfish"><h3>Which baitfish have I caught?</h3>
    <p>Choose a group and tap a photo. Each fish has a way to recognise it, a way to catch a few and its Queensland possession limit.</p>
    ${groups.map((group,i)=>`<details class="care-further bait-fish-family" name="bait-fish-family"${i===0?' open':''}>
      <summary><strong>${group.title}</strong> · ${group.hint}</summary><p>${group.help}</p>
      <div class="guide-species-grid">${group.ids.map(id=>card(byId.get(id))).join('')}</div>${i===1?pikeNames():''}</details>`).join('')}
    <details class="care-further"><summary>Where can I collect bait?</summary><p>Check the exact shore or boat position on the ${more(zones,'Moreton Bay zoning map')} and the ${more(closures,'Queensland closed-waters maps')}. Green zones exclude recreational bait collection. In any other zone, check that your intended net or line is allowed.</p>
    <p>Queensland tidal rules allow up to three attended lines and six hooks in total. Fisheries counts a bait jig as one hook. Leave space to cast and stop as soon as you have enough. ${more(gear,'Queensland fishing gear rules')}.</p></details>
    <details class="care-further"><summary>Buying or moving bait</summary><p>Use local bait in the waterway where you caught it. Choose prawns sold as bait. Raw prawns sold for food can carry diseases into local waters. ${more(bait,'Queensland bait and movement advice')}.</p></details>
  </section>`;
}
