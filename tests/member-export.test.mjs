import assert from 'node:assert/strict';
import test from 'node:test';
import {readdirSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {privateAreaKeys,sealPrivateText} from '../worker/member-network.mjs';
import {mealKeyArea} from '../worker/shared-meals.mjs';
import {MemberArchive} from '../public/member-export-archive.js';

test('members can privately download their own journal, map, conversation and competition photos after withdrawal or expiry',async t=>{
  const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(s=>s.endsWith('.sql')).sort();
  const db=database(t,migrations),env={DB:db,PRIVATE_AUTH_KEY:'test-area'},cookies={};
  const statements=[];
  for(const [name,role] of [['me','member'],['other','member'],['treasurer','treasurer']]){
    const token=randomBytes(32).toString('hex');cookies[name]='__Host-plfc_session='+token;
    statements.push(db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'salt','verifier',1,'2099-12-31')").bind(name,name,role),
      db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),name));
  }
  await db.batch(statements);
  const go=(name,path,headers={})=>handleRequest(new Request('https://club.test/api/member/export'+path,{headers:{Cookie:cookies[name]||'',...headers}}),env);
  const get=async(name,path)=>{const r=await go(name,path);assert.equal(r.status,200);assert.match(r.headers.get('Cache-Control'),/private, no-store/);return r.json();};
  assert.equal((await go('anon','')).status,401);assert.equal((await go('treasurer','')).status,403);
  assert.equal((await go('other','/journal?after=0&through=10',{'X-PLFC-Export-Account':'me'})).status,409);
  assert.equal((await go('me','/journal?after=-1&through=10')).status,400);
  const networkKey=(await privateAreaKeys(env.PRIVATE_AUTH_KEY)).content;
  const journalKey=(await privateAreaKeys(env.PRIVATE_AUTH_KEY,'PLFC private catch journal v1')).content;
  const honoursKey=(await privateAreaKeys(env.PRIVATE_AUTH_KEY,'PLFC honours evidence v1')).content;
  const mealKey=(await privateAreaKeys(env.PRIVATE_AUTH_KEY,mealKeyArea)).content;
  const photo='cGhvdG9ncmFwaCBieXRlcw==',extra='private photograph of another member';
  const itemSQL="INSERT INTO network_items(id,owner_id,content,photo,created_at,mutation) VALUES(?,?,?,?,?,?)";
  await db.batch([
    db.prepare("INSERT INTO member_age_checks VALUES('me','16+',0,1,'today','officer')"),
    db.prepare("INSERT INTO member_terms_acceptance SELECT 'me',terms_version,1,1,'then' FROM member_safeguard_policy"),
    db.prepare("INSERT INTO network_profiles VALUES('p-me','me','Me','angler-4',1,?,1,'profile1')").bind(await sealPrivateText(networkKey,'profile:p-me',photo)),
    db.prepare("INSERT INTO network_profiles VALUES('p-other','other','Secret profile','angler-5',0,NULL,1,'profile2')"),
    db.prepare(itemSQL).bind('pin1','p-me',await sealPrivateText(networkKey,'item:pin1',JSON.stringify({title:'My spot',pin:{latitude:-27,longitude:153}})),await sealPrivateText(networkKey,'photo:pin1',photo),'today','item1'),
    db.prepare(itemSQL).bind('pin2','p-other',await sealPrivateText(networkKey,'item:pin2',JSON.stringify({title:extra})),null,'today','item2'),
    db.prepare("INSERT INTO network_recipients VALUES('pin2','p-me',NULL,NULL)"),
    db.prepare("INSERT INTO catches VALUES('catch1','me','Whiting',28,'2026-01-01','Beach','My entry','today')"),
    db.prepare("INSERT INTO catches VALUES('catch2','other','Whiting',20,'2026-01-01','Secret spot','Other catch','today')"),
    db.prepare("INSERT INTO journal_media VALUES('catch1',?,?,1,'save')").bind(await sealPrivateText(journalKey,'journal-photo:catch1',photo),await sealPrivateText(journalKey,'journal-pin:catch1',JSON.stringify({latitude:-27.1,longitude:153.2}))),
    db.prepare("INSERT INTO honours_entries(id,owner_id,member_account,consent_kind,display_name,species,millimetres,caught_on,consent_at,photo_cipher,status) VALUES('entry1','me','me','self','Me','sand-whiting',280,'2026-01-01','today',?,'pending')").bind(await sealPrivateText(honoursKey,'honours:entry1',photo)),
    db.prepare("INSERT INTO community_posts VALUES('other-post',NULL,'other','Someone',?,?, 'today',0)").bind(extra,extra),
    db.prepare(`INSERT INTO shared_meals(id,host_id,venue_type,visibility,starts_at,ends_at,contents,location,job_count,receipt,guest_limit)
      VALUES('meal1','me','home','invited','2098-01-01','2098-01-02',?,?,0,'once',6)`)
      .bind(await sealPrivateText(mealKey,'meal-details:meal1',JSON.stringify({title:'Summer dinner',area:'Cleveland',jobs:[]})),
        await sealPrivateText(mealKey,'meal-location:meal1','Example Street 7')),
    ...Array.from({length:7},(_,i)=>db.prepare("INSERT INTO community_posts VALUES(?,'other-post','me','Me',?,?,'today',0)").bind('my'+i,i?'A reply':'=<script>alert(1)</script>',i===0?photo:null)),
    db.prepare("INSERT INTO partner_handoffs(id,kind,owner_id,owner_name,scope,status,consent_version,consent_at,mutation) VALUES('help','volunteer','me','Me','Set up tables','requested','v1','today','once')"),
  ]);
  const manifest=await get('me','');
  assert.equal(manifest.account,'me');assert.equal(manifest.groups.find(g=>g.id==='posts').total,7);
  await db.batch([
    db.prepare("UPDATE member_terms_acceptance SET accepted=0,version=2 WHERE account_id='me'"),
    db.prepare("UPDATE club_accounts SET paid_through='2020-01-01' WHERE id='me'"),
    db.prepare("INSERT INTO community_posts VALUES('added-later',NULL,'me','Me','New after start',NULL,'today',0)"),
  ]);
  assert.equal((await get('me','')).account,'me');
  const archive=new MemberArchive(manifest.groups,manifest.createdAt);
  const saved={};
  for(const group of manifest.groups){
    saved[group.id]=[];let after=0;
    do{
      const page=await get('me','/'+group.id+'?through='+group.through+'&after='+after);
      for(const r of page.rows){archive.add(group.id,r);saved[group.id].push(r);}
      after=page.next;
    }while(after!==null);
  }
  assert.equal(saved.posts.length,7);assert.equal(saved.journal[0].pin.latitude,-27.1);assert.equal(saved.choices[0].accepted,0);
  assert.equal(saved.saved.length,1);assert.equal(saved.volunteering[0].scope,'Set up tables');
  assert.equal(saved.meals[0].guestLimit,6);assert.equal(saved.meals[0].location,'Example Street 7');
  assert.equal((await get('other','/meals?after=0&through=10')).rows.length,0);
  assert.doesNotMatch(JSON.stringify(saved),/Secret spot|private photograph of another member|Secret profile|New after start/);
  assert.equal(archive.photoCount,5);
  const [zip]=archive.finish();
  const validation=spawnSync('python',['-c',String.raw`
import io,zipfile,sys
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert z.testzip() is None
photos=[n for n in z.namelist() if n.startswith('Photos/')]
assert len(photos)==5 and all(z.read(n)==b'photograph bytes' for n in photos)
h=z.read('Start here.html')
assert b'&lt;script&gt;' in h and b'<script>' not in h
assert all(n.encode('ascii') in h for n in photos)
assert bytes([34,39,61,60]) in z.read('Spreadsheets/posts.csv')
`],{input:Buffer.from(await zip.arrayBuffer()),encoding:'utf8',windowsHide:true});
  assert.equal(validation.status,0,validation.stderr);
  await db.prepare("UPDATE club_accounts SET disabled=1 WHERE id='me'").run();
  assert.equal((await go('me','')).status,401);
});
