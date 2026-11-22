const cycleLength=6000;
const frameCount=48;
const storageKey='plfc-finnius-paused';
const preferenceEvent='plfc:finnius-motion';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let localChoice=null;
function motionPaused(){
  if(localChoice!==null)return localChoice;
  try{if(localStorage.getItem(storageKey)==='yes')return true;}catch{}
  return reduced.matches;
}
function setMotionPaused(paused){
  localChoice=paused;
  try{if(paused)localStorage.setItem(storageKey,'yes');else localStorage.removeItem(storageKey);}catch{}
  window.dispatchEvent(new CustomEvent(preferenceEvent,{detail:{paused}}));
}
function refreshPreference(){
  localChoice=null;
  window.dispatchEvent(new CustomEvent(preferenceEvent,{detail:{paused:motionPaused()}}));
}
reduced.addEventListener('change',refreshPreference);
window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null)refreshPreference();});
window.addEventListener(preferenceEvent,event=>{localChoice=event.detail.paused;});

export function mountFinniusTourButton(img){
  const poster='/assets/finnius-guide.webp', animation='/assets/finnius-tour.gif';
  const events=new AbortController();
  const options={signal:events.signal};
  function sync(){
    const src=motionPaused()||document.hidden?poster:animation;
    if(img.getAttribute('src')!==src)img.src=src;
  }
  img.addEventListener('error',()=>{if(img.getAttribute('src')===animation)img.src=poster;},options);
  window.addEventListener(preferenceEvent,sync,options);
  document.addEventListener('visibilitychange',sync,options);
  sync();return ()=>events.abort();
}

export function mountTourFinnius(element){
  const stage=document.createElement('div'),img=document.createElement('img'),canvas=document.createElement('canvas'),toggle=document.createElement('button');
  stage.className='finnius-tour-stage';
  img.alt='Finnius the Fishing Mate';img.src='/assets/finnius-guide.webp';img.width=220;img.height=210;
  canvas.width=154;canvas.height=147;canvas.hidden=true;canvas.setAttribute('aria-hidden','true');
  toggle.className='finnius-tour-toggle';toggle.type='button';
  stage.append(img,canvas);element.replaceChildren(stage,toggle);element.classList.add('finnius-tour-motion');
  const events=new AbortController(),context=canvas.getContext('2d');
  let frameSheet=null,timer=0,playingSince=null,elapsed=0,failed=!context;
  function stop(){
    clearTimeout(timer);
    if(playingSince!==null)elapsed=(performance.now()-playingSince)%cycleLength;
    playingSince=null;canvas.hidden=true;img.hidden=false;
  }
  function draw(){
    const pos=(performance.now()-playingSince)%cycleLength,frame=Math.floor(pos*frameCount/cycleLength);
    context.clearRect(0,0,canvas.width,canvas.height);
    context.drawImage(frameSheet,(frame%8)*154,Math.floor(frame/8)*147,154,147,0,0,154,147);
    img.hidden=true;canvas.hidden=false;timer=setTimeout(draw,Math.max(12,125-pos%125));
  }
  function sync(){
    const paused=motionPaused();
    toggle.hidden=failed;toggle.textContent=paused?'Resume Finnius':'Pause Finnius';
    if(events.signal.aborted||failed||paused||document.hidden){stop();return;}
    if(playingSince!==null)return;
    if(!frameSheet){
      frameSheet=new Image();frameSheet.onload=sync;
      frameSheet.onerror=()=>{failed=true;sync();};
      frameSheet.src='/assets/finnius-guide-frames.webp';return;
    }
    if(!frameSheet.naturalWidth)return;
    playingSince=performance.now()-elapsed;draw();
  }
  toggle.addEventListener('click',()=>setMotionPaused(!motionPaused()),{signal:events.signal});
  window.addEventListener(preferenceEvent,sync,{signal:events.signal});
  document.addEventListener('visibilitychange',sync,{signal:events.signal});
  sync();
  return ()=>{
    events.abort();stop();
    if(frameSheet){frameSheet.onload=null;frameSheet.onerror=null;frameSheet=null;}
    if(stage.parentElement===element){element.replaceChildren();element.classList.remove('finnius-tour-motion');}
  };
}

