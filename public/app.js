import {setupClubAccess} from './club-access.js?v=20261123-showcase';
import {setupFinniusMotion} from './finnius-motion.js';
import {setupSocialLinks} from './social-channels.js';
import {setupSocialPlanner} from './social-planner.js?v=20261121-club-funding';
import {setupFundraisingEvents} from './fundraising-events.js?v=20261121-angler';
import {setupMemberRoom} from './member-room.js?v=20261121-angler';
import {setupMemberCalendar} from './member-calendar.js';
import {setupMemberNetwork} from './member-network.js';
import {setupHonours} from './honours.js';
import {setupClubEquipment} from './club-equipment.js?v=20261121-practical-wishes';
import {setupEquipmentWishes} from './equipment-wishes.js?v=20261121-practical-wishes';
import {setupMerchStocktake} from './merch-stocktake.js';
import {setupSponsorRooms} from './sponsor-rooms.js?v=20261121-practical-wishes';
import {setupSharedMeals} from './shared-meals.js?v=20261121-club-funding';
import {setupMemberRecipes} from './member-recipes.js';
import {setupJuniorContests} from './junior-contests.js';
import {setupReturningMembers} from './returning-members.js';
import {setupSafeguards} from './member-safeguards.js';
import {setupCatchJournal} from './catch-journal.js';
import {setupHandoffs} from './handoffs.js?v=20261121-media-network';
import {setupApplicationEntry,setupApplicationReview} from './applications.js?v=20261121-safeguards';
import {setupMemberLifecycle} from './member-lifecycle.js?v=20261121-club-funding';
import {setupOperatingAuthority} from './operating-authority.js';
import {setupTreasurerOrders} from './treasurer-orders.js';
import {setupOfficerHandover} from './officer-handover.js?v=20261121-welcome-back';
import {setupClubNews} from './club-news.js?v=20261121-monthly';
import {setupStockReports} from './stock-reports.js';
import {setupClubPricing} from './club-pricing.js';
import {setupPriceNotices} from './price-notices.js?v=20261121-club-funding';
import {setupShop} from './shop.js?v=20261121-club-funding';
import {setupWildlifeHelp} from './wildlife-help.js';
import {setupMeetingWorkflow} from './meeting-workflow.js?v=20261121-club-funding';
import {setupOfficerTodos} from './officer-todos.js?v=20261121-club-funding';
import {setupGrantRegister} from './grant-register.js?v=20261121-practical-wishes';
import {mountGrantPage,scrollToGrantSection} from './grant-page.js';
import {setupNoticeEmailProfile} from './notice-email-profile.js';
import {setupCommitteeNotices} from './committee-notices.js';
import {setupAgmJobs} from './agm-jobs.js';
import {setupAgendaPrint} from './agenda-print.js';
import {showSchoolHolidays} from './school-holidays.js';
import {setupRecording} from './recording.js?v=20261120b';
import {setupConnectionGuides} from './connections.js?v=20261121-club-funding';
import {setupFishGuide,renderGuideRoute} from './fish-guide.js?v=20261121-phone';
import {enterFishingBoard,setupFishingBoard} from './fishing-board.js?v=20261121-phone';
import {setupCalendarHelp} from './calendar-help.js?v=20261121-agendas';
import {setupDemoGuide} from './demo-guide.js?v=20261121-grant-wishes';
import {parseLocationHash,normaliseGuideLinks} from './page-routing.js?v=20261121-clubhouse-menu';
const $=selector=>document.querySelector(selector);
$('#footer-nav').replaceChildren(...Array.from($('#main-nav').querySelectorAll('a'),link=>link.cloneNode(true)));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const time=value=>value?new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value)):'No event this day';
const dateLabel=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value.includes('T')?value:value+'T12:00:00+10:00'));
let session={role:'anonymous',storageReady:false},club=null;
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,5000)}
function modal(title,body){$('#dialog-content').innerHTML='<span class="eyebrow">POINT LOOKOUT FISHING CLUB</span><h2 id="dialog-title">'+esc(title)+'</h2>'+body;normaliseGuideLinks($('#dialog-content'));$('#info-dialog').showModal()}
function download(name,text,type='text/plain'){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function api(path,options={}){const result=await fetch(path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});let value;try{value=await result.json()}catch{throw Error('The club connection is unavailable. Please try again.')}if(!result.ok){const error=Error(typeof value.error==='string'?value.error:value.error?.message??value.message??'Please try again.');error.status=result.status;throw error}return value}
const previewBody='<p><strong>Clubhouse demonstration.</strong> Anyone can browse the club shop, read the constitution, check the fishing guide and find Sunday’s hotel catch-up. Paid members have a private space for conversations, journals and minutes.</p><p>Shop enquiries, pickup requests and membership applications go to the club. Officers sign in with their own accounts. The treasurer confirms prices and can open online payment for each product. The committee is still reviewing the wider rollout.</p>';
$('#preview-info').onclick=$('#footer-preview-info').onclick=()=>modal('A first look at our next chapter.',previewBody);
$('#joining-info').onclick=()=>modal('How membership works','<ol><li>Read the constitution and send the club your membership application.</li><li>The committee checks your application and confirms the fee. The Treasurer verifies the membership payment. Returning members with an approved welcome-back offer can accept a complimentary year.</li><li>Open your private invitation and choose a club password.</li><li>Find your membership pack status, birthday choices and club messages under My membership &amp; benefits.</li></ol><a href="/constitution.pdf" target="_blank" rel="noopener">Read the constitution</a>');

