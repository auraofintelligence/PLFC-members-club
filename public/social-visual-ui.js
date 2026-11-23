// Pure, CSP-safe views for the PLFC social workbench. No account or publishing actions.
export const LAYER_ICONS=Object.freeze({
  fish:'🐟',bait:'🪝',weather:'🌤️',safety:'🛟',events:'📅',holidays:'🏖️',
  nswHolidays:'🧳',camping:'🏕️',competition:'🏆',newsletter:'📰',
  membership:'🤝',raffles:'🎟️',fundraisers:'🎯',wishes:'🎁',community:'💬',surprise:'✨',daily:'📌'
});
export const STATUS_OPTIONS=Object.freeze(['Idea','Draft','Assets in progress','Ready to review','Reviewed']);
const formatDate=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T00:00:00Z'));
const dateInfo=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',day:'numeric',month:'long'}).format(new Date(value+'T00:00:00Z'));
export const layerIcon=layer=>LAYER_ICONS[layer]||'📌';
export const postLabel=(post,edit)=>edit?.title?.trim()||post.title;
export const postBrief=(post,edit)=>edit?.brief?.trim()||post.brief;
const isVideo=post=>post.durationSeconds>0;
export const brisbaneToday=()=>{
  const parts=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const value=k=>parts.find(part=>part.type===k)?.value||'';
  return value('year')+'-'+value('month')+'-'+value('day');
};
export const postTime=(post,edit)=>edit?.time||post.suggestedTime||'18:00';
export const isMinuteTime=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export function renderMonthCalendar({month,days,posts,esc,today=brisbaneToday(),metricsForPost=()=>[]}){
  const [year,m]=month.split('-').map(Number);
  const count=new Date(Date.UTC(year,m,0)).getUTCDate();
  const first=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7;
  const cards=new Map(days.map(day=>[day.date,day]));
  const byDate=new Map();
  for(const post of posts){
    if(!byDate.has(post.date))byDate.set(post.date,[]);
    byDate.get(post.date).push(post);
  }
  let html='<div class="annual-calendar-weekdays" aria-hidden="true">'+
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun','Week total'].map(x=>'<span>'+x+'</span>').join('')+'</div>'+
    '<div class="annual-calendar-days" aria-label="'+esc('Post calendar for '+month)+'">';
  const totalCells=Math.ceil((first+count)/7)*7;
  let weekCount=0,weekDays=0;
  for(let pos=0;pos<totalCells;pos++){
    if(pos%7===0)html+='<div class="annual-calendar-week-row">';
    const index=pos-first+1;
    if(index<1||index>count){
      html+='<span class="annual-calendar-pad" aria-hidden="true"></span>';
    }else{
      const date=month+'-'+String(index).padStart(2,'0'),data=cards.get(date),items=byDate.get(date)||[];
      weekCount+=items.length;weekDays++;
      const qld=Boolean(data?.holiday),nsw=Boolean(data?.nswHoliday);
      const temporal=date===today?'today':date<today?'past':'future';
      const icons=[...new Set(items.map(post=>layerIcon(post.layerIds[0])))].slice(0,3);
      const views=items.reduce((total,post)=>total+metricsForPost(post.id).reduce((n,item)=>n+(item.views??0),0),0);
      const tooltip=formatDate(date)+'; '+items.length+' planned '+(items.length===1?'post':'posts')+
        '; '+temporal+(qld?'; Queensland school holidays':'')+(nsw?'; NSW school holidays':'');
      html+='<button type="button" class="annual-calendar-day '+temporal+(items.length?' has-posts':'')+
        (qld?' qld':'')+(nsw?' nsw':'')+'" data-calendar-day="'+date+'"'+(date===today?' aria-current="date"':'')+
        ' aria-label="'+esc(tooltip)+'" title="'+esc(tooltip)+'">'+
        '<span class="annual-calendar-day-top"><strong>'+index+'</strong>'+
        (items.length?'<b class="annual-calendar-count">'+items.length+'</b>':'')+'</span>'+
        '<span class="annual-calendar-icons" aria-hidden="true">'+icons.map(x=>'<span>'+x+'</span>').join('')+'</span>'+
        '<span class="annual-calendar-dots">'+(qld?'<i class="qld" title="Queensland school holidays"></i>':'')+
        (nsw?'<i class="nsw" title="NSW school holidays"></i>':'')+'</span>'+
        (temporal==='today'?'<small class="annual-today-label">TODAY</small>':'')+
        (views?'<small class="annual-calendar-performance">📈 '+(views>=1000?(views/1000).toFixed(1)+'k':views)+' views</small>':'')+
        '</button>';
    }
    if(pos%7===6){
      const weekIndex=Math.floor(pos/7)+1;
      html+='<div class="annual-calendar-week-total" role="note"><span>Week '+weekIndex+'</span>'+
        '<strong>'+weekCount+' '+(weekCount===1?'post':'posts')+'</strong>'+
        '<span>'+weekDays+' days shown</span></div></div>';
      weekCount=0;weekDays=0;
    }
  }
  return html+'</div>';
}
function hourlyGuide(posts,getEdit,esc){
  const hourCount=Array.from({length:24},(_,hour)=>({
    hour,count:posts.filter(p=>Number(postTime(p,getEdit(p.id)).slice(0,2))===hour).length
  }));
  return '<details class="annual-hour-guide"><summary>🕒 Hour-by-hour plan · Brisbane AEST</summary>'+
    '<div class="annual-hour-overview">'+hourCount.map(({hour,count})=>{
      const time=String(hour).padStart(2,'0')+':00';
      return '<span class="'+(count?'has-posts':'')+'"><strong>'+time+'</strong>'+
        (count?'<b>'+count+'</b>':'')+'</span>';
    }).join('')+'</div><p>Choose a post and select Edit to set its exact hour and minute.</p></details>';
}
export function renderCalendarDialog({day,view,postId,posts,plan,esc,getEdit,reviewOnly,metricsForPost=()=>[]}){
  if(!day)return '';
  const formatted=formatDate(day),today=posts.filter(post=>post.date===day)
    .sort((a,b)=>postTime(a,getEdit(a.id)).localeCompare(postTime(b,getEdit(b.id))));
  const dayData=plan?.days?.find(x=>x.date===day);
  const flags=[dayData?.holiday?'QLD school holidays':null,dayData?.nswHoliday?'NSW school holidays':null].filter(Boolean);
  const headline='<header class="annual-dialog-header"><div><p class="annual-dialog-kicker">'+
    (flags.length?flags.map(esc).join(' · '):'Content calendar')+'</p>'+
    '<h2>'+esc(formatted)+'</h2></div><button type="button" class="annual-dialog-close" data-calendar-close aria-label="Close popup">✕</button></header>';
  const post=today.find(x=>x.id===postId),edit=post?getEdit(post.id):null;
  if(view==='edit'&&post){
    const title=postLabel(post,edit),brief=postBrief(post,edit),time=postTime(post,edit);
    return '<dialog class="annual-day-dialog" data-annual-day-dialog aria-label="Edit post">'+headline+
      '<p class="annual-dialog-lead">Edit this post without changing the rest of the month.</p>'+
      '<div class="annual-edit-form">'+
      '<div class="annual-time-editor"><label>🕒 Scheduled time (Brisbane AEST, to the minute)'+
      '<input data-post-time type="time" step="60" required value="'+esc(time)+'" aria-label="Exact local posting time"></label>'+
      '<p>Tap an hour below, then adjust the minutes in the time field.</p>'+
      '<div class="annual-time-presets">'+[['07:30','Morning'],['12:15','Midday'],['16:45','Afternoon'],['19:15','Evening']].map(([at,label])=>
        '<button type="button" data-calendar-time-preset="'+at+'">'+label+' · '+at+'</button>').join('')+'</div>'+
      '<div class="annual-hour-pick" aria-label="Choose posting hour">'+Array.from({length:24},(_,h)=>{
        const value=String(h).padStart(2,'0');
        return '<button type="button" data-calendar-hour="'+value+'" aria-pressed="'+(time.startsWith(value+':'))+'">'+value+'</button>';
      }).join('')+'</div></div>'+
      '<label>Post title<input type="text" data-post-title maxlength="180" value="'+esc(title)+'"></label>'+
      '<label>Production brief<textarea data-post-brief rows="5" maxlength="4000">'+esc(brief)+'</textarea></label>'+
      '<label>Working notes<textarea data-post-notes rows="3" maxlength="2000" placeholder="Footage, script, images, people to ask…">'+esc(edit?.notes||'')+'</textarea></label>'+
      '<label>Working status<select data-post-status>'+STATUS_OPTIONS.map(option=>'<option'+((edit?.status||'Idea')===option?' selected':'')+'>'+esc(option)+'</option>').join('')+'</select></label>'+
      '</div><p class="annual-dialog-hint">These individual edits are kept in this browser. Use “Open in club editor” to prepare a separate saved committee post.</p>'+
      '<footer class="annual-dialog-actions"><button type="button" class="button" data-calendar-save="'+esc(post.id)+'">Save this edit</button>'+
      '<button type="button" class="button outline" data-calendar-detail="'+esc(post.id)+'">Back to details</button></footer></dialog>';
  }
  if(view==='detail'&&post){
    const variants=post.creativeVariants;
    const results=metricsForPost(post.id);
    const performance=results.length?'<section class="annual-dialog-section annual-dialog-performance">'+
      '<h4>📈 Imported platform results</h4>'+
      '<div class="annual-result-pills">'+results.map(x=>
        '<span>'+esc(x.platform)+': '+(x.views??0).toLocaleString('en-AU')+' views · '+
        ((x.likes??0)+(x.comments??0)+(x.shares??0)+(x.saves??0)).toLocaleString('en-AU')+' interactions</span>').join('')+'</div>'+
      '<p class="annual-small">Imported CSV snapshot, not a live feed. Check platform metric definitions.</p></section>':'';
    const placement=variants.map(v=>'<li><strong>'+esc(v.platform)+' · '+esc(v.placement)+'</strong><span>'+esc(v.size)+
      ' · '+esc(v.ratio)+(v.distribution==='paid'?' · ad idea':'')+(v.provisional?' · proposed':'')+'</span></li>').join('');
    return '<dialog class="annual-day-dialog" data-annual-day-dialog aria-label="Post details">'+headline+
      '<div class="annual-dialog-post-icon" aria-hidden="true">'+layerIcon(post.layerIds[0])+'</div>'+
      '<h3 class="annual-dialog-post-title">'+esc(postLabel(post,edit))+'</h3>'+
      '<div class="annual-post-tags"><span>'+(isVideo(post)?'🎬 30-sec video':'🖼️ Image or link')+'</span>'+
      '<span>'+esc(postTime(post,edit))+' AEST</span><span>'+esc(edit?.status||'Idea')+'</span></div>'+
      '<section class="annual-dialog-section"><h4>Creative brief</h4><p>'+esc(postBrief(post,edit))+'</p></section>'+performance+
      (edit?.notes?'<section class="annual-dialog-section"><h4>Your notes</h4><p>'+esc(edit.notes)+'</p></section>':'')+
      '<section class="annual-dialog-section"><h4>Audience and invitation</h4><p>'+esc(Object.values(post.audience||{}).map(a=>a.join(', ')).join(' · '))+
      '</p><p><strong>Call to action:</strong> '+esc(post.cta)+'</p></section>'+
      (post.storyboard?.length?'<section class="annual-dialog-section"><h4>Video storyboard</h4><ol>'+
        post.storyboard.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></section>':'')+
      '<details class="annual-dialog-spec"><summary>📐 Media formats ('+variants.length+')</summary><ul>'+placement+'</ul>'+
      '<p>Placement requirements must be verified before publishing.</p></details>'+
      '<footer class="annual-dialog-actions">'+
      '<button type="button" class="button" data-calendar-edit="'+esc(post.id)+'">✏️ Edit this post</button>'+
      '<button type="button" class="button outline" data-annual-use="'+esc(post.id)+'">Open in club editor</button>'+
      '<button type="button" class="button outline" data-calendar-back>← All posts today</button></footer></dialog>';
  }
  return '<dialog class="annual-day-dialog" data-annual-day-dialog aria-label="Posts for '+esc(formatted)+'">'+headline+
    '<p class="annual-dialog-lead">'+today.length+' post '+(today.length===1?'idea':'ideas')+' planned for this day. Select one to review or edit.</p>'+
    hourlyGuide(today,getEdit,esc)+
    '<div class="annual-day-posts">'+(today.length?today.map(post=>{
      const edit=getEdit(post.id);
      const brief=postBrief(post,edit);
      const summary=brief.length>145?brief.slice(0,142).trimEnd()+'…':brief;
      const results=metricsForPost(post.id);
      const totalViews=results.reduce((total,item)=>total+(item.views??0),0);
      return '<article class="annual-day-post"><div class="annual-day-post-icon" aria-hidden="true">'+layerIcon(post.layerIds[0])+'</div>'+
        '<div class="annual-day-post-content"><div class="annual-post-tags"><span>'+(isVideo(post)?'🎬 Video':'🖼️ Graphic')+
        '</span><span>'+esc(postTime(post,edit))+' AEST</span>'+
        (edit?.status&&edit.status!=='Idea'?'<span>'+esc(edit.status)+'</span>':'')+'</div>'+
        '<h3>'+esc(postLabel(post,edit))+'</h3><p>'+esc(summary)+'</p>'+
        (totalViews?'<p class="annual-performance-note">📈 '+totalViews.toLocaleString('en-AU')+' imported views</p>':'')+
        '<div class="annual-day-post-actions"><button class="button small" type="button" data-calendar-detail="'+esc(post.id)+'">View details</button>'+
        '<button class="button outline small" type="button" data-calendar-edit="'+esc(post.id)+'">✏️ Edit</button></div></div></article>';
    }).join(''):'<p class="annual-dialog-empty">No suggestions on this date. Try another day or increase the monthly frequency.</p>')+
    '</div><footer class="annual-dialog-actions"><button class="button" type="button" data-calendar-plan-day="'+esc(day)+'">🎛️ Plan this day</button>'+
    '<button class="button outline" type="button" data-calendar-close>Close</button></footer></dialog>';
}
