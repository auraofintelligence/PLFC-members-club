const ids=['fish','bait','weather','safety','events','holidays','nswHolidays','camping','competition','newsletter','membership','raffles','fundraisers','wishes','community','surprise'];
const memberships=['all','adult','cadet','junior','social','casual','lifetime','prospect'];
const genders=['all','women','men','self-described'];
const places=['all','local','tourist','regional'];
const destinations=['facebook','instagram','youtube','tiktok','noticeboard'];
const validDestinations=values=>Array.isArray(values)&&values.length<=destinations.length&&new Set(values).size===values.length&&values.every(id=>destinations.includes(id));
function validAudience(values,allowed){
  return Array.isArray(values) && values.length>=1 && values.length<=allowed.length &&
    values.every(v=>allowed.includes(v)) && new Set(values).size===values.length &&
    (!values.includes('all')||values.length===1);
}
export function validateCampaignSettings(value,fail){
  const bad=()=>fail('Check the campaign pattern settings and audience choices.');
  if(!value || typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!=='dayOverrides,delivery,layers,limits,milestones,monthOverrides,postingTime,timingSignals,videoShare,weekOverrides')bad();
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
      validateCampaignSettings({...config,monthOverrides:{},weekOverrides:{},dayOverrides:{},
        timingSignals:value.timingSignals,milestones:value.milestones},fail);
    }
  }
  return value;
}
export async function socialCampaignSettingsEndpoint(request,env,identity,{json,requireRole,requireDb,bodyJson,HttpError}){
  requireRole(identity,['committee']);
  if(!['GET','POST'].includes(request.method))throw new HttpError(405,'Only loading or saving campaign settings is supported.','method_not_allowed');
  if(new URL(request.url).search)throw new HttpError(400,'Unexpected campaign settings options.','invalid_campaign_settings');
  const binding=requireDb(env),db=binding.withSession?binding.withSession('first-primary'):binding;
  const query=db.prepare('SELECT version,settings_json AS settings,updated_at AS updatedAt,updated_by AS updatedBy FROM committee_social_campaign_settings WHERE id=1');
  const toPublic=row=>row?{version:row.version,settings:JSON.parse(row.settings),updatedAt:row.updatedAt,updatedBy:row.updatedBy}:
    {version:0,settings:null,updatedAt:null,updatedBy:null};
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
  if(request.method==='GET')return json(toPublic(current));
  const body=await bodyJson(request,1500000);
  const invalid=message=>{throw new HttpError(400,message,'invalid_campaign_settings');};
  if(!body||Object.keys(body).sort().join(',')!=='settings,version'||!Number.isInteger(body.version)||body.version<0||body.version>2147483645)invalid('Reload the saved campaign settings.');
  const settings=validateCampaignSettings(body.settings,invalid);
  const now=new Date().toISOString();
  const write=body.version===0?
    db.prepare('INSERT INTO committee_social_campaign_settings(id,version,settings_json,updated_at,updated_by) VALUES(1,1,?,?,?) ON CONFLICT(id) DO NOTHING')
      .bind(JSON.stringify(settings),now,identity.id):
    db.prepare('UPDATE committee_social_campaign_settings SET version=version+1,settings_json=?,updated_at=?,updated_by=? WHERE id=1 AND version=?')
      .bind(JSON.stringify(settings),now,identity.id,body.version);
  const [result,,last]=await db.batch([write,
    db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),identity.id,identity.accountRole||identity.role,'social_campaign_settings_saved','social-campaign-settings',now),query]);
  if(result.meta.changes!==1)throw new HttpError(409,'Another officer updated the campaign patterns. Reload their settings before saving.','campaign_conflict');
  return json(toPublic(last.results[0]));
}