$('#finnius-help').dataset.demoAction='page';
$('#finnius-help').dataset.demoPage='home';
$('.dialog-close').onclick=()=>$('#info-dialog').close();
$('#info-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close()});
$('#dialog-content').addEventListener('click',event=>{if(event.target.closest('a[href^="#"]'))$('#info-dialog').close()});
$('.menu-toggle').onclick=()=>{const open=$('#main-nav').classList.toggle('open');$('.menu-toggle').setAttribute('aria-expanded',String(open))};
let closePublicGrants;
function route(){
  const destination=parseLocationHash(location.hash),page=destination.page;
  document.querySelectorAll('[data-view]').forEach(view=>view.hidden=view.dataset.view!==page);
  const grants = $('#public-grants');
  if(page==='grants' && !closePublicGrants){
    closePublicGrants=mountGrantPage(grants);
  }else if(page!=='grants' && closePublicGrants){
    closePublicGrants();
    closePublicGrants=null;
  }
  const feature=page==='committee' && ['events','news','handover','grants','member-notice','notices','todos','social','leaderboard','safety','returning','equipment','sponsors'].includes(destination.slug);
  $('[data-view="members"]').toggleAttribute('data-reading-news',destination.hash==='#members/news');
  $('[data-view="members"]').toggleAttribute('data-inside-member-tool',page==='members'&&Boolean(destination.slug));
  $('[data-committee-overview]').hidden=Boolean(feature);
  document.querySelectorAll('[data-committee-feature]').forEach(panel=>panel.hidden=!feature || panel.dataset.committeeFeature!==destination.slug);
  const guide=page==='guide'?renderGuideRoute(destination.slug, destination.species, destination.knot, destination.compare):null;
  if(guide&&!guide.valid){destination.slug='';destination.hash='#guide'}
  if(location.hash!==destination.hash)history.replaceState(null,'',destination.hash);
  const menuPage=({stock:'committee',grants:'sponsors'})[page]||page;
  document.querySelectorAll('[data-page]').forEach(link=>{
    if(link.dataset.page===menuPage)link.setAttribute('aria-current',page==='grants'?'location':'page');
    else link.removeAttribute('aria-current');
  });
  $('#main-nav').classList.remove('open');$('.menu-toggle').setAttribute('aria-expanded','false');
  if(page==='events')showSchoolHolidays($('[data-school-holidays]'),today());
  if(page==='fishing')enterFishingBoard();
  document.title=guide?guide.title+' | Point Lookout Fishing Club':({home:'Point Lookout Fishing Club | Your people.',events:'What’s on | Point Lookout Fishing Club',sponsors:'Sponsors and supporters | Point Lookout Fishing Club',grants:'Grants and community projects | Point Lookout Fishing Club',fishing:'Your fishing day | Point Lookout Fishing Club',members:'Your club | Point Lookout Fishing Club',shop:'Club shop | Point Lookout Fishing Club',stock:'Treasurer stock book | Point Lookout Fishing Club',committee:'Meeting workspace | Point Lookout Fishing Club'})[page];
  window.dispatchEvent(new CustomEvent('plfc:navigated',{detail:destination}));
  const featureTitles={'#members/notices':'My club notices','#members/meals':'Share a meal','#members/equipment-wishes':'Equipment wish list','#sponsors':'Sponsors and supporters','#committee/sponsors':'Sponsor offers and introductions','#committee/equipment':'Club assets and loans','#members/recipes':'Members’ recipe book','#committee/returning':'Invite returning members','#stock/returning':'Membership fee waivers','#members/safety':'My access and safety','#committee/safety':'Member age and permissions','#members/profile':'My profile','#members/friends':'Friends and sharing','#members/catch-map':'Catch map','#members/calendar':'Events calendar','#members/leaderboard':'Club leaderboard','#committee/leaderboard':'Results, prizes and sponsors','#committee/events':'Events and fundraising','#committee/social':'Social media planner','#members/social':'Club socials','#committee/member-notice':'Post a notice for members','#committee/grants':'Grant register','#committee/notices':'Committee notices','#committee/todos':'Officer to-do lists','#stock/reports':'Stock and sales reports','#committee/news':'Newsletter desk','#members/news':'Member newsletters','#committee/handover':'Officer handover'};
  if(featureTitles[destination.hash]) document.title=featureTitles[destination.hash]+' | Point Lookout Fishing Club';
  if(!$('#info-dialog').open){
    const heading=document.querySelector('#club-access:not([hidden]) h1')??guide?.focusElement??(feature?document.querySelector('[data-committee-feature]:not([hidden]) h1')||document.querySelector('[data-committee-feature]:not([hidden])'):null)??(destination.hash==='#stock/reports'?$('#monthly-reports h1'):destination.hash==='#stock/returning'?$('#stock-returning h1')||$('#stock-returning'):document.querySelector(`[data-view="${page}"] h1`))??$('#main');
    if(!heading.matches('summary'))heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
  }
  if(guide?.scrollToFocus)guide.focusElement.scrollIntoView({block:'center',behavior:'instant'});
  else window.scrollTo({top:0,behavior:'instant'});
  if(page==='grants' && destination.slug)scrollToGrantSection(grants,destination.slug);
  showPrivateDestination(destination);
  return destination;
}
const privateTargets={'agm-jobs':'agm-jobs','help-out':'member-handoffs',meetings:'meeting-desk',applications:'committee-applications',automations:'committee-automations','ready-setco':'committee-handoffs',documents:'committee-documents',access:'club-accounts'};
let sectionObserver;
function showPrivateDestination(destination){
  sectionObserver?.disconnect();
  if(!['members','committee'].includes(destination.page)||!destination.slug)return;
  const id=privateTargets[destination.slug];
  const section=id?document.getElementById(id):destination.page==='members'?document.querySelector('[data-member-pane="'+destination.slug+'"]'):null;
  if(!section)return;
  const reveal=()=>{
    if(!section.getClientRects().length||!section.firstElementChild)return false;
    if(section.tagName==='DETAILS')section.open=true;
    if(['help-out','ready-setco','applications','agm-jobs'].includes(destination.slug)){
      const choice=section.querySelector('details');if(!choice)return false;choice.open=true;
    }
    if(destination.page==='members'&&document.body.hasAttribute('data-club-member')){
      if(!section.hasAttribute('tabindex'))section.setAttribute('tabindex','-1');
      section.focus({preventScroll:true});
    }
    section.scrollIntoView({block:'start'});sectionObserver?.disconnect();return true;
  };
  requestAnimationFrame(()=>{if(location.hash===destination.hash&&!reveal()){sectionObserver=new MutationObserver(reveal);sectionObserver.observe(section,{attributes:true,childList:true,subtree:true});}});
}
window.addEventListener('hashchange',route);
function navigateTo(hash){
  const destination=parseLocationHash(hash).hash;
  if(location.hash===destination){route();return Promise.resolve(true)}
  return new Promise(resolve=>{
    window.addEventListener('plfc:navigated',event=>resolve(event.detail.hash===destination),{once:true});
    location.hash=destination;
  });
}
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href^="#"]');
  if(!link||event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(link.hash==='#main'){
    event.preventDefault();$('#main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});return;
  }
  if(parseLocationHash(link.hash).hash===location.hash){event.preventDefault();route()}
});
setupFinniusMotion();
$('#fishing-date').value=today();
const tileDate = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'short',
});

