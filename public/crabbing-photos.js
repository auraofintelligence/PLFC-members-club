const external = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

export function crabbingPhotosHtml() {
  return `<div class="water-gear-grid" aria-label="Crab identification photos">
    <article class="water-gear-card">
      <img src="/assets/crabbing/mud-crab.webp" width="960" height="720" loading="lazy" decoding="async" style="display:block;width:100%;height:auto" alt="Male mud crab viewed from above, with thick green claws and a row of teeth along each side of its shell.">
      <div class="water-gear-copy"><h3>Mud crab</h3><p>Look for the heavy claws and broad, toothed shell. The photo shows a male giant mud crab.</p></div>
    </article>
    <article class="water-gear-card">
      <img src="/assets/crabbing/blue-swimmer.webp" width="940" height="705" loading="lazy" decoding="async" style="display:block;width:100%;height:auto" alt="Blue swimmer seen from above, with long slender blue claws, white markings on the shell and paddle-shaped back feet.">
      <div class="water-gear-copy"><h3>Blue swimmer crab</h3><p>Also called a sand crab. Look for the long point sticking out from each side of the shell. Colour varies.</p></div>
    </article>
  </div>
  <details class="care-further"><summary>Compare female and male belly flaps</summary>
    <figure style="margin:1rem 0"><img src="/assets/crabbing/male-female.webp" width="350" height="148" loading="lazy" decoding="async" style="display:block;max-width:100%;height:auto" alt="Underside drawings side by side. The female has a broad, rounded flap. The male has a narrow, pointed flap.">
      <figcaption>Look underneath. A female has a broad, rounded flap. A male has a narrow, pointed flap. If you are unsure, let the crab go.</figcaption></figure>
  </details>
  <details class="guide-index-credit"><summary>Photo and drawing credits</summary>
    <p>Mud crab by ${external('https://commons.wikimedia.org/wiki/File:Scylla_serrata.jpg', 'Almandine on Wikimedia Commons')}, with background and tone edits by JMK. WebP copy under ${external('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')}.</p>
    <p>Open hoop illustration by Point Lookout Fishing Club, using a cutout of the same mud crab photograph. Illustration under ${external('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')}.</p>
    <p>Blue swimmer photographed at Rockingham, Western Australia, by ${external('https://www.inaturalist.org/observations/257466475', 'Matthew Collette on iNaturalist')}. Resized WebP under ${external('https://creativecommons.org/publicdomain/zero/1.0/', 'CC0')}.</p>
    <p>Female and male mud crab drawing © State of Queensland. Converted to WebP from ${external('https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/measure', 'Measure your catch')} under ${external('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0')}.</p>
  </details>`;
}
