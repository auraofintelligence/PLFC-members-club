import {creativeVariantsFor} from './social-placements.js';
export const CAMPAIGN_LAYERS = [
  {id:'fish',label:'Fish species and seasonal guides',frequency:3,priority:5,topics:['Species spotlight: identification and habitat','Check the seasonal fishing guide before a trip','Species handling and release demonstration','Compare two common local species'],cta:'Open the fishing guide'},
  {id:'bait',label:'Bait, rigs and tackle',frequency:3,priority:5,topics:['Which bait suits this fishing method?','Show a simple rig step by step','Packing a tackle kit for a day trip','How to look after bait on a warm day'],cta:'Explore the bait and rig guide'},
  {id:'weather',label:'Marine weather and tides (Thu/Fri/Sat)',frequency:3,priority:12,topics:['Thursday: weekend outlook and planning','Friday: revised marine and tide check','Saturday: departure-day conditions and safety check'],cta:'Check current marine conditions'},
  {id:'safety',label:'Boat, water and wildlife safety',frequency:2,priority:9,topics:['Pre-departure boat safety checklist','How to check official marine warnings','Safe sharing of jetties and ramps','Discarded fishing line and wildlife rescue contacts'],cta:'Read the safety and care guides'},
  {id:'events',label:'Events and countdowns',frequency:3,priority:10,topics:['Ask about the next confirmed club event','Countdown or RSVP reminder, once dates are confirmed','Volunteer roles for the next club activity','Day-before event checklist'],cta:'Check confirmed club events'},
  {id:'holidays',label:'School-holiday and family activities',frequency:3,priority:9,holidayOnly:true,topics:['Welcome visiting families to Straddie','Family-friendly fishing etiquette','Holiday trip preparation and safety','Holiday weekend club invitation'],cta:'Explore the visitor guide'},
  {id:'nswHolidays',label:'NSW visitor holiday wave',frequency:2,priority:8,holidayOnly:true,topics:['NSW families: a Straddie fishing welcome','NSW road-trip and ferry planning checklist','First-time NSW visitor: fishing rules and local etiquette','NSW holiday anglers: safe boating and coast care'],cta:'See the visitor fishing guide'},
  {id:'camping',label:'Camping, visitors and island etiquette',frequency:2,priority:5,topics:['What to pack for a coastal fishing day','Jetty etiquette for first-time visitors','Keep camping and fishing areas clean','Planning a safe return after sunset'],cta:'Explore the island guide'},
  {id:'competition',label:'Competitions and leaderboards',frequency:2,priority:7,topics:['How a brag-mat photo is checked','Share verified competition results','Celebrate a verified leaderboard milestone','Invite teams to the next confirmed meet'],cta:'See club competitions'},
  {id:'newsletter',label:'Newsletters and club updates',frequency:1,priority:5,topics:['Preview this month’s club newsletter','Invite members to contribute a story','Summarise three confirmed club updates'],cta:'Visit the newsletter desk'},
  {id:'membership',label:'Membership, joining and renewals',frequency:2,priority:6,topics:['Invite newcomers to learn about membership','What members can expect at their first meet','Membership renewal reminder','Member welcome and volunteer opportunities'],cta:'Find out how to join'},
  {id:'raffles',label:'Raffles and supporter recognition',frequency:1,priority:6,topics:['Feature a confirmed raffle prize','Remind supporters about a confirmed draw','Thank a supporter who agreed to be named'],cta:'See club fundraising news'},
  {id:'fundraisers',label:'Fundraising campaigns',frequency:2,priority:7,topics:['Explain an approved fundraising goal','Share verified progress towards the goal','Recognise volunteers and sponsors with permission','Countdown to a confirmed fundraising event'],cta:'Support an approved club campaign'},
  {id:'wishes',label:'Donation and equipment wish lists',frequency:1,priority:7,topics:['Spotlight a current equipment wish','Explain how a donated item would help','Thank a donor with permission','Invite offers of goods, skills or volunteer time'],cta:'Browse the equipment wish list'},
  {id:'community',label:'Community stories and photos',frequency:2,priority:5,topics:['Member fishing story with permission','Show a catch-and-release technique','Community question: what would you teach a newcomer?','Club volunteer appreciation'],cta:'Join the conversation'},
  {id:'surprise',label:'Trivia and spontaneous ideas',frequency:1,priority:2,topics:['Fishing trivia quiz','Photo challenge for members','Guess the bait or rig','One quick coastline care tip'],cta:'Share your answer'}
];

