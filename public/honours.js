import {catchSpecies} from './catch-species.mjs';
import {targetList,speciesOptions,speciesPreview,competitionTargetsEditor,setupTargetGuide} from './honour-targets.js';
import {preparePhoto} from './member-photo.js';

const fish=new Map(catchSpecies.map(s=>[s.id,s]));
const monthNames=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('en-AU',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,i,1))));
const dateStamp=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',day:'numeric',month:'short',year:'numeric'});
const day=s=>dateStamp.format(new Date(s+'T12:00:00+10:00'));
const qty=mm=>(mm/10).toLocaleString('en-AU',{maximumFractionDigits:1})+' cm';
const state={pending:'Awaiting a photo check',verified:'Verified',declined:'Not accepted',withdrawn:'Withdrawn'};

export function setupHonours({api,esc}){
  const members=document.getElementById('member-leaderboard'),officers=document.getElementById('committee-leaderboard');
  if(!members||!officers)return;
  let session,desk,mount,controller,attempt;
  const committee=()=>location.hash==='#committee/leaderboard';
  const active=()=>session?.authenticated&&(committee()?session.role==='committee':location.hash==='#members/leaderboard'&&['member','committee'].includes(session.role));
  const url=()=>'/api/'+(committee()?'committee':'member')+'/honours';
  function clear(){controller?.abort();controller=null;members.inert=officers.inert=false;members.replaceChildren();officers.replaceChildren();desk=mount=attempt=null;}
  function status(message,error=false){const p=mount?.querySelector('[data-honour-status]');if(p){p.setAttribute('role',error?'alert':'status');p.textContent=message;}}
  const title=(id)=>fish.get(id)?.name||id;
  const measurement=id=>fish.get(id)?.measure==='disc width'?'Disc width':'Length';
  function period(){
    return '<form class="hon-period" data-honour-period><label>Calendar year<input type="number" name="year" min="1900" max="2100" value="'+desk.year+'" required></label><label>Award month<select name="month">'+
      monthNames.map((m,i)=>'<option value="'+(i+1)+'"'+(desk.month===i+1?' selected':'')+'>'+m+'</option>').join('')+
      '</select></label><button class="button outline small">Show results</button></form>';
  }
  function standings(){
    const count=desk.standings.reduce((sum,s)=>sum+s.count,0);
    return '<section class="hon-section"><h2>Largest catch by species · '+desk.year+'</h2><p>'+count+' verified '+(count===1?'entry':'entries')+' across '+desk.standings.length+' species.</p>'+
      (count?'<ul class="hon-standings">'+desk.standings.map(s=>'<li><div><h3>'+esc(title(s.species))+'</h3><b>'+esc(qty(s.mm))+'</b> · '+measurement(s.species).toLowerCase()+' · '+s.count+' '+(s.count===1?'entry':'entries')+'</div><p>'+ (s.leaders.length>1?'Joint leaders · ':'')+
        s.leaders.map(l=>esc(l.alias)+' ('+day(l.date)+')').join(', ')+'</p></li>').join('')+'</ul>':'<p>Results appear when an officer verifies the first catch for this year.</p>')+'</section>';
  }
  function monthly(){
    const picked=desk.year+'-'+String(desk.month).padStart(2,'0'),award=desk.awards.find(a=>a.month===picked);
    return '<section class="hon-section"><h2>Catch of the month · '+monthNames[desk.month-1]+'</h2>'+
      (award?'<h3>'+esc(award.alias)+' · '+esc(title(award.species))+'</h3><p>'+qty(award.mm)+' · '+day(award.date)+'</p>'+(award.reason?'<p>'+esc(award.reason)+'</p>':''):'<p>The committee has yet to select a catch for this month.</p>')+
      (committee()?awardPicker(award):'')+'</section>';
  }
  function awardPicker(current){
    const candidates=desk.review.filter(r=>r.status==='verified');
    if(!candidates.length)return '';
    return '<details class="hon-box"><summary>Choose the month’s catch</summary><form class="hon-form" data-honour-award><label>Verified catch<select name="entryId"><option value="">No award selected</option>' +
      candidates.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===current?.id?' selected':'')+'>'+esc([r.alias,title(r.species),qty(r.mm),day(r.date)].join(' · '))+'</option>').join('')+
      '</select></label><label>What made it special? (optional)<textarea name="reason" maxlength="500">'+esc(current?.reason||'')+'</textarea></label><button class="button small">Save committee selection</button></form></details>';
  }
  function competitionForm(comp={}){
    return '<form class="hon-form" data-honour-comp="'+esc(comp.id||'')+'"><label>Competition name<input name="title" required maxlength="140" value="'+esc(comp.title||'')+'"></label><label>Details for members<textarea name="details" maxlength="1500">'+esc(comp.details||'')+'</textarea></label>'+competitionTargetsEditor(comp,esc)+'<label>Confirmed prizes (optional)<textarea name="prizes" maxlength="800">'+esc(comp.prizes||'')+'</textarea></label><label>Confirmed sponsors (optional)<textarea name="sponsors" maxlength="800">'+esc(comp.sponsors||'')+'</textarea></label><details><summary>Add a dated sponsor promotion</summary><label>Offer, conditions and how to claim it<textarea name="offer" maxlength="500">'+esc(comp.offer||'')+'</textarea></label><div class="hon-pair"><label>First day<input type="date" name="offerFrom" value="'+esc(comp.offerFrom||'')+'"></label><label>Last day<input type="date" name="offerUntil" value="'+esc(comp.offerUntil||'')+'"></label></div></details><label class="hon-check"><input type="checkbox" name="published" '+(comp.published?' checked':'')+'>Share with members. I checked that the details, prizes and sponsor wording are confirmed and suitable for all club ages.</label><button class="button small">Save competition details</button></form>';
  }
  function winners(c){
    const placed=c.results.filter(r=>r.placing||r.prize);
    const board=placed.length?'<h4>Competition and prize winners</h4><ul>'+placed.map(r=>'<li><strong>'+esc(r.alias)+'</strong> · '+(r.placing?'Place '+r.placing+' · ':'')+esc(title(r.species))+' · '+qty(r.mm)+(r.prize?' · '+esc(r.prize):'')+'</li>').join('')+'</ul>':'<p>Winners will appear here after the committee confirms them.</p>';
    if(!committee()||!c.results.length)return board;
    return board+'<details class="hon-box"><summary>Record a placing or prize</summary>'+c.results.map(r=>'<form class="hon-form" data-placing="'+esc(r.id)+'"><h4>'+esc(r.alias)+' · '+esc(title(r.species))+' · '+qty(r.mm)+'</h4><label>Placing (optional)<input type="number" name="place" min="1" max="99" value="'+(r.placing||'')+'"></label><label>Prize won (optional)<input name="prize" maxlength="160" value="'+esc(r.prize)+'"></label><label class="hon-check"><input type="checkbox" name="confirmed" required>I have confirmed this result and the entrant agrees to share it.</label><button class="button small">Save result</button></form>').join('')+'</details>';
  }
  function competitions(){
    return '<section class="hon-section"><h2>Competitions, prizes and sponsors</h2>'+(desk.competitions.length?desk.competitions.map(c=>'<details class="hon-box"><summary>'+esc(c.title)+(committee()&&!c.published?' · Committee draft':'')+'</summary>'+
      (c.details?'<p>'+esc(c.details)+'</p>':'')+'<p><strong>Target species</strong><br>'+esc(c.targets?.length?targetList(c).map(f=>f.name).join(', '):'All club species')+'</p>'+(c.prizes?'<p><b>Prizes</b><br>'+esc(c.prizes)+'</p>':'')+(c.sponsors?'<p><b>Sponsors</b><br>'+esc(c.sponsors)+'</p>':'')+
      (c.offer?'<p><strong>Sponsor promotion</strong><br>'+esc(c.offer)+'<br>'+day(c.offerFrom)+' to '+day(c.offerUntil)+'</p>':'')+winners(c)+
      (committee()?'<details><summary>Edit competition</summary>'+competitionForm(c)+'</details>':'')+'</details>').join(''):'<p>No confirmed competition details have been shared for this year.</p>')+
      (committee()?'<details class="hon-box"><summary>Add a competition for '+desk.year+'</summary>'+competitionForm()+'</details>':'')+'</section>';
  }
  function entryForm(witnessed){
    return '<details class="hon-box"><summary>'+(witnessed?'Record a catch after checking the photo in person':'Enter a catch')+'</summary><p>'+ (witnessed?'Use this when an entrant has shown an officer their brag mat photo and agreed to appear on the members’ board.':'Choose a name for the members’ board. The brag mat photo goes to the committee for a measurement check. Your fishing spot and private journal stay private.')+'</p><form class="hon-form" data-honour-entry="'+(witnessed?'sighted':'enter')+'">'+
      '<label>Competition (optional)<select name="competitionId"><option value="">Club species record</option>'+desk.competitions.filter(c=>c.published).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>').join('')+'</select></label>'+
      '<label>Name to show on the board<input name="alias" maxlength="48" required placeholder="A first name or fishing nickname"></label><label>Species<select name="species" required>'+speciesOptions(targetList(),esc)+'</select></label><div data-target-preview></div><div class="hon-pair"><label><span data-honour-measure>Measurement</span> in centimetres<input type="number" name="cm" min="0.1" max="2000" step="0.1" required></label><label>Date caught in Brisbane time<input type="date" min="1900-01-01" max="'+desk.today+'" name="date" required></label></div>'+
      (witnessed?'<label>Entrant’s club account, if they have one<select name="entrantId"><option value="">Entrant has no club account</option>'+desk.eligibleEntrants.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.login)+'</option>').join('')+'</select></label><label>Private note of the check<textarea name="sightedNote" maxlength="400" required placeholder="Which markings and measurement did you check?"></textarea></label><label class="hon-check"><input name="checked" type="checkbox" required>I inspected the original photo and checked the species and measurement.</label><label class="hon-check"><input name="confirmed16" type="checkbox" required>I confirmed the entrant is 16 or older.</label>':
        '<label>Brag mat photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label><small>Show the whole fish and a readable scale. Only committee officers can open this photo.</small>')+
      '<label class="hon-check"><input type="checkbox" name="consent" required>'+ (witnessed?'The entrant agreed to show this name and result to members.':'I agree to show this name and my verified result to club members.')+'</label>'+
      '<button type="submit" class="button">'+(witnessed?'Record checked catch':'Send for a photo check')+'</button></form></details>';
  }
  function myEntries(){
    if(!desk.myEntries.length)return '';
    return '<details class="hon-box"><summary>My entries · '+desk.myEntries.length+'</summary><ul class="hon-list">'+desk.myEntries.map(r=>'<li><strong>'+esc(title(r.species))+' · '+qty(r.mm)+'</strong><p>'+day(r.date)+' · '+esc(state[r.status])+(!r.eligibleNow&&r.status!=='withdrawn'?' · Hidden from shared results':'')+'</p>'+(r.note?'<p>'+esc(r.note)+'</p>':'')+(r.status!=='withdrawn'?'<button type="button" class="text-link" data-honour-withdraw="'+esc(r.id)+'">Withdraw entry</button>':'')+'</li>').join('')+'</ul></details>';
  }
  function reviews(){
    const pending=desk.review.filter(r=>r.status==='pending'),verified=desk.review.filter(r=>r.status==='verified');
    const check=r=>'<details class="hon-box"><summary>'+esc([r.alias,title(r.species),qty(r.mm),day(r.date)].join(' · '))+'</summary>'+
      (r.hasPhoto?'<button type="button" class="button outline small" data-honour-photo="'+esc(r.id)+'">Open private brag mat photo</button><div data-photo-holder></div>':'<p><b>Photo checked in person</b><br>'+esc(r.sightedNote)+'</p>')+
      '<form class="hon-form" data-honour-review="'+esc(r.id)+'">'+(r.status==='pending'?'<label class="hon-check"><input type="checkbox" name="checked">I checked the photo, species and measurement.</label>':'')+
      '<label>Note for the entrant (required if declined)<textarea name="note" maxlength="400"></textarea></label><div class="hon-actions">'+(r.status==='pending'?'<button name="decision" value="verified" class="button small">Verify catch</button>':'')+'<button name="decision" value="declined" class="button outline small">'+(r.status==='verified'?'Remove from results':'Decline entry')+'</button></div></form></details>';
    return '<section class="hon-section"><h2>Photo checks · '+pending.length+' pending</h2>'+(pending.length?pending.map(check).join(''):'<p>There are no entries awaiting a photo check for this year.</p>')+
      (verified.length?'<details class="hon-box"><summary>Review verified entries for '+monthNames[desk.month-1]+'</summary>'+verified.map(check).join('')+'</details>':'')+'</section>';
  }
  function paint(){
    const isCommittee=committee();
    mount.innerHTML='<header><h1>'+(isCommittee?'Catch verification and awards':'Members’ catch leaderboard')+'</h1><p>'+(isCommittee?'Check brag mat entries, choose the monthly catch and confirm what members can see.':'Club members can see the largest verified catch for each species this calendar year. Equal measurements share the lead.')+'</p></header>'+
      period()+'<p data-honour-status role="status" aria-live="polite"></p>'+(isCommittee?reviews()+entryForm(true):desk.canEnter?entryForm(false):'<p>You can read the results. To enter a catch, members must be confirmed as 16 or older and have accepted the current terms.</p>')+myEntries()+'<section class="hon-section hon-targets" data-target-guide></section>'+standings()+monthly()+competitions();
    setupTargetGuide(mount.querySelector('[data-target-guide]'),desk.competitions,esc);
    window.dispatchEvent(new CustomEvent('plfc:honours-period',{detail:{year:desk.year}}));
  }
  async function refresh(year,month){
    if(!active())return;
    controller?.abort();const token=new AbortController();controller=token;mount=committee()?officers:members;
    if(!desk)mount.innerHTML='<h2>Club honours</h2><p data-honour-status role="status">Opening results…</p>';
    try{
      const value=await api(url()+(year?'?'+new URLSearchParams({year,month}):''),{signal:token.signal,cache:'no-store'});
      if(controller!==token||!active())return;desk=value;attempt=null;paint();
    }catch(e){if(controller===token&&active()){if(!desk||e.status===401||e.status===403){desk=null;mount.innerHTML='<p data-honour-status role="alert"></p><button type="button" class="button outline small" data-honour-refresh>Try again</button>';}status(e.message,true);}}
    finally{if(controller===token)controller=null;}
  }
  async function save(data){
    if(controller||!active())return;
    const base=url(),signature=JSON.stringify(data),period={year:desk.year,month:desk.month};
    if(!attempt||attempt.signature!==signature)attempt={signature,mutationId:crypto.randomUUID(),id:crypto.randomUUID()};
    if(!data.id&&['enter','sighted','competition'].includes(data.action))data.id=attempt.id;
    if(['enter','sighted'].includes(data.action)){period.year=Number(data.date.slice(0,4));period.month=Number(data.date.slice(5,7));}
    const token=new AbortController();controller=token;mount.inert=true;status('Saving…');
    try{
      const next=await api(base+'?'+new URLSearchParams(period),{method:'POST',body:JSON.stringify({...data,mutationId:attempt.mutationId}),signal:token.signal});
      if(controller!==token||!active())return;desk=next;attempt=null;paint();
      status(({enter:'Catch sent to the committee for a photo check.',sighted:'Checked catch recorded.',review:'The entry and results have been updated.',withdraw:'Entry withdrawn.',competition:'Competition details saved.',award:'Monthly award updated.',placing:'Competition result saved.'})[data.action]);
    }catch(e){
      if(controller!==token||!active())return;
      status(e.message,true);
      if(e.status===409){const b=document.createElement('button');b.type='button';b.className='text-link';b.dataset.honourRefresh='';b.textContent='Refresh current results';mount.querySelector('[data-honour-status]').append(' ',b);}
    }finally{if(controller===token){controller=null;mount.inert=false;}}
  }
  async function submit(e){
    e.preventDefault();if(controller||!active()||!desk)return;
    const form=e.target,v=Object.fromEntries(new FormData(form)),period=desk.year+'-'+String(desk.month).padStart(2,'0');
    if(form.matches('[data-placing]')){
      const id=form.dataset.placing,entry=desk.competitions.flatMap(c=>c.results).find(r=>r.id===id);
      if(entry)save({action:'placing',id,version:entry.version,place:v.place?Number(v.place):null,prize:v.prize,confirmed:form.elements.confirmed.checked});
      return;
    }
    if(form.matches('[data-honour-period]')){refresh(v.year,v.month);return;}
    if(form.matches('[data-honour-entry]')){
      const mode=form.dataset.honourEntry;
      v.consent=form.elements.consent.checked;
      if(mode==='enter'){
        const sel=form.elements.photo.files[0];form.inert=true;
        try{v.photo=await preparePhoto(sel);}catch(error){if(form.isConnected)status(error.message,true);return;}finally{form.inert=false;}
        if(!form.isConnected||!active())return;
      }else {v.checked=form.elements.checked.checked;v.confirmed16=form.elements.confirmed16.checked;}
      save({action:mode,...v});return;
    }
    if(form.matches('[data-honour-review]')){
      const r=desk.review.find(x=>x.id===form.dataset.honourReview),decision=e.submitter?.value;
      if(!r||!['verified','declined'].includes(decision))return;
      if(decision==='verified'&&!form.elements.checked?.checked){status('Confirm that you checked this photo, species and measurement.',true);form.elements.checked?.focus();return;}
      if(decision==='declined'&&!v.note.trim()){status('Leave a note so the entrant knows why.',true);form.elements.note.focus();return;}
      save({action:'review',id:r.id,version:r.version,decision,note:v.note,checked:Boolean(form.elements.checked?.checked)});return;
    }
    if(form.matches('[data-honour-award]')){if(!v.entryId&&!desk.awardVersion){status('Choose a verified entry first.',true);return;}save({action:'award',month:period,version:desk.awardVersion,entryId:v.entryId,reason:v.reason});return;}
    if(form.matches('[data-honour-comp]')){v.targets=new FormData(form).getAll('target');delete v.target;const c=desk.competitions.find(x=>x.id===form.dataset.honourComp);save({action:'competition',id:c?.id||'',version:c?.version||0,year:desk.year,...v,published:form.elements.published.checked,allAges:form.elements.published.checked});}
  }
  for(const pane of [members,officers]){
    pane.addEventListener('submit',submit);
    pane.addEventListener('change',e=>{
      const form=e.target.closest('[data-honour-entry]');
      if(!form||!['species','competitionId'].includes(e.target.name))return;
      const label=form.elements.species;
      if(e.target.name==='competitionId'){
        const before=label.value,options=targetList(desk.competitions.find(c=>c.id===e.target.value));
        label.innerHTML=speciesOptions(options,esc);
        label.value=options.some(f=>f.id===before)?before:'';
      }
      form.querySelector('[data-honour-measure]').textContent=label.value?measurement(label.value):'Measurement';
      form.querySelector('[data-target-preview]').innerHTML=speciesPreview(label.value,esc);
    });
    pane.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b||!active())return;
      if(b.hasAttribute('data-honour-refresh')){refresh(desk?.year,desk?.month);return;}
      if(b.hasAttribute('data-honour-withdraw')&&desk&&confirm('Withdraw this catch and remove it from the club results?')){
        const r=desk.myEntries.find(v=>v.id===b.dataset.honourWithdraw);if(r)save({action:'withdraw',id:r.id,version:r.version});return;
      }
      if(b.hasAttribute('data-honour-photo')&&committee()){
        const holder=b.nextElementSibling;
        if(holder.firstChild){holder.replaceChildren();b.textContent='Open private brag mat photo';return;}
        const img=document.createElement('img');img.src='/api/committee/honours/'+encodeURIComponent(b.dataset.honourPhoto)+'/photo';img.alt='Private brag mat photo supplied for this entry';img.addEventListener('error',()=>{if(holder.isConnected)holder.textContent='The photo could not be opened. Keep this catch pending until it can be checked.';});holder.append(img);b.textContent='Close private photo';
      }
    });
  }
  function route(){if(!active()){clear();return;}const next=committee()?officers:members;if(next!==mount){clear();refresh();}else if(!desk&&!controller)refresh();}
  window.addEventListener('plfc:navigated',route);
  window.addEventListener('plfc:session-changed',e=>{clear();session=e.detail;route();});
  window.addEventListener('pagehide',clear);window.addEventListener('pageshow',e=>{if(e.persisted)route();});
}
