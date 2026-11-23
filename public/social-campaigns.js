import {CAMPAIGN_LAYERS,defaultCampaignSettings,generateCampaignYear} from './social-campaign-engine.js';
import {PUBLISHING_DESTINATIONS,placementSources,CREATIVE_SPEC_VERSION,MASTER_ASSET_PRESETS} from './social-placements.js';
import {matchingPosts,renderCampaignCalendar,exportCampaignCSV,activeDay,WORKBENCH_STAGES} from './social-calendar-view.js';

const endpoint='/api/committee/social-campaign-settings';
const choices={
  membership:[['all','All classes'],['adult','Adult'],['cadet','Cadet'],['junior','Junior'],['social','Social'],['casual','Casual'],['lifetime','Lifetime'],['prospect','Prospective']],
  gender:[['all','All genders'],['women','Women'],['men','Men'],['self-described','Other self-described']],
  place:[['all','All locations'],['local','Island locals'],['tourist','Tourists / visitors'],['regional','Regional / mainland']]
};
const checked=value=>value?' checked':'';
const nextMonth=(start,index)=>new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5))-1+index,1)).toISOString().slice(0,7);
const monthName=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',month:'short',year:'numeric'}).format(new Date(value+'-01T00:00:00Z'));
const audienceText=selection=>Object.values(selection||{}).map(values=>values.join(', ')).join(' · ');
const csvDate=value=>value.slice(0,10);

