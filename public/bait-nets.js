const official = {
  gear:'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/equipment',
  maps:'https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps',
  zones:'https://parks.qld.gov.au/parks/moreton-bay/zoning/provisions-tables',
  closures:'https://www.dpi.qld.gov.au/services/fisheries/closures/regulated-waters',
  limits:'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal',
  bait:'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/bait',
  measuring:'https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2019-0179#sch.10'
};

const nets = [
  {
    id:'cast', name:'Cast net', hint:'For baitfish or prawns within casting reach.',
    dimensions:['Length 3.7 m maximum','Mesh 28 mm maximum'],
    rule:'Start at the handline attachment. Measure to the weighted edge and to the bottom of the lowest pocket. Use the longer measurement.',
    steps:[
      ['Gather the net','Practise on grass. Untwist the weighted rim. Gather loose coils of handline and a fold of mesh into your throwing hand. Pick up a separate section of the weighted rim with your other hand. Keep loose rope clear of your feet.','An upright cast net with its handline attached at the top and weights around the rim.'],
      ['Swing and spread','Allow room all around you, clear of people, birds, boats and snags. Plant your feet, turn your shoulders and swing both arms out together. Release the mesh and weights while retaining the handline. Let the rim sink.','The round net spreads over water. Two downward arrows show the weighted rim sinking.'],
      ['Bring it straight back','For the drawstring net shown, pull the handline steadily. The internal lines bring the rim together. Bring the catch close, open the net over water and release unwanted animals promptly.','The retrieval line lifts the net with the weighted rim drawn together underneath.']
    ],
    technique:['Watch Shimano Australia’s cast-net demonstration','https://www.youtube.com/watch?v=67h3gr0DHUs'],
    photos:['See the hand positions in Queensland’s field photos (PDF)','https://environment.qld.gov.au/__data/assets/pdf_file/0025/90736/biological-assessment-sampling-fish-communities-using-cast-nets.pdf#page=2']
  },
  {
    id:'seine', name:'Bait seine', hint:'A two-person drag net for a clear, shallow sandy edge.',
    dimensions:['Length 16 m maximum','Drop 3 m maximum','Mesh 28 mm maximum'],
    rule:'Use a plain net without a bag or pocket. Both ends stay in people’s hands. Anchoring, staking or fixing the net is prohibited.',
    steps:[
      ['Find the top and bottom','Take one end each. Put the floats uppermost and the weighted foot along the sand. Choose a short stretch where both people can stand securely and see the bottom.','A rectangular net with small floats along its top and weights along the bottom, without a pocket.'],
      ['Walk together','Start with the net across the shallows. Move slowly, side by side, along the bank. The net bows behind you. Keep it clear of seagrass, snags, swimmers and boat traffic.','Both ends of the net move in the same direction while the mesh bows behind them.'],
      ['Bring the ends closer','Bring the outer end towards the shallows. Keep any mesh holding fish submerged, lifting it only long enough to remove a fish immediately. Release unwanted catch in water deep enough to swim away.','The held ends come closer while the mesh stays in the water for sorting.']
    ],
    // Two-person float/foot-line handling also appears in the University of Florida
    // coastal education field lesson (4H350, Activity 6). Local sorting follows Queensland rules.
    technique:['Read the Queensland Fisheries Declaration for recreational nets','https://www.legislation.qld.gov.au/view/pdf/inforce/current/sl-2019-0076']
  },
  {
    id:'scoop', name:'Scoop or dip net', hint:'For a visible prawn in shallow, sheltered water.',
    dimensions:['Net 2 m maximum in any direction','Handle 2.5 m maximum','Mesh 25 mm minimum'],
    rule:'A hand-held prawn dip net comes under the scoop-net rule. The minimum mesh lets small animals pass. Check a shop-bought net before using it to gather bait.',
    steps:[
      ['Check the hoop and mesh','Choose a light net you can lift with one hand. Look for a clear sandy edge with secure footing. Keep the opening and mesh within reach so you can inspect the catch.','A rigid oval hoop, mesh bag and long handle show the separate parts of a scoop net.'],
      ['Watch a single prawn','In gentle flow, watch which way the prawn is travelling. Put the hoop just ahead of it and make a short scoop as it passes. In still water, a prawn can flick backwards. Leave seagrass and the bottom undisturbed.','A marked ripple shows the sighted prawn. A curved arrow guides the scoop towards that spot.'],
      ['Lift and look','Lift just enough to check the mesh. Release unwanted animals where you caught them and put only the prawns you need in your bucket. Keep fingers clear of spines and pincers.','The scoop is raised to the water surface for inspecting its mesh bag.']
    ],
    technique:['See Kelly Derks’ prawn-scooping tips and photos','https://www.wirfab.com.au/tips-for-catching-prawns/']
  }
];

