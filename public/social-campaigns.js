import {CAMPAIGN_LAYERS,defaultCampaignSettings,generateCampaignYear,monthSettingsFor,copyMonthSettings} from './social-campaign-engine.js';
import {PUBLISHING_DESTINATIONS,placementSources,CREATIVE_SPEC_VERSION,MASTER_ASSET_PRESETS} from './social-placements.js';

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
    const limits=Object.entries(labels).map(([id,title])=>'<label>'+title+
      '<input data-month-limit="'+id+'" type="number" min="0" max="12" step="1" value="'+batch.limits[id]+'"></label>').join('');
    const rows=CAMPAIGN_LAYERS.map(layer=>{
      const row=batch.layers[layer.id];
      return '<tr><th scope="row">'+esc(layer.label)+'</th>'+
        '<td><input type="checkbox" aria-label="Generate '+esc(layer.label)+' this month" data-month-enabled="'+layer.id+'"'+checked(row.enabled)+'></td>'+
        '<td><input type="checkbox" aria-label="Show '+esc(layer.label)+' this month" data-month-visible="'+layer.id+'"'+checked(row.visible)+'></td>'+
        '<td><input type="number" aria-label="Frequency for '+esc(layer.label)+' this month" min="0" max="7" step="1" data-month-weekly="'+layer.id+'" value="'+row.weekly+'"></td></tr>';
    }).join('');
    const audience=Object.entries(choices).map(([field,options])=>
      '<fieldset><legend>'+{membership:'Membership classes',gender:'Gender (voluntary)',place:'Local, regional or visitor'}[field]+'</legend>'+
      options.map(([id,label])=>'<label><input data-month-audience="'+field+'" type="checkbox" value="'+id+'"'+
        checked(batch.layers[selectedLayer].audience[field].includes(id))+'>'+esc(label)+'</label>').join('')+'</fieldset>').join('');
    const destinations=(mode,label)=>'<fieldset class="annual-destinations"><legend>'+label+'</legend>'+
      PUBLISHING_DESTINATIONS.map(c=>'<label><input type="checkbox" data-month-destination="'+mode+'" value="'+c.id+'"'+
        checked(batch.delivery[mode].includes(c.id))+'>'+esc(c.label)+(c.status==='proposed'?' (future)':'')+'</label>').join('')+'</fieldset>';
    return '<section class="annual-batch" aria-label="Monthly batch controls">'+
      '<div class="annual-batch-head"><h2>Monthly batch · '+monthName(selectedMonth)+'</h2>'+
      '<span>'+((settings.monthOverrides||{})[selectedMonth]?'Saved month-specific rules':'Using annual defaults')+
      (batchDirty?' · unsaved trial changes':'')+'</span></div>'+
      '<p>Set the entire month together. The suggestions below change immediately, while saved and published posts remain untouched.</p>'+
      '<div class="annual-limits"><label>Video target % <input type="number" min="0" max="100" step="1" data-month-video value="'+batch.videoShare+'"></label>'+
      limits+'</div>'+
      '<details class="annual-batch-layer-options"><summary>Category layers, frequency and audience</summary>'+
      '<div class="annual-pattern-table"><table><thead><tr><th>Pattern</th><th>Generate</th><th>Show</th><th>Per week</th></tr></thead><tbody>'+
      rows+'</tbody></table></div>'+
      '<div class="annual-audience"><label>Targeting settings for <select data-month-select-layer>'+
      CAMPAIGN_LAYERS.map(p=>'<option value="'+p.id+'"'+(selectedLayer===p.id?' selected':'')+'>'+esc(p.label)+'</option>').join('')+'</select></label>'+
      audience+'</div></details>'+
      '<details class="annual-batch-platform-options"><summary>Platform and paid-ad production</summary>'+
      destinations('organic','Organic destinations')+
      '<label class="annual-batch-check"><input type="checkbox" data-month-paid-planning'+checked(batch.delivery.paidPlanning)+'> Include paid creative suggestions (no ad purchases)</label>'+
      destinations('paid','Paid creative destinations')+'</details>'+
      '<div class="annual-actions"><button type="button" class="button" data-month-apply'+(busy?' disabled':'')+'>Apply and save '+monthName(selectedMonth)+'</button>'+
      '<button type="button" class="button outline" data-month-copy-next'+(busy?' disabled':'')+'>Copy to next month</button>'+
      '<button type="button" class="button outline" data-month-reset'+(busy?' disabled':'')+'>Reset this month</button></div>'+
      '<p class="annual-small">All changes are suggestions until an officer deliberately opens and saves a post. No SMS, email, publishing, or advertising is triggered.</p></section>';
  }

  function preview(){
    if(!loaded)return '<p>Loading committee campaign settings…</p>';
    let plan;try{plan=generateCampaignYear(startMonth,previewSettings());}catch(e){return '<p role="alert">'+esc(e.message)+'</p>';}
    lastPreview=plan;
    const months=Array.from({length:12},(_,i)=>nextMonth(startMonth,i));
    if(!months.includes(selectedMonth))selectedMonth=months[0];
    const visible=plan.posts.filter(p=>p.layerIds.some(id=>monthSettingsFor(previewSettings(),p.date).layers[id]?.visible));
    const current=visible.filter(p=>p.date.startsWith(selectedMonth));
    const days=new Map(plan.days.map(day=>[day.date,day]));
    const nsw=plan.days.filter(day=>day.nswHoliday&&!day.holiday).length;
    const paidIdeas=plan.posts.filter(p=>p.creativeVariants.some(v=>v.distribution==='paid')).length;
    const masterLibrary='<details class="annual-master-library"><summary>Master asset production presets ('+MASTER_ASSET_PRESETS.length+')</summary>'+
      '<p>Use high-quality masters and create independent crops or edits for each placement; never enlarge an existing low-resolution export.</p><ul>'+
      MASTER_ASSET_PRESETS.map(a=>'<li><strong>'+esc(a.label)+'</strong> · '+a.width+' × '+a.height+' · '+esc(a.ratio)+'</li>').join('')+
      '</ul></details>';
    return '<div class="annual-preview">'+
      '<p class="annual-small">Placement spec version <strong>'+esc(CREATIVE_SPEC_VERSION.id)+'</strong> · reviewed '+esc(CREATIVE_SPEC_VERSION.reviewedOn)+'. Working exports, not upload minimums. Verify again before advertising.</p>'+
      masterLibrary+
      '<div class="annual-month-choose"><label>Year begins <input type="month" data-annual-start min="2026-01" max="2028-02" value="'+startMonth+'"></label>'+
      '<label>View month <select data-annual-month>'+months.map(m=>'<option value="'+m+'"'+(selectedMonth===m?' selected':'')+'>'+monthName(m)+'</option>').join('')+'</select></label></div>'+
      monthControls()+'<div class="annual-stats"><strong>'+plan.totals.posts+' suggestions</strong><strong>'+plan.totals.videos+' videos ('+
        Math.round(100*plan.totals.videos/Math.max(1,plan.totals.posts))+'%)</strong><strong>'+plan.totals.combined+
        ' composite posts</strong><span>'+nsw+' NSW-only visitor days</span><span>'+plan.totals.omitted+' ideas over daily limits</span><span>'+paidIdeas+' ideas with ad creative suggestions (unapproved)</span></div>'+
      '<div class="annual-month-grid">'+months.map(m=>'<button type="button" data-annual-go="'+m+'" aria-pressed="'+(selectedMonth===m)+'">'+monthName(m)+
        '<span>'+visible.filter(p=>p.date.startsWith(m)).length+' visible suggestions</span></button>').join('')+'</div>'+
      '<h3>'+monthName(selectedMonth)+' · '+current.length+' visible suggestions</h3>'+
      (current.length?'<ol class="annual-post-list">'+current.map(p=>{
        const d=days.get(p.date),region=d?.holiday&&d?.nswHoliday?'QLD + NSW school holidays':d?.holiday?'QLD school holidays':d?.nswWesternOnly?'Western NSW summer extension':d?.nswHoliday?'NSW school holidays':'';
        return '<li><div><strong>'+esc(csvDate(p.date))+' · '+esc(p.title)+'</strong><small>'+
          esc(p.layerIds.join(' + '))+' · '+esc(p.format)+' · '+esc(p.size)+' ('+esc(p.aspectRatio)+') · '+
          esc(p.suggestedTime)+' AEST'+(region?' · '+esc(region):'')+'</small>'+
          '<p>'+esc(p.brief)+'</p><p><strong>Audience:</strong> '+esc(audienceText(p.audience))+
          ' · <strong>CTA:</strong> '+esc(p.cta)+'</p>'+
          (p.storyboard.length?'<p><strong>30-second video:</strong> '+esc(p.storyboard.join(' | '))+'</p>':'')+
          '<details class="annual-placement-detail"><summary>'+p.creativeVariants.length+' placement-specific creative exports</summary><ul>'+
          p.creativeVariants.map(v=>'<li><strong>'+esc(v.platform)+' · '+esc(v.placement)+'</strong> · '+esc(v.asset)+
            ' · '+esc(v.size)+' · '+esc(v.ratio)+' · '+(v.distribution==='paid'?'Paid ad template / unapproved':'Organic')+
            (v.provisional?' · PROPOSED ONLY':'')+
            '<small><strong>File:</strong> '+esc(v.fileFormats.join(', '))+
            (v.maximumDurationSeconds?' · maximum documented duration '+v.maximumDurationSeconds+'s':'')+
            (v.recommendedDurationSeconds?' · suggested edit '+v.recommendedDurationSeconds+'s':'')+'</small>'+
            (v.thumbnail?'<small><strong>Thumbnail:</strong> '+esc(v.thumbnail.label)+' '+v.thumbnail.width+' × '+v.thumbnail.height+'</small>':'')+
            '<small><strong>Safe zones:</strong> '+esc(v.safeZone.label)+
            (v.safeZone.topPixels?' ('+v.safeZone.topPixels+'px top, '+v.safeZone.bottomPixels+'px bottom, '+v.safeZone.sidePixels+'px sides)':'')+'</small>'+
            (v.carousel?'<small><strong>Carousel:</strong> '+v.carousel.min+'–'+v.carousel.max+' slides; '+(v.carousel.requiresMusic?'music required':'check music rules')+'</small>':'')+
            '<small><strong>Checklist:</strong> '+esc(v.checklist.join(' · '))+'</small>'+
            '<small><strong>Approval:</strong> '+esc(v.approval)+'</small>'+
            '<small>'+esc(v.note)+' · <a href="'+esc(v.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Specification reference</a></small></li>').join('')+
          '</ul></details></div>'+
          '<button type="button" class="button outline small" data-annual-use="'+esc(p.id)+'">Use as draft</button></li>';
      }).join('')+'</ol>':'<p>No suggestions in the visible layers for this month.</p>')+
      '<p class="annual-small">Suggestions only: no draft or post is saved until you choose Use as draft and save it in the existing planner. Verify weather and tides shortly before publishing, and confirm all event, raffle, fundraising, species and licensing details.</p>'+
      '<p class="annual-small">Placement references: <a href="'+esc(placementSources.meta)+'" target="_blank" rel="noopener noreferrer">Meta Ads Guide</a> · <a href="'+esc(placementSources.googleAds)+'" target="_blank" rel="noopener noreferrer">Google Ads</a> · <a href="'+esc(placementSources.tiktok)+'" target="_blank" rel="noopener noreferrer">TikTok Ads</a> · <a href="'+esc(placementSources.noticeboard)+'" target="_blank" rel="noopener noreferrer">Noticeboard pilot</a>.</p>'+
      '<p class="annual-small">Official holidays: <a href="https://education.qld.gov.au/about-us/calendar/future-dates" target="_blank" rel="noopener noreferrer">Queensland</a> · <a href="https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates" target="_blank" rel="noopener noreferrer">NSW (Eastern/Western)</a>.</p></div>';
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
      version=row.version;settings=row.settings||defaultCampaignSettings();saved=JSON.stringify(settings);loaded=true;monthDraft=null;batchMonth='';
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
