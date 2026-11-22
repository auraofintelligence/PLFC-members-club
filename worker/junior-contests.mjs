import {catchSpecies} from '../public/catch-species.mjs';
import {privateAreaKeys,sealPrivateText,openPrivateText,sanitiseClubJpeg} from './member-network.mjs';
import {memberSafeguardFlags} from './member-safeguards.mjs';

const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const edition='junior-member-board-2026-11-21';
const privateHeaders={'Cache-Control':'private, no-store','Cross-Origin-Resource-Policy':'same-origin','X-Content-Type-Options':'nosniff'};
const eligible='EXISTS(SELECT 1 FROM member_safeguard_flags WHERE accountId=? AND canEnterHonours=1)';
const fields={
  child:['id','nickname','adultGuardian'],enter:['id','childId','competitionId','species','cm','date','adultGuardian','under16AtEvent','resultConsent','nicknameConsent','photoConsent','photo'],
  review:['id','version','decision','guardianChecked','catchChecked','photoChecked'],withdraw:['id','version'],unsharePhoto:['id','version'],unshareNickname:['id','version'],
};
const entryFields='j.id,j.child_id AS childId,n.nickname,j.competition_id AS competitionId,c.title AS competition,j.species,j.millimetres AS mm,j.caught_on AS date,j.status,j.result_consent AS resultConsent,j.nickname_consent AS nicknameConsent,j.photo_consent AS photoConsent,j.version';
const entryJoins=' FROM junior_entries j JOIN junior_anglers n ON n.id=j.child_id JOIN honours_competitions c ON c.id=j.competition_id';
const photoPath=(where,id,kind='photo')=>'/api/'+where+'/juniors/'+id+'/'+kind;
const encoder=new TextEncoder();
async function fingerprint(value){
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
}