export function setupFinniusMotion(){
  const stage=document.getElementById('finnius-stage');
  const video=document.getElementById('finnius-video');
  const poster=document.getElementById('finnius-character');
  const canvas=document.getElementById('finnius-frames');
  const toggle=document.getElementById('finnius-toggle');
  const status=document.getElementById('finnius-motion-status');
  let paused=motionPaused();
  let onHome=false,inView=!('IntersectionObserver' in window),running=false;
  let mode=video.canPlayType('video/webm; codecs="vp9"')?'video':'frames';
  let sheet=null,elapsed=0,started=null,timer=0,version=0,shown=false,checkedAlpha=false,failed=false;

  function label(){
    toggle.textContent=failed?'Try Finnius again':paused?(shown?'Resume Finnius':'Play Finnius'):'Pause Finnius';
    const message=failed?'The animation could not load. You can try again or save a clip below.':
      paused?(shown?'Finnius is paused.':'Finnius is still. Press Play Finnius to start.'):
      '';
    if(status.textContent!==message)status.textContent=message;
  }
  function suspend(){
    version++;running=false;clearTimeout(timer);
    if(started!==null){elapsed=(performance.now()-started)%cycleLength;started=null;}
    video.pause();
  }
  function drawFrames(){
    if(!running || mode!=='frames' || !sheet?.naturalWidth)return;
    const context=canvas.getContext('2d');
    if(!context){unable();return;}
    started ??= performance.now()-elapsed;
    const pos=(performance.now()-started)%cycleLength;
    const frame=Math.floor(pos*frameCount/cycleLength);
    context.clearRect(0,0,canvas.width,canvas.height);
    context.drawImage(sheet,(frame%8)*300,Math.floor(frame/8)*500,300,500,0,0,300,500);
    canvas.hidden=false;poster.hidden=true;shown=true;
    timer=setTimeout(drawFrames,Math.max(12,125-pos%125));
  }
  function unable(){
    suspend();failed=true;paused=true;poster.hidden=false;canvas.hidden=true;video.hidden=true;label();
  }
  function useFrames(){
    if(mode==='video'){
      elapsed=(video.currentTime*1000||0)%cycleLength;
      suspend();mode='frames';video.hidden=true;poster.hidden=false;
    }
    sync();
  }
  function showVideo(ticket){
    if(ticket!==version || !running || mode!=='video')return;
    if(!checkedAlpha){
      try{
        const sample=document.createElement('canvas');sample.width=1;sample.height=1;
        const context=sample.getContext('2d',{willReadFrequently:true});
        context.drawImage(video,0,0,1,1,0,0,1,1);
        if(context.getImageData(0,0,1,1).data[3]>=16){useFrames();return;}
        checkedAlpha=true;
      }catch{useFrames();return;}
    }
    poster.hidden=true;shown=true;
  }
  function sync(){
    if(paused||failed||!onHome||!inView||document.hidden){
      if(running)suspend();
      return;
    }
    if(running)return;
    running=true;
    if(mode==='frames'){
      if(sheet?.complete && sheet.naturalWidth){drawFrames();return;}
      if(!sheet){
        sheet=new Image();
        sheet.onload=drawFrames;sheet.onerror=unable;
        sheet.src='/assets/finnius-cycle-frames.webp';
      }
      return;
    }
    if(!video.getAttribute('src'))video.src='/assets/finnius-cycle.webm';
    const ticket=++version;
    video.hidden=false;video.muted=true;video.loop=true;
    video.play().then(()=>{
      if(ticket!==version)return;
      if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(()=>showVideo(ticket));
      else showVideo(ticket);
    }).catch(error=>{
      if(ticket!==version)return;
      if(error.name==='NotAllowedError'){suspend();paused=true;label();}
      else useFrames();
    });
  }
  video.addEventListener('error',()=>{if(mode==='video')useFrames();});
  toggle.addEventListener('click',()=>{
    if(failed){failed=false;sheet=null;mode='frames';elapsed=0;}
    setMotionPaused(!paused);
  });
  window.addEventListener(preferenceEvent,event=>{paused=event.detail.paused;label();sync();});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('plfc:navigated',e=>{onHome=e.detail.page==='home';sync();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;sync();
  }).observe(stage);
  label();
}
