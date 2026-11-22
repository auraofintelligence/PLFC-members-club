// Runs the actual clubhouse Worker with a separate, loopback-only review database.
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {spawn} from 'node:child_process';
import {handleRequest} from '../worker/index.mjs';
import {seedReviewNewsletter} from './review-newsletter.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PLFC_REVIEW_PORT||4196);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local review port.');
const host='127.0.0.1:'+port,origin='http://'+host;
const dir=resolve(root,'.local',process.argv.some(a=>a==='--self-test'||a==='--test-store')?'review-self-test':'secretary-review');
await mkdir(dir,{recursive:true});
const sql=new DatabaseSync(resolve(dir,'club.sqlite'));
sql.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
const hex=()=>randomBytes(32).toString('hex');
const hash=value=>createHash('sha256').update(value).digest('hex');
const now=()=>Math.floor(Date.now()/1000);
const cookieName='plfc_local_review_'+port;
const grantName='plfc_role_preview_'+port;
const account='local-secretary-reviewer';
const roles={
  owner:{id:account,name:'Webmaster',login:'secretary-review',role:'administrator',page:'stock'},
  secretary:{id:'review-secretary',name:'Secretary',login:'secretary',role:'committee',page:'committee'},
  assistant:{id:'review-assistant',name:'Assistant Secretary',login:'assistantsecretary',role:'committee',page:'committee'},
  president:{id:'review-president',name:'President',login:'president',role:'committee',page:'committee'},
  vicepresident:{id:'review-vicepresident',name:'Vice President',login:'vicepresident',role:'committee',page:'committee'},
  treasurer:{id:'review-treasurer',name:'Treasurer',login:'treasurer',role:'treasurer',page:'stock'},
  member:{id:'review-member',name:'My member view',login:'review-member',role:'member',page:'members'},
  mate:{id:'review-mate',name:'Another member (test sharing)',login:'review-mate',role:'member',page:'members'},
  youth:{id:'review-youth',name:'Under-16 member',login:'review-junior',role:'member',page:'members'},
  former:{id:'review-former',name:'Former member',login:'review-former',role:'member',page:'members'},
  visitor:{name:'Visitor',page:'shop'}
};
const types={'.txt':'text/plain; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.gif':'image/gif','.webm':'video/webm','.mp4':'video/mp4','.woff2':'font/woff2','.pdf':'application/pdf'};
const publicRoot=resolve(root,'public');
const transaction=fn=>{sql.exec('BEGIN IMMEDIATE');try{const output=fn();sql.exec('COMMIT');return output;}catch(error){sql.exec('ROLLBACK');throw error;}};

sql.exec('CREATE TABLE IF NOT EXISTS review_migrations (name TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS review_keys (key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS review_launches (digest TEXT PRIMARY KEY,expires INTEGER NOT NULL)');
for(const name of (await readdir(resolve(root,'drizzle'))).filter(n=>/^\d{4}_[\w-]+\.sql$/.test(n)).sort()){
  const contents=await readFile(resolve(root,'drizzle',name),'utf8');
  transaction(()=>{
    if(sql.prepare('SELECT 1 FROM review_migrations WHERE name=?').get(name))return;
    sql.exec(contents);sql.prepare('INSERT INTO review_migrations VALUES(?)').run(name);
  });
}
sql.prepare("INSERT OR IGNORE INTO review_keys VALUES('local',?)").run(hex());
const key=sql.prepare("SELECT value FROM review_keys WHERE key='local'").get().value;
sql.exec('CREATE TABLE IF NOT EXISTS review_grants (digest TEXT PRIMARY KEY,expires INTEGER NOT NULL,view TEXT NOT NULL)');
for(const r of Object.values(roles).filter(r=>r.id)){
  sql.prepare('INSERT OR IGNORE INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,?,?,?,?)')
    .run(r.id,r.login,r.role,hex(),hex(),now(),r.id===roles.former.id?'2025-06-30':r.role==='member'?'2099-12-31':null);
}
// Give the fictional adult members a category for friend invitations and annual fee reviews.
for(const id of [roles.member.id,roles.mate.id,roles.former.id]){
  sql.prepare("INSERT INTO member_profiles(account_id,membership_type) VALUES(?,'adult') ON CONFLICT(account_id) DO UPDATE SET membership_type='adult' WHERE membership_type='unconfirmed'").run(id);
}
// These fictional permissions belong only to the private loopback review.
for(const [id,band,guardian] of [[roles.member.id,'16+',0],[roles.mate.id,'16+',0],[roles.youth.id,'under16',1]]){
  sql.prepare('INSERT OR IGNORE INTO member_age_checks(account_id,age_band,guardian_permission,version,verified_at,verified_by) VALUES(?,?,?,1,?,?)').run(id,band,guardian,new Date().toISOString(),'local reviewer');
  if(!guardian)sql.prepare("INSERT OR IGNORE INTO member_terms_acceptance(account_id,terms_version,accepted,version,updated_at) SELECT ?,terms_version,1,1,? FROM member_safeguard_policy").run(id,new Date().toISOString());
}
if(dir===resolve(root,'.local','secretary-review'))transaction(()=>seedReviewNewsletter(sql,roles));
const signature=challenge=>createHmac('sha256',key).update('review-server/'+challenge).digest('hex');

