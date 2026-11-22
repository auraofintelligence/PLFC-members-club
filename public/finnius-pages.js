// Each shortcut opens a page or focuses an existing control. Tours never submit a form.
const routes={
  '#home':[['Plan a fishing day','#fishing'],['Find a club date','#events'],['Explore member home','#members']],
  '#fishing':[['Choose my day','@#fishing-controls'],['Identify a fish','#guide/fish'],['Open the trip brief','#guide/trip']],
  '#events':[['Find the next meet','@#events-list'],['Open member calendar','#members/calendar']],
  '#guide':[['Identify a fish','#guide/fish'],['Gather bait','#guide/bait-gathering'],['Go crabbing','#guide/crabbing'],['Choose a rig','#guide/rig'],['Tie a knot','#guide/knots'],['Spearfishing','#guide/spearfishing'],['Look after the catch','#guide/catch-care'],['Help injured wildlife','#guide/wildlife']],
  '#guide/bait-gathering':[['Show me nets','#guide/bait-nets'],['Identify my baitfish','#guide/baitfish'],['Look up my zone','#guide/zones']],
  '#guide/crabbing': [
    ['Set a baited pot', '@#guide-crabbing .crab-method:first-of-type > summary'],
    ['Lift an open hoop net', '@#guide-crabbing .crab-method:last-of-type > summary'],
    ['Compare crab photos', '@#guide-crabbing .water-gear-grid'],
    ['See how to measure a crab', '@#guide-crabbing .water-crab-size-heading h3'],
    ['Look up Moreton Bay bugs', '#guide/moreton-bay-bugs'],
  ],
  '#guide/moreton-bay-bugs': [
    ['Identify a bug from its photo', '@#guide-moreton-bay-bugs figure'],
    ['Find out how bugs are caught', '@#guide-moreton-bay-bugs .catch-rule h3'],
    ['Check size and bag limits', '@#guide-moreton-bay-bugs details:has(a[href*="limits-tidal"]) > summary'],
    ['Try crabbing from shore', '#guide/crabbing'],
  ],
  '#guide/spearfishing': [
    ['Choose the waters to check', '@#guide-spearfishing [data-dive-site]'],
    ['Find jetty and swimming area distances', '@#guide-spearfishing .spear-clearance h3'],
    ['Compare fish photos', '@#guide-spearfishing .spear-identify h3'],
  ],
  '#guide/catch-care': [
    ['Release a fish', '#guide/care'],
    ['Keep a fish for dinner', '#guide/kitchen'],
    ['See the brag mat photo example', '#guide/brag-mat'],
  ],
  '#guide/kitchen': [
    ['Check fridge life','@#guide-kitchen .kitchen-cold h3'],
    ['Choose a cooking method','@#kitchen-choices button'],
    ['Find the freezer guide','@#kitchen-choices [data-kitchen-go="freezer"]'],
    ['Check the rules before cutting','@#kitchen-legal'],
  ],
  '#guide/rig': [
    ['Choose the fish', '@#guide-rig [data-rw-species]'],
    ['Check trace, hook and bait', '@#guide-rig .rw-specs h4'],
    ['Go to the assembly steps', '@#guide-rig .rw-process h4'],
    ['See when to adjust', '@#guide-rig .rw-adjust h4'],
  ],
  '#guide/knots': [
    ['Choose what to tie', '@#guide-knots [data-knot-task]'],
    ['See the knot contest results', '@#guide-knots .kg-results > summary'],
    ['Find a knot by its moves', '@#guide-knots .kg-recall > summary'],
    ['Go to the tying steps', '@#guide-knots .kg-step h4'],
    ['Check the finished knot', '@#guide-knots .kg-check h4'],
  ],
  '#committee/notices':[['Open officer to-do lists','#committee/todos'],['Back to the committee room','#committee']],
  '#members':[['Record a catch','#members/journal'],['Open the catch map','#members/catch-map'],['Find a contest','#members/leaderboard'],['Share a meal','#members/meals']],
  '#members/meals': [
    ['Host a meal', '@#member-meals [data-action="create"]'],
    ['Find my invitations', '@#member-meals [data-meal-section="invitations"]'],
    ['See open invitations', '@#member-meals [data-meal-section="open"]'],
    ['Find the recipe book', '@#member-meals [data-meal-recipes]'],
    ['Choose who can come', '@#member-meals .meal-create [name="visibility"]'],
    ['Write the menu', '@#member-meals .meal-create [name="menu"]'],
    ['Choose BYO and jobs', '@#member-meals .meal-create .meal-edit > summary'],
  ],
  '#members/journal':[['Add a photo','@#catch-form [data-journal-file]'],['Choose a fishing spot','@#catch-form [data-open-map]'],['Open my catch map','#members/catch-map']],
  '#members/catch-map':[['Open the map','@#member-catch-map [data-saved-map]'],['Record a catch','#members/journal']],
  '#members/leaderboard':[['Find a target species','@#member-leaderboard [data-find-target]'],['See junior results','@#junior-results'],['Enter a junior from my profile','#members/profile']],
  '#members/profile':[['Open family contests','@#family-junior-desk summary'],['Choose my angler picture','@#member-profile'],['Open my catch journal','#members/journal']],
  '#members/safety':[['Download my photos and records','/my-club-download.html'],['Review sharing with friends','#members/friends']],
  '#shop':[['Browse the shop','@[data-merch-range]'],['Offer a guided fishing trip','/?sponsor=fishing-tours#sponsors']],
};

