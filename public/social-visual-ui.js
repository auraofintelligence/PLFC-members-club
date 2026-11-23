// Pure, CSP-safe views for the PLFC social workbench. No account or publishing actions.
export const LAYER_ICONS=Object.freeze({
  fish:'🐟',bait:'🪝',weather:'🌤️',safety:'🛟',events:'📅',holidays:'🏖️',
  nswHolidays:'🧳',camping:'🏕️',competition:'🏆',newsletter:'📰',
  membership:'🤝',raffles:'🎟️',fundraisers:'🎯',wishes:'🎁',community:'💬',surprise:'✨'
});
export const STATUS_OPTIONS=Object.freeze(['Idea','Draft','Assets in progress','Ready to review','Reviewed']);
const formatDate=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T00:00:00Z'));
const dateInfo=value=>new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',day:'numeric',month:'long'}).format(new Date(value+'T00:00:00Z'));
export const layerIcon=layer=>LAYER_ICONS[layer]||'📌';
export const postLabel=(post,edit)=>edit?.title?.trim()||post.title;
export const postBrief=(post,edit)=>edit?.brief?.trim()||post.brief;
const isVideo=post=>post.durationSeconds>0;
export function renderMonthCalendar({month,days,posts,esc}){
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
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>'<span>'+x+'</span>').join('')+'</div>'+
    '<div class="annual-calendar-days" aria-label="'+esc('Post calendar for '+month)+'">';
  for(let pad=0;pad<first;pad++)html+='<span class="annual-calendar-pad" aria-hidden="true"></span>';
  for(let day=1;day<=count;day++){
    const date=month+'-'+String(day).padStart(2,'0'),data=cards.get(date),items=byDate.get(date)||[];
    const qld=Boolean(data?.holiday),nsw=Boolean(data?.nswHoliday);
    const icons=[...new Set(items.map(post=>layerIcon(post.layerIds[0])))].slice(0,3);
    const tooltip=formatDate(date)+'; '+items.length+' post suggestion'+(items.length===1?'':'s')+
      (qld?'; Queensland school holidays':'')+(nsw?'; NSW school holidays':'');
    html+='<button type="button" class="annual-calendar-day'+(items.length?' has-posts':'')+
      (qld?' qld':'')+(nsw?' nsw':'')+'" data-calendar-day="'+date+'"'+(data?'':' disabled')+
      ' aria-label="'+esc(tooltip)+'" title="'+esc(tooltip)+'">'+
      '<span class="annual-calendar-day-top"><strong>'+day+'</strong>'+
      (items.length?'<b class="annual-calendar-count">'+items.length+'</b>':'')+'</span>'+
      '<span class="annual-calendar-icons" aria-hidden="true">'+icons.map(x=>'<span>'+x+'</span>').join('')+'</span>'+
      '<span class="annual-calendar-dots">'+(qld?'<i class="qld" title="Queensland school holidays"></i>':'')+
      (nsw?'<i class="nsw" title="NSW school holidays"></i>':'')+'</span></button>';
  }
  return html+'</div>';
}
export function renderCalendarDialog({day,view,postId,posts,plan,esc,getEdit,reviewOnly}){
  if(!day)return '';
  const formatted=formatDate(day),today=posts.filter(post=>post.date===day);
  const dayData=plan?.days?.find(x=>x.date===day);
  const flags=[dayData?.holiday?'QLD school holidays':null,dayData?.nswHoliday?'NSW school holidays':null].filter(Boolean);
  const headline='<header class="annual-dialog-header"><div><p class="annual-dialog-kicker">'+
    (flags.length?flags.map(esc).join(' · '):'Content calendar')+'</p>'+
    '<h2>'+esc(formatted)+'</h2></div><button type="button" class="annual-dialog-close" data-calendar-close aria-label="Close popup">✕</button></header>';
  const post=today.find(x=>x.id===postId),edit=post?getEdit(post.id):null;
  if(view==='edit'&&post){
    const title=postLabel(post,edit),brief=postBrief(post,edit);
    return '<dialog class="annual-day-dialog" data-annual-day-dialog aria-label="Edit post">'+headline+
      '<p class="annual-dialog-lead">Edit this post without changing the rest of the month.</p>'+
      '<div class="annual-edit-form">'+
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
    const placement=variants.map(v=>'<li><strong>'+esc(v.platform)+' · '+esc(v.placement)+'</strong><span>'+esc(v.size)+
      ' · '+esc(v.ratio)+(v.distribution==='paid'?' · ad idea':'')+(v.provisional?' · proposed':'')+'</span></li>').join('');
    return '<dialog class="annual-day-dialog" data-annual-day-dialog aria-label="Post details">'+headline+
      '<div class="annual-dialog-post-icon" aria-hidden="true">'+layerIcon(post.layerIds[0])+'</div>'+
      '<h3 class="annual-dialog-post-title">'+esc(postLabel(post,edit))+'</h3>'+
      '<div class="annual-post-tags"><span>'+(isVideo(post)?'🎬 30-sec video':'🖼️ Image or link')+'</span>'+
      '<span>'+esc(post.suggestedTime)+' AEST</span><span>'+esc(edit?.status||'Idea')+'</span></div>'+
      '<section class="annual-dialog-section"><h4>Creative brief</h4><p>'+esc(postBrief(post,edit))+'</p></section>'+
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
    '<div class="annual-day-posts">'+(today.length?today.map(post=>{
      const edit=getEdit(post.id);
      const brief=postBrief(post,edit);
      const summary=brief.length>145?brief.slice(0,142).trimEnd()+'…':brief;
      return '<article class="annual-day-post"><div class="annual-day-post-icon" aria-hidden="true">'+layerIcon(post.layerIds[0])+'</div>'+
        '<div class="annual-day-post-content"><div class="annual-post-tags"><span>'+(isVideo(post)?'🎬 Video':'🖼️ Graphic')+
        '</span><span>'+esc(post.suggestedTime)+' AEST</span>'+
        (edit?.status&&edit.status!=='Idea'?'<span>'+esc(edit.status)+'</span>':'')+'</div>'+
        '<h3>'+esc(postLabel(post,edit))+'</h3><p>'+esc(summary)+'</p>'+
        '<div class="annual-day-post-actions"><button class="button small" type="button" data-calendar-detail="'+esc(post.id)+'">View details</button>'+
        '<button class="button outline small" type="button" data-calendar-edit="'+esc(post.id)+'">✏️ Edit</button></div></div></article>';
    }).join(''):'<p class="annual-dialog-empty">No suggestions on this date. Try another day or increase the monthly frequency.</p>')+
    '</div><footer class="annual-dialog-actions"><button class="button outline" type="button" data-calendar-close>Close</button></footer></dialog>';
}
