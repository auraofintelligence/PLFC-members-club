import {catchSpecies} from './catch-species.mjs';
import {FISH_PHOTOS,PROTECTED_PHOTOS} from './fish-photos.js';
import {fieldPhotoCredits} from './field-photo-credits.js';

const easternRay='https://australian.museum/learn/animals/fishes/eastern-shovelnose-ray-aptychotrema-rostrata/';
const rules='https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal';
const features={
  'winter-whiting':['Sillago maculata',3696,'Look for irregular brown blotches along the silver sides. Compare the markings with sand whiting.'],
  'bartail-flathead':['Platycephalus australis',3762,'Check the tail for two or three dark bars and a yellow patch near the middle.'],
  'sand-flathead':['Platycephalus endrachtensis',3355,'Northern sand flathead have small brown spots and four or more dark bars across the tail. Compare with bartail flathead.'],
  tarwhine:['Rhabdosargus sarba',679,'Fine gold lines run along the silver sides. Check the whole head and flank alongside yellowfin bream.'],
  luderick:['Girella tricuspidata',469,'Look for a small mouth and a series of narrow dark bars running down the sides. Also called blackfish.'],
  'silver-trevally':['Pseudocaranx georgianus',4279,'Look for the dark smudge near the upper edge of the gill cover. Young fish may have a yellow stripe.'],
  'golden-trevally':['Gnathanodon speciosus',4274,'Young fish are golden with dark bars, including one crossing the eye. Adults become silvery with scattered black spots.'],
  'australian-bonito':['Sarda australis',726,'Look above the silver sides for narrow dark stripes running almost horizontally along the back.'],
  'spotted-mackerel':['Scomberomorus munroi',2543,'Check the rows of rounded spots and the first dorsal fin. Compare the fin with school mackerel before keeping one.'],
  'school-mackerel':['Scomberomorus queenslandicus',2544,'Look for broad grey blotches on the sides and a white patch in the black first dorsal fin.'],
  'pearl-perch':['Glaucosoma scapulare',1826,'Look for the dark patch where the back of the dorsal fin meets the body. A young fish may have a dark bar through the eye.'],
  cobia:['Rachycentron canadum',4421,'Look for a broad, flattened head and a row of separate short spines before the long dorsal fin.'],
  'spotted-wobbegong':['Orectolobus maculatus',1975,'The carpet-like back has pale rings within its darker patches. Look for the fringe along the head from a safe distance.'],
  'dusky-whaler':['Carcharhinus obscurus',1953,'A grey-bronze whaler with a pale underside. Several whalers look alike. Fin colour alone cannot confirm this species.'],
  'grey-nurse-shark':['Carcharias taurus',3285,'A pointed snout and protruding teeth are useful clues. “Sand shark” is one of this protected shark’s common names.'],
  'sandtiger-shark':['Odontaspis ferox',1845,'Compare the dorsal fins. The first is clearly larger than the second and sits farther forward than in a grey nurse.'],
  'scalloped-hammerhead':['Sphyrna lewini',1968,'The broad head curves forward, with a central notch and scalloped edges. All hammerheads are protected in Queensland.'],
  'eastern-shovelnose-ray':['Aptychotrema rostrata',easternRay,'A long triangular snout meets a wedge-shaped disc. The sandy upper surface can have darker blotches. Compare the broad, rounded snout of a fiddler ray.'],
  'eastern-fiddler-ray':['Trygonorrhina fasciata',3378,'Look for a rounded snout and broad dark-edged bands, including a triangular or diamond-shaped mark behind the eyes.'],
  'smooth-stingray':['Bathytoshia brevicaudata',2020,'A thick diamond-shaped disc and short tail. Pale pores form diagonal rows beside the head. Keep clear of the tail spine.'],
  'australian-cownose-ray':['Rhinoptera neglecta',3547,'The distinctive snout has two fleshy lobes underneath. Watch the thin tail and the spine at its base.'],
  'reef-manta-ray':['Mobula alfredi',2738,'Look for large head fins and broad wings. The pattern of spots between the gill slits helps distinguish reef mantas.']
};

