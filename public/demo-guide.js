import {parseLocationHash} from './page-routing.js?v=20261121-clubhouse-menu';
import {getOfficerTour} from './finnius-offices.js';
import {extraPageGuide,finniusPageLinks} from './finnius-pages.js?v=20261121-grant-wishes';
import {mountTourFinnius,mountFinniusTourButton} from './finnius-motion.js';

const PAGES = [
  {
    key: 'home', name: 'Meet the club home',
    next: 'Start with What’s on to find the next get-together.',
    limit: 'This is a club demo. Applying sends a private record to the committee. Online payments and automatic partner connections still need approval.',
    target: '.next-meeting',
    steps: ['Find Sunday’s informal catch-up with the hotel and read how the club plans local meets and small days with other clubs.', 'Choose What’s on to see the meeting details and calendar options.', 'Open Finnius’s page tour whenever you want a hand.'],
    result: 'You will know where the club dates, fishing tools, member home and committee workspace live.',
  },
  {
    key:'sponsors',name:'Offer support to the club',target:'#sponsor-room',
    next:'Choose how you would like to help.',limit:'Officers review each offer with the supporter.',
    steps:['Look at examples of equipment loans, prizes and help at an event.','Tell the club what you can offer and what you would like in return.','Choose how you would like to take part and leave a private contact for follow-up.'],
    result:'A committee officer can review your offer and discuss the details.',
  },
  {
    key: 'grants', name: 'Find funding for a club project', target: '#public-grants',
    next: 'Choose a project category to find relevant funding.',
    steps: ['Choose a category such as Kids and families, or search for a project you have in mind.',
      'Open a grant to see who can apply, how much is available and when it closes.',
      'Check the funder’s guidelines. Officers can track a lead and assign the next step in the committee grant register.'],
    result: 'You can find a grant that suits the project and check its terms at the source.',
  },
  {
    key: 'events', name: 'Put the meeting in your calendar',
    next: 'Choose Add this meeting to my calendar, then pick the calendar you use.',
    limit: 'Sunday’s hotel catch-up has a date and an estimated finish time. Local fishing meets and small invitationals are ideas below it until dates are agreed.',
    target: '#events-list',
    steps: ['Check Sunday 22 November 2026, 10 am, at Point Lookout Hotel.', 'Choose Add this meeting to my calendar and select the calendar option you normally use.', 'Review the details in your calendar before saving. A downloaded calendar file still needs to be opened or imported.'],
    result: 'The meeting can appear in your own calendar. This demo does not send invitations or reminders for the club.',
  },
  {
    key: 'fishing', name: 'Plan a fishing day',
    next: 'Choose an area, day, fishing method and target, then choose Plan my day.',
    limit: 'Forecasts can change. Tide heights refer to a named reference station, and lunar periods do not guarantee a bite.',
    target: '#fishing-controls',
    steps: ['Pick your area and day, then how you plan to fish and what you have in mind.', 'Choose Plan my day to bring the conditions and fishing pointers together.', 'Read the tide station label and forecast time. Open the official forecast and radar before heading out.'],
    result: 'You will see a starting point for your outing, with the source and limits of the information made clear.',
  },
  {
    key: 'guide', name: 'Get to know the fish and bait',
    route: '#guide/fish',
    next: 'Pick a species photo, look at its bait pictures, then try the three-step rig guide.',
    limit: 'These are general club tips. Use the official links for current identification, limits, closures and marine park rules.',
    target: '#guide-fish-search',
    steps: ['Search for a fish or bait, or filter by the place you want to fish.', 'Open a fish card for its features, bait pictures and fishing tips. A simple rig is a separate chapter in Guide contents.', 'Before keeping a fish, choose Confirm fish ID and Check Qld rules and confirm the exact species, place and date with the official sources.'],
    result: 'You will have some bait and approach ideas, plus a clear path to the current rules.',
  },
  {
    key: 'members', name: 'Find your member home',
    next: 'Sign in, then choose Newsletters for the latest edition and archive, or Minutes & documents for the club’s decisions.',
    limit: 'Signed-in changes save to the club database. Sharing a yarn or photo makes it visible to other eligible members.',
    target: '#member-tabs',
    steps: ['Read the constitution or choose Apply for membership at the sign-in screen.', 'After approval, open your private setup link. If the Secretary gave you a welcome-back offer, open that invitation to accept your complimentary year.', 'Sign in and choose Minutes & documents for club decisions or My membership & benefits for pack progress, birthday choices and volunteering.'],
    result: 'You can find approved member minutes and choose how the club keeps in touch.',
  },
  {
    key: 'shop', name: 'Find something in the club shop',
    next: 'Choose an item, ticket, donation or guided session to see its options.',
    limit: 'The treasurer confirms pickup details with you. Online payment opens when the club has published a checkout link for the item.',
    target: '[data-merch-range]',
    steps: ['Open a listing. For shirts, choose the style, colour and size you want.', 'For a booking or collection, send your request and keep the reference. The club will contact you to confirm the details.', 'If online payment is available, check the amount on the club’s checkout page before paying.'],
    result: 'You can find the right shirt, check a booking or ask about a donation.',
  },
  {
    key: 'stock', name: 'Use the treasurer’s desk',
    next: 'Choose Shop listings to add something for sale. Use Receive stock for a delivery or Stock book to enter a shelf count.',
    limit: 'Publishing a price alerts the committee. Recording a paid collection creates a sale.',
    target: '#club-prices',
    steps: ['Choose Shop listings, then Add a shop listing. Pick the kind of offering. For a shirt already listed, open it to add its styles, colours and sizes.', 'For a pickup, open the customer request. Contact the customer, agree a total and collection time, then hold the stock.', 'At collection, check the payment and record the sale. The stock book updates the shelf count.'],
    result: 'The public price list, private customer requests and stock records are all managed here.',
  },
  {
    key: 'committee', name: 'Find your committee tools',
    next: 'Start with To-do lists for your regular duties. Use Meetings for the agenda or Events and fundraising to share the work for a club event.',
    limit: 'Officers review the minutes before approving them and sharing the member edition.',
    target: '[data-view="committee"] .page-title',
    steps: ['Open the committee desk with your officer login.', 'Choose your meeting. For a formal meeting, review the order of business and the chair’s prompts. At an informal catch-up, record ideas and follow-up jobs.', 'Prepare draft minutes, check the decisions and give each agreed job an owner and date.'],
    result: 'The secretary can prepare the record once. Agreed jobs appear in the follow-up list with their owners and dates.',
  },
];