const extraGuides={
  '#committee/grants':['Club grant register','#committee-grant-register','Open Find funding and choose a round. Look under Equipment wishes for gear the club already needs.','Link a wish or draft one from an idea the funder could support. Choose an officer and a next step.','Record the funder’s decision here. The treasurer records money received on the wish.'],
  '#committee/notices':['Committee notices','#committee-notices','New means you have a notice to read. Each officer keeps their own read marks.','Post an update for the committee. Give it a review date, or choose an officer and a due date for a job.','Open the officer’s to-do list to finish a job or print it for the next meeting.'],
  '#committee/equipment':['Club assets and loans','#club-equipment','Check who has each item and when it is due back.','Open an equipment wish to see possible grants and who is following up a linked grant.','Publish the wish when members can help. Their progress chart shows money the treasurer has recorded.'],
  '#committee/sponsors':['Sponsors and supporters','#sponsor-desk','Open a private offer or record an introduction.','Compare what the supporter offers with what they want in return.','Choose someone to follow up and record what was agreed.'],
  '#members/equipment-wishes':['Equipment wish list','#member-equipment-wishes','Choose an item the club is fundraising for.','Open the progress details to see the amounts recorded so far.','Check the target or see if the club is looking for donated equipment.'],
  '#members/meals':['Share a meal','#member-meals','See who is hosting a meal or choose to host one yourself.','Read the menu and BYO notes, then reply to the invitation.','Offer a side dish, music or another job so everyone knows what is covered.'],
  '#members/recipes':['Share your recipes','#member-recipes','Browse dishes from club members.','Add ingredients, the method and up to four photos.','Use your own recipe card to edit or remove it.'],
  '#members/safety':['Manage my privacy','#member-safeguards','Check which member tools you can use.','Download a copy of your contributions and photos when you want one.','Review your agreement and sharing choices.'],
  '#members/notices':['My club notices','#member-notice-inbox','Read the updates the club has sent to you.','Choose Mark as read after you have seen a message.','You can choose which invitations and newsletters you receive under My membership.'],
  '#members/minutes':['Read club minutes','#shared-minutes','Choose an approved meeting record.','Open the member copy to read the decisions.','Use Minutes & documents to find other club papers.'],
  '#members/conversation':['Join the conversation','#member-conversation','Read the latest club yarns.','Choose whether to share a message or photo.','Check the audience before you post.'],
  '#members/membership':['My membership','#member-benefits','Check when your current membership runs through.','Review your benefits and birthday preferences.','Open a welcome-back offer here if the club has approved one for you.'],
  '#members/help-out':['Help at a club event','#member-handoffs','Find a way to help that fits your time.','Read what you are agreeing to share.','Review your volunteer choices here later.'],
  '#committee/meetings':['Run a meeting','#meeting-desk','Choose the meeting and review its agenda.','Record attendance, decisions and who agreed to each job.','Check the draft minutes before publishing a member copy.'],
  '#committee/applications':['Review membership applications','#committee-applications','Choose an application and check its details.','Record the decision and any follow-up.','The Treasurer handles payment or a welcome-back fee waiver.'],
  '#committee/automations':['Membership reminders','#committee-automations','Review the membership jobs that are due.','Check the intended recipients and their contact choices.','Record completed work so another officer can pick up the next step.'],
  '#committee/ready-setco':['Review a Ready SETCO handover','#committee-handoffs','Check the specific job and the committee decision.','Read what information the person agreed to share.','Record the approval or keep the work with the club.'],
  '#committee/documents':['Find a committee paper','#committee-documents','Open the committee documents.','Choose the paper you need.','Check which edition has been approved for members.'],
};
export function finniusPageLinks(hash = ''){
  const route = hash.split('?')[0];
  return (routes[route]||[]).map(([label,href])=>({label,href}));
}
export function extraPageGuide(hash){
  const data=extraGuides[hash];
  if(!data)return null;
  const [name,target,...steps]=data;
  return {name,target,steps};
}
