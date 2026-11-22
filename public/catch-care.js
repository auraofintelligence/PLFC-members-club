const fisheries = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/';
const sources = {
  release: fisheries + 'responsible-fishing',
  limits: fisheries + 'rules/limits-tidal',
  measure: fisheries + 'rules/measure',
  cold: 'https://www.qld.gov.au/health/staying-healthy/food-pantry/food-safety-for-consumers/food-safety-at-home/eating-outdoors',
  humane: 'https://douglas.qld.gov.au/download/Responsible_Fishing_Flyer_Final_-webpage.pdf',
  pressure: 'https://www.publications.qld.gov.au/dataset/barotrauma/resource/d805ff88-9dbc-4ed7-9c12-dcedad6cd516',
  video: 'https://www.youtube.com/watch?v=PXBGArrnhts',
};

function sourceLink(url, title) {
  return `<a href="${url}" target="_blank" rel="noopener">${title}</a>`;
}

const releaseArt = '/assets/care/release-support.webp';

export function catchCareHtml() {
  return `<div class="catch-companion">
    <nav class="catch-choices" aria-label="Choose what to do with your fish">
      <a class="catch-choice" href="#guide/care">
        <img src="${releaseArt}" width="600" height="360" alt="">
        <span><strong>Release a fish</strong><small>Support it in the water and help it swim away.</small></span>
      </a>
      <a class="catch-choice" href="#guide/kitchen">
        <img src="/assets/care/ice.webp" width="600" height="360" alt="">
        <span><strong>Keep a fish for dinner</strong><small>Check the species and size, then chill your catch.</small></span>
      </a>
    </nav>
    <aside class="catch-rule">
      <h3>When it goes straight back</h3>
      <p>Accidentally caught a protected, undersized, oversized or out-of-season fish? Release it immediately. Skip the photo. If you cannot identify a native fish, let it go.</p>
      <div class="catch-links"><a href="#guide/fish">Identify a fish</a>${sourceLink(sources.limits, 'Queensland size and possession limits')}<a href="#guide/rules">Check closed seasons</a></div>
    </aside>
    <div class="catch-extras">
      <details><summary>Taking a competition photo?</summary><div>
        <p>For an eligible fish, wet the brag mat and have the camera ready. Lay the fish naturally against the zero mark. Take one clear photo of the whole fish and the scale, then return it to the water.</p>
        <div class="catch-links"><a href="#guide/brag-mat">See the brag mat example</a>${sourceLink(sources.measure, 'How Queensland measures fish')}</div>
      </div></details>
      <details><summary>Taking dinner home?</summary><div>
        <p>Keep only what you will eat. Once you have confirmed you can keep the fish, kill it promptly and humanely, then pack it on ice. Aim for 5°C or colder. Keep bait in a separate esky.</p>
        <div class="catch-links"><a href="#guide/kitchen">Clean and store a fish</a>${sourceLink(sources.cold, 'Queensland Health on chilling seafood')}${sourceLink(sources.humane, 'Humane catch care (PDF)')}</div>
      </div></details>
      <details><summary>Packing up at the jetty?</summary><div>
        <p>Gather loose line and hooks before birds find them. Bag fish frames, bait and scraps for a bin on land. Clean the bench for the next person.</p>
        <div class="catch-links"><a href="#guide/jetty">Share the jetty</a><a href="#guide/wildlife">Help an injured bird or other wildlife</a></div>
      </div></details>
    </div>
    <a class="catch-species-link" href="#guide/sharks">Caught a shark or ray? See the handling guide <span aria-hidden="true">→</span></a>
  </div>`;
}

export function releaseCareHtml() {
  return `<div class="catch-companion">
    <div class="catch-release-layout">
      <figure class="catch-support"><img src="${releaseArt}" alt="Illustration of a fish supported horizontally from underneath with both hands in the water." width="750" height="500">
      <figcaption>Keep the gills underwater. Support the body from below. <small>AI illustration of hand placement.</small></figcaption></figure>
      <ol class="catch-release-steps">
        <li><strong>Wet your hands</strong><p>Keep the fish in the water while you work. If you need a landing net, use one with knotless mesh.</p></li>
        <li><strong>Free the hook gently</strong><p>If the hook is deep or pulling it would cause injury, snip the line close to it. Avoid touching the eyes and gills.</p></li>
        <li><strong>Let it swim from your hands</strong><p>Where safe, support the fish upright, facing into a gentle current. Open your hands when it can swim on its own.</p></li>
      </ol>
    </div>
    <div class="catch-links catch-watch">${sourceLink(sources.video, 'Watch Fisheries Queensland demonstrate')}${sourceLink(sources.release, 'Read the official release guide')}</div>
    <div class="catch-extras">
      <details><summary>Reef fish floating at the surface?</summary><div>
        <p>Pressure changes on the way up can expand a fish’s swim bladder and stop it swimming back down. This is called barotrauma. It is more common in water deeper than 20 metres.</p>
        <p>Before a deep reef trip, learn to use a release weight and have it ready. It can return an affected fish to depth. Give the photo a miss.</p>
        <div class="catch-links">${sourceLink(sources.pressure, 'Queensland guide to signs and release weights')}${sourceLink('https://www.youtube.com/watch?v=p1wpfXEIZfo', 'Watch the Fisheries Queensland barotrauma video')}</div>
      </div></details>
      <details><summary>Shark, ray or fish you cannot identify?</summary><div>
        <p>Give it room and keep children clear. Leave sharks and rays in the water. A photo can wait. Use the species guide to learn which animals have dangerous teeth or spines.</p>
        <div class="catch-links"><a href="#guide/sharks">Shark and ray handling</a><a href="#guide/fish">Fish identification photos</a></div>
      </div></details>
    </div>
    <a class="catch-species-link" href="#guide/brag-mat">See how to photograph an eligible club catch <span aria-hidden="true">→</span></a>
  </div>`;
}
