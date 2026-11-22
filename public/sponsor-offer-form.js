const offerTypes = {
  gift: 'Give a prize or item', clubSale: 'Give products for the club shop', loan: 'Lend gear to return', share: 'Share space or equipment',
  service: 'Offer time or a skill', funding: 'Contribute funds', other: 'Something else'
};
const participation = {
  observer: 'Come along as an observer', volunteer: 'Help on the day', workshop: 'Lead a tutorial or workshop', stand: 'Ask for a stand',
  speaker: 'Ask to say a few words', none: 'No role on the day', other: 'Another idea'
};
export const sponsorTypeLabels = offerTypes;
export const participationLabels = participation;
export const liquorInfo = 'https://www.business.qld.gov.au/industries/hospitality-tourism-sport/liquor-gaming/liquor/licensing/licences-permits/community-liquor-permits';
const raffleAgeRule = 'https://www.legislation.qld.gov.au/view/html/inforce/current/act-1999-026#sec.110';
const exampleGroups = [
  {id:'fishing-tours',title:'Fishing charters and guided sessions',icon:'🛥️',preview:'Give a charter seat as a prize or take a group fishing at a club meet',items:[
    {id:'charter-voucher',title:'A fishing charter voucher for a winner',detail:'Offer seats on a booked fishing charter. The winner arranges the trip with your business.',
      offer:'A voucher for seats on one of our guided fishing charters. I will confirm seat numbers, junior ages and adult supervision, whether tackle and bait are included, departure point, expiry and excluded dates.',
      eventName:'Local fishing meet prize draw',requestedReturn:'Please give the winner our booking details and the weather rebooking terms we agree before the draw.'},
    {id:'guided-fishing-session',title:'Lead a guided fishing session at a club meet',detail:'A local fishing guide or skipper takes a small group shore fishing during the event.',
      offerTypes:['service'],participation:['workshop'],offer:'I can lead a guided shore-fishing session at a club meet. I will confirm the date, meeting point, duration, group size, junior ages and supervision, and which tackle and bait I can supply.',
      eventName:'Local club fishing meet',requestedReturn:'Please agree how people book a place, cap sign-ups at our group limit and confirm the bad-weather plan with me.',
      participationNote:'I will be there to lead the group. Please nominate a club contact for bookings and changes on the day.'}
  ]},
  {title:'Local art and handmade goods', icon:'🎨', preview:'Raffle artwork, a class voucher or goods for the shop', items:[
    {id:'artist-raffle',title:'An artist’s work for the raffle',detail:'An original, signed print or piece of pottery. The artist chooses how to be credited.',participation:[],offer:'One piece of my work for the raffle. I will confirm the artwork, packaging and collection.',eventName:'Club fundraising raffle',requestedReturn:'Please agree the artist credit with me. Ask separately before using a photo of the work in posters or social posts.',participationNote:'I am happy to discuss attending the draw.'},
    {id:'artist-class',title:'A creative class voucher',detail:'Give a place in a pottery or printmaking class as the prize.',offer:'A voucher for one place in a creative class. I will confirm dates, expiry, minimum age and whether materials are included.',eventName:'Club prize draw',requestedReturn:'Please give the winner my booking instructions.'},
    {id:'maker-products',title:'Locally made goods for the club shop',detail:'Gift handmade products that the club can sell to raise funds.',offerTypes:['clubSale'],offer:'A small batch of locally made goods for the club shop to sell. I will confirm the items and quantities.',eventName:'Club shop fundraiser',requestedReturn:'Please use the maker credit we agree when displaying the goods.'}
  ]},
  {title:'Fishing prizes and vouchers', icon:'🎣', preview:'Beginner tackle, team merchandise or a shop voucher', items:[
    {id:'tackle-pack',title:'A beginner’s tackle pack',detail:'Give a junior angler a tackle pack at a local meet.',offer:'One beginner tackle pack for the junior prize.',eventName:'Local family fishing meet',requestedReturn:'A thank-you at the presentation would be welcome.'},
    {id:'merch-prizes',title:'Shirts, caps or brag mats as prizes',detail:'Set aside merchandise for the winners and let them choose a size.',offer:'A choice of club-day merchandise for the prize winners. I will confirm quantities, available sizes and collection.',eventName:'Local fishing invitational',requestedReturn:'Please contact me about sizes before allocating the prizes.'},
    {id:'local-voucher',title:'A local shop or café voucher',detail:'Give a winner a credit to spend locally.',offer:'A voucher to spend at our business. I will confirm its value, expiry and how to redeem it.',eventName:'Club raffle',requestedReturn:'Please pass the voucher conditions to the winner.'}
  ]},
  {title:'Island stays and outings', icon:'⛺', preview:'Accommodation, camping passes, ferry travel or a guided outing', items:[
    {id:'island-stay',title:'An island accommodation package',detail:'Offer a stay and make the booking dates clear before tickets go on sale.',offer:'An island accommodation voucher. I will confirm the number of nights and guests, expiry, excluded dates and booking contact.',eventName:'Club fundraising raffle',requestedReturn:'Please print the agreed booking conditions with the prize.'},
    {id:'camping-pass',title:'A family camping pass',detail:'Specify the campsite, number of people, excluded dates and what is included.',offer:'A camping voucher for a family. I will confirm the site, nights, capacity, expiry, booking process and any separate vehicle or access fees.',eventName:'Family fishing weekend',requestedReturn:'Please have the winner book with us before travelling.'},
    {id:'ferry-travel',title:'Ferry travel for a winner',detail:'Offer a return trip and specify whether it covers passengers or a vehicle.',offer:'A return ferry travel voucher. I will confirm the passenger or vehicle allowance, valid dates and reservation conditions.',eventName:'Interclub invitational prize draw',requestedReturn:'Please pass our booking instructions to the winner.'},
    {id:'island-experience',title:'A guided island experience',detail:'Donate places on a guided nature walk or other local outing.',offer:'Places on a guided island outing. I will confirm numbers, ages, meeting point, access needs and the wet-weather arrangement.',eventName:'Family fishing day prize draw',requestedReturn:'Please let the winner book a suitable date directly.'}
  ]},
  {title:'Raffles, barbecues and drinks', icon:'🧺', preview:'Meat packs, barbecue supplies and separate family or adult prizes', items:[
    {id:'meat-raffle',title:'A meat pack for the raffle',detail:'The winner collects the chilled pack from the supplier.',offer:'A meat pack for a raffle winner to collect chilled. I will confirm its value, contents, collection window and cold-storage arrangements.',eventName:'Club meat raffle',requestedReturn:'Please agree a collection time with the winner and keep their details private.'},
    {id:'bbq-food',title:'Food for the fundraiser barbecue',detail:'Supply sausages, rolls or a vegetarian option for the volunteer cooks.',offer:'Food for the fundraiser barbecue. I will confirm servings, ingredients and allergens, chilled collection, and the handover time.',eventName:'Community fundraising barbecue',requestedReturn:'Please confirm expected numbers with me before collection.'},
    {id:'family-drinks',title:'A family soft-drinks prize',detail:'Offer an alcohol-free hamper of juices, sparkling water or soft drinks.',offer:'An entirely alcohol-free drinks hamper for a family prize.',eventName:'Family fishing meet',requestedReturn:'Please arrange pickup with me before the day.'},
    {id:'adult-drinks',title:'An adults-only drinks prize',detail:'If a raffle includes alcohol among its prizes, everyone who enters or buys tickets for that draw must be 18 or over.',offer:'An alcohol-containing drinks prize for a separate adults-only raffle, subject to organiser and venue approval. I will confirm contents, value and collection arrangements.',eventName:'Adults-only fundraising raffle',requestedReturn:'Please confirm the adult-only arrangements with me before advertising the raffle.',alcoholSupplyProposed:true}
  ]},
  {title:'People, gear and activities', icon:'🤝', preview:'A workshop, loan gear, lend a hand or ask for time on the day', items:[
    {id:'hands-on-workshop',title:'Lead a hands-on workshop',detail:'Run a beginner knot-tying tutorial, printmaking session or other short activity.',offerTypes:['service'],participation:['workshop'],offer:'I can lead a short, hands-on workshop at the club event. I will confirm the skill, ages, group size and materials.',eventName:'Community club day',requestedReturn:'Please agree a session time and a suitable workspace with me.',participationNote:'I would like to lead the activity and help beginners have a go.'},
    {id:'brewery-gear',title:'A marquee and eskies on loan',detail:'A local brewery could lend gear and ask about an adult-area stand.',offerTypes:['loan'],participation:['stand'],offer:'A loan of a marquee and two eskies for the day.',eventName:'Local club meet',requestedReturn:'Please return each item after pack-down.',participationNote:'Could we have a stand in the adult area?',adultAreaRequested:true},
    {id:'volunteer-shift',title:'Give a volunteer shift',detail:'Help set up, cook or pack down at a local barbecue.',offerTypes:['service'],participation:['volunteer'],offer:'Two hours to help set up and run the barbecue.',eventName:'Community fundraising barbecue',requestedReturn:'Please confirm the shift time and who to meet.'},
    {id:'observer',title:'Come along as an observer',detail:'Share equipment and ask to see the event in action.',offerTypes:['share'],participation:['observer'],offer:'Use of an event table.',eventName:'Local club meet',participationNote:'I would like to attend as an observer.'},
    {id:'speaker',title:'Ask for a two-minute speaking spot',detail:'Give a prize and ask for a short slot at the presentation.',participation:['speaker'],offer:'A prize for the club presentation.',eventName:'Club presentation',participationNote:'Could I speak for two minutes at the presentation?'}
  ]}
];
const examples = new Map(exampleGroups.flatMap(group=>group.items.map(item=>[item.id,item])));
const exampleFields = ['offerTypes','participation','offer','eventName','requestedReturn','participationNote','adultAreaRequested','alcoholSupplyProposed'];
const signature = draft => JSON.stringify(exampleFields.map(k=>Array.isArray(draft[k])?[...draft[k]].sort():draft[k]));
const consentText = 'I agree that the Point Lookout Fishing Club committee may store this offer and use my contact details to discuss it with me.';
const blank = () => ({
  requestId:crypto.randomUUID(),organisation:'',contactName:'',email:'',phone:'',offerTypes:[],offer:'',
  requestedReturn:'',eventName:'',participation:[],participationNote:'',adultAreaRequested:false,alcoholSupplyProposed:false,consent:false
});

