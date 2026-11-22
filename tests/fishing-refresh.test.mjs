import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise the real planner, its navigation hooks and the three forecast requests with a controlled browser clock.
test('visible planner checks every 15 minutes, respects a fixed date and ignores superseded requests',async t=>{
  const RealDate=Date;
  let now=Date.parse('2026-11-20T13:30:00Z'),nextTimer=1,hold=false;
  const timers=new Map(),calls=[],fields=new Map(),store=new Map(),releases=[];
  class Element extends EventTarget{
    constructor(){super();this.dataset={};this.options=[];this.hidden=false;this.innerHTML='';this.value='';}
    replaceChildren(...children){this.children=children;}
    append(child){this.children.push(child);}
    querySelectorAll(){return [];}
    insertAdjacentHTML(_where,html){this.inserted=html;}
  }
  const elem=key=>{if(!fields.has(key))fields.set(key,new Element());return fields.get(key);};
  const mockDocument=Object.assign(new EventTarget(),{hidden:false,querySelector:elem,createElement:()=>new Element(),createTextNode:value=>value});
  const fakeWindow=new EventTarget();
  function global(name,value){const old=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});t.after(()=>old?Object.defineProperty(globalThis,name,old):delete globalThis[name]);}
  global('Date',class extends RealDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}});
  global('window',fakeWindow);global('document',mockDocument);
  global('localStorage',{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)});
  global('setTimeout',(fn,ms)=>{const id=nextTimer++;timers.set(id,{at:now+ms,fn});return id;});
  global('clearTimeout',id=>timers.delete(id));
  global('fetch',async(path,{signal})=>{
    const url=new URL(path,'https://club.test');
    calls.push({name:url.pathname,date:url.searchParams.get('date'),signal});
    if(hold)await new Promise(resolve=>releases.push(resolve));
    const stamp=new RealDate(now).toISOString();
    return {ok:true,json:async()=>url.pathname==='/api/conditions'?{weather:{status:'available',retrievedAt:stamp,hours:[],summary:{}},marine:{status:'available',retrievedAt:stamp,hours:[],summary:{}}}:null};
  });
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  async function advance(ms){
    now+=ms;
    for(const [id,item] of [...timers])if(item.at<=now){timers.delete(id);item.fn();}
    await flush();
  }
  const planner=await import('../public/fishing-board.js');
  planner.setupFishingBoard();await planner.enterFishingBoard();
  assert.equal(calls.length,3);assert.equal(calls[0].date,'2026-11-20');
  assert.match(elem('#fishing-result .day-heading').inserted,/20 Nov 2026.*AEST/);
  await advance(14*60000);assert.equal(calls.length,3);
  await advance(60000);assert.equal(calls.length,6);
  mockDocument.hidden=true;mockDocument.dispatchEvent(new Event('visibilitychange'));
  await advance(16*60000);assert.equal(calls.length,6);
  mockDocument.hidden=false;mockDocument.dispatchEvent(new Event('visibilitychange'));await flush();
  assert.equal(calls.length,9);assert.equal(calls.at(-1).date,'2026-11-21');
  assert.equal(elem('#fishing-date').value,'2026-11-21');
  // A future plan stays on the chosen date, even after that Queensland day has passed.
  const date=elem('#fishing-date');date.value='2026-11-23';date.dispatchEvent(new Event('input'));await planner.loadFishing();
  await advance(4*86400000);assert.equal(calls.at(-1).date,'2026-11-23');
  assert.match(store.get('plfc-trip-demo'),/"followedDate":null/);
  assert.equal(date.value,'2026-11-23');
  // A stale response arriving after a newer choice cannot repaint the newer briefing.
  hold=true;date.value='2026-11-26';date.dispatchEvent(new Event('input'));const first=planner.loadFishing();
  const obsolete=calls.at(-1);
  const before=calls.length;fakeWindow.dispatchEvent(new Event('focus'));assert.equal(calls.length,before);
  hold=false;await planner.loadFishing(true);
  assert.ok(obsolete.signal.aborted);for(const release of releases)release();await first;
  assert.match(elem('#fishing-result').innerHTML,/25 November/);
  assert.equal(JSON.parse(store.get('plfc-trip-demo')).followedDate,'2026-11-25');
  elem('[data-view="fishing"]').hidden=true;fakeWindow.dispatchEvent(new Event('plfc:navigated'));
  const count=calls.length;await advance(7200000);assert.equal(calls.length,count);
  elem('[data-view="fishing"]').hidden=false;await planner.enterFishingBoard();assert.equal(calls.length,count+3);
});
