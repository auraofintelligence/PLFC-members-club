import {describeCampaignChanges,ensureSocialHistory,revisionStatement,readSocialHistory} from './social-campaign-history.mjs';
const ids=['fish','bait','weather','safety','events','holidays','nswHolidays','camping','competition','newsletter','membership','raffles','fundraisers','wishes','community','surprise'];
const memberships=['all','adult','cadet','junior','social','casual','lifetime','prospect'];
const genders=['all','women','men','self-described'];
const places=['all','local','tourist','regional'];
const destinations=['facebook','instagram','youtube','tiktok','noticeboard'];

const officerTitles={
  president:'President',vicepresident:'Vice President',secretary:'Secretary',
  assistantsecretary:'Assistant Secretary',treasurer:'Treasurer'
};
export const officeSignature=(identity,now)=>{
  const by=String(identity?.name||'Committee officer').trim().slice(0,100)||'Committee officer';
  const key=by.toLowerCase().replace(/[\s-]+/g,'');
  const office=officerTitles[key]||(identity?.administrator?'Webmaster':'Committee member');
  return {by,office,at:now};
};
export function stampDayPlanSignatures(next,previous,identity,now){
  const author=officeSignature(identity,now);
  const before=previous?.dayPlans||{};
  for(const [date,plan] of Object.entries(next.dayPlans||{})){
    const prior=before[date],oldSignature=prior?.signature;
    const oldContent=prior&&JSON.stringify({patternId:prior.patternId,items:prior.items});
    const newContent=JSON.stringify({patternId:plan.patternId,items:plan.items});
    if(prior&&oldContent===newContent){
      if(oldSignature)plan.signature=oldSignature;
      else delete plan.signature;
      continue;
    }
    plan.signature={
      preparedBy:oldSignature?.preparedBy||author.by,
      preparedOffice:oldSignature?.preparedOffice||author.office,
      preparedAt:oldSignature?.preparedAt||author.at,
      editedBy:author.by,editedOffice:author.office,editedAt:author.at
    };
  }
  return next;
}

