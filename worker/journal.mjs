import {privateAreaKeys,sealPrivateText,openPrivateText,sanitiseClubJpeg} from './member-network.mjs';
import {memberSafeguardFlags} from './member-safeguards.mjs';
import {isPinStyle} from '../public/catch-pin-styles.mjs';

const path='/api/member/journal';
const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const headers={'Cache-Control':'private, no-store','Cross-Origin-Resource-Policy':'same-origin'};
const fields="c.id,c.species,c.length_cm AS lengthCm,c.caught_on AS date,c.location,c.notes,c.created_at AS createdAt,m.photo_cipher IS NOT NULL AS hasPhoto,m.pin_cipher AS pinCipher,COALESCE(m.version,0) AS version";
const source='catches c LEFT JOIN journal_media m ON m.catch_id=c.id';
const fresh="(?='committee' OR EXISTS(SELECT 1 FROM member_safeguard_flags WHERE accountId=? AND canUseJournal=1 AND (?=0 OR socialAccess=1)))";

export function readCatchFields(body,{textField,dateField,HttpError}){
  const lengthCm=body.lengthCm===''||body.lengthCm==null?null:body.lengthCm;
  if(lengthCm!==null&&(typeof lengthCm!=='number'||!Number.isFinite(lengthCm)||lengthCm<=0||lengthCm>2000))
    throw new HttpError(400,'Please enter a valid fish length in centimetres.','invalid_input');
  return {species:textField(body.species,'the species',80,true),lengthCm,date:dateField(body.date),location:textField(body.location,'the general area',100),notes:textField(body.notes,'the catch notes',2000)};
}

