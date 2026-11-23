export const WORKBENCH_STAGES=['Idea','Draft','Assets ready','Ready for review','Approved','Published'];
const weekday=day=>(new Date(day+'T00:00:00Z').getUTCDay()+6)%7;
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const localeDate=day=>new Intl.DateTimeFormat('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z'));
export function matchingPosts(posts,settings,{layer='all',channel='all',delivery='all'}={}){
  return posts.filter(p=>p.layerIds.some(id=>settings.layers[id]?.visible)
    &&(layer==='all'||p.layerIds.includes(layer))
    &&(channel==='all'||p.creativeVariants.some(v=>v.platform===channel))
    &&(delivery==='all'||p.creativeVariants.some(v=>v.distribution===delivery)));
}
export function renderCampaignCalendar({month,dayCards,posts,selectedDate,esc}){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return '';
  const [year,mon]=month.split('-').map(Number),count=new Date(Date.UTC(year,mon,0)).getUTCDate();
  const offset=weekday(month+'-01'),dayMap=new Map(dayCards.map(d=>[d.date,d]));
  const counts=new Map();for(const p of posts)counts.set(p.date,(counts.get(p.date)||0)+1);
  const pad=n=>String(n).padStart(2,'0');
  let slots='<div class="annual-cal-weekdays">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(n=>'<span>'+n+'</span>').join('')+'</div><div class="annual-cal-days">';
  for(let i=0;i<offset;i++)slots+='<span class="annual-cal-pad" aria-hidden="true"></span>';
  for(let d=1;d<=count;d++){
    const date=month+'-'+pad(d),day=dayMap.get(date),total=counts.get(date)||0;
    const flags=[day?.holiday?'QLD':null,day?.nswHoliday?'NSW':null,[4,5,6].includes(weekday(date))?'weekend':null].filter(Boolean);
    const label=localeDate(date)+'; '+total+' post suggestion'+(total===1?'':'s')+(flags.length?'; '+flags.join(' and '):'');
    slots+='<button type="button" class="annual-cal-day'+(date===selectedDate?' selected':'')+'" data-annual-day="'+date+'" aria-pressed="'+(date===selectedDate)+'" aria-label="'+esc(label)+'">'+
      '<strong>'+d+'</strong><small>'+total+' posts</small>'+
      '<span class="annual-cal-markers" aria-hidden="true">'+flags.map(f=>'<i class="'+(f==='QLD'?'qld':f==='NSW'?'nsw':'weekend')+'"></i>').join('')+'</span></button>';
  }
  return slots+'</div>';
}
export function exportCampaignCSV(posts,edits={}){
  const cols=['date','time_AEST','title','layers','content_format','creative_exports','audience_member_class','audience_gender','audience_location','channels','organic_or_paid','status_local_only','notes_local_only','brief','cta','production_storyboard'];
  const safe=value=>{
    let str=String(value??'').replace(/\r?\n/g,' ');
    if(/^\s*[=+@-]/.test(str))str="'"+str;
    return '"'+str.replaceAll('"','""')+'"';
  };
  const rows=posts.map(p=>{
    const edit=edits[p.id]||{};
    const paid=p.creativeVariants.some(v=>v.distribution==='paid'),organic=p.creativeVariants.some(v=>v.distribution==='organic');
    const field={
      date:p.date,time_AEST:p.suggestedTime,title:p.title,layers:p.layerIds.join(' | '),content_format:p.format,
      creative_exports:p.creativeVariants.map(v=>v.platform+' '+v.placement+' '+v.size+' ('+v.distribution+')').join(' | '),
      audience_member_class:p.audience?.membership?.join(' | '),
      audience_gender:p.audience?.gender?.join(' | '),audience_location:p.audience?.place?.join(' | '),
      channels:p.channels.join(' | '),organic_or_paid:[organic?'Organic':'',paid?'Paid suggestion only':''].filter(Boolean).join(' | '),
      status_local_only:edit.status||'Idea',notes_local_only:edit.note||'',brief:p.brief,cta:p.cta,
      production_storyboard:p.storyboard.join(' | ')
    };return cols.map(k=>safe(field[k])).join(',');
  });
  return '\uFEFF'+[cols.join(','),...rows].join('\r\n');
}
export function activeDay(month,day){
  return typeof day==='string'&&ISO.test(day)&&day.startsWith(month)?day:month+'-01';
}