// Queensland Department of Education state-school dates (check independent school variations):
// https://education.qld.gov.au/about-us/calendar/term-dates
// https://education.qld.gov.au/about-us/calendar/future-dates
export const QLD_SCHOOL_HOLIDAYS = [
  ['2026-12-12','2027-01-26'],['2027-03-26','2027-04-11'],
  ['2027-06-26','2027-07-11'],['2027-09-18','2027-10-04'],
  ['2027-12-11','2028-01-23'],['2028-04-01','2028-04-17'],
  ['2028-06-24','2028-07-09'],['2028-09-16','2028-10-02'],
  ['2028-12-09','2029-01-21']
];
// NSW Department of Education: Eastern division dates lead the main visitor wave.
// The Western division has an additional summer extension; it receives a lighter tail.
// https://education.nsw.gov.au/schooling/calendars/2027
// https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates
export const NSW_SCHOOL_HOLIDAYS_EASTERN = [
  ['2026-12-18','2027-01-27'],['2027-04-12','2027-04-23'],
  ['2027-07-05','2027-07-16'],['2027-09-27','2027-10-08'],
  ['2027-12-21','2028-01-28'],['2028-04-10','2028-04-21'],
  ['2028-07-10','2028-07-21'],['2028-10-03','2028-10-13'],
  ['2028-12-22','2029-01-25']
];
export const NSW_SCHOOL_HOLIDAYS_WESTERN_EXTENSIONS = [
  ['2027-01-28','2027-02-03'],['2028-01-29','2028-02-04'],
  ['2029-01-26','2029-02-02']
];
const MS = 86400000;
const dayMs = day => Date.parse(day+'T00:00:00Z');
const iso = ms => new Date(ms).toISOString().slice(0,10);
const weekday = day => new Date(dayMs(day)).getUTCDay();
const numberHash = value => {let h=2166136261; for(const c of value){h=Math.imul(h^c.charCodeAt(0),16777619);} return h>>>0;};
const inHoliday = day => QLD_SCHOOL_HOLIDAYS.some(([a,b])=>day>=a && day<=b);
const inNSWEasternHoliday = day => NSW_SCHOOL_HOLIDAYS_EASTERN.some(([a,b])=>day>=a && day<=b);
const inNSWWesternExtension = day => NSW_SCHOOL_HOLIDAYS_WESTERN_EXTENSIONS.some(([a,b])=>day>=a && day<=b);
const inNSWHoliday = day => inNSWEasternHoliday(day)||inNSWWesternExtension(day);
export const holidayInfluences = day => ({qld:inHoliday(day),nswEastern:inNSWEasternHoliday(day),nswWestern:inNSWWesternExtension(day)});
const dayBeforeHoliday = day => QLD_SCHOOL_HOLIDAYS.some(([a])=>iso(dayMs(a)-MS)===day);
const dayBeforeNSW = day => NSW_SCHOOL_HOLIDAYS_EASTERN.some(([a])=>iso(dayMs(a)-MS)===day);
export const defaultCampaignSettings = () => ({
  monthOverrides:{},weekOverrides:{},dayOverrides:{},
  videoShare:67, limits:{weekday:2,friday:3,weekend:4,holiday:5},
  delivery:{
    organic:['youtube','facebook','instagram','tiktok','noticeboard'],
    paid:['youtube','facebook','instagram','tiktok','noticeboard'],
    paidPlanning:true
  },
  layers:Object.fromEntries(CAMPAIGN_LAYERS.map(layer=>[layer.id,{enabled:true,visible:true,weekly:layer.frequency,
    audience:{membership:['all'],gender:['all'],place:layer.id==='nswHolidays'?['tourist','regional']:['all']}}]))
});
export const monthSettingsFor=(settings,month)=>settings.monthOverrides?.[month.slice(0,7)]||settings;
export const weekStart=day=>iso(dayMs(day)-((weekday(day)+6)%7)*MS);
export const settingsForDate=(settings,day)=>settings.dayOverrides?.[day]||
  settings.weekOverrides?.[weekStart(day)]||monthSettingsFor(settings,day);
