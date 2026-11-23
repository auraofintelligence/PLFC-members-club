const ids=['fish','bait','weather','safety','events','holidays','camping','competition','newsletter','membership','raffles','fundraisers','wishes','community','surprise'];
const memberships=['all','adult','cadet','junior','social','casual','lifetime','prospect'];
const genders=['all','women','men','self-described'];
const places=['all','local','tourist','regional'];
function validAudience(values,allowed){
  return Array.isArray(values) && values.length>=1 && values.length<=allowed.length &&
    values.every(v=>allowed.includes(v)) && new Set(values).size===values.length &&
    (!values.includes('all')||values.length===1);
}
export function validateCampaignSettings(value,fail){
  const bad=()=>fail('Check the campaign pattern settings and audience choices.');
  if(!value || typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!=='layers,limits,videoShare')bad();
  if(!Number.isInteger(value.videoShare)||value.videoShare<0||value.videoShare>100)bad();
  if(!value.limits||Object.keys(value.limits).sort().join(',')!=='friday,holiday,weekday,weekend'||
    Object.values(value.limits).some(n=>!Number.isInteger(n)||n<0||n>12))bad();
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
  if(request.method==='GET')return json(toPublic(await query.first()));
  const body=await bodyJson(request,16000);
  const invalid=message=>{throw new HttpError(400,message,'invalid_campaign_settings');};
  if(!body||Object.keys(body).sort().join(',')!=='settings,version'||!Number.isInteger(body.version)||body.version<0||body.version>2147483645)invalid('Reload the saved campaign settings.');
  const settings=validateCampaignSettings(body.settings,invalid);
  const now=new Date().toISOString();
  const write=db.prepare(`INSERT INTO committee_social_campaign_settings (id,version,settings_json,updated_at,updated_by)
    VALUES(1,1,?,?,?) ON CONFLICT(id) DO UPDATE SET version=version+1,settings_json=excluded.settings_json,
      updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE version=?`).bind(JSON.stringify(settings),now,identity.id,body.version);
  const [result,,last]=await db.batch([write,
    db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),identity.id,identity.accountRole||identity.role,'social_campaign_settings_saved','social-campaign-settings',now),query]);
  if(result.meta.changes!==1)throw new HttpError(409,'Another officer updated the campaign patterns. Reload their settings before saving.','campaign_conflict');
  return json(toPublic(last.results[0]));
}
