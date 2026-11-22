import {catchPrepPhotos} from './catch-prep-photos.js';

const sources={
  clean:['https://www.fishfiles.com.au/Preparing-seafood/How-to-guides/How-to-clean-your-seafood','FishFiles cleaning photos'],
  fillet:['https://www.fishfiles.com.au/Preparing-seafood/How-to-guides/How-to-fillet-your-fish','FishFiles filleting photos'],
  flathead:['https://www.youtube.com/watch?v=kwj4GzHR8Mg','Watch a flathead being filleted'],
  pin:['https://www.fisheries.noaa.gov/feature-story/how-filet-fish-chef-matthew-ona-culinary-institute-america','Watch the chef find and remove pin bones'],
  whole:['https://www.dpird.nsw.gov.au/content/fisheries/info/nsw-seafood/preparing-nsw-seafood','NSW seafood recipes'],
  cook:['https://www.foodsafety.asn.au/topic/going-fishing-this-easter-keep-your-seafood-food-safe-14-april-2025/','Cooking a recreational catch safely'],
  squid:['https://www.fishfiles.com.au/preparing-seafood/how-to-guides/how-to-prepare-squid-cuttlefish-and-octopus','FishFiles squid preparation pictures'],
  squidFilm:['https://www.youtube.com/watch?v=R0BtBULmhJ4','Watch Sydney Fish Market clean a squid'],
  squidPan:['https://fishing.tas.gov.au/recreational-fishing/fishing-tips/cooking-fish/seafood-recipes/crustacean-and-mollusc-recipes','Fishing Tasmania squid recipes'],
  cold:['https://www.dpird.nsw.gov.au/content/fisheries/info/nsw-seafood/buying-and-enjoying-nsw-seafood','NSW seafood storage'],
  freeze:['https://www.lovefoodhatewaste.nsw.gov.au/meat-poultry-and-seafood','NSW freezing and dating advice'],
  catch:['https://www.dpird.wa.gov.au/siteassets/documents/fisheries/recreational/guides-and-infographics/catch-care-guide.pdf#page=16','Catch care photo guide (PDF)'],
  vacuum:['https://www.k-state.edu/news/you-asked-it/articles/2022/07/tips-on-vacuum-packaging-foods.html','Thawing vacuum-packed fish'],
  thaw:['https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely','Thawing and cooking seafood'],
};
const source=([url,title])=>`<a href="${url}" target="_blank" rel="noopener">${title}</a>`;
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const methods={
  whole:{
    label:'Whole baked fish',intro:'A scaled bream or whiting can go into the oven with the head and backbone in place.',
    ready:'Already scaled, gilled and gutted?',target:3,shortcut:'Start with the oven',
    tools:'Scaler, kitchen scissors, small sharp knife, spoon, paper towel, foil, baking tray, oil and lemon.',
    steps:[
      ['Scale both sides','Hold the tail with paper towel. Work a scaler in short strokes towards the head on each side, including near the belly and fins. The skin should feel smooth. Watch the upright dorsal spines. To trim spiky fins, use kitchen scissors close to their base.','scale'],
      ['Open the belly','Find the vent, the small opening on the belly just ahead of the anal fin. Slip only the knife tip under the belly wall. Lift the wall away from the organs and make a shallow slit forward to the base of the gills, cutting outwards.','gut'],
      ['Clear the cavity and gills','Ease out the guts without bursting them. Lift each gill cover and snip the attachments holding the red gill arches at the top and bottom. Remove the arches. Inside the cavity, scrape the dark strip against the backbone with a teaspoon. Rinse briefly with cold drinking water, then pat dry.','gill'],
      ['Bake with lemon','Heat the oven to 180°C. Rub the cleaned fish with oil, tuck lemon slices in the cavity and seal it inside a foil parcel on a tray. Allow roughly 25 minutes for a medium bream. Start checking a slim whiting earlier. Open the foil away from your face to let the steam escape.','whole'],
      ['Check beside the backbone','Probe the thick shoulder flesh just behind the head, keeping the tip clear of bone. Aim for 63°C. The flesh should be opaque and lift from the spine. If the centre is still glassy, return it to the oven and check again. Lift the top flesh from the ribs to serve. Lift away the frame and check each helping for bones.','baked'],
    ],links:['clean','whole','cook']
  },
  fillets:{
    label:'Pan-fried fillets',intro:'Take a fillet from each side. Bream and whiting work well. A narrow whiting has little flesh to spare, so keep the blade against the bones.',
    ready:'Starting with shop-bought fillets?',target:3,shortcut:'Check bones and skin',
    tools:'Sharp flexible filleting knife, fish tweezers, paper towel, frying pan, oil and a clean plate.',
    steps:[
      ['Find the shoulder cut','Keep the head on for support. If cooking with skin, scale the fish first. If removing the skin, the scales can come off with it. Lay the fish on its side. Cut just behind the side fin and gill cover, angling slightly towards the head. Stop when the blade meets the backbone.','shoulder'],
      ['Follow the backbone','Start at the shoulder cut along one side of the top fin. Run the tip towards the tail in short strokes, deepening until you feel bone. Turn the blade almost flat and keep it against the frame as you free the tail meat. Keep your other hand above and behind the cutting edge.','back'],
      ['Lift over the ribs. Repeat.','Lift the loose fillet at the shoulder. Trace the curve of the rib cage with the knife tip, leaving ribs and belly organs on the frame. Slice the last seam along the belly to release the fillet. Turn the fish over, steady the flatter side and repeat from behind the opposite side fin.','ribs'],
      ['Find pin bones and choose the skin','Set each fillet skin down. Slide a fingertip along the centre from the tail towards the head. Use fish tweezers to draw each pin bone out along its own angle and feel again. To skin it, cut down to the skin about 1 cm from the tail. Grip that tab, turn the blade almost flat and pull the skin back as the blade moves away from your hand.','skin'],
      ['Pan-fry and check','Pat dry and lightly salt. Warm a thin film of oil over medium-high heat. Put skin-on fillets skin down first. Once golden and easy to lift, turn with a spatula and finish the second side. Thin whiting cooks quickly. Check the thickest part for 63°C and opaque flesh that flakes. Serve from a clean plate with lemon.','pan'],
    ],links:['fillet','pin','whole','cook']
  },
  squid:{
    label:'Lemon squid',intro:'The tube, wings and cluster of arms and tentacles all make a meal. Keep a bowl for the parts you are discarding.',
    ready:'Have a cleaned tube or rings?',target:3,shortcut:'Start with the pan',
    tools:'Small sharp knife, clean board, colander, paper towel, frying pan, oil and lemon.',
    steps:[
      ['Ease out the head and guts','Grasp the body tube in one hand. Gently ease the head and attached guts out through the open end. Put them on the board. Try to keep the narrow ink sac intact.','squid'],
      ['Pull out the clear quill','Inside the tube, feel for a clear, stiff strip like plastic. Pull it out whole and clear away the soft remnants. The side flaps are edible wings. Peel off the mottled outer skin if you prefer. Rinse the tube and wings briefly with cold drinking water.','quill'],
      ['Keep the tentacles. Find the beak.','Cut between the eyes and the base of the arms, leaving the eyes and guts together for disposal. Spread the arm cluster, push the hard beak out of its centre and discard it. Check with a fingertip. Pat the arms, tube and wings dry.','squidTentacles'],
      ['Slice and cook a small batch','Slice the tube crossways into rings about 1 cm wide, cut wings into strips and divide larger tentacle clusters. Toss in a little oil. Heat a frying pan over medium-high heat. Add a single layer and turn or toss for about 2 minutes, until the thickest pieces are opaque all the way through. Cook the next batch separately.','squidRings'],
      ['Serve straight away','Move the squid to a clean plate, squeeze over lemon and add pepper. Slice the largest piece if needed to check the centre. A short, hot cook keeps thin pieces tender.','squidDish']
    ],links:['squidFilm','squid','squidPan']
  },
  freezer:{
    label:'Freeze for later',intro:'Freeze seafood while it is still fresh and cold. Thaw only what you plan to cook.',
    tools:'Clean freezer bags, paper towel, marker and a tray that will sit flat in the freezer.',
    steps:[
      ['Clean and portion','For a whole fish, scale, gill and gut it, then clean the cavity. For fillets, remove the bones. For squid, clean and separate the tube, wings and tentacles. Pat dry. Divide into portions for one meal while the rest stays chilled.','fillets'],
      ['Push out air and seal','Put each meal into a freezer bag. Arrange fillets or squid in a single layer, press excess air out and close the seal. Lay the bags flat on a tray so they freeze evenly.','pack'],
      ['Label the bag before freezing','Write the species, the day you caught it, the day you froze it and how many portions are inside. Put the new bag behind older bags of the same catch.','label'],
      ['Freeze, then thaw in the fridge','Keep the freezer at −18°C or colder. For best eating quality, aim to use fillets within 3 months. Put tomorrow’s portion in a covered dish on the bottom fridge shelf to thaw. Open a vacuum-sealed bag before fridge thawing and put the seafood in the covered dish. Cook promptly after thawing.','freezer'],
    ],links:['freeze','catch','thaw','vacuum']
  }
};

