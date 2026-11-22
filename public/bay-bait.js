import {pipiChoices} from './pipi-guide.js';
const base='/assets/bait/bay/';
const limits='https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal';
const biosecurity='https://www.business.qld.gov.au/industries/farms-fishing-forestry/agriculture/biosecurity/animals/diseases/white-spot-disease/movement-restrictions';
const maps='https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps';
const cite=(url,label)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>';
const commons=(file,label)=>cite('https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file.replaceAll(' ','_')),label);
const cc=(license,label)=>cite('https://creativecommons.org/'+license+'/',label);
const photos={
  prawns:['Eastern king prawn with its shell, head and tail intact.','An eastern king prawn. Keep your catch whole.',cite('https://www.fish.gov.au/report/292-Eastern-King-Prawn-2023','Fisheries Research and Development Corporation')+' · '+cc('licenses/by/3.0/au','CC BY 3.0 AU')+'. Resized and converted to WebP.'],
  squid:['A bigfin reef squid underwater, showing broad fins on either side of the mantle and arms gathered in front.','Tiger squid in shallow Queensland water.',commons('Bigfin Reef Squid (Sepioteuthis lessoniana) in shallow waters at Yule Point (Great Barrier Reef Marine Park).jpg','Hugo Innes, Yule Point')+' · '+cc('licenses/by-sa/4.0','CC BY-SA 4.0')+'. Resized and converted to WebP under the same licence.'],
  'squid-jig':['Side view of a squid jig with its weighted keel below the head and a crown of hooks at the tail.','A squid jig. Look for the little weight at the front and the crown of points at the tail.',commons('Worlds first hand made leather squid jigs.jpg','RoccoTorezz')+' · '+cc('licenses/by-sa/4.0','CC BY-SA 4.0')+'. Cropped and converted to WebP under the same licence.'],
  pipis:['Two halves of a wedge-shaped pipi shell with pale violet interiors.','An open pipi shell. The two halves are the valves of one animal.',commons('Plebidonax deltoides (common pipi clam shell) (marine beach at Port Germein, South Australia).jpg','James St. John, Port Germein')+' · '+cc('licenses/by/2.0','CC BY 2.0')+'. Cropped and converted to WebP.']
};
function figure(key){
  const [alt,caption,credit]=photos[key];
  return '<figure class="bay-bait-photo"><img src="'+base+key+'.webp" alt="'+alt+'" loading="lazy"><figcaption>'+caption+'<details><summary>Photo credit</summary><small>'+credit+'</small></details></figcaption></figure>';
}
const guides={
  prawns:{
    intro:'For a first go from shore, take a hand-held scoop net and a bucket of local seawater to a sheltered, sandy tidal edge.',
    steps:[
      ['Spot a prawn','Look into calm, shallow water beside patches of weed. Polarised glasses help in daylight. In low light, a torch can pick up the reflection from a prawn’s eyes. Stay on firm footing with a mate.'],
      ['Scoop behind the tail','A startled prawn flicks backwards. Lower the net behind it, guide it into the mesh and lift smoothly. Sort the scoop straight away and release other animals where you caught them.'],
      ['Bait the hook','Use a small whole prawn for bream or flathead. Pass the hook through a tail segment from the side and leave the point clear. Keep the head and shell on a recreationally caught prawn.']
    ],
    links:'<a href="#guide/bait-nets">See the net pictures</a>'+cite('https://youtu.be/ebzJd-ZoYw4','Watch cast-net prawning in the southern bay'),
    rules:'Queensland allows 10 litres of prawns per person, or 20 litres per boat with two or more people aboard. Keep every part attached unless you intend to eat the prawn immediately. A handful is plenty for a short bait session.',
    extra:'<details class="bait-check"><summary>Buying bait or taking it offshore?</summary><p>Buy Australian wild-caught prawns sold as bait. Raw supermarket prawns can carry disease. Check the white spot boundary before moving prawns, yabbies or marine worms. It runs close to Straddie’s ocean side. Keep uncooked bait inside the regulated area, including bait you brought in. Freezing does not destroy the virus.</p><div>'+cite(biosecurity,'See the movement map and exceptions')+cite('https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/bait','Choose bait safely')+'</div></details>'
  },
  squid:{
    intro:'Look for a sandy gap beside weed in clear, sheltered water. From a public jetty, leave the landing and boat approach clear.',
    steps:[
      ['Choose the jig','Try a small, slow-sinking squid jig in shallow water. A size 2.5 is a starting option. Tie it to the end of your leader. Its built-in weight lets it sink.'],
      ['Lift, lift, pause','Cast beside the weed and let the jig sink above it. Give the rod two short lifts, then pause so the jig glides down. Wind in the slack and repeat. Squid often grab on the pause.'],
      ['Bring it in smoothly','When the line feels heavy, wind steadily and use a landing net. Keep the jetty clear of ink. For bait, cut a slender strip of mantle, hook the thick end once and leave the strip free to move.']
    ],
    links:'<a href="#guide/rig">See how to present a squid strip</a>'+cite('https://daiwafishing.com.au/blogs/news/how-to-catch-tiger-squid','Read the Moreton Bay tiger squid walkthrough'),
    rules:'The Queensland possession limit for tiger squid is 20. Other squid and cuttlefish sit in a separate category with a limit of 50. Check the species before using the higher limit. Green zones are closed to recreational squidding.',
    extra:figure('squid-jig')
  },
  pipis:{
    intro:'Eugary is a local name for a pipi. Look for these smooth, wedge-shaped shellfish in wet sand on a surf beach where gathering is permitted.',
    steps:[
      ['Feel the wet sand','Stay in the shallow wash with the surf in view. Shuffle your feet gently in soft sand until you feel a firm shell. Stop if the wash makes it hard to stand.'],
      ['Lift it by hand','Reach down as the wash recedes and lift the pipi with your fingers. Cover your hole. Return small or unwanted pipis to wet sand where you found them.'],
      ['Present a small bait','When ready to fish, use a small piece of the firm foot. Pass it onto a small hook, leaving the point exposed. Try it for whiting, bream or dart.']
    ],
    links:'<a href="#guide/rig">See the light beach rig</a><a href="#guide/kitchen">Open the catch kitchen</a>',
    rules:'Queensland lists a possession limit of 30 across the listed shellfish group. In Moreton Bay, pipis are the exception to the closure for other bivalves and gastropods. Check the zone, beach access and any current closures first.',
    extra:'<figure class="pipi-film"><video controls playsinline preload="none" poster="/assets/bait/bay/pipi-poster.webp" aria-label="A silent clip of a pipi burrowing in wet beach sand"><source src="/assets/bait/bay/pipi-burrowing.mp4" type="video/mp4"></video><figcaption><strong>Watch a pipi bury itself.</strong> The shell works down into the wet sand as the wash passes. Filmed at Tallow Beach, NSW. '+commons('Pippi IMG 2154.webm','Aliceinthealice')+' · '+cc('publicdomain/zero/1.0','CC0')+'.</figcaption></figure>'
  }
};
export function bayBaitHtml(key){
  const g=guides[key];
  return '<p class="bait-intro">'+g.intro+'</p>'+(key==='pipis'?pipiChoices:'')+'<div class="bay-bait-layout">'+figure(key)+'<ol class="bay-bait-steps">'+g.steps.map(([title,body])=>'<li><strong>'+title+'</strong><p>'+body+'</p></li>').join('')+'</ol></div><div class="bait-actions">'+g.links+'</div>'+g.extra+
    '<aside class="bait-check"><h3>What can I keep?</h3><p>'+g.rules+'</p><div>'+cite(limits,'Check current Queensland limits')+cite(maps,'Check the marine park map')+'</div></aside>';
}