export async function journalEndpoint(request,env,identity,h){
  h.requireRole(identity,['member','committee']);
  const fail=(status,msg)=>{throw new h.HttpError(status,msg,'catch_journal');};
  const storage=h.requireDb(env),db=storage.withSession?.('first-primary')||storage;
  const flags=identity.role==='committee'?{canUseJournal:true,socialAccess:true}:await memberSafeguardFlags(db,identity.id);
  if(!flags.canUseJournal)fail(403,'Ask the committee to check your age group and any guardian permission for the private journal.');
  const url=new URL(request.url),part=url.pathname.slice(path.length),asset=part.match(/^\/([a-f\d-]{36})\/photo$/i);
  const canPin=!!flags.socialAccess;
  let keys;
  function getKeys(){
    if(!env.PRIVATE_AUTH_KEY)fail(503,'Private catch storage is unavailable. Please try again later.');
    return keys??=privateAreaKeys(env.PRIVATE_AUTH_KEY,'PLFC private catch journal v1');
  }
  const guard=pin=>[identity.role,identity.id,Number(pin)];
  const imageUrl=id=>path+'/'+id+'/photo';
  async function record({pinCipher,hasPhoto,...item}){
    const pin=pinCipher&&canPin?JSON.parse(await openPrivateText((await getKeys()).content,'journal-pin:'+item.id,pinCipher)):null;
    return {...item,pin,photoUrl:hasPhoto?imageUrl(item.id):null};
  }
  if(asset){
    if(!['GET','HEAD'].includes(request.method))fail(405,'Open the photo to view it.');
    const row=await db.prepare('SELECT '+(request.method==='HEAD'?'1 AS existsPhoto':'m.photo_cipher AS photo')+' FROM '+source+' WHERE c.owner_id=? AND c.id=? AND m.photo_cipher IS NOT NULL AND '+fresh)
      .bind(identity.id,asset[1],...guard(false)).first();
    if(!row)fail(404,'This journal photo is unavailable.');
    const bytes=request.method==='HEAD'?null:Uint8Array.from(atob(await openPrivateText((await getKeys()).content,'journal-photo:'+asset[1],row.photo)),c=>c.charCodeAt(0));
    return h.response(bytes,200,{...headers,'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff'});
  }
  if(part)fail(404,'This catch journal page is unavailable.');
  if(request.method==='GET'){
    const pins=url.searchParams.get('pins')==='1',cursor=url.searchParams.get('cursor');
    if(pins&&!canPin)return h.json({catches:[],nextCursor:null},200,headers);
    let position=[];
    if(cursor){
      try{position=JSON.parse(atob(cursor));}catch{fail(400,'Use the earlier catches button to continue.');}
      if(!Array.isArray(position)||position.length!==3||position.some(x=>typeof x!=='string'||x.length>100))fail(400,'Choose an earlier page from your journal.');
    }
    const result=await db.prepare('SELECT '+fields+' FROM '+source+' WHERE c.owner_id=? AND '+fresh+
      (pins?' AND m.pin_cipher IS NOT NULL':'')+(cursor?' AND (c.caught_on,c.created_at,c.id)<(?,?,?)':'')+' ORDER BY c.caught_on DESC,c.created_at DESC,c.id DESC LIMIT 41')
      .bind(identity.id,...guard(pins),...position).all();
    const page=result.results.slice(0,40),last=page.at(-1);
    return h.json({catches:await Promise.all(page.map(record)),nextCursor:result.results.length>40?btoa(JSON.stringify([last.date,last.createdAt,last.id])):null},200,headers);
  }
  if(request.method!=='POST')fail(405,'Use the journal form to save your catch.');
  const body=await h.bodyJson(request,265000);
  const edit=body.action==='media',id=body.id,version=body.version??0;
  const allowed=edit?['action','id','version','photo','pin']:['id','species','lengthCm','date','location','notes','photo','pin'];
  if(Object.keys(body).some(key=>!allowed.includes(key))||typeof id!=='string'||!uuid.test(id)||!Number.isSafeInteger(version)||version<0)
    fail(400,'Reopen your journal entry and try again.');
  const setPhoto=Object.hasOwn(body,'photo'),setPin=Object.hasOwn(body,'pin');
  if(edit&&!setPhoto&&!setPin)fail(400,'Choose a photo or a map change before saving.');
  let pin=null;
  if(setPin){
    if(!canPin)fail(403,'Precise map pins require age 16 or over and current agreement to the clubhouse terms.');
    if(body.pin!==null){
      const p=body.pin;
      if(!p||typeof p!=='object'||Object.keys(p).some(k=>!['latitude','longitude','style'].includes(k))||
        (Object.hasOwn(p,'style')&&!isPinStyle(p.style))||
        !Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180)
        fail(400,'Choose a valid spot on the map.');
      pin={latitude:p.latitude,longitude:p.longitude,...(p.style?{style:p.style}:{})};
    }
  }
  const photo=setPhoto?sanitiseClubJpeg(body.photo,fail):null;
  const details=edit?null:readCatchFields(body,h),{receipt,content}=await getKeys();
  const bytes=new TextEncoder().encode(JSON.stringify([identity.id,id,edit,version,details,setPhoto,photo,setPin,pin]));
  const digest=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',receipt,bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const saved=()=>db.prepare('SELECT '+fields+',m.request_digest AS receipt FROM '+source+' WHERE c.owner_id=? AND c.id=? AND '+fresh).bind(identity.id,id,...guard(setPin)).first();
  const existing=await saved();
  const reply=async(row,status)=>{const {receipt:ignored,...item}=row;return h.json({catch:await record(item)},status,headers);};
  if(existing?.receipt===digest)return reply(existing,200);
  if(edit&&!existing)fail(404,'This catch is unavailable in your journal.');
  if((edit&&existing.version!==version)||(!edit&&existing))fail(409,'This entry has changed. Reopen it before saving.');
  const photoCipher=photo?await sealPrivateText(content,'journal-photo:'+id,photo):null;
  const pinCipher=pin?await sealPrivateText(content,'journal-pin:'+id,JSON.stringify(pin)):null;
  const when=new Date().toISOString(),writes=[];
  if(!edit){
    writes.push(db.prepare('INSERT INTO catches(id,owner_id,species,length_cm,caught_on,location,notes,created_at) SELECT ?,?,?,?,?,?,?,? WHERE '+fresh+' ON CONFLICT(id) DO NOTHING')
      .bind(id,identity.id,details.species,details.lengthCm,details.date,details.location,details.notes,when,...guard(setPin)));
    writes.push(db.prepare('INSERT INTO journal_media(catch_id,photo_cipher,pin_cipher,version,request_digest) SELECT ?,?,?,1,? WHERE changes()=1')
      .bind(id,photoCipher,pinCipher,digest));
  }else if(version===0){
    writes.push(db.prepare('INSERT INTO journal_media(catch_id,photo_cipher,pin_cipher,version,request_digest) SELECT c.id,?,?,1,? FROM catches c WHERE c.owner_id=? AND c.id=? AND '+fresh+' ON CONFLICT(catch_id) DO NOTHING')
      .bind(photoCipher,pinCipher,digest,identity.id,id,...guard(setPin)));
  }else{
    writes.push(db.prepare('UPDATE journal_media SET photo_cipher=CASE WHEN ? THEN ? ELSE photo_cipher END,pin_cipher=CASE WHEN ? THEN ? ELSE pin_cipher END,version=version+1,request_digest=? WHERE catch_id=? AND version=? AND EXISTS(SELECT 1 FROM catches WHERE id=? AND owner_id=?) AND '+fresh)
      .bind(+setPhoto,photoCipher,+setPin,pinCipher,digest,id,version,id,identity.id,...guard(setPin)));
  }
  writes.push(db.prepare('INSERT INTO audit_log(id,actor_id,actor_role,action,entity_id,occurred_at) SELECT ?,?,?,?,?,? WHERE changes()=1')
    .bind(crypto.randomUUID(),identity.id,identity.role,edit?'catch_media_updated':'catch_created',id,when));
  const [written]=await db.batch(writes),row=await saved();
  if(row?.receipt!==digest)fail(409,'This journal entry or your access has changed. Reopen your journal before saving.');
  return reply(row,!edit&&written.meta.changes?201:200);
}
