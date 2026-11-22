import {preparePhoto} from './member-photo.js';
import {targetList,speciesOptions,speciesPreview} from './honour-targets.js';
import {catchSpecies} from './catch-species.mjs';

const fish=new Map(catchSpecies.map(item=>[item.id,item]));
const states={pending:'With the committee',verified:'Verified',declined:'Declined',withdrawn:'Withdrawn'};
const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'});
const longDate=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',day:'numeric',month:'short',year:'numeric'});
const amount=mm=>(mm/10).toLocaleString('en-AU',{maximumFractionDigits:1})+' cm';
const measure=id=>fish.get(id)?.measure==='disc width'?'Disc width':'Length';
const checkbox=(name,words,required=false)=>'<label class="junior-choice"><input type="checkbox" name="'+name+'"'+(required?' required':'')+'><span>'+words+'</span></label>';
const dayText=s=>longDate.format(new Date(s+'T12:00:00+10:00'));
const asResult=item=>[item.nickname||'Junior angler',fish.get(item.species)?.name||item.species,amount(item.mm)].join(' · ');

export function setupJuniorContests({api,esc}){
  const hosts={family:document.getElementById('family-junior-desk'),results:document.getElementById('junior-results'),review:document.getElementById('junior-review')};
  if(Object.values(hosts).some(node=>!node))return;
  const updates='BroadcastChannel' in window?new BroadcastChannel('plfc-junior-results'):null;
  let session,flags,mode=null,data=null,controller=null,writeController=null,nextRead=0,draft=null,expanded=false;
  const today=()=>calendar.format(new Date());
  let familyYear=Number(today().slice(0,4)),boardYear=familyYear;
  const year=()=>mode==='family'?familyYear:boardYear;
  const url=()=>mode==='review'?'/api/committee/juniors':'/api/member/juniors';
  const host=()=>hosts[mode];
  const notify=text=>{const node=host()?.querySelector('[data-jr-status]');if(node)node.textContent=text;};
  function clear(){
    nextRead++;controller?.abort();writeController?.abort();controller=writeController=null;draft=data=null;mode=null;expanded=false;
    for(const node of Object.values(hosts)){node.inert=false;node.replaceChildren();}
  }
  const display=(text,open=false)=>{
    if(mode==='family')expanded=expanded||open;
    render();if(text)notify(text);
  };
  async function refresh(message='',quiet=false){
    if(!mode)return;
    const ticket=++nextRead,scope=mode;controller?.abort();
    const reader=new AbortController();controller=reader;
    try{
      const result=await api(url()+'?year='+year(),{signal:reader.signal});
      if(ticket!==nextRead||mode!==scope)return;
      if(quiet&&JSON.stringify(result.results)===JSON.stringify(data?.results))return;
      data=result;display(message);
    }catch(error){
      if(ticket!==nextRead||reader.signal.aborted)return;
      if(!data)host().innerHTML='<p role="status" data-jr-status></p><button type="button" class="text-link" data-jr-reload>Try again</button>';
      notify(error.message);
    }finally{if(controller===reader)controller=null;}
  }
  function nextMode(){
    if(!session?.authenticated||!session.storageReady)return null;
    if(location.hash==='#members/profile'&&session.accountRole==='member'&&flags?.ageBand==='16+')return 'family';
    if(location.hash==='#members/leaderboard'&&['member','committee'].includes(session.role))return 'results';
    if(location.hash==='#committee/leaderboard'&&session.role==='committee')return 'review';
    return null;
  }
  function navigate(){
    const next=nextMode();
    if(next===mode)return;
    clear();mode=next;
    if(mode)refresh();
  }
  function resultCard(item){
    return '<article class="junior-result"><h4>'+esc(asResult(item))+'</h4><p>'+esc(item.competition)+' · '+esc(dayText(item.date))+'</p>'+
      (item.photoUrl?'<img alt="Junior catch photo shared by the parent or guardian" src="'+esc(item.photoUrl)+'" loading="lazy">':'')+'</article>';
  }
  function ownEntry(item){
    const active=item.status!=='withdrawn',shown=item.resultConsent?(item.nicknameConsent?'The verified result can show your junior’s nickname.':'The verified result can appear under Junior angler.'):'Result kept private.';
    const pics=item.photoConsent?'Photo sharing is allowed after committee review.':'Photo kept with the entry for judging.';
    return '<details class="junior-item"><summary>'+esc(asResult(item))+' · '+esc(states[item.status]||item.status)+'</summary><p>'+esc(item.competition)+' · '+esc(dayText(item.date))+'</p>'+
      (active?'<p>'+shown+' '+pics+'</p>':'<p>This entry has been withdrawn.</p>')+
      (item.evidenceUrl?'<button type="button" class="text-link" data-jr-photo="'+esc(item.id)+'" aria-expanded="false">View entry photo</button><div data-jr-image></div>':'')+
      (active&&item.nicknameConsent?'<button type="button" class="text-link" data-jr-anonymise="'+esc(item.id)+'">Remove nickname from result</button>':'')+
      (active&&item.photoConsent?'<button type="button" class="text-link" data-jr-unshare="'+esc(item.id)+'">Stop sharing this photo</button>':'')+
      (active?'<details class="junior-withdraw"><summary>Withdraw this entry</summary><p>This removes the catch from club results and closes member access to the photo. You can <a href="/my-club-download.html">download your family’s contributions and photos</a> first.</p><button type="button" class="button outline small" data-jr-withdraw="'+esc(item.id)+'">Confirm withdrawal</button></details>':'')+'</details>';
  }
  function family(){
    if(!data.canEnter)return '<details class="junior-panel" data-jr-family'+(expanded?' open':'')+'><summary>My family · junior competitions</summary><div class="junior-panel-body"><p>Open <a href="#members/safety">My access and safety</a> to review your membership permissions. A parent or legal guardian aged 18 or over can enter an under-16 catch.</p>'+
      (data.ownEntries?.length?'<h3>My junior entries</h3>'+data.ownEntries.map(ownEntry).join(''):'')+'<a href="/my-club-download.html">Download my contributions and photos</a><p role="status" data-jr-status></p></div></details>';
    const children=data.children||[],entries=data.ownEntries||[];
    return '<details class="junior-panel" data-jr-family'+(expanded?' open':'')+'><summary>My family · junior competitions</summary><div class="junior-panel-body">'+
      '<p>Enter a catch for a junior under 16 using your own membership. Their entry goes to the committee for judging.</p>'+
      (draft?wizard():'<form class="junior-year" data-jr-year><label>Competition year<input type="number" name="year" min="1900" max="2100" required value="'+familyYear+'"></label><button class="button outline small">Show year</button></form>'+
      (children.length?'<p><strong>My junior anglers</strong><br>'+children.map(c=>esc(c.nickname)).join(', ')+'</p>':'')+
      '<div class="junior-actions">'+(data.competitions?.length?'<button type="button" class="button" data-jr-start>Enter a junior catch</button>':'<p>The club has no published competition for '+familyYear+'. You can add your junior now.</p>')+'</div>'+
      '<details class="junior-item"><summary>Add a junior to my family</summary><form class="junior-form" data-jr-add>'+nicknameField()+
      checkbox('guardian','I am 18 or older and this junior’s parent or legal guardian.',true)+'<button class="button outline small">Save junior</button></form></details>'+
      (entries.length?'<h3>My junior entries · '+familyYear+'</h3>'+entries.map(ownEntry).join(''):''))+
      '<p role="status" data-jr-status></p></div></details>';
  }
  function nicknameField(){return '<label>Junior’s nickname<input name="nickname" maxlength="40" autocomplete="off" required placeholder="e.g. Junior angler"></label><small>A nickname is enough. Leave school and contact details out.</small>';}
  function wizard(){
    const step=draft.step;
    let content='';
    if(step===1){
      const kids=data.children||[],fresh=!kids.length||draft.newChild;
      content='<label>Junior angler<select name="child">'+kids.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===draft.childId?' selected':'')+'>'+esc(c.nickname)+'</option>').join('')+
        '<option value="new"'+(fresh?' selected':'')+'>Add a junior</option></select></label><div data-jr-new'+(fresh?'':' hidden')+'>'+nicknameField()+'</div>'+
        checkbox('guardian','I am 18 or older and the parent or legal guardian of this junior.',true);
    }else if(step===2){
      const competition=data.competitions.find(c=>c.id===draft.competitionId)||data.competitions[0];
      content='<p>Entering for <strong>'+esc(draft.nickname)+'</strong>.</p><label>Competition<select name="competition" required>'+data.competitions.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===competition.id?' selected':'')+'>'+esc(c.title)+'</option>').join('')+'</select></label>'+
        '<label>Which target species?<select name="species" required>'+speciesOptions(targetList(competition),esc)+'</select></label><div data-jr-preview></div>'+
        '<div class="junior-pair"><label><span data-jr-measure>Measurement in cm</span><input name="cm" type="number" inputmode="decimal" min="0.1" max="2000" step="0.1" required value="'+esc(draft.cm||'')+'"></label>'+
        '<label>Catch date<input name="date" type="date" min="'+year()+'-01-01" max="'+(year()===Number(today().slice(0,4))?today():year()+'-12-31')+'" required value="'+esc(draft.date||'')+'"></label></div>'+
        '<label>Brag mat photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"'+(draft.photo?'':' required')+'></label><small>Show the whole catch and the scale. Choose a JPG, PNG or WebP up to 12 MB. A fish-only photo works well. If your child is pictured, check they are happy for you to use it.</small>'+
        (draft.photo?'<img class="junior-preview" src="'+esc(draft.photo)+'" alt="Your selected catch photo">':'')+
        checkbox('under16','My junior was under 16 on the event date.',true);
    }else{
      const competition=data.competitions.find(c=>c.id===draft.competitionId);
      content='<p><strong>'+esc(draft.nickname)+'</strong> · '+esc(fish.get(draft.species)?.name||draft.species)+' · '+esc(String(draft.cm))+' cm<br>'+esc(competition?.title)+' · '+esc(dayText(draft.date))+'</p>'+
        '<img class="junior-preview" src="'+esc(draft.photo)+'" alt="Brag mat photo selected for judging">'+
        '<p>The committee can check the catch and photo. Choose what other club members may see after verification.</p>'+
        checkbox('result','Show the verified catch result to club members as Junior angler.')+
        '<div data-jr-share-photo hidden>'+checkbox('nicknameConsent','Use my junior’s nickname on the result instead.')+checkbox('photoConsent','Also show this photo to club members. I have permission from everyone pictured, including the parent or guardian of any other child.')+'</div>'+
        '<p class="secondary">Leave the result private to keep the entry with the committee. You can change photo access or withdraw the entry from My family.</p>';
    }
    return '<form class="junior-form" data-jr-wizard><h3>Step '+step+' of 3 · '+['Choose your junior','Record the catch','Choose who can see it'][step-1]+'</h3>'+content+
      '<div class="junior-actions"><button class="button" type="submit">'+(step===3?'Send to the committee':'Continue')+'</button>'+
      (step>1?'<button type="button" class="text-link" data-jr-back>Back</button>':'')+'<button type="button" class="text-link" data-jr-cancel>Cancel entry</button></div></form>';
  }
  function review(){
    const rows=(data.entries||[]).filter(r=>r.status==='pending');
    return '<details class="junior-panel"><summary>Junior entries for review · '+rows.length+'</summary><div class="junior-panel-body">'+
      (rows.length?rows.map(item=>'<details class="junior-item"><summary>'+esc(asResult(item))+'</summary><p>'+esc(item.competition)+' · '+esc(dayText(item.date))+'<br>Guardian account · '+esc(item.guardianLogin)+'</p>'+
        '<p>'+ (item.resultConsent?'The guardian permits the verified result on the members’ board.':'The guardian requested private judging.')+' '+(item.photoConsent?'The guardian also permits the members to see the checked photo.':'Keep the photo with the judging officers.')+'</p>'+
        '<button class="text-link" type="button" data-jr-photo="'+esc(item.id)+'" aria-expanded="false">View entry photo</button><div data-jr-image></div>'+
        '<form class="junior-form" data-jr-review="'+esc(item.id)+'"><label>Decision<select name="decision"><option value="verified">Verify entry</option><option value="declined">Decline entry</option></select></label>'+
        checkbox('guardianChecked','I checked the submitting adult is the parent or legal guardian and the junior was under 16 for this event.',true)+
        checkbox('catchChecked','I checked the catch, target species and measurement against the competition rules.',true)+
        (item.photoConsent?checkbox('photoChecked','I checked that the photo is family-friendly and suitable for members to see.',true):'')+
        '<button class="button small">Save review</button></form></details>').join(''):'<p>No junior entries are waiting for a check this year.</p>')+'<p role="status" data-jr-status></p></div></details>';
  }
  function render(){
    if(!mode||!data)return;
    if(mode==='family')host().innerHTML=family();
    else if(mode==='review')host().innerHTML=review();
    else host().innerHTML='<section class="junior-results"><h2>Junior competition results · '+esc(year())+'</h2>'+
      (data.results?.length?data.results.map(resultCard).join(''):'<p>No junior results have been released to members for this year.</p>')+
      '<a class="text-link" href="#members/profile">My family and junior entries</a><p role="status" data-jr-status></p></section>';
    if(mode==='family'&&draft){
      const form=host().querySelector('[data-jr-wizard]');if(!form)return;
      if(draft.step===1){const add=form.elements.child.value==='new';form.elements.nickname.disabled=!add;form.elements.guardian.checked=!!draft.guardian;}
      if(draft.step===2){form.elements.species.value=draft.species||'';updateSpecies(form);form.elements.under16.checked=!!draft.under16;}
      if(draft.step===3){form.elements.result.checked=!!draft.resultConsent;form.querySelector('[data-jr-share-photo]').hidden=!draft.resultConsent;form.elements.photoConsent.checked=!!draft.photoConsent;form.elements.nicknameConsent.checked=!!draft.nicknameConsent;}
    }
  }
  function updateSpecies(form){
    const id=form.elements.species.value;
    form.querySelector('[data-jr-preview]').innerHTML=speciesPreview(id,esc);
    form.querySelector('[data-jr-measure]').textContent=id?measure(id)+' in cm':'Measurement in cm';
  }
  function newDraft(){return {id:crypto.randomUUID(),childId:data.children[0]?.id||null,newId:crypto.randomUUID(),step:1,competitionId:data.competitions[0].id,date:today().startsWith(year()+'-')?today():''};}
  async function post(body,signal){
    const reply=await api(url()+'?year='+year(),{method:'POST',body:JSON.stringify(body),signal});
    updates?.postMessage('refresh');return reply;
  }
  async function write(action){
    if(writeController||!mode)return;
    const task=new AbortController();writeController=task;const pane=host();pane.inert=true;
    try{await action(task.signal);}
    catch(error){if(!task.signal.aborted)notify(error.message);}
    finally{if(writeController===task){writeController=null;pane.inert=false;}}
  }
  async function wizardStep(form,signal){
    const f=form.elements;
    if(draft.step===1){
      draft.guardian=f.guardian.checked;
      if(f.child.value==='new'){
        const child={id:draft.newId,nickname:f.nickname.value.trim()};
        await post({action:'child',...child,adultGuardian:true},signal);if(signal.aborted)return;
        data.children=[...data.children.filter(c=>c.id!==child.id),child];draft.childId=child.id;draft.nickname=child.nickname;draft.newChild=false;
      }else{draft.childId=f.child.value;draft.nickname=data.children.find(c=>c.id===draft.childId).nickname;}
      draft.step++;display('',true);
    }else if(draft.step===2){
      const photo=f.photo.files[0]?await preparePhoto(f.photo.files[0]):draft.photo;if(signal.aborted)return;
      Object.assign(draft,{competitionId:f.competition.value,species:f.species.value,cm:Number(f.cm.value),date:f.date.value,photo,under16:f.under16.checked,step:3});display('',true);
    }else{
      const d=draft;d.resultConsent=f.result.checked;d.nicknameConsent=d.resultConsent&&f.nicknameConsent.checked;d.photoConsent=d.resultConsent&&f.photoConsent.checked;
      await post({action:'enter',id:d.id,childId:d.childId,competitionId:d.competitionId,species:d.species,cm:d.cm,date:d.date,photo:d.photo,
        adultGuardian:d.guardian,under16AtEvent:d.under16,resultConsent:d.resultConsent,nicknameConsent:d.nicknameConsent,photoConsent:d.photoConsent},signal);if(signal.aborted)return;
      draft=null;await refresh('Junior catch sent. You can see its progress under My junior entries.');
    }
  }
  for(const pane of Object.values(hosts)){
    pane.addEventListener('toggle',e=>{if(e.target.matches('[data-jr-family]'))expanded=e.target.open;},true);
    pane.addEventListener('submit',e=>{
      const f=e.target;e.preventDefault();if(!mode||pane!==host()||!data)return;
      if(f.matches('[data-jr-year]')){familyYear=Number(f.elements.year.value);draft=null;expanded=true;refresh();return;}
      write(async signal=>{
        if(f.matches('[data-jr-wizard]')){await wizardStep(f,signal);return;}
        if(f.matches('[data-jr-add]')){
          const id=f.dataset.id||(f.dataset.id=crypto.randomUUID());
          await post({action:'child',id,nickname:f.elements.nickname.value.trim(),adultGuardian:f.elements.guardian.checked},signal);if(signal.aborted)return;
          expanded=true;await refresh('Junior saved to your family.');return;
        }
        if(f.matches('[data-jr-review]')){
          const item=data.entries.find(i=>i.id===f.dataset.jrReview),fields=f.elements;
          await post({action:'review',id:item.id,version:item.version,decision:fields.decision.value,guardianChecked:fields.guardianChecked.checked,catchChecked:fields.catchChecked.checked,photoChecked:!!fields.photoChecked?.checked},signal);if(signal.aborted)return;
          await refresh('Junior entry reviewed.');const section=host().querySelector('details');section.open=true;
        }
      });
    });
    pane.addEventListener('change',e=>{
      const f=e.target.form;if(!f)return;
      if(f.matches('[data-jr-review]')&&e.target.name==='decision'){
        for(const box of f.querySelectorAll('input[type="checkbox"]'))box.required=e.target.value==='verified';return;
      }
      if(!f.matches('[data-jr-wizard]'))return;
      if(e.target.name==='child'){const add=e.target.value==='new';f.querySelector('[data-jr-new]').hidden=!add;f.elements.nickname.disabled=!add;}
      if(e.target.name==='competition'){const list=targetList(data.competitions.find(c=>c.id===e.target.value));f.elements.species.innerHTML=speciesOptions(list,esc);updateSpecies(f);}
      if(e.target.name==='species')updateSpecies(f);
      if(e.target.name==='result'){f.querySelector('[data-jr-share-photo]').hidden=!e.target.checked;if(!e.target.checked){f.elements.photoConsent.checked=false;f.elements.nicknameConsent.checked=false;}}
    });
    pane.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b||!mode||pane!==host())return;
      if(b.hasAttribute('data-jr-reload')){refresh();return;}
      if(!data)return;
      if(b.hasAttribute('data-jr-start')){draft=newDraft();display('',true);host().querySelector('[name=child]')?.focus();return;}
      if(b.hasAttribute('data-jr-cancel')){draft=null;display('Entry closed.',true);return;}
      if(b.hasAttribute('data-jr-back')){if(draft.step===3){const f=b.form.elements;draft.resultConsent=f.result.checked;draft.photoConsent=f.photoConsent.checked;draft.nicknameConsent=f.nicknameConsent.checked;}draft.step--;display('',true);return;}
      const id=b.dataset.jrPhoto||b.dataset.jrWithdraw||b.dataset.jrUnshare||b.dataset.jrAnonymise;
      if(!id)return;
      const item=(mode==='review'?data.entries:data.ownEntries).find(i=>i.id===id);if(!item)return;
      if(b.hasAttribute('data-jr-photo')){
        const holder=b.nextElementSibling,open=!holder.childElementCount;
        holder.replaceChildren();b.setAttribute('aria-expanded',String(open));b.textContent=open?'Close entry photo':'View entry photo';
        if(open&&item.evidenceUrl){const img=document.createElement('img');img.className='junior-preview';img.alt='Catch photo supplied for this junior entry';img.src=item.evidenceUrl;holder.append(img);}return;
      }
      const action=b.hasAttribute('data-jr-withdraw')?'withdraw':b.hasAttribute('data-jr-anonymise')?'unshareNickname':'unsharePhoto';
      write(async signal=>{await post({action,id,version:item.version},signal);if(signal.aborted)return;await refresh(action==='withdraw'?'Entry withdrawn.':action==='unshareNickname'?'Nickname removed from the club result.':'Photo sharing has stopped.');});
    });
  }
  window.addEventListener('plfc:session-changed',({detail})=>{clear();session=detail;flags=null;navigate();});
  window.addEventListener('plfc:safeguards',({detail})=>{const changed=!!flags&&flags.socialAccess!==detail.socialAccess;flags=detail;if(changed&&mode==='family')clear();navigate();});
  window.addEventListener('plfc:navigated',navigate);
  window.addEventListener('plfc:honours-period',({detail})=>{if(!Number.isInteger(Number(detail.year)))return;boardYear=Number(detail.year);if(['review','results'].includes(mode))refresh();});
  function checkPublished(){if(mode==='results'&&!document.hidden)refresh('',true);}
  if(updates)updates.onmessage=checkPublished;
  window.addEventListener('focus',checkPublished);
  document.addEventListener('visibilitychange',checkPublished);
  setInterval(checkPublished,60000);
  window.addEventListener('pagehide',clear);window.addEventListener('pageshow',e=>{if(e.persisted)navigate();});
}
