export const WATER_RULES_CHECKED = '20 November 2026';
export const WATER_RULES_SOURCES = Object.freeze({
  maps: 'https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps',
  parkRules: 'https://parks.qld.gov.au/parks/moreton-bay/zoning/provisions-tables',
  parkQuestions: 'https://parks.qld.gov.au/parks/moreton-bay/zoning/frequent-questions',
  parkCare: 'https://parks.qld.gov.au/parks/moreton-bay/about',
  island: 'https://parks.qld.gov.au/parks/naree-budjong-djara/things-to-do',
  closures: 'https://www.dpi.qld.gov.au/services/fisheries/closures/tidal-locations',
  equipment: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/equipment',
  limits: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal',
  measure: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/measure',
  declaration: 'https://www.legislation.qld.gov.au/view/html/inforce/current/sl-2019-0076',
  traditional: 'https://www.dpi.qld.gov.au/services/fisheries/first-nations/engage',
  quandamooka: 'https://qyac.net.au/native-title/',
});

const sourceLink = (key, label, extra = '') => `<a class="water-source-link ${extra}" href="${WATER_RULES_SOURCES[key]}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (opens a new tab)</span></a>`;

export function getWaterRulesHtml() {
  return `<div class="guide-chapter-title"><div><span class="eyebrow">COUNTRY, ZONES AND THE WAY WE FISH</span><h2>Know your spot.<br>Choose the right method.</h2><p>These checks summarise recreational fishing and gathering. The exact water, activity and applicable rights all matter.</p></div></div>
  <div class="water-check-steps" aria-label="Three checks before fishing or gathering">
    <article><span>1</span><h3>Find the exact spot</h3><p>Fishing from shore? Find the beach, rocks or jetty on the map. Check the water your line or net will enter.</p></article>
    <article><span>2</span><h3>Choose the activity</h3><p>Line fishing, spearfishing, pots, nets and gathering have different rules.</p></article>
    <article><span>3</span><h3>Check before you go</h3><p>Read the zone, designated-area rules, closures and species limits together.</p></article>
  </div>
  <div class="water-zones-layout">
    <article class="water-map-card"><span class="eyebrow">MORETON BAY MARINE PARK</span><h3>A town name covers many waters.</h3><p>Choosing “Amity” or “Point Lookout” on this website does not check a marine park zone. Use the official map and your exact position.</p>${sourceLink('maps', 'Open official zone maps and apps', 'button outline')}<p class="water-map-note">The Marine Parks Southern Queensland app includes offline maps. Check designated areas as well as the zone colour.</p></article>
    <div class="water-zone-key" aria-label="Read these colours on the official marine park map">
      <div><span class="water-zone-swatch water-green" aria-hidden="true"></span><p><strong>Green: marine national park</strong><span>Recreational fishing and gathering are no-take.</span></p></div>
      <div><span class="water-zone-swatch water-yellow" aria-hidden="true"></span><p><strong>Yellow: conservation park</strong><span>Limited activities. Check the rules for your method.</span></p></div>
      <div><span class="water-zone-swatch water-dark-blue" aria-hidden="true"></span><p><strong>Dark blue: habitat protection</strong><span>Check the permitted method and other restrictions.</span></p></div>
      <div><span class="water-zone-swatch water-light-blue" aria-hidden="true"></span><p><strong>Light blue: general use</strong><span>Gear rules, species limits and closures still apply.</span></p></div>
      ${sourceLink('parkRules', 'Read the park’s activity table')}
    </div>
  </div>
  <p class="water-rights-signpost">Customary rights and other lawful permissions can affect which rules apply. <button type="button" class="water-inline-button" data-water-scroll="guide-customary-rights">Read about rights and respectful reporting</button>.</p>
  <details class="water-local-examples"><summary>A few local places that need their own check</summary><div class="water-example-grid">
    <article><h3>Swan Bay</h3><p>Fisheries lists Swan Bay and the tidal creek joining its northern end as closed to all fishing. Use the official description for the boundary.</p>${sourceLink('closures', 'Check the Swan Bay closure')}</article>
    <article><h3>Island lakes and streams</h3><p>Parks Queensland’s Minjerribah visitor guidance prohibits fishing and bait collecting in the island’s lakes and streams.</p>${sourceLink('island', 'Read the island park guidance')}</article>
    <article><h3>Flat Rock and nearby offshore waters</h3><p>Flat Rock is a green zone and a grey nurse shark gathering place. Recreational fishing, including catch and release, is prohibited within the mapped green boundary.</p>${sourceLink('parkRules', 'Check designated-area rules')}</article>
  </div></details>

  <article class="water-spear-card"><h3>Spearfishing</h3><p>Find waters where you can spearfish and check the distances from public jetties and shark control gear.</p><a href="#guide/spearfishing">Open the spearfishing guide</a></article>

  <details class="care-further water-crab-card"><summary>How to label and mark your gear</summary><p>You can use up to four pots and dillies combined per person. Attach a tag with your surname and full address to each pot or dilly.</p><p>If you use a float, it must be solid, light coloured, at least 15 cm in every dimension and marked with your surname. If you tie to a fixed object above high water instead, attach a surname tag to the rope above high water. Leave other people’s gear alone.</p>${sourceLink('equipment', 'Check gear and labelling rules')}</details>
  <p class="guide-related"><a href="#guide/bait-gathering">Open the bait gathering guide</a></p>
  <div class="water-crab-size-heading"><h3>Check the crab before keeping it.</h3><p>These examples are recreational tidal-water rules. A possession limit includes catch kept at home, not just today’s catch.</p></div>
  <div class="water-crab-limits">
    <article><span class="water-limit-number">15 cm <small>minimum</small></span><h4>Mud crab</h4><p><strong>Male only.</strong> Measure the widest part of the shell. The limit is <strong>7 per person</strong> and <strong>14 per boat</strong> when two or more people are aboard.</p></article>
    <article><span class="water-limit-number">11.5 cm <small>minimum</small></span><h4>Blue swimmer crab</h4><p><strong>Male only.</strong> Measure between the notches immediately in front of the bases of the large side spines. The limit is <strong>20 per person</strong>.</p></article>
  </div>
  <p class="water-crab-check-note">Return female mud and blue swimmer crabs to the water immediately, unharmed. Keep the shell attached to crabs you retain. Check the official diagrams if unsure about sex or measurement. Other crab species have their own rules.</p>
  <div class="water-source-row">${sourceLink('measure', 'Open the official crab diagrams')}${sourceLink('limits', 'Check current size and possession limits')}</div>
  <p class="water-reviewed">Official sources checked <time datetime="2026-11-20">${WATER_RULES_CHECKED}</time>. Reopen the official guidance before each trip. This demo does not determine your position, permission or legal authority to fish.</p>`;
}