export const pictureNotes = {
  'sand-whiting': {
    feature: 'Look for yellow lower fins and a small dark patch where the side fin joins the body.',
    reference: 'https://australian.museum/learn/animals/fishes/sand-whiting-sillago-ciliata-cuvier-1829/',
    baits: ['worm', 'prawn'], spot: 'Sandy shallows and beach gutters', runningSinker: true,
  },
  'yellowfin-bream': {
    feature: 'Look for yellow lower fins. Bream from estuaries can be darker than fish on the open coast.',
    reference: 'https://australian.museum/learn/animals/fishes/yellowfin-bream-acanthopagrus-australis-owen-1853/',
    baits: ['prawn', 'strip'], spot: 'Estuary edges and sheltered structure', runningSinker: true,
  },
  'dusky-flathead': {
    feature: 'Look at the tail for a dark spot near the edge. The sandy or brown body is spotted too.',
    reference: 'https://australian.museum/learn/animals/fishes/dusky-flathead-platycephalus-fuscus/',
    baits: ['soft-plastic', 'strip'], spot: 'Sandbank edges and channels',
  },
  tailor: {
    feature: 'Look for a lower jaw that sticks out and a blue-green back above silver sides.',
    reference: 'https://www.dpird.nsw.gov.au/fishing/fish-species/species-list/tailor',
    baits: ['pilchard', 'metal-lure'], spot: 'Beach gutters holding small baitfish',
  },
  snapper: {
    feature: 'Look for blue flecks on a pink or reddish body. The spots can fade in older fish.',
    reference: 'https://www.dpird.nsw.gov.au/fishing/fish-species/species-list/snapper',
    baits: ['squid', 'soft-plastic'], spot: 'Offshore reef edges',
  },
  'spanish-mackerel': {
    feature: 'Look along the silver sides for many narrow, wavy bars.',
    reference: 'https://www.dpird.nsw.gov.au/fishing/fish-species/species-list/mackerel',
    baits: ['pilchard', 'trolling-lure'], spot: 'Open water around schools of baitfish',
  },
  'swallowtail-dart': {
    feature: 'Look for a deeply forked tail and dark marks along the sides of an adult fish.',
    reference: 'https://australian.museum/learn/animals/fishes/swallowtail-dart-trachinotus-coppingeri/',
    baits: ['worm', 'pipi'], spot: 'Sandy surf beaches', runningSinker: true,
  },
  mulloway: {
    feature: 'Look for a row of pale spots along the side and a rounded tail edge.',
    reference: 'https://www.dpird.nsw.gov.au/fishing/fish-species/species-list/mulloway',
    baits: ['squid', 'strip'], spot: 'Deeper gutters and estuary channels',
  },
};

const qldZones='https://parks.qld.gov.au/parks/moreton-bay/zoning/app-and-maps';
const localSharkStudy='https://www.qld.gov.au/environment/coasts-waterways/marine-parks/projects/flat-rock';
const localRules={
  'grey-nurse-shark':{
    localNote:'Grey nurse sharks gather at Flat Rock off Point Lookout. They give birth to live pups. Give them space whenever you see one.',
    localUrl:localSharkStudy,
    rulesNote:'Protected throughout Queensland. Release immediately if accidentally hooked. Recreational fishing, including catch and release, is prohibited in the Flat Rock green zone.',rulesUrl:qldZones
  },
  'australian-cownose-ray':{
    rulesNote:'In open Queensland tidal waters the maximum whole length is 150 cm, measured straight along the underside from nose to tail tip. Club disc width is a separate competition measurement. The combined possession limit is one shark or ray per person, or two per boat with at least two people aboard. Release an oversized ray immediately.',
    rulesUrl:rules
  }
};

export const tailMarks={
  'dusky-flathead':'Dark blotch high on the tail',
  'bartail-flathead':'Two or three dark bars and a yellow patch',
  'sand-flathead':'Four or more dark bars with no yellow patch'
};