function clubDateCard(event) {
  const parts = Object.fromEntries(tileDate.formatToParts(new Date(event.startsAt)).map(part => [part.type, part.value]));
  const isMeeting = event.type === 'meeting';
  const action = isMeeting ? 'Add this meeting to my calendar' : 'Add this date to my calendar';
  const duration = event.durationConfirmed === false
    ? '<p class="secondary">The finish time in your calendar is an estimate.</p>' : '';
  return `<article class="panel event-card" data-fee-event-id="${esc(event.id)}">
    <div class="date-tile" aria-hidden="true"><span>${esc(parts.month.toUpperCase())}</span><strong>${esc(parts.day)}</strong><span>${esc(parts.weekday.toUpperCase())}</span></div>
    <div><span class="pill">${event.format==='informal' ? 'Informal catch-up' : isMeeting ? 'Club meeting' : 'Club date'}</span><h2>${esc(event.title)}</h2>
    <p>${esc(dateLabel(event.startsAt))} · ${esc(time(event.startsAt))}<br>${esc(event.location)}</p>
    <p>${esc(event.description)}</p>${duration}</div>
    <a class="button outline small" href="${esc(event.calendarUrl)}" download="plfc-date.ics">${action}</a>
  </article>`;
}

function renderProgramme(programme) {
  if (!Array.isArray(programme) || !programme.length) return;
  $('#club-programme').innerHTML = programme.map(item => {
    const title = esc(item.title);
    const summary = esc(item.summary);
    if (item.status === 'proposal') {
      return `<details class="club-plan-proposal"><summary>${title} (idea for discussion)</summary><p>${summary}</p></details>`;
    }
    return `<article class="club-plan-item"><h3>${title}</h3><p>${summary}</p></article>`;
  }).join('');
}