const validDestinations=values=>Array.isArray(values)&&values.length<=destinations.length&&new Set(values).size===values.length&&values.every(id=>destinations.includes(id));
function validAudience(values,allowed){
  return Array.isArray(values) && values.length>=1 && values.length<=allowed.length &&
    values.every(v=>allowed.includes(v)) && new Set(values).size===values.length &&
    (!values.includes('all')||values.length===1);
}
export function validateCampaignSettings(value,fail){
  const bad=()=>fail('Check the campaign pattern settings and audience choices.');
  if(!value || typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!=='dayArchetypes,dayOverrides,dayPlans,delivery,layers,limits,milestones,monthOverrides,postingTime,timingSignals,videoShare,weekOverrides')bad();
  if(!Number.isInteger(value.videoShare)||value.videoShare<0||value.videoShare>100)bad();
  if(value.postingTime!=='auto' && (typeof value.postingTime!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.postingTime)))bad();
  if(!value.delivery||Object.keys(value.delivery).sort().join(',')!=='organic,paid,paidPlanning'||
    typeof value.delivery.paidPlanning!=='boolean'||!validDestinations(value.delivery.organic)||
    !validDestinations(value.delivery.paid))bad();
  const limitIds=['weekday','friday','weekend','longWeekend','publicHoliday','holiday'];
  const expectedKeys=limitIds.flatMap(key=>[key,key+'Min']).sort().join(',');
  const previousKeys=['friday','holiday','weekday','weekend'].sort().join(',');
  if(!value.limits||typeof value.limits!=='object'||Array.isArray(value.limits))bad();
  const received=Object.keys(value.limits).sort().join(',');
  if(received===previousKeys){
    if(Object.values(value.limits).some(n=>!Number.isInteger(n)||n<0||n>12))bad();
    const defaults={
      weekdayMin:1,weekday:4,fridayMin:1,friday:3,weekendMin:1,weekend:4,
      longWeekendMin:2,longWeekend:5,publicHolidayMin:2,publicHoliday:6,
      holidayMin:1,holiday:5
    };
    for(const id of ['weekday','friday','weekend','holiday']){
      const max=id==='weekday'&&value.limits[id]===2?4:value.limits[id];
      defaults[id]=Math.max(defaults[id+'Min'],max);
    }
    value.limits=defaults;
  }else{
    if(received!==expectedKeys ||
      Object.values(value.limits).some(n=>!Number.isInteger(n)||n<1||n>12)||
      limitIds.some(key=>value.limits[key+'Min']>value.limits[key]))bad();
  }
  if(!value.layers||typeof value.layers!=='object'||Array.isArray(value.layers)||
    Object.keys(value.layers).length!==ids.length||ids.some(id=>!Object.hasOwn(value.layers,id)))bad();
  for(const id of ids){
    const p=value.layers[id];
    if(!p||Object.keys(p).sort().join(',')!=='audience,enabled,visible,weekly'||
      typeof p.enabled!=='boolean'||typeof p.visible!=='boolean'||!Number.isInteger(p.weekly)||p.weekly<0||p.weekly>7)bad();
    const a=p.audience;
    if(!a||Object.keys(a).sort().join(',')!=='gender,membership,place'||
      !validAudience(a.membership,memberships)||!validAudience(a.gender,genders)||!validAudience(a.place,places))bad();
  }
  const signalKinds=['holidays','nswHolidays','event','meeting','season_open','season_close'];
  if(!value.timingSignals||typeof value.timingSignals!=='object'||Array.isArray(value.timingSignals)||
    Object.keys(value.timingSignals).sort().join(',')!==signalKinds.slice().sort().join(','))bad();
  for(const kind of signalKinds){
    const signal=value.timingSignals[kind];
    if(!signal||Object.keys(signal).sort().join(',')!=='enabled,leadDays'||
      typeof signal.enabled!=='boolean'||!Array.isArray(signal.leadDays)||
      signal.leadDays.length>12||new Set(signal.leadDays).size!==signal.leadDays.length||
      signal.leadDays.some(n=>!Number.isInteger(n)||n<1||n>365))bad();
  }
  if(!Array.isArray(value.milestones)||value.milestones.length>80)bad();
  const milestoneIds=new Set();
  for(const item of value.milestones){
    if(!item||typeof item!=='object'||Array.isArray(item)||
      Object.keys(item).sort().join(',')!=='confirmed,date,id,kind,sourceUrl,title'||
      typeof item.id!=='string'||!/^m-[a-zA-Z0-9-]{6,50}$/.test(item.id)||
      milestoneIds.has(item.id)||!signalKinds.slice(2).includes(item.kind)||
      typeof item.title!=='string'||item.title.trim().length<4||item.title.length>140||
      typeof item.confirmed!=='boolean'||typeof item.sourceUrl!=='string'||item.sourceUrl.length>400 ||
      (item.sourceUrl && !/^https:\/\/[^\s]+$/.test(item.sourceUrl)))bad();
    milestoneIds.add(item.id);
    if(!/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(item.date) ||
      Number.isNaN(Date.parse(item.date+'T00:00:00Z')) ||
      new Date(item.date+'T00:00:00Z').toISOString().slice(0,10)!==item.date)bad();
  }
  const validMonth=s=>/^20\d\d-(0[1-9]|1[0-2])$/.test(s);
  const validDay=s=>/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(s)&&
    !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const dayKinds=['weekday','friday','weekend','longWeekend','publicHoliday','holiday'];
  const validSlot=slot=>slot&&typeof slot==='object'&&!Array.isArray(slot)&&
    Object.keys(slot).sort().join(',')==='brief,format,id,layerId,time,title'&&
    typeof slot.id==='string'&&/^[-a-zA-Z0-9_]{1,50}$/.test(slot.id)&&
    ids.includes(slot.layerId)&&['video','image','carousel','link'].includes(slot.format)&&
    typeof slot.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.time)&&
    typeof slot.title==='string'&&slot.title.trim().length>0&&slot.title.length<=180&&
    typeof slot.brief==='string'&&slot.brief.length<=4000;
  const validateSlots=items=>{
    if(!Array.isArray(items)||items.length<1||items.length>12||
      items.some(slot=>!validSlot(slot))||
      new Set(items.map(slot=>slot.id)).size!==items.length)bad();
  };
  if(!value.dayPlans||typeof value.dayPlans!=='object'||Array.isArray(value.dayPlans)||
    Object.keys(value.dayPlans).length>366)bad();
  for(const [date,plan] of Object.entries(value.dayPlans)){
    if(!validDay(date)||!plan||typeof plan!=='object'||Array.isArray(plan)||
      !['items,patternId','items,patternId,signature'].includes(Object.keys(plan).sort().join(','))||
      typeof plan.patternId!=='string'||plan.patternId.length>80)bad();
    if(plan.signature){
      const record=plan.signature;
      if(!record||typeof record!=='object'||Array.isArray(record)||
        Object.keys(record).sort().join(',')!=='editedAt,editedBy,editedOffice,preparedAt,preparedBy,preparedOffice'||
        ['preparedBy','preparedOffice','editedBy','editedOffice'].some(key=>typeof record[key]!=='string'||!record[key].trim()||record[key].length>100)||
        ['preparedAt','editedAt'].some(key=>typeof record[key]!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d/.test(record[key])||Number.isNaN(Date.parse(record[key]))))bad();
    }
    validateSlots(plan.items);
  }
  if(!value.dayArchetypes||typeof value.dayArchetypes!=='object'||Array.isArray(value.dayArchetypes)||
    Object.keys(value.dayArchetypes).some(kind=>!dayKinds.includes(kind)))bad();
  for(const items of Object.values(value.dayArchetypes)){
    if(!Array.isArray(items)||items.length>8||
      new Set(items.map(item=>item?.id)).size!==items.length)bad();
    for(const item of items){
      if(!item||typeof item!=='object'||Array.isArray(item)||
        Object.keys(item).sort().join(',')!=='id,items,name'||
        typeof item.id!=='string'||!/^custom-[a-zA-Z0-9-]{6,56}$/.test(item.id)||
        typeof item.name!=='string'||!item.name.trim()||item.name.length>75)bad();
      validateSlots(item.items);
    }
  }
  const overrides=[
    ['monthOverrides',24,validMonth],
    ['weekOverrides',80,key=>validDay(key)&&new Date(key+'T00:00:00Z').getUTCDay()===1],
    ['dayOverrides',366,validDay]
  ];
  for(const [kind,max,valid] of overrides){
    const entries=value[kind];
    if(!entries||typeof entries!=='object'||Array.isArray(entries)||Object.keys(entries).length>max)bad();
    for(const [key,config] of Object.entries(entries)){
      if(!valid(key)||!config||typeof config!=='object'||Array.isArray(config)||
        Object.keys(config).sort().join(',')!=='delivery,layers,limits,postingTime,videoShare')bad();
      const validated=validateCampaignSettings({...config,monthOverrides:{},weekOverrides:{},dayOverrides:{},
        timingSignals:value.timingSignals,milestones:value.milestones,
        dayPlans:{},dayArchetypes:{}},fail);
      config.limits=validated.limits;
    }
  }
  return value;
}
export async function socialCampaignSettingsEndpoint(request,env,identity,{json,requireRole,requireDb,bodyJson,HttpError}){
  requireRole(identity,['committee']);
  if(!['GET','POST'].includes(request.method))throw new HttpError(405,'Only loading or saving campaign settings is supported.','method_not_allowed');
  const params=new URL(request.url).searchParams;
  const keys=[...params.keys()];
  const readHistory=request.method==='GET'&&keys.length===1&&keys[0]==='history'&&params.get('history')==='1';
  const readVersion=request.method==='GET'&&keys.length===1&&keys[0]==='version'&&
    /^(?:[1-9]\d{0,8})$/.test(params.get('version')||'');
  if(keys.length&&!readHistory&&!readVersion)
    throw new HttpError(400,'Unexpected campaign settings options.','invalid_campaign_settings');
  const binding=requireDb(env),db=binding.withSession?binding.withSession('first-primary'):binding;
  const query=db.prepare(`SELECT s.version,s.settings_json AS settings,s.updated_at AS updatedAt,
    s.updated_by AS updatedBy,a.login AS updatedByName,a.role AS updatedByRole
    FROM committee_social_campaign_settings s LEFT JOIN club_accounts a ON a.id=s.updated_by
    WHERE s.id=1`);
  const toPublic=row=>{
    if(!row)return {version:0,settings:null,updatedAt:null,updatedBy:null,updatedByName:null,updatedOffice:null};
    const office=officeSignature({name:row.updatedByName,administrator:row.updatedByRole==='administrator'}).office;
    return {version:row.version,settings:JSON.parse(row.settings),updatedAt:row.updatedAt,updatedBy:row.updatedBy,
      updatedByName:row.updatedByName||row.updatedBy,updatedOffice:office};
  };
  // Automatic Git deployment updates Worker code, but does not run D1 migrations.
  // Only repair this particular absent table. Never hide unrelated DB failures.
  const readSettings=async()=>{
    try{return await query.first();}
    catch(error){
      const reason=String(error?.message||error);
      if(!/no such table:\s*(?:main\.)?committee_social_campaign_settings\b/i.test(reason))throw error;
      await db.prepare(`CREATE TABLE IF NOT EXISTS committee_social_campaign_settings (
        id INTEGER PRIMARY KEY CHECK(id=1),
        version INTEGER NOT NULL CHECK(version>0),
        settings_json TEXT NOT NULL CHECK(json_valid(settings_json)),
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL REFERENCES club_accounts(id)
      )`).run();
      return query.first();
    }
  };
  const current=await readSettings();
  if(readHistory||readVersion){
    await ensureSocialHistory(db,current);
    const item=readVersion?await readSocialHistory(db,{version:Number(params.get('version'))}):null;
    if(readVersion&&!item)throw new HttpError(404,'This version is not in the saved history.','history_not_found');
    return json(readVersion?{revision:item}:{
      version:current?.version||0,history:await readSocialHistory(db)
    });
  }
  if(request.method==='GET')return json(toPublic(current));
  const body=await bodyJson(request,1500000);
  const invalid=message=>{throw new HttpError(400,message,'invalid_campaign_settings');};
  if(!body||Object.keys(body).sort().join(',')!=='settings,version'||!Number.isInteger(body.version)||body.version<0||body.version>2147483645)invalid('Reload the saved campaign settings.');
  const settings=validateCampaignSettings(body.settings,invalid);
  const now=new Date().toISOString();
  // Derive day signatures exclusively from the authenticated officer and the
  // previous database record. Never trust identities supplied by the browser.
  const previous=current?JSON.parse(current.settings):null;
  stampDayPlanSignatures(settings,previous,identity,now);
  // History is append-only and signed from the authenticated account, including
  // the Webmaster administrator. It is committed atomically with the settings.
  await ensureSocialHistory(db,current);
  const actor=officeSignature(identity,now);
  const changes=describeCampaignChanges(previous,settings);
  const write=body.version===0?
    db.prepare('INSERT INTO committee_social_campaign_settings(id,version,settings_json,updated_at,updated_by) VALUES(1,1,?,?,?) ON CONFLICT(id) DO NOTHING')
      .bind(JSON.stringify(settings),now,identity.id):
    db.prepare('UPDATE committee_social_campaign_settings SET version=version+1,settings_json=?,updated_at=?,updated_by=? WHERE id=1 AND version=?')
      .bind(JSON.stringify(settings),now,identity.id,body.version);
  const [result,revisionResult,,last]=await db.batch([write,
    revisionStatement(db,{
      version:body.version+1,actorId:identity.id,actorName:actor.by,
      actorOffice:actor.office,actorRole:identity.accountRole||identity.role,
      savedAt:now,changes,settings
    }),
    db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()=1').bind(
      crypto.randomUUID(),identity.id,identity.accountRole||identity.role,
      'social_campaign_settings_saved','social-campaign-settings',now),query]);
  if(result.meta.changes!==1)throw new HttpError(409,'Another officer updated the campaign patterns. Reload their settings before saving.','campaign_conflict');
  if(revisionResult.meta.changes!==1)throw new HttpError(500,'The campaign revision was not recorded. Please retry.','history_write_failed');
  return json({...toPublic(last.results[0]),lastChange:changes});
}