const GUIDE_STEPS = {
  knots: ['Choose the job, then a knot that suits your line.', 'Follow the tying steps or open the demonstration.', 'Check the finished knot and pull-test it before fishing.'],
  rig: ['Choose a fish or a fishing method.', 'Read what you’ll need, including the trace and hook, before you set up.', 'Follow the steps and use the adjustments for the conditions in front of you.'],
  trip: ['Choose your day, fishing method and target.', 'Build the brief and read its gear ideas and seasonal checks.', 'Open Plan my day for the forecast and tides. Your saved trip choices carry across on this device.'],
  conditions: ['Read what wind, swell and tide each tell you.', 'Open Plan my day to choose your place and date.', 'Check the named sources, official warnings and conditions at the water.'],
  safety: ['Choose the advice for your beach, rocks or boat outing.', 'Check conditions, equipment and who knows your plan.', 'Change the plan if conditions or your experience do not suit it.'],
  jetty: ['Look at the local jetty picture and sharing advice.', 'Keep access clear and check people, lines and wildlife around you.', 'Check the local signs and use the zones and rules chapters for your exact activity.'],
  rules: ['Identify the exact species first.', 'Use the official Queensland links to check size, possession limits and closures for your date.', 'Check marine park zones separately for the exact place you want to fish.'],
  zones: ['Find your exact location in the official marine park map.', 'Read what the zone allows for your activity and gear.', 'Check signs and other fishing rules as well. This guide does not locate a live zone boundary.'],
  'moreton-bay-bugs': ['Look at the slipper lobster photo.', 'Read how it is caught and what is practical locally.', 'Check the size, egg-bearing rules and zone before keeping one.'],
  crabbing: ['Choose the picture of a baited pot or an open hoop to see how to use it from shore.', 'Check the zone and your gear label before setting out.', 'When you lift your gear, compare the crab with the photos and measure it using the guide for its species.'],
  spearfishing: ['Pick the offshore water or boundary you want to check.', 'Read How far away? for public jetties, shark control gear and bathing reserves.', 'Choose a fish photo for markings and keeping limits.'],
  'catch-care': ['Choose whether you are releasing your fish or keeping it for dinner.', 'For an eligible club catch, open the brag mat photo check.', 'If the species is unfamiliar, use the fish photos before handling it.'],
  'bait-gathering': ['Choose the bait or net you are considering.', 'Check recreational gear, collection limits, zones and local access.', 'Leave the area tidy and confirm current rules through the official links.'],
  'bait-nets':['Choose the net that matches yours.','Follow its three pictures in order.','Use Find my zone before heading out.'],
  baitfish:['Find your fish in the pictures.','Open its entry for the markings and catching method.','Check its rules before keeping it for bait.'],
  yabbies:['Match the photo to a saltwater nipper.','Follow the pump steps on an open sandflat.','Read the movement rules before taking bait elsewhere.'],
  beachworms:['Compare the whole worm and the close-up of its head.','Watch the short Straddie demonstration.','Open the bait presentation for whiting or dart.'],
  prawns:['Look at the whole prawn in the photo.','Follow the three steps or open the scoop-net pictures.','Check what you can keep and where you can take it.'],
  squid:['Compare the squid and the weighted jig.','Read the lift and pause steps.','Use the species limit and zone links before keeping squid.'],
  pipis:['Look at the pipi shell and play the short beach clip.','Choose Prepare pipis for dinner or Prepare pipis for bait.','Check the shellfish limit and exact zone before collecting.'],
  'pipis-cooking':['Check the collecting zone and harvest advice for your stretch of beach.','Follow the saltwater steps for grit inside the shells.','Lift the pipis out of the sandy water, then steam and shell.'],
  'pipis-bait':['Use locally gathered or purpose-sold bait.','Open the shell on the board and firm the flesh with coarse salt.','Date your bait packs and leave the hook point exposed.'],
  'customary-rights': ['Read how customary fishing rights depend on people, purpose and place.', 'Use the official sources for the relevant rules and rights.', 'If you have a concern, describe what you observed. Do not assume rights from someone’s appearance or identity.'],
  care: ['Prepare wet hands and equipment before handling a catch.', 'Keep handling short and support the fish as shown.', 'Release it promptly. Skip a photo if it needs to go straight back.'],
  'brag-mat': ['Read the example and the photo checks.', 'Choose a sample photo if you want to practise. It stays in this browser.', 'Check the whole fish, measurement scale and club requirements. This practice is not a competition entry.'],
  kitchen: ['Ice your catch promptly. Raw fish keeps for 1 to 2 days at 5°C or colder when chilled from the catch.', 'Choose whole baked fish, pan-fried fillets or lemon squid. If it is already cleaned, use the shortcut beside the tools.', 'Choose Freeze for later to portion and seal it, date the bag and thaw it in the fridge.'],
  sharks: ['Use the pictures and local information to understand what you are seeing.', 'Give sharks and rays space and read the handling guidance.', 'Use the wildlife help chapter for an injured animal.'],
  reporting: ['Read the rights and respectful reporting guidance first.', 'Record only what you observed, including place, time and the activity.', 'Choose the appropriate official contact. This site does not send a report for you.'],
  wildlife: ['If an animal is injured, find the relevant rescue contact here.', 'Call the rescuer for advice and give the location and what you observed.', 'Open the Wildlife Rescue Minjerribah app for its local help. This site does not make a call for you.'],
};