export function publicSponsorRoom(host, {api,esc}, signal) {
  let draft = null, step = 0, sending = false, baseline = '', pendingExample = null, currentExample = null;
  host.innerHTML = '<header class="sponsor-hero"><div><h1>Sponsor a club day</h1><p>Take a group fishing, offer a prize or lend some shade. Tell the club what you can offer and what you would like in return.</p><button class="button" type="button" data-start-offer>Make an offer</button></div><img src="/assets/point-lookout.jpg" alt="A sheltered beach at Point Lookout"></header>' +
    '<section class="sponsor-examples" aria-labelledby="sponsor-ideas-heading"><h2 id="sponsor-ideas-heading">Sponsorship ideas</h2><p>Choose Make an offer to write your own, or open a group below for examples you can edit.</p><div class="sponsor-example-groups">' +
    exampleGroups.map(group=>'<details class="sponsor-example-group" name="plfc-sponsor-idea-group"'+(group.id?' data-sponsor-group="'+group.id+'"':'')+'><summary><span class="sponsor-idea-icon" aria-hidden="true">'+group.icon+'</span><span><strong>'+esc(group.title)+'</strong><small>'+esc(group.preview)+'</small></span></summary><div class="sponsor-example-cards">'+
      group.items.map(x=>'<article><h3>'+esc(x.title)+'</h3><p>'+esc(x.detail)+'</p>'+(x.alcoholSupplyProposed?'<a href="'+raffleAgeRule+'" target="_blank" rel="noopener">Queensland raffle age rule</a>':'')+
      '<button class="text-link" type="button" data-example="'+x.id+'">Use this example<span class="sponsor-sr">, '+esc(x.title)+'</span></button></article>').join('')+
    '</div></details>').join('')+'</div></section><div data-offer-form></div>';
  const area=host.querySelector('[data-offer-form]');
  if(new URLSearchParams(location.search).get('sponsor')==='fishing-tours'){
    const group=host.querySelector('[data-sponsor-group="fishing-tours"]');
    group.open=true;
    requestAnimationFrame(()=>{
      if(signal.aborted || document.querySelector('dialog[open]'))return;
      const summary=group.querySelector('summary');
      summary.focus({preventScroll:true});
      summary.scrollIntoView({block:'center'});
    });
  }
  const choice = (name,key,label,checked) => '<label class="sponsor-check"><input type="checkbox" name="'+name+'" value="'+key+'"'+(checked?' checked':'')+'><span>'+label+'</span></label>';
  const choices = (name,items) => '<div class="sponsor-choices">'+Object.entries(items).map(([key,label])=>choice(name,key,label,draft[name].includes(key))).join('')+'</div>';
  const input = (key,label,limit,type='text',required=false) => '<label>'+label+'<input name="'+key+'" type="'+type+'" maxlength="'+limit+'" value="'+esc(draft[key])+'"'+(required?' required':'')+'></label>';
  const long = (key,label,limit,required=false) => '<label>'+label+'<textarea name="'+key+'" maxlength="'+limit+'" rows="3"'+(required?' required':'')+'>'+esc(draft[key])+'</textarea></label>';
  function first() {
    return '<fieldset><legend>How would you like to help?</legend><small>Choose one or more.</small>'+choices('offerTypes',offerTypes)+'</fieldset>'+
      long('offer','What can you offer?',1500,true)+input('eventName','Which event or club activity? (optional)',140);
  }
  function second() {
    return long('requestedReturn','What would you like in return? (optional)',900)+
      '<small>A thank-you, a mention in the newsletter, or a time to collect loaned gear are all things you can ask for.</small>'+
      '<fieldset><legend>Would you like a role on the day?</legend>'+choices('participation',participation)+'</fieldset>'+
      long('participationNote','Details for the organiser (optional)',600)+
      '<details class="sponsor-beverage"'+(draft.adultAreaRequested||draft.alcoholSupplyProposed?' open':'')+'><summary>Adult-area stands or alcohol supply</summary>'+
      '<p>A brewery or other business can offer equipment on its own. Tick the requests you would like the committee to consider.</p>'+
      choice('adultAreaRequested','yes','I would like to discuss a stand in an adult area.',draft.adultAreaRequested)+
      choice('alcoholSupplyProposed','yes','I propose supplying alcohol as a prize or serving it at an event.',draft.alcoholSupplyProposed)+
      '<div data-supply-info'+(draft.alcoholSupplyProposed?'':' hidden')+'><p>If liquor is a raffle prize, under-18s cannot enter or buy tickets for that entire draw. <a target="_blank" rel="noopener" href="'+raffleAgeRule+'">Queensland raffle age rule</a></p>'+
      '<p>The organiser and venue will check the licence, any exemption or permit, and arrangements for adults. <a target="_blank" rel="noopener" href="'+liquorInfo+'">Queensland community liquor permits</a></p></div></details>';
  }
  function third() {
    const selected=draft.participation.map(k=>participation[k]).join(', ');
    return '<details class="sponsor-recap"><summary>Review your offer</summary><dl><dt>What you can offer</dt><dd>'+esc(draft.offer)+'</dd>'+
      (draft.eventName?'<dt>Event or activity</dt><dd>'+esc(draft.eventName)+'</dd>':'')+
      (draft.requestedReturn?'<dt>What you requested in return</dt><dd>'+esc(draft.requestedReturn)+'</dd>':'')+
      (selected?'<dt>On the day</dt><dd>'+esc(selected)+'</dd>':'')+
      (draft.participationNote?'<dt>For the organiser</dt><dd>'+esc(draft.participationNote)+'</dd>':'')+
      (draft.adultAreaRequested?'<dt>Stand</dt><dd>Adult area requested</dd>':'')+
      (draft.alcoholSupplyProposed?'<dt>Alcohol</dt><dd>Supply or service proposed</dd>':'')+'</dl></details>'+
      input('contactName','Your name',100,'text',true)+input('organisation','Business or group (optional)',120)+
      '<fieldset><legend>How can the committee reach you?</legend><p>Give your email, phone number or both. Use details you have permission to share.</p>'+
      input('email','Email',150,'email')+input('phone','Phone',25,'tel')+'</fieldset>'+
      '<p>Only the committee can read your contact details. A committee member will need to discuss the arrangements with you before agreeing to anything.</p>'+
      choice('consent','yes',consentText,draft.consent);
  }
  function render() {
    const titles=['Your offer','What would you like back?','Committee follow-up'];
    area.innerHTML='<form class="sponsor-form"><p class="sponsor-step">Step '+(step+1)+' of 3</p><h2 tabindex="-1">'+titles[step]+'</h2>'+
      [first,second,third][step]()+'<p class="sponsor-status" role="status" data-offer-status></p><div class="sponsor-actions">'+
      '<button class="button" type="submit">'+(step===2?'Send offer to committee':'Continue')+'</button>'+
      (step?'<button class="text-link" type="button" data-step-back>Back</button>':'')+
      '<button class="text-link" type="button" data-cancel-offer>Close form</button></div></form>';
    area.querySelector('h2').focus();
  }
  function readFields(form) {
    const values=new FormData(form);
    for(const key of ['offer','eventName','requestedReturn','participationNote','contactName','organisation','email','phone']){
      if(form.elements.namedItem(key))draft[key]=String(values.get(key)||'').trim();
    }
    if(step===0)draft.offerTypes=values.getAll('offerTypes');
    if(step===1){
      draft.participation=values.getAll('participation');
      draft.adultAreaRequested=values.has('adultAreaRequested');draft.alcoholSupplyProposed=values.has('alcoholSupplyProposed');
    }
    if(step===2)draft.consent=values.has('consent');
  }
  function start(preset,replace=false) {
    area.hidden=false;
    if(draft && !preset){area.querySelector('h2')?.focus();return;}
    const form=area.querySelector('form');
    if(draft&&form)readFields(form);
    if(preset&&draft&&!replace&&signature(draft)!==baseline){
      pendingExample=preset;
      area.querySelector('[data-replace-choice]')?.remove();
      area.insertAdjacentHTML('afterbegin','<div class="sponsor-replace" data-replace-choice><h3 tabindex="-1">Use “'+esc(preset.title)+'” instead?</h3><p>This will replace your offer details. Your contact details stay in the form.</p><button type="button" class="button outline small" data-confirm-example>Replace offer details</button> <button type="button" class="text-link" data-keep-example>Keep my offer</button></div>');
      area.querySelector('[data-replace-choice] h3').focus();return;
    }
    const previous=draft;draft=blank();
    if(previous)for(const key of ['requestId','organisation','contactName','email','phone'])draft[key]=previous[key];
    currentExample=preset||null;pendingExample=null;
    if(preset){
      draft.offerTypes=['gift'];draft.participation=['none'];
      for(const k of exampleFields)if(k in preset)draft[k]=structuredClone(preset[k]);
    }
    baseline=signature(draft);
    host.querySelectorAll('.sponsor-example-group[open]').forEach(group=>group.open=false);
    step=0;render();
  }
  host.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||sending)return;
    if(b.hasAttribute('data-start-offer'))start();
    if(b.hasAttribute('data-example'))start(examples.get(b.dataset.example));
    if(b.hasAttribute('data-confirm-example')&&pendingExample)start(pendingExample,true);
    if(b.hasAttribute('data-keep-example')){pendingExample=null;area.querySelector('[data-replace-choice]')?.remove();area.querySelector('form h2')?.focus();}
    if(b.hasAttribute('data-step-back')){readFields(b.form);step--;render();}
    if(b.hasAttribute('data-cancel-offer')){
      readFields(b.form);area.hidden=true;const resume=host.querySelector('[data-start-offer]');
      resume.textContent='Continue my offer';resume.focus();
    }
  },{signal});
  host.addEventListener('change',event=>{
    const el=event.target,form=el.form;if(!form||!draft)return;
    if(el.name==='alcoholSupplyProposed')form.querySelector('[data-supply-info]').hidden=!el.checked;
    if(el.name==='adultAreaRequested'&&el.checked){
      form.querySelector('[name=participation][value=stand]').checked=true;
      form.querySelector('[name=participation][value=none]').checked=false;
    }
    if(el.name==='participation'&&((el.value==='none'&&el.checked)||(el.value==='stand'&&!el.checked))){
      form.elements.adultAreaRequested.checked=false;
      if(currentExample?.participationNote===form.elements.participationNote.value&&
          (el.value==='none'||currentExample?.participation?.includes('stand')))form.elements.participationNote.value='';
    }
    if(el.name==='participation'&&el.checked){
      if(el.value==='none')form.querySelectorAll('[name=participation]:not([value=none])').forEach(box=>box.checked=false);
      else form.querySelector('[name=participation][value=none]').checked=false;
    }
  },{signal});
  host.addEventListener('submit',async event=>{
    const form=event.target;if(!form.classList.contains('sponsor-form'))return;
    event.preventDefault();if(sending)return;
    readFields(form);
    const status=form.querySelector('[data-offer-status]');
    const warn=(msg,selector)=>{status.textContent=msg;form.querySelector(selector)?.focus();};
    if(!step&&!draft.offerTypes.length){warn('Choose at least one way you can help.','[name=offerTypes]');return;}
    if(!step&&!draft.offer){warn('Describe what you can offer.','[name=offer]');return;}
    if(step<2){step++;render();return;}
    if(!draft.contactName){warn('Enter your name so the committee knows who to contact.','[name=contactName]');return;}
    if(!draft.email&&!draft.phone){warn('Enter an email address or a phone number.','[name=email]');return;}
    if(!draft.consent){warn('Please confirm the club may store this offer and contact you about it.','[name=consent]');return;}
    sending=true;form.inert=true;status.textContent='Sending the offer…';
    try{
      await api('/api/sponsor-offers',{method:'POST',body:JSON.stringify(draft),signal});
      if(signal.aborted)return;
      draft=null;host.querySelector('[data-start-offer]').textContent='Make another offer';
      area.innerHTML='<section class="sponsor-received"><h2 tabindex="-1">Offer received</h2><p>Your offer is in the committee’s private sponsorship desk. Any prize, loan, stand or speaking time still needs agreement with the club.</p></section>';
      area.querySelector('h2').focus();
    }catch(error){if(!signal.aborted)status.textContent=error.message;}
    finally{if(!signal.aborted){sending=false;form.inert=false;}}
  },{signal});
}
