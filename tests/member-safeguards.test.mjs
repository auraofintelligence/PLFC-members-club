import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {memberSafeguardFlags} from '../worker/member-safeguards.mjs';

const home='https://club.example',member='/api/member/safeguards',committee='/api/committee/safeguards';
async function fixture(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0007_members_and_conversation.sql',
    '0008_member_lifecycle.sql','0010_applications.sql','0025_member_network.sql','0028_member_safeguards.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'fixture'},tokens={};
  for(const [id,role] of [['member-one','member'],['member-two','member'],['secretary','committee']]){
    const token=randomBytes(32).toString('hex');tokens[id]=token;
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'test','test',0,'2099-01-01')").bind(id,id,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),id)]);
  }
  async function call(id,path,data,status=200,method=data?'POST':'GET'){
    const headers={Origin:home,'Content-Type':'application/json'};
    if(tokens[id])headers.Cookie='__Host-plfc_session='+tokens[id];
    const response=await handleRequest(new Request(home+path,{method,headers,body:data?JSON.stringify(data):undefined}),env);
    const record=method==='HEAD'?null:await response.json();
    assert.equal(response.status,status,JSON.stringify(record));assert.match(response.headers.get('Cache-Control'),/no-store/);
    return record;
  }
  return {db,call};
}

test('unconfirmed, guardian permission, 16+ opt-in and withdrawal work independently of the old member category',async t=>{
  const {db,call}=await fixture(t),id='member-one';
  const verify=(version,ageBand,guardianPermission,other={},expected=200)=>call('secretary',committee,
    {action:'verify',accountId:id,version,ageBand,guardianPermission,...other},expected);
  const initial=await call(id,member),termsVersion=initial.termsVersion;
  const terms=(action,version,expected=200,extra={})=>call(id,member,{action,version,termsVersion,...extra},expected);
  assert.equal(initial.ageBand,'unconfirmed');assert.equal(initial.socialAccess,false);assert.equal(initial.canUseJournal,false);
  await call('guest',member,null,401);await call(id,committee+'?q=member',null,403);
  assert.deepEqual(await call('secretary',committee),{members:[]});
  const [result]=(await call('secretary',committee+'?q=member-one')).members;
  assert.deepEqual(Object.keys(result).sort(),['accountId','login','ageBand','guardianPermission','version','verifiedAt'].sort());
  await call(id,member,{action:'verify',version:0,ageBand:'16+'},400);
  await call('secretary',member,null,403);await terms('accept',0,403);
  await call(id,'/api/catches',null,403);await call(id,'/api/member/network',null,403);
  await verify(0,'under16',true,{},400);await verify(0,'under16',true,{ageCheckedOffline:true},400);
  await verify(0,'under16',true,{ageCheckedOffline:true,guardianCheckedOffline:true});
  const younger=await call(id,member);
  assert.equal(younger.canUseJournal,true);assert.equal(younger.guardianPermission,true);assert.equal(younger.canEnterHonours,false);
  await call(id,'/api/catches',{species:'Bream',date:'2026-11-18'},201);
  await call(id,'/api/member/network');await terms('accept',0,403);
  const post={id:randomUUID(),message:'Fixture club news',author:'Club office'};
  await call('secretary','/api/community',post,201);
  await call(id,'/api/community',null,403);await call(id,'/api/community',{...post,id:randomUUID()},403);
  await call(id,'/api/community/'+post.id+'/photo',null,403,'HEAD');
  await verify(1,'under16',false);await call(id,'/api/catches',null,403);await call(id,'/api/member/network',null,403);
  await verify(1,'16+',false,{ageCheckedOffline:true},409);await verify(2,'16+',false,{ageCheckedOffline:true});
  await db.prepare("UPDATE member_profiles SET membership_type='junior' WHERE account_id=?").bind(id).run();
  assert.equal((await call(id,member)).socialAccess,false);
  await terms('accept',0,409,{termsVersion:'old'});
  const chosen=await terms('accept',0);assert.equal(chosen.socialAccess,true);assert.equal(chosen.canEnterHonours,true);
  await call(id,'/api/community');await call(id,'/api/community',{...post,id:randomUUID()},201);
  assert.equal((await call(id,'/api/member/network')).eligibleToShare,true);
  const withdrawn=await terms('withdraw',1);assert.equal(withdrawn.accepted,false);assert.equal(withdrawn.canUseJournal,true);
  await call(id,'/api/community',null,403);assert.equal((await call(id,'/api/catches')).catches.length,1);
  const optedBack=await terms('accept',2);assert.equal(optedBack.version,3);
  await verify(3,'unconfirmed',false);
  const corrected=await call(id,member);assert.equal(corrected.accepted,false);assert.equal(corrected.canUseJournal,false);
  assert.equal(corrected.canEnterHonours,false);
  await verify(4,'16+',false,{ageCheckedOffline:true});
  assert.equal((await memberSafeguardFlags(db,id)).socialAccess,false);
  const audit=await db.prepare("SELECT action FROM audit_log WHERE action LIKE 'member_%'").all();
  assert.ok(audit.results.some(r=>r.action==='member_terms_withdrawn'));assert.ok(audit.results.some(r=>r.action==='member_age_permission_updated'));
});
