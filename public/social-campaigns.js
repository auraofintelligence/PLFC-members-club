import {CAMPAIGN_LAYERS,defaultCampaignSettings,generateCampaignYear,monthSettingsFor,copyMonthSettings} from './social-campaign-engine.js';
import {PUBLISHING_DESTINATIONS,placementSources,CREATIVE_SPEC_VERSION,MASTER_ASSET_PRESETS} from './social-placements.js';
import {LAYER_ICONS,renderMonthCalendar,renderCalendarDialog,postLabel,postBrief} from './social-visual-ui.js';

const endpoint='/api/committee/social-campaign-settings';
const choices={
  membership:[['all','All classes'],['adult','Adult'],['cadet','Cadet'],['junior','Junior'],['social','Social'],['casual','Casual'],['lifetime','Lifetime'],['prospect','Prospective']],
  gender:[['all','All genders'],['women','Women'],['men','Men'],['self-described','Other self-described']],
  place:[['all','All locations'],['local','Island locals'],['tourist','Tourists / visitors'],['regional','Regional / mainland']]
};
const checked=value=>value?' checked':'';
const nextMonth=(start,index)=>new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5))-1+index,1)).toISOString().slice(0,7);
const nextMonthValue=value=>nextMonth(value,1);
const monthName=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',month:'short',year:'numeric'}).format(new Date(value+'-01T00:00:00Z'));
const audienceText=selection=>Object.values(selection||{}).map(values=>values.join(', ')).join(' · ');
const csvDate=value=>value.slice(0,10);