export const scopeSettingsFor=(settings,scope,key)=>scope==='day'?
  settings.dayOverrides?.[key]||settingsForDate({...settings,dayOverrides:{}},key):
  scope==='week'?(settings.weekOverrides?.[key]||monthSettingsFor(settings,key)):
  monthSettingsFor(settings,key);
export const copyMonthSettings=settings=>structuredClone({
  videoShare:settings.videoShare,limits:settings.limits,delivery:settings.delivery,layers:settings.layers
});
const capFor = (day,limits) => inHoliday(day)?limits.holiday:weekday(day)===5?limits.friday:[0,6].includes(weekday(day))?limits.weekend:limits.weekday;
function basePost(layer,day,weekKey,index){
  const topic=layer.id==='weather'?
    layer.topics[weekday(day)-4]:layer.topics[numberHash(layer.id+weekKey+day+index)%layer.topics.length];
  const weather=layer.id==='weather';
  const text=weather?'Use a freshly verified marine forecast, tides and official warnings. Do not publish predicted conditions from this advance schedule.':
    ['events','competition','raffles','fundraisers','wishes'].includes(layer.id)?'Verify the real club record, dates, permissions and current status before publishing.':'Check details against the current PLFC guide and any applicable official advice.';
  return {id:layer.id+'-'+day,date:day,layerIds:[layer.id],title:topic,brief:text,cta:layer.cta,
    audience:null,priority:layer.priority,composite:false,sections:[topic],status:'suggestion'};
}
function assignWeek(days,settings,postsByDay){
  // Preserve the normal week's pattern for every unaffected day. Individual day,
  // Monday-start week and month overrides only replace their selected dates.
  const baseline=new Map(days.map(day=>[day,[]]));
  assignSegment(days,settings,baseline);
  const groups=new Map();
  for(const day of days){
    const selected=settingsForDate(settings,day);
    if(selected===settings){postsByDay.get(day).push(...baseline.get(day));continue;}
    if(!groups.has(selected))groups.set(selected,[]);
    groups.get(selected).push(day);
  }
  for(const [config,scopedDays] of groups){
    const scoped=new Map(scopedDays.map(day=>[day,[]]));
    assignSegment(scopedDays,config,scoped);
    for(const day of scopedDays)postsByDay.get(day).push(...scoped.get(day));
  }
}
function assignSegment(days,settings,postsByDay){
  const key=days[0].slice(0,7)+'-'+days[0];
  for(const layer of CAMPAIGN_LAYERS){
    const preference=settings.layers[layer.id];
    if(!preference?.enabled || !preference.weekly) continue;
    let eligible=days.filter(day=>!layer.holidayOnly||(layer.id==='nswHolidays'?inNSWHoliday(day):inHoliday(day)));
    if(layer.id==='weather')eligible=eligible.filter(day=>[4,5,6].includes(weekday(day)));
    const isQLDWeek=days.some(inHoliday),isNSWWeek=days.some(inNSWHoliday);
    const boost=isQLDWeek && ['fish','bait','safety','camping','community','membership'].includes(layer.id)?1:
      !isQLDWeek && isNSWWeek && layer.id==='camping'?1:0;
    const westernOnly=layer.id==='nswHolidays' && eligible.every(day=>!inNSWEasternHoliday(day));
    const weekly=days.length>=7?preference.weekly:Math.ceil(preference.weekly*days.length/7);
    const frequency=Math.min(eligible.length,westernOnly?Math.min(weekly,1):weekly+boost);
    eligible.sort((a,b)=>{
      const weight=day=>(layer.id==='nswHolidays' && inNSWHoliday(day) && !inHoliday(day)?70:0)+
        (inHoliday(day)?45:0)+([5,6,0].includes(weekday(day))?20:0)+(weekday(day)===5?10:0);
      return weight(b)-weight(a) || numberHash(layer.id+key+a)%100-numberHash(layer.id+key+b)%100;
    });
    const chosen=layer.id==='weather' ? eligible.sort((a,b)=>weekday(a)-weekday(b)).slice(0,frequency) : eligible.slice(0,frequency);
    for(const day of chosen){const post=basePost(layer,day,key,chosen.indexOf(day));post.audience=preference.audience;postsByDay.get(day).push(post);}
  }
}
function combine(candidates,cap){
  if(!cap)return {posts:[],omitted:candidates.length};
  const selected=candidates.slice(0,cap);
  const overflow=candidates.slice(cap);
  // A short roundup can carry two additional subjects, reducing posting pressure.
  if(overflow.length && selected.length){
    const target=selected.find(p=>p.layerIds[0]!=='safety')||selected[0];
    // Do not silently mix targeted member, gender or visitor groups in one post.
    const additions=[];
    for(let i=0;i<overflow.length && additions.length<2;){
      if(JSON.stringify(overflow[i].audience)===JSON.stringify(target.audience))additions.push(...overflow.splice(i,1));
      else i++;
    }
    target.layerIds.push(...additions.flatMap(p=>p.layerIds));
    target.sections.push(...additions.map(p=>p.title));
    if(additions.length){
      target.composite=true;
      target.title='30-second PLFC roundup: '+target.sections[0];
      target.brief+=' Include concise segments from the other sources; verify every claim.';
    }
  }
  return {posts:selected,omitted:overflow.length};
}
export function generateCampaignYear(startMonth,settings=defaultCampaignSettings()){
  if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(startMonth))throw new Error('Use a YYYY-MM start month.');
  const first=dayMs(startMonth+'-01');
  if(!Number.isFinite(first))throw new Error('Invalid start month.');
  const endDate=new Date(Date.UTC(Number(startMonth.slice(0,4)),Number(startMonth.slice(5))-1+12,1)).getTime();
  const days=[];for(let ms=first;ms<endDate;ms+=MS)days.push(iso(ms));
  const postsByDay=new Map(days.map(day=>[day,[]]));
  let week=[];
  for(const day of days){if(week.length && weekday(day)===1){assignWeek(week,settings,postsByDay);week=[];}week.push(day);}
  if(week.length)assignWeek(week,settings,postsByDay);
  for(const day of days.filter(dayBeforeHoliday)){
    const monthSettings=settingsForDate(settings,day);
    if(!monthSettings.layers.holidays?.enabled)continue;
    postsByDay.get(day).push({id:'holiday-eve-'+day,date:day,layerIds:['holidays'],title:'School holidays begin tomorrow: welcome and trip checklist',
      brief:'Confirm Queensland state school holiday dates and local conditions before publishing.',cta:'Explore the family fishing guide',
      audience:monthSettings.layers.holidays.audience,priority:11,sections:['Holiday countdown'],composite:false,status:'suggestion'});
  }
  for(const day of days.filter(dayBeforeNSW)){
    const monthSettings=settingsForDate(settings,day);
    if(!monthSettings.layers.nswHolidays?.enabled)continue;
    postsByDay.get(day).push({id:'nsw-holiday-eve-'+day,date:day,layerIds:['nswHolidays'],title:'NSW school break starts tomorrow: Straddie visitor welcome',
      brief:'Verify NSW term dates and any current ferry, weather and fishing information before publishing.',cta:'Explore the visitor fishing guide',
      audience:monthSettings.layers.nswHolidays.audience,priority:9,sections:['NSW holiday lead-in'],composite:false,status:'suggestion'});
  }
  const dayCards=[],posts=[];
  for(const [day,candidates] of postsByDay){
    candidates.sort((a,b)=>b.priority-a.priority||numberHash(a.id)-numberHash(b.id));
    const effective=settingsForDate(settings,day);
    // The minimum is one genuine editorial suggestion a day, even when sparse
    // weekly patterns or a historical zero-valued cap would leave a gap.
    if(!candidates.length){
      const eligible=CAMPAIGN_LAYERS.filter(layer=>effective.layers[layer.id]?.enabled&&
        (!layer.holidayOnly||(layer.id==='nswHolidays'?inNSWHoliday(day):inHoliday(day)))&&
        (layer.id!=='weather'||[4,5,6].includes(weekday(day))));
      if(eligible.length){
        const evergreen=eligible.sort((a,b)=>numberHash('daily-'+day+a.id)-numberHash('daily-'+day+b.id))[0];
        const post=basePost(evergreen,day,'daily-'+day,0);
        post.audience=effective.layers[evergreen.id].audience;
        candidates.push(post);
      }else{
        // When all categories are switched off, preserve the daily plan by
        // inviting the editor to select a topic rather than inventing content.
        candidates.push({id:'daily-'+day,date:day,layerIds:['daily'],
          title:'Choose a fresh PLFC post for today',
          brief:'Pick a fishing, club or community topic, add verified facts and a useful image or video. This is an editable planning placeholder.',
          cta:'Visit the club website',audience:{membership:['all'],gender:['all'],place:['all']},
          priority:0,composite:false,sections:['One relevant daily club update'],status:'suggestion'});
      }
    }
    candidates.sort((a,b)=>b.priority-a.priority||numberHash(a.id)-numberHash(b.id));
    const {posts:chosen,omitted}=combine(candidates,Math.max(1,capFor(day,effective.limits)));
    dayCards.push({date:day,holiday:inHoliday(day),nswHoliday:inNSWHoliday(day),nswWesternOnly:inNSWWesternExtension(day),omitted,count:chosen.length});
    posts.push(...chosen);
  }
  const composites=posts.filter(p=>p.composite);
  const videoIds=new Set();
  // Monthly ratios are independent. Composites take precedence, then evenly-seeded candidates.
  for(const month of [...new Set(posts.map(p=>p.date.slice(0,7)))]){
    const current=posts.filter(p=>p.date.startsWith(month));
    const groups=new Map();
    for(const post of current){
      const effective=settingsForDate(settings,post.date);
      if(!groups.has(effective))groups.set(effective,[]);
      groups.get(effective).push(post);
    }
    for(const [effective,group] of groups){
      const count=Math.round(group.length*effective.videoShare/100);
      const composite=group.filter(p=>p.composite),other=group.filter(p=>!p.composite)
        .sort((a,b)=>numberHash('video-'+a.id)-numberHash('video-'+b.id));
      for(const p of [...composite,...other.slice(0,Math.max(0,count-composite.length))])videoIds.add(p.id);
    }
  }
  for(const p of posts){
    p.format=videoIds.has(p.id)?'30-second vertical video':['image','carousel','link'][numberHash('format-'+p.id)%3];
    p.aspectRatio=p.format.startsWith('30-second')?'9:16':p.format==='link'?'1.91:1':'4:5';
    p.size=p.format.startsWith('30-second')?'1080×1920':p.format==='link'?'1200×630':'1080×1350';
    p.durationSeconds=p.format.startsWith('30-second')?30:null;
    p.suggestedTime=[0,6].includes(weekday(p.date))?'08:00':weekday(p.date)===5?'17:00':'18:00';
    p.creativeVariants=creativeVariantsFor(p,settingsForDate(settings,p.date).delivery);
    p.destinations=[...new Set(p.creativeVariants.filter(v=>v.distribution==='organic').map(v=>v.platform))];
    // The existing social post editor supports only the four connected club channels.
    // The Noticeboard is a separate, unconnected pilot and is never sent there.
    p.channels=p.destinations.filter(id=>id!=='noticeboard');
    p.storyboard=p.durationSeconds? p.sections.length>1?['0–3s: Hook',...p.sections.map((s,i)=>'Segment '+(i+1)+': '+s),'Final 3s: Club link / call to action']:['0–3s: Hook','3–24s: '+p.sections[0],'24–30s: Call to action']:[];
  }
  return {startMonth,posts,days:dayCards,totals:{posts:posts.length,videos:posts.filter(p=>p.durationSeconds).length,combined:composites.length,omitted:dayCards.reduce((n,d)=>n+d.omitted,0)}};
}
