import {fieldSpecies, fieldPhotoCredit} from './field-species.js';

const map = 'https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps';
const zones = 'https://parks.qld.gov.au/parks/moreton-bay/zoning/provisions-tables';
const parkLaw = 'https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2019-0175';
const declaration = 'https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2019-0076';
const council = 'https://www.redland.qld.gov.au/files/assets/public/v/1/about-council/documents/local-laws/';
const reserveLaw = council + 'local_law_7__bathing_reserves__2015.pdf#page=7';
const reserves = council + 'sll4__local_government_controlled_areas__facilities_and_roads__2015.pdf#page=39';
const fishRules = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal';
const sharkSmart = 'https://www.dpi.qld.gov.au/initiatives/sharksmart/tips/spearfishing';
const flagRule = 'https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2016-0154#sec.197';
const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

// Each example is a single point checked against Queensland's marine park zoning layer.
function pointOnMap(longitude, latitude) {
  const layer = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Environment/ParksMarineProtectedAreas/MapServer/2';
  const position = longitude + ',' + latitude;
  const params = new URLSearchParams({url:layer, center:position, level:'14', marker:position + ',4326,Checked water'});
  return 'https://www.arcgis.com/apps/mapviewer/index.html?' + params;
}

const locations = [
  {id:'shag', name:'Shag Rock', label:'Zone permits limited spearfishing', point:[153.526,-27.414],
    body:'The water at 27.414° S, 153.526° E is in the Flinders Beach Habitat Protection Zone (HPZ12). Shag Rock sits offshore. Nearby Flat Rock has a different boundary and is closed to fishing.'},
  {id:'main', name:'Off Main Beach', label:'Zone permits limited spearfishing', point:[153.550,-27.500],
    body:'The offshore water at 27.500° S, 153.550° E is in the Moreton Bay Offshore General Use Zone (GUZ02). This point is south of the Point Lookout bathing reserve. Other parts of this coast include a green zone. Check your actual position and your route in.'},
  {id:'flat', name:'Flat Rock', label:'No spearfishing at Flat Rock', warning:true,
    body:'The mapped Flat Rock waters are closed to recreational spearfishing. The reef is a grey nurse shark gathering site. Leave wildlife undisturbed and check the green-zone boundary.', more:link(declaration + '#sch.1','Read the Flat Rock boundary')},
  {id:'amity', name:'Amity Point public jetty', label:'Public jetty exclusion', warning:true,
    body:'At the Claytons Road jetty, the waters underneath and within 100 m of any part of the public jetty are closed to possessing or using a spear or speargun. The swimming enclosure is also a bathing reserve. The deep channel has strong currents.', more:link('https://parks.qld.gov.au/parks/naree-budjong-djara/things-to-do','Amity Point visitor advice')},
  {id:'dunwich', name:'Dunwich public jetties', label:'Public jetty exclusion', warning:true,
    body:'At the Junner Street and Yabby Street public jetties, the waters underneath and within 100 m of any part of each jetty are closed to possessing or using a spear or speargun. Keep clear of ferry approaches and working berths.', more:link(declaration + '#sch.1','Read the public jetty boundary')},
  {id:'southern', name:'Jumpinpin and the southern bay', label:'Separate Fisheries closure', warning:true,
    body:'A spearfishing closure covers defined southern Moreton Bay waters around Jumpinpin. The declaration describes an exception between marked lines near South Stradbroke Island. Identify the exact boundary before carrying gear into this area.', more:link(declaration + '#sch.1','Find Southern Moreton Bay in Schedule 1')},
  {id:'other', name:'Check another spot', label:'Locate your exact water',
    body:'Open the official marine park map and tap the water you plan to use. Check the zone, designated areas and the route from shore. Then look for a Fisheries closure, a public jetty or a declared bathing reserve.', more:link(declaration + '#sch.1','Check Fisheries boundaries')},
];

function speciesCards() {
  return ['yellowfin-bream','luderick','venus-tuskfish'].map(id => {
    const fish = fieldSpecies.find(species => species.id === id);
    return `<details class="spear-species"><summary><img src="${fish.photo.src}" alt="${fish.photo.alt}" loading="lazy" width="320" height="165"><span>${fish.name}</span></summary>
      <div><p>${fish.feature}</p><p><strong>${fish.rulesNote}</strong></p><p>${link(fish.reference,'Compare the markings')} · ${link(fishRules,'Current limits')}</p><small>${fieldPhotoCredit(fish.photo)}</small></div></details>`;
  }).join('');
}

function spotMarkup(spot) {
  return `<div class="dive-brief-inner"><div><p class="spear-status">${spot.label}</p><h3>${spot.name}</h3><p>${spot.body}</p>
    ${spot.more ? '<p>' + spot.more + '</p>' : ''}</div></div>
    <div class="dive-source-bar">${spot.point ? link(pointOnMap(...spot.point),'See this point on the zone map') : ''}
    ${link(map,'Official maps and offline app')} ${link(zones,'Activities by zone')}</div>`;
}

