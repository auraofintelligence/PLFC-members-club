import {getTripBrief,rigCard} from './fish-guide.js?v=20261120e';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localTime=value=>value?new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value)):'Not in this day';
const dayDate=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',weekday:'long',day:'numeric',month:'long'}).format(new Date(value+'T12:00:00+10:00'));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const checkedTime=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
const refreshEvery=15*60*1000;
const number=(value,decimals=0)=>Number.isFinite(Number(value))&&value!==null?Number(value).toFixed(decimals):null;
const unit=(value,suffix,decimals=0)=>number(value,decimals)!==null?number(value,decimals)+suffix:'Unavailable';
const icon=(cell,cls='')=>`<span class="condition-art art-${cell} ${cls}" aria-hidden="true"></span>`;
function weatherArt(code,isDay=1){let cell=2;if(Number.isFinite(code)){cell=code>=95?4:code>=51?3:code>=3?2:code>=1?1:0;if(isDay===0&&code<45)cell=5}return `<span class="condition-art weather-art weather-state-${cell}" aria-hidden="true"></span>`}
const direction=degrees=>Number.isFinite(degrees)?['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees/45)%8]:'';
const methods={beach:'Beach fishing',boat:'Boat fishing',rocks:'Rock fishing',estuary:'Estuary fishing',spearfishing:'Spearfishing'};
const locations={'point-lookout':'Point Lookout',amity:'Amity Point',dunwich:'Dunwich',jumpinpin:'Jumpinpin'};
let state={date:today(),location:'point-lookout',method:'beach',target:'any',followToday:true};
let pending=null,timer=null,lastChecked=0,lastPlan='',dateEdited=false;
function tripPreferences(saved,fallback=state){
  const aliases={'sand-whiting':'whiting','yellowfin-bream':'bream','dusky-flathead':'flathead','swallowtail-dart':'dart'};
  const target=aliases[saved?.target]??saved?.target;
  const date=typeof saved?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved.date)&&saved.date>='1900-01-01'&&saved.date<='2100-12-31'&&Number.isFinite(Date.parse(saved.date+'T12:00:00Z'))&&new Date(saved.date+'T12:00:00Z').toISOString().slice(0,10)===saved.date?saved.date:fallback.date;
  const followToday=!saved?.date?fallback.followToday:Object.hasOwn(saved,'followedDate')?saved.followedDate===date:date===today();
  return {date:followToday?today():date,location:Object.hasOwn(locations,saved?.location)?saved.location:fallback.location,method:Object.hasOwn(methods,saved?.method)?saved.method:fallback.method,target:['any','whiting','bream','flathead','tailor','snapper','spanish-mackerel','dart','mulloway'].includes(target)?target:fallback.target,followToday};
}
try{state=tripPreferences(JSON.parse(localStorage.getItem('plfc-trip-demo')||'{}'))}catch{}
async function request(path,signal){const response=await fetch(path,{signal,cache:'no-cache'});const value=await response.json();if(!response.ok)throw Error(typeof value.error==='string'?value.error:'Information is unavailable just now.');return value}
function freshness(conditions){
  const stamp=feed=>feed?.status==='available'&&Number.isFinite(Date.parse(feed.retrievedAt))?'retrieved '+checkedTime.format(new Date(feed.retrievedAt))+' AEST':'unavailable';
  return '<p class="data-caption"><strong>Weather forecast '+esc(stamp(conditions?.weather))+'. Offshore forecast '+esc(stamp(conditions?.marine))+'.</strong> This planner checks every 15 minutes while it’s open.</p>';
}
function weatherLabel(code){if(!Number.isFinite(code))return 'Forecast outlook';if(code===0)return 'Clear skies';if(code<4)return 'A mix of sun and cloud';if(code<50)return 'Fog or low visibility';if(code<70)return 'Rain in the forecast';if(code<80)return 'Wintry precipitation';if(code<95)return 'Showers in the forecast';if(code>=95)return 'Thunderstorms in the forecast';return 'Forecast outlook'}
function simpleMoon(angle){const a=((angle%360)+360)%360,c=Math.cos(a*Math.PI/180),s=a<180?1:0,back=a<180?(c>=0?0:1):(c>=0?1:0);return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#2c7070"/><path d="M50 3 A47 47 0 0 ${s} 50 97 A${Math.max(.01,Math.abs(c)*47)} 47 0 0 ${back} 50 3Z" fill="#f1dc9c"/></svg>`}
function skeleton(){return `<div class="conditions-loading" role="status"><div>${icon(0)}<h2>Getting your island day together.</h2><p>Checking the forecast, tide reference, daylight and moon.</p></div></div>`}
function link(url,label,cls='text-link'){return `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`}
function summaryCard(cell,label,value,detail,meta,extra='',artOverride=null){
  const actions = {0:['weather','See hourly forecast'],3:['tides','See all tide times'],4:['sky','See sun and moon times']};
  const action = actions[cell];
  const shortcut = action ? `<button type="button" class="day-shortcut" data-day-detail="${action[0]}">${action[1]}</button>` : '';
  return `<article class="condition-card condition-${cell}">${artOverride??icon(cell)}<div class="condition-card-copy"><span class="eyebrow">${label}</span><strong>${value}</strong><p>${detail}</p><small>${meta}</small>${extra}${shortcut}</div></article>`;
}
function restrictionBanner(){const brief=getTripBrief({date:state.date,method:state.method,target:state.target}),checks=brief.ruleChecks.filter(check=>check.level==='closure');return checks.map(check=>`<aside class="closure-alert"><strong>${esc(check.title)}</strong><p>${esc(check.body)}</p>${link(check.url,'Check the official closure before choosing this target')}</aside>`).join('')}
function chart(points,{key='height',suffix='m',label='Forecast chart',min=0,max=null,filled=true}={}){
  const clean=points.filter(point=>Number.isFinite(point[key])&&Number.isFinite(new Date(point.time).getTime()));
  if(!clean.length)return '<p class="empty-state">No chart values are available for this day.</p>';
  const floor=min,ceil=max??Math.max(...clean.map(point=>point[key]),1)*1.15,span=Math.max(ceil-floor,.1),left=42,top=20,width=530,height=145,start=new Date(state.date+'T00:00:00+10:00').getTime();
  const xy=point=>[left+((new Date(point.time).getTime()-start)/86400000)*width,top+height-(point[key]-floor)/span*height];
  const path=clean.map((point,index)=>{const [x,y]=xy(point);return (index?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)}).join(' ');
  const ticks=[0,6,12,18,24].map(hour=>`<line x1="${left+hour/24*width}" y1="${top}" x2="${left+hour/24*width}" y2="${top+height}" stroke="#dce8e3"/><text x="${left+hour/24*width}" y="195" text-anchor="middle">${hour===0?'12am':hour===12?'12pm':hour===24?'12am':hour>12?(hour-12)+'pm':hour+'am'}</text>`).join('');
  const yTicks=[0,.5,1].map(part=>`<text x="32" y="${top+height-part*height+5}" text-anchor="end">${(floor+part*span).toFixed(suffix==='m'?1:0)}${suffix}</text>`).join('');
  const first=xy(clean[0]),last=xy(clean.at(-1));
  return `<svg class="day-chart" viewBox="0 0 600 210" role="img" aria-label="${esc(label)}"><defs><linearGradient id="chartFill-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#218c94" stop-opacity=".3"/><stop offset="1" stop-color="#218c94" stop-opacity=".02"/></linearGradient></defs>${ticks}${yTicks}${filled?`<path d="${path} L${last[0]} ${top+height} L${first[0]} ${top+height}Z" fill="url(#chartFill-${key})"/>`:''}<path d="${path}" fill="none" stroke="#087477" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
function tripContext(conditions){
  let brief;try{brief=getTripBrief({date:state.date,method:state.method,target:state.target})}catch{brief={methodTips:[],targetTips:[],ruleChecks:[],sources:[]}};
  const advice=conditions?.advice??[];
  const isClosed=(brief.ruleChecks??[]).some(check=>check.level==='closure');
  const content=[...advice.slice(0,1).map(item=>({title:item.title,body:item.body})),...(brief.methodTips??[]).slice(0,1).map(item=>typeof item==='string'?{title:methods[state.method],body:item}:item),...(isClosed?[]:brief.targetTips??[]).slice(0,1).map(item=>typeof item==='string'?{title:state.target==='any'?'A thoughtful starting point':'For your target fish',body:item}:item)];
  const checks=(brief.ruleChecks??[]).slice(0,3);
  return `<section class="trip-brief"><div class="brief-heading"><span class="eyebrow">YOUR DAY, AT A GLANCE</span><h2>${esc(methods[state.method]??'Fishing')} at ${esc(locations[state.location]??'the island')}.</h2><p>Use this to plan the questions to ask before you head out. Check official warnings and local conditions on the day.</p></div><div class="brief-points">${content.map(item=>`<div><span class="brief-tick" aria-hidden="true">✓</span><p><strong>${esc(item.title??'Keep in mind')}</strong>${esc(item.body??item)}</p></div>`).join('')||'<p>Your method and target help put the relevant guide information here.</p>'}</div><div class="brief-rule-checks">${checks.map(check=>`<a class="brief-rule-check ${esc(check.level)}" href="${esc(check.url)}" target="_blank" rel="noopener"><strong>${esc(check.title)}</strong><span>${esc(check.body)}</span></a>`).join('')}</div>${rigCard(brief.setup)}<div class="brief-footer"><a href="/first-aid.html" class="text-link">First aid and emergencies</a><span>${esc(state.target==='any'?'Exploring the options':'Target: '+state.target.replaceAll('-',' '))}<small>Rule sources checked 20 November 2026. Selected seasonal checks cover 2026 and 2027.</small></span>${['beach','estuary'].includes(state.method) && ['dunwich','amity'].includes(state.location) ? '<a href="#guide/jetty" class="text-link">Fishing from a jetty? Read the jetty guide</a>' : ''}${state.method==='spearfishing'?'<a href="#guide/spearfishing" class="text-link">Check spearfishing waters and jetty distances</a>':'<a href="#guide" class="text-link">Fish, bait, rules and safety</a>'}</div></section>`;
}
function weatherSection(conditions){
  const weather=conditions?.weather,marine=conditions?.marine,w=weather?.summary??{},m=marine?.summary??{},available=weather?.status==='available';
  const hours=(weather?.hours??[]).filter(hour=>new Date(hour.time).getUTCHours()%3===2).slice(0,8);
  const fallbackHours=hours.length?hours:(weather?.hours??[]).filter((_,index)=>index%3===0);
  return `<section class="forecast-section"><div class="section-heading"><div><span class="eyebrow">LOOK AT HOW THE DAY CHANGES</span><h2>The forecast, hour by hour.</h2></div><span class="source-label">${available?'Forecast retrieved '+esc(localTime(weather.retrievedAt??conditions.retrievedAt)):'Forecast unavailable'}</span></div>${available?`<div class="hourly-strip">${fallbackHours.map(hour=>`<article class="hour-card"><time>${esc(localTime(hour.time))}</time>${weatherArt(hour.weatherCode,hour.isDay)}<strong>${unit(hour.temperature,'°')}</strong><span>${unit(hour.windKmh,' km/h')} ${direction(hour.windDirection)}</span><small>${unit(hour.rainChance,'%')} rain</small></article>`).join('')}</div><div class="forecast-graph panel"><div><span class="eyebrow">WIND THROUGH THE DAY</span><h3>Look at the changes, not just the average.</h3><p>Forecast wind in km/h. Gusts may be higher, and exposed coast can feel very different from sheltered water.</p></div>${chart(weather.hours??[],{key:'windKmh',suffix:'',label:'Hourly forecast wind speed in kilometres per hour'})}</div>`:`<div class="panel unavailable-panel">${icon(0)}<div><h3>No forecast for this selected day.</h3><p>${esc(weather?.reason??'The weather service did not return data. Try another date or check BOM directly.')}</p>${link('https://www.bom.gov.au/qld/forecasts/moreton-bay.shtml','Check the official forecast')}</div></div>`}<p class="data-caption">Weather and offshore marine forecast: ${link('https://open-meteo.com/','Open-Meteo')}. The marine model represents open water, not beach breakers or a safe bar crossing. </p><details class="source-details"><summary>Forecast sources and connection notes</summary><p>${esc(conditions?.demoLicenceNotice??'Demo forecasts are provided by Open-Meteo. Check provider terms before commercial use.')}</p><button class="text-link" data-connection="conditions">Explain this connection</button></details></section>`;
}
function tidesSection(tides){
  const available=tides?.status==='available',station=tides?.station,source=tides?.source;
  return `<section class="tide-section panel"><div class="section-heading"><div><span class="eyebrow">FOLLOW THE WATER</span><h2>Tides, with the reference clear.</h2></div>${icon(3)}</div>${available?`<div class="tide-reference"><strong>${esc(station.name)}</strong><span>${number(station.distanceKm)!==null?'About '+number(station.distanceKm)+' km from the selected location. ':''}Reference station, with no local time or height correction.</span></div><div class="tide-events">${tides.events.map(event=>`<div class="tide-event ${event.type}"><span>${event.type==='high'?'High water':'Low water'}</span><strong>${unit(event.height,' m',2)}</strong><time>${esc(localTime(event.time))}</time></div>`).join('')}</div>${chart(tides.curve??[],{label:'Schematic tide curve between official predicted high and low waters',max:Math.max(...(tides.curve??[]).map(p=>p.height),2.5)+.2})}<p class="data-caption">Official predicted highs and lows, in metres above Lowest Astronomical Tide. The line between them is an illustrative interpolation, not a measured or official interval prediction.</p><details class="source-details"><summary>Where these tide numbers come from</summary><p>${esc(source?.attribution??'Maritime Safety Queensland')}.</p><p>${esc(tides.notes?.join?.(' ')??tides.notes??'Reference predictions can differ from conditions at your fishing location.')}</p>${link(source?.datasetUrl??source?.url??'https://www.msq.qld.gov.au/tides/open-data','Open the original tide dataset')}</details>`:`<div class="unavailable-panel"><div><h3>Tide reference unavailable for this date.</h3><p>${esc(tides?.notes?.join?.(' ')??'This demo includes official reference predictions for 2026 and 2027. Check the official tide service for other dates.')}</p>${link('https://www.msq.qld.gov.au/tides/open-data','Check Queensland tide predictions')}</div></div>`}</section>`;
}
function astronomySection(day){if(!day)return '';return `<section class="astronomy-section panel"><div class="section-heading"><div><span class="eyebrow">THE NATURAL RHYTHM</span><h2>Sun, moon and a little local timing.</h2></div>${icon(4)}</div><div class="astro-summary"><div class="phase-picture">${simpleMoon(day.phase.angle)}<div><strong>${esc(day.phase.name)}</strong><p>${Math.round(day.phase.illumination*100)}% illuminated at local noon</p></div></div><div class="sun-times"><div><span>Sunrise</span><strong>${esc(localTime(day.sunrise))}</strong></div><div><span>Sunset</span><strong>${esc(localTime(day.sunset))}</strong></div><div><span>Moonrise</span><strong>${esc(localTime(day.moonrise))}</strong></div><div><span>Moonset</span><strong>${esc(localTime(day.moonset))}</strong></div></div></div><h3 class="period-heading">Estimated lunar activity periods</h3><p class="secondary">A planning tradition based on the moon’s rise, set and true transits. It does not predict a bite.</p><div class="periods-grid">${day.activityWindows.map(period=>`<div class="period"><span>${esc(period.label)}</span><strong>${esc(localTime(period.start))} to ${esc(localTime(period.end))}</strong><span>${period.kind==='major'?'Lunar transit':'Moonrise or moonset'} · estimate</span></div>`).join('')}</div><p class="data-caption">Calculated with ${link('https://github.com/cosinekitty/astronomy','Astronomy Engine')}. Periods are limited to the chosen Queensland calendar day.</p></section>`}
function render(day,conditions,tides,errors=[]){
  const w=conditions?.weather?.summary??{},m=conditions?.marine?.summary??{},weatherOK=conditions?.weather?.status==='available',marineOK=conditions?.marine?.status==='available',high=tides?.events?.find(event=>event.type==='high');
  const cards=[summaryCard(0,'THE WEATHER',weatherOK?unit(w.minTemp,'°')+' to '+unit(w.maxTemp,'°'):'Forecast unavailable',weatherOK?weatherLabel(w.weatherCode):'Choose a forecast date or open BOM.','Forecast for your selected day','',weatherArt(weatherOK?w.weatherCode:null)),summaryCard(1,'THE WIND',weatherOK?unit(w.maxWindKmh,' km/h'):'Unavailable',weatherOK?'Gusts up to '+unit(w.maxGustKmh,' km/h'):'No wind forecast returned.','Daily maximum forecast wind'),summaryCard(2,'WAVES AND SWELL',marineOK?unit(m.maxWaveHeight,' m',1):'Unavailable',marineOK?'Swell up to '+unit(m.maxSwellHeight,' m',1):'No offshore marine forecast returned.','Offshore model, not beach breakers'),summaryCard(3,'THE TIDE',high?unit(high.height,' m',2):'Reference unavailable',high?'High water at '+esc(localTime(high.time)):'Check the official tide service.',tides?.station?.name?esc(tides.station.name)+' reference':'Named reference station'),summaryCard(4,'THE DAYLIGHT',day?esc(localTime(day.sunrise)):'Unavailable',day?'Sunset '+esc(localTime(day.sunset)):'Sunrise could not be calculated.','Calculated for your selected location'),summaryCard(5,'STORMS AND RAIN','BOM radar','Brisbane Mt Stapylton · 128 km view','Live radar opens on the BOM website',link('https://www.bom.gov.au/weather-and-climate/rain-radar-and-weather-maps?radar=66-brisbane-(mt-stapylton)','Open the live radar','radar-button'))].join('');
  const sections = [
    ['plan', 'Advice for my trip', methods[state.method] + ' · ' + (state.target === 'any' ? 'Any target' : state.target.replaceAll('-', ' ')), tripContext(conditions)],
    ['weather', 'Hourly weather and wind', 'Temperature, rain and wind', weatherSection(conditions)],
    ['tides', 'High and low tides', tides?.station?.name ? tides.station.name + ' reference station' : 'Reference station and tide chart', tidesSection(tides)],
    ['sky', 'Sun, moon and activity periods', day?.phase?.name ?? 'Sunrise, sunset and moon times', astronomySection(day) || '<p>These calculations could not load for this day. Choose Plan my day to try again.</p>'],
  ];
  const detailPanels = '<div class="day-detail-list"><h2>Explore your day</h2>' + sections.map(([id, title, hint, contents]) =>
    `<details class="day-detail" name="fishing-day-detail" id="day-detail-${id}"><summary><strong>${esc(title)}</strong><span>${esc(hint)}</span></summary><div class="day-detail-body">${contents}</div></details>`
  ).join('') + '</div>';
  $('#fishing-result').innerHTML=`<div class="day-heading"><div><span class="eyebrow">${esc(dayDate(state.date))} · QUEENSLAND TIME</span><h2>${esc(locations[state.location])}, at a glance.</h2></div><span class="pill">Demo briefing · forecasts are not observations</span></div>${restrictionBanner()}<div class="conditions-grid">${cards}</div><div class="warnings-strip">${icon(5)}<div><strong>Storms can change the plan quickly.</strong><p>Check the radar loop and official warnings just before leaving, and keep checking while you’re out.</p></div>${link('https://www.bom.gov.au/qld/warnings/','Check BOM warnings','button outline small')}</div>${detailPanels}<a class="button outline day-guide-link" href="#guide">Browse the fishing guide</a>${errors.length?'<p class="data-caption">Some information did not load. Unavailable fields have been left empty, with links to the official sources.</p>':''}`;
  $('#fishing-result .day-heading').insertAdjacentHTML('afterend',freshness(conditions));
  $('#fishing-result').dataset.loaded='true';
}
const boardVisible=()=>!document.hidden && document.querySelector('[data-view="fishing"]')?.hidden===false;
function savePreferences(){
  const {followToday,...plan}=state;
  try{localStorage.setItem('plfc-trip-demo',JSON.stringify({...plan,followedDate:followToday?plan.date:null}));}catch{}
}
function schedule(){
  clearTimeout(timer);
  if(!boardVisible()||pending)return;
  const midnight=Date.parse(today()+'T00:00:00+10:00')+86400000;
  const dueAt=Math.min(lastChecked+refreshEvery,state.followToday?midnight:Infinity);
  timer=setTimeout(check,Math.max(10,dueAt-Date.now()));
}
function check(){
  clearTimeout(timer);
  if(!boardVisible())return;
  if(state.followToday && state.date!==today()){
    const previous=state.date;
    state={...state,date:today()};
    if(!dateEdited&&$('#fishing-date').value===previous)$('#fishing-date').value=state.date;
    savePreferences();
  }
  const key=JSON.stringify(state);
  if((pending && pending.key!==key) || lastPlan!==key || !lastChecked || Date.now()-lastChecked>=refreshEvery)return refresh();
  schedule();
}
function refresh(){
  const key=JSON.stringify(state);
  if(pending?.key===key)return pending.promise;
  clearTimeout(timer);
  pending?.controller.abort();
  const controller=new AbortController();
  const result=$('#fishing-result'),samePlan=lastPlan===key;
  if(!samePlan)result.innerHTML=skeleton();
  const deadline=setTimeout(()=>controller.abort(),20000);
  const params='date='+encodeURIComponent(state.date)+'&location='+encodeURIComponent(state.location);
  const promise=Promise.allSettled(['fishing','conditions','tides'].map(name=>request('/api/'+name+'?'+params,controller.signal))).then(results=>{
    if(pending?.controller!==controller)return;
    const openDetails=samePlan?Array.from(result.querySelectorAll('details')).map(d=>d.open):[];
    const focusable='summary,button,a[href]';
    const focused=samePlan?Array.from(result.querySelectorAll(focusable)).indexOf(document.activeElement):-1;
    const values=results.map(r=>r.status==='fulfilled'?r.value:null);
    render(...values,results.filter(r=>r.status==='rejected'));
    if(samePlan){
      Array.from(result.querySelectorAll('details')).forEach((d,i)=>{if(openDetails[i])d.open=true;});
      if(focused>=0)result.querySelectorAll(focusable)[focused]?.focus({preventScroll:true});
    }
    lastPlan=key;
  }).finally(()=>{
    clearTimeout(deadline);
    if(pending?.controller!==controller)return;
    lastChecked=Date.now();pending=null;
    if(state.followToday && state.date!==today())check();else schedule();
  });
  pending={key,controller,promise};
  return promise;
}
export function loadFishing(follow=false){
  const date=follow?today():$('#fishing-date').value;
  const followToday=follow||(!dateEdited&&state.followToday&&date===state.date);
  state={date,location:$('#fishing-location').value,method:$('#fishing-method')?.value??'beach',target:$('#fishing-target')?.value??'any',followToday};
  dateEdited=false;$('#fishing-date').value=date;
  savePreferences();return refresh();
}
export function enterFishingBoard(){
  let next=state;
  try{next=tripPreferences(JSON.parse(localStorage.getItem('plfc-trip-demo')||'{}'))}catch{}
  state=next;dateEdited=false;
  for(const key of ['date','location','method','target'])$('#fishing-'+key).value=state[key];
  savePreferences();return check();
}
export function setupFishingBoard(){
  const view=document.querySelector('[data-view="fishing"]');
  view.addEventListener('click', event => {
    const shortcut = event.target.closest('[data-day-detail]');
    if (!shortcut) return;
    const panel = document.getElementById('day-detail-' + shortcut.dataset.dayDetail);
    if (!panel) return;
    panel.open = true;
    panel.querySelector('summary').focus({preventScroll:true});
    panel.scrollIntoView({block:'start', behavior:'instant'});
  });
  view.innerHTML=`<nav class="fishing-subnav" aria-label="Fishing pages"><a href="#fishing" aria-current="page">Plan my day</a><a href="#guide">Fish, bait and responsible fishing</a></nav><div class="fishing-page-header"><div><span class="eyebrow">THE WATER. THE WEATHER. THE KNOW-HOW.</span><h1 class="page-title">A little more insight.<br>A better day out.</h1><p class="page-intro">Real forecasts, a named tide reference, sun and moon times, and the guidance that matters to your kind of fishing.</p></div>${icon(4)}</div><form id="fishing-controls" class="fishing-controls visual-controls"><label for="fishing-location">Where are you heading?<select id="fishing-location" name="location">${Object.entries(locations).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></label><label for="fishing-date">Choose a day<input id="fishing-date" name="date" type="date" min="1900-01-01" max="2100-12-31" required></label><label for="fishing-method">How are you fishing?<select id="fishing-method" name="method">${Object.entries(methods).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></label><label for="fishing-target">Looking for anything?<select id="fishing-target" name="target"><option value="any">Any species</option><option value="whiting">Whiting</option><option value="bream">Bream</option><option value="flathead">Flathead</option><option value="tailor">Tailor</option><option value="snapper">Snapper</option><option value="spanish-mackerel">Spanish mackerel</option><option value="dart">Swallowtail dart</option><option value="mulloway">Mulloway</option></select></label><button class="button" type="submit">Plan my day</button></form><div id="fishing-result" aria-live="polite">${skeleton()}</div><p class="data-caption">Demo preferences are saved on this device only. This is a planning view, with official forecasts and rules to check before you go. An offline app is planned for a later stage.</p>`;
  $('#fishing-date').value=state.date;
  $('#fishing-location').value=Object.hasOwn(locations,state.location)?state.location:'point-lookout';
  $('#fishing-method').value=Object.hasOwn(methods,state.method)?state.method:'beach';
  if([...$('#fishing-target').options].some(option=>option.value===state.target))$('#fishing-target').value=state.target;
  $('#fishing-controls').addEventListener('submit',event=>{event.preventDefault();loadFishing()});
  $('#fishing-controls').insertAdjacentHTML('afterend','<p class="data-caption" id="forecast-day-mode"></p>');
  const mode=$('#forecast-day-mode');
  function updateMode(){
    mode.replaceChildren(document.createTextNode(state.followToday?'Following today in Queensland.':'Showing your chosen date. '));
    if(!state.followToday){
      const button=document.createElement('button');button.type='button';button.className='text-link';button.textContent='Follow today instead';
      button.onclick=()=>{loadFishing(true);updateMode();};mode.append(button);
    }
  }
  $('#fishing-date').addEventListener('input',()=>{dateEdited=true;});
  $('#fishing-controls').addEventListener('submit',updateMode);
  window.addEventListener('plfc:navigated',()=>{updateMode();if(!boardVisible())clearTimeout(timer);});
  document.addEventListener('visibilitychange',check);
  window.addEventListener('pageshow',check);
  window.addEventListener('focus',check);
  updateMode();
}