export async function juniorContestsEndpoint(request,env,identity,h){
  const url=new URL(request.url),committee=url.pathname.startsWith('/api/committee/juniors'),base='/api/'+(committee?'committee':'member')+'/juniors';
  const fail=(status,message)=>{throw new h.HttpError(status,message,'junior_contests');};
  if(!identity)fail(401,'Sign in to open the junior competitions.');
  const officer=identity.role==='committee',member=identity.accountRole==='member'&&['member','signed_in'].includes(identity.role);
  if((committee&&!officer)||(!committee&&!member&&!officer))fail(403,'Use the appropriate club account to open junior competitions.');
  const storage=h.requireDb(env),db=storage.withSession?storage.withSession('first-primary'):storage;
  const active=member&&identity.role==='member';
  const today=new Date(Date.now()+36000000).toISOString().slice(0,10);
  const key=async()=>(await privateAreaKeys(env.PRIVATE_AUTH_KEY,'PLFC junior contest evidence v1')).content;
  if(url.pathname!==base){
    const match=url.pathname.slice(base.length).match(/^\/([a-f0-9-]{36})\/(photo|evidence)$/i);
    if(!match||!uuid.test(match[1])||!['HEAD','GET'].includes(request.method))fail(404,'This photo is unavailable.');
    const id=match[1].toLowerCase(),own=match[2]==='evidence';
    let statement;
    if(committee&&!own)statement=db.prepare("SELECT j.photo_cipher FROM junior_entries j JOIN member_safeguard_flags f ON f.accountId=j.guardian WHERE j.id=? AND j.status IN ('pending','verified') AND f.canEnterHonours=1").bind(id);
    else if(!committee&&own&&member)statement=db.prepare('SELECT photo_cipher FROM junior_entries WHERE id=? AND guardian=?').bind(id,identity.id);
    else if(!committee&&!own&&(active||officer))statement=db.prepare('SELECT j.photo_cipher FROM junior_entries j JOIN junior_live_results p ON p.id=j.id WHERE p.id=? AND p.photo_live=1').bind(id);
    const row=await statement?.first();if(!row)fail(404,'This photo is unavailable.');
    const bytes=request.method==='HEAD'?null:Uint8Array.from(atob(await openPrivateText(await key(),'junior:'+id,row.photo_cipher)),c=>c.charCodeAt(0));
    return h.response(bytes,200,{...privateHeaders,'Content-Type':'image/jpeg'});
  }
  const year=Number(url.searchParams.get('year')||today.slice(0,4));
  if(!Number.isInteger(year)||year<1900||year>2100)fail(400,'Choose the competition year.');
  if(request.method==='GET'){
    const start=year+'-01-01',end=(year+1)+'-01-01';
    const present=(row,desk)=>({...row,resultConsent:Boolean(row.resultConsent),nicknameConsent:Boolean(row.nicknameConsent),photoConsent:Boolean(row.photoConsent),hasPhoto:true,
      evidenceUrl:desk?(row.reviewable?photoPath('committee',row.id):null):photoPath('member',row.id,'evidence')});
    if(committee){
      const {results}=await db.prepare('SELECT '+entryFields+',a.login AS guardianLogin,(f.canEnterHonours=1 AND j.status IN (\'pending\',\'verified\')) AS reviewable'+entryJoins+' JOIN club_accounts a ON a.id=j.guardian JOIN member_safeguard_flags f ON f.accountId=j.guardian WHERE j.caught_on>=? AND j.caught_on<? ORDER BY j.status=\'pending\' DESC,j.entered DESC,j.id').bind(start,end).all();
      return h.json({entries:results.map(r=>present(r,true))},200,privateHeaders);
    }
    const canEnter=active&&(await memberSafeguardFlags(db,identity.id)).canEnterHonours;
    const empty={results:[]};
    const [children,own,competitions,results]=await Promise.all([
      member?db.prepare('SELECT id,nickname FROM junior_anglers WHERE guardian=? ORDER BY nickname,id').bind(identity.id).all():empty,
      member?db.prepare('SELECT '+entryFields+entryJoins+' WHERE j.guardian=? AND j.caught_on>=? AND j.caught_on<? ORDER BY j.entered DESC,j.id').bind(identity.id,start,end).all():empty,
      active||officer?db.prepare('SELECT id,title,season AS year,target_species AS targets FROM honours_competitions WHERE season=? AND published=1 ORDER BY title,id').bind(year).all():empty,
      active||officer?db.prepare('SELECT id,nickname,competition_id AS competitionId,competition,species,millimetres AS mm,caught_on AS date,photo_live AS showPhoto FROM junior_live_results WHERE caught_on>=? AND caught_on<? ORDER BY competition,species,mm DESC,nickname,id').bind(start,end).all():empty,
    ]);
    return h.json({canEnter:Boolean(canEnter),children:children.results,competitions:competitions.results.map(c=>({...c,targets:JSON.parse(c.targets)})),
      ownEntries:own.results.map(r=>present(r,false)),results:results.results.map(({showPhoto,...r})=>({...r,photoUrl:showPhoto?photoPath('member',r.id):null}))},200,privateHeaders);
  }
  if(request.method!=='POST')fail(405,'Use the junior competition form.');
  const data=await h.bodyJson(request,270000),action=data.action;
  if(!Object.hasOwn(fields,action)||Object.keys(data).some(k=>k!=='action'&&!fields[action].includes(k))||!uuid.test(data.id||''))fail(400,'Check the fields on the junior competition form.');
  if((committee&&action!=='review')||(!committee&&(action==='review'||!member)))fail(403,'This action needs the appropriate guardian or committee account.');
  if(['enter','child'].includes(action)&&(!active||!(await memberSafeguardFlags(db,identity.id)).canEnterHonours))fail(403,'Use your current member account after your age group and sharing agreement have been checked.');
  const id=data.id.toLowerCase(),stamp=new Date().toISOString();
  const conflict=()=>fail(409,'This entry or its permissions have changed. Refresh the junior competition desk.');
  const audit=db.prepare("INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),identity.id,identity.accountRole||identity.role,'junior_'+action,id,stamp);
  let update;
  if(action==='child'){
    const nick=h.textField(data.nickname,'a junior nickname',40,true);
    if(data.adultGuardian!==true||/[\r\n@]|https?:\/\//i.test(nick))fail(400,'Use a nickname and confirm you are their parent or legal guardian aged 18 or over.');
    update=db.prepare('INSERT INTO junior_anglers(id,guardian,nickname,guardian_declaration_at) SELECT ?,?,?,? WHERE '+eligible+' ON CONFLICT(id) DO NOTHING').bind(id,identity.id,nick,stamp,identity.id);
    const [saved]=await db.batch([update,audit]);
    if(!saved.meta.changes&&!(await db.prepare('SELECT 1 FROM junior_anglers WHERE id=? AND guardian=? AND nickname=?').bind(id,identity.id,nick).first()))conflict();
  }else if(action==='enter'){
    if(!uuid.test(data.childId||'')||!uuid.test(data.competitionId||'')||data.adultGuardian!==true||data.under16AtEvent!==true)fail(400,'Choose a junior and an event, then confirm the age and guardian declarations.');
    const nicknameConsent=data.nicknameConsent??false;
    if(typeof data.resultConsent!=='boolean'||typeof data.photoConsent!=='boolean'||typeof nicknameConsent!=='boolean'||((data.photoConsent||nicknameConsent)&&!data.resultConsent))fail(400,'Choose whether club members may see the result, nickname and photo.');
    const species=catchSpecies.find(e=>e.id===data.species&&e.eligible);
    const cm=String(data.cm),mm=Math.round(Number(cm)*10),date=h.dateField(data.date,true);
    if(!species||!/^\d{1,4}(\.\d)?$/.test(cm)||mm<1||mm>20000||date>today)fail(400,'Choose an eligible species, a measured length and a catch date up to today.');
    const photo=sanitiseClubJpeg(data.photo,fail);if(!photo)fail(400,'Add a brag mat photo for the officer to check privately.');
    const child=data.childId.toLowerCase(),comp=data.competitionId.toLowerCase();
    const digest=await fingerprint([identity.id,child,comp,species.id,mm,date,data.resultConsent,nicknameConsent,data.photoConsent,photo]);
    const cipher=await sealPrivateText(await key(),'junior:'+id,photo);
    update=db.prepare("INSERT INTO junior_entries(id,guardian,child_id,competition_id,species,millimetres,caught_on,entered,consent_edition,result_consent,nickname_consent,photo_consent,initial_digest,photo_cipher) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE "+eligible+" AND EXISTS(SELECT 1 FROM junior_anglers WHERE id=? AND guardian=?) AND EXISTS(SELECT 1 FROM honours_competitions WHERE id=? AND season=? AND published=1 AND (json_array_length(target_species)=0 OR EXISTS(SELECT 1 FROM json_each(target_species) WHERE value=?))) ON CONFLICT(id) DO NOTHING")
      .bind(id,identity.id,child,comp,species.id,mm,date,stamp,edition,+data.resultConsent,+nicknameConsent,+data.photoConsent,digest,cipher,identity.id,child,identity.id,comp,Number(date.slice(0,4)),species.id);
    const [saved]=await db.batch([update,audit]);
    if(!saved.meta.changes&&!(await db.prepare('SELECT 1 FROM junior_entries WHERE id=? AND guardian=? AND initial_digest=?').bind(id,identity.id,digest).first()))conflict();
  }else{
    if(!Number.isSafeInteger(data.version)||data.version<1)fail(400,'Refresh the entry before making a change.');
    if(action==='review'){
      const verified=data.decision==='verified';
      if(!['verified','declined'].includes(data.decision)||[data.guardianChecked,data.catchChecked,data.photoChecked].some(v=>typeof v!=='boolean'))fail(400,'Choose an outcome and record which checks you completed.');
      if(verified&&(!data.guardianChecked||!data.catchChecked))fail(400,'Confirm the 18+ parent or guardian and the catch measurement before verifying a junior entry.');
      update=db.prepare("UPDATE junior_entries SET status=?,guardian_checked=?,catch_checked=?,photo_checked=?,reviewed_by=?,reviewed_at=?,version=version+1 WHERE id=? AND version=? AND status='pending' AND EXISTS(SELECT 1 FROM member_safeguard_flags WHERE accountId=guardian AND canEnterHonours=1) AND EXISTS(SELECT 1 FROM honours_competitions WHERE id=competition_id AND published=1) AND (?=0 OR photo_consent=0 OR ?=1)")
        .bind(data.decision,+data.guardianChecked,+data.catchChecked,+data.photoChecked,identity.id,stamp,id,data.version,+verified,+data.photoChecked);
    }else if(action==='withdraw'){
      update=db.prepare("UPDATE junior_entries SET status='withdrawn',result_consent=0,nickname_consent=0,photo_consent=0,version=version+1 WHERE id=? AND version=? AND guardian=? AND status<>'withdrawn'").bind(id,data.version,identity.id);
    }else{
      const choice=action==='unshareNickname'?'nickname_consent':'photo_consent';
      update=db.prepare('UPDATE junior_entries SET '+choice+'=0,version=version+1 WHERE id=? AND version=? AND guardian=? AND '+choice+'=1').bind(id,data.version,identity.id);
    }
    const [saved]=await db.batch([update,audit]);if(!saved.meta.changes)conflict();
  }
  return h.json({ok:true},200,privateHeaders);
}
