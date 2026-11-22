import {catchSpecies, speciesFamilies} from './catch-species.mjs';
import {rigMethods} from './rig-methods.js';
import {pelagicRigs, pelagicPhotoHtml} from './pelagic-rigs.js';
import {rigPhotoHtml} from './rig-photos.js';
import {rigStepPhotos} from './rig-step-photos.js';

const methods = {...rigMethods, ...pelagicRigs};
const extraTargets = [
  ['yellowtail-scad','Yellowtail scad (yakka)'], ['southern-herring','Southern herring'],
  ['squid','Squid'], ['yellowtail-kingfish','Yellowtail kingfish'], ['amberjack','Amberjack'],
].map(([id,name]) => ({id,name,family:'More workshop targets'}));
const speciesList = [...catchSpecies, ...extraTargets.filter(extra => !catchSpecies.some(fish => fish.id === extra.id))];
const gearRules = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/equipment';
const fishRules = 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/rules/limits-tidal';

function chapterIn(section) {
  return section?.matches('#guide-rig') ? section : section?.querySelector('#guide-rig');
}

function external(url, label) {
  return '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>';
}

function noteForSpecies(fish) {
  if (!fish) return '';
  if (fish.eligible === false) {
    return '<h3>'+fish.name+' is protected</h3><p>Leave this species in the water. If one is hooked by accident, give it room and release it promptly.</p>';
  }
  if (fish.group === 'Sharks' || fish.group === 'Rays') {
    return '<h3>If you hook '+fish.name.toLowerCase()+'</h3><p>Let it stay in the water. Give its mouth and tail plenty of room and keep others back. Start with the club’s shark and ray guide for identification, safe release and the Queensland rules.</p>';
  }
  if (fish.family === 'Parrotfish') {
    return '<h3>'+fish.name+'</h3><p>True parrotfish scrape food from hard surfaces with a beak. The luderick weed-float rig is for a different feeding habit. The workshop has no tested line rig for this parrotfish.</p>'+
      external('https://australian.museum/learn/animals/fishes/bluebarred-parrotfish-scarus-ghobban-forsskl-1775/','Australian Museum parrotfish feeding notes');
  }
  return '<h3>'+fish.name+'</h3><p>The club has no illustrated rig for this species yet. Use its identification photo and current fishing rules, or choose another target to see a complete setup.</p>';
}

function knotLinks(id) {
  const terminal = '<a href="#guide/knots?knot=uni">Uni for mono to a hook or swivel</a>';
  const joins = '<a href="#guide/knots?knot=fg">FG braid-to-leader join</a>';
  const loop = '<a href="#guide/knots?knot=non-slip-loop">Non-slip loop for a lure</a>';
  const palomar = '<a href="#guide/knots?knot=palomar">Palomar for braid to an empty swivel</a>';
  if (id === 'emperor') return ['<a href="#guide/knots?knot=dropper-loop">Dropper loop for the side branch</a>', terminal];
  if (id === 'paternoster') return [terminal, palomar];
  if (id === 'bait-jig') return [terminal, '<a href="#guide/knots?knot=double-uni">Double uni for a braid-to-leader join</a>'];
  if (id === 'bayDiver') return [loop, joins];
  if (id === 'topwater' || id === 'metal' || id === 'plastic' || id === 'squid') return [terminal, joins, loop];
  if (id === 'vertical' || id === 'troll') return [joins, '<a href="#guide/knots?knot=uni">Uni knot for the mono-to-ring connection</a>'];
  return [terminal, '<a href="#guide/knots?knot=double-uni">Double uni to join lines</a>'];
}

function extraGuide(method) {
  if (method === 'bait-jig') return '<p><a href="#guide/baitfish">See baitfish photos and identification marks</a></p>';
  if (method === 'squid') return '<p><a href="#guide/squid">Open the squid-catching guide</a></p>';
  return '';
}