const photoGroups={gill:['gutClear','gill'],squid:['squid','squidPull'],quill:['squidPeel'],squidTentacles:['squidTrim','squidTentacles']};
const photoCaptions={scale:'Scale a yellowfin bream',gut:'Open the belly',gutClear:'Lift out the guts',gill:'Lift the gills free',back:'Follow the backbone',ribs:'Trace over the ribs',skinFlat:'Keep the blade flat to the skin',whole:'Whole sea bass on a baking tray',squid:'Whole European squid',squidPull:'Draw the head from the tube',squidPeel:'Peel skin from the tube',squidTrim:'Separate the arms',squidTentacles:'Cleaned arms and tentacles',squidRings:'Tube sliced into rings'};

function stepPhoto(key){
  const p=catchPrepPhotos[key];
  if(!p)return '';
  return `<figure class="kitchen-photo"><img loading="lazy" src="${escape(p.src)}" alt="${escape(p.alt)}">
    <figcaption>${photoCaptions[key]?'<strong>'+photoCaptions[key]+'</strong>':''}<a href="${escape(p.source)}" target="_blank" rel="noopener">${escape(p.credit)}</a> · <a href="${escape(p.licenseUrl)}" target="_blank" rel="noopener">${escape(p.license)}</a></figcaption></figure>`;
}

