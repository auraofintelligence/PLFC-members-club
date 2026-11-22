const gearRules = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/equipment';
const zoneMap = 'https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps';
const swanBay = 'https://www.dpi.qld.gov.au/__data/assets/pdf_file/0005/87089/Swan-Bay-North-Stradbroke-Island-FRW-027.pdf';

const methods = [
  {
    title: 'Set a baited crab pot',
    hint: 'From a firm bank beside a sheltered tidal creek.',
    image: '/assets/care/crab-pot.webp',
    imageAlt: 'A baited crab pot has a funnel opening in its side.',
    steps: [
      ['Bait the middle', 'Tie a fresh fish frame in the middle of the pot or secure it in the bait holder. Leave the funnel entrances clear so a crab can walk in.'],
      ['Lower the pot', 'Choose an accessible edge with muddy bottom nearby. Lower the pot onto a level patch where it will stay underwater at low tide. Keep the rope clear of people and boats.'],
      ['Lift and sort', 'Stay nearby and check regularly. Pull steadily, set the pot down securely and keep fingers clear of the claws. Sort the catch at that spot before resetting.']
    ],
    source: 'https://bnbfishing.com.au/chasing-a-feed-of-mud-crabs/',
    sourceLabel: 'Read an angler’s mud-crabbing tips'
  },
  {
    title: 'Lift an open hoop net',
    hint: 'Also called a dilly. Use a permitted jetty where you can lift straight up.',
    image: '/assets/crabbing/open-hoop.webp',
    imageAlt: 'Three cords lift a rigid hoop. The top is open, with mesh hanging below.',
    steps: [
      ['Bait the hoop', 'Tie a fish frame at the centre. Use an open hoop with a shallow net hanging below the ring. Inverted “witches hat” dillies and crab hooks are prohibited.'],
      ['Lower it flat', 'Choose a clear spot over sand where crabbing is allowed. Lower the hoop to the bottom so a crab can walk onto the bait. Stay with it and keep ferry berths, ladders and walkways clear.'],
      ['Lift straight up', 'Take up the slack and lift steadily with the ring level. The mesh forms a shallow bag beneath the crab. Lower it to a stable surface, then identify and measure the catch.']
    ],
    source: 'https://www.fish.gov.au/fishing-methods/traps-and-pots',
    sourceLabel: 'See the hoop-net diagram'
  }
];

function external(url, label) {
  return '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>';
}

function methodCard(method) {
  const steps = method.steps.map(([title, copy]) => '<li><strong>'+title+'</strong><p>'+copy+'</p></li>').join('');
  return '<details class="crab-method" name="crab-method"><summary>'+
    '<img src="'+method.image+'" width="170" height="114" alt="'+method.imageAlt+'" loading="lazy">'+
    '<span><strong>'+method.title+'</strong><small>'+method.hint+'</small></span><span class="crab-chevron" aria-hidden="true">⌄</span></summary>'+
    '<div class="crab-method-body"><ol>'+steps+'</ol><p>'+external(method.source, method.sourceLabel)+'</p></div></details>';
}

export function crabbingGuideHtml() {
  return '<div class="crab-how"><p class="crab-lead">You can go crabbing from shore. Choose your gear for three steps from baiting up to lifting your catch.</p>'+
    '<div class="crab-methods">'+methods.map(methodCard).join('')+'</div>'+
    '<aside class="crab-outing"><h3>Before you lower it</h3><p>Pack a crab gauge, bucket, bait and labelled gear. Attach the required tag and float or shore tie before you start. Choose a spot you can reach and leave safely through the tide.</p>'+
    '<p>Check the water directly below your gear and any signs at the jetty. Green zones are closed to recreational crabbing. Swan Bay and the tidal creek entering its northern end are also closed.</p>'+
    '<div>'+external(zoneMap,'Open the marine park map')+external(swanBay,'See the Swan Bay boundary (PDF)')+external(gearRules,'Check gear labels')+'</div></aside></div>';
}
