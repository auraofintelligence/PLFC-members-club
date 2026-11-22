import {setupMemberFeed} from './social-channels.js';

import {preparePhoto} from './member-photo.js';

export function setupMemberRoom({api,esc,toast}) {
  const view=document.querySelector('[data-view="members"]'),nav=document.getElementById('member-tabs');
  const chat=document.getElementById('member-conversation'),minutes=document.getElementById('shared-minutes');
  const setFeedActive=setupMemberFeed(document.getElementById('member-social'));
  const panels=Array.from(view.querySelectorAll('[data-member-pane]'));
  const menu=nav.querySelector('.member-page-menu');
  const currentPage=menu.querySelector('[data-member-current]');
  const menuLinks=Array.from(menu.querySelectorAll('[data-tab]'));
  const menuGroups=Array.from(menu.querySelectorAll('.member-page-groups details'));
  let enabled=false,socialAccess=false,active='welcome',replyTo=null,requestId=crypto.randomUUID(),generation=0;
  const form=chat.querySelector('form'),list=chat.querySelector('[data-posts]'),status=chat.querySelector('[role=status]');
  const stamp = iso => new Date(iso).toLocaleString('en-AU',{timeZone:'Australia/Brisbane',dateStyle:'medium',timeStyle:'short'});
  function change(key) {
    active=key;
    const selected=menuLinks.find(link=>link.dataset.tab===key);
    currentPage.textContent=selected?.textContent||'Clubhouse home';
    for(const link of menuLinks){
      if(link===selected&&!link.hidden)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    }
    setFeedActive(enabled && socialAccess && key==='social' && !view.hidden);
    for(const p of panels)p.hidden=p.dataset.memberPane!==key;
    if(key==='conversation')loadPosts();
    if(key==='minutes')loadMinutes();
  }
  async function loadMinutes(){
    if(!enabled)return;
    try {
      const data=await api('/api/member/minutes');
      if(!enabled)return;
      minutes.innerHTML=data.minutes.length?'<h3>Shared by the committee</h3>'+data.minutes.map(m=>'<details class="panel"><summary>'+esc(m.date)+' Â· '+(m.kind==='informal'?'Catch-up notes Â· ':m.quorumStatus==='absent'?'No quorum Â· ':'')+esc(m.title)+'</summary><p class="community-text">'+esc(m.text)+'</p></details>').join(''):'';
    }catch(error){minutes.textContent=error.message;}
  }
  function card(p) {
    if(p.removed)return '<article class="community-card"><p>Message removed.</p></article>';
    return '<article class="community-card"><header><strong>'+esc(p.author)+'</strong><time>'+esc(stamp(p.createdAt))+'</time></header>'+
      (p.message?'<p class="community-text">'+esc(p.message)+'</p>':'')+
      (p.hasPhoto?'<a href="/api/community/'+encodeURIComponent(p.id)+'/photo" target="_blank" rel="noopener"><img class="member-photo" loading="lazy" src="/api/community/'+encodeURIComponent(p.id)+'/photo" alt="Fishing photo shared by '+esc(p.author)+'"></a>':'')+
      '<footer>'+(!p.parentId?'<button type="button" data-reply="'+esc(p.id)+'">Reply</button>':'')+
      (p.canRemove?'<button type="button" data-remove="'+esc(p.id)+'">Remove message</button>':'')+'</footer></article>';
  }
  async function loadPosts(){
    if(!enabled || !socialAccess || active!=='conversation' || view.hidden || document.hidden)return;
    const current=++generation;
    try{
      const {posts}=await api('/api/community');
      if(!enabled || current!==generation)return;
      form.hidden=false;
      const threads=posts.filter(p=>!p.parentId).map(p=>card(p)+'<div class="community-replies">'+posts.filter(c=>c.parentId===p.id).reverse().map(card).join('')+'</div>');
      list.innerHTML=threads.join('') || '<p>The club conversation is open. Share a fishing yarn, a question or a photo to start it.</p>';
    }catch(error){
      if(current!==generation)return;
      if(error.status===403){form.hidden=true;list.textContent=error.message;}
      else status.textContent=error.message;
    }
  }
  menu.addEventListener('toggle',()=>{
    if(!menu.open)return;
    const selectedGroup=menu.querySelector('a[aria-current="page"]')?.closest('.member-page-groups details');
    for(const group of menuGroups)group.open=group===selectedGroup;
  });
  form.onsubmit=async e=>{
    e.preventDefault();if(!enabled)return;
    const button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Sharing with club membersâ€¦';
    try {
      const photo=await preparePhoto(form.elements.photo.files[0]);
      await api('/api/community',{method:'POST',body:JSON.stringify({id:requestId,parentId:replyTo,author:form.elements.author.value,message:form.elements.message.value,photo})});
      form.elements.message.value='';form.elements.photo.value='';clearReply();requestId=crypto.randomUUID();status.textContent='Shared with club members.';await loadPosts();
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  };
  function clearReply(){replyTo=null;form.querySelector('[data-reply-label]').textContent='';form.querySelector('[data-cancel-reply]').hidden=true;}
  form.querySelector('[data-cancel-reply]').onclick=clearReply;
  list.onclick=async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.reply){replyTo=b.dataset.reply;requestId=crypto.randomUUID();form.querySelector('[data-reply-label]').textContent='Replying to '+b.closest('article').querySelector('strong').textContent;form.querySelector('[data-cancel-reply]').hidden=false;form.elements.message.focus();}
    if(b.dataset.remove && confirm('Remove this message and its photo from the club room?')){
      try{await api('/api/community',{method:'DELETE',body:JSON.stringify({id:b.dataset.remove})});await loadPosts();}catch(error){toast(error.message);}
    }
  };
  setInterval(loadPosts,20000);
  window.addEventListener('plfc:navigated',e=>{
    menu.open=false;
    if(e.detail.page==='members')change(e.detail.slug==='help-out'?'membership':e.detail.slug||'welcome');
    else setFeedActive(false);
  });
  window.addEventListener('plfc:safeguards',event=>{
    socialAccess=event.detail?.socialAccess===true;
    const band=event.detail?.ageBand,young=band==='under16';
    for(const tab of ['conversation','social','friends','catch-map','recipes','meals']){
      const link=nav.querySelector('[data-tab="'+tab+'"]');
      link.hidden=young;
      link.closest('li').hidden=young;
    }
    for(const group of menuGroups)group.hidden=!group.querySelector('a:not([hidden])');
    const welcome=view.querySelector('[data-member-welcome]'),context=view.querySelector('[data-welcome-context]');
    view.querySelectorAll('[data-meal-shortcut]').forEach(link=>link.hidden=young);
    welcome.textContent=young?'Your junior clubhouse':'Where would you like to start?';
    context.hidden=!young&&band!=='unconfirmed';
    context.textContent=young?'Find the next club day, read the newsletter or cheer on this month’s catches. Your profile and journal are private to you.':
      band==='unconfirmed'?'You can read club news, dates, minutes and results now. Open My access and safety to see how the club checks your age group.':'';

    generation++;
    view.querySelector('[data-social-unavailable]').hidden=socialAccess;
    view.querySelector('[data-social-allowed]').hidden=!socialAccess;
    chat.querySelector('[data-conversation-gate]').hidden=socialAccess;
    form.hidden=!socialAccess;
    if(!socialAccess){list.replaceChildren();form.reset();clearReply();}
    change(active);
  });
  return {setSession(session){enabled=['member','committee'].includes(session.role)&&session.storageReady;if(enabled)change(active);else{setFeedActive(false);generation++;list.replaceChildren();minutes.replaceChildren();form.reset();clearReply();}}};
}
