import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';

const endpoint='/api/member/journal';
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/AOXr/9k=','base64');
const exif=Buffer.concat([Buffer.from([255,225,0,13]),Buffer.from('GPS-EXAMPLE')]);
const photo='data:image/jpeg;base64,'+Buffer.concat([jpeg.subarray(0,2),exif,jpeg.subarray(2)]).toString('base64');
const pin={latitude:-27.438,longitude:153.537};

async function fixture(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0007_members_and_conversation.sql','0008_member_lifecycle.sql','0010_applications.sql','0025_member_network.sql','0028_member_safeguards.sql','0031_journal_media.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'fixture'},cookies={};
  for(const [name,age,guardian] of [['adult','16+',0],['mate','16+',0],['kid','under16',1],['unknown','unconfirmed',0]]){
    const token=randomBytes(32).toString('hex');cookies[name]='__Host-plfc_session='+token;
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,'member','test','test',0,'2099-12-31')").bind(name,name),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),name),
      db.prepare("INSERT INTO member_age_checks VALUES(?,?,?,1,'2026-11-21','fixture')").bind(name,age,guardian)]);
    if(age==='16+')await db.prepare("INSERT INTO member_terms_acceptance SELECT ?,terms_version,1,1,'2026-11-21' FROM member_safeguard_policy").bind(name).run();
  }
  const raw=(who,path,data)=>handleRequest(new Request('https://club.example'+path,{method:data?'POST':'GET',headers:{Origin:'https://club.example','Content-Type':'application/json',Cookie:cookies[who]||''},body:data?JSON.stringify(data):undefined}),env);
  const call=async(who,path,data,status=200)=>{const res=await raw(who,path,data),body=await res.json();assert.equal(res.status,status,JSON.stringify(body));assert.match(res.headers.get('Cache-Control'),/no-store/);return body;};
  return {db,raw,call};
}

test('private catch, photo and precise pin save together without a profile, retry once, and stay with their owner',async t=>{
  const {db,raw,call}=await fixture(t),id=randomUUID();
  const body={id,species:'Yellowfin bream',date:'2026-11-20',lengthCm:32.5,photo,pin:{...pin,style:'fish'}};
  const item=(await call('adult',endpoint,body,201)).catch;
  assert.equal(item.version,1);assert.deepEqual(item.pin,body.pin);
  await call('adult',endpoint,{action:'media',id,version:1,pin:{...pin,style:'anything'}},400);
  assert.deepEqual((await call('adult',endpoint,body)).catch,item);
  await call('adult',endpoint,{...body,species:'Different'},409);
  await call('mate',endpoint,{action:'media',id,version:1,photo:null},404);
  assert.equal((await call('adult',endpoint+'?pins=1')).catches[0].id,id);
  assert.deepEqual((await call('mate',endpoint+'?pins=1')).catches,[]);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM network_profiles').first()).n,0);
  const privateCopy=await db.prepare('SELECT * FROM journal_media WHERE catch_id=?').bind(id).first();
  assert.ok(privateCopy.pin_cipher&&!privateCopy.pin_cipher.includes('153.537'));assert.ok(privateCopy.photo_cipher&&!privateCopy.photo_cipher.includes('GPS-EXAMPLE'));
  const res=await raw('adult',item.photoUrl);assert.equal(res.status,200);assert.match(res.headers.get('Cache-Control'),/no-store/);const clean=Buffer.from(await res.arrayBuffer());assert.equal(clean[0],255);assert.ok(!clean.includes('GPS-EXAMPLE'));
  await call('mate',item.photoUrl,null,404);await call('guest',item.photoUrl,null,401);
  const update={action:'media',id,version:1,pin:null};const edited=(await call('adult',endpoint,update)).catch;
  assert.equal(edited.pin,null);assert.equal(edited.photoUrl,item.photoUrl);assert.equal(edited.version,2);assert.deepEqual((await call('adult',endpoint,update)).catch,edited);
  await call('adult',endpoint,{...update,photo:null},409);
  await call('adult',endpoint,{action:'media',id,version:2,photo:null});await call('adult',item.photoUrl,null,404);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='catch_created'").first()).n,1);
});

test('historical catches accept a new photo; guardian journal and withdrawn agreement never expose precise pins',async t=>{
  const {db,call}=await fixture(t),id=randomUUID();
  await db.prepare("INSERT INTO catches VALUES(?,'kid','Whiting',30,'2026-11-20','Beach','Old record','2026-11-20')").bind(id).run();
  assert.equal((await call('kid',endpoint)).catches[0].version,0);
  const kidPhoto=(await call('kid',endpoint,{action:'media',id,version:0,photo})).catch;assert.ok(kidPhoto.photoUrl);
  await call('kid',endpoint,{action:'media',id,version:1,pin},403);
  await call('kid',endpoint,{id:randomUUID(),species:'Fish',date:'2026-11-20',pin,photo},403);
  await call('unknown',endpoint,null,403);
  const adult={id:randomUUID(),species:'Fish',date:'2026-11-20',pin,photo};await call('adult',endpoint,adult,201);
  await db.prepare("UPDATE member_terms_acceptance SET accepted=0 WHERE account_id='adult'").run();
  assert.equal((await call('adult',endpoint)).catches[0].pin,null);assert.deepEqual((await call('adult',endpoint+'?pins=1')).catches,[]);
  await call('adult',endpoint,{action:'media',id:adult.id,version:1,pin},403);
  await call('adult',endpoint,{id:randomUUID(),species:'Fish',date:'2026-11-20',photo:'invalid'},400);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM catches').first()).n,2);
  await db.prepare("UPDATE club_accounts SET paid_through='2023-01-01' WHERE id='kid'").run();
  await call('kid',kidPhoto.photoUrl,null,403);
});

test('earlier pages of private catches include legacy records exactly once',async t=>{
  const {db,call}=await fixture(t),ids=Array.from({length:43},randomUUID);
  await db.batch(ids.map(id=>db.prepare("INSERT INTO catches VALUES(?,'adult','Bream',30,'2026-11-20','Amity','','2026-11-20')").bind(id)));
  const first=await call('adult',endpoint);assert.equal(first.catches.length,40);
  const second=await call('adult',endpoint+'?cursor='+encodeURIComponent(first.nextCursor));assert.equal(second.catches.length,3);
  assert.equal(second.nextCursor,null);assert.equal(new Set([...first.catches,...second.catches].map(c=>c.id)).size,43);
  await call('adult',endpoint+'?cursor=broken',null,400);
});
