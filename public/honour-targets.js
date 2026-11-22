import {speciesFamilies} from './catch-species.mjs';
import {fieldSpecies,fieldPhotoCredit,speciesContext,flatheadDetail,tailMarks} from './field-species.js';

const targets=fieldSpecies.filter(fish=>fish.eligible);
const byId=new Map(targets.map(fish=>[fish.id,fish]));
const initialCount=5;

export function targetList(competition){
  return competition?.targets?.length?targets.filter(fish=>competition.targets.includes(fish.id)):targets;
}

export function speciesOptions(species,esc){
  return '<option value="">Choose a species</option>'+speciesFamilies(species).map(([group,fish])=>{
    const options=fish.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.name)+'</option>').join('');
    return options?'<optgroup label="'+esc(group)+'">'+options+'</optgroup>':'';
  }).join('');
}

export function speciesPreview(id,esc){
  const f=byId.get(id);
  if(!f)return '';
  return '<div class="hon-id-preview"><img src="'+esc(f.photo.src)+'" alt="'+esc(f.photo.alt)+'"><div><strong>'+esc(f.name)+'</strong><p>'+esc(f.feature)+'</p>'+speciesContext(f)+'<details><summary>Photo credit</summary><small>'+fieldPhotoCredit(f.photo)+'</small></details></div></div>';
}

export function competitionTargetsEditor(comp,esc){
  return '<details class="hon-target-editor"><summary>Target species Â· '+(comp.targets?.length||'All club species')+'</summary><p>Leave the list clear to include every eligible species, or tick the targets for this event.</p><fieldset><legend>Species for this competition</legend>'+targets.map(f=>
    '<label><input type="checkbox" name="target" value="'+esc(f.id)+'"'+(comp.targets?.includes(f.id)?' checked':'')+'>'+esc(f.name)+'</label>').join('')+'</fieldset></details>';
}

export function setupTargetGuide(host,competitions,esc){
  const published=competitions.filter(c=>c.published);
  host.innerHTML='<h2>Target species</h2><p>Tap a fish to see what to look for.</p>'+
    (published.length?'<label>Show targets for<select data-target-event><option value="">Annual species board</option>'+published.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>').join('')+'</select></label>':'')+
    '<div class="hon-target-tools"><label>Find a fish<input type="search" placeholder="Try whiting, sharks or rays" data-find-target></label></div><p class="hon-target-count" aria-live="polite"></p><div class="hon-target-grid"></div><button class="button outline small" type="button" data-target-more></button>';
  const find=host.querySelector('[data-find-target]'),event=host.querySelector('select'),more=host.querySelector('[data-target-more]'),grid=host.querySelector('.hon-target-grid');
  let limit=initialCount;
  function display(){
    const matching=targetList(published.find(c=>c.id===event?.value)).filter(f=>[f.name,f.group,f.family,f.scientificName].join(' ').toLowerCase().includes(find.value.trim().toLowerCase()));
    const groups=speciesFamilies(matching),visible=[];
    let shownCount=0;
    for(const [family,fish] of groups){
      if(shownCount>=limit)break;
      visible.push([family,fish]);shownCount+=fish.length;
    }
    grid.innerHTML=visible.map(([family,fish])=>'<h3 class="field-family-heading">'+esc(family)+'</h3>'+fish.map(f=>
      '<details class="hon-target-card" name="hon-target-card"><summary><img width="320" height="180" loading="lazy" src="'+esc(f.photo.src)+'" alt="'+esc(f.photo.alt)+'"><strong>'+esc(f.name)+'</strong>'+
      (tailMarks[f.id]?'<span class="hon-tail-mark">'+esc(tailMarks[f.id])+'</span>':'')+
      '</summary><div><p>'+esc(f.feature)+'</p>'+flatheadDetail(f.photo)+speciesContext(f)+'<p><a href="'+esc(f.reference)+'" target="_blank" rel="noopener">Species identification guide</a></p><details><summary>Photo credit</summary><small>'+fieldPhotoCredit(f.photo)+'</small></details></div></details>').join('')).join('');
    host.querySelector('.hon-target-count').textContent=matching.length?'Showing '+shownCount+' of '+matching.length+' target species.':'No matching species. Try a different name.';
    more.hidden=limit===initialCount?shownCount>=matching.length:matching.length<=initialCount;more.textContent=limit===initialCount?'Show all '+matching.length+' species':'Show fewer species';
  }
  function reset(){limit=initialCount;display();}
  find.addEventListener('input',reset);event?.addEventListener('change',reset);
  more.addEventListener('click',()=>{limit=limit===initialCount?targets.length:initialCount;display();});display();
}
