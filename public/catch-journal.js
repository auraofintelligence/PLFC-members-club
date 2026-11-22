import {preparePhoto} from './member-photo.js';
import {mountCatchMap} from './catch-map.js';
import {catchSpecies} from './catch-species.mjs';

const endpoint='/api/member/journal';

// The same controls attach a photo or pin to either a new catch or a catch already in the journal.
function mediaControls(slot,catchItem,canPin){
  const original=catchItem?.pin,photoUrl=catchItem?.photoUrl;
  let style=original?.style;
  let photoChanged=false,pinChanged=false,photoTask=Promise.resolve(null),photoVersion=0,gpsVersion=0,map=null;
  let point=original?{lat:original.latitude,lon:original.longitude}:null;
  slot.innerHTML='<fieldset class="journal-media"><legend>Catch photo</legend>'+
    '<label>Choose a photo (optional)<input type="file" data-journal-file accept="image/jpeg,image/png,image/webp"></label><small>Choose a JPG, PNG or WebP up to 12 MB. We save a smaller copy and strip location tags.</small>'+
    '<img class="net-photo" alt="Your catch photo" data-journal-preview hidden><button type="button" class="text-link" data-remove-photo hidden>Remove photo</button><p role="status" data-photo-message></p></fieldset>'+
    (canPin?'<fieldset class="journal-media"><legend>Fishing spot</legend><p>Add a private pin if you want to remember the exact spot.</p><div class="journal-actions"><button class="button outline small" type="button" data-open-map aria-expanded="false">Choose on map</button><button class="button outline small" type="button" data-use-gps>Use my current location</button></div><div data-pin-editor hidden></div><p role="status" data-pin-message></p><button type="button" class="text-link" data-clear-pin hidden>Remove pin</button></fieldset>':
    '<p class="secondary">You can record the general area above. <a href="#members/safety">Check my access to exact map pins</a>.</p>');
  const el=selector=>slot.querySelector(selector),file=el('[data-journal-file]'),img=el('[data-journal-preview]'),remove=el('[data-remove-photo]'),photoNote=el('[data-photo-message]');
  const mapBox=el('[data-pin-editor]'),gps=el('[data-use-gps]'),mapButton=el('[data-open-map]'),pinNote=el('[data-pin-message]');
  if(photoUrl){img.src=photoUrl;img.hidden=false;remove.hidden=false;}
  file.onchange=()=>{
    const choice=file.files?.[0];if(!choice)return;
    const version=++photoVersion;photoChanged=true;photoNote.textContent='Preparing your photo…';remove.hidden=false;img.hidden=true;
    photoTask=preparePhoto(choice).then(result=>{
      if(version===photoVersion){img.src=result;img.hidden=false;photoNote.textContent='Photo ready. Save your catch to keep it.';}return result;
    }).catch(error=>{if(version===photoVersion)photoNote.textContent=error.message;throw error;});
    // The same promise is awaited on save, including when the member clicks immediately.
    photoTask.catch(()=>{});
  };
  remove.onclick=()=>{
    photoVersion++;photoTask=Promise.resolve(null);photoChanged=true;file.value='';img.removeAttribute('src');img.hidden=true;remove.hidden=true;photoNote.textContent='Photo removed from this form.';
  };
  function pinStatus(value){
    if(!canPin)return;
    el('[data-clear-pin]').hidden=!value;
    pinNote.textContent=value?'Private pin selected at '+value.lat.toFixed(5)+', '+value.lon.toFixed(5)+'.':'';
  }
  function select(value){
    gpsVersion++;if(gps)gps.disabled=false;point=value;pinChanged=true;pinStatus(value);
  }
  function showMap(){
    mapBox.hidden=false;mapButton.setAttribute('aria-expanded','true');mapButton.textContent='Hide map';
    if(!map)map=mountCatchMap(mapBox,{value:point,onPick:select,pinKind:'journal',pinStyle:style,
      onStyle:next=>{style=next;if(point){pinChanged=true;pinNote.textContent='New symbol selected. Save your catch to keep it.';}}});
  }
  if(canPin){
    pinStatus(point);
    mapButton.onclick=()=>{
      if(mapBox.hidden)showMap();
      else{mapBox.hidden=true;mapButton.setAttribute('aria-expanded','false');mapButton.textContent='Choose on map';}
    };
    el('[data-clear-pin]').onclick=()=>{select(null);map?.setValue(null);pinNote.textContent='Pin removed from this form.';};
    gps.onclick=()=>{
      if(!navigator.geolocation){pinNote.textContent='This device could not provide a location. Choose on map to place your pin.';return;}
      const version=++gpsVersion;gps.disabled=true;pinNote.textContent='Waiting for permission to read your current location…';
      navigator.geolocation.getCurrentPosition(({coords})=>{
        if(version!==gpsVersion||!slot.isConnected)return;
        const value={lat:Number(coords.latitude.toFixed(5)),lon:Number(coords.longitude.toFixed(5))};
        select(value);showMap();map.setValue(value);
      },()=>{
        if(version!==gpsVersion||!slot.isConnected)return;gps.disabled=false;pinNote.textContent='No location received. Choose on map to place your pin.';
      },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
    };
  }
  return {
    async values(){
      const values={};
      if(photoChanged)values.photo=await photoTask;
      if(pinChanged)values.pin=point?{latitude:point.lat,longitude:point.lon,...(style?{style}:{})}:null;
      return values;
    },
    destroy(){photoVersion++;gpsVersion++;map?.destroy();slot.replaceChildren();photoTask=Promise.resolve(null);}
  };
}

export function setupCatchJournal({api,esc,today,dateLabel}){
  const form=document.getElementById('catch-form'),list=document.getElementById('catch-list');
  const earlier=document.getElementById('journal-earlier'),note=document.getElementById('catch-save-mode');
  const accessNote=document.getElementById('journal-access-note'),mediaSlot=form.querySelector('[data-journal-media]');
  const endpointCursor=cursor=>endpoint+'?'+new URLSearchParams({cursor});
  let current=null,canPin=false,media=null,editor=null,displayMap=null,entries=[],cursor=null,newId,loading=false,ready=false;
  const datalist=document.getElementById('journal-species');
  for(const species of catchSpecies){const option=document.createElement('option');option.value=species.name;datalist.append(option);}
  function resetForm(){
    media?.destroy();form.reset();form.elements.date.value=today();newId=crypto.randomUUID();media=mediaControls(mediaSlot,null,canPin);
  }
  function closeEditor(){
    if(editor){editor.controls.destroy();editor.form.remove();editor=null;}
    displayMap?.destroy();displayMap=null;
    for(const node of list.querySelectorAll('[data-view-pin]'))node.textContent='View private pin';
  }
  function showList(){
    closeEditor();
    list.innerHTML=entries.length?entries.map(item=>'<article class="panel catch-card" data-catch-id="'+esc(item.id)+'"><time datetime="'+esc(item.date)+'">'+esc(dateLabel(item.date))+'</time><h3>'+esc(item.species)+'</h3>'+
      (item.photoUrl?'<img class="journal-catch-photo" src="'+esc(item.photoUrl)+'" loading="lazy" alt="'+esc(item.species+' from your catch journal')+'">':'')+
      (item.lengthCm?'<strong class="catch-length">'+esc(item.lengthCm)+' cm</strong>':'')+(item.location?'<p>'+esc(item.location)+'</p>':'')+(item.notes?'<p class="journal-story">'+esc(item.notes)+'</p>':'')+
      '<div class="journal-actions"><button class="text-link" type="button" data-edit-catch>'+((item.photoUrl||item.pin)?'Edit':'Add')+(canPin?' photo or pin':' photo')+'</button>'+(item.pin?'<button type="button" class="text-link" data-view-pin>View private pin</button>':'')+'</div><div data-catch-extra></div></article>').join(''):
      '<div class="empty-state">Your first catch will appear here after you save it.</div>';
    earlier.hidden=!cursor;
  }
  async function loadPage(signal,more=false){
    loading=true;earlier.disabled=true;
    try{
      const result=await api(more?endpointCursor(cursor):endpoint,{signal});if(signal.aborted)return;
      entries=more?[...new Map([...entries,...result.catches].map(item=>[item.id,item])).values()]:result.catches;cursor=result.nextCursor;showList();
      ready=true;form.querySelector('[type=submit]').disabled=false;
    }catch(error){
      if(!signal.aborted){note.textContent=error.message;if(!more){const b=document.createElement('button');b.className='text-link';b.textContent='Try again';b.type='button';b.onclick=()=>{note.replaceChildren();loadPage(signal);};note.append(' ',b);}}
    }finally{if(!signal.aborted){loading=false;earlier.disabled=false;}}
  }
  function changed(){window.dispatchEvent(new Event('plfc:journal-changed'));}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready||form.inert)return;
    const signal=current.signal;form.inert=true;note.textContent='Saving your private catch…';
    try{
      const fields=form.elements;
      const data={id:newId,species:fields.species.value,lengthCm:fields.lengthCm.value?Number(fields.lengthCm.value):null,date:fields.date.value,location:fields.location.value,notes:fields.notes.value,...await media.values()};
      if(signal.aborted)return;
      const {catch:item}=await api(endpoint,{method:'POST',body:JSON.stringify(data),signal});
      if(signal.aborted)return;
      entries=[item,...entries.filter(i=>i.id!==item.id)];showList();resetForm();note.textContent='Catch saved to your private journal.';changed();
    }catch(error){if(!signal.aborted)note.textContent=error.message;}
    finally{if(!signal.aborted)form.inert=false;}
  });
  list.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-catch]'),view=e.target.closest('[data-view-pin]');if(!edit&&!view)return;
    const card=e.target.closest('[data-catch-id]'),item=entries.find(i=>i.id===card.dataset.catchId);if(!item)return;
    const extra=card.querySelector('[data-catch-extra]'),closing=!!(view&&extra.querySelector('canvas'));
    closeEditor();extra.replaceChildren();
    if(view){
      if(!closing){const p={id:item.id,kind:'journal',style:item.pin.style,label:item.species,lat:item.pin.latitude,lon:item.pin.longitude};displayMap=mountCatchMap(extra,{pins:[p]});displayMap.focusPin(item.id);view.textContent='Hide private pin';}
      return;
    }
    const editForm=document.createElement('form');editForm.className='stack-form journal-edit';extra.append(editForm);
    editForm.innerHTML='<h4>Update this catch</h4><div data-media></div><div class="journal-actions"><button type="submit" class="button small">Save changes</button><button type="button" class="text-link" data-cancel>Cancel</button></div><p role="status"></p>';
    const controls=mediaControls(editForm.querySelector('[data-media]'),item,canPin);
    editor={form:editForm,controls};const signal=current.signal,status=editForm.lastElementChild;
    editForm.querySelector('[data-cancel]').onclick=()=>{closeEditor();edit.focus();};
    editForm.onsubmit=async event=>{
      event.preventDefault();if(editForm.inert)return;editForm.inert=true;
      try{
        const patch=await controls.values();if(!Object.keys(patch).length){status.textContent='Choose a photo or change the pin before saving.';return;}
        if(signal.aborted||!editForm.isConnected)return;
        const {catch:updated}=await api(endpoint,{method:'POST',body:JSON.stringify({action:'media',id:item.id,version:item.version,...patch}),signal});
        if(signal.aborted)return;
        entries=entries.map(i=>i.id===item.id?updated:i);showList();note.textContent='Catch updated.';changed();
      }catch(error){if(!signal.aborted)status.textContent=error.message;}finally{editForm.inert=false;}
    };
    editForm.querySelector('input')?.focus();
  });
  earlier.onclick=()=>{if(current&&cursor&&!loading)loadPage(current.signal,true);};
  function clear(){
    current?.abort();current=null;media?.destroy();media=null;closeEditor();entries=[];cursor=null;ready=false;loading=false;
    list.replaceChildren();form.reset();form.hidden=true;list.hidden=true;earlier.hidden=true;accessNote.hidden=false;form.inert=false;note.replaceChildren();
  }
  window.addEventListener('plfc:safeguards',({detail})=>{
    clear();if(!detail?.canUseJournal)return;
    canPin=!!detail.socialAccess;current=new AbortController();form.hidden=false;list.hidden=false;accessNote.hidden=true;
    resetForm();form.querySelector('[type=submit]').disabled=true;loadPage(current.signal);
  });
  window.addEventListener('pagehide',clear);
}