function external(url,text) {
  return '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+text+'</a>';
}

function card(net) {
  const folder='/assets/bait/nets/'+net.id;
  return '<details class="net-method" name="bait-net-method"><summary><img src="'+folder+'-1.webp" width="156" height="91" alt="" loading="lazy">'+
    '<span><strong>'+net.name+'</strong><small>'+net.hint+'</small></span><span class="net-open" aria-hidden="true">⌄</span></summary>'+
    '<div class="net-method-body"><ul class="net-dimensions" aria-label="Queensland tidal gear limits">'+net.dimensions.map(limit=>'<li>'+limit+'</li>').join('')+'</ul>'+
    '<p>'+net.rule+' '+external(official.gear,'Check Queensland’s gear rules')+'.</p><ol class="net-steps">'+net.steps.map(([heading,copy,alt],i)=>
      '<li><img src="'+folder+'-'+(i+1)+'.webp" alt="'+alt+'" width="780" height="455" loading="lazy"><div><h3><span aria-hidden="true">'+(i+1)+'</span>'+heading+'</h3><p>'+copy+'</p></div></li>').join('')+'</ol>'+
    '<p class="net-source">'+external(net.technique[1],net.technique[0])+(net.photos?' · '+external(net.photos[1],net.photos[0]):'')+'</p></div></details>';
}

export function baitNetsHtml() {
  return '<div class="bait-net-guide"><p>Choose the net you have for a three-step guide to recreational bait gathering in Straddie’s tidal waters.</p>'+
    '<aside class="net-zone"><strong>Is this spot open to bait netting?</strong><p>Green marine national park zones, including the mapped area at Myora Reef near Dunwich, are closed to recreational bait netting. Stow or secure your gear before entering one. In Moreton Bay Marine Park, the general use, habitat protection and conservation park zones allow bait netting, subject to local restrictions.</p>'+
    '<p>'+external(official.maps,'Find my zone')+' · '+external(official.closures,'Check tidal closures')+' · '+external(official.zones,'See permitted activities')+'</p></aside>'+
    '<div class="net-methods">'+nets.map(card).join('')+'</div>'+
    '<details class="net-aftercare"><summary>What can go in the bait bucket?</summary><p>Identify and measure fish before keeping them for bait. Size limits, possession limits, closed seasons and protected species rules still apply. Return any fish you cannot identify. '+external(official.limits,'Check the species limits')+'.</p>'+
    '<p>For prawns, the Queensland possession limit is 10 litres per person, with a 20-litre boat limit when two or more people are on board. Keep prawns whole unless eating them immediately. Gather only enough for this outing.</p>'+
    '<p>White spot movement rules apply in South East Queensland. Check the regulated area before moving uncooked prawns or other bait, and clean the gear before leaving it. '+external(official.bait,'Check bait and movement rules')+'.</p></details>'+
    '<details class="net-aftercare"><summary>How is mesh measured?</summary><p>Close a mesh gently by pulling opposite corners apart. Measure the internal distance between those corners. The legal measurement averages 10 meshes, sampled at least 30 cm apart. Choose a net with its mesh size identified if you are unsure. '+external(official.measuring,'Queensland’s method, Schedule 10 section 34')+'.</p></details>'+
    '<p class="net-source">Leave a clear path for wildlife. Stop and bring the net in if a bird, turtle or dolphin approaches. <a href="#guide/wildlife">Get help for injured wildlife</a>. <a href="#guide/customary-rights">Read about Quandamooka customary fishing rights</a>.</p></div>';
}
