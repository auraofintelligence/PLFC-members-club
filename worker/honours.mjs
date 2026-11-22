import {catchSpecies} from '../public/catch-species.mjs';
import {sanitiseClubJpeg,privateAreaKeys,sealPrivateText,openPrivateText} from './member-network.mjs';
import {memberSafeguardFlags} from './member-safeguards.mjs';

const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const fields={
  enter:['id','alias','species','cm','date','competitionId','consent','photo'],
  sighted:['id','alias','species','cm','date','competitionId','consent','sightedNote','checked','confirmed16','entrantId'],
  review:['id','version','decision','note','checked'],withdraw:['id','version'],
  competition:['id','version','year','title','details','prizes','sponsors','published','allAges','offer','offerFrom','offerUntil','targets'],
  placing:['id','version','place','prize','confirmed'],
  award:['month','version','entryId','reason']
};
const memberFields='id,display_name AS alias,species,millimetres AS mm,caught_on AS date,competition_id AS competitionId';
const pick=(value,which,fail)=>{if(typeof value!=='string'||!uuid.test(value))fail(400,'Choose a valid '+which+'.');return value.toLowerCase();};
const isYear=value=>Number.isInteger(value)&&value>=1900&&value<=2100;
const eligible=id=>catchSpecies.find(species=>species.id===id&&species.eligible);
const privateHeaders={'Cache-Control':'private, no-store','Cross-Origin-Resource-Policy':'same-origin'};
const consentActive=(alias='')=>`(${alias}member_account IS NULL OR EXISTS(SELECT 1 FROM member_safeguard_flags f WHERE f.accountId=${alias}member_account AND f.canEnterHonours=1))`;
async function photoKey(env,fail){
  if(!env.PRIVATE_AUTH_KEY)fail(503,'Private photo storage is unavailable. Please try again later.');
  return (await privateAreaKeys(env.PRIVATE_AUTH_KEY,'PLFC honours evidence v1')).content;
}
async function read(db,identity,committee,today,year,month){
  const from=year+'-01-01',until=(year+1)+'-01-01',selected=year+'-'+String(month).padStart(2,'0');
  const q=[
    db.prepare(`SELECT * FROM (SELECT ${memberFields},COUNT(*) OVER(PARTITION BY species) AS entryCount,
      MAX(millimetres) OVER(PARTITION BY species) AS best FROM honours_entries WHERE status='verified' AND ${consentActive()} AND caught_on>=? AND caught_on<?)
      WHERE mm=best ORDER BY species,alias COLLATE NOCASE,date,id`).bind(from,until),
    db.prepare(`SELECT m.month,m.reason,m.version,e.id,e.display_name AS alias,e.species,e.millimetres AS mm,e.caught_on AS date
      FROM honours_monthly m LEFT JOIN honours_entries e ON e.id=m.entry_id AND e.status='verified' AND ${consentActive('e.')}
      WHERE m.month>=? AND m.month<? ORDER BY m.month DESC`).bind(year+'-01',(year+1)+'-01'),
    db.prepare(`SELECT id,season AS year,title,details,prizes,sponsors,published,version,offer,offer_from AS offerFrom,offer_until AS offerUntil,target_species AS targets FROM honours_competitions
      WHERE season=? AND (published=1 OR ?=1) ORDER BY title,id`).bind(year,+committee),
    db.prepare(`SELECT ${memberFields},status,review_note AS note,${consentActive()} AS eligibleNow,version FROM honours_entries WHERE (owner_id=? OR member_account=?) AND caught_on>=? AND caught_on<? ORDER BY caught_on DESC,id`).bind(identity.id,identity.id,from,until)
  ];
  q.push(db.prepare(`SELECT e.id,e.competition_id AS competitionId,e.display_name AS alias,e.species,e.millimetres AS mm,e.placing,e.prize_awarded AS prize,e.version FROM honours_entries e
    JOIN honours_competitions c ON c.id=e.competition_id WHERE c.season=? AND e.status='verified' AND ${consentActive('e.')}
    AND (c.published=1 OR ?=1) AND (e.placing IS NOT NULL OR e.prize_awarded!='' OR ?=1)
    ORDER BY c.title,e.placing IS NULL,e.placing,e.display_name COLLATE NOCASE,e.id`).bind(year,+committee,+committee));
  if(committee)q.push(db.prepare(`SELECT ${memberFields},status,review_note AS note,sighted_note AS sightedNote,photo_cipher IS NOT NULL AS hasPhoto,version
    FROM honours_entries WHERE ${consentActive()} AND caught_on>=? AND caught_on<? AND (status='pending' OR (status='verified' AND substr(caught_on,1,7)=?))
    ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,caught_on,id`).bind(from,until,selected),
    db.prepare('SELECT a.id,a.login FROM club_accounts a JOIN member_safeguard_flags f ON f.accountId=a.id WHERE a.disabled=0 AND f.canEnterHonours=1 ORDER BY a.login'));
  const [leaders,monthly,comps,own,placings,review,entrants]=await db.batch(q);
  const flags=await memberSafeguardFlags(db,identity.id);
  const grouped=new Map();
  for(const row of leaders.results){
    if(!grouped.has(row.species))grouped.set(row.species,{species:row.species,mm:row.best,count:row.entryCount,leaders:[]});
    grouped.get(row.species).leaders.push({id:row.id,alias:row.alias,date:row.date});
  }
  return {today,year,month,canEnter:Boolean(flags.canEnterHonours),standings:[...grouped.values()],awards:monthly.results.filter(row=>row.id),
    competitions:comps.results.map(c=>{
      const showOffer=committee||(c.offerFrom<=today&&today<=c.offerUntil);
      return {...c,targets:JSON.parse(c.targets),offer:showOffer?c.offer:'',offerFrom:showOffer?c.offerFrom:'',offerUntil:showOffer?c.offerUntil:'',published:Boolean(c.published),
        results:placings.results.filter(r=>r.competitionId===c.id)};
    }),myEntries:own.results,
    ...(committee?{review:review.results,eligibleEntrants:entrants.results,awardVersion:monthly.results.find(a=>a.month===selected)?.version||0}:{})};
}