export function setupDiveGuide(host) {
  if (!host || host.dataset.diveGuide === 'ready') return;
  host.dataset.diveGuide = 'ready';
  host.classList.add('dive-guide');
  const option = spot => `<option value="${spot.id}">${spot.name}</option>`;
  host.innerHTML = `<p class="dive-intro">Find water where you can spearfish, recognise your catch and check what you can take home.</p>
    <div class="dive-pickers spear-picker"><label>Which waters are you checking?<select data-dive-site>
      <optgroup label="Where the zone allows limited spearfishing">${locations.filter(s=>s.point).map(option).join('')}</optgroup>
      <optgroup label="Closures and other waters">${locations.filter(s=>!s.point).map(option).join('')}</optgroup></select></label></div>
    <article class="dive-site-brief" data-dive-brief></article><span class="dive-sr" data-dive-announcement aria-live="polite"></span>
    <section class="spear-clearance"><h3>How far away?</h3>
      <dl><div><dt>100 m<span>Public jetties</span></dt><dd>At Amity, Dunwich and other public jetties in or south of the Noosa River, you cannot carry or use a spear or speargun in the water underneath or within 100 m of any part of the jetty. Measure from the nearest part. ${link(declaration+'#sec.50','Fisheries rule')} · ${link(declaration+'#sch.1','Defined waters')}</dd></div>
      <div><dt>20 m<span>Shark control gear</span></dt><dd>Stay outside the 20 m exclusion zone around shark nets and drumlines. Check their positions before getting in. ${link('https://www.dpi.qld.gov.au/initiatives/sharksmart/equipment/locations','Equipment map and rule')}</dd></div>
      <div><dt>Whole reserve<span>Bathing areas</span></dt><dd>Leave spears and spearguns outside declared bathing reserves. Local examples include reserves at Cylinder Beach, Main Beach and Amity. The red and yellow flags mark the patrol area. Check the reserve boundary and give swimmers space everywhere. ${link(reserves,'Council reserve list')} · ${link(reserveLaw,'Bathing reserve rule')}</dd></div></dl>
    </section>
    <details class="dive-fold"><summary>What does “limited spearfishing” mean?</summary><div class="dive-fold-body"><p>Moreton Bay Marine Park allows this activity in general use, habitat protection and conservation park zones. Green zones are closed. The park definition allows a snorkel as the only underwater breathing aid and prohibits using a light for spearfishing. A Fisheries closure or bathing reserve can still close water in a permitted zone. ${link(parkLaw+'#sec.105','Read the legal definition')} · ${link(zones,'Check the zone table')}</p><p><a href="#guide/customary-rights">Read about customary fishing rights</a></p></div></details>
    <section class="spear-identify"><h3>Know the fish before taking it</h3><p>If you cannot identify the species or judge it comfortably within its legal size range underwater, let it swim. Choose a photo for markings and limits.</p>
      <div class="spear-fish-grid">${speciesCards()}</div>
      <p>Grey nurse sharks, manta rays and Queensland groper are protected. Check your species, the season and what you already have in possession. ${link(fishRules,'Queensland tidal limits')} · <a href="#guide/fish">All species photos</a></p></section>
    <section class="dive-support">
      <details class="dive-fold"><summary>Bring the catch home</summary><div class="dive-fold-body"><p>Take what you will use. Keep the catch away from your body, remove it from the water promptly and chill it on clean ice. Check whole-fish requirements before preparing it for transport. ${link(sharkSmart,'Queensland SharkSmart advice')} · <a href="#guide/kitchen">Chill and clean the catch</a></p></div></details>
      <details class="dive-fold"><summary>Buddy, forecast and diver’s flag</summary><div class="dive-fold-body"><p>Go with a trained buddy. One person stays up watching while the other is underwater, and keeps watching after they surface. Agree on a way out and tell someone ashore when to expect you. If you lose sight of each other, stop diving. ${link('https://world.dan.org/alert-diver/article/freediving-safety-awareness/','Buddy guidance')}</p>
        <p>Check the <a href="#fishing">wind and swell</a> and the conditions in front of you. Poor visibility or a difficult exit is a reason to call it off.</p>
        <div class="dive-flag-row"><figure><div class="dive-flag-field" role="img" aria-label="White and blue swallowtail Code A flag"><i></i></div><figcaption>Code A · Diver in the water</figcaption></figure><p>When this flag is displayed nearby, other boats must stay at least <strong>30 m from the diver</strong>. The vessel attending the diver is excepted. ${link(flagRule,'Vessel distance rule')}</p></div></div></details>
      <details class="dive-fold"><summary>Going snorkelling or scuba diving?</summary><div class="dive-fold-body"><p>For a sightseeing dive at Flat Rock, check the grey nurse shark rules, permitted dive hours and no-anchoring area. Give sharks room to pass. ${link(parkLaw+'#sec.37','Grey nurse shark rules')} · ${link(parkLaw+'#sec.58','Anchoring rules')}</p>
        <p>Choose a site within your training. Agree on signals, gas checks for scuba and what to do if you become separated. ${link('https://www.worksafe.qld.gov.au/safety-and-prevention/hazards/workplace-hazards/diving-and-snorkelling/dive-plans','Dive planning')}</p></div></details>
      <details class="dive-fold"><summary>Emergency at sea</summary><div class="dive-fold-body"><p><a href="/first-aid.html#bleeding">Shark bite or severe bleeding</a> · <a href="/first-aid.html#water">Drowning first aid</a></p><p>For a missing diver or serious injury, call <a href="tel:000">Triple Zero (000)</a>. At sea use VHF channel 16. Give your position, the last place the person was seen and the nearest access point. ${link('https://www.msq.qld.gov.au/safety/marine-radios','Marine radio guide')}</p><p>For a suspected scuba pressure injury, call 000 first. The Diving Emergency Service also offers specialist advice on <a href="tel:1800088200">1800 088 200</a>. ${link('https://world.dan.org/about-dan/contact/','DAN emergency contacts')}</p></div></details>
    </section>`;
  const picker = host.querySelector('[data-dive-site]');
  const brief = host.querySelector('[data-dive-brief]');
  function update(announce) {
    const spot = locations.find(item => item.id === picker.value);
    brief.classList.toggle('dive-caution', Boolean(spot.warning));
    brief.innerHTML = spotMarkup(spot);
    if (announce) host.querySelector('[data-dive-announcement]').textContent = spot.name + '. ' + spot.label;
  }
  picker.addEventListener('change', () => update(true));
  update(false);
}
