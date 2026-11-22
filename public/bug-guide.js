import {bugPhotosHtml} from './bug-photos.js';

const sources = {
  identification: 'https://www.daf.qld.gov.au/__data/assets/pdf_file/0011/1887698/moreton-bay-bug-guide-rec-fishers.pdf',
  limits: 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal',
  stocks: 'https://www.fish.gov.au/report/274-MORETON-BAY-BUG-2023',
  habitat: 'https://www.afma.gov.au/Species/bugs',
  zone: 'https://parks.qld.gov.au/parks/moreton-bay/zoning/provisions-tables',
  law: 'https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2019-0076#sec.164',
  recipe: 'https://mattmoran.com.au/recipes/moreton-bay-bugs-with-herb-and-garlic-butter/',
};

function link(url, label) {
  return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
}

export function moretonBayBugsHtml() {
  return `<div class="catch-companion bug-guide">
    <p class="crab-lead">Moreton Bay bugs are flat-bodied slipper lobsters. Look for a wide head with an eye on each outer corner. Then look at the walking legs.</p>
    ${bugPhotosHtml()}
    <aside class="catch-rule"><h3>Can I catch one from the bank?</h3>
      <p>A shore pot is a better bet for mud crabs. Bugs live on sand or mud under deeper water, commonly 10 to 50 metres down. Most of the bugs sold for dinner come from commercial trawlers.</p>
      <p>The national stock report lists diving and traps or pots as Queensland recreational methods. The size of that catch is unknown. We have no verified shore method for Straddie.</p>
      <div class="catch-links"><a href="#guide/crabbing">Try crabbing from shore</a>${link(sources.habitat,'Where bugs live')}${link(sources.stocks,'Recorded fishing methods')}</div>
    </aside>
    <div class="catch-extras">
      <details><summary>Where can a recreational fisher collect one?</summary><div>
        <p>Hand collection is allowed where limited collecting is open in the marine park, subject to fisheries closures. Leave everything in place in green zones. A snorkel is the only underwater breathing equipment allowed for a recreational take. Commercial trawling needs a licence.</p>
        <div class="catch-links"><a href="#guide/zones">Find your zone</a>${link(sources.zone,'Moreton Bay permitted activities')}${link(sources.law,'Queensland fishing methods, section 164')}</div>
      </div></details>
      <details open><summary>How wide? How many?</summary><div>
        <p><strong>At least 7.5 cm across the widest part of the hard head shell.</strong> Leave the legs and tail out of the measurement. The Queensland recreational possession limit is 20 Moreton Bay bugs per person. Include any already at home.</p>
        <p>Keep each bug whole with the shell intact aboard the boat. The exception for bug meat is when it is to be eaten immediately.</p>
        <div class="catch-links">${link(sources.limits,'Queensland bug limits')}${link(sources.identification,'Illustrated Queensland bug guide (PDF)')}</div>
      </div></details>
      <details><summary>What if there are eggs under the tail?</summary><div>
        <p>Queensland allows legal-sized egg-bearing Moreton Bay bugs to be kept. You can choose to release one. Egg-bearing Balmain bugs must be released. Their eyes sit close together near the middle of the head. If you cannot tell them apart, let it go.</p>
        <div class="catch-links">${link(sources.identification,'Compare Moreton Bay and Balmain bugs (PDF)')}</div>
      </div></details>
      <details><summary>Cooking bugs at home?</summary><div>
        <p>The meat is in the tail. For an easy barbecue, ask your fishmonger for raw bugs split lengthways, keep them chilled and cook them in their shells. Already cooked bugs can be served cold.</p>
        <div class="catch-links">${link(sources.recipe,'Matt Moran’s barbecued bugs with herb and garlic butter')}${link('https://www.sydneyfishmarket.com.au/species/moreton-bay-bug/','Choosing and storing bugs')}</div>
      </div></details>
    </div>
  </div>`;
}