let disposeGuide = null;

class FinniusPageTour extends HTMLElement {
  connectedCallback() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'finnius-inline-tour';
    button.dataset.demoAction = 'page';
    button.dataset.demoPage = this.getAttribute('for-page');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'info-dialog');
    button.innerHTML = '<img width="42" height="42" alt=""><span>Take the Finnius tour</span>';
    this.replaceChildren(button);
    this.stopMotion = mountFinniusTourButton(button.querySelector('img'));
  }

  disconnectedCallback() {
    this.stopMotion?.();
  }
}

if (!customElements.get('plfc-page-tour')) customElements.define('plfc-page-tour', FinniusPageTour);

function availableFocusTarget(selector) {
  const target = document.querySelector(selector);
  if (!target || target.closest('[hidden]')) return null;
  if (target.getClientRects().length) return target;
  let closed = target.closest('details:not([open])');
  while (closed?.parentElement.closest('details:not([open])')) {
    closed = closed.parentElement.closest('details:not([open])');
  }
  return closed?.querySelector(':scope > summary')?.getClientRects().length ? target : null;
}

function focusTourTarget(target, behavior = 'auto') {
  for (let item = target; item; item = item.parentElement) {
    if (item.tagName === 'DETAILS') item.open = true;
  }
  if (target.matches('#catch-form [data-open-map]') && target.getAttribute('aria-expanded') === 'false') target.click();
  if (!target.matches('input,select,textarea,button,a,summary,[tabindex]')) target.tabIndex = -1;
  target.focus({preventScroll:true});
  target.scrollIntoView({block:'center', behavior});
}

