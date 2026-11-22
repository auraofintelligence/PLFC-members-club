import {setupDiveGuide} from './dive-guide.js';
import {moretonBayBugsHtml} from './bug-guide.js';
import {crabbingGuideHtml} from './crabbing-guide.js';
import {crabbingPhotosHtml} from './crabbing-photos.js';
import {catchCareHtml,releaseCareHtml} from './catch-care.js';
import {palomarCreditHtml} from './knot-photos.js';
import {setupKnotsGuide,selectWorkshopKnot} from './knots-guide.js';
import {setupRigWorkshop,selectWorkshopSpecies} from './rig-workshop.js';
import {baitDirectoryHtml,baitTopics} from './gather-bait.js';
import { getWildlifeHelpHtml } from './wildlife-help.js';
import { setupWaterRules } from './water-rules.js';
import { setupCatchKitchen } from './catch-kitchen.js';
import { FISH_RIGS } from './fish-rigs.js';
import { FISH_PHOTOS } from './fish-photos.js';
import {speciesFamilies} from './catch-species.mjs';
import {fieldSpecies,fieldPhotoCredit,fieldSpeciesCard,pictureNotes,tailMarks,flatheadDetail,speciesContext} from './field-species.js';

const CHECKED_AT = '2026-11-20';
const CHECKED_LABEL = '20 November 2026';
const guideNames = {
  'mackerel-tuna': ['mac tuna', 'mack tuna', 'kawakawa', 'kawa kawa'],
  'winter-whiting': ['trumpeter whiting', 'diver whiting'],
  luderick: ['blackfish'],
};
const nameKey = name => name.toLowerCase().replace(/[\s-]+/g,'');
const SOURCES = {
  rules: { label: 'Queensland size and possession rules', authority: 'Fisheries Queensland', url: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal' },
  identification: { label: 'Official fish identification guide', authority: 'Fisheries Queensland', url: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/fish-species-guide/fish-species-id' },
  closures: { label: 'Current tidal closed seasons', authority: 'Queensland Department of Primary Industries', url: 'https://www.dpi.qld.gov.au/services/fisheries/closures/tidal-seasons' },
  zones: { label: 'Moreton Bay zoning maps and apps', authority: 'Queensland Parks', url: 'https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps' },
  zoneRules: { label: 'What each marine park zone allows', authority: 'Queensland Parks', url: 'https://parks.qld.gov.au/parks/moreton-bay/zoning/provisions-tables' },
  care: { label: 'Responsible fishing and bait advice', authority: 'Fisheries Queensland', url: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/responsible-fishing' },
  lifejackets: { label: 'Current Queensland lifejacket rules', authority: 'Maritime Safety Queensland', url: 'https://www.msq.qld.gov.au/safety/lifejackets' },
  bars: { label: 'Coastal bar preparation', authority: 'Maritime Safety Queensland', url: 'https://www.msq.qld.gov.au/Safety/Crossing-a-bar.aspx' },
  rocks: { label: 'Rock fishing safety', authority: 'Surf Life Saving Queensland', url: 'https://lifesaving.com.au/safety-info/rock-fishing' },
  beach: { label: 'Beach and rip awareness', authority: 'Surf Life Saving Australia', url: 'https://beachsafe.org.au/surf-safety/ripcurrents' },
  weather: { label: 'Moreton Bay marine forecast', authority: 'Bureau of Meteorology', url: 'https://www.bom.gov.au/qld/forecasts/moreton-bay.shtml' },
  reporting: { label: 'Report fishing or habitat concerns', authority: 'Fisheries Queensland', url: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/reporting' },
  emergency: { label: 'Emergency contact information', authority: 'Queensland Police', url: 'https://www.police.qld.gov.au/how-can-we-help-you/contact-us' },
  gear: { label: 'Fishing and spearfishing gear rules', authority: 'Fisheries Queensland', url: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/equipment' },
  spearfishing: { label: 'SharkSmart spearfishing preparation', authority: 'Queensland Department of Primary Industries', url: 'https://www.dpi.qld.gov.au/initiatives/sharksmart/tips/spearfishing' },
};

const FISH = [
  { id: 'sand-whiting', name: 'Sand whiting', types: ['beach', 'estuary'], search: 'summer whiting worms yabbies prawns sand flats',
    bait: 'Marine worms, yabbies or small pieces of suitable bait prawn. Keep the bait neat and the hook point clear.',
    approach: 'Try a light running-sinker rig across sandy gutters or shallow flats. Use only the weight needed to present the bait.',
    timing: 'A warmer-month option. Moving water and a manageable shore break are useful starting points, rather than a fixed best tide.',
    care: 'Confirm sand whiting identification. Similar whiting species can have different rules.' },
  { id: 'yellowfin-bream', name: 'Yellowfin bream', types: ['beach', 'estuary', 'rocks'], search: 'bream prawns mullet oyster structure',
    bait: 'Small prawn pieces, marine worms or fish strips. Small soft plastics can be another option.',
    approach: 'Fish lightly around sandy edges and nearby structure. Keep a little distance from the water and avoid unnecessary noise.',
    timing: 'A year-round planning option. Adjust to water clarity, current and recent local reports instead of relying on the month alone.',
    care: 'Check the combined-species rules for bream and similar fish before deciding what to retain.' },
  { id: 'dusky-flathead', name: 'Dusky flathead', types: ['beach', 'estuary'], search: 'flatty flathead lizard soft plastics baitfish sand',
    bait: 'Small baitfish or fish strips. Soft plastics and shallow-running lures can cover sandy edges.',
    approach: 'Work across a sandbank edge or channel change, pausing the lure between lifts. Keep hooks away from your hands while handling.',
    timing: 'Look at tidal movement and accessible sand edges. A falling tide is one approach to try, not a promise of fish.',
    care: 'Dusky flathead have both minimum and maximum size rules. Identify the species, measure accurately and support larger fish.' },
  { id: 'tailor', name: 'Tailor', types: ['beach', 'rocks'], search: 'tailor chopper pilchards metal slug surf',
    bait: 'Pilchards, suitable fish strips or metal lures. Check your leader often for damage.',
    approach: 'Cast from a safe dry position into a beach gutter. Observe the water first and keep a clear casting space around other people.',
    timing: 'Often a cool-season talking point on the coast. Dawn and dusk are options only when visibility, access and conditions suit.',
    care: 'Tailor have sharp teeth. Have longnose pliers ready and keep handling brief.' },
  { id: 'snapper', name: 'Snapper', types: ['offshore'], search: 'snapper squire reef squid pilchards soft plastics',
    bait: 'Squid or suitable baitfish. Soft plastics can be another approach when you can control the drift.',
    approach: 'Plan the drift, tackle and return route before fishing offshore. Avoid anchoring in restricted areas.',
    timing: 'Conditions and recent reports matter. The published annual snapper closure is a separate rule check below.',
    care: 'Deeper-water fish can suffer barotrauma. Learn the official release guidance and prepare appropriate release equipment.' },
  { id: 'spanish-mackerel', name: 'Spanish mackerel', types: ['offshore'], search: 'spanish mackerel spaniard trolling live bait pelagic',
    bait: 'Suitable baitfish or trolling lures. Keep fingers clear of teeth and exposed hooks.',
    approach: 'Keep a watch on other vessels and manage lines carefully. Have a landing and release plan before a fish reaches the boat.',
    timing: 'A warmer-water planning idea when conditions and current rules suit. Southern seasonal closures need a separate date check.',
    care: 'Identify the mackerel species carefully. East coast and Gulf rules differ, and boat limits may matter.' },
  { id: 'swallowtail-dart', name: 'Swallowtail dart', types: ['beach'], search: 'dart surf bream worms pipis eugaries beach',
    bait: 'Marine worms or small pieces of legally gathered pipi. Check bait-gathering rules and marine park zones first.',
    approach: 'Try a small bait and light presentation in an accessible gutter. Stay out of dangerous wash and keep an eye on changing sets.',
    timing: 'Moving water and a little workable wash are club starting points. More swell does not mean a better or safer session.',
    care: 'Dart names can be confusing. Use the official species guide before applying a size or possession rule.' },
  { id: 'mulloway', name: 'Mulloway', types: ['beach', 'estuary', 'rocks'], search: 'mulloway jewfish squid mullet gutter night',
    bait: 'Fresh squid or suitable baitfish. Use tackle that allows the fish to be brought in without an unnecessarily long fight.',
    approach: 'Look for accessible deeper gutters and channel edges. Build experience in daylight before considering a night session.',
    timing: 'Low light is a common angling approach, but tide access, company and a reliable return plan come first.',
    care: 'Check current retention and whole-fish requirements. Prepare a large wet landing surface and support the body.' },
];

const METHOD_TIPS = {
  beach: ['Watch several sets from a dry position before setting up. Keep children and gear clear of the shore break.', 'Choose an easy retreat route as the tide changes. Do not wade into a gutter or rip to gain casting distance.', 'Leave an uncrowded casting space and keep fishing gear away from swimming areas. Follow local signs.'],
  rocks: ['Wear a suitable lifejacket and grippy footwear. Fish with company and tell someone your return plan.', 'Watch swell cycles from a safe position, keep watching the sea and identify a way out. Leave if waves reach your platform.', 'If someone is washed in, call 000 and seek help. Do not jump in after them.'],
  boat: ['Check the marine forecast, safety equipment and return conditions before departure. Carry suitable lifejackets and know when wearing them is compulsory.', 'A good offshore forecast does not make a coastal bar safe. Use local knowledge and cancel if conditions or your experience do not suit.', 'Tell someone your route and return time. Check zoning at the fishing spot and keep a watch on weather during the trip.'],
  estuary: ['Check access, bank edges and the changing tide. Choose a dry stable position and keep a clear route back.', 'Give other anglers, wildlife and boat traffic room. Check the exact marine park zone before fishing or gathering bait.', 'If using a boat or kayak, check the equipment and lifejacket requirements for that craft. Keep the outing within the group’s experience.'],
  spearfishing: ['Use an experienced buddy or group, agree on signals and plan entry and exit together. Choose clear water and avoid dusk-to-dawn outings.', 'Keep the catch away from your body and remove it from the water promptly. Watch for changing conditions and leave if the situation does not suit.', 'Confirm spearfishing access, gear restrictions and species rules before entering. These notes do not replace diving training or an assessment of your ability.'],
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function link(source, text = source.label, className = '') {
  return '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener" class="' + escapeHtml(className) + '">' + escapeHtml(text) + '</a>';
}

function localDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function dateParts(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)), day: Number(value.slice(8, 10)) };
}

export function getTripBrief({ date = localDate(), method = 'beach', target = 'any' } = {}) {
  const targetKey = String(target).toLowerCase().trim().replace(/[\s_]+/g, '-');
  const aliases = { whiting: 'sand-whiting', bream: 'yellowfin-bream', flathead: 'dusky-flathead', dart: 'swallowtail-dart', mackerel: 'spanish-mackerel', spaniard: 'spanish-mackerel' };
  const selected = FISH.find(fish => fish.id === (aliases[targetKey] || targetKey));
  const pearlPerch = targetKey === 'pearl-perch';
  const chosenMethod = Object.hasOwn(METHOD_TIPS, method) ? method : 'beach';
  const parts = dateParts(date);
  const reviewedYear = Boolean(parts && parts.year >= 2026 && parts.year <= 2027);
  const targetName = selected?.name || (pearlPerch ? 'Pearl perch' : 'Mixed-species fishing');
  const ruleChecks = [
    { title: 'Check the exact fishing spot', body: 'Use the official Moreton Bay map and designated-area rules. This brief does not check your position.', level: 'check', url: SOURCES.zones.url },
    { title: 'Identify before you retain', body: 'Confirm species, measurements, possession and any boat or combined limits in the current Queensland table.', level: 'check', url: SOURCES.rules.url },
  ];
  if (!reviewedYear) {
    ruleChecks.unshift({ title: parts ? 'This date needs a fresh rules check' : 'Choose a valid trip date', body: 'The stored seasonal patterns are reviewed for 2026 and 2027 only. Open the official closed-seasons page before making a plan.', level: 'review', url: SOURCES.closures.url });
  } else {
    const mixed = !selected && !pearlPerch;
    const snapperDate = (parts.month === 7 && parts.day >= 15) || (parts.month === 8 && parts.day <= 15);
    const mackerelDate = (parts.month === 2 || parts.month === 3) && parts.day <= 21;
    if (snapperDate && (mixed || selected?.id === 'snapper' || pearlPerch)) {
      ruleChecks.unshift({ title: 'Snapper and pearl perch closure date', body: 'This date falls within the published 15 July to 15 August east-coast closure. Choose another target and check the official conditions.', level: 'closure', url: SOURCES.closures.url });
    }
    if (mackerelDate && (mixed || selected?.id === 'spanish-mackerel')) {
      ruleChecks.unshift({ title: 'Southern Spanish mackerel closure date', body: 'This date falls within a published southern closure, 1 to 21 February or 1 to 21 March. Point Lookout is in the southern area.', level: 'closure', url: SOURCES.closures.url });
    }
  }
  if (chosenMethod === 'spearfishing') {
    ruleChecks.push({ title: 'Check spearfishing access and equipment', body: 'Spearfishing has location and equipment restrictions in addition to species and marine park rules. Confirm them before entering the water.', level: 'check', url: SOURCES.gear.url });
  }
  if (selected && chosenMethod !== 'spearfishing' && !selected.types.includes(chosenMethod) && !(chosenMethod === 'boat' && selected.types.some(type => ['offshore', 'estuary'].includes(type)))) {
    ruleChecks.push({ title: 'Match the target to the outing', body: selected.name + ' is not a usual match for the selected method in these club notes. Review the species suggestions or ask an experienced local angler.', level: 'planning', url: SOURCES.identification.url });
  }
  const restriction = ruleChecks.find(check => ['closure', 'review', 'planning'].includes(check.level));
  const lineFishing = chosenMethod !== 'spearfishing';
  let targetTips;
  if (selected && restriction) {
    targetTips = [restriction.body, selected.care];
  } else if (!lineFishing) {
    targetTips = ['Confirm the species and current rules before selecting a fish.', selected?.care || 'Keep only what you need within current rules.', 'The bait and rig suggestions in the species cards are for line fishing.'];
  } else if (selected) {
    targetTips = [selected.bait, selected.approach, selected.care];
  } else {
    targetTips = ['Choose an accessible spot and a fish you can identify confidently.', 'Prepare your release equipment before the first cast. Keep only what you need within current rules.'];
  }
  return {
    title: ({ beach: 'Beach', rocks: 'Rock', boat: 'Boat', estuary: 'Estuary', spearfishing: 'Spearfishing' }[chosenMethod]) + ' plan: ' + targetName.toLowerCase(),
    summary: 'A practical starting point' + (parts ? ' for ' + new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane' }).format(new Date(date + 'T12:00:00+10:00')) : '') + '. Recheck the weather, location and official rules before leaving.',
    setup: selected && lineFishing && !restriction ? FISH_RIGS[selected.id] : null,
    method: chosenMethod,
    methodTips: [...METHOD_TIPS[chosenMethod]],
    targetTips,
    ruleChecks,
    sources: [SOURCES.rules, SOURCES.closures, SOURCES.zones, chosenMethod === 'spearfishing' ? SOURCES.spearfishing : chosenMethod === 'rocks' ? SOURCES.rocks : ['boat', 'estuary'].includes(chosenMethod) ? SOURCES.lifejackets : SOURCES.beach, SOURCES.weather],
    checkedAt: CHECKED_AT,
    validityNote: 'Sources checked ' + CHECKED_LABEL + '. Date checks cover two published seasonal patterns in 2026 and 2027 only. They do not determine whether a trip, location or catch is lawful or safe.',
  };
}

const baitLabels = {
  worm: 'Marine worm', prawn: 'Bait prawn', pipi: 'Pipi flesh', pilchard: 'Pilchard', squid: 'Squid',
  strip: 'Fish strip', 'soft-plastic': 'Soft plastic lure', 'metal-lure': 'Metal lure', 'trolling-lure': 'Trolling lure',
};



export function rigCard(rig) {
  if (!rig) return '';
  return `<section class="fish-setup" aria-label="Rig, trace, hook and bait">
    <div class="fish-setup-content"><h4>${escapeHtml(rig.name)}</h4>
    <figure><img loading="lazy" width="320" height="160" src="/assets/tackle/${escapeHtml(rig.image)}.webp" alt="${escapeHtml(rig.imageAlt)}"><figcaption>${rig.imageNote ? `<span>${escapeHtml(rig.imageNote)}</span> ` : ''}${escapeHtml(rig.presentation)}</figcaption></figure>
    <p>The trace is the line closest to the hook or lure. The strength is the breaking strain printed on the packet.</p><dl><dt>Trace length and strength</dt><dd>${escapeHtml(rig.trace)}</dd><dt>Hook style and size</dt><dd>${escapeHtml(rig.hook)}</dd></dl>
    <p><strong>Adjust for the day</strong> ${escapeHtml(rig.adjust)}</p>
    <div class="field-sources">Rig references · ${rig.sources.map(source => link(source)).join(' · ')}</div></div></section>`;
}

function speciesCard(fish, date) {
  const photo = FISH_PHOTOS[fish.id];
  const notes = pictureNotes[fish.id];
  const trip = getTripBrief({ date, method: fish.types.includes('offshore') ? 'boat' : fish.types[0], target: fish.id });
  const restriction = trip.ruleChecks.find(check => check.level === 'closure' || check.level === 'review');
  const photoLink = link({ url: photo.sourceUrl }, photo.title);
  const licence = photo.licenseUrl ? link({ url: photo.licenseUrl }, photo.license) : escapeHtml(photo.license);
  const baitPictures = notes.baits.map(bait => `<figure class="field-bait"><img src="/assets/tackle/${bait}.webp" loading="lazy" width="96" height="72" alt=""><figcaption>${baitLabels[bait]}</figcaption></figure>`).join('');
  const rigLink = `<a class="text-link" href="#guide/rig?species=${fish.id}">Choose a rig for ${escapeHtml(fish.name.toLowerCase())}</a>`;
  const tackle = restriction
    ? `<p class="field-closure"><strong>${escapeHtml(restriction.title)}</strong> ${escapeHtml(restriction.body)} ${link({ url: restriction.url }, 'Read the official seasonal guidance')}.</p>`
    : `<div class="field-baits" aria-label="Bait and lure ideas">${baitPictures}</div>${rigCard(trip.setup)}`;
  const flag = restriction ? `<span class="field-card-flag">${restriction.level === 'closure' ? 'Closure on your date' : 'Check current rules'}</span>` : '';
  return `<details class="field-card field-more" name="field-species">
    <summary><h3 class="field-card-select"><span class="field-photo"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async" width="520" height="300"></span>
      <span class="field-card-label"><strong>${fish.name}</strong>${tailMarks[fish.id]?'<span class="field-tail-mark">'+tailMarks[fish.id]+'</span>':''}<span class="field-spot">${notes.spot}</span>${flag}
      <span class="field-open-label">${restriction ? 'View rules and fish ID' : 'View bait, rig and ID'}</span><span class="field-close-label">Close fish card</span></span></h3></summary>
    <div class="field-card-copy"><p class="field-detail-credit">Photo · ${photoLink} by ${escapeHtml(photo.credit)} · ${licence}. ${escapeHtml(photo.changes)}.</p>
      <p><strong>Look closely</strong> ${notes.feature} ${link({ url: notes.reference }, 'Compare the species features')}.</p>
      ${flatheadDetail(photo)}${speciesContext(fieldSpecies.find(f=>f.id===fish.id))}${tackle}${restriction ? '' : rigLink}
      <details class="field-tips"><summary>${restriction ? 'Handling and care' : 'Where to try and how to handle your catch'}</summary>
        ${restriction ? '' : `<p><strong>Try this</strong> ${fish.approach}</p>
        <p><strong>Bait and timing</strong> ${fish.bait} ${fish.timing}</p>`}
        <p><strong>Catch care</strong> ${fish.care}</p>
      </details><div class="field-rule-links">${link(SOURCES.identification, 'Confirm fish ID')} ${link(SOURCES.rules, 'Check Qld rules')}</div>
    </div></details>`;
}

function briefHtml(brief) {
  return '<div class="guide-brief-heading"><span class="eyebrow">YOUR STARTING POINT</span><h3>' + escapeHtml(brief.title) + '</h3><p>' + escapeHtml(brief.summary) + '</p></div>' +
    '<div class="guide-brief-columns"><div><h4>For your outing</h4><ul>' + brief.methodTips.map(tip => '<li>' + escapeHtml(tip) + '</li>').join('') + '</ul></div><div><h4>For your target</h4><ul>' + brief.targetTips.map(tip => '<li>' + escapeHtml(tip) + '</li>').join('') + '</ul></div></div>' +
    (brief.method === 'spearfishing' ? '<p><a class="text-link" href="#guide/spearfishing">Check spearfishing waters and jetty distances</a></p>' : '') +
    rigCard(brief.setup) + '<div class="guide-check-list">' + brief.ruleChecks.map(check => '<a class="guide-rule-check ' + escapeHtml(check.level) + '" href="' + escapeHtml(check.url) + '" target="_blank" rel="noopener"><strong>' + escapeHtml(check.title) + '</strong><span>' + escapeHtml(check.body) + '</span></a>').join('') + '</div><p class="guide-validity">' + escapeHtml(brief.validityNote) + '</p>';
}

function makePhotoCheck() {
  const practice = document.createElement('details');
  practice.className = 'guide-family-details guide-photo-practice';
  practice.id = 'guide-photo-practice';
  practice.innerHTML = `<summary>Check a brag mat photo</summary>
    <div><p>Try the example bream first, or choose a photo from your device. A photo you choose stays on your screen and clears when you leave the guide.</p>
    <button type="button" class="button outline small" data-example-photo>Try the example bream</button>
    <label for="guide-practice-file">Choose a JPG, PNG or WebP photo (up to 20 MB)</label>
    <input id="guide-practice-file" type="file" accept="image/jpeg,image/png,image/webp">
    <p class="guide-practice-status" role="status"></p>
    <img class="guide-practice-preview" alt="Your selected practice photo for checking the fish and measuring scale" hidden>
    <p data-example-credit hidden>${link({ url: FISH_PHOTOS['yellowfin-bream'].sourceUrl }, FISH_PHOTOS['yellowfin-bream'].title)} · ${escapeHtml(FISH_PHOTOS['yellowfin-bream'].credit)} · ${link({ url: FISH_PHOTOS['yellowfin-bream'].licenseUrl }, FISH_PHOTOS['yellowfin-bream'].license)} · ${escapeHtml(FISH_PHOTOS['yellowfin-bream'].changes)}</p>
    <button type="button" class="button outline small" data-clear-photo hidden>Remove photo</button>
    <h3>What to look for</h3><ul><li>Can you see the whole fish, from its nose to the tip of its tail?</li>
    <li>Can you read the marks on the measuring mat?</li><li>Does this event ask for a tag, date or other detail? Check its own instructions.</li></ul>
    <p>Have the wet mat and camera ready before a bite and keep the fish supported. Release it promptly. For fish that must go straight back, skip the photo. This photo check stays on your device. Members can submit eligible catches through their catch journal.</p></div>`;
  const input = practice.querySelector('input');
  const preview = practice.querySelector('img');
  const remove = practice.querySelector('[data-clear-photo]');
  const status = practice.querySelector('[role="status"]');
  const exampleCredit = practice.querySelector('[data-example-credit]');
  let reader;

  function clearPhoto() {
    if (reader?.readyState === FileReader.LOADING) reader.abort();
    reader = null;
    preview.onerror = null;
    preview.hidden = true;
    preview.removeAttribute('src');
    preview.alt = 'Your selected practice photo for checking the fish and measuring scale';
    exampleCredit.hidden = true;
    remove.hidden = true;
    input.value = '';
    status.textContent = '';
  }

  practice.querySelector('[data-example-photo]').addEventListener('click', () => {
    clearPhoto();
    const example = FISH_PHOTOS['yellowfin-bream'];
    preview.alt = example.alt;
    preview.src = example.src;
    preview.hidden = false;
    remove.hidden = false;
    exampleCredit.hidden = false;
    status.textContent = 'The whole bream is visible. The tape lies beside it, so the photo makes the exact end points hard to read. On comp day, line up the fish as the event instructions show.';
  });
  input.addEventListener('change', () => {
    const file = input.files[0];
    clearPhoto();
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      status.textContent = 'Choose a JPG, PNG or WebP image smaller than 20 MB.';
      return;
    }
    reader = new FileReader();
    reader.onerror = () => { clearPhoto(); status.textContent = 'This photo could not open. Try another image.'; };
    reader.onload = () => {
      preview.onerror = () => { clearPhoto(); status.textContent = 'This photo could not display. Try another image.'; };
      preview.src = reader.result;
      preview.hidden = false;
      remove.hidden = false;
      status.textContent = 'Compare your photo with the three questions below.';
    };
    reader.readAsDataURL(file);
    status.textContent = 'Opening your photo on this device…';
  });
  remove.addEventListener('click', () => { clearPhoto(); input.focus(); status.textContent = 'Photo removed.'; });
  practice.addEventListener('toggle', () => { if (!practice.open) clearPhoto(); });
  window.addEventListener('hashchange', () => { if (location.hash !== '#guide/brag-mat') clearPhoto(); });
  window.addEventListener('pagehide', clearPhoto);
  return practice;
}

const GUIDE_GROUPS = [
  { slug: 'fish', title: 'Identify a fish, shark or ray', image: 'fish/yellowfin-bream', hint: 'Species photos, bait, tackle and protected wildlife.' },
  { slug: 'bait-gathering', title: 'Bait gathering', image: 'bait/shore/beachworm', hint: 'Nets, baitfish, yabbies, beach worms, prawns, squid and pipis.', topics: baitTopics.map(item=>item.slug) },
  { slug: 'crabbing', title: 'Crabbing', image: 'crabbing/mud-crab', hint: 'Pots, hoop nets, crab identification and Moreton Bay bugs.', topics: ['moreton-bay-bugs'] },
  { slug: 'spearfishing', title: 'Spearfishing', image: 'fish/venus-tuskfish', hint: 'Waters to fish, jetty distances and fish you can keep.' },
  { slug: 'rig', title: 'Choose a fishing rig', image: 'tackle/rig-photos/running-sinker-parts', hint: 'Pick a fish or method. See the tackle, how to rig it and when to adjust.' },
  { slug: 'knots', title: 'Fishing knots', image: 'knots/palomar-jig-seated', hint: 'Tie on a hook, join two lines or make a loop.' },
  { slug: 'plan', title: 'Plan an outing', image: 'care/amity-jetty', hint: 'Conditions, jetty manners and safety.', topics: ['trip', 'conditions', 'jetty', 'safety'] },
  { slug: 'local-rules', title: 'Check the rules', image: 'care/crab-pot', hint: 'Zones, seasons, rights and gathering.', topics: ['zones', 'rules', 'customary-rights', 'spearfishing', 'crabbing', 'bait-gathering'] },
  { slug: 'catch-care', title: 'Look after the catch', image: 'care/ice', hint: 'Release a fish, take a quick comp photo or keep it fresh for dinner.', topics: ['care', 'brag-mat', 'kitchen', 'sharks'] },
  { slug: 'help', title: 'Get help or report', image: 'care/dolphin', hint: 'Rescue contacts and Fisheries reporting.', topics: ['wildlife', 'reporting'] },
];

const GUIDE_TOPICS = {
  fish: ['guide-fish', 'Species photos, bait and tackle'],
  rig: ['guide-rig', 'Choose a fishing rig'], knots: ['guide-knots', 'Fishing knots'],
  trip: ['guide-trip', 'Build a trip brief'], conditions: ['guide-conditions', 'Read wind, swell and tide'],
  jetty: ['guide-jetty', 'Share the jetty'], safety: ['guide-safety', 'Beach, rock and boat safety'],
  zones: ['guide-water-rules', 'Find marine park zones'], rules: ['guide-rules', 'Size limits and closed seasons'],
  'customary-rights': ['guide-rights-topic', 'Understand customary fishing rights'],
  spearfishing: ['guide-spearfishing', 'Spearfishing'], crabbing: ['guide-crabbing', 'Crabbing'],
  'moreton-bay-bugs': ['guide-moreton-bay-bugs', 'Moreton Bay bugs'],
  'bait-gathering': ['guide-bait-gathering', 'Bait gathering'],
  ...Object.fromEntries(baitTopics.map(item=>[item.slug,['guide-'+item.slug,item.title]])),
  'catch-care': ['guide-catch-care', 'Look after the catch'], care: ['guide-care', 'Release a fish'], 'brag-mat': ['guide-brag-mat', 'Check a brag mat photo'],
  kitchen: ['guide-kitchen', 'Keep a fish for dinner'], sharks: ['guide-sharks', 'Sharks and rays'],
  reporting: ['guide-reporting-topic', 'Report a fisheries concern'], wildlife: ['guide-wildlife', 'Injured wildlife help'],
};

let guideView;

function separateGuideTopics(section) {
  const water = section.querySelector('#guide-water-rules');
  const checked = water.querySelector('.water-reviewed');
  function add(slug, ...nodes) {
    const chapter = document.createElement('section');
    const [id, title] = GUIDE_TOPICS[slug];
    chapter.id = id;
    chapter.className = 'guide-chapter';
    const heading = document.createElement('h2');
    heading.textContent = title;
    chapter.append(heading, ...nodes);
    section.append(chapter);
    return chapter;
  }
  const knotHost=section.querySelector('#guide-knots');
  setupKnotsGuide(knotHost);
  const diveHost=document.createElement('div');
  add('spearfishing',diveHost);
  setupDiveGuide(diveHost);
  const crabbing=add('crabbing');
  crabbing.classList.add('water-rules-chapter');
  crabbing.insertAdjacentHTML('beforeend',crabbingGuideHtml());
  const bugs = add('moreton-bay-bugs');
  bugs.insertAdjacentHTML('beforeend',moretonBayBugsHtml());
  crabbing.querySelector('.crab-methods').insertAdjacentHTML('afterend','<p class="crab-bug-link"><a href="#guide/moreton-bay-bugs"><strong>Moreton Bay bugs</strong><span>See the animal, how it is caught and what you can keep.</span></a></p>');
  crabbing.append(water.querySelector('.water-crab-card'));
  crabbing.insertAdjacentHTML('beforeend',crabbingPhotosHtml());
  crabbing.append(water.querySelector('.water-crab-size-heading'),water.querySelector('.water-crab-limits'),
    water.querySelector('.water-crab-check-note'),water.querySelector(':scope > .water-source-row'));
  crabbing.insertAdjacentHTML('beforeend','<p class="guide-related"><a href="#guide/zones">Check your marine park zone</a> · <a href="#guide/customary-rights">Read about customary rights</a></p>');
  crabbing.append(checked.cloneNode(true));
  section.querySelector('#guide-safety .guide-chapter-title').insertAdjacentHTML('afterend','<p><a class="guide-first-aid" href="/first-aid.html">First aid, shark bites and emergencies</a></p>');
  const baitDirectory=add('bait-gathering');
  baitDirectory.insertAdjacentHTML('beforeend',baitDirectoryHtml());
  for(const item of baitTopics){
    const page=add(item.slug);
    page.classList.add('bait-chapter');
    page.insertAdjacentHTML('beforeend',item.render());
  }
  const rights = section.querySelector('#guide-customary-rights').cloneNode(true);
  rights.id = 'guide-rights-text';
  rights.removeAttribute('aria-labelledby');
  rights.querySelector('h4').removeAttribute('id');
  add('customary-rights', rights);
  const signpost = water.querySelector('[data-water-scroll]');
  const rightsLink = document.createElement('a');
  rightsLink.textContent = signpost.textContent;
  rightsLink.href = '#guide/customary-rights';
  signpost.replaceWith(rightsLink);

  add('reporting', section.querySelector('.guide-reporting'));
  add('brag-mat', makePhotoCheck());
  const wildlife = add('wildlife');
  wildlife.insertAdjacentHTML('beforeend', getWildlifeHelpHtml());
}

function contentsMarkup(group) {
  if (!group) {
    return `<header class="field-guide-hero"><h1 class="page-title">Fishing guide</h1><p>What would you like a hand with?</p><a class="guide-first-aid" href="/first-aid.html">First aid and emergencies</a></header>
      <aside class="guide-wildlife-shortcut" aria-label="Wildlife rescue"><div class="guide-rescue-label"><img src="/assets/care/wildlife-rescue-logo.webp" width="46" height="46" alt=""><div><strong>Wildlife Rescue Minjerribah</strong><span>For an injured animal, call a rescuer.</span></div></div>
      <div>
      <a href="https://wildlife-rescue-minjerribah.auraofintelligence.workers.dev/" target="_blank" rel="noopener">Open Wildlife Rescue Minjerribah app</a><button type="button" data-open-wildlife-dialog aria-haspopup="dialog">Injured wildlife help</button></div></aside>
      <nav class="guide-directory-grid" aria-label="Choose a fishing guide topic">${GUIDE_GROUPS.map(item =>
        `<a href="#guide/${item.slug}"><img src="/assets/${item.image}.webp" alt="" width="320" height="112">
        <span><strong>${item.title}</strong><small>${item.hint}</small></span></a>`).join('')}</nav>
      <details class="guide-index-credit"><summary>Guide picture credits</summary><p>
      ${link({url: FISH_PHOTOS['yellowfin-bream'].sourceUrl}, FISH_PHOTOS['yellowfin-bream'].title)} by JaredMcKenzie (CC0).
      Venus tuskfish · ${fieldPhotoCredit(fieldSpecies.find(item=>item.id==='venus-tuskfish').photo)}
      ${palomarCreditHtml()}
      Mud crab by <a href="https://commons.wikimedia.org/wiki/File:Scylla_serrata.jpg" target="_blank" rel="noopener">Almandine and JMK</a>, WebP thumbnail under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
      <a href="https://commons.wikimedia.org/wiki/File:Amity_Point_Jetty_at_Sunset._North_Stradbroke_Island,_Queensland,_Australia.jpg" target="_blank" rel="noopener">Amity Point Jetty by Pacificwizard</a> (CC0).
      <a href="https://commons.wikimedia.org/wiki/File:Bottlenose_Dolphins,_Amity_Point,_Stradbroke_Island,_2021.jpg" target="_blank" rel="noopener">Bottlenose Dolphins, Amity Point by Mark Gillow</a>,
      <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener">CC BY 2.0</a>. Photos are resized, converted to WebP and displayed as thumbnails.</p></details>`;
  }
  return `<header class="field-guide-hero"><h1 class="page-title">${group.title}</h1></header>
    <nav class="guide-topic-list" aria-label="${group.title}">${group.topics.map(slug =>
    `<a href="#guide/${slug}">${GUIDE_TOPICS[slug][1]}</a>`).join('')}
    ${group.slug === 'plan' ? '<a href="#fishing">Open the forecast and tide planner</a>' : ''}</nav>`;
}

export function renderGuideRoute(slug = '', species = '', knot = '', compare = '') {
  const section = guideView?.section;
  if (!section) return { valid: false, title: 'Fishing guide', focusElement: null };
  const topic = Object.hasOwn(GUIDE_TOPICS, slug) ? GUIDE_TOPICS[slug] : null;
  const group = GUIDE_GROUPS.find(item => item.topics && item.slug === slug);
  const parent = GUIDE_GROUPS.some(item => item.slug === slug) ? null : GUIDE_GROUPS.find(item => item.topics?.includes(slug));
  const directory = section.querySelector('#guide-directory');
  const top = section.querySelector('.guide-breadcrumb');
  const end = section.querySelector('.guide-end-navigation');
  const valid = slug === '' || Boolean(topic || group);
  const atRoot = !topic && !group;
  const menuLinks = '<a href="#guide">Guide contents</a>' + (parent ? `<span aria-hidden="true">/</span><a href="#guide/${parent.slug}">${parent.title}</a>` : '');
  top.hidden = atRoot;
  const hasTour = ['rig','knots','crabbing','moreton-bay-bugs','spearfishing','catch-care','kitchen','pipis','pipis-cooking','pipis-bait'].includes(slug);
  top.innerHTML = menuLinks + (hasTour ? '<plfc-page-tour for-page="guide"></plfc-page-tour>' : '');
  end.hidden = !topic;
  end.innerHTML = menuLinks;
  for (const chapter of section.querySelectorAll(':scope > .guide-chapter')) chapter.hidden = chapter.id !== topic?.[0];
  directory.hidden = Boolean(topic);
  if (!topic) {
    directory.dataset.guideDirectory = group?.slug || '';
    directory.innerHTML = contentsMarkup(group);
    return { valid, title: group?.title || 'Fishing guide', focusElement: directory.querySelector('h1') };
  }
  if (slug === 'rig' && !selectWorkshopSpecies(section, species)) selectWorkshopSpecies(section, '');
  if (slug === 'knots') {
    const validKnot = selectWorkshopKnot(section, knot || 'uni');
    if (compare === 'strength') {
      const results = section.querySelector('#guide-knots .kg-results');
      results.open = true;
      return {valid: true, title: 'Fishing knot strength tests', focusElement: results.querySelector('summary'), scrollToFocus: true};
    }
    if (knot && validKnot) {
      const heading = section.querySelector('#guide-knots [data-knot-lesson] h3');
      return {valid: true, title: heading.textContent, focusElement: heading, scrollToFocus: true};
    }
  }
  if (slug === 'brag-mat') section.querySelector('#guide-photo-practice').open = true;
  if (slug === 'fish' || slug === 'trip') guideView.syncTrip();
  const chapter = document.getElementById(topic[0]);
  return { valid: true, title: topic[1], focusElement: chapter.querySelector('h2') };
}

export function setupFishGuide() {
  const main = document.getElementById('main');
  if (!main) return null;
  const existing = main.querySelector('[data-view="guide"]');
  if (existing) return existing;
  const section = document.createElement('section');
  section.dataset.view = 'guide';
  section.hidden = true;
  section.className = 'content page-content fish-guide';
  section.innerHTML = '<nav class="guide-breadcrumb" aria-label="Guide navigation" hidden></nav><section id="guide-directory"></section>' +
    '<section class="guide-chapter" id="guide-fish"><div class="guide-chapter-title"><div><h2>Identify a fish, shark or ray</h2><p>Choose a group or search for a fish. Open its photo for markings and rules.</p></div></div><div class="guide-filters"><label>Find a species or bait<input id="guide-fish-search" type="search" placeholder="Try shovelnose, flathead or worms" autocomplete="off"></label><label>Show me<select id="guide-fish-type"><option value="all">All species</option><option value="Fish">Finfish</option><option value="Sharks">Sharks</option><option value="Rays">Rays</option><option value="protected">Protected and identification only</option><option value="eligible">Club honours species</option><optgroup label="Bait and rig cards"><option value="beach">Beach fishing</option><option value="estuary">Estuary fishing</option><option value="rocks">Rock fishing</option><option value="offshore">Offshore fishing</option></optgroup></select></label><p id="guide-fish-count" role="status"></p></div><p class="field-date"><span id="guide-fish-on-date"></span> <a class="text-link" href="#guide/trip">Change trip date</a></p><div id="guide-species-grid" class="guide-species-grid"></div><nav id="guide-fish-pages" aria-label="Species pages" hidden><button class="button outline small" type="button" data-fish-page="-1">Previous species</button> <button class="button outline small" type="button" data-fish-page="1">Next species</button></nav><p class="guide-art-note">Photo credits are on the cards. Bait and tackle pictures are illustrations.</p></section>' +
    '<section class="guide-chapter" id="guide-rig" aria-labelledby="guide-rig-title"></section><section class="guide-chapter" id="guide-knots"></section>' +
    '<section class="guide-chapter" id="guide-trip"><div class="guide-chapter-title"><div><span class="eyebrow">THE RIGHT START FOR YOUR DAY</span><h2>A quick trip brief.</h2><p>Pick the day, the way you fish and what you have in mind.</p></div></div><form id="guide-trip-form" class="guide-trip-form"><label>Your day<input id="guide-trip-date" type="date" value="' + localDate() + '" required></label><label>How are you fishing?<select id="guide-trip-method"><option value="beach">From the beach</option><option value="boat">From a boat</option><option value="rocks">From the rocks</option><option value="estuary">Around the estuary</option><option value="spearfishing">Spearfishing</option></select></label><label>What are you thinking?<select id="guide-trip-target"><option value="any">Any species</option>' + FISH.map(fish => '<option value="' + fish.id + '">' + fish.name + '</option>').join('') + '</select></label><button class="button button-primary" type="submit">Make my brief </button></form><div id="guide-trip-result" class="guide-trip-result" aria-live="polite"></div></section>' +
    '<section class="guide-chapter" id="guide-rules"><div class="guide-chapter-title"><div><span class="eyebrow">CHECK BEFORE THE FIRST CAST</span><h2>The rules travel with you.</h2><p>Species, place, date and gear all matter. These links take you to the people who set the rules.</p></div></div><div class="guide-checked"><span class="guide-checked-dot"></span><strong>Sources checked ' + CHECKED_LABEL + '</strong><span>Recheck on the day. This is a selected summary, not a complete rulebook.</span></div><div class="guide-closure-grid"><article class="guide-closure-card"><span class="guide-rule-label">EAST COAST SEASONAL CLOSURE</span><h3>Snapper and pearl perch</h3><p class="guide-closure-date">15 July to 15 August</p><p>The current published annual closure applies to east coast tidal waters. Check the official page when choosing a target.</p>' + link(SOURCES.closures, 'Read the closed-season rules') + '</article><article class="guide-closure-card"><span class="guide-rule-label">SOUTHERN SPANISH MACKEREL</span><h3>Two summer closure periods</h3><p class="guide-closure-date">1 to 21 February<br>1 to 21 March</p><p>The published annual southern closures apply south of 22°S, including the Point Lookout region. These are the listed pattern for 2026 and 2027.</p>' + link(SOURCES.closures, 'Check dates and closure areas') + '</article></div><div class="guide-rules-grid"><article class="guide-source-card"><h3>Know what you caught.</h3><p>Species can look alike. Confirm identification, size and possession rules, combined limits and boat rules. A possession limit is not simply a daily bag.</p>' + link(SOURCES.identification, 'Identify the fish') + link(SOURCES.rules, 'See the current limits') + '</article><article class="guide-source-card"><h3>Know the exact zone.</h3><p>Use the Moreton Bay maps or official apps at your actual fishing spot. For recreational fishers, marine national park green zones prohibit fishing and collecting. Other zones and designated areas have their own conditions. <a href="#guide/customary-rights">Read about customary fishing rights</a>.</p>' + link(SOURCES.zones, 'Open maps and official apps') + link(SOURCES.zoneRules, 'Read the zone activity table') + '</article><article class="guide-source-card"><h3>Keep your rules handy.</h3><p>Download the official QLD Fishing 2.0 app and marine park information before a trip. Check gear, bait gathering and location restrictions too. A fish being in season does not settle every rule.</p>' + link(SOURCES.rules, 'Queensland fishing rules') + link(SOURCES.closures, 'Other seasonal closures') + '</article></div></section>' +
    '<section class="guide-chapter" id="guide-conditions"><div class="guide-chapter-title"><div><span class="eyebrow">PUT THE WHOLE PICTURE TOGETHER</span><h2>A little bait. A little observation.</h2><p>Club planning notes to help you ask better questions, then make a sensible call.</p></div></div><div class="guide-conditions-grid">' +
      [['0% 0%','Weather','Look at the forecast and warnings, then look at the actual water. A pleasant day on land can feel very different at sea.'],['50% 0%','Wind','Read direction and gusts as well as the average. Plan for the return trip and the least experienced person in your group.'],['100% 0%','Swell','Height is only part of the story. Direction, period and larger sets matter, especially near rocks and bars.'],['0% 100%','Tides','Use the right local tide station and check access both ways. Keep a retreat route as the water changes.'],['50% 100%','Sun and moon','Use estimated activity windows as a planning idea. Daylight, visibility, weather and safe access come first.'],['100% 100%','Storms and radar','Check current warnings and radar before departure and when plans change. A fishing plan can wait for another day.']].map(item => '<article class="guide-condition-card"><span class="guide-condition-art" style="background-position:' + item[0] + '" aria-hidden="true"></span><h3>' + item[1] + '</h3><p>' + item[2] + '</p></article>').join('') + '</div><div class="guide-bait-panel"><div><span class="eyebrow">BE THOUGHTFUL WITH BAIT</span><h3>Small, fresh and suitable.</h3><p>Match bait size to the target and keep spare bait cool. Ask the tackle shop what has been working locally. Start simple before changing rigs, weights and baits all at once.</p></div><div><span class="guide-rule-label">OFFICIAL BAIT GUIDANCE</span><p>Use Australian wild-caught prawns from a quality bait supplier or catch your own within the rules. Do not use imported raw prawns as bait. Check current white spot movement restrictions before moving crustaceans.</p>' + link(SOURCES.care, 'Read the bait and biosecurity advice') + '</div></div></section>' +
    '<section class="guide-chapter" id="guide-care"><h2>Release a fish</h2>' + releaseCareHtml() + '</section>' +
    '<section class="guide-chapter" id="guide-catch-care"><h2>Look after the catch</h2>' + catchCareHtml() + '</section>' +
    '<section class="guide-chapter" id="guide-safety"><div class="guide-chapter-title"><div><span class="eyebrow">GET HOME WITH A STORY</span><h2>Safety belongs in every plan.</h2><p>Choose an outing that suits the conditions and everyone coming along.</p></div></div><div class="guide-safety-grid"><article class="guide-safety-card"><h3>From the beach</h3><p>Read local signs, watch the shore break and keep back from unstable edges. Deeper gutters and rip currents can be dangerous places to wade.</p><details><summary>A few things to remember</summary><p>Know the access and return route, keep children close and maintain a clear casting area. If you swim, choose a patrolled beach and swim between the red and yellow flags.</p></details>' + link(SOURCES.beach, 'Understand rip currents') + '</article><article class="guide-safety-card"><h3>From the rocks</h3><p>Wear a lifejacket and suitable footwear, take company, watch swell cycles and plan your exit. Keep your attention on the sea.</p><details><summary>When conditions change</summary><p>Watch from a safe position before setting up. Tell someone where you are going and when you will return. Leave if the platform or route becomes unsafe. Do not jump in after someone swept away; call 000 and seek help.</p></details>' + link(SOURCES.rocks, 'Surf Life Saving rock advice') + '</article><article class="guide-safety-card"><h3>From a boat</h3><p>Carry the required equipment, check the forecast and prepare for the return. Use the current MSQ lifejacket rules for your craft and passengers.</p><details><summary>Bars need their own decision</summary><p>Local knowledge, suitable conditions and the right boat matter. Check tides and weather for both crossings, prepare equipment and log on with marine rescue. If unsure, do not attempt a crossing.</p></details><div class="guide-small-links">' + link(SOURCES.lifejackets, 'Lifejacket requirements') + link(SOURCES.bars, 'Coastal bar advice') + '</div></article></div><div class="guide-reporting"><div><span class="eyebrow">HELP LOOK AFTER OUR WATERS</span><h3>Report a fisheries concern</h3><p>Report suspected illegal fishing, abandoned fishing gear or habitat damage through the official channels. Stay safe, do not confront people and do not interfere with their gear.</p><details><summary>What is useful to note?</summary><p>From a safe place, note the date, time, location and what you saw. Vessel or vehicle details and photos can help if obtained safely. Send observations to investigators rather than posting accusations publicly.</p></details></div><div class="guide-report-actions"><span class="guide-rule-label">FISHWATCH / 24 HOURS, 7 DAYS</span><a href="tel:1800017116" class="guide-report-phone">1800 017 116</a>' + link(SOURCES.reporting, 'Make an official online report', 'button button-primary') + '<p>For an emergency or immediate danger, call <a href="tel:000"><strong>000</strong></a>. ' + link(SOURCES.emergency, 'Emergency information') + '</p></div></div><div class="guide-bottom-note"><strong>A living club guide.</strong><span>Official sources checked ' + CHECKED_LABEL + '. Rules and local conditions can change. General club tips are suggestions, not a safety assessment, scientific fish identification or permission to retain a catch.</span></div><a href="#fishing" class="button button-secondary guide-return-link">Plan my day</a></section>';

  main.append(section);
  setupRigWorkshop(section);
  setupCatchKitchen(section);
  setupWaterRules(section);
  separateGuideTopics(section);
  window.addEventListener('hashchange',()=>{
    if(location.hash!=='#guide/pipis')section.querySelector('.pipi-film video')?.pause();
  });
  section.insertAdjacentHTML('beforeend', '<nav class="guide-end-navigation" aria-label="Return to fishing guide topics" hidden></nav>');
  for (const [slug, [id]] of Object.entries(GUIDE_TOPICS)) {
    const chapter = section.querySelector('#' + id);
    chapter.dataset.guideTopic = slug;
    chapter.querySelector('h2')?.setAttribute('aria-level', '1');
    chapter.hidden = true;
  }
  const search = section.querySelector('#guide-fish-search');
  const filter = section.querySelector('#guide-fish-type');
  const familyPicker=document.createElement('optgroup');
  familyPicker.label='Browse related species';
  for(const [label] of speciesFamilies(fieldSpecies))familyPicker.append(new Option(label,'family:'+label));
  filter.append(familyPicker);
  filter.add(new Option('Point Lookout reef fish','local-reef'));
  const quick=document.createElement('div');
  quick.className='fish-quick-picks';
  quick.setAttribute('role','group');
  quick.setAttribute('aria-label','Browse fish groups');
  const shortcuts=[['Flatheads','family:Flatheads'],['Tuna and bonito','family:Tunas and bonitos'],['Point Lookout reef fish','local-reef'],['Sharks','Sharks'],['Rays','Rays']];
  for(const [label,value] of shortcuts){
    const button=document.createElement('button');
    button.type='button';button.textContent=label;button.dataset.filter=value;
    button.addEventListener('click',()=>{search.value='';filter.value=value;restart();});
    quick.append(button);
  }
  section.querySelector('.guide-filters').after(quick);
  const tackleById=new Map(FISH.map(fish=>[fish.id,fish]));
  const pages=section.querySelector('#guide-fish-pages');
  let page=0;
  function renderFish() {
    const date = section.querySelector('#guide-trip-date').value;
    const onDate = dateParts(date) ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: 'Australia/Brisbane' }).format(new Date(date + 'T12:00:00+10:00')) : '';
    section.querySelector('#guide-fish-on-date').textContent = onDate ? 'Seasonal checks for ' + onDate + '.' : 'Choose a date for seasonal checks.';
    const query = search.value.trim().toLowerCase();
    const key=nameKey(query);
    // An exact name takes priority over a passing mention on a lookalike's card.
    const named=key?fieldSpecies.filter(s=>[s.name,s.scientificName,...(guideNames[s.id]||[])].some(n=>n&&nameKey(n)===key)):[];
    const matching=fieldSpecies.filter(species=>{
      const tackle=tackleById.get(species.id),notes=pictureNotes[species.id];
      const group=filter.value;
      const inGroup=group==='all'||group===species.group||group==='family:'+species.family||(group==='local-reef'&&species.reefGuide)||(group==='protected'&&!species.eligible)||(group==='eligible'&&species.eligible)||tackle?.types.includes(group);
      if(!inGroup)return false;
      if(named.length)return named.includes(species);
      return [species.name,species.scientificName,species.feature,species.group,species.family,species.searchNames,species.commonNames,
        ...(guideNames[species.id]||[]),tackle?.search,tackle?.bait,notes?.spot,...(notes?.baits||[]).map(id=>baitLabels[id])].join(' ').toLowerCase().includes(query);
    });
    const batches=[[]];
    let batchSize=0;
    for(const family of speciesFamilies(matching)){
      if(batchSize && batchSize+family[1].length>8){batches.push([]);batchSize=0;}
      batches[batches.length-1].push(family);batchSize+=family[1].length;
    }
    page=Math.max(0,Math.min(page,batches.length-1));
    const subset=batches[page];
    const count=batch=>batch.reduce((total,[,fish])=>total+fish.length,0);
    const start=1+batches.slice(0,page).reduce((total,batch)=>total+count(batch),0);
    const reefNote=filter.value==='local-reef'?'<aside class="field-place-note"><strong>Flat Rock is a green zone.</strong> Watch the fish here. All recreational fishing, including catch and release, is prohibited inside its boundary. <a target="_blank" rel="noopener" href="https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps">See the official boundary</a>.</aside>':'';
    section.querySelector('#guide-species-grid').innerHTML=subset.length?reefNote+subset.map(([family,fish])=>
      '<h3 class="field-family-heading">'+escapeHtml(family)+(family==='Flatheads'?'<small>Compare the tail markings</small>':'')+'</h3>'+
      fish.map(s=>tackleById.has(s.id)?speciesCard(tackleById.get(s.id),date):fieldSpeciesCard(s)).join('')).join(''):
      '<div class="guide-no-results"><h3>No matching species</h3><p>Try a common name like bream or change the group.</p><button class="button button-secondary" type="button" id="guide-reset-search">Show all species</button></div>';
    section.querySelector('#guide-fish-count').textContent=matching.length?'Showing '+start+' to '+(start-1+count(subset))+' of '+matching.length+' species.':'No matching species.';
    for(const button of quick.children)button.setAttribute('aria-pressed',String(button.dataset.filter===filter.value));
    pages.hidden=batches.length<=1;
    pages.firstElementChild.disabled=page===0;
    pages.lastElementChild.disabled=page===batches.length-1;
  }
  const requestedGroup=new URLSearchParams(location.search).get('fish');
  const linkedGroups={flathead:'family:Flatheads',tuna:'family:Tunas and bonitos',reef:'local-reef',sharks:'Sharks',rays:'Rays'};
  if(Object.hasOwn(linkedGroups,requestedGroup))filter.value=linkedGroups[requestedGroup];
  const restart=()=>{page=0;renderFish();};
  search.addEventListener('input',restart);
  filter.addEventListener('change',restart);
  pages.addEventListener('click',event=>{
    const button=event.target.closest('[data-fish-page]');if(!button)return;
    page+=Number(button.dataset.fishPage);renderFish();
    const heading=section.querySelector('#guide-fish-count');heading.tabIndex=-1;heading.focus();
  });
  section.addEventListener('click', event => {


    if (event.target.closest('#guide-reset-search')) { search.value = ''; filter.value = 'all'; renderFish(); search.focus(); }
  });
  const form = section.querySelector('#guide-trip-form');
  const updateBrief = () => {
    renderFish();
    section.querySelector('#guide-trip-result').innerHTML = briefHtml(getTripBrief({ date: section.querySelector('#guide-trip-date').value, method: section.querySelector('#guide-trip-method').value, target: section.querySelector('#guide-trip-target').value }));
  };
  function syncTrip() {
    try {
      const trip = JSON.parse(localStorage.getItem('plfc-trip-demo') || '{}');
      if (dateParts(trip.date)) section.querySelector('#guide-trip-date').value = trip.date;
      if (Object.hasOwn(METHOD_TIPS, trip.method)) section.querySelector('#guide-trip-method').value = trip.method;
      const aliases = { whiting: 'sand-whiting', bream: 'yellowfin-bream', flathead: 'dusky-flathead', dart: 'swallowtail-dart' };
      const target = aliases[trip.target] || trip.target;
      if ([...section.querySelector('#guide-trip-target').options].some(option => option.value === target)) section.querySelector('#guide-trip-target').value = target;
    } catch { /* The guide remains usable without saved preferences. */ }
    updateBrief();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const previous = JSON.parse(localStorage.getItem('plfc-trip-demo') || '{}');
      localStorage.setItem('plfc-trip-demo', JSON.stringify({ ...previous, date: section.querySelector('#guide-trip-date').value, method: section.querySelector('#guide-trip-method').value, target: section.querySelector('#guide-trip-target').value }));
    } catch { /* A trip brief can still be read when local storage is blocked. */ }
    updateBrief();
  });
  guideView = { section, syncTrip };
  renderGuideRoute('');
  return section;
}
