import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {memberRecipesEndpoint} from '../worker/member-recipes.mjs';
import {memberExportEndpoint} from '../worker/member-export.mjs';

test('recipe book keeps four ordered photos, protects identity, and supports export after withdrawal',async t=>{
  const db=database(t,readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort());
  const env={DB:db,PRIVATE_AUTH_KEY:'private local test'};
  class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
  const helpers={HttpError,requireDb:()=>db,requireRole(who,roles){if(!roles.includes(who?.role))throw new HttpError(401,'Sign in');},
    response:(bytes,status,headers)=>new Response(bytes,{status,headers}),json:(body,status,headers)=>Response.json(body,{status,headers}),bodyJson:r=>r.json()};
  const member=id=>({id,role:'member',accountRole:'member'});
  const statements=[];
  for(const id of ['author','reader','junior']){
    statements.push(db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,'member','a','b',1,'2099-12-31')").bind(id,id),
      db.prepare("INSERT INTO member_age_checks VALUES(?,?,0,1,'today','officer')").bind(id,id==='junior'?'under16':'16+'),
      db.prepare("INSERT INTO member_terms_acceptance SELECT ?,terms_version,1,1,'today' FROM member_safeguard_policy").bind(id));
  }
  await db.batch(statements);
  const base='https://club.test/api/member/recipes';
  const go=(who,data,path='')=>memberRecipesEndpoint(new Request(base+path,data?{method:'POST',body:JSON.stringify(data)}:{}),env,who?member(who):null,helpers);
  const exported=async path=>(await memberExportEndpoint(new Request('https://club.test/api/member/export'+path),env,member('author'),helpers)).json();
  const image='data:image/jpeg;base64,'+readFileSync(new URL('../public/assets/fish/bartail-flathead.jpg',import.meta.url)).toString('base64');
  const recipe={action:'save',id:randomUUID(),version:0,title:'Lemon squid',ingredients:'Squid and lemon',method:'Pan-fry until opaque',byline:'Rae',photos:Array(4).fill(image)};
  const status=n=>e=>e.status===n;
  await assert.rejects(go(null),status(401));await assert.rejects(go('junior'),status(403));
  await assert.rejects(go('author',{...recipe,photos:[...recipe.photos,image]}),status(400));
  assert.equal((await go('author',recipe)).status,201);assert.equal((await go('author',recipe)).status,200);
  const {recipes:[entry]}=await (await go('reader')).json();assert.equal(entry.photos.length,4);assert.equal(entry.byline,'Rae');assert.equal(entry.own,false);
  const asset=entry.photos[3].url.slice('/api/member/recipes'.length);assert.equal((await go('reader',null,asset)).headers.get('content-type'),'image/jpeg');
  await assert.rejects(go('reader',{...recipe,version:1,photos:[]}),status(409));
  const update={...recipe,version:1,photos:[3,0],byline:'',title:'Lemon and parsley squid'};
  await go('author',update);await assert.rejects(go('author',{...update,title:'stale'}),status(409));
  const {recipes:[edited]}=await (await go('author')).json();assert.equal(edited.photos.length,2);assert.equal(edited.photos[0].url,entry.photos[3].url);assert.equal(edited.byline,'Club member');
  assert.doesNotMatch((await db.prepare('SELECT content FROM member_recipes').first()).content,/Lemon|Squid/);
  await db.prepare("UPDATE member_terms_acceptance SET accepted=0 WHERE account_id='author'").run();
  assert.equal((await (await go('reader')).json()).recipes.length,0);await assert.rejects(go('reader',null,asset),status(404));
  const manifest=await exported('');const parts=await Promise.all(['recipes','recipePhotos'].map(name=>exported('/'+name+'?after=0&through='+manifest.groups.find(g=>g.id===name).through)));
  assert.equal(parts[0].rows[0].title,update.title);assert.equal(parts[1].rows.length,2);assert.ok(parts[1].rows.every(p=>p.photo));
  await db.prepare("UPDATE member_terms_acceptance SET accepted=1 WHERE account_id='author'").run();
  assert.equal((await (await go('reader')).json()).recipes.length,0);
  const {recipes:[hidden]}=await (await go('author')).json();assert.equal(hidden.published,false);
  await go('author',{action:'remove',id:recipe.id,version:hidden.version});assert.equal((await db.prepare('SELECT COUNT(*) n FROM member_recipe_photos').first()).n,0);
});