export function setupDemoGuide(showDialog, {navigate} = {}) {
  if (typeof showDialog !== 'function') return;
  disposeGuide?.();
  let currentStep = 0;
  let resumeStep = null;
  let disposed = false;
  let stepVersion = 0;
  let currentTourPage = null;
  let currentContextual = false;
  let visitor=null,stopMotion=null;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function stopFinnius(){stopMotion?.();stopMotion=null;}
  function sessionChanged(event){visitor=event.detail;}
  window.addEventListener('plfc:session-changed',sessionChanged);
  document.getElementById('info-dialog')?.addEventListener('close',stopFinnius);
  const created = [];

  const currentPage = () => PAGES.findIndex(page => page.key === parseLocationHash(location.hash).page);
  const closeDialog = () => document.getElementById('info-dialog')?.close();
  const navigatePage = navigate ?? (hash => new Promise(resolve => {
    if (location.hash === hash) { resolve(true); return; }
    window.addEventListener('hashchange', () => resolve(location.hash === hash), {once:true});
    location.hash = hash;
  }));
  const reportGuide = {
    key:'stock', route:'#stock/reports', name:'Export a stock and sales report', target:'#monthly-reports h1',
    steps:['Choose a month, quarter or year and select Show report.', 'Check sales, supplier costs and the closing stock value. Items still needing a count or cost are listed.', 'Choose Download spreadsheet (CSV) to open the figures in Excel, or Print / save PDF for a meeting copy.'],
    result:'You get a copy of the selected report to keep or share with the committee.',
    limit:'Figures cover club merchandise recorded in the stock book. The current period runs up to the time you generate the report.'
  };
  const privateGuides={
    '#committee/returning':{name:'Invite a returning member',target:'#committee-returning',steps:['Check the original membership record and match it to the right person.', 'Prepare their one-year offer and send the fee waiver to the Treasurer for a decision.', 'When approved, pass the private invitation directly to that person or their guardian.'],result:'The offer stays on the returning-member register so the next officer can pick it up.'},
    '#stock/returning':{name:'Review a membership fee waiver',target:'#stock-returning',steps:['Find the offer prepared by the Secretary.', 'Check the member and record whether you approve waiving this annual fee.', 'Review the register for the member’s acceptance and the dates covered.'],result:'A free year is recorded separately from money received.'},
    '#members/calendar':{name:'Find a club date',target:'#member-calendar',steps:['Choose a month or switch to the list.', 'Open an event to read its time and meeting place.', 'Use the calendar instructions if you want a copy on your phone.'],result:'Published club notices appear in your member calendar.'},
    '#committee/access':{name:'Invite an officer',target:'#club-accounts',steps:['Under Pending invitations, find the office and choose Copy invitation.', 'If the office is missing, choose it under Invite someone new and create a private invitation.', 'Paste the link into a private message to the officer. They open it before the expiry shown and choose their password.'],result:'The officer can sign in with their own club account.'},
    '#members/profile':{name:'My profile and family',target:'#member-profile',steps:['Open the family section to enter a junior catch as a parent or guardian.', 'For a social profile, choose an angler name and a cartoon or photo.', 'Choose whether other members can find you.'],result:'Your family contest choices and your social profile can be managed independently.'},
    '#members/journal':{name:'Save a catch',target:'#journal-title',steps:['Choose your species and catch date.', 'Add a catch photo or open the map and drop a pin.', 'Save the catch. Open it later to update the photo or location.'],result:'The catch goes into your private journal.'},
    '#members/friends':{name:'Share with fishing friends',target:'#member-friends',steps:['Find your mate by their angler name and send a request.', 'Once accepted, choose the friends and how long they can see a photo or story.', 'Open your shared items to review or stop access for each person.'],result:'You control who can open your shared items in the clubhouse.'},
    '#members/catch-map':{name:'Remember a fishing spot',target:'#member-catch-map',steps:['Open the satellite map and choose Full screen for a closer look.', 'Start a pin and tap your spot, or choose your current location.', 'Save it privately. You can find your journal pins on the same map.'],result:'Your fishing spot is saved to your account.'},
    '#members/leaderboard':{name:'Find a target species',target:'#member-leaderboard',steps:['Choose a competition or browse the annual targets.', 'Tap a species photo for its markings and identification guide.', 'Open Enter a catch to submit a brag mat photo for checking. Parents can enter juniors through My profile and family.'],result:'The committee checks entries before a result appears.'},
    '#committee/leaderboard':{name:'Look after club results',target:'#committee-leaderboard',steps:['Open an entry and check its species, evidence and measurement.', 'Review the name the entrant agreed to share before approving.', 'Record monthly honours, competition results or a confirmed sponsor offer.'],result:'Members see confirmed results on the leaderboard.'},
    '#committee/todos':{name:'Start an officer’s to-do list',target:'#officer-todos',steps:['Open your list. A Secretary or Assistant Secretary can choose another officer under Whose list.', 'Open Regular duties and choose one, or use Add a job to write your own. Add a due date if you know it, then choose Add to this list.', 'Choose Print list to hand out a copy. When the sheet comes back, a secretary can record the ticks.'],result:'Each officer can see their jobs online and take a dated copy with them.'},
    '#committee/social':{name:'Plan a club post together',target:'#social-planner-desk',steps:['Choose Browse post ideas for a starting point, or Brainstorm together for a shared session.', 'Give the discussion a question and invite each officer to add an idea. Choose an idea’s title to edit its wording, channels or planned date.', 'When it is ready, share it on the club’s social account. Return to the plan to record the published link.'],result:'The officers can build on one another’s suggestions and keep track of each post.'},
    '#committee/events':{name:'Organise a club event or fundraiser',target:'#fundraising-events',steps:['Choose Start an event, pick the kind of event and give the plan a name.', 'Open the plan. Share out its open jobs, including the coordinator, and use Check the requirements before committing to the event.', 'Choose Print event jobs to hand out a sheet. The Treasurer can use Money to record takings and costs.'],result:'Officers can see who has offered to help, what is still open and how the event’s money was recorded.'},
    '#committee/agm-jobs':{name:'Share out the AGM jobs',target:'#agm-jobs',steps:['Choose Prepare an AGM to enter its date and meeting details.', 'Open AGM jobs to see what is due. Choose I’ll take this for a job you can do.', 'Mark the job done once you have carried it out. The other officers see the same list.'],result:'The committee can see what is due and who has offered to do it.'},
    '#committee/news':{name:'Prepare the club newsletter',target:'#committee-news',steps:['Choose an edition and open your officer contribution.', 'Write your update and choose Send to newsletter. The Secretary or Assistant Secretary can select it for the edition.', 'Check your history to see what was sent. The finished edition appears in the members’ newsletter archive.'],result:'Officers can follow their own contributions from submission through publication.'},
    '#members/news':{name:'Read the club newsletters',target:'#member-news',steps:['Open Newsletters in your member home.', 'Read the newest published edition.', 'Choose an earlier issue in the archive to read it again.'],result:'The club’s published newsletters stay together in your member area.'},
    '#committee/handover':{name:'Hand over a club office',target:'#officer-handover',steps:['Choose the office you want to walk through.', 'Open a job together and show where the officer picks up the work.', 'Use Before handing over to cover any unfinished work.'],result:'The incoming officer can find the tools for their job.'}
  };
  function guideContext(page) {
    const {slug,hash} = parseLocationHash(location.hash);
    const topic = document.querySelector('[data-guide-topic="' + slug + '"]:not([hidden])');
    const heading = (topic ?? document.getElementById('guide-directory'))?.querySelector('h1,h2');
    const steps = GUIDE_STEPS[slug] ?? (slug === 'fish' ? page.steps : ['Choose the topic you want help with.', 'Read one chapter at a time. Guide contents brings you back to the choices.', 'Use the official links for current rules and conditions.']);
    return {...page,route:hash,name:heading?.textContent?.trim() || 'Find your fishing guide topic',steps,
      target:slug === 'fish' ? '#guide-fish-search' : slug === 'trip' ? '#guide-trip-date' : slug === 'brag-mat' ? '#guide-photo-practice' : topic ? '[data-guide-topic="' + slug + '"] h2' : '#guide-directory h1',
      result:slug ? 'You can work through this chapter and use Guide contents to choose the next one.' : 'You can choose a topic and see just that chapter, with a clear way back to the contents.'};
  }

  const helper = document.createElement('button');
  helper.type = 'button';
  helper.className = 'demo-guide-helper';
  helper.id = 'demo-guide-helper';
  helper.dataset.demoAction = 'help';
  helper.innerHTML='<img src="/assets/finnius-guide.webp" width="46" height="46" alt=""><span>Finnius · Page tour</span>';
  const stopButtonMotion=mountFinniusTourButton(helper.querySelector('img'));
  helper.setAttribute('aria-label', 'Finnius, show me around this page');
  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.id = 'back-to-top';
  backToTop.className = 'back-to-top';
  backToTop.textContent = 'Back to top';
  const pageTools = document.createElement('div');
  pageTools.className = 'floating-page-tools';
  pageTools.append(backToTop, helper);
  document.body.append(pageTools);
  created.push(pageTools);

  function updateBackToTop() {
    backToTop.hidden = window.scrollY < 260;
  }
  backToTop.addEventListener('click', () => {
    const heading = document.querySelector('[data-view="guide"]:not([hidden]) [data-guide-topic]:not([hidden]) h2, [data-view="guide"]:not([hidden]) #guide-directory:not([hidden]) h1, [data-view]:not([hidden]) h1') ?? document.getElementById('main');
    heading.setAttribute('tabindex','-1');heading.focus({preventScroll: true});
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top: 0, behavior: reduced ? 'instant' : 'smooth'});
  });
  window.addEventListener('scroll', updateBackToTop, {passive: true});
  window.addEventListener('pageshow', updateBackToTop);
  updateBackToTop();

  for (const page of PAGES) {
    if (['guide','shop','grants'].includes(page.key)) continue;
    const view = page.key==='stock'?document.querySelector('[data-stock-overview]'):page.key==='committee'?document.querySelector('[data-committee-overview]'):document.querySelector(`[data-view="${page.key}"]`);
    if (!view) continue;
    const coach = document.createElement('aside');
    coach.className = `demo-page-coach${page.key === 'home' ? ' demo-home-coach' : ''}`;
    coach.setAttribute('aria-label', `Start here on ${page.name.toLowerCase()}`);
    coach.innerHTML = `<div class="demo-coach-copy"><strong>Finnius the Fishing Mate</strong><p>${page.next}</p><span>${page.limit}</span></div><div class="demo-coach-actions"><button type="button" data-demo-action="page" data-demo-page="${page.key}">Take this page’s tour</button>${page.key === 'home' ? '<button type="button" class="demo-coach-secondary" data-demo-action="start">Take the full tour</button>' : ''}</div>`;
    const subnav = view.querySelector(':scope > .fishing-subnav, :scope > .fishing-tabs, :scope > [data-subnav]');
    if (subnav) subnav.after(coach); else view.prepend(coach);
    created.push(coach);
  }

  function updateHelper() {
    helper.querySelector('span').textContent = resumeStep === null ? 'Finnius · Page tour' : 'Finnius · Continue tour';
    helper.setAttribute('aria-label', resumeStep === null ? 'Finnius, show me around this page' : 'Continue the tour with Finnius');
  }
  function pageChanged(event) {
    updateBackToTop();
    if (!currentTourPage || event.detail.hash === (currentTourPage.route ?? '#' + currentTourPage.key)) return;
    stepVersion++;
    resumeStep = null;
    currentTourPage = null;
    updateHelper();
    if (document.getElementById('info-dialog')?.open && document.querySelector('#dialog-content .demo-tour')) closeDialog();
  }
  window.addEventListener('plfc:navigated', pageChanged);

  async function showStep(index, contextual = false) {
    if (disposed || index < 0 || index >= PAGES.length) return;
    const version = ++stepVersion;
    currentStep = index;
    currentContextual = contextual;
    resumeStep = contextual ? null : index;
    let page=PAGES[index];
    const here=parseLocationHash(location.hash);
    const gated=['members','committee','stock'].includes(here.page)&&
      (!visitor?.authenticated||(here.page==='members'?!['member','committee'].includes(visitor.role):here.page==='stock'?!visitor.canManageStock:visitor.role!=='committee'));
    if(contextual && page.key==='guide')page=guideContext(page);
    if(contextual && page.key==='stock' && location.hash===reportGuide.route)page=reportGuide;
    if(contextual){
      const officer=getOfficerTour(visitor,here.hash);
      const guide=officer||privateGuides[here.hash]||extraPageGuide(here.hash);
      page={...page,...guide,route:here.hash,links:officer?.links||finniusPageLinks(here.hash)};
      if(here.hash==='#members'&&!gated)Object.assign(page,{name:'Your member home',steps:['Keep a catch or a spot in your private journal.','Browse target fish and contests on the leaderboard.','Open My profile and family for a junior entry.']});
      if(gated)Object.assign(page,{name:here.page==='members'?'Opening member home':'Opening an officer desk',target:'#club-access',links:[],steps:visitor?.authenticated?
        ['Check the access message on this page.','For an expired membership, visit Member home to review your renewal and download options.','Contact the Secretary if the account needs updating.']:
        ['Already registered? Enter your club username and password.','On a first visit, open the private setup link the club gave you.','Choose Ask the Webmaster on the sign-in page for a fresh link. The Secretary receives a private copy.']});
      else if(here.hash==='#members/meals' && visitor?.administrator) {
        Object.assign(page,{name:'Shared meals for the Webmaster',target:'#member-meals',links:[],
          steps:['Open an invitation to see the time, general area, menu and BYO.','Choose Plan the meal as host to try a home dinner or a public barbecue.','Choose Reply as a guest to offer a side dish or pick a job. Your example stays on this screen.']});
      }
      else if(here.hash==='#members/meals' && !document.querySelector('#member-meals plfc-page-tour')) {
        Object.assign(page,{name:'Opening shared meals',target:'#member-meals',links:[],
          steps:['Open Shared meals with your personal member login.', 'Read the access message for your account. My access and safety lists your age and sharing permissions.']});
      }
    }
    currentTourPage = page;
    updateHelper();
    const route=page.route ?? '#' + page.key;
    const alreadyHere=contextual && location.hash===route;
    if ((!alreadyHere && !await navigatePage(route)) || disposed || version !== stepVersion) return;
    const choices=(page.links||[]).filter(link=>!link.href.startsWith('@')||availableFocusTarget(link.href.slice(1)));
    stopFinnius();
    const links=choices.map(({label,href})=>href.startsWith('@')?'<button type="button" data-demo-action="focus" data-focus="'+escape(href.slice(1))+'">'+escape(label)+'</button>':'<a href="'+escape(href)+'">'+escape(label)+'</a>').join('');
    showDialog(page.name,`<div class="demo-tour finnius-tour"><div class="finnius-tour-intro"><div data-finnius-tour></div><div><p class="demo-tour-progress">Finnius the Fishing Mate · ${contextual?'Page tour':(index+1)+' of '+PAGES.length}</p><ol>${page.steps.map(step=>'<li>'+escape(step)+'</li>').join('')}</ol></div></div>${links?'<nav class="finnius-tour-links" aria-label="Open a page option">'+links+'</nav>':''}<div class="demo-tour-buttons">${!links?'<button type="button" class="demo-tour-try" data-demo-action="try">Show me where</button>':''}${contextual?'<button type="button" data-demo-action="explore">Close guide</button>':`<button type="button" data-demo-action="back" ${index===0?'disabled':''}>Back</button><button type="button" data-demo-action="next">${index===PAGES.length-1?'Finish tour':'Next'}</button>`}</div></div>`);
    stopMotion=mountTourFinnius(document.querySelector('[data-finnius-tour]'));
  }

  function finish() {
    stepVersion++;
    resumeStep = null;
    updateHelper();
    closeDialog();
  }

  function click(event) {
    const button = event.target.closest?.('[data-demo-action]');
    if (!button || disposed) return;
    const action = button.dataset.demoAction;
    if (action === 'start') showStep(0);
    if (action === 'page') showStep(PAGES.findIndex(page => page.key === button.dataset.demoPage), true);
    if (action === 'help') showStep(resumeStep ?? Math.max(0, currentPage()), resumeStep === null);
    if (action === 'back') showStep(currentStep - 1);
    if (action === 'next') {
      if (currentStep === PAGES.length - 1) finish(); else showStep(currentStep + 1);
    }
    if (action === 'explore') finish();
    if(action==='focus'){
      const target=availableFocusTarget(button.dataset.focus);
      if(!target)return;
      finish();
      focusTourTarget(target);
    }
    if (action === 'try') {
      const page = currentTourPage;
      if (!page) return;
      stepVersion++;
      resumeStep = !currentContextual && currentStep < PAGES.length - 1 ? currentStep + 1 : null;
      updateHelper();
      closeDialog();
      const target = document.querySelector(page.target) || document.querySelector(`[data-view="${page.key}"] .demo-page-coach`);
      if (target) focusTourTarget(target, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
    }
  }
  document.addEventListener('click', click);

  // The welcome never navigates or changes a form. A visitor chooses whether
  // to start the tour, and can always bring it back with the persistent help.
  let welcomeTimer;
  try {
    if (!sessionStorage.getItem('plfc-demo-welcome-v1')) {
      welcomeTimer = setTimeout(() => {
        if (disposed || document.getElementById('info-dialog')?.open) return;
        const destination=parseLocationHash(location.hash);
        if (['members','committee','stock','shop','sponsors','guide'].includes(destination.page)) return;
        sessionStorage.setItem('plfc-demo-welcome-v1', 'shown');
        showDialog('Welcome. Let’s take it one step at a time.', '<div class="demo-tour"><p><strong>Demo only. Not complete or available for club use yet.</strong></p><p>Explore with sample information. This preview shows how the club could work, and explains what each step does.</p><p>The tour will not fill in forms, save records, turn on your microphone or activate connections.</p><div class="demo-tour-buttons"><button type="button" class="demo-tour-try" data-demo-action="start">Take the tour</button><button type="button" data-demo-action="explore">Let me explore</button></div><p class="demo-tour-footnote">Look for Finnius on any main page when you want a hand.</p></div>');
      }, 300);
    }
  } catch { /* Help remains available when browser session storage is blocked. */ }

  disposeGuide = () => {
    stopButtonMotion();
    disposed = true;
    stepVersion++;
    clearTimeout(welcomeTimer);
    window.removeEventListener('scroll', updateBackToTop);
    window.removeEventListener('pageshow', updateBackToTop);
    window.removeEventListener('plfc:navigated', pageChanged);
    window.removeEventListener('plfc:session-changed',sessionChanged);
    document.getElementById('info-dialog')?.removeEventListener('close',stopFinnius);
    stopFinnius();
    document.removeEventListener('click', click);
    created.forEach(element => element.remove());
    disposeGuide = null;
  };
  return disposeGuide;
}
