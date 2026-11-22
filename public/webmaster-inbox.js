const endpoint='/api/committee/access-help';
const titles={invitation:'Fresh invitation requested',password:'Password reset help',workspace:'Club page access',email:'Club email alerts',website:'Website help'};
const sources={signin:'Sign-in page',invitation:'Private invitation',access:'Restricted workspace',email:'Email alerts',website:'Club website'};
const states={new:'Awaiting an officer',in_progress:'Being handled',resolved:'Resolved'};
const office=role=>role==='secretary'?'Secretary':'Webmaster';
const date=stamp=>new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',dateStyle:'medium',timeStyle:'short'}).format(new Date(stamp));
export function setupWebmasterInbox({api,esc}){
  const mounts=[...document.querySelectorAll('[data-webmaster-inbox]')];
  let role=null,mount=null,serial=0,folder='open',rows=[],next=null;
  function current(){
    if(!role)return null;
    const place=location.hash==='#committee/notices'?'notices':location.hash==='#committee'?'home':null;
    return mounts.find(m=>m.dataset.webmasterInbox===place)||null;
  }
  function reset(){
    serial++;mount=null;rows=[];next=null;folder='open';
    mounts.forEach(m=>{m.hidden=true;m.replaceChildren();});
  }
  function summary(counts) {
    const tag=role==='secretary'?'Webmaster requests · Secretary copies':'Webmaster requests';
    mount.querySelector('summary').textContent=tag+' · '+counts.unread+' unread · '+counts.open+' open';
    const resolved=mount.querySelector('[data-help-folder="resolved"]');
    if(resolved)resolved.textContent='Resolved'+(counts.unreadResolved?' ('+counts.unreadResolved+' unread)':'');
  }
  function showRows(){
    const list=mount.querySelector('[data-help-list]');
    list.innerHTML=rows.length?rows.map(item=>{
      const label=role==='secretary'?'Webmaster request · Secretary copy':'Webmaster request';
      const action=item.state==='resolved'?'reopen':item.state==='new'?'claim':'resolve';
      const button={claim:'I’ll follow up',resolve:'Mark resolved',reopen:'Reopen request'}[action];
      return '<article class="panel" data-help-item="'+esc(item.id)+'"><p>'+label+(item.unread?' · <strong>Unread</strong>':'')+'</p>'+
        '<h3>'+esc(titles[item.topic])+'</h3><p>'+esc(item.reference)+' · '+esc(date(item.createdAt))+' AEST · '+esc(sources[item.source])+'</p>'+
        '<p>'+esc(states[item.state])+(item.state!=='new'&&item.assignedRole?' · '+office(item.assignedRole):'')+'</p>'+
        (item.question?'<p><strong>Their question</strong><br>'+esc(item.question)+'</p>':'')+
        '<p><strong>'+(item.contactType==='email'?'Reply by email':'Call back')+'</strong><br>'+esc(item.contact)+'</p><div class="button-row">'+
        (item.unread?'<button type="button" class="text-link" data-help-action="seen">Mark as read for me</button>':'')+
        '<button type="button" class="button outline small" data-help-action="'+action+'">'+button+'</button></div></article>';
    }).join(''):'<p>'+ (folder==='open'?'There are no open Webmaster requests.':'There are no resolved Webmaster requests.')+'</p>';
    mount.querySelector('[data-help-more]').hidden=next===null;
    mount.querySelectorAll('[data-help-folder]').forEach(b=>b.setAttribute('aria-pressed',String(folder===b.dataset.helpFolder)));
  }
  async function load(full=false,more=false){
    if(!mount||mount!==current())return;
    const target=mount,generation=++serial,status=mount.querySelector('[role=status]');
    try{
      const query=full?'?folder='+folder+(more&&next?'&before='+next:''):'?summary=1';
      const result=await api(endpoint+query,{cache:'no-store'});
      if(generation!==serial||current()!==target)return;
      if(result.role!==role){reset();return;}
      summary(result.counts);
      if(full){rows=more?rows.concat(result.requests):result.requests;next=result.next;showRows();}
      status.textContent='';
    }catch(error){
      if(generation!==serial||current()!==target)return;
      if(error.status===401||error.status===403){role=null;reset();return;}
      status.textContent='Could not refresh the private inbox. Choose Refresh to try again.';
    }
  }
  function enter(){
    const target=current();
    if(mount===target)return;
    reset();if(!target)return;
    mount=target;target.hidden=false;
    target.innerHTML='<details class="panel"><summary>'+ (role==='secretary'?'Webmaster requests · Secretary copies':'Webmaster requests')+
      '</summary><p>'+(role==='secretary'?'These are your private copies of requests sent to the Webmaster.':'The Secretary receives a private copy of each request.')+
      ' Both officers work from the same request. Check the person’s identity before arranging account access.</p>'+
      '<div class="button-row"><button type="button" class="text-link" data-help-folder="open">Open requests</button>'+
      '<button type="button" class="text-link" data-help-folder="resolved">Resolved</button>'+
      '<button type="button" class="text-link" data-help-refresh>Refresh</button></div><div data-help-list></div>'+
      '<button type="button" class="text-link" data-help-more hidden>Show older requests</button><p role="status"></p></details>';
    target.querySelector('details').ontoggle=()=>{if(target!==mount)return;if(target.querySelector('details').open)load(true);else{rows=[];next=null;target.querySelector('[data-help-list]').replaceChildren();load();}};
    load();
    if(new URLSearchParams(location.search).get('inbox')==='webmaster-help')target.querySelector('details').open=true;
  }
  mounts.forEach(target=>target.addEventListener('click',async event=>{
    if(target!==current())return;
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-help-folder')){folder=button.dataset.helpFolder;next=null;rows=[];showRows();await load(true);return;}
    if(button.hasAttribute('data-help-more')){await load(true,true);return;}
    if(button.hasAttribute('data-help-refresh')){await load(true);return;}
    const action=button.dataset.helpAction,row=rows.find(r=>r.id===button.closest('[data-help-item]')?.dataset.helpItem);
    if(!action||!row)return;
    button.disabled=true;
    try{
      await api(endpoint,{method:'POST',body:JSON.stringify({action,id:row.id,version:row.version})});
      if(current()===target){await load(true);if(mount===target)target.querySelector('[role=status]').textContent=action==='seen'?'Marked as read for your account.':'The shared request has been updated.';}
    }catch(error){if(current()===target && mount===target){await load(true);if(mount===target)target.querySelector('[role=status]').textContent=error.message;}}
    finally{button.disabled=false;}
  }));
  function refresh(){if(mount&&!document.hidden)load(Boolean(mount.querySelector('details')?.open));}
  window.addEventListener('plfc:navigated',enter);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
  setInterval(refresh,60000);
  return {setSession(session){reset();role=session?.administrator?'webmaster':session?.accountRole==='committee'&&session?.identity?.name==='secretary'?'secretary':null;enter();}};
}