export function getRightsReportingHtml() {
  return `<aside class="water-rights-report" id="guide-customary-rights" aria-labelledby="water-rights-heading"><span class="eyebrow">RESPECT RIGHTS AND COUNTRY</span><h4 id="water-rights-heading">Respect rights. Report facts.</h4><p>QYAC describes recognised Quandamooka native title rights over parts of the land and waters around Minjerribah. Traditional fishing can involve modern gear. Which rules apply depends on the particular rights, Country, purpose and lawful authority.</p><p>If you have a concern, keep your distance and report the observed activity, place and time. Fisheries can assess applicable rules, rights and permits. Treat people respectfully; avoid confrontation and public accusations.</p><details><summary>How traditional fishing fits</summary><p>Queensland’s guidance connects traditional fishing with the relevant Country, laws and customs, and personal, domestic or non-commercial communal needs. Marine park guidance recognises the operation of native title rights. The circumstances matter; this page does not decide anyone’s identity, belonging or entitlement.</p><div class="water-rights-sources">${sourceLink('traditional', 'Queensland traditional fishing guidance')}${sourceLink('quandamooka', 'QYAC explains Quandamooka native title')}${sourceLink('parkQuestions', 'Native title and the marine park')}</div></details><p class="water-rights-date">Sources checked ${WATER_RULES_CHECKED}.</p></aside>`;
}

export function setupWaterRules(section) {
  if (!section?.querySelector) return null;
  let chapter = section.querySelector('#guide-water-rules');
  if (!chapter) {
    chapter = document.createElement('section');
    chapter.id = 'guide-water-rules';
    chapter.className = 'guide-chapter water-rules-chapter';
    chapter.innerHTML = getWaterRulesHtml();
    const safety = section.querySelector('#guide-safety');
    if (safety) safety.before(chapter); else section.append(chapter);
  }
  const reporting = section.querySelector('.guide-reporting');
  const actions = reporting?.querySelector('.guide-report-actions');
  if (actions && !reporting.querySelector('.water-report-panel')) {
    const panel = document.createElement('div');
    panel.className = 'water-report-panel';
    panel.innerHTML = getRightsReportingHtml();
    actions.before(panel);
    panel.append(actions);
  }
  if (!section.dataset.waterRulesBound) {
    section.dataset.waterRulesBound = 'true';
    section.addEventListener('click', (event) => {
      const button = event.target.closest('[data-water-scroll]');
      if (!button) return;
      const destination = section.querySelector(`#${button.dataset.waterScroll}`);
      if (!destination) return;
      destination.scrollIntoView({ behavior: 'auto', block: 'start' });
      destination.setAttribute('tabindex', '-1');
      destination.focus({ preventScroll: true });
    });
  }
  return chapter;
}