export async function honoursEndpoint(request,env,identity,h){
  const url=new URL(request.url),committee=url.pathname.startsWith('/api/committee/');
  h.requireRole(identity,committee?['committee']:['member','committee']);
  const fail=(status,message)=>{throw new h.HttpError(status,message,'club_honours');};
  const storage=h.requireDb(env),db=storage.withSession?storage.withSession('first-primary'):storage;
  const endpoint='/api/'+(committee?'committee':'member')+'/honours';
  if(url.pathname!==endpoint){
    const match=/^\/api\/committee\/honours\/([^/]+)\/photo$/.exec(url.pathname);
    if(!match||!uuid.test(match[1])||!['GET','HEAD'].includes(request.method))fail(404,'This evidence photo is unavailable.');
    const row=await db.prepare(`SELECT photo_cipher AS cipher FROM honours_entries WHERE id=? AND status!='withdrawn' AND ${consentActive()}`).bind(match[1].toLowerCase()).first();
    if(!row?.cipher)fail(404,'This evidence photo is unavailable.');
    const raw=request.method==='HEAD'?null:await openPrivateText(await photoKey(env,fail),'honours:'+match[1].toLowerCase(),row.cipher);
    return h.response(raw===null?null:Uint8Array.from(atob(raw),c=>c.charCodeAt(0)),200,{...privateHeaders,'Content-Type':'image/jpeg'});
  }
  const today=new Date(Date.now()+36000000).toISOString().slice(0,10);
  const year=Number(url.searchParams.get('year')??today.slice(0,4)),month=Number(url.searchParams.get('month')??today.slice(5,7));
  if(!isYear(year)||!Number.isInteger(month)||month<1||month>12)fail(400,'Choose a valid year and month.');
  const desk=()=>read(db,identity,committee,today,year,month);
  if(request.method==='GET')return h.json(await desk(),200,privateHeaders);
  if(request.method!=='POST')fail(405,'Use the honours forms to save a change.');
  const data=await h.bodyJson(request,270000),{action,version}=data;
  if(!Object.hasOwn(fields,action)||Object.keys(data).some(k=>!['action','mutationId',...fields[action]].includes(k)))fail(400,'Use the fields on the honours form.');
  if(!committee&&!['enter','withdraw'].includes(action))fail(403,'Officers manage verified results and awards.');
  const mutation=pick(data.mutationId,'request',fail);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data,Object.keys(data).sort())))),b=>b.toString(16).padStart(2,'0')).join('');
  const receipt=()=>db.prepare('SELECT actor,digest FROM honours_changes WHERE mutation=?').bind(mutation).first();
  const matches=row=>row?.actor===identity.id&&row.digest===digest;
  const conflict=()=>fail(409,'This record changed. Refresh the board and check its current details.');
  const prior=await receipt();
  if(prior){if(!matches(prior))conflict();return h.json(await desk(),200,privateHeaders);}
  const id=action==='award'?data.month:pick(data.id,'entry',fail),now=new Date().toISOString();
  const fresh='NOT EXISTS(SELECT 1 FROM honours_changes WHERE mutation=?)';
  const text=(v,label,len,required=false)=>h.textField(v,label,len,required);
  if(!['enter','sighted'].includes(action)&&(!Number.isSafeInteger(version)||version<0))fail(400,'Open the current record before saving.');
  let change,after=[];
  if(action==='enter'||action==='sighted'){
    const alias=text(data.alias,'a name for the member board',48,true),date=h.dateField(data.date,true);
    const fish=eligible(data.species),cm=String(data.cm),mm=Math.round(Number(cm)*10);
    if(!fish || !/^\d{1,4}(?:\.\d)?$/.test(cm) || mm<1 || mm>20000 || date>today)fail(400,'Choose an eligible species, a past or current date and a measurement in centimetres to one decimal place.');
    if(data.consent!==true||/[\r\n]/.test(alias))fail(400,'Confirm permission to show this name and result to members.');
    const comp=data.competitionId?pick(data.competitionId,'competition',fail):null;
    const compGuard="SELECT 1 FROM honours_competitions WHERE id=? AND season=? AND published=1 AND (target_species='[]' OR EXISTS(SELECT 1 FROM json_each(target_species) WHERE value=?))";
    if(comp&&!await db.prepare(compGuard).bind(comp,Number(date.slice(0,4)),fish.id).first())fail(400,'Choose a listed target for this competition and year, or enter the catch as a club species record.');
    let cipher=null,note='',memberAccount=identity.id,permission='self';
    if(action==='enter'){
      if(!(await memberSafeguardFlags(db,identity.id)).canEnterHonours)fail(403,'Your membership age and current permissions must be confirmed before entering a catch.');
      const clean=sanitiseClubJpeg(data.photo,fail);
      if(!clean)fail(400,'Add a clear brag mat photo so an officer can check the measurement.');
      cipher=await sealPrivateText(await photoKey(env,fail),'honours:'+id,clean);
    }else{
      note=text(data.sightedNote,'a brief record of the photo check',400,true);
      if(data.checked!==true)fail(400,'Confirm that you inspected the photo and measurement.');
      if(data.confirmed16!==true)fail(400,'Confirm that the entrant is 16 or older and agreed to appear in the results.');
      permission='officer-checked-16-plus-and-consent';
      memberAccount=text(data.entrantId,'the entrant’s club account',240)||null;
      if(memberAccount&&!(await memberSafeguardFlags(db,memberAccount)).canEnterHonours)fail(403,'This account does not have current permission to enter catches.');
    }
    change=db.prepare(`INSERT INTO honours_entries(id,owner_id,member_account,consent_kind,display_name,species,millimetres,caught_on,competition_id,consent_at,photo_cipher,sighted_note,status,reviewed_by,reviewed_at)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${fresh} AND (? IS NULL OR EXISTS(${compGuard}))
      AND (? IS NULL OR EXISTS(SELECT 1 FROM member_safeguard_flags WHERE accountId=? AND canEnterHonours=1)) ON CONFLICT(id) DO NOTHING`)
      .bind(id,identity.id,memberAccount,permission,alias,fish.id,mm,date,comp,now,cipher,note,action==='enter'?'pending':'verified',action==='sighted'?identity.id:null,action==='sighted'?now:null,mutation,comp,comp,Number(date.slice(0,4)),fish.id,memberAccount,memberAccount);
  }else if(action==='review'||action==='withdraw'){
    const withdrawal=action==='withdraw',state=withdrawal?'withdrawn':data.decision;
    if(!withdrawal && (!['verified','declined'].includes(state)||(state==='verified'&&data.checked!==true)))fail(400,'Check the photo before verifying this catch.');
    const note=withdrawal?'':text(data.note,'a review note',400,state==='declined');
    const guard=withdrawal?"(owner_id=? OR member_account=?) AND status!='withdrawn'":state==='verified'?`photo_cipher IS NOT NULL AND status='pending' AND ${consentActive()}`:"status IN ('pending','verified')";
    change=db.prepare(`UPDATE honours_entries SET status=?,review_note=?,reviewed_by=?,reviewed_at=?,photo_cipher=CASE WHEN ?='withdrawn' THEN NULL ELSE photo_cipher END,version=version+1
      WHERE id=? AND version=? AND ${guard} AND ${fresh}`).bind(state,note,identity.id,now,state,id,version,...(withdrawal?[identity.id,identity.id]:[]),mutation);
    if(state!=='verified')after=[db.prepare("UPDATE honours_monthly SET entry_id=NULL,reason='',version=version+1 WHERE entry_id=? AND EXISTS(SELECT 1 FROM honours_changes WHERE mutation=? AND actor=? AND digest=?)").bind(id,mutation,identity.id,digest)];
  }else if(action==='placing'){
    const place=data.place==null?null:data.place,prize=text(data.prize,'the prize awarded',160);
    if((place!==null&&(!Number.isInteger(place)||place<1||place>99))||data.confirmed!==true)fail(400,'Check the placing, prize and entrant permission before publishing.');
    change=db.prepare(`UPDATE honours_entries SET placing=?,prize_awarded=?,version=version+1 WHERE id=? AND version=?
      AND competition_id IS NOT NULL AND status='verified' AND ${consentActive()} AND ${fresh}`).bind(place,prize,id,version,mutation);
  }else if(action==='competition'){
    const title=text(data.title,'the competition name',140,true),details=text(data.details,'the confirmed competition details',1500),prizes=text(data.prizes,'the prize details',800),sponsors=text(data.sponsors,'approved sponsor names',800);
    if(!isYear(data.year)||typeof data.published!=='boolean'||/[\r\n]/.test(title))fail(400,'Choose the competition year, name and publishing status.');
    if(data.published&&data.allAges!==true)fail(400,'Check that the prize and sponsor wording is suitable for all club ages before sharing it.');
    const offer=text(data.offer,'the approved sponsor offer',500);
    const start=offer?h.dateField(data.offerFrom,true):'',end=offer?h.dateField(data.offerUntil,true):'';
    if(offer&&(!sponsors||end<start))fail(400,'Name the sponsor and enter the offer dates in order.');
    if(data.targets!==undefined&&(!Array.isArray(data.targets)||data.targets.length>catchSpecies.length||data.targets.some(id=>!eligible(id))))fail(400,'Choose target species from the club list.');
    const targets=data.targets===undefined?null:JSON.stringify([...new Set(data.targets)].sort());
    const values=[data.year,title,details,prizes,sponsors,+data.published,offer,start,end];
    change=version===0?db.prepare(`INSERT INTO honours_competitions(id,season,title,details,prizes,sponsors,published,offer,offer_from,offer_until,target_species) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE ${fresh} ON CONFLICT(id) DO NOTHING`).bind(id,...values,targets??'[]',mutation):
      db.prepare(`UPDATE honours_competitions SET season=?,title=?,details=?,prizes=?,sponsors=?,published=?,offer=?,offer_from=?,offer_until=?,target_species=COALESCE(?,target_species),version=version+1 WHERE id=? AND version=? AND ${fresh}
        AND NOT EXISTS(SELECT 1 FROM honours_entries WHERE competition_id=? AND substr(caught_on,1,4)!=?)
        AND (? IS NULL OR ?='[]' OR NOT EXISTS(SELECT 1 FROM honours_entries WHERE competition_id=? AND status IN ('pending','verified') AND species NOT IN (SELECT value FROM json_each(?))))`).bind(...values,targets,id,version,mutation,id,String(data.year),targets,targets,id,targets);
  }else{
    if(typeof data.month!=='string'||!/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(data.month))fail(400,'Choose a valid award month.');
    const entry=data.entryId?pick(data.entryId,'verified catch',fail):null,reason=entry?text(data.reason,'the award wording',500):'';
    const guard=`(? IS NULL OR EXISTS(SELECT 1 FROM honours_entries WHERE id=? AND status='verified' AND substr(caught_on,1,7)=? AND ${consentActive()}))`;
    change=version===0?db.prepare(`INSERT INTO honours_monthly(month,entry_id,reason) SELECT ?,?,? WHERE ${fresh} AND ${guard} AND ? IS NOT NULL ON CONFLICT(month) DO NOTHING`).bind(data.month,entry,reason,mutation,entry,entry,data.month,entry):
      db.prepare(`UPDATE honours_monthly SET entry_id=?,reason=?,version=version+1 WHERE month=? AND version=? AND ${fresh} AND ${guard}`).bind(entry,reason,data.month,version,mutation,entry,entry,data.month);
  }
  let result;
  try{
    [result]=await db.batch([change,db.prepare('INSERT INTO honours_changes SELECT ?,?,? WHERE changes()=1').bind(mutation,identity.id,digest),
      db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),identity.id,identity.accountRole||identity.role,'honours_'+action,id,now),...after]);
  }catch(error){
    if(String(error.message).includes('junior_entries_require_targets'))fail(409,'A junior entry already uses this season and species. Keep its season and include the species in the targets.');
    throw error;
  }
  if(!result.meta.changes&&!matches(await receipt()))conflict();
  return h.json(await desk(),200,privateHeaders);
}