function stepPictures(key){
  const keys=key==='skin'&&catchPrepPhotos.skinFlat?['skinFlat']:photoGroups[key]||[key];
  const pictures=keys.map(stepPhoto).join('');
  return pictures?`<div class="kitchen-pictures">${pictures}</div>`:'';
}

function methodHtml(id){
  const method=methods[id];
  const exampleDate=new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Brisbane',day:'2-digit',month:'short',year:'numeric'}).format(new Date());
  const steps=method.steps.map(([title,body,photo],i)=>`<li id="kitchen-${id}-${i}" tabindex="-1">
    <div class="kitchen-step-copy"><span class="kitchen-number" aria-hidden="true">${i+1}</span><h4>${title}</h4>
    <p>${body}</p>${photo==='label'?`<figure class="kitchen-bag-label"><figcaption>Example freezer label for today</figcaption><strong>Sand whiting · 2 fillets</strong><span>Caught ${exampleDate}</span><span>Frozen ${exampleDate}</span></figure>`:''}</div>${stepPictures(photo)}</li>`).join('');
  const shortcut=method.ready?`<p class="kitchen-shortcut">${method.ready} <button type="button" data-kitchen-jump="${id}-${method.target}">${method.shortcut}</button></p>`:'';
  const flathead=id==='fillets'?`<aside class="kitchen-aside"><strong>Filleting a flathead?</strong> Sharp spines sit on each side of its broad head. Keep fingers off the gill covers. Follow the bone on each side of its long backbone. Its shape is different from a bream. ${source(sources.flathead)} · ${source(['https://www.dpird.nsw.gov.au/content/fisheries/recreational/saltwater/sw-species/dusky-flathead','See the head spines'])}.</aside>`:'';
  return `<section class="kitchen-method" data-kitchen-panel="${id}" id="kitchen-method-${id}" aria-labelledby="kitchen-title-${id}" ${id==='whole'?'':'hidden'}>
    <h3 id="kitchen-title-${id}" tabindex="-1">${method.label}</h3><p>${method.intro}</p><p class="kitchen-tools"><strong>Have ready</strong> ${method.tools}</p>${shortcut}
    <ol class="kitchen-steps">${steps}</ol>${flathead}<p class="kitchen-sources">${method.links.map(key=>source(sources[key])).join(' · ')}</p>
    <div class="kitchen-next">${id==='freezer'?'':'<button type="button" class="button outline small" data-kitchen-go="freezer">Pack a portion for the freezer</button>'}
      <button type="button" class="text-link" data-kitchen-return>Choose another method</button></div>
    </section>`;
}