export function setupAnnualCampaigns({mount,api,esc,isActive,onUse,reviewOnly=false}){
  let settings=defaultCampaignSettings(),saved=JSON.stringify(settings),version=0,loaded=false,busy=false,notice='';
  let selectedLayer='nswHolidays',startMonth=new Date(Date.now()+36000000).toISOString().slice(0,7),selectedMonth=startMonth;
  let lastPreview=null,selectedDate=startMonth+'-01',layerFilter='all',channelFilter='all',deliveryFilter='all',localEdits={};
  const editStorageKey=()=> 'plfc-social-calendar-workbench-v2:'+startMonth;
  const restoreLocal=()=>{try{const val=JSON.parse(localStorage.getItem(editStorageKey())||'{}');localEdits=val&&typeof val==='object'&&!Array.isArray(val)?val:{};}catch{localEdits={};}};
  const persistLocal=()=>{try{localStorage.setItem(editStorageKey(),JSON.stringify(localEdits));return true;}catch{return false;}};
  const editFor=id=>localEdits[id]||{};
  const root=()=>mount.querySelector('[data-annual-root]');
  const changed=()=>JSON.stringify(settings)!==saved;
  const labels={
    weekday:'Weekday maximum',friday:'Friday maximum',weekend:'Weekend maximum',holiday:'QLD holiday maximum'
  };
  function controls(){
    const rows=CAMPAIGN_LAYERS.map(layer=>{
      const p=settings.layers[layer.id];
      return '<tr><th scope="row">'+esc(layer.label)+'</th>'+
        '<td><input type="checkbox" data-annual-enabled="'+layer.id+'" aria-label="Generate '+esc(layer.label)+'"'+checked(p.enabled)+'></td>'+
        '<td><input type="checkbox" data-annual-visible="'+layer.id+'" aria-label="Show '+esc(layer.label)+'"'+checked(p.visible)+'></td>'+
        '<td><input type="number" data-annual-frequency="'+layer.id+'" aria-label="Weekly frequency for '+esc(layer.label)+'" min="0" max="7" step="1" value="'+p.weekly+'"></td></tr>';
    }).join('');
    const limits=Object.entries(labels).map(([id,name])=>'<label>'+name+
      '<input type="number" data-annual-limit="'+id+'" min="0" max="12" step="1" value="'+settings.limits[id]+'"><small>posts / day</small></label>').join('');
    const audience=Object.entries(choices).map(([field,options])=>
      '<fieldset><legend>'+{membership:'Member classes',gender:'Gender (voluntary)',place:'Location / visitors'}[field]+'</legend>'+
      options.map(([id,label])=>'<label><input type="checkbox" data-annual-audience="'+field+'" value="'+id+'"'+
        checked(settings.layers[selectedLayer].audience[field].includes(id))+'>'+esc(label)+'</label>').join('')+
      '</fieldset>').join('');
    const delivery=(mode,title)=>'<fieldset class="annual-destinations"><legend>'+title+'</legend>'+
      PUBLISHING_DESTINATIONS.map(platform=>'<label><input type="checkbox" data-annual-destination="'+mode+'" value="'+platform.id+'"'+
        checked(settings.delivery[mode].includes(platform.id))+'>'+esc(platform.label)+
        (platform.status==='proposed'?' (proposed)':'')+'</label>').join('')+'</fieldset>';
    return '<div class="annual-settings"><div class="annual-limits">'+limits+
      '<label>Video share target <input type="number" data-annual-video min="0" max="100" step="1" value="'+settings.videoShare+'"><small>% of posts</small></label></div>'+
      '<div class="annual-delivery"><h3>Publishing placements and advertising</h3>'+delivery('organic','Organic destinations')+
      '<label><input type="checkbox" data-annual-paid-planning'+checked(settings.delivery.paidPlanning)+'> Include paid-ad creative suggestions (approval required)</label>'+
      delivery('paid','Paid creative destinations')+
      '<p class="annual-small">Paid presets are only production briefs. Budgets, accounts, targeting permission, review and launch must be agreed separately. Straddie Noticeboard is a proposed outlet, not a connected advertising service.</p></div>'+
      '<div class="annual-pattern-table"><table><thead><tr><th>Pattern layer</th><th>Generate</th><th>Show</th><th>Per week</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="annual-audience"><label>Audience for <select data-annual-select-layer>'+
      CAMPAIGN_LAYERS.map(layer=>'<option value="'+layer.id+'"'+(selectedLayer===layer.id?' selected':'')+'>'+esc(layer.label)+'</option>').join('')+
      '</select></label>'+audience+'</div>'+
      '<p class="annual-small">NSW visits form a separate, smaller wave: two suggestions per week by default versus three for QLD breaks. Western NSW summer extensions receive up to one suggestion per week. Overlap never doubles the daily cap.</p>'+
      '<p class="annual-small">Audience categories guide content, not who can view public posts. Gender is voluntary and never inferred. No automated publishing is enabled.</p>'+
      '<div class="annual-actions"><button type="button" class="button" data-annual-save'+(busy?' disabled':'')+'>'+(reviewOnly?'Keep trial settings in this tab':'Save committee settings')+'</button>'+
      '<button type="button" class="button outline" data-annual-reload'+(busy?' disabled':'')+'>Reload saved settings</button></div></div>';
  }
  function preview(){
    if(!loaded)return '<p>Loading calendar…</p>';
    let plan;try{plan=generateCampaignYear(startMonth,settings);}catch(e){return '<p role="alert">'+esc(e.message)+'</p>';}
    lastPreview=plan;
    const months=Array.from({length:12},(_,i)=>nextMonth(startMonth,i));
    if(!months.includes(selectedMonth))selectedMonth=months[0];
    selectedDate=activeDay(selectedMonth,selectedDate);
    const filter={layer:layerFilter,channel:channelFilter,delivery:deliveryFilter};
    const visible=matchingPosts(plan.posts,settings,filter);
    const current=visible.filter(p=>p.date.startsWith(selectedMonth));
    const todayPosts=current.filter(p=>p.date===selectedDate);
    const nsw=plan.days.filter(d=>d.nswHoliday&&!d.holiday).length;
    const paidIdeas=plan.posts.filter(p=>p.creativeVariants.some(v=>v.distribution==='paid')).length;
    const monthDay=new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(selectedDate+'T00:00:00Z'));
    const info=plan.days.find(d=>d.date===selectedDate);
    const tags=[info?.holiday?'QLD school holiday':null,info?.nswHoliday?'NSW school holiday':null,info?.nswWesternOnly?'Western NSW extension':null].filter(Boolean);
    const detail= todayPosts.length?todayPosts.map(p=>{
      const local=editFor(p.id),variants=p.creativeVariants;
      return '<article class="annual-work-item"><p class="annual-small">'+esc(p.suggestedTime)+' AEST · '+esc(p.layerIds.join(' + '))+
        '</p><h4>'+esc(p.title)+'</h4><div class="annual-work-tags"><span>'+esc(p.format)+'</span><span>'+esc(p.size)+' ('+esc(p.aspectRatio)+')</span>'+
        (variants.some(v=>v.distribution==='paid')?'<span class="ad">Paid creative candidate only</span>':'')+'</div>'+
        '<p>'+esc(p.brief)+'</p><p class="annual-small"><strong>Audience:</strong> '+esc(audienceText(p.audience))+
        ' · <strong>CTA:</strong> '+esc(p.cta)+'</p>'+
        (p.storyboard.length?'<details><summary>30-second video storyboard</summary><p>'+esc(p.storyboard.join(' | '))+'</p></details>':'')+
        '<details class="annual-placement-detail"><summary>'+variants.length+' channel-specific production exports</summary><ul>'+
        variants.map(v=>'<li><strong>'+esc(v.platform)+' · '+esc(v.placement)+'</strong> · '+esc(v.asset)+' · '+esc(v.size)+' ('+esc(v.ratio)+')'+
          (v.provisional?' · NOT YET CONNECTED':'')+(v.distribution==='paid'?' · PAID CREATIVE / NOT AUTHORISED':'')+
          '<small>'+esc(v.fileFormats.join(', '))+(v.thumbnail?' · thumbnail '+v.thumbnail.width+' × '+v.thumbnail.height:'')+'</small>'+
          '<small>'+esc(v.safeZone.label)+(v.safeZone.topPixels?' ('+v.safeZone.topPixels+'px top; '+v.safeZone.bottomPixels+'px bottom; '+v.safeZone.sidePixels+'px sides)':'')+'</small>'+
          '<small>'+esc(v.checklist.join(' · '))+'</small><small>'+esc(v.approval)+'</small><small><a href="'+esc(v.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Specifications</a></small></li>').join('')+
        '</ul></details>'+
        '<label>Working status (local only)<select data-annual-status="'+esc(p.id)+'">'+WORKBENCH_STAGES.map(t=>
          '<option value="'+esc(t)+'"'+((local.status||'Idea')===t?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>'+
        '<label>Production notes (local only)<textarea rows="3" maxlength="4000" data-annual-note="'+esc(p.id)+'" placeholder="Footage, imagery, voiceover, editor, links, reminders…">'+esc(local.note||'')+'</textarea></label>'+
        '<button type="button" class="button outline small" data-annual-use="'+esc(p.id)+'">Open as draft</button></article>';
    }).join(''):'<p class="annual-small">No posts match the current filters on this day. Change a filter or choose another date.</p>';
    return '<div class="annual-preview">'+
      '<div class="annual-work-top"><h3>365-day social workbench</h3><p class="annual-small">Generated suggestions only · no automatic posts, ads, SMS or emails</p></div>'+
      '<div class="annual-stats"><span><strong>'+plan.totals.posts+'</strong> suggestions</span>'+
        '<span><strong>'+plan.totals.videos+'</strong> videos ('+Math.round(100*plan.totals.videos/Math.max(1,plan.totals.posts))+'%)</span>'+
        '<span><strong>'+plan.totals.combined+'</strong> composite videos</span>'+
        '<span><strong>'+nsw+'</strong> NSW-only visitor days</span>'+
        '<span><strong>'+paidIdeas+'</strong> paid creative candidates</span></div>'+
      '<div class="annual-work-filters">'+
        '<label>Planning year starts<input type="month" data-annual-start min="2026-01" max="2028-02" value="'+startMonth+'"></label>'+
        '<label>Month<select data-annual-month>'+months.map(m=>'<option value="'+m+'"'+(selectedMonth===m?' selected':'')+'>'+monthName(m)+'</option>').join('')+'</select></label>'+
        '<label>Pattern<select data-annual-filter="layer"><option value="all">All visible layers</option>'+CAMPAIGN_LAYERS.map(l=>
          '<option value="'+l.id+'"'+(layerFilter===l.id?' selected':'')+'>'+esc(l.label)+'</option>').join('')+'</select></label>'+
        '<label>Destination<select data-annual-filter="channel"><option value="all">All destinations</option>'+PUBLISHING_DESTINATIONS.map(p=>
          '<option value="'+p.id+'"'+(channelFilter===p.id?' selected':'')+'>'+esc(p.label)+'</option>').join('')+'</select></label>'+
        '<label>Placement<select data-annual-filter="delivery">'+[['all','Organic + ad ideas'],['organic','Organic available'],['paid','Paid creative candidates']].map(([v,n])=>
          '<option value="'+v+'"'+(deliveryFilter===v?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>'+
        '<button type="button" class="button small" data-annual-export>Export 365-day CSV</button>'+
        '<button type="button" class="button outline small" data-annual-reset-edits>Clear local notes</button>'+
      '</div>'+
      '<div class="annual-cal-legend"><span><i class="qld"></i> QLD school holidays</span><span><i class="nsw"></i> NSW school holidays</span><span><i class="weekend"></i> Fri–Sun peak</span></div>'+
      '<div class="annual-work-layout"><section class="annual-calendar-panel"><div class="annual-cal-heading"><h3>'+monthName(selectedMonth)+'</h3><span class="annual-small">'+current.length+' matching suggestions</span></div>'+
      renderCampaignCalendar({month:selectedMonth,dayCards:plan.days,posts:current,selectedDate,esc})+'</section>'+
      '<aside class="annual-detail-panel"><h3>'+esc(monthDay)+'</h3><p class="annual-small">'+tags.map(esc).join(' · ')+
        (tags.length?' · ':'')+todayPosts.length+' matching posts</p>'+detail+'</aside></div>'+
      '<div class="annual-month-grid">'+months.map(m=>'<button type="button" data-annual-go="'+m+'" aria-pressed="'+(selectedMonth===m)+'">'+monthName(m)+
        '<span>'+visible.filter(p=>p.date.startsWith(m)).length+' suggestions</span></button>').join('')+'</div>'+
      '<details class="annual-master-library"><summary>Media production presets ('+MASTER_ASSET_PRESETS.length+') and sources</summary><ul>'+
        MASTER_ASSET_PRESETS.map(a=>'<li><strong>'+esc(a.label)+'</strong> · '+a.width+' × '+a.height+' · '+esc(a.ratio)+'</li>').join('')+'</ul>'+
        '<p>Spec '+esc(CREATIVE_SPEC_VERSION.id)+' · '+esc(CREATIVE_SPEC_VERSION.reviewedOn)+'. Production presets, not hard upload requirements.</p>'+
        '<p>Sources: <a href="'+esc(placementSources.meta)+'" target="_blank" rel="noopener noreferrer">Meta</a> · <a href="'+esc(placementSources.googleAds)+'" target="_blank" rel="noopener noreferrer">Google Ads</a> · <a href="'+esc(placementSources.tiktok)+'" target="_blank" rel="noopener noreferrer">TikTok</a> · <a href="'+esc(placementSources.noticeboard)+'" target="_blank" rel="noopener noreferrer">Straddie Noticeboard proposal</a>.</p></details>'+
      '<p class="annual-small">Weather forecast, rules, species, fundraising, events and ad specifications require current verification before publication. Content statuses and notes here are local browser drafts; select Open as draft for the existing committee planner. No SMS automation.</p>'+
      '</div>';
  }
  function markup(){return '<section class="annual-root" data-annual-root aria-label="12-month social pattern planner"><details class="annual-planner" open>'+
      '<summary><strong>Annual pattern calendar</strong> · QLD + NSW holiday waves, 67% video-first</summary>'+
      '<p>Independent layer switches, frequency, audience and daily density. '+(reviewOnly?'This page is an isolated visual preview; it does not use member data, save to Cloudflare, or publish.':'Saving changes only the committee settings, never social accounts.')+'</p>'+
      (loaded?'<details class="annual-config"><summary>Pattern layers, frequencies, audience and platform settings</summary>'+controls()+'</details>':'<p>Loading committee settings…</p>')+preview()+
      '</details><p class="annual-small" data-annual-notice role="status" aria-live="polite">'+esc(notice)+'</p></section>';}
  function draw(){const pane=root();if(!pane)return;const isOpen=pane.querySelector('details')?.open??true;
    const configOpen=pane.querySelector('.annual-config')?.open??false;
    const replacement=document.createElement('div');replacement.innerHTML=markup();
    const next=replacement.firstElementChild;pane.replaceWith(next);next.querySelector('details').open=isOpen;
    if(next.querySelector('.annual-config'))next.querySelector('.annual-config').open=configOpen;
  }
  async function open(){
    if(loaded||busy||!isActive())return;
    busy=true;
    try{const row=await api(endpoint,{cache:'no-store'});
      if(!isActive())return;
      version=row.version;settings=row.settings||defaultCampaignSettings();saved=JSON.stringify(settings);loaded=true;restoreLocal();
      notice=reviewOnly?'Temporary preview settings loaded. No database or live club data is connected.':row.updatedAt?'Loaded saved settings from '+row.updatedAt.slice(0,10)+'.':'Default settings loaded; not yet shared.';
    }catch(e){notice='Could not load settings: '+e.message;}finally{busy=false;draw();}
  }
  async function save(){
    if(busy||!loaded||!isActive())return;
    busy=true;notice='Saving committee settings…';draw();
    try{const row=await api(endpoint,{method:'POST',body:JSON.stringify({version,settings})});
      if(!isActive())return;
      version=row.version;settings=row.settings;saved=JSON.stringify(settings);
      notice=reviewOnly?'Trial settings updated in this browser tab only; refreshing will reset them. No posts were published.':'Shared settings saved. No posts were published.';
    }catch(e){notice=e.status===409?'Someone else edited these settings. Reload the saved version before retrying.':e.message;}finally{busy=false;draw();}
  }
  function updateAudience(field,id,on){
    const existing=settings.layers[selectedLayer].audience[field];
    let list=id==='all'?['all']:on?[...existing.filter(v=>v!=='all'),id]:existing.filter(v=>v!==id);
    if(!list.length)list=['all'];
    settings.layers[selectedLayer].audience[field]=[...new Set(list)];
  }
  mount.addEventListener('change',event=>{
    if(!isActive()||!loaded||!event.target.closest('[data-annual-root]'))return;
    const e=event.target;
    if(e.hasAttribute('data-annual-enabled'))settings.layers[e.dataset.annualEnabled].enabled=e.checked;
    else if(e.hasAttribute('data-annual-visible'))settings.layers[e.dataset.annualVisible].visible=e.checked;
    else if(e.hasAttribute('data-annual-frequency'))settings.layers[e.dataset.annualFrequency].weekly=Math.max(0,Math.min(7,Number(e.value)||0));
    else if(e.hasAttribute('data-annual-limit'))settings.limits[e.dataset.annualLimit]=Math.max(0,Math.min(12,Number(e.value)||0));
    else if(e.hasAttribute('data-annual-video'))settings.videoShare=Math.max(0,Math.min(100,Number(e.value)||0));
    else if(e.hasAttribute('data-annual-paid-planning'))settings.delivery.paidPlanning=e.checked;
    else if(e.hasAttribute('data-annual-destination')){
      const mode=e.dataset.annualDestination,ids=settings.delivery[mode];
      settings.delivery[mode]=e.checked?[...new Set([...ids,e.value])]:ids.filter(id=>id!==e.value);
    }
    else if(e.hasAttribute('data-annual-select-layer'))selectedLayer=e.value;
    else if(e.hasAttribute('data-annual-audience'))updateAudience(e.dataset.annualAudience,e.value,e.checked);
    else if(e.hasAttribute('data-annual-start') && /^20\d{2}-(0[1-9]|1[0-2])$/.test(e.value)){startMonth=e.value;selectedMonth=startMonth;selectedDate=startMonth+'-01';restoreLocal();}
    else if(e.hasAttribute('data-annual-month')){selectedMonth=e.value;selectedDate=selectedMonth+'-01';}
    else if(e.hasAttribute('data-annual-filter')){
      if(e.dataset.annualFilter==='layer')layerFilter=e.value;
      if(e.dataset.annualFilter==='channel')channelFilter=e.value;
      if(e.dataset.annualFilter==='delivery')deliveryFilter=e.value;
    }
    else if(e.hasAttribute('data-annual-status')){localEdits[e.dataset.annualStatus]={...editFor(e.dataset.annualStatus),status:e.value};persistLocal();return;}
    notice=changed()?(reviewOnly?'Trial changes are unsaved. Keep them in this tab to try another layout.':'Unsaved changes. Select Save committee settings to share them.'):'Settings match the saved version.';
    draw();
  });
  mount.addEventListener('input',event=>{
    const field=event.target;if(!field.hasAttribute('data-annual-note')||!field.closest('[data-annual-root]'))return;
    localEdits[field.dataset.annualNote]={...editFor(field.dataset.annualNote),note:field.value};persistLocal();
  });
  mount.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||!b.closest('[data-annual-root]')||!isActive())return;
    if(b.hasAttribute('data-annual-save')){void save();return;}
    if(b.hasAttribute('data-annual-reload')){if(changed()&&!window.confirm('Discard unsaved pattern changes?'))return;loaded=false;void open();return;}
    if(b.hasAttribute('data-annual-go')){selectedMonth=b.dataset.annualGo;selectedDate=selectedMonth+'-01';draw();return;}
    if(b.hasAttribute('data-annual-day')){selectedDate=b.dataset.annualDay;draw();return;}
    if(b.hasAttribute('data-annual-reset-edits')){if(window.confirm('Clear locally saved statuses and notes for this planning year?')){localEdits={};persistLocal();draw();}return;}
    if(b.hasAttribute('data-annual-export')){
      if(!lastPreview)return;
      const csv=exportCampaignCSV(lastPreview.posts,localEdits),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='PLFC-social-workbench-'+startMonth+'-365-days.csv';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),10000);return;
    }
    if(b.hasAttribute('data-annual-use')){
      const post=lastPreview?.posts.find(p=>p.id===b.dataset.annualUse);if(!post)return;
      onUse({title:post.title,body:post.brief+'\n\nSuggested format: '+post.format+' ('+post.size+'). '+post.cta+'. Review creative exports in the annual planner before publication.',channels:post.channels,plannedDate:post.date});
    }
  });
  return {markup,open,reset(){loaded=false;busy=false;settings=defaultCampaignSettings();saved=JSON.stringify(settings);version=0;notice='';lastPreview=null;}};
}