function prepared(query,args=[]) {
  return {
    bind:(...values)=>prepared(query,values),
    execute(){
      const before=sql.prepare('SELECT total_changes() AS n').get().n;
      const results=sql.prepare(query).all(...args);
      return {results,meta:{changes:sql.prepare('SELECT total_changes() AS n').get().n-before}};
    },
    all(){return this.execute();},run(){return this.execute();},first(){return this.execute().results[0]||null;}
  };
}
const env={DB:{prepare:prepared,batch:statements=>transaction(()=>statements.map(s=>s.execute()))},PRIVATE_AUTH_KEY:key};

function issue(){
  const ticket=hex();
  sql.prepare('DELETE FROM review_launches WHERE expires<=?').run(now());
  sql.prepare('INSERT INTO review_launches VALUES(?,?)').run(hash(ticket),now()+300);
  return ticket;
}
function newSession(view) {
  if(!roles[view].id)return '';
  const token=hex();
  sql.prepare('INSERT INTO club_sessions VALUES(?,?,?)').run(hash(token),roles[view].id,now()+28800);
  return token;
}
function redeem(ticket){
  if(!/^[a-f0-9]{64}$/.test(ticket))return null;
  return transaction(()=>{
    const used=sql.prepare('DELETE FROM review_launches WHERE digest=? AND expires>?').run(hash(ticket),now());
    if(!used.changes)return null;
    const grant=hex();
    sql.prepare('DELETE FROM club_sessions WHERE expires<=?').run(now());
    sql.prepare('DELETE FROM review_grants WHERE expires<=?').run(now());
    sql.prepare("INSERT INTO review_grants VALUES(?,?,'secretary')").run(hash(grant),now()+28800);
    return {grant,session:newSession('secretary')};
  });
}
const noStore={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const respond=(output,status,body,headers={})=>{output.writeHead(status,{...noStore,...headers});output.end(body);};
function localCookie(value,age){return cookieName+'='+value+'; HttpOnly; SameSite=Strict; Path=/api; Max-Age='+age;}
function fromCookie(req,name){return (req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(name+'='))?.slice(name.length+1);}
function reviewHtml(html){
  const options=Object.entries(roles).map(([id,r])=>'<option value="'+id+'">'+r.name+'</option>').join('');
  return html.replace('<span>DEMO ONLY</span><span>Not complete or available for club use yet.</span>','<span>PRIVATE REVIEW</span><span>Changes stay on this PC</span><label id="review-role-picker" hidden>View as <select aria-label="View as">'+options+'</select></label>')
    .replace('</head>','<script defer src="/_review/boundaries.js"></script></head>');
}
const reviewBoundaries=String.raw`const isCheckout=a=>{try{return ['square.link','checkout.square.site'].includes(new URL(a.href).hostname);}catch{return false;}};
const rolePicker=document.getElementById('review-role-picker');
if(rolePicker)fetch('/_review/role').then(r=>r.ok?r.json():null).then(v=>{
  if(!v)return;
  const input=rolePicker.querySelector('select');input.value=v.view;rolePicker.hidden=false;
  input.addEventListener('change',async()=>{
    input.disabled=true;
    try{const res=await fetch('/_review/role',{method:'POST',headers:{'Content-Type':'text/plain'},body:input.value});if(!res.ok)throw Error();
      const target=await res.json();
      const reviewingNews=['#members/news','#committee/news'].includes(location.hash);
      const officer=['committee','stock'].includes(target.page);
      const keepPage=(officer && ['#committee/handover','#committee/meetings','#committee/agm-jobs','#committee/todos','#committee/social','#committee/events','#committee/leaderboard'].includes(location.hash))
        || (location.hash.startsWith('#members/') && (officer||target.page==='members'));
      if(['#committee/returning','#stock/returning'].includes(location.hash)){
        location.hash=input.value==='treasurer'?'stock/returning':['secretary','assistant'].includes(input.value)?'committee/returning':target.page==='members'?'members/membership':target.page;
      }
      else if(reviewingNews && (officer||target.page==='members'))location.hash=officer?'committee/news':'members/news';
      else if(!keepPage)location.hash=target.page;
      location.reload();}
    catch{input.value=v.view;input.disabled=false;alert('Open the private review shortcut again to change roles.');}
  });
}).catch(()=>{});
function isolate(){document.querySelectorAll('a[href]').forEach(a=>{if(isCheckout(a))a.href='/_review/payment';});}
new MutationObserver(isolate).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
isolate();
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="mailto:"],a[href^="tel:"]');if(a?.closest('#treasurer-orders')){e.preventDefault();alert('Customer contact is disabled in this local review.');}});`;
const gate='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Opening private PLFC review</title><main><p id="message">Opening your private clubhouse review…</p></main><script src="/_review/entry.js"></script></html>';
const enter="(async()=>{const ticket=location.hash.slice(1);history.replaceState(null,'',location.pathname);try{const answer=await fetch('/_review/enter',{method:'POST',headers:{'Content-Type':'text/plain'},body:ticket});if(!answer.ok)throw Error();location.replace('/#committee/todos');}catch{document.getElementById('message').textContent='This private link has expired or already opened. Double-click Open private clubhouse review on this PC to open a new one.';}})();";
async function handle(req,res){
  if(req.headers.host!==host || (req.headers.origin && req.headers.origin!==origin))return respond(res,403,'Open this review on this PC.');
  const url=new URL(req.url,origin),path=url.pathname,method=req.method;
  if(url.origin!==origin)return respond(res,400,'Invalid local address.');
  if(method!=='GET'&&method!=='HEAD' && (req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site'))return respond(res,403,'Open this form in the clubhouse.');
  if(method==='GET'&&path==='/_review/identity'){
    const challenge=url.searchParams.get('c')||'';
    return /^[a-f0-9]{64}$/.test(challenge)?respond(res,200,signature(challenge)):respond(res,400,'Invalid challenge.');
  }
  if(method==='GET'&&path==='/_review/open')return respond(res,200,gate,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; frame-ancestors 'none'"});
  if(method==='GET'&&path==='/_review/entry.js')return respond(res,200,enter,{'Content-Type':'text/javascript'});
  if(method==='GET'&&path==='/_review/boundaries.js')return respond(res,200,reviewBoundaries,{'Content-Type':'text/javascript'});
  if(method==='GET'&&path==='/_review/payment')return respond(res,200,'<!doctype html><html lang="en"><meta charset="utf-8"><title>Online payment review</title><h1>Online payment review</h1><p>On the live club site, Square opens here to take payment. This private review keeps all activity on your PC.</p><a href="/#shop">Return to the shop</a></html>',{'Content-Type':'text/html; charset=utf-8'});
  const chunks=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>2000000)return respond(res,413,'This file is too large.');chunks.push(chunk);}
  const body=length?Buffer.concat(chunks):undefined;
  if(method==='POST'&&path==='/_review/enter'){
    const ticket=redeem(body?.toString('utf8')||'');
    return ticket?respond(res,204,undefined,{'Set-Cookie':[localCookie(ticket.session,28800),grantName+'='+ticket.grant+'; HttpOnly; SameSite=Strict; Path=/_review; Max-Age=28800']}):respond(res,403,'Open a fresh local review link.');
  }
  if(path==='/_review/role'){
    const grant=hash(fromCookie(req,grantName)||'');
    const record=sql.prepare('SELECT view FROM review_grants WHERE digest=? AND expires>?').get(grant,now());
    if(!record)return respond(res,403,'Open the private review from this PC.');
    if(method==='GET')return respond(res,200,JSON.stringify(record),{'Content-Type':'application/json'});
    const view=body?.toString('utf8')||'';
    if(method!=='POST'||!Object.hasOwn(roles,view))return respond(res,400,'Choose a review role.');
    const session=transaction(()=>{sql.prepare('UPDATE review_grants SET view=? WHERE digest=?').run(view,grant);return newSession(view);});
    return respond(res,200,JSON.stringify({page:roles[view].page}),{'Content-Type':'application/json','Set-Cookie':localCookie(session,session?28800:0)});
  }
  if((method==='GET'||method==='HEAD') && !path.startsWith('/api/') && !/\.(?:pdf|ics)$/.test(path)){
    const file=resolve(publicRoot,'.'+(path==='/'?'/index.html':decodeURIComponent(path)));
    if(!file.startsWith(publicRoot+sep)||!Object.hasOwn(types,extname(file)))return respond(res,404,'Page unavailable.');
    let content;try{content=await readFile(file);}catch{return respond(res,404,'Page unavailable.');}
    if(extname(file)==='.html')content=reviewHtml(content.toString());
    return respond(res,200,method==='HEAD'?undefined:content,{'Content-Type':types[extname(file)],'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://www.facebook.com/plugins/page.php; object-src 'none'; frame-ancestors 'none'; form-action 'self'"});
  }
  const headers=new Headers(req.headers);
  headers.delete('cookie');
  const session=fromCookie(req,cookieName);
  if(session && /^[0-9a-f]{64}$/.test(session))headers.set('Cookie','__Host-plfc_session='+session);
  const request=new Request(url,{method,headers,body,duplex:'half'});
  const response=await handleRequest(request,env);
  const output=Object.fromEntries(response.headers);delete output['set-cookie'];
  for(const field of response.headers.getSetCookie()){
    const match=/^__Host-plfc_session=([a-f0-9]*);.*?Max-Age=(\d+)/i.exec(field);
    if(match)output['Set-Cookie']=localCookie(match[1],Number(match[2]));
  }
  respond(res,response.status,method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()),output);
}
const server=createServer((req,res)=>handle(req,res).catch(error=>{console.error('The local review could not complete a request:',error.message);if(!res.headersSent)respond(res,500,'Review unavailable.');else res.end();}));
async function start(){
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(true));});
}
async function running(){
  const c=hex();
  try{const r=await fetch(origin+'/_review/identity?c='+c,{signal:AbortSignal.timeout(1000)});return r.ok && (await r.text())===signature(c);}catch{return false;}
}
async function main(){
  const selfTest=process.argv.includes('--self-test'),open=process.argv.includes('--open'),serve=process.argv.includes('--serve');
  if(!selfTest&&!open&&!serve)throw Error('Choose --open or --serve.');
  let existing=await running();
  if(!existing){try{await start();}catch(error){if(error.code!=='EADDRINUSE'||!await running())throw Error('This review port is in use. Select another PLFC_REVIEW_PORT.');existing=true;}}
  if(selfTest){
    if(existing)throw Error('Choose an unused review test port.');
    const token=issue(),head={Origin:origin};
    const enterOnce=()=>fetch(origin+'/_review/enter',{method:'POST',headers:head,body:token});
    const result=await enterOnce(),[session,grant]=result.headers.getSetCookie().map(c=>c.split(';')[0]);
    if(result.status!==204||(await enterOnce()).status!==403)throw Error('The local sign-in did not enforce one-time use.');
    if((await fetch(origin+'/api/treasurer/fees')).status!==401)throw Error('Private data was visible before sign-in.');
    for(const endpoint of ['/api/session','/api/committee/todos','/api/committee/price-alerts','/api/community','/api/meetings']){
      const answer=await fetch(origin+endpoint,{headers:{Cookie:session}});
      if(!answer.ok)throw Error(endpoint+' returned '+answer.status);
      if(endpoint==='/api/session' && (await answer.json()).identity?.name!=='secretary')throw Error('The review did not start as Secretary.');
      if(endpoint==='/api/committee/todos'){
        const desk=await answer.json();
        if(!desk.canAssign || desk.viewerOffice!=='secretary')throw Error('The review opened the wrong officer list.');
      }
    }
    const foreign=await fetch(origin+'/_review/enter',{method:'POST',body:issue(),headers:{Origin:'https://example.invalid'}});
    if(foreign.status!==403)throw Error('Unexpected foreign origin acceptance.');
    if((await fetch(origin+'/_review/role',{method:'POST',body:'owner',headers:head})).status!==403)throw Error('Role change was not private.');
    for(const [view,config] of Object.entries(roles)){
      const selected=await fetch(origin+'/_review/role',{method:'POST',headers:{Origin:origin,Cookie:grant},body:view});
      const who=await (await fetch(origin+'/api/session',{headers:{Cookie:selected.headers.getSetCookie()[0].split(';')[0]}})).json();
      if(who.accountRole!==(config.role??null))throw Error('Wrong permissions for '+view);
      const cookie=selected.headers.getSetCookie()[0].split(';')[0];
      const returning=await fetch(origin+'/api/committee/returning-members',{headers:{Cookie:cookie}});
      if(['secretary','assistant','treasurer'].includes(view)){
        if(!returning.ok)throw Error('The returning-member register is unavailable for '+view);
        const permissions=await returning.json();
        if(permissions.canApprove!==(view==='treasurer')||permissions.canIssue!==(view!=='treasurer'))throw Error('Incorrect fee waiver permissions for '+view);
      }else if(![401,403].includes(returning.status))throw Error('Unexpected fee waiver access for '+view);
      if(view==='former' && !(await fetch(origin+'/api/member/returning-members',{headers:{Cookie:cookie}})).ok)throw Error('Former member cannot see their offers.');
      if(view==='owner'){
        for(const endpoint of ['/api/stock','/api/stock/shop','/api/treasurer/fees']){
          const answer=await fetch(origin+endpoint,{headers:{Cookie:selected.headers.getSetCookie()[0].split(';')[0]}});
          if(!answer.ok)throw Error('Owner review unavailable at '+endpoint);
        }
      }
    }
    if(!(await (await fetch(origin)).text()).includes('Changes stay on this PC'))throw Error('Local review label missing.');
    console.log('Local sign-in, private routes, real Worker access checks, single-use grant and local-only label passed.');
    await new Promise(resolve=>server.close(resolve));sql.close();return;
  }
  if(open){
    const url=origin+'/_review/open#'+issue();
    const ps=spawn('powershell.exe',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command','Start-Process -FilePath $env:PLFC_PRIVATE_REVIEW_URL'],{windowsHide:true,env:{...process.env,PLFC_PRIVATE_REVIEW_URL:url},stdio:'ignore'});
    ps.unref();
  }
  if(existing){sql.close();}else console.log('Private clubhouse review is listening at '+origin+' on this PC.');
}
main().catch(error=>{console.error(error.message);process.exit(1);});

