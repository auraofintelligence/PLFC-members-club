// Append-only record of every authenticated committee social settings save.
// Includes the complete saved settings snapshot plus compact before/after differences.
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const preview=value=>{
  if(value===undefined)return '(not set)';
  if(value===null)return 'null';
  if(typeof value==='string')return value.length>180?value.slice(0,177)+'…':value;
  const text=JSON.stringify(value);
  return text.length>180?text.slice(0,177)+'…':text;
};
export function describeCampaignChanges(before,after){
  const changes=[];
  let count=0;
  function visit(a,b,path,depth){
    if(JSON.stringify(a)===JSON.stringify(b))return;
    if(depth<9&&object(a)&&object(b)){
      const keys=new Set([...Object.keys(a),...Object.keys(b)]);
      for(const key of keys)visit(a[key],b[key],path?path+'.'+key:key,depth+1);
      return;
    }
    if(depth<9&&Array.isArray(a)&&Array.isArray(b)&&a.length<=30&&b.length<=30){
      for(let index=0;index<Math.max(a.length,b.length);index++)
        visit(a[index],b[index],path+'['+index+']',depth+1);
      return;
    }
    count++;
    if(changes.length<120)changes.push({field:path||'All settings',before:preview(a),after:preview(b)});
  }
  visit(before||{},after||{},'',0);
  return {count,changes};
}
export const socialHistoryDDL=String.raw`CREATE TABLE IF NOT EXISTS committee_social_campaign_history (
  version INTEGER PRIMARY KEY CHECK(version>0),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_office TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  changes_json TEXT NOT NULL CHECK(json_valid(changes_json)),
  settings_json TEXT NOT NULL CHECK(json_valid(settings_json))
)`;
export async function ensureSocialHistory(db,current=null){
  await db.prepare(socialHistoryDDL).run();
  // Retain the existing shared snapshot as a baseline if the history was
  // introduced after the initial settings were already saved.
  if(current?.version>0){
    const prior={count:0,changes:[],note:'Existing saved settings at the start of change history'};
    await db.prepare(`INSERT OR IGNORE INTO committee_social_campaign_history
      (version,actor_id,actor_name,actor_office,actor_role,saved_at,changes_json,settings_json)
      VALUES(?,?,?,?,?,?,?,?)`).bind(
        current.version,current.updatedBy,
        current.updatedByName||'Existing club account',
        current.updatedOffice||'Committee member',
        current.updatedByRole||'committee',
        current.updatedAt,JSON.stringify(prior),current.settings
    ).run();
  }
}
export function revisionStatement(db,{version,actorId,actorName,actorOffice,actorRole,savedAt,changes,settings}){
  return db.prepare(`INSERT INTO committee_social_campaign_history
    (version,actor_id,actor_name,actor_office,actor_role,saved_at,changes_json,settings_json)
    SELECT ?,?,?,?,?,?,?,? WHERE changes()=1`).bind(version,actorId,actorName,actorOffice,actorRole,savedAt,
    JSON.stringify(changes),JSON.stringify(settings));
}
export async function readSocialHistory(db,{version=null}={}){
  if(version!==null){
    const row=await db.prepare(`SELECT version,actor_id AS actorId,
      actor_name AS actorName,actor_office AS actorOffice,actor_role AS actorRole,
      saved_at AS savedAt,changes_json AS changes,settings_json AS settings
      FROM committee_social_campaign_history WHERE version=?`).bind(version).first();
    return row?{...row,changes:JSON.parse(row.changes),settings:JSON.parse(row.settings)}:null;
  }
  const result=await db.prepare(`SELECT version,actor_id AS actorId,
    actor_name AS actorName,actor_office AS actorOffice,actor_role AS actorRole,
    saved_at AS savedAt,changes_json AS changes
    FROM committee_social_campaign_history ORDER BY version DESC LIMIT 40`).all();
  return (result.results||[]).map(row=>({...row,changes:JSON.parse(row.changes)}));
}
