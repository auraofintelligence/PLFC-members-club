const shellfish='https://www.foodstandards.gov.au/consumer/prevention-of-foodborne-illness/bacteria-foodborne-illness/toxins-in-seafood';
const market='https://www.sydneyfishmarket.com.au/species/pipi/';
const source=(url,label)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>';
const step=(heading,body)=>'<li><h3>'+heading+'</h3><p>'+body+'</p></li>';

export const pipiChoices='<nav class="pipi-choices" aria-label="Choose how to prepare pipis">'+
  '<a href="#guide/pipis-cooking"><strong>Prepare pipis for dinner</strong><span>Get the grit out, steam and shell</span></a>'+
  '<a href="#guide/pipis-bait"><strong>Prepare pipis for bait</strong><span>Shuck, salt and pin on a hook</span></a></nav>';

export function cookPipisHtml(){
  return '<p class="bait-intro">Gathering eugaries for dinner on Straddie? Choose your stretch of beach first. Once home, let the live pipis expel the grit they are carrying inside. Rinsing just the shells leaves sand in the first mouthful.</p>'+
    '<aside class="bait-check"><h3>Before gathering for a meal</h3><p>Find your spot on the marine park map and check the current collection rules. For eating, ask about shellfish harvest advice for that beach, especially after heavy rain, a spill or an algal bloom. Redland Council’s beach map measures swimming water. If you cannot establish that the harvest area is suitable for food, leave the pipis there.</p><div><a href="#guide/zones">Check my zone</a><a href="#guide/pipis">Hand-gathering and the possession limit</a>'+source('https://www.redland.qld.gov.au/Community-safety-and-health/Health-risks-and-regulation/Recreational-water-quality','Redland beach water updates')+source('https://www.metrosouth.health.qld.gov.au/hospital-and-health-centres/public-health-unit','Metro South Public Health advice')+'<a href="tel:0731564000">Call 07 3156 4000</a></div></aside>'+
    '<figure class="pipi-prep-picture"><img src="/assets/bait/bay/pipi-grit.webp" alt="A strainer of pipis lifted above a bowl with sand left at the bottom." loading="lazy"><figcaption>Lift the shells out and leave the sediment behind. Club illustration.</figcaption></figure>'+
    '<p class="pipi-kit"><strong>Have ready</strong> A bowl, colander, clean water, a lidded pot, tongs and a spoon. For the saltwater soak, have sea salt and kitchen scales.</p>'+
    '<ol class="pipi-steps">'+
    step('Check the shells','Take only what you will use. Keep your catch cool and out of the sun on the trip back. At the bench, keep intact shells that are closed or close when tapped. Discard cracked shells and any that stay open. Brush off the coarse sand.')+
    step('Get the grit out','Dissolve 30 g of sea salt in each litre of cool drinking water. Set the live pipis in a clean colander in the bowl so the water covers them and expelled sand can fall underneath. Sydney Fish Market describes a soak of several hours in a cool place. Keep the bowl away from sun and a hot kitchen. Use plain salt water for the soak. Vinegar can go in the dressing after cooking.')+
    step('Lift them out','Lift the colander straight out and leave the sandy water in the bowl. Empty and wash the bowl, then give the shells a quick rinse in the colander. Pouring the whole bowl through the colander puts the grit back over dinner.')+
    step('Steam, then shell','Bring water to a boil under a steamer. Add the pipis in a loose layer, cover and steam for 4 to 9 minutes. Discard shells that stay shut. Lift the opened shells into a clean bowl. Once cool enough to handle, slide a small spoon along the inside of each valve to free the cooked meat.')+
    step('Finish the dish','Leave the last sandy spoonful of cooking liquid in the pot. If using the rest for a sauce, pass it through a fine sieve lined with a clean damp food-safe cloth. Toss the shelled meat through hot garlic butter or cooked pasta just before serving.')+'</ol>'+
    '<aside class="bait-check"><h3>What purging does</h3><p>A live pipi can expel sand. Algal toxins can remain after soaking, cooking or freezing. A beach that is open for bait collection tells you nothing about testing for the table.</p><div>'+
      source(market,'Sydney Fish Market pipi and grit guide')+source('https://www.qld.gov.au/environment/water/quality/algae/health','Queensland advice on algae-affected waters')+source('https://www.cdc.gov/vibrio/prevention/','Shellfish steaming times')+source(shellfish,'Australian shellfish toxin advice')+'</div></aside>'+
    '<p class="guide-related"><a href="#guide/kitchen">Back to the catch kitchen</a> · <a href="#guide/pipis-bait">Salt pipis for fishing bait</a></p>';
}

export function baitPipisHtml(){
  return '<p class="bait-intro">For the hook, use legally hand-gathered local pipis or pipis sold as fishing bait. The firm foot takes a hook well when a wave starts pulling at it.</p>'+
    '<figure class="pipi-prep-picture"><img src="/assets/tackle/baited-pipi.webp" alt="A small piece of pipi on a fishing hook with the point exposed." loading="lazy"><figcaption>A small piece leaves the hook point clear. Club tackle illustration.</figcaption></figure>'+
    '<p class="pipi-kit"><strong>Have ready</strong> A board, folded cloth or shucking glove, short shellfish opener, coarse salt and a dedicated bait tub with a lid.</p>'+
    '<ol class="pipi-steps">'+
    step('Open the shell on the board','Brush sand off. Steady the pipi on the board with the cloth or glove. Work a short clam opener at the seam, with your fingers clear of its path. Once the valves part, slide the opener along the inside of the upper shell to release the muscle. Scrape the flesh off the lower valve.')+
    step('Firm the flesh','Pat off excess water. Spread the meat in a single layer in the bait tub and scatter coarse salt underneath and over it. Keep it chilled and separate from food. Salt draws out liquid. Check after a couple of hours. A piece that bends and holds together when lifted is ready. Small pieces firm up first.')+
    step('Pack for a session','Drain the brine into absorbent material for the bin. Divide the bait into small sealed packs. Mark each with “PIPI BAIT”, the source and the packing date. Freeze the packs you won’t use that day. Take one in an esky and keep the rest frozen.')+
    step('Pin on the firm foot','Tear off a piece that fits the hook. Pass the point through the muscular foot, then through once more if the piece is long enough. Keep the bend and point exposed. Give a gentle tug before casting. If it slides off, trim the soft fringe or use a smaller piece.')+'</ol>'+
    '<aside class="bait-check"><h3>On Straddie</h3><p>Check the marine park zone at your actual collecting spot. Queensland lists a combined possession limit of 30 for this shellfish group. Pipis are the exception to the Moreton Bay closure for other bivalves and gastropods. Salting won’t make imported seafood suitable as bait. Take scraps and unused bait home for the bin.</p><div>'+
    source('https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal','Queensland possession limits')+source('https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/bait','Queensland bait and disposal guidance')+source('https://coastfish.spc.int/Fishing/Deep_E/Deep_E.pdf','Pacific Community guide to firming bait with salt, page 31')+'</div></aside>'+
    '<p class="guide-related"><a href="#guide/pipis">Gather and recognise a pipi</a> · <a href="#guide/rig">Choose a beach rig</a> · <a href="#guide/zones">Check my zone</a></p>';
}
