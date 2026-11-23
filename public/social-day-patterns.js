// Small, reusable editorial day patterns. Examples are prompts, not claimed events.
export const DAILY_FORMATS=Object.freeze([
  ['video','🎬 Short video'],['image','🖼️ Image'],['carousel','🗂️ Carousel'],['link','🔗 Link']
]);
const slot=(id,layerId,time,format,title,brief)=>({id,layerId,time,format,title,brief});
const template=(id,name,items)=>({id,name,items});
export const BUILTIN_DAY_PATTERNS=Object.freeze({
  weekday:[
    template('weekday-quick','One useful daily tip',[
      slot('s1','fish','07:35','image','Daily fishing tip','Share one useful, verified local fishing tip with a suitable photo or illustration.')
    ]),
    template('weekday-two','Morning tip + evening conversation',[
      slot('s1','bait','07:35','video','Morning bait or rig tip','Demonstrate a practical method and invite members to share their experience.'),
      slot('s2','community','18:10','image','Evening community question','Ask a friendly question about fishing, island life or the club.')
    ]),
    template('weekday-members','Club welcome + handy guide',[
      slot('s1','membership','09:15','image','Getting involved with PLFC','Explain a confirmed way to join, volunteer or attend a local activity.'),
      slot('s2','safety','16:45','carousel','Simple safety checklist','Share verified local boating, wildlife or beach safety information.')
    ])
  ],
  friday:[
    template('friday-preview','Weekend preview',[
      slot('s1','weather','07:35','video','Weekend weather and tides check','Use the latest official forecast and tides only after confirming conditions.'),
      slot('s2','bait','16:15','image','Get the kit ready','Suggest a practical rig, bait or preparation checklist.')
    ]),
    template('friday-invite','Friday community invitation',[
      slot('s1','events','12:10','image','What is on this weekend?','Mention only confirmed local club activities and times.'),
      slot('s2','community','18:20','video','Weekend fishing question','Invite stories and photos from members or visitors.')
    ])
  ],
  weekend:[
    template('weekend-local','Morning check-in + afternoon recap',[
      slot('s1','safety','07:15','image','Safe day on the water','Remind viewers to check current official conditions, rules and safe access.'),
      slot('s2','community','17:35','video','Community fishing stories','Share an authorised member story or ask for weekend highlights.')
    ]),
    template('weekend-visitor','Visitors and local etiquette',[
      slot('s1','camping','09:00','carousel','Welcome to Straddie','Share helpful verified island information and environmental etiquette.'),
      slot('s2','fish','15:30','image','Species spotlight','Illustrate one local species with verified identification and handling advice.')
    ])
  ],
  longWeekend:[
    template('longweekend-family','Family weekend ideas',[
      slot('s1','camping','07:45','video','Family-friendly island activities','Suggest ways visitors can enjoy Straddie while respecting community and nature.'),
      slot('s2','safety','12:15','image','Long-weekend safety check','Link to current official weather, ferry and safety guidance.'),
      slot('s3','community','18:05','image','Share your weekend highlight','Invite a friendly story or photograph.')
    ]),
    template('longweekend-light','One useful visitor guide',[
      slot('s1','camping','08:30','carousel','Planning a smooth Straddie visit','Provide an accurate and welcoming visitor checklist.')
    ])
  ],
  publicHoliday:[
    template('publicholiday-welcome','Holiday welcome and safety',[
      slot('s1','community','08:30','image','Public holiday on Straddie','Offer a friendly greeting without claiming an unconfirmed event.'),
      slot('s2','safety','12:00','carousel','Holiday day checklist','Share verified access, safety and environmental care information.')
    ]),
    template('publicholiday-light','Single holiday post',[
      slot('s1','fish','09:20','video','A local fishing tip for visitors','Demonstrate a verified fishing or catch-and-release tip.')
    ])
  ],
  holiday:[
    template('holiday-family','School holiday family content',[
      slot('s1','holidays','08:45','image','Family-friendly fishing basics','Share an approachable tip for new anglers and families.'),
      slot('s2','camping','17:15','video','An island visitor tip','Share verified visitor guidance that helps people plan responsibly.')
    ]),
    template('holiday-activity','Holiday learning and safety',[
      slot('s1','safety','09:05','carousel','Young angler safety essentials','Use verified safety advice suitable for a family audience.'),
      slot('s2','bait','15:45','video','Learn one simple rig','Demonstrate one practical, accessible fishing technique.')
    ])
  ]
});
export const DAY_ARCHETYPE_LABELS=Object.freeze({
  weekday:'☀️ Ordinary weekday',friday:'✨ Friday',weekend:'🏖️ Weekend',
  longWeekend:'🧳 Long weekend',publicHoliday:'🎉 Public holiday',holiday:'🎒 School holidays'
});
export const DAY_TYPES=Object.freeze(Object.keys(DAY_ARCHETYPE_LABELS));
export const validSlot=slot=>Boolean(slot&&typeof slot==='object'&&!Array.isArray(slot)&&
  /^[-a-zA-Z0-9_]{1,50}$/.test(slot.id)&&
  ['video','image','carousel','link'].includes(slot.format)&&
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.time)&&
  typeof slot.layerId==='string'&&
  typeof slot.title==='string'&&slot.title.trim()&&slot.title.length<=180&&
  typeof slot.brief==='string'&&slot.brief.length<=4000);
export const allDayPresets=(type,saved={})=>[
  ...(BUILTIN_DAY_PATTERNS[type]||[]),
  ...(saved[type]||[])
];
export const patternFor=(type,id,saved={})=>allDayPresets(type,saved).find(p=>p.id===id);
export const planFromPattern=(pattern)=>({
  patternId:pattern.id,items:pattern.items.map(slot=>({...slot}))
});
export const planFromPosts=(posts,edits={})=>({
  patternId:'',items:posts.filter(post=>!edits[post.id]?.hidden).map((post,i)=>({
    id:'s'+(i+1),layerId:post.layerIds.find(x=>x!=='daily')||'community',
    time:edits[post.id]?.time||post.suggestedTime||'08:00',
    format:post.durationSeconds?'video':(['image','carousel','link'].includes(post.format)?post.format:'image'),
    title:edits[post.id]?.title||post.title,brief:edits[post.id]?.brief||post.brief
  }))
});
export const newDaySlot=index=>({
  id:'s'+index,layerId:'community',time:'12:00',format:'image',
  title:'New PLFC post',brief:'Add a confirmed club, fishing or island story.'
});
