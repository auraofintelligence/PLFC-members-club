import {setupLibrary,clearLibrary} from './library.js';
import {setupWebmasterInbox} from './webmaster-inbox.js';
import {passwordField,setupPasswordEyes} from './password-field.js';
import {privateSetupLink,setupPendingInvitations} from './pending-invitations.js';

const labels = {members:'Member home', committee:'Committee room', stock:'Treasurer’s stock desk'};
const helpLink=from=>'<a class="text-link" href="/webmaster-help.html?from='+from+'">Ask the Webmaster</a>';
const officers={secretary:'Secretary',assistantsecretary:'Assistant Secretary',president:'President',vicepresident:'Vice President',treasurer:'Treasurer'};
let inviteToken;
function takeInvitation() {
  const token=new URLSearchParams(location.hash.slice(1)).get('activate');
  if(!token)return;
  inviteToken=token;
  history.replaceState(null,'',location.pathname+location.search+'#members');
  window.dispatchEvent(new Event('plfc:invitation-arrived'));
}
takeInvitation();
window.addEventListener('hashchange',takeInvitation);

export function setupClubAccess({api,esc}) {
  const gate = document.getElementById('club-access');
  const deskNav = document.getElementById('private-tools');
  const accounts = document.getElementById('club-accounts');
  const helpInbox=setupWebmasterInbox({api,esc});
  let session = null;
  let invitation=null,invitationProblem=null;
  let active = location.hash.slice(1);
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('plfc-access') : null;
  setupPasswordEyes(gate);
  const reload = () => location.reload();
  if (channel) channel.onmessage = reload;
  const allowed = page => Boolean(session?.storageReady && (page==='stock'?session.canManageStock:page==='committee'?session.role==='committee':['member','committee'].includes(session.role)));
  const post = (url,data) => api(url,{method:'POST',body:JSON.stringify(data)});

  async function openInvitation() {
    const token=inviteToken;
    invitation=null;invitationProblem=null;
    paint();
    try {
      const result=await post('/api/auth/invitation',{token});
      if(token!==inviteToken)return;
      invitation=result;
      if(active in labels && location.hash!=='#'+invitation.destination) location.replace('#'+invitation.destination);
    } catch(error){if(token!==inviteToken)return;invitationProblem=error;}
    paint();
  }

  function paint() {
    gate.hidden = !(active in labels) || (!inviteToken && allowed(active));
    deskNav.hidden = !(active in labels) || !session?.authenticated || Boolean(inviteToken);
    if (!deskNav.hidden) {
      const username=session.identity?.name;
      const officerTitle=session.administrator?'Webmaster':session.role==='committee' && Object.hasOwn(officers,username)?officers[username]:'';
      deskNav.innerHTML = (officerTitle?'<strong class="officer-session">'+officerTitle+'</strong>':'')+Object.entries(labels).filter(([key])=>allowed(key)).map(([key,name])=>
        '<a href="#'+key+'"'+(key===active?' aria-current="page"':'')+'>'+name+'</a>').join('')+'<button type="button" data-logout>Sign out</button>';
    }
    if (gate.hidden) return;
    const header = '<span class="eyebrow">POINT LOOKOUT FISHING CLUB</span><h1 class="page-title">'+(inviteToken?(labels[invitation?.destination]||'Your club invitation'):labels[active])+'</h1>';
    if(inviteToken && !invitation) {
      if(!invitationProblem){gate.innerHTML=header+'<p role="status">Checking your private invitation…</p>';return;}
      const invalid=invitationProblem.status===400;
      gate.innerHTML=header+'<p role="status">'+esc(invitationProblem.message)+'</p><div class="button-row">'+
        helpLink('invitation')+(invalid?'':'<button class="button" type="button" data-retry-invite>Check invitation again</button>')+
        '<button class="button outline" type="button" data-ordinary-login="committee">Officer sign-in</button><button class="button outline" type="button" data-ordinary-login="members">Member sign-in</button></div>';
      gate.querySelector('[data-retry-invite]')?.addEventListener('click',openInvitation);
      gate.querySelectorAll('[data-ordinary-login]').forEach(button=>button.onclick=()=>{
        inviteToken=null;location.replace('#'+button.dataset.ordinaryLogin);paint();
      });
      return;
    }
    if (!session) {gate.innerHTML=header+'<p role="status">Checking club access…</p>';return;}
    if (session.authenticated && !inviteToken) {
      const renewal=active==='members' && session.accountRole==='member' && session.role==='signed_in';
      gate.innerHTML=header+(renewal?'<div class="panel"><h2>Renew your membership</h2><p>Your membership term has ended. Check below for a returning-member offer or contact the Treasurer about renewing.</p><a href="/constitution.pdf" target="_blank" rel="noopener">Read the club constitution</a></div><section class="panel"><h2>Keep my club contributions</h2><p>You can still save your journal, map spots, posts and club photos with this login.</p><a class="button outline" href="/my-club-download.html">Download my contributions and photos</a></section><div id="lapsed-returning"></div><div id="member-renewal-inbox"></div>':'<div class="panel"><h2>Access for this role</h2><p>To request access, choose '+helpLink('access')+'. The Secretary receives a private copy.</p><a href="#members">Go to member home</a></div>');
      return;
    }
    const activating = Boolean(inviteToken);
    const officerDesk=active==='committee'||active==='stock';
    const title=activating?(invitation.resetting?'Reset your club password':'Set up your club password'):officerDesk?'Officer sign-in':'Sign in to the clubhouse';
    const intro=activating?(invitation.login?'Your username is filled in. ':invitation.suggestedLogin?'Your suggested Webmaster username is filled in. You can change it here. ':'')+'Choose the password you will use each time you sign in.':officerDesk?'Already set up? Enter your officer username and the password you chose.':'Use the username and password for your fishing club account.';
    const firstVisit=officerDesk&&!activating?'<details class="officer-first-visit"><summary>First visit or forgotten password?</summary><p>For the first Webmaster account, open the private shortcut called <strong>Set up your PLFC Webmaster account</strong> on the computer where the clubhouse was set up. For an officer account, open the private invitation the Webmaster gave you. It fills in your officer username and lets you choose your password.</p><p>For a fresh link, choose Ask the Webmaster below. The Secretary receives a private copy.</p></details>':'';
    gate.innerHTML = header+'<div class="panel"><h2>'+title+'</h2><p>'+intro+'</p>'+firstVisit+
      '<form class="stack-form" id="club-login"><label>Club username<input name="login" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="80" minlength="3" required></label>'+
      passwordField('password',activating?'Choose a password':'Password',activating)+
      (activating?passwordField('repeat','Repeat your new password',true):'')+
      '<button type="submit" class="button">'+(activating?(invitation.resetting?'Save my new password':'Activate my account'):'Sign in')+'</button><p role="status"></p></form></div>'+
      '<p class="field-note">Need help with your login? '+helpLink(activating?'invitation':'signin')+'. The Secretary receives a private copy.</p>'+
      (officerDesk||activating?'':'<div class="button-row"><button type="button" class="button outline" data-apply-club>Apply for membership</button><a href="/constitution.pdf" target="_blank" rel="noopener" class="text-link">Read the club constitution</a></div>');
    gate.querySelector('[data-apply-club]')?.addEventListener('click',()=>window.dispatchEvent(new Event('plfc:apply')));
    const form=gate.querySelector('#club-login');
    if (activating && invitation.login) { form.elements.login.value=invitation.login; form.elements.login.readOnly=true; }
    if(activating && !invitation.login && invitation.suggestedLogin)form.elements.login.value=invitation.suggestedLogin;
    form.onsubmit=async event=>{
      event.preventDefault();
      const status=form.querySelector('[role=status]'),button=form.querySelector('button[type="submit"]');
      const login=form.elements.login.value, password=form.elements.password.value;
      if (activating && password!==form.elements.repeat.value) {status.textContent='Your two passwords need to match.';return;}
      button.disabled=true;status.textContent='Checking your account…';
      try {
        await post(activating?'/api/auth/activate':'/api/auth/login',activating?{login,password,token:inviteToken}:{login,password});
        if(activating)history.replaceState(null,'','#'+invitation.destination);
        form.reset();channel?.postMessage('signed-in');reload();
      } catch(error) {
        status.textContent=error.message;button.disabled=false;
        if(!activating && officerDesk && error.status===401)form.parentElement.querySelector('.officer-first-visit').open=true;
      }
    };
  }

  const roleLabel={administrator:'Webmaster',committee:'Committee',treasurer:'Treasurer',member:'Member'};
  async function listAccounts() {
    const output=accounts.querySelector('[data-accounts-list]');
    try {
      const data=await api('/api/accounts');
      output.innerHTML=data.accounts.map(a=>'<div class="account-row"><strong>'+esc(a.login)+'</strong><span>'+esc(['committee','treasurer'].includes(a.role)&&Object.hasOwn(officers,a.login)?officers[a.login]:roleLabel[a.role])+(a.paidThrough?' · Membership valid through '+esc(a.paidThrough):'')+(a.disabled?' · Access closed':'')+'</span>'+
        (a.role==='member'&&!a.disabled?'<label>Renew through <input type="date" data-renew-date></label><button class="text-link" type="button" data-renew="'+esc(a.id)+'">Confirm payment</button>':'')+
        (!session.administrator||a.role==='administrator'||a.disabled?'':'<button class="text-link" type="button" data-reset="'+esc(a.login)+'">Reset password</button><button class="text-link" type="button" data-revoke="'+esc(a.id)+'">Close access</button>')+'</div>').join('');
    } catch(error) {output.textContent=error.message;}
  }
  function setupAccounts() {
    accounts.hidden=!session?.canManageStock;
    if (accounts.hidden || accounts.hasChildNodes()) return;
    const seats=Object.entries(officers).map(([login,title])=>'<option value="office-'+login+'">'+title+'</option>').join('');
    accounts.innerHTML='<summary>Manage club access</summary>'+
      '<section class="pending-invitations" aria-labelledby="pending-invites-title"><div class="pending-title"><h3 id="pending-invites-title">Pending invitations</h3><button type="button" class="text-link" data-refresh-invites>Refresh list</button></div><p data-pending-status role="status"></p><ul data-pending-rows></ul></section><h3>Invite someone new</h3>'+
      '<form class="stack-form"><label>Give access as<select name="role"><option value="member">Paid member</option>'+(session.administrator?'<optgroup label="Named committee offices">'+seats+'</optgroup><option value="committee">Other committee login</option><option value="treasurer">Other treasurer login</option>':'')+'</select></label>'+
      '<label>Username for the invitation<input name="login" minlength="3" maxlength="80" autocomplete="off" required></label>'+
      '<div data-payment><label>Membership paid through<input type="date" name="paidThrough"></label><label><input type="checkbox" name="verified"> I checked this membership payment against the club records.</label></div>'+
      '<button class="button" type="submit">Create a private invitation</button></form><p role="status" data-issue-status></p><div data-issued></div><h3>Club accounts</h3><div data-accounts-list></div>';
    const status=accounts.querySelector('[data-issue-status]'), issued=accounts.querySelector('[data-issued]');
    const pending=setupPendingInvitations(accounts.querySelector('.pending-invitations'),{api,esc,titleFor:entry=>
      ['committee','treasurer'].includes(entry.role)&&Object.hasOwn(officers,entry.login)?officers[entry.login]:roleLabel[entry.role]||'Club invitation'});
    async function invite(data) {
      issued.replaceChildren();
      const result=await post('/api/accounts/invite',data);
      issued.innerHTML='<label>Private setup link<input readonly></label><button class="button outline small" type="button" data-copy>Copy invitation</button>';
      issued.querySelector('input').value=privateSetupLink(result);
      status.textContent='Give this link privately to '+result.login+'. It works once and expires in 24 hours.';
      if(!data.reset)await pending.list();
    }
    const form=accounts.querySelector('form'),loginField=form.elements.login;
    let customLogin='';
    function chooseOffice() {
      const choice=form.elements.role.value, seat=choice.startsWith('office-')?choice.slice(7):'';
      if(!loginField.readOnly)customLogin=loginField.value;
      loginField.readOnly=Boolean(seat);
      loginField.value=seat||customLogin;
      accounts.querySelector('[data-payment]').hidden=choice!=='member';
    }
    form.elements.role.onchange=chooseOffice;
    form.onsubmit=async event=>{
      event.preventDefault(); const button=form.querySelector('button');button.disabled=true;
      try{
        const data=Object.fromEntries(new FormData(form));
        if(data.role.startsWith('office-'))data.role=data.login==='treasurer'?'treasurer':'committee';
        await invite({...data,verified:form.elements.verified.checked});
        form.reset();customLogin='';chooseOffice();
      }catch(error){status.textContent=error.message;if(error.status===409)await pending.list(loginField.value);}finally{button.disabled=false;}
    };
    accounts.addEventListener('click',async event=>{
      const button=event.target.closest('[data-copy],[data-reset],[data-renew],[data-revoke]');if(!button)return;
      button.disabled=true;
      try {
        if(button.hasAttribute('data-copy')) {const field=issued.querySelector('input');try{await navigator.clipboard.writeText(field.value);status.textContent='Invitation copied. Give it only to the intended person.';}catch{field.select();status.textContent='Copy the selected link.';}}
        if(button.dataset.reset) await invite({login:button.dataset.reset,reset:true});
        if(button.dataset.renew){
          const paidThrough=button.closest('.account-row').querySelector('input[type=date]').value;
          if(!paidThrough){status.textContent='Choose the date this payment covers.';return;}
          if(confirm('Have you checked the payment in the club records and confirmed membership through '+paidThrough+'?')){
            await post('/api/accounts/renew',{id:button.dataset.renew,paidThrough,verified:true});await listAccounts();status.textContent='Membership renewed.';
          }
        }
        if(button.dataset.revoke && confirm('Close this person’s club access and sign them out on every device?')) {
          await post('/api/accounts/disable',{id:button.dataset.revoke});await listAccounts();status.textContent='Access closed.';
        }
      } catch(error) {status.textContent=error.message;}finally{button.disabled=false;}
    });
    const refreshAccounts=()=>{if(accounts.open){listAccounts();pending.list();}else{pending.forget();issued.replaceChildren();status.textContent='';}};
    accounts.addEventListener('toggle',refreshAccounts);
    if(accounts.open)refreshAccounts();
  }
  deskNav.addEventListener('click',async event=>{
    if(!event.target.closest('[data-logout]'))return;
    try{await post('/api/auth/logout',{});channel?.postMessage('signed-out');reload();}
    catch(error){alert(error.message);}
  });
  window.addEventListener('plfc:navigated',event=>{active=event.detail.page;paint();});
  window.addEventListener('pageshow',event=>{if(event.persisted)reload();});
  const verifySession=async()=>{
    if (!session?.authenticated || document.hidden) return;
    try{const next=await api('/api/session');if(next.identity?.id!==session.identity?.id || next.role!==session.role || next.canManageStock!==session.canManageStock)reload();}catch{/* The server checks each private request. */}
  };
  document.addEventListener('visibilitychange',verifySession);
  setInterval(verifySession,60000);
  window.addEventListener('plfc:invitation-arrived',openInvitation);
  if(inviteToken)openInvitation();
  return {
    setSession(value) {
      session=value;helpInbox.setSession(value);
      document.body.toggleAttribute('data-club-member',allowed('members'));
      document.body.toggleAttribute('data-club-committee',allowed('committee'));
      document.body.toggleAttribute('data-role-treasurer',allowed('stock'));
      paint();setupAccounts();
      (allowed('members')?setupLibrary:clearLibrary)(document.getElementById('member-library'));
      (allowed('committee')?setupLibrary:clearLibrary)(document.getElementById('committee-library'));
      window.dispatchEvent(new CustomEvent('plfc:session-changed',{detail:value}));
    }
  };
}
