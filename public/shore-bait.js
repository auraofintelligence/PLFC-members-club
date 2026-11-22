const assets='/assets/bait/shore/';
const refs={
  nipper:'https://collections.museumsvictoria.com.au/specimens/590541',
  identification:'https://www.museum.qld.gov.au/learn-and-discover/animals-of-queensland/crustaceans/mud-and-coral-lobsters',
  worm:'https://era.dpi.qld.gov.au/7132/1/7108-Qld-Marine-Worm-ID-guide_WEB.PDF#page=5',
  licence:'https://creativecommons.org/licenses/by/4.0/',
  limits:'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal#worms',
  pump:'https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2019-0076#sec.160',
  gear:'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/equipment',
  zones:'https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps',
  care:'https://parks.qld.gov.au/parks/moreton-bay/about',
  safeBait:'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/bait',
  movement:'https://www.business.qld.gov.au/industries/farms-fishing-forestry/agriculture/biosecurity/animals/diseases/white-spot-disease/movement-restrictions',
  gathering:'https://bnbfishing.com.au/collecting-bait-for-beach-and-flats/',
  nipperBait:'https://bnbfishing.com.au/tips-for-catching-sand-whiting/',
  wormBait:'https://www.tackletactics.com.au/blogs/learn-to-fish/bait-fishing-basics-how-to-catch-whiting',
  film:'https://www.youtube.com/watch?v=6fIsDioZnY4',
};
const link=(key,label)=>`<a href="${refs[key]}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const wormCredit='© State of Queensland, 2017. '+link('worm','Queensland marine worm identification guide, figure 1')+' · '+link('licence','CC BY 4.0')+'. Extracted and converted to WebP.';
const nipperCredit='Michael Marmach, © Museums Victoria. '+link('nipper','Specimen J 40581')+' · '+link('licence','CC BY 4.0')+'. Converted to WebP.';
function imageCard(src,alt,title,body,credit){
  return `<article class="water-gear-card"><img class="water-gear-image" src="${src}" alt="${alt}" loading="lazy" width="770" height="450"><div class="water-gear-copy"><h3>${title}</h3><p>${body}</p>${credit?'<details><summary>Picture credit</summary><small>'+credit+'</small></details>':''}</div></article>`;
}
const checks=`<details class="care-further"><summary>Check the zone and look after the bank</summary><p>Find your position on the Moreton Bay Marine Park map before collecting. Recreational bait gathering is prohibited in green zones. Stay on bare sand, leave seagrass and feeding shorebirds undisturbed, and level any holes. If a seagrass sod is lifted, the park requires it to be replaced upright. ${link('zones','Open the official map')} · ${link('care','Moreton Bay bait gathering rules')}</p></details>
<details class="care-further"><summary>Can I take the bait somewhere else?</summary><p>Collect close to where you will fish. The South East Queensland white spot movement area extends to a line 100 m off Stradbroke Island. Uncooked saltwater yabbies and marine worms cannot be taken out of that area. This matters if you are heading offshore. Use the official boundary map before travelling. Bin unused bait and scraps. ${link('movement','Check the movement boundary')} · ${link('safeBait','Queensland bait advice')}</p></details>`;
function steps(entries){
  return '<div class="water-check-steps">'+entries.map(([name,copy],i)=>`<article><span aria-hidden="true">${i+1}</span><h3>${name}</h3><p>${copy}</p></article>`).join('')+'</div>';
}
function yabbies(){
  return `<section id="shore-bait-yabbies" aria-label="Saltwater yabbies and the hand pump">
    <div class="water-gear-grid">
    ${imageCard(assets+'ghost-nipper.webp','Ghost nipper in side view, with a pale jointed abdomen, a tail fan and conspicuous front claw','Recognise a ghost nipper','This little marine crustacean lives in burrows beneath tidal flats. Look for the soft pale body, tail fan and paired claws. One claw can be much larger in a male. The photo shows <i>Trypaea australiensis</i>. '+link('identification','Queensland Museum field notes'),nipperCredit)}
    ${imageCard('/assets/care/yabby-pump.webp','Illustration of a hand-operated metal bait pump beside a bucket on a tidal flat','Take a hand pump and a bucket','Look for a sheltered bay-side flat with clusters of small burrow openings in wet sand as the tide falls. Carry a bucket for the few nippers you intend to use. A floating sieve helps when shallow water covers the sand. '+link('gathering','A local angler’s gathering guide'),'Club equipment illustration.')}
    </div>
    ${steps([['Find a burrow','Choose bare, wet sand with a little mound or ring of disturbed sand by an opening. Keep off seagrass and mangrove roots.'],['Pump beside the opening','Stand the barrel beside the hole. Pull the handle up to draw wet sand into the pump, then empty it onto the wet flat or into your sieve. Look before pumping again.'],['Choose what to keep','Pick up the nipper gently behind the claw. Leave egg-carrying nippers in their habitat. Return other live creatures straight away where they came from. Take only enough bait for this outing.']])}
    <p>${link('gathering','See the sand-flat technique')}</p>
    <div class="field-place-note"><strong>Before pumping</strong> Queensland lists no minimum size or possession limit for saltwater yabbies. Section 160 permits a recreational hand pump for taking yabbies only. Check that bait gathering is open at your spot. ${link('limits','Queensland bait limits')} · ${link('pump','Hand pump rule')}</div>
    <details class="care-further"><summary>Present a nipper for sand whiting</summary><p>Match a small hook to the bait. Start at the tail, follow the body and bring the point out near the head. Keep the body straight and the hook point clear. A gentle cast helps the soft bait stay on. ${link('nipperBait','See the local whiting rig')} · <a href="#guide/rig">Club rig pictures</a></p></details>
    ${checks}</section>`;
}
function beachworms(){
  return `<section id="shore-bait-beachworms" aria-label="Beach worms in the surf wash">
    <div class="water-gear-grid">
    ${imageCard(assets+'beachworm.webp','Full-length Australian beach worm with a narrow pink-brown segmented body','Recognise a beach worm','A long, segmented marine worm lives beneath the sand on surf beaches. This is <i>Australonuphis parateres</i>, one of the Queensland beach worms. The whole body usually stays hidden. ',wormCredit)}
    ${imageCard(assets+'beachworm-head.webp','Close view of the ridged front end and mouth of the same beach worm species','Watch for the head','Look across the thin water running back down a gently sloping beach. When a worm rises to feed, its head may make a little V in the wash. Stay on foot where the water is shallow and keep watching the surf. '+link('gathering','See the shore technique'),wormCredit)}
    </div>
    ${steps([['Bring two baits','Use a reusable mesh bag with a locally caught fish frame for scent. Keep a small firm piece of suitable bait fish in your other hand, and take a bucket with damp beach sand.'],['Draw the worm up','Around low tide, gently sweep the bag in the shallow wash as a wave recedes. When you see a head, offer the small bait close to it and let the worm take hold.'],['Lift steadily','As the worm arches, grip just behind the head with your fingers and ease it out in one steady pull. Move on if it retreats. Leave the rest in their burrows and keep the worms you need shaded in damp sand.']])}
    <p>${link('film','Watch a beach worm being gathered on North Stradbroke Island')} · ${link('gathering','Read the angler’s field notes')}</p>
    <div class="field-place-note"><strong>Count the worms you keep</strong> Queensland’s recreational possession limit is <strong>30 beach worms</strong>, with no minimum size. The state identification guide says to include whole worms and pieces. A hand pump is for yabbies. Check local worm-digging closures and fish habitat restrictions before taking digging gear. ${link('limits','Current Queensland limits')} · ${link('worm','Whole worms and pieces')} · ${link('gear','Gear and closure information')}</div>
    <details class="care-further"><summary>Bait a hook for whiting or dart</summary><figure class="field-photo"><img src="/assets/tackle/baited-worm.webp" alt="Illustration of worm bait along the hook shank with the point clearly showing" width="440" height="440" loading="lazy"><figcaption>Club illustration of bait presentation.</figcaption></figure><p>Use a short length of worm on a small long-shank hook. Thread it along the shank so it sits straight and the point stays exposed. Recheck after a missed bite. ${link('wormBait','See a whiting bait presentation')} · <a href="#guide/rig">Club rig pictures</a></p></details>
    ${checks}</section>`;
}
export function shoreBaitHtml(slug){
  if(slug==='yabbies')return yabbies();
  if(slug==='beachworms')return beachworms();
  return `<nav aria-label="Shore bait guides" class="guide-species-grid">
    <a class="field-card" href="#guide/yabbies"><span class="field-photo"><img src="${assets}ghost-nipper.webp" alt="Pale ghost nipper with claws and a tail fan" loading="lazy"></span><span class="field-card-label"><strong>Yabbies and the hand pump</strong></span></a>
    <a class="field-card" href="#guide/beachworms"><span class="field-photo"><img src="${assets}beachworm.webp" alt="Long, narrow beach worm with a segmented body" loading="lazy"></span><span class="field-card-label"><strong>Beach worms in the surf wash</strong></span></a></nav>
    <details class="care-further"><summary>Picture credits</summary><p>${nipperCredit}</p><p>${wormCredit}</p></details>`;
}
