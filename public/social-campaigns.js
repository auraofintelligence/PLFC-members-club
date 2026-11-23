import {CAMPAIGN_LAYERS,defaultCampaignSettings,generateCampaignYear,monthSettingsFor,copyMonthSettings,weekStart,settingsForDate,scopeSettingsFor} from './social-campaign-engine.js';
import {PUBLISHING_DESTINATIONS,placementSources,CREATIVE_SPEC_VERSION,MASTER_ASSET_PRESETS} from './social-placements.js';
import {LAYER_ICONS,renderMonthCalendar,renderCalendarDialog,postLabel,postBrief,postTime,isMinuteTime,brisbaneToday} from './social-visual-ui.js';
import {renderTimingPanel,renderAnalyticsPanel} from './social-insights-ui.js';
import {parseDelimited,suggestedMapping,metricFromRow,linkMetrics,latestMetrics,summarizeMetrics,planMetricsCSV} from './social-performance.js';

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
  let planningScope='month',focusDay=brisbaneToday();
  let modalDay=null,modalView='day',modalPostId=null,topicFilter='all',visiblePosts=[],postEdits={};
  let metrics=[],pendingReport=null,metricsPlatform='facebook',metricsNotice='',editingMilestone='';
  const metricsKey=()=> 'plfc-social-performance-v1:'+(reviewOnly?'review':'committee');
  const importMetrics=()=>{try{const data=JSON.parse(localStorage.getItem(metricsKey())||'[]');metrics=Array.isArray(data)?data.slice(0,15000):[];}catch{metrics=[];}};
  const storeMetrics=()=>{try{localStorage.setItem(metricsKey(),JSON.stringify(metrics));return true;}catch{return false;}};
  const linkedMetrics=()=>linkMetrics(metrics,lastPreview?.posts||[],postEdits);
  const metricsForPost=id=>latestMetrics(linkedMetrics()).filter(m=>m.matchedPostId===id);
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
  const overrideBucket=()=>({day:'dayOverrides',week:'weekOverrides',month:'monthOverrides'})[planningScope];
  const scopeKey=()=>planningScope==='day'?focusDay:planningScope==='week'?weekStart(focusDay):selectedMonth;
  const scopeLabel=()=>planningScope==='month'?monthName(selectedMonth):
    planningScope==='week'?'week of '+new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(scopeKey()+'T00:00:00Z')):
    new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(focusDay+'T00:00:00Z'));
  const scopeEnd=()=>{
    const offset=planningScope==='day'?1:planningScope==='week'?7:null;
    if(offset===null)return nextMonth(selectedMonth,1);
    return new Date(Date.parse(scopeKey()+'T00:00:00Z')+86400000*offset).toISOString().slice(0,10);
  };
  function currentBatch(){
    const key=planningScope+':'+scopeKey();
    if(!monthDraft||batchMonth!==key){
      batchMonth=key;
      monthDraft=copyMonthSettings(scopeSettingsFor(settings,planningScope,scopeKey()));
      batchDirty=false;
    }
    return monthDraft;
  }
  const previewSettings=()=>({...settings,[overrideBucket()]:{...settings[overrideBucket()],[scopeKey()]:currentBatch()}});
  const selectMonth=month=>{
    selectedMonth=month;
    if(!focusDay.startsWith(month))focusDay=(brisbaneToday().startsWith(month)?brisbaneToday():month+'-01');
    monthDraft=null;batchMonth='';modalDay=null;modalPostId=null;modalView='day';
  };
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
    const chosen=scopeKey(),bucket=overrideBucket();
    const scopes=[['day','Day'],['week','Week'],['month','Month']].map(([id,label])=>
      '<button type="button" data-planning-scope="'+id+'" aria-pressed="'+(planningScope===id)+'">'+label+'</button>').join('');
    const range=(label,icon,attr,value,max,unit='')=>
      '<label class="annual-range-card"><span class="annual-range-heading"><span class="annual-range-label"><span aria-hidden="true">'+icon+'</span> '+esc(label)+'</span>'+
      '<output data-range-output="'+attr+'">'+value+unit+'</output></span>'+
      '<input type="range" min="'+(attr==='video'?0:1)+'" max="'+max+'" step="1" '+(attr==='video'?'data-month-video': 'data-month-limit="'+attr+'"')+
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
    return '<section class="annual-batch" id="annual-plan-settings" aria-label="Day, week or month planning controls">'+
      '<header class="annual-batch-head"><div><span class="annual-eyebrow">🎛️ PLAN YOUR POSTS</span>'+
      '<h2>Plan '+esc(scopeLabel())+'</h2></div>'+
      '<span class="annual-batch-status">'+((settings[bucket]||{})[chosen]?'Custom schedule':'Annual defaults')+
      (batchDirty?' · unsaved changes':'')+'</span></header>'+
      '<div class="annual-scope-toolbar"><div class="annual-scope-buttons" aria-label="Choose planning period">'+scopes+'</div>'+
      '<label>Day to plan <input type="date" data-scope-day value="'+focusDay+'" min="'+startMonth+'-01" max="'+new Date(Date.UTC(Number(startMonth.slice(0,4))+1,Number(startMonth.slice(5))-1,0)).toISOString().slice(0,10)+'"></label></div>'+
      '<div class="annual-time-default"><label>🕒 First post time (Brisbane AEST)'+
      '<input type="time" step="60" data-scope-time value="'+(batch.postingTime==='auto'?'':esc(batch.postingTime))+'"></label>'+
      '<button type="button" data-scope-auto class="button outline small">Use suggested times</button>'+
      '<span>Choose any hour and minute. Further posts are staggered; individual times can be edited in each post.</span></div>'+
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
      '<div class="annual-actions"><button type="button" class="button" data-month-apply'+(busy?' disabled':'')+'>✓ Save '+esc(scopeLabel())+'</button>'+
      '<button type="button" class="button outline" data-month-copy-next'+(busy?' disabled':'')+'>Copy to next '+planningScope+'</button>'+
      '<button type="button" class="button outline" data-month-reset'+(busy?' disabled':'')+'>Reset '+planningScope+'</button></div>'+
      '<p class="annual-small">Monthly changes update suggested content only. Existing posts are not overwritten.</p></section>';
  }

  function preview(){
    if(!loaded)return '<p class="annual-loading" role="status">Preparing your calendar…</p>';
    const months=Array.from({length:12},(_,i)=>nextMonth(startMonth,i));
    if(!months.includes(selectedMonth))selectMonth(months[0]);
    const scoped=previewSettings();
    let plan;try{plan=generateCampaignYear(startMonth,scoped);}catch(e){return '<p role="alert">'+esc(e.message)+'</p>';}
    lastPreview=plan;
    const allVisible=plan.posts.filter(p=>p.layerIds.includes('daily')||p.layerIds.some(id=>settingsForDate(scoped,p.date).layers[id]?.visible));
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
      '<div class="annual-visual-stats">'+stat('🗓️',current.length,'Posts this month')+
      stat('🎬',videoCount+' / '+current.length,'Video ideas')+
      stat('🔗',composites,'Combined topics')+
      stat('🏖️',qld+(nsw?' + '+nsw:''),'QLD / NSW holiday days')+'</div>'+
      '<section class="annual-calendar-shell" aria-label="Click-to-open monthly calendar">'+
      '<div class="annual-calendar-header"><div><h3>📅 Calendar</h3><p>Tap any date for a quick brief. Open a post to edit or explore.</p></div>'+
      '<label class="annual-calendar-filter">Topic <select data-annual-topic>'+
      '<option value="all">All topics</option>'+CAMPAIGN_LAYERS.map(l=>'<option value="'+l.id+'"'+(topicFilter===l.id?' selected':'')+'>'+
      esc((LAYER_ICONS[l.id]||'📌')+' '+l.label)+'</option>').join('')+'</select></label></div>'+
      renderMonthCalendar({month:selectedMonth,days:plan.days,posts:current,esc,metricsForPost})+
      '<div class="annual-calendar-legend"><span class="annual-legend-today">● Today</span>'+
      '<span class="annual-legend-past">◐ Past</span><span class="annual-legend-future">○ Future</span>'+
      '<span><i class="qld"></i> QLD holidays</span><span><i class="nsw"></i> NSW holidays</span></div></section>'+
      '<div class="annual-schedule-export"><span>🕒 Every day has a plan. Open a date to set exact posting times.</span>'+
      '<button type="button" class="button outline small" data-calendar-export>⬇ Export this month’s schedule CSV</button></div>'+
      monthControls()+
      '<details class="annual-year-overview"><summary>🗓️ Browse all 12 months <small>'+plan.totals.posts+' planned suggestions</small></summary>'+
      '<div class="annual-month-grid">'+months.map(m=>'<button type="button" data-annual-go="'+m+'" aria-pressed="'+(selectedMonth===m)+'">'+
      monthName(m)+'<span>'+allVisible.filter(p=>p.date.startsWith(m)).length+' ideas</span></button>').join('')+'</div>'+
      '<label class="annual-start-choice">Year begins <input type="month" data-annual-start min="2026-01" max="2028-02" value="'+startMonth+'"></label></details>'+
      master+
      '<p class="annual-small annual-footer-guidance">Ideas are drafts. Check dates, permissions, fishing rules and current conditions before publishing.</p></div>';
  }

  function markup(){
    const visual=preview();
    const performanceRows=linkedMetrics();
    const current=visiblePosts.filter(p=>p.date.startsWith(selectedMonth));
    const analytics=renderAnalyticsPanel({
      summary:summarizeMetrics(performanceRows,current),
      unlinked:performanceRows.filter(m=>!m.matchedPostId),
      recordCount:metrics.length,headers:pendingReport?.headers||[],
      mapping:pendingReport?.mapping||{},platform:metricsPlatform,filename:pendingReport?.filename||'',
      notice:metricsNotice,posts:current,esc
    });
    const signals=renderTimingPanel(settings,esc,editingMilestone);
    const popup=renderCalendarDialog({day:modalDay,view:modalView,postId:modalPostId,
      posts:visiblePosts,plan:lastPreview,esc,getEdit,reviewOnly,metricsForPost});
    return '<section class="annual-root" data-annual-root aria-label="12-month social workbench">'+
      '<details class="annual-planner" open><summary><strong>📅 Social media workbench</strong> · 12-month plan</summary>'+
      visual+(loaded?signals+analytics:'')+
      (loaded?'<details class="annual-default-settings"><summary>⚙️ Global annual defaults</summary>'+controls()+'</details>':'')+
      '</details><p class="annual-small" data-annual-notice role="status" aria-live="polite">'+esc(notice)+'</p>'+
      popup+'</section>';
  }
  function draw(){
    const pane=root();if(!pane)return;
    const states={};
    for(const cls of ['annual-planner','annual-batch-layer-options','annual-batch-platform-options',
      'annual-default-settings','annual-year-overview','annual-master-library','annual-signals','annual-analytics']){
      states[cls]=pane.querySelector('.'+cls)?.open??(cls==='annual-planner');
    }
    const temp=document.createElement('div');temp.innerHTML=markup();
    const next=temp.firstElementChild;pane.replaceWith(next);
    for(const [cls,open] of Object.entries(states)){
      const panel=next.querySelector('.'+cls);if(panel)panel.open=open;
    }
    if(modalDay){
      const dialog=next.querySelector('[data-annual-day-dialog]');
      if(dialog && !dialog.open)dialog.showModal();
    }
  }
  async function open(){
    if(loaded||busy||!isActive())return;
    busy=true;
    try{const row=await api(endpoint,{cache:'no-store'});
      if(!isActive())return;
      version=row.version;settings=row.settings||defaultCampaignSettings();settings.monthOverrides??={};settings.weekOverrides??={};settings.dayOverrides??={};
      settings.postingTime??='auto';settings.timingSignals??=defaultCampaignSettings().timingSignals;
      settings.milestones??=[];saved=JSON.stringify(settings);loaded=true;monthDraft=null;batchMonth='';
      loadEdits();importMetrics();
      notice=reviewOnly?'Temporary preview settings loaded. No database or live club data is connected.':row.updatedAt?'Loaded saved settings from '+row.updatedAt.slice(0,10)+'.':'Default settings loaded; not yet shared.';
    }catch(e){notice='Could not load settings: '+e.message;}finally{busy=false;draw();}
  }
  async function save(){
    if(busy||!loaded||!isActive())return;
    busy=true;notice='Saving committee settings…';draw();
    try{const row=await api(endpoint,{method:'POST',body:JSON.stringify({version,settings})});
      if(!isActive())return;
      version=row.version;settings=row.settings;settings.monthOverrides??={};settings.weekOverrides??={};
      settings.dayOverrides??={};settings.timingSignals??=defaultCampaignSettings().timingSignals;
      settings.milestones??=[];saved=JSON.stringify(settings);
      notice=reviewOnly?'Trial settings updated in this browser tab only; refreshing will reset them. No posts were published.':'Shared settings saved. No posts were published.';
    }catch(e){notice=e.status===409?'Someone else edited these settings. Reload the saved version before retrying.':e.message;}finally{busy=false;draw();}
  }
  function updateAudience(field,id,on){
    const existing=settings.layers[selectedLayer].audience[field];
    let list=id==='all'?['all']:on?[...existing.filter(v=>v!=='all'),id]:existing.filter(v=>v!==id);
    if(!list.length)list=['all'];
    settings.layers[selectedLayer].audience[field]=[...new Set(list)];
  }
  function exportSchedule(){
    if(!lastPreview)return;
    const columns=['post_id','date','time_AEST','time_zone','title','content_format','channels','status','brief','notes','lead_signal_kind','lead_days','views','likes','comments','shares','saves','clicks'];
    const rows=lastPreview.posts.filter(p=>p.date.startsWith(selectedMonth)).map(p=>{
      const edit=getEdit(p.id);
      const item={
        post_id:p.id,date:p.date,time_AEST:postTime(p,edit),time_zone:'Australia/Brisbane',
        title:postLabel(p,edit),content_format:p.format,channels:p.channels.join('|'),status:edit.status||'Idea',
        brief:postBrief(p,edit),notes:edit.notes||'',
        lead_signal_kind:p.timingSignal?.kind||'',lead_days:p.timingSignal?.leadDays??'',
        views:edit.metrics?.views??'',likes:edit.metrics?.likes??'',comments:edit.metrics?.comments??'',
        shares:edit.metrics?.shares??'',saves:edit.metrics?.saves??'',clicks:edit.metrics?.clicks??''
      };
      return columns.map(key=>{
        let cell=String(item[key]??'').replace(/\r?\n/g,' ');
        if(/^\s*[=+@-]/.test(cell))cell="'"+cell;
        return '"'+cell.replaceAll('"','""')+'"';
      }).join(',');
    });
    const csv='\uFEFF'+[columns.join(','),...rows].join('\r\n');
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    link.href=url;link.download='plfc-social-schedule-'+selectedMonth+'.csv';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    notice='Exported '+rows.length+' posts for '+monthName(selectedMonth)+'. Times use Brisbane AEST.';
  }

  mount.addEventListener('change',async event=>{
    const file=event.target;
    if(!file.hasAttribute('data-metric-file'))return;
    const chosen=file.files?.[0];
    if(!chosen)return;
    try{
      if(chosen.size>3_000_000)throw Error('Choose a CSV file smaller than 3 MB.');
      const parsed=parseDelimited(await chosen.text());
      pendingReport={...parsed,filename:chosen.name,mapping:suggestedMapping(parsed.headers)};
      metricsNotice='Loaded '+parsed.rows.length+' report rows. Check the column mapping before importing.';
    }catch(err){pendingReport=null;metricsNotice=err.message;}
    draw();
  });
  mount.addEventListener('input',event=>{
    const target=event.target;
    const key=target.hasAttribute('data-month-video')?'video':
      target.hasAttribute('data-month-limit')?target.dataset.monthLimit:
      target.hasAttribute('data-month-weekly')?'layer-'+target.dataset.monthWeekly:null;
    if(!key)return;
    const output=target.closest('label')?.querySelector('[data-range-output]');
    if(output)output.textContent=target.value+(key==='video'?'%':'');
  });
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
    if(e.hasAttribute('data-metric-platform')){metricsPlatform=e.value;draw();return;}
    if(e.hasAttribute('data-metric-map')){
      if(pendingReport)pendingReport.mapping[e.dataset.metricMap]=e.value;
      draw();return;
    }
    if(e.hasAttribute('data-signal-enabled')){
      settings.timingSignals[e.dataset.signalEnabled].enabled=e.checked;draw();return;
    }
    if(e.hasAttribute('data-signal-leads')){
      const raw=e.value.trim(),values=raw?raw.split(',').map(x=>Number(x.trim())):[];
      if(values.length>12||values.some(n=>!Number.isInteger(n)||n<1||n>365)||new Set(values).size!==values.length){
        notice='Lead-in values must be unique numbers from 1 to 365, separated by commas.';draw();return;
      }
      settings.timingSignals[e.dataset.signalLeads].leadDays=values.sort((a,b)=>b-a);
      notice='Timing signals updated. Save the timing patterns to keep them.';draw();return;
    }
    if(e.hasAttribute('data-scope-day')){
      if(batchDirty&&!window.confirm('Discard unapplied planning changes?')){draw();return;}
      focusDay=e.value;selectedMonth=focusDay.slice(0,7);monthDraft=null;batchMonth='';draw();return;
    }
    if(e.hasAttribute('data-scope-time')){
      if(e.value && !isMinuteTime(e.value)){notice='Choose a valid Brisbane time (HH:MM).';draw();return;}
      currentBatch().postingTime=e.value||'auto';batchDirty=true;draw();return;
    }
    if(e.hasAttribute('data-annual-topic')){
      topicFilter=e.value;draw();return;
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
      startMonth=e.value;selectMonth(startMonth);loadEdits();
    }
    else if(e.hasAttribute('data-annual-month')){
      if(batchDirty&&!window.confirm('Discard unapplied changes to this month?')){draw();return;}
      selectMonth(e.value);
    }
    if(!batchDirty && !settings[overrideBucket()]?.[scopeKey()]){monthDraft=null;batchMonth='';}
    notice=changed()?(reviewOnly?'Trial changes are unsaved. Keep them in this tab to try another layout.':'Unsaved changes. Select Save committee settings to share them.'):'Settings match the saved version.';
    draw();
  });
  mount.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||!b.closest('[data-annual-root]')||!isActive())return;
    if(b.hasAttribute('data-signal-save')){void save();return;}
    if(b.hasAttribute('data-milestone-cancel')){editingMilestone='';draw();return;}
    if(b.hasAttribute('data-signal-edit')){
      editingMilestone=b.dataset.signalEdit;draw();return;
    }
    if(b.hasAttribute('data-signal-remove')){
      if(!window.confirm('Remove this timing milestone?'))return;
      settings.milestones=settings.milestones.filter(x=>x.id!==b.dataset.signalRemove);
      if(editingMilestone===b.dataset.signalRemove)editingMilestone='';
      notice='Milestone removed. Save timing patterns to retain the change.';draw();return;
    }
    if(b.hasAttribute('data-milestone-add')){
      const pane=root(),kind=pane.querySelector('[data-milestone-kind]')?.value;
      const title=pane.querySelector('[data-milestone-title]')?.value.trim();
      const date=pane.querySelector('[data-milestone-date]')?.value;
      const sourceUrl=pane.querySelector('[data-milestone-source]')?.value.trim()||'';
      const confirmed=Boolean(pane.querySelector('[data-milestone-confirm]')?.checked);
      if(!['event','meeting','season_open','season_close'].includes(kind)||
        !title||title.length<4||title.length>140||
        !/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(date||'')||
        (sourceUrl&&!/^https:\/\/[^\s]+$/.test(sourceUrl))){
        notice='Enter a title, valid date and optional HTTPS source link.';draw();return;
      }
      const id=editingMilestone||('m-'+crypto.randomUUID());
      const item={id,kind,title,date,sourceUrl,confirmed};
      settings.milestones=[...settings.milestones.filter(x=>x.id!==id),item];
      editingMilestone='';notice='Saved milestone to the draft timing pattern. Select Save timing patterns to retain it.';draw();return;
    }
    if(b.hasAttribute('data-metric-import')){
      if(!pendingReport){metricsNotice='Choose a CSV report first.';draw();return;}
      if(!Object.values(pendingReport.mapping).some(Boolean)){metricsNotice='Map at least one column before importing.';draw();return;}
      const importedAt=new Date().toISOString();
      const records=pendingReport.rows.map(row=>({
        ...metricFromRow(row,pendingReport.mapping,{platform:metricsPlatform,
          filename:pendingReport.filename,importedAt}),
        id:crypto.randomUUID()
      }));
      metrics.push(...records);
      if(metrics.length>15000)metrics=metrics.slice(-15000);
      metricsNotice=storeMetrics()?'Imported '+records.length+' rows locally. Match any unlinked records below.':
        'Storage is full. Export or reduce your report; the imported rows are available for this visit only.';
      pendingReport=null;draw();return;
    }
    if(b.hasAttribute('data-metric-link')){
      const pane=root(),id=pane.querySelector('[data-metric-unlinked]')?.value;
      const postId=pane.querySelector('[data-metric-link-post]')?.value;
      const record=metrics.find(m=>m.id===id),target=lastPreview?.posts.find(p=>p.id===postId);
      if(!record||!target){metricsNotice='Choose a report record and a planned post.';draw();return;}
      record.postId=postId;
      postEdits[postId]??={};
      const ref={platform:record.platform,externalId:record.externalId,postUrl:record.postUrl};
      const exists=(postEdits[postId].externalRefs||[]).some(x=>
        x.platform===ref.platform&&x.externalId===ref.externalId&&x.postUrl===ref.postUrl);
      if(!exists)postEdits[postId].externalRefs=[...(postEdits[postId].externalRefs||[]),ref];
      persistEdits();storeMetrics();
      metricsNotice='Linked a '+record.platform+' report row to '+target.date+'.';draw();return;
    }
    if(b.hasAttribute('data-analytics-export')){
      if(!lastPreview)return;
      const csv=planMetricsCSV(lastPreview.posts,postEdits,linkedMetrics());
      const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      link.href=url;link.download='plfc-social-content-and-results-'+startMonth+'.csv';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      metricsNotice='Exported the year-long plan with any linked platform results.';return;
    }
    if(b.hasAttribute('data-planning-scope')){
      const value=b.dataset.planningScope;
      if(!['day','week','month'].includes(value))return;
      if(batchDirty&&!window.confirm('Discard unapplied changes to this planning period?'))return;
      planningScope=value;monthDraft=null;batchMonth='';draw();return;
    }
    if(b.hasAttribute('data-scope-auto')){
      currentBatch().postingTime='auto';batchDirty=true;draw();return;
    }
    if(b.hasAttribute('data-calendar-plan-day')){
      focusDay=b.dataset.calendarPlanDay;planningScope='day';
      modalDay=null;modalPostId=null;modalView='day';monthDraft=null;batchMonth='';draw();
      root()?.querySelector('#annual-plan-settings')?.scrollIntoView({behavior:'smooth',block:'start'});return;
    }
    if(b.hasAttribute('data-calendar-time-preset')){
      const time=root()?.querySelector('[data-post-time]');
      if(time){time.value=b.dataset.calendarTimePreset;time.focus();}
      return;
    }
    if(b.hasAttribute('data-calendar-hour')){
      const time=root()?.querySelector('[data-post-time]');if(time){
        const minute=isMinuteTime(time.value)?time.value.slice(3):'00';time.value=b.dataset.calendarHour+':'+minute;
        time.focus();
      }return;
    }
    if(b.hasAttribute('data-calendar-export')){exportSchedule();return;}
    if(b.hasAttribute('data-calendar-close')){
      root()?.querySelector('[data-annual-day-dialog]')?.close();
      modalDay=null;modalPostId=null;modalView='day';return;
    }
    if(b.hasAttribute('data-calendar-day')){
      modalDay=b.dataset.calendarDay;focusDay=modalDay;modalPostId=null;modalView='day';draw();return;
    }
    if(b.hasAttribute('data-calendar-back')){modalView='day';modalPostId=null;draw();return;}
    if(b.hasAttribute('data-calendar-detail')||b.hasAttribute('data-calendar-edit')){
      const id=b.dataset.calendarDetail||b.dataset.calendarEdit;
      if(!visiblePosts.some(post=>post.id===id&&post.date===modalDay))return;
      modalPostId=id;modalView=b.hasAttribute('data-calendar-edit')?'edit':'detail';draw();return;
    }
    if(b.hasAttribute('data-calendar-save')){
      const id=b.dataset.calendarSave,post=visiblePosts.find(item=>item.id===id&&item.date===modalDay);
      if(!post)return;
      const modal=root()?.querySelector('[data-annual-day-dialog]');
      const title=modal?.querySelector('[data-post-title]')?.value.trim();
      const brief=modal?.querySelector('[data-post-brief]')?.value.trim();
      const notes=modal?.querySelector('[data-post-notes]')?.value.trim();
      const status=modal?.querySelector('[data-post-status]')?.value;
      const time=modal?.querySelector('[data-post-time]')?.value;
      if(!title||!brief||!isMinuteTime(time)){modal?.querySelector(!title?'[data-post-title]':!brief?'[data-post-brief]':'[data-post-time]')?.focus();return;}
      postEdits[id]={title,brief,notes,status,time};
      const persisted=persistEdits();
      notice=persisted?'Post edits saved in this browser.':'Edit saved for this visit only; your browser blocked local storage.';
      modalView='detail';modalPostId=id;draw();return;
    }
    if(b.hasAttribute('data-annual-step')){
      const months=Array.from({length:12},(_,i)=>nextMonth(startMonth,i));
      const target=months.indexOf(selectedMonth)+Number(b.dataset.annualStep);
      if(target<0||target>=months.length)return;
      if(batchDirty&&!window.confirm('Discard unapplied month settings?'))return;
      selectMonth(months[target]);draw();return;
    }
    if(b.hasAttribute('data-month-apply')){
      settings[overrideBucket()][scopeKey()]=copyMonthSettings(currentBatch());
      batchDirty=false;void save();return;
    }
    if(b.hasAttribute('data-month-copy-next')){
      const key=scopeKey(),scope=planningScope,bucket=overrideBucket(),copy=copyMonthSettings(currentBatch());
      const offset=scope==='day'?1:scope==='week'?7:null;
      const next=offset===null?nextMonth(key,1):
        new Date(Date.parse(key+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
      settings[bucket][key]=copyMonthSettings(copy);
      settings[bucket][next]=copyMonthSettings(copy);
      batchDirty=false;notice='Copied '+scope+' planning settings to '+next+'.';
      void save();return;
    }
    if(b.hasAttribute('data-month-reset')){
      delete settings[overrideBucket()][scopeKey()];monthDraft=null;batchMonth='';
      batchDirty=false;void save();return;
    }
    if(b.hasAttribute('data-annual-save')){void save();return;}
    if(b.hasAttribute('data-annual-reload')){if(changed()&&!window.confirm('Discard unsaved pattern changes?'))return;loaded=false;void open();return;}
    if(b.hasAttribute('data-annual-go')){
      if(batchDirty&&!window.confirm('Discard unapplied changes to this month?'))return;
      selectMonth(b.dataset.annualGo);draw();return;
    }
    if(b.hasAttribute('data-annual-use')){
      const post=lastPreview?.posts.find(p=>p.id===b.dataset.annualUse);if(!post)return;
      const edit=getEdit(post.id);
      root()?.querySelector('[data-annual-day-dialog]')?.close();
      modalDay=null;modalPostId=null;modalView='day';
      onUse({title:postLabel(post,edit),body:postBrief(post,edit)+(edit.notes?'\n\nWorking notes: '+edit.notes:'')+
        '\n\nSuggested format: '+post.format+' ('+post.size+'). '+post.cta+'. Verify details before publishing.',
        channels:post.channels,plannedDate:post.date,plannedTime:postTime(post,edit)});
    }
  });
  mount.addEventListener('close',event=>{
    if(event.target.matches('[data-annual-day-dialog]')){modalDay=null;modalPostId=null;modalView='day';}
  },true);
  return {markup,open,reset(){loaded=false;busy=false;settings=defaultCampaignSettings();saved=JSON.stringify(settings);
    version=0;notice='';lastPreview=null;modalDay=null;modalPostId=null;modalView='day';planningScope='month';monthDraft=null;batchMonth='';}};

}
