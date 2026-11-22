import {holidayWindow} from './school-holidays.js';

const formats = {committee:'Management committee meeting',general:'General meeting',agm:'Annual general meeting',special:'Special general meeting',informal:'Informal catch-up'};
const dateFormat = new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const timeFormat = new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Brisbane',hour:'numeric',minute:'2-digit'});
function element(tag,text) {
  const node=document.createElement(tag);
  node.textContent=text;
  return node;
}

export function setupAgendaPrint() {
  let sheet,originalTitle;
  function clean() {
    if(sheet && document.title===sheet.dataset.printTitle)document.title=originalTitle;
    sheet?.remove();
    sheet=null;
    document.body.classList.remove('printing-agenda');
  }
  window.addEventListener('plfc:print-agenda',async ({detail})=>{
    if(!document.body.hasAttribute('data-club-committee') || !location.hash.startsWith('#committee') || !Array.isArray(detail?.items))return;
    clean();
    sheet=document.createElement('article');
    sheet.id='agenda-print-sheet';
    originalTitle=document.title;
    sheet.dataset.printTitle='PLFC agenda - '+detail.title;
    document.title=sheet.dataset.printTitle;
    const art=(edge,alt)=>{
      const img=document.createElement('img');
      img.src='/assets/club-letterhead-'+edge+'.png';img.className='agenda-stationery-'+edge;img.alt=alt;return img;
    };
    const letterhead=art('top','Point Lookout Fishing Club Inc., North Stradbroke Island');
    const footer=art('foot','Point Lookout Fishing Club contact details');
    const header=document.createElement('header');
    header.append(element('h1',detail.title),element('p',(detail.draft?'Working draft · ':'')+(formats[detail.meetingType] || 'Meeting agenda')));
    const start=new Date(detail.date+'T'+detail.time+':00+10:00');
    if(Number.isFinite(+start))header.append(element('p',dateFormat.format(start)+' · '+timeFormat.format(start)+' AEST'));
    header.append(element('p',detail.location));
    sheet.append(letterhead,header,element('h2',detail.meetingType==='informal'?'Discussion agenda':'Order of business'));
    const list=document.createElement('ol');
    for(const item of detail.items)list.append(element('li',item.title));
    sheet.append(list);
    if(detail.meetingType==='informal')sheet.append(element('p','Record proposals and follow-up contacts. Put any request for club funds, sponsorship or authority on the agenda of a properly called club meeting.'));
    if(detail.items.some(item=>/school holiday/i.test(item.title))){
      const period=holidayWindow(detail.date);
      if(period)sheet.append(element('p','Queensland state school holidays · '+period.label));
    }
    sheet.append(footer);
    if(detail.items.length>12)sheet.classList.add('long-agenda');
    const currentSheet=sheet;
    document.body.append(sheet);
    document.body.classList.add('printing-agenda');
    await Promise.allSettled([letterhead.decode(),footer.decode()]);
    if(sheet!==currentSheet)return;
    try{window.print();}catch(error){clean();throw error;}
  });
  window.addEventListener('afterprint',clean);
  window.addEventListener('plfc:navigated',clean);
  window.addEventListener('plfc:session-changed',clean);
  window.addEventListener('pagehide',clean);
}