export function setupRigWorkshop(section) {
  const chapter = chapterIn(section);
  if (!chapter || chapter.querySelector('[data-rw-chooser]')) return;
  chapter.innerHTML = '<div class="guide-chapter-title"><div><h2 id="guide-rig-title">Choose a fishing rig</h2>'+
    '<p>Pick a fish to see rigs that suit it, or browse all methods. The sizes below are starting points for the conditions described.</p></div></div>'+
    '<div class="rw-filters"><label>What are you fishing for?<select data-rw-species><option value="">Browse all methods</option>'+
    speciesFamilies(speciesList).map(([family,fish]) => '<optgroup label="'+family+'">'+fish.map(s => '<option value="'+s.id+'">'+s.name+'</option>').join('')+'</optgroup>').join('')+
    '</select></label><label data-rw-method-label>Choose a rig<select data-rw-chooser></select></label></div>'+
    '<div class="rw-result" data-rw-result></div><p class="rw-sr" aria-live="polite" data-rw-status></p>';
  const species = chapter.querySelector('[data-rw-species]');
  const chooser = chapter.querySelector('[data-rw-chooser]');
  const methodLabel = chapter.querySelector('[data-rw-method-label]');
  const result = chapter.querySelector('[data-rw-result]');
  const status = chapter.querySelector('[data-rw-status]');
  let step = 0;
  let timer = null;

  function pause() {
    clearInterval(timer);
    timer = null;
    const play = result.querySelector('[data-rw-play]');
    if (play) play.textContent = 'Play the steps';
  }
  function showStep() {
    const id = chooser.value;
    const rig = methods[id];
    const [title, instruction] = rig.steps[step];
    result.querySelector('[data-rw-count]').textContent = 'Step '+(step+1)+' of '+rig.steps.length;
    result.querySelector('[data-rw-heading]').textContent = title;
    result.querySelector('[data-rw-instruction]').textContent = instruction;
    result.querySelector('[data-rw-back]').disabled = step === 0;
    result.querySelector('[data-rw-next]').disabled = step === rig.steps.length - 1;
    const photo = rigStepPhotos[id][step];
    const figure = result.querySelector('.rw-step-photo');
    const large = figure.querySelector('a');
    large.href = photo.src;
    large.setAttribute('aria-label', 'Open larger picture for step ' + (step + 1) + ' in a new tab');
    figure.querySelector('img').src = photo.src;
    figure.querySelector('img').alt = photo.alt;
    figure.querySelector('[data-rw-caption]').textContent = photo.caption;
    figure.querySelector('small').innerHTML = photo.credit;
    for (const button of result.querySelectorAll('[data-rw-step]')) {
      if (Number(button.dataset.rwStep) === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    if (step === rig.steps.length - 1) pause();
  }
  function showMethod() {
    pause();
    step = 0;
    const id = chooser.value;
    const rig = methods[id];
    const fish = speciesList.find(item => item.id === species.value);
    if (!rig) {
      const shark = fish?.group === 'Sharks' || fish?.group === 'Rays';
      result.innerHTML = '<article class="rw-no-method">'+noteForSpecies(fish)+'<nav aria-label="Species guidance">'+
        (shark ? '<a href="#guide/sharks">Shark and ray care</a>' : '')+
        '<a href="#guide/fish">Identify the species</a>'+external(fishRules,'Queensland fish limits and protected species')+'</nav></article>';
      status.textContent = fish?.name || '';
      return;
    }
    const example = Object.hasOwn(pelagicRigs,id) ? pelagicPhotoHtml(rig.photo) : rigPhotoHtml(rig.photo);
    const targetNames = rig.targets.map(target => speciesList.find(s => s.id === target)?.name).filter(Boolean);
    result.innerHTML = '<article class="rw-workshop"><header class="rw-heading"><p>'+targetNames.join(' · ')+'</p><h3>'+rig.title+'</h3><p>'+rig.where+'</p></header>'+
      '<div class="rw-setup"><div class="rw-example">'+example+'</div><div class="rw-specs"><h4>What you need</h4><p>'+rig.kit+'</p>'+
      '<dl><dt>Trace length and strength</dt><dd>'+rig.trace+'</dd><dt>Hook type and size</dt><dd>'+rig.hook+'</dd><dt>Bait or lure presentation</dt><dd>'+rig.bait+'</dd></dl></div></div>'+
      '<aside class="rw-adjust"><h4>When to adjust</h4><p>'+rig.adjust+'</p></aside>'+
      '<nav class="rw-knot-links" aria-label="Knots for this rig"><strong>Knots for this rig</strong>'+knotLinks(id).join(' · ')+'<br><a href="#guide/knots?compare=strength">Compare knot strength and ease of tying</a></nav>'+
      '<section class="rw-process" aria-label="Rig assembly"><h4>Put it together</h4>'+
      '<div class="rw-step-picker" role="group" aria-label="Choose a picture step">'+rig.steps.map(([title], index) =>
        '<button type="button" data-rw-step="'+index+'" aria-label="Step '+(index+1)+'. '+title+'"><img src="'+rigStepPhotos[id][index].src+'" alt="" width="96" height="64" loading="lazy"><span>Step '+(index+1)+'</span></button>').join('')+'</div>'+
      '<div class="rw-detail"><figure class="rw-step-photo"><a target="_blank" rel="noopener"><img alt="" width="500" height="375"></a><figcaption><span data-rw-caption></span> <small></small></figcaption></figure>'+
      '<div class="rw-step-text" aria-live="polite" aria-atomic="true"><small data-rw-count></small><h5 data-rw-heading></h5><p data-rw-instruction></p></div></div>'+
      '<div class="rw-actions"><button type="button" data-rw-back>Back</button><button type="button" data-rw-next>Next step</button><button type="button" data-rw-play>Play the steps</button></div>'+
      (id==='running' ? '<a class="rw-animation" href="/assets/tackle/rig-photos/running-sinker-steps.gif" download>Save the three-step animation</a>' : '')+'</section>'+
      '<div class="rw-sources"><h4>Rig references and fishing rules</h4>'+
      '<div>'+rig.sources.map(([label,url]) => external(url,label)).join('')+'</div>'+
      '<p>Queensland tidal waters generally allow three attended lines and six hooks in total. A bait jig, lure or gang counts as one hook. Marine park zones can have tighter limits. '+
      external(gearRules,'Check the gear rules')+' · <a href="#guide/zones">Check your zone</a>.</p>'+extraGuide(id)+'</div></article>';
    showStep();
    status.textContent = rig.title;
  }
  function chooseSpecies() {
    const fish = species.value;
    const available = Object.entries(methods).filter(([,rig]) => !fish || rig.targets.includes(fish));
    const previous = chooser.value;
    chooser.replaceChildren(...available.map(([value,rig]) => new Option(rig.title,value)));
    if (available.some(([value]) => value === previous)) chooser.value = previous;
    methodLabel.hidden = available.length === 0;
    showMethod();
  }
  chooser.addEventListener('change',showMethod);
  species.addEventListener('change',() => {
    chooseSpecies();
    if (location.hash.split('?')[0] === '#guide/rig') {
      const hash = '#guide/rig'+(species.value ? '?species='+encodeURIComponent(species.value) : '');
      if (location.hash !== hash) history.replaceState(history.state,'',hash);
    }
  });
  result.addEventListener('click',event => {
    const control = event.target.closest('button');
    if (!control) return;
    const count = methods[chooser.value]?.steps.length || 0;
    if (control.hasAttribute('data-rw-step')) { pause(); step = Number(control.dataset.rwStep); showStep(); }
    if (control.matches('[data-rw-next]') && step < count-1) { pause(); step++; showStep(); }
    if (control.matches('[data-rw-back]') && step > 0) { pause(); step--; showStep(); }
    if (control.matches('[data-rw-play]')) {
      if (timer !== null) { pause(); return; }
      if (step === count-1) { step = 0; showStep(); }
      control.textContent = 'Pause';
      timer = setInterval(() => { step++; showStep(); }, 6500);
    }
  });
  window.addEventListener('hashchange',() => { if (location.hash.split('?')[0] !== '#guide/rig') pause(); });
  document.addEventListener('visibilitychange',() => { if (document.hidden) pause(); });
  window.addEventListener('pagehide',pause);
  chooseSpecies();
}

export function selectWorkshopSpecies(section, id) {
  const chapter = chapterIn(section);
  if (!chapter) return false;
  setupRigWorkshop(chapter);
  const selector = chapter.querySelector('[data-rw-species]');
  if (![...selector.options].some(option => option.value === id)) return false;
  selector.value = id;
  selector.dispatchEvent(new Event('change'));
  return true;
}