export function setupAnnualCampaigns({mount,api,esc,isActive,onUse,reviewOnly=false}){
  let settings=defaultCampaignSettings(),saved=JSON.stringify(settings),version=0,loaded=false,busy=false,notice='';
  let selectedLayer='nswHolidays',startMonth=new Date(Date.now()+36000000).toISOString().slice(0,7),selectedMonth=startMonth;
  let lastPreview=null,monthDraft=null,batchMonth='',batchDirty=false;
  let modalDay=null,modalView='day',modalPostId=null,topicFilter='all',visiblePosts=[],postEdits={};
  const editKey=()=> 'plfc-social-post-edits-v1:'+startMonth+':'+(reviewOnly?'review':'committee');
  function loadEdits(){
    try{
      const item=JSON.parse(localStorage.getItem(editKey())||'{}');
      postEdits=item&&typeof item==='object'&&!Array.isArray(item)?item:{};
    }catch{postEdits={};}
  }
  function persistEdits(){
    try{localStorage.setItem(editKey(),JSON.stringify(postEdits));return true;}catch{return false;}
  }
  const getEdit=id=>postEdits[id]||{};
  function currentBatch(){
    if(!monthDraft||batchMonth!==selectedMonth){
      batchMonth=selectedMonth;
      monthDraft=copyMonthSettings(monthSettingsFor(settings,selectedMonth));
      batchDirty=false;
    }
    return monthDraft;
  }
  const previewSettings=()=>({...settings,monthOverrides:{...settings.monthOverrides,[selectedMonth]:currentBatch()}});
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

  function monthControls(){
    const batch=currentBatch();
    const range=(label,icon,attr,value,max,unit='')=>
      '<label class="annual-range-card"><span class="annual-range-heading"><span class="annual-range-label"><span aria-hidden="true">'+icon+'</span> '+esc(label)+'</span>'+
      '<output data-range-output="'+attr+'">'+value+unit+'</output></span>'+
      '<input type="range" min="0" max="'+max+'" step="1" '+(attr==='video'?'data-month-video': 'data-month-limit="'+attr+'"')+
      ' value="'+value+'" aria-label="'+esc(label)+'"></label>';
    const limits=Object.entries(labels).map(([id,label])=>range(label,{weekday:'☀️',friday:'✨',weekend:'🏖️',holiday:'🧳'}[id],id,batch.limits[id],12));
    const layers=CAMPAIGN_LAYERS.map(layer=>{
      const row=batch.layers[layer.id];
      return '<article class="annual-topic-card"><div class="annual-topic-top"><span class="annual-topic-icon" aria-hidden="true">'+(LAYER_ICONS[layer.id]||'📌')+'</span>'+
        '<strong>'+esc(layer.label)+'</strong></div>'+
        '<div class="annual-topic-toggles"><label><input type="checkbox" data-month-enabled="'+layer.id+'"'+checked(row.enabled)+'> Generate</label>'+
        '<label><input type="checkbox" data-month-visible="'+layer.id+'"'+checked(row.visible)+'> 👁 Show</label></div>'+
        '<label class="annual-topic-range"><span>Posts per week <output data-range-output="layer-'+layer.id+'">'+row.weekly+'</output></span>'+
        '<input type="range" min="0" max="7" step="1" data-month-weekly="'+layer.id+'" value="'+row.weekly+'"></label></article>';
    }).join('');
    const audience=Object.entries(choices).map(([field,options])=>
      '<fieldset><legend>'+{membership:'Membership class',gender:'Gender (voluntary)',place:'Location and visitors'}[field]+'</legend>'+
      options.map(([id,label])=>'<label><input data-month-audience="'+field+'" type="checkbox" value="'+id+'"'+
        checked(batch.layers[selectedLayer].audience[field].includes(id))+'>'+esc(label)+'</label>').join('')+'</fieldset>').join('');
    const destinations=(mode,label)=>'<fieldset class="annual-destinations"><legend>'+label+'</legend>'+
      PUBLISHING_DESTINATIONS.map(c=>'<label><input type="checkbox" data-month-destination="'+mode+'" value="'+c.id+'"'+
        checked(batch.delivery[mode].includes(c.id))+'>'+esc(c.label)+(c.status==='proposed'?' (proposed)':'')+'</label>').join('')+'</fieldset>';
    return '<section class="annual-batch" aria-label="Monthly batch controls">'+
      '<header class="annual-batch-head"><div><span class="annual-eyebrow">🎛️ CREATE THE MONTH</span>'+
      '<h2>Tune '+monthName(selectedMonth)+'</h2></div>'+
      '<span class="annual-batch-status">'+((settings.monthOverrides||{})[selectedMonth]?'Custom month':'Annual defaults')+
      (batchDirty?' · unsaved changes':'')+'</span></header>'+
      '<div class="annual-slider-grid">'+range('Video share','🎬','video',batch.videoShare,100,'%')+limits.join('')+'</div>'+
      '<details class="annual-batch-layer-options"><summary><span>🐟 Topics, frequency and audiences</span><small>16 adjustable categories</small></summary>'+
      '<div class="annual-topic-grid">'+layers+'</div>'+
      '<div class="annual-audience"><label>Audience settings for <select data-month-select-layer>'+
      CAMPAIGN_LAYERS.map(layer=>'<option value="'+layer.id+'"'+(selectedLayer===layer.id?' selected':'')+'>'+esc(layer.label)+'</option>').join('')+
      '</select></label>'+audience+'</div></details>'+
      '<details class="annual-batch-platform-options"><summary><span>📱 Publishing formats and ad ideas</span><small>5 destinations</small></summary>'+
      destinations('organic','Organic destinations')+
      '<label class="annual-batch-check"><input type="checkbox" data-month-paid-planning'+checked(batch.delivery.paidPlanning)+'> Include paid creative suggestions</label>'+
      destinations('paid','Paid creative destinations')+'</details>'+
      '<div class="annual-actions"><button type="button" class="button" data-month-apply'+(busy?' disabled':'')+'>✓ Save '+monthName(selectedMonth)+'</button>'+
      '<button type="button" class="button outline" data-month-copy-next'+(busy?' disabled':'')+'>Copy to next month</button>'+
      '<button type="button" class="button outline" data-month-reset'+(busy?' disabled':'')+'>Reset month</button></div>'+
      '<p class="annual-small">Monthly changes update suggested content only. Existing posts are not overwritten.</p></section>';
  }

  function preview(){
    if(!loaded)return '<p class="annual-loading" role="status">Preparing your calendar…</p>';
    const months=Array.from({length:12},(_,i)=>nextMonth(startMonth,i));
    if(!months.includes(selectedMonth)){selectedMonth=months[0];monthDraft=null;batchMonth='';}
    const scoped=previewSettings();
    let plan;try{plan=generateCampaignYear(startMonth,scoped);}catch(e){return '<p role="alert">'+esc(e.message)+'</p>';}
    lastPreview=plan;
    const allVisible=plan.posts.filter(p=>p.layerIds.some(id=>monthSettingsFor(scoped,p.date).layers[id]?.visible));
    visiblePosts=topicFilter==='all'?allVisible:allVisible.filter(p=>p.layerIds.includes(topicFilter));
    const current=visiblePosts.filter(p=>p.date.startsWith(selectedMonth));
    const monthDays=plan.days.filter(day=>day.date.startsWith(selectedMonth));
    const qld=monthDays.filter(day=>day.holiday).length,nsw=monthDays.filter(day=>day.nswHoliday).length;
    const videoCount=current.filter(p=>p.durationSeconds).length,composites=current.filter(p=>p.composite).length;
    const i=months.indexOf(selectedMonth);
    const choice=months.map(m=>'<option value="'+m+'"'+(m===selectedMonth?' selected':'')+'>'+monthName(m)+'</option>').join('');
    const stat=(icon,value,label)=>'<div class="annual-stat-card"><span class="annual-stat-icon" aria-hidden="true">'+icon+'</span>'+
      '<div><strong>'+value+'</strong><span>'+esc(label)+'</span></div></div>';
    const master='<details class="annual-master-library"><summary>📐 Production sizes and export standards</summary>'+
      '<p>Export from high-resolution source assets. Format guidance is version '+esc(CREATIVE_SPEC_VERSION.id)+'.</p><ul>'+
      MASTER_ASSET_PRESETS.map(a=>'<li><strong>'+esc(a.label)+'</strong> · '+a.width+' × '+a.height+' · '+esc(a.ratio)+'</li>').join('')+
      '</ul><p><a href="'+esc(placementSources.meta)+'" target="_blank" rel="noopener noreferrer">Meta</a> · '+
      '<a href="'+esc(placementSources.googleAds)+'" target="_blank" rel="noopener noreferrer">Google Ads</a> · '+
      '<a href="'+esc(placementSources.tiktok)+'" target="_blank" rel="noopener noreferrer">TikTok</a> · '+
      '<a href="'+esc(placementSources.noticeboard)+'" target="_blank" rel="noopener noreferrer">Noticeboard</a></p></details>';
    return '<div class="annual-preview">'+
      '<div class="annual-month-toolbar"><div><span class="annual-eyebrow">YOUR CONTENT STUDIO · 365-DAY PLAN</span>'+
      '<h2>'+monthName(selectedMonth)+'</h2><p>Choose a day to see what you could share.</p></div>'+
      '<div class="annual-month-navigation"><button type="button" data-annual-step="-1" aria-label="Previous month"'+(i===0?' disabled':'')+'>‹</button>'+
      '<label class="sr-only" for="annual-month-picker">Choose a month</label>'+
      '<select id="annual-month-picker" data-annual-month>'+choice+'</select>'+
      '<button type="button" data-annual-step="1" aria-label="Next month"'+(i===months.length-1?' disabled':'')+'>›</button></div></div>'+
      '<div class="annual-visual-stats">'+stat('🗓️',current.length,'Post ideas')+
      stat('🎬',videoCount+' / '+current.length,'Video ideas')+
      stat('🔗',composites,'Combined topics')+
      stat('🏖️',qld+(nsw?' + '+nsw:''),'QLD / NSW holiday days')+'</div>'+
      '<section class="annual-calendar-shell" aria-label="Click-to-open monthly calendar">'+
      '<div class="annual-calendar-header"><div><h3>📅 Calendar</h3><p>Tap any date for a quick brief. Open a post to edit or explore.</p></div>'+
      '<label class="annual-calendar-filter">Topic <select data-annual-topic>'+
      '<option value="all">All topics</option>'+CAMPAIGN_LAYERS.map(l=>'<option value="'+l.id+'"'+(topicFilter===l.id?' selected':'')+'>'+
      esc((LAYER_ICONS[l.id]||'📌')+' '+l.label)+'</option>').join('')+'</select></label></div>'+
      renderMonthCalendar({month:selectedMonth,days:plan.days,posts:current,esc})+
      '<div class="annual-calendar-legend"><span><i class="qld"></i> Queensland holidays</span>'+
      '<span><i class="nsw"></i> NSW holidays</span><span>🎬 Video &nbsp; 🐟 Topic icons</span></div></section>'+
      monthControls()+
      '<details class="annual-year-overview"><summary>🗓️ Browse all 12 months <small>'+plan.totals.posts+' planned suggestions</small></summary>'+
      '<div class="annual-month-grid">'+months.map(m=>'<button type="button" data-annual-go="'+m+'" aria-pressed="'+(selectedMonth===m)+'">'+
      monthName(m)+'<span>'+allVisible.filter(p=>p.date.startsWith(m)).length+' ideas</span></button>').join('')+'</div>'+
      '<label class="annual-start-choice">Year begins <input type="month" data-annual-start min="2026-01" max="2028-02" value="'+startMonth+'"></label></details>'+
      master+
      '<p class="annual-small annual-footer-guidance">Ideas are drafts. Check dates, permissions, fishing rules and current conditions before publishing.</p></div>';
  }

  function markup(){return '<section class="annual-root" data-annual-root aria-label="12-month social pattern planner"><details class="annual-planner" open>'+
      '<summary><strong>Annual pattern calendar</strong> · QLD + NSW holiday waves, 67% video-first</summary>'+
      '<p>Independent layer switches, frequency, audience and daily density. '+(reviewOnly?'This page is an isolated visual preview; it does not use member data, save to Cloudflare, or publish.':'Saving changes only the committee settings, never social accounts.')+'</p>'+
      (loaded?'<details class="annual-default-settings"><summary>Global annual defaults</summary>'+controls()+'</details>':'<p>Loading committee settings…</p>')+preview()+
      '</details><p class="annual-small" data-annual-notice role="status" aria-live="polite">'+esc(notice)+'</p></section>';}
  function draw(){const pane=root();if(!pane)return;const isOpen=pane.querySelector('details')?.open??true;
    const monthlyLayersOpen=pane.querySelector('.annual-batch-layer-options')?.open??false;
    const monthlyPlatformsOpen=pane.querySelector('.annual-batch-platform-options')?.open??false;
    const globalOpen=pane.querySelector('.annual-default-settings')?.open??false;
    const replacement=document.createElement('div');replacement.innerHTML=markup();
    const next=replacement.firstElementChild;pane.replaceWith(next);next.querySelector('details').open=isOpen;
    for(const [selector,open] of [['.annual-batch-layer-options',monthlyLayersOpen],['.annual-batch-platform-options',monthlyPlatformsOpen],['.annual-default-settings',globalOpen]]){
      const panel=next.querySelector(selector);if(panel)panel.open=open;
    }
  }
  async function open(){
    if(loaded||busy||!isActive())return;
    busy=true;
    try{const row=await api(endpoint,{cache:'no-store'});
      if(!isActive())return;
      version=row.version;settings=row.settings||defaultCampaignSettings();settings.monthOverrides??={};saved=JSON.stringify(settings);loaded=true;monthDraft=null;batchMonth='';
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
    const batch=e.hasAttribute('data-month-video')||e.hasAttribute('data-month-limit')||
      e.hasAttribute('data-month-enabled')||e.hasAttribute('data-month-visible')||
      e.hasAttribute('data-month-weekly')||e.hasAttribute('data-month-audience')||
      e.hasAttribute('data-month-select-layer')||e.hasAttribute('data-month-destination')||
      e.hasAttribute('data-month-paid-planning');
    if(batch){
      const current=currentBatch();
      if(e.hasAttribute('data-month-video'))current.videoShare=Math.max(0,Math.min(100,Number(e.value)||0));
      else if(e.hasAttribute('data-month-limit'))current.limits[e.dataset.monthLimit]=Math.max(0,Math.min(12,Number(e.value)||0));
      else if(e.hasAttribute('data-month-enabled'))current.layers[e.dataset.monthEnabled].enabled=e.checked;
      else if(e.hasAttribute('data-month-visible'))current.layers[e.dataset.monthVisible].visible=e.checked;
      else if(e.hasAttribute('data-month-weekly'))current.layers[e.dataset.monthWeekly].weekly=Math.max(0,Math.min(7,Number(e.value)||0));
      else if(e.hasAttribute('data-month-select-layer'))selectedLayer=e.value;
      else if(e.hasAttribute('data-month-paid-planning'))current.delivery.paidPlanning=e.checked;
      else if(e.hasAttribute('data-month-destination')){
        const k=e.dataset.monthDestination;
        current.delivery[k]=e.checked?[...new Set([...current.delivery[k],e.value])]:current.delivery[k].filter(x=>x!==e.value);
      }else if(e.hasAttribute('data-month-audience')){
        const k=e.dataset.monthAudience,existing=current.layers[selectedLayer].audience[k];
        const next=e.value==='all'?['all']:e.checked?[...existing.filter(x=>x!=='all'),e.value]:existing.filter(x=>x!==e.value);
        current.layers[selectedLayer].audience[k]=next.length?[...new Set(next)]:['all'];
      }
      batchDirty=true;notice='Previewing '+monthName(selectedMonth)+' adjustments. Choose Apply and save to keep this month.';
      draw();return;
    }
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
    else if(e.hasAttribute('data-annual-start') && /^20\d{2}-(0[1-9]|1[0-2])$/.test(e.value)){
      if(batchDirty&&!window.confirm('Discard unapplied changes to this month?')){draw();return;}
      startMonth=e.value;selectedMonth=startMonth;monthDraft=null;batchMonth='';
    }
    else if(e.hasAttribute('data-annual-month')){
      if(batchDirty&&!window.confirm('Discard unapplied changes to this month?')){draw();return;}
      selectedMonth=e.value;monthDraft=null;batchMonth='';
    }
    if(!batchDirty && !settings.monthOverrides[selectedMonth]){monthDraft=null;batchMonth='';}
    notice=changed()?(reviewOnly?'Trial changes are unsaved. Keep them in this tab to try another layout.':'Unsaved changes. Select Save committee settings to share them.'):'Settings match the saved version.';
    draw();
  });
  mount.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||!b.closest('[data-annual-root]')||!isActive())return;
    if(b.hasAttribute('data-month-apply')){
      settings.monthOverrides[selectedMonth]=copyMonthSettings(currentBatch());
      batchDirty=false;void save();return;
    }
    if(b.hasAttribute('data-month-copy-next')){
      const nextMonth=nextMonthValue(selectedMonth);
      settings.monthOverrides[selectedMonth]=copyMonthSettings(currentBatch());
      settings.monthOverrides[nextMonth]=copyMonthSettings(currentBatch());
      batchDirty=false;notice='Applied '+monthName(selectedMonth)+' and copied its settings to '+monthName(nextMonth)+'.';
      void save();return;
    }
    if(b.hasAttribute('data-month-reset')){
      delete settings.monthOverrides[selectedMonth];monthDraft=copyMonthSettings(settings);
      batchDirty=false;void save();return;
    }
    if(b.hasAttribute('data-annual-save')){void save();return;}
    if(b.hasAttribute('data-annual-reload')){if(changed()&&!window.confirm('Discard unsaved pattern changes?'))return;loaded=false;void open();return;}
    if(b.hasAttribute('data-annual-go')){
      if(batchDirty&&!window.confirm('Discard unapplied changes to this month?'))return;
      selectedMonth=b.dataset.annualGo;monthDraft=null;batchMonth='';draw();return;
    }
    if(b.hasAttribute('data-annual-use')){
      const post=lastPreview?.posts.find(p=>p.id===b.dataset.annualUse);if(!post)return;
      onUse({title:post.title,body:post.brief+'\n\nSuggested format: '+post.format+' ('+post.size+'). '+post.cta+'. Review creative exports in the annual planner before publication.',channels:post.channels,plannedDate:post.date});
    }
  });
  return {markup,open,reset(){loaded=false;busy=false;settings=defaultCampaignSettings();saved=JSON.stringify(settings);version=0;notice='';lastPreview=null;}};
}
