import {PROTECTED_PHOTOS} from './fish-photos.js';
import {fieldSpecies,fieldPhotoCredit} from './field-species.js';
import {kitchenHtml,setupKitchenChoices} from './fish-cleaning.js';

const qldRules = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal';
const responsible = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/responsible-fishing';
const jettySource = 'https://commons.wikimedia.org/wiki/File:Amity_Point_Jetty_at_Sunset._North_Stradbroke_Island,_Queensland,_Australia.jpg';
const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;

function protectedCard(photo, name) {
  return `<figure class="care-specimen"><img src="${photo.src}" alt="${photo.alt}" loading="lazy">
    <figcaption><strong>${name}</strong><span>Protected · Release immediately</span>
    <details><summary>Photo credit</summary><p>${link(photo.sourceUrl,photo.title)} by ${photo.credit}. ${link(photo.licenseUrl,photo.license)}. ${photo.changes}.</p></details></figcaption></figure>`;
}

export function setupCatchKitchen(view) {
  const marker = view.querySelector('#guide-care') ?? view.lastElementChild;
  if (!marker || view.querySelector('#guide-jetty')) return;
  marker.insertAdjacentHTML('afterend', `
    <section class="guide-chapter catch-care" id="guide-jetty" aria-labelledby="jetty-heading">
      <h2 id="jetty-heading">Sharing the jetty</h2>
      <div class="care-layout"><figure class="jetty-scene"><img src="/assets/care/amity-jetty.webp" alt="People on the fixed platform at Amity Point Jetty, seen across the foreshore at sunset" loading="lazy">
      <figcaption>Amity Point Jetty, Minjerribah · January 2025. ${link(jettySource,'Photo by Pacificwizard, CC0')}.</figcaption></figure>
      <div class="care-steps"><h3>Leave room at the rail</h3><p>Say g’day and ask where the next person’s line runs. Leave a clear path for walkers, wheelchairs, prams and people boarding boats.</p>
      <h3>Check behind before casting</h3><p>Keep hooks and rods inside your own space. Wind in when a boat needs to berth, people are swimming nearby or a dolphin comes close.</p>
      <h3>Leave it ready for the next person</h3><p>Lift your gear and check underneath for hooks and line. Pack sharp hooks in a closed container. Take bait scraps and rubbish home and leave the walkway clean.</p></div></div>
      <p class="care-source">Fishing, cast-netting and crabbing are prohibited at designated Redland public transport waiting points. Check the signs before unpacking your gear. ${link('https://www.redland.qld.gov.au/files/assets/public/v/1/about-council/documents/local-laws/sll4__local_government_controlled_areas__facilities_and_roads__2015.pdf','Council local law, schedule 1')}. ${link('https://www.redland.qld.gov.au/Roads-and-marine/Marine-facilities-permits-and-licences/Jetties-and-pontoons','Find Redland City Council’s island facilities')}.</p>
    </section>
    <section class="guide-chapter catch-care" id="guide-kitchen" aria-labelledby="kitchen-heading">
      ${kitchenHtml()}
      <section class="kitchen-other" aria-label="More seafood for the table"><h3>Crab and pipis for dinner</h3>
      <div class="care-steps">
      <details><summary>Crab on toast</summary><p>Start with cooked, chilled crab. Pick the meat carefully for shell fragments. Fold through lemon juice and chopped parsley, then spoon onto hot toast.</p><p>For a local catch, identify the species and check its sex and size before keeping it. <a href="#guide/crabbing">See the crab measures and limits</a>.</p></details>
      <details><summary>Local eugaries (pipis) for the table</summary><p>Gathered eugaries on Straddie? Check current harvest advice for your beach before keeping them to eat. If local advice supports eating this catch, follow the guide to purge sand, steam the pipis and lift the meat from each shell. Purging removes grit. Algal toxins can survive cooking and freezing.</p><p><a href="#guide/pipis-cooking">Prepare and cook hand-gathered eugaries</a> · <a href="#guide/pipis">Gathering and local checks</a> · ${link('https://www.foodstandards.gov.au/consumer/prevention-of-foodborne-illness/bacteria-foodborne-illness/toxins-in-seafood','Shellfish harvest advice')}.</p></details></div>
      <p><a href="#members/recipes">Share your own recipe with club members</a> · <a href="#members/meals">Invite someone to share the catch</a> · <a href="#members/news">Read the club newsletter</a></p></section>
    </section>
    <section class="guide-chapter catch-care" id="guide-sharks" aria-labelledby="sharks-heading">
      <h2 id="sharks-heading">Sharks and rays</h2>
      <div class="field-place-note"><strong>Flat Rock is a green zone.</strong> Recreational fishing is prohibited here, including catch and release. Grey nurse sharks gather at this reef off Point Lookout. They give birth to live pups. ${link('https://www.qld.gov.au/environment/coasts-waterways/marine-parks/projects/flat-rock','Read the Flat Rock research')} · <a href="#guide/zones">Check the zone</a>.</div>
      <div class="care-layout"><figure class="care-specimen"><img src="${fieldSpecies.find(s=>s.id==='bull-shark').photo.src}" alt="${fieldSpecies.find(s=>s.id==='bull-shark').photo.alt}" loading="lazy"><figcaption><strong>Bull shark</strong><details><summary>Photo credit</summary>${fieldPhotoCredit(fieldSpecies.find(s=>s.id==='bull-shark').photo)}</details></figcaption></figure>
      <div class="care-steps"><h3>Which sharks are around here?</h3><p>Bull sharks use the Brisbane River and its estuary. Australian sharpnose sharks and blacktip sharks together made up 55% of the sharks caught in one shallow-water Moreton Bay study. That survey describes the sampled waters, so other spots can have a different mix. ${link('https://sharkrayareas.org/portfolio-item/brisbane-river-isra/','Brisbane River research')} · ${link('https://pubmed.ncbi.nlm.nih.gov/23331147/','Moreton Bay survey')}.</p>
      <h3>Can I keep a bull shark for food?</h3><p>Yes, in open Queensland tidal waters if you can identify it and it is within the limits. The same general rule covers Australian sharpnose and common blacktip sharks. Maximum size is 150 cm overall or 60 cm between the rear edges of the two dorsal fin bases. Fisheries advises releasing a shark over 150 cm in the water. One shark or ray in possession per person, or two combined per boat with two or more aboard. This includes what you already have in the freezer. ${link(qldRules,'Check today’s limits')} · ${link(responsible,'Safe release')}.</p></div></div>
      <details class="care-further"><summary>How often can my family eat shark?</summary><p>Food Standards Australia New Zealand advises adults outside the groups below to have at most one 150 g portion of shark in a week and no other fish that week.</p><p>For anyone pregnant, planning pregnancy or breastfeeding, the advice is one 150 g portion per fortnight. For children up to six, it is one 75 g portion per fortnight. Have no other fish that fortnight if choosing shark. ${link('https://www.foodstandards.gov.au/consumer/chemicals/mercury','Read the Australian mercury advice')}.</p></details>
      <h3>Australian cownose ray</h3><p>Where fishing is open, a correctly identified cownose ray can be kept under the general ray rules. Measure straight along the underside from nose to tail tip, up to 150 cm. Club disc width is a competition measurement. Manta rays, sawfish and estuary stingrays are protected. ${link(qldRules,'Queensland ray limits')} · ${link('https://parks.qld.gov.au/parks/moreton-bay/zoning/provisions-tables','Moreton Bay protections')}.</p>
      <div class="care-layout"><figure class="care-specimen"><img src="/assets/fish/eastern-shovelnose-ray.jpg" alt="An eastern shovelnose ray resting on sand, with a pointed snout at the right and two dorsal fins on its long tail." loading="lazy">
      <figcaption><strong>Eastern shovelnose ray</strong><i>Aptychotrema rostrata</i><details><summary>Photo credit</summary><p>${fieldPhotoCredit(fieldSpecies.find(s=>s.id==='eastern-shovelnose-ray').photo)}</p></details></figcaption></figure>
      <div class="care-steps"><h3>Identify it before choosing dinner</h3><p>Eastern shovelnose is a table fish. Look for the long triangular nose, wedge-shaped disc and sandy back. “Sand shark” is an ambiguous nickname, also used for the protected grey nurse shark. If you cannot identify your catch, release it. ${link('https://australian.museum/learn/animals/fishes/eastern-shovelnose-ray-aptychotrema-rostrata/','Compare the museum photographs')} · ${link('https://fishesofaustralia.net.au/home/species/3285','Grey nurse identification')}.</p>
      <h3>Check size, numbers and zone</h3><p>Queensland lists a maximum of 150 cm overall or 60 cm interdorsal for shovelnose rays. For interdorsal length, measure straight from the back of the first dorsal fin’s base to the back of the second. The combined limit for permitted sharks and rays is one per person, or two per boat with at least two people aboard. ${link('https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2019-0076#sec.126','See the measuring diagram in section 126')} · <a href="#guide/zones">Check the fishing zone</a>.</p>
      <h3>Keep the catch identifiable</h3><p>Queensland permits gutting or trunking a shovelnose ray. Filleting is prohibited and the fins must remain naturally attached. Leave it whole if unsure. Take only what you will use and chill the catch promptly. ${link(qldRules,'Check Queensland’s ray and filleting rules')} · ${link('https://www.fish.gov.au/docs/SharkReport/2023_FRDC_Aptychotrema_rostrata_Final.pdf','Eastern shovelnose species report')}.</p></div></div>
      <h3>Protected species · identification only</h3><p>Grey nurse sharks, sand tiger sharks, all hammerheads, white sharks, speartooth sharks, manta rays, sawfish and estuary stingrays are protected in Queensland. Release them immediately if hooked. A sighting or accidental hookup belongs outside the club honours board.</p>
      <div class="care-twins">${protectedCard(PROTECTED_PHOTOS['grey-nurse'],'Grey nurse shark')}${protectedCard(PROTECTED_PHOTOS.manta,'Manta ray')}</div>
      <details open class="care-further"><summary>If one is on your line</summary><p>Keep bystanders clear. Sharks can bite and stingrays can strike with the tail spine. Keep clear of the mouth and tail. Avoid bringing an unfamiliar animal aboard or onto a crowded jetty. Leave it in the water and cut the line if a safe release needs it.</p><p><a href="/first-aid.html#bleeding">First aid for a shark bite</a> · <a href="/first-aid.html#stings">First aid for a stingray injury</a></p>
      <p>For a serious injury, call <a href="tel:000">Triple Zero (000)</a>. ${link(responsible,'Fisheries Queensland handling advice')} · ${link('https://www.healthdirect.gov.au/healthy-living/weather-and-environment/beach-safety','Healthdirect stingray advice')}.</p></details>
      <p class="care-source">Shark and ray rules checked 21 November 2026. Check current rules for your species and location before keeping a catch.</p>
    </section>`);
  setupKitchenChoices(view.querySelector('#guide-kitchen'));
}