async function loadClub() {
  try {
    club = await api('/api/club');
    $('#events-list').innerHTML = club.events.length
      ? club.events.map(clubDateCard).join('')
      : '<p class="empty-state">There are no agreed dates on the calendar yet.</p>';
    renderProgramme(club.programme);
    window.dispatchEvent(new Event('plfc:calendar-drawn'));
  } catch {
    $('#events-list').innerHTML = '<p class="empty-state">The club dates could not load. Refresh this page to try again.</p>';
  }
}
setupCatchJournal({api,esc,today,dateLabel});
setupAgendaPrint();
setupOfficerTodos({api,esc});
setupCommitteeNotices({api});
setupNoticeEmailProfile({api});
setupGrantRegister({api});
setupSocialLinks();
setupSocialPlanner({api,esc});
setupFundraisingEvents({api,esc});
setupMemberNetwork({api,esc});
setupMemberCalendar({api,esc});
setupHonours({api,esc});
setupJuniorContests({api,esc});
setupMemberRecipes({api,esc});
setupSharedMeals({api,esc});
setupSponsorRooms({api,esc});
setupClubEquipment({api,esc});
setupEquipmentWishes({api,esc});
setupMerchStocktake({api,esc,toast});
setupSafeguards({api,esc});
let welcomeBackDesk=null,welcomeBackRequest=null;
async function showWelcomeBackCount(){
  welcomeBackRequest?.abort();
  const desk=welcomeBackDesk;
  if(!desk||location.hash!==desk.home)return;
  const request=new AbortController();welcomeBackRequest=request;
  try{
    const {count}=await api('/api/committee/returning-members?summary=1',{signal:request.signal});
    if(!request.signal.aborted)desk.link.textContent=desk.title+(count?' · '+count+' '+desk.action:'');
  }catch{if(!request.signal.aborted)desk.link.textContent=desk.title;}
}
window.addEventListener('plfc:navigated',showWelcomeBackCount);
window.addEventListener('plfc:session-changed',({detail})=>{
  const office=String(detail?.identity?.name||'').toLowerCase().replace(/[^a-z]/g,'');
  welcomeBackDesk=null;
  for(const desk of [
    {link:$('[data-returning-office]'),home:'#committee',title:'Invite returning members',action:'ready to invite',allowed:detail?.role==='committee'&&['secretary','assistantsecretary'].includes(office)},
    {link:$('[data-returning-finance]'),home:'#stock',title:'Membership fee waivers',action:'awaiting approval',allowed:detail?.accountRole==='treasurer'&&detail?.canManageStock},
  ]){
    if(!desk.link)continue;
    desk.link.hidden=!desk.allowed;desk.link.textContent=desk.title;
    if(desk.allowed)welcomeBackDesk=desk;
  }
  showWelcomeBackCount();
  $('#events-officer-shortcut').hidden=!(detail?.authenticated && detail.role==='committee');
});
setupAgmJobs({api,esc,navigate:navigateTo});
const meetingDesk = setupMeetingWorkflow({api, toast, download, esc, modal, setupRecording});
const accessDesk=setupClubAccess({api,esc});
const memberRoom=setupMemberRoom({api,esc,toast});
const handoffs=setupHandoffs({api,esc});
setupApplicationEntry();
setupMemberLifecycle();
setupOperatingAuthority({api,esc});
async function loadSession(){
  try {
    session=await api('/api/session');
    accessDesk.setSession(session);
    memberRoom.setSession(session);
    handoffs.setSession(session);
    setupApplicationReview($('#committee-applications'),session);
    if(['member','committee'].includes(session.role)&&session.storageReady){
      $('#member-mode').textContent='Signed in as '+session.identity.name+'.';
      $('#paid-until').textContent=session.paidThrough?'Membership valid through '+dateLabel(session.paidThrough)+'.':'Signed in with an authorised club officer account.';
    }
    await meetingDesk.setSession(session);
  }catch{meetingDesk.clearSession();accessDesk.setSession({role:'anonymous',storageReady:false});toast('Club sign-in is unavailable. Please try again shortly.');}
}
setupShop();setupReturningMembers({api,esc});setupOfficerHandover();setupClubNews({api,esc});setupTreasurerOrders({api,esc});setupStockReports({api,esc});setupClubPricing({api,esc});setupPriceNotices({api,esc});setupFishGuide();setupConnectionGuides(modal);setupFishingBoard();setupWildlifeHelp(modal);setupCalendarHelp(modal,()=>club?.events??[]);normaliseGuideLinks();loadClub();loadSession();route();setupDemoGuide(modal,{navigate:navigateTo});