export function kitchenHtml(){
  return `<h2 id="kitchen-heading">Clean and cook your catch</h2>
    <p class="kitchen-shortcut">Start with a lawful catch on ice. Preparing fish on a boat? <button type="button" data-kitchen-jump="legal">Check Queensland’s rules before cutting</button></p>
    <aside class="kitchen-cold"><img src="/assets/care/ice.webp" alt="A whole fish on ice in an esky" width="220" height="150" loading="lazy"><div><h3>Fresh fish in the fridge</h3>
      <strong>1 to 2 days at 5°C or colder</strong><p>Count from the day you caught the fish. Ice it immediately after humane dispatch and let the meltwater drain. At home, put the fish in a covered container on the bottom fridge shelf. Cook or freeze it sooner if you can. ${source(sources.cold)}.</p></div></aside>
    <div class="kitchen-nav" id="kitchen-choices" role="group" aria-label="Choose how to prepare your catch">${Object.entries(methods).map(([id,m])=>`<button type="button" data-kitchen-go="${id}" aria-controls="kitchen-method-${id}" aria-pressed="${id==='whole'}">${m.label}</button>`).join('')}</div>
    <p class="kitchen-bench"><strong>Set up your board.</strong> Slip a damp cloth underneath so it stays put. Work on one cold fish at a time. Keep the holding hand out of the blade’s path and a separate clean plate ready for cooked food.</p>
    ${Object.keys(methods).map(methodHtml).join('')}
    <section class="kitchen-cleanup"><h3>Clean up after the last cut</h3><p>Bag guts, gills, frames and clipped spines for the appropriate bin. Keep scraps away from pets, birds, swimmers and the jetty. Wash hands with soap. Wash the knife, scissors, board, sink and bench with hot soapy water, sanitise food-contact surfaces and air-dry. Keep raw juices off salad and cooked food.</p></section>
    <aside class="kitchen-aside"><h3 id="kitchen-legal" tabindex="-1">Before cutting at the water</h3><p>Identify and measure the whole fish first. Check species limits, closures and the zone. For bream and whiting on a boat, leave the skin on any fillets. Cut portions only if an inspector can easily count the fish. Regulated coral reef fin fish have separate rules. Fillets generally need skin and scales and at least 40 cm of fillet length. Blue spotted coral trout fillets are prohibited on board. For a simple trip home, keep the fish identifiable on ice and do the kitchen cuts at home. A brag-mat photo is a club record. Fisheries rules still apply to the fish in your possession.</p><p><a href="#guide/fish">Identify your catch</a> · <a href="#guide/zones">Check the zone</a> · ${source(['https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal','Check current Queensland rules by species'])}.</p></aside>`;
}

export function setupKitchenChoices(chapter){
  chapter.addEventListener('click',event=>{
    if(event.target.closest('[data-kitchen-return]')){
      chapter.querySelector('.kitchen-nav [aria-pressed="true"]').focus();return;
    }
    const jump=event.target.closest('[data-kitchen-jump]');
    if(jump){chapter.querySelector('#kitchen-'+jump.dataset.kitchenJump)?.focus();return;}
    const button=event.target.closest('[data-kitchen-go]');
    if(!button || !Object.hasOwn(methods,button.dataset.kitchenGo))return;
    const active=button.dataset.kitchenGo;
    for(const selector of chapter.querySelectorAll('.kitchen-nav button')){
      selector.setAttribute('aria-pressed',String(selector.dataset.kitchenGo===active));
    }
    for(const panel of chapter.querySelectorAll('[data-kitchen-panel]'))panel.hidden=panel.dataset.kitchenPanel!==active;
    chapter.querySelector('#kitchen-title-'+active).focus();
  });
}