const flatheadLimit='Minimum 30 cm. Up to five in possession across all flatheads other than dusky flathead.';
const breamLimit='Minimum 25 cm. Up to 30 in possession across yellowfin bream, pikey bream and tarwhine combined.';
const localLimits={
  'bartail-flathead':flatheadLimit,'sand-flathead':flatheadLimit,
  'dusky-flathead':'Keep only between 40 and 75 cm. Possession limit five dusky flathead.',
  'winter-whiting':'No minimum size. Possession limit 50 winter whiting.',
  'sand-whiting':'Minimum 23 cm. Possession limit 30 across sand, goldenline and northern whiting combined.',
  'yellowfin-bream':breamLimit,tarwhine:breamLimit,luderick:'Minimum 30 cm. Possession limit 10.',
  'swallowtail-dart':'Minimum 30 cm. Possession limit 30.',
  'silver-trevally':'No minimum size. Combined trevally possession limit 20.',
  'golden-trevally':'No minimum size. Combined trevally possession limit 20.',
  'school-mackerel':'Minimum 50 cm. Possession limit 10.','spotted-mackerel':'Minimum 60 cm. Possession limit five.',
  'spanish-mackerel':'Queensland east coast minimum 75 cm. One in possession per person and up to four per boat with four or more people aboard. Southern closed seasons apply.',
  'pearl-perch':'Minimum 38 cm. Possession limit four. The annual Queensland east coast closure runs from 15 July through 15 August.',
  snapper:'Minimum 35 cm. Up to four per person, including at most one over 70 cm. A boat with two or more people can have up to eight, including at most two over 70 cm. The east coast closure runs from 15 July through 15 August.',
  cobia:'Minimum 75 cm. Possession limit two.',tailor:'Minimum 35 cm. Possession limit 20.',
  mulloway:'Minimum 75 cm. Possession limit two. Keep whole aboard a boat.'
};
const existing={'grey-nurse-shark':PROTECTED_PHOTOS['grey-nurse'],'reef-manta-ray':PROTECTED_PHOTOS.manta};
export const fieldSpecies=catchSpecies.map(species=>{
  const entry=features[species.id],credit=fieldPhotoCredits[species.id];
  const photo=species.photo||FISH_PHOTOS[species.id]||existing[species.id]||(credit?{...credit,src:'/assets/fish/'+species.id+'.jpg',
    alt:credit.alt||'Reference photograph of '+species.name.toLowerCase(),changes:credit.changes||'Source-sized reference photograph'}:null);
  const sharkRule=species.group==='Sharks'&&species.eligible?{
    rulesNote:'Open tidal waters only. Maximum 150 cm overall or 60 cm between the rear edges of the two dorsal fin bases. One shark or ray combined per person, or two per boat with at least two aboard. Fisheries advises releasing sharks over 150 cm in the water.',rulesUrl:rules
  }:{};
  return {...species,...(localLimits[species.id]?{rulesNote:localLimits[species.id],rulesUrl:rules}:{}),...sharkRule,...localRules[species.id],photo,scientificName:species.scientificName||entry?.[0]||photo?.scientificName,
    reference:species.reference||(typeof entry?.[1]==='number'?'https://fishesofaustralia.net.au/home/species/'+entry[1]:(entry?.[1]||pictureNotes[species.id]?.reference)),feature:species.feature||entry?.[2]||pictureNotes[species.id]?.feature||''};
});

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const link=(url,label)=>`<a href="${escape(url)}" target="_blank" rel="noopener">${escape(label)}</a>`;
export function fieldPhotoCredit(photo){
  const licence=photo.licenseUrl?link(photo.licenseUrl,photo.license):escape(photo.license);
  return `Photo by ${escape(photo.credit)}. ${link(photo.sourceUrl,'Original source')} · ${licence}. ${escape(photo.changes)}.`;
}
export function speciesContext(s){
  const local=s.localNote||s.habitatNote;
  return (local?'<p>'+escape(local)+((s.localUrl||s.habitatSource)?' '+link(s.localUrl||s.habitatSource,'Species and habitat records'):'')+'</p>':'')+
    (s.rulesNote?'<p><strong>Fishing rules</strong> '+escape(s.rulesNote)+' '+link(s.rulesUrl||rules,'Check the current rules')+'</p>':'');
}

export function flatheadDetail(photo){
  const tail=photo?.tailPhoto;
  return tail?'<figure class="field-tail"><img src="'+escape(tail.src)+'" alt="'+escape(tail.alt)+'" loading="lazy"><figcaption>Tail markings <details><summary>Photo credit</summary>'+fieldPhotoCredit(tail)+'</details></figcaption></figure>':'';
}
export function fieldSpeciesCard(s){
  const status=s.eligible?'Club honours species':'Protected · Identification only';
  const picture=s.photo?`<span class="field-photo"><img src="${escape(s.photo.src)}" alt="${escape(s.photo.alt)}" loading="lazy" decoding="async" width="520" height="300"></span>`:'';
  const extra=s.id==='eastern-shovelnose-ray'?'<p><a href="#guide/sharks">Taking an eastern shovelnose home for food</a></p>':'';
  const rigLink = s.eligible && s.group==='Fish' ? `<p><a href="#guide/rig?species=${s.id}">Choose a rig for ${escape(s.name.toLowerCase())}</a></p>` : '';
  const compare=link(s.reference,'Open the species photo guide');
  if(!s.photo)return `<article class="field-card field-id-external"><p class="field-species-tag">${status}</p>
    <h3>${escape(s.name)}</h3><p><i>${escape(s.scientificName)}</i></p><p>${escape(s.feature)}</p><p>${compare}</p>
    <p>${link(rules,'Check Queensland keeping rules')}</p>${rigLink}</article>`;
  return `<details class="field-card field-more field-id-card" name="field-species"><summary><h3 class="field-card-select">${picture}
    <span class="field-card-label"><strong>${escape(s.name)}</strong><span class="field-species-tag">${status}</span>${tailMarks[s.id]?'<span class="field-tail-mark">'+escape(tailMarks[s.id])+'</span>':''}
    <span class="field-open-label">View ID and rules</span><span class="field-close-label">Close card</span></span></h3></summary>
    <div class="field-card-copy"><p><i>${escape(s.scientificName)}</i></p><p>${escape(s.feature)}</p>${flatheadDetail(s.photo)}<p>${compare}</p>${speciesContext(s)}
    <p>${s.eligible?'Check the species limits, season and zone before keeping a catch.':'Release immediately if hooked. Keep the animal in the water and give it room.'} ${link(rules,'Queensland keeping rules')}.</p>${extra}${rigLink}
    <details><summary>Photo credit</summary><p class="field-detail-credit">${fieldPhotoCredit(s.photo)}</p></details></div></details>`;
}
