import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {shopPhotosEndpoint,attachShopPhotos} from '../worker/shop-photos.mjs';

test('shop photos follow listing and option visibility, edits, permission and private previews',async t=>{
  const db=database(t,readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort());
  const finance={id:'finance',accountRole:'treasurer',canManageStock:true,role:'committee'};
  const webmaster={...finance,id:'web',accountRole:'administrator'};
  const member={id:'angler',accountRole:'member',role:'member'};
  class HttpError extends Error{constructor(status,msg){super(msg);this.status=status;}}
  const helpers={requireDb:()=>db,HttpError,bodyJson:req=>req.json(),json:(body,status,headers)=>Response.json(body,{status,headers}),
    response:(data,status,headers)=>new Response(data,{status,headers})};
  const path='/api/stock/shop-photos';
  const read=(path,identity)=>shopPhotosEndpoint(new Request('https://club.test'+path),{DB:db},identity,helpers);
  const write=(payload,identity=finance)=>shopPhotosEndpoint(new Request('https://club.test'+path,{method:'POST',body:JSON.stringify(payload)}),{DB:db},identity,helpers);
  const input=readFileSync(new URL('../public/assets/fish/bartail-flathead.jpg',import.meta.url));
  const extra=Buffer.from('discard-marked-GPS-data');
  const tagged=Buffer.concat([input.subarray(0,2),Buffer.from([255,225,0,extra.length+2]),extra,input.subarray(2)]);
  const jpeg='data:image/jpeg;base64,'+tagged.toString('base64');
  const published=[{id:'shirt',name:'Club shirt',variants:[{id:'shirt-member',label:'Member shirt'}]}];
  const metadata=async()=> (await attachShopPhotos(db,published))[0];
  await db.batch([
    db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at) VALUES('finance','finance','treasurer','s','v',1),('web','web','administrator','s','v',1)"),
    db.prepare("INSERT INTO shop_variants(stock_item_id,product_id,combination) VALUES('shirt-member','shirt','member'),('cooler','cooler','one')"),
    db.prepare("UPDATE shop_listings SET published=0 WHERE product_id='shirt'")
  ]);
  const data={action:'save',productId:'shirt',variantId:null,version:null,mutationId:randomUUID(),photo:jpeg,alt:'Blue and white club shirt'};
  await assert.rejects(read(path+'?productId=shirt',null),{status:401});
  await assert.rejects(write(data,member),{status:403});
  await assert.rejects(write({...data,variantId:'cooler'}),{status:404});
  await assert.rejects(write({...data,photo:'https://example.com/pic.jpg'}),{status:400});
  await assert.rejects(write({...data,alt:'x\nmalformed'}),{status:400});
  await assert.rejects(write({...data,photoUrl:'https://example.test/'}),{status:400});
  const initial=await (await read(path+'?productId=shirt',finance)).json();
  assert.deepEqual(initial.slots.map(s=>s.variantId),[null,'shirt-member']);
  const one=await (await write(data)).json();const main=one.slots[0];
  const same=await (await write(data)).json();assert.equal(same.slots[0].version,main.version);
  await assert.rejects(write({...data,alt:'rewritten'}),{status:409});
  await assert.rejects(write({...data,mutationId:randomUUID()}),{status:409});
  const variantData={...data,variantId:'shirt-member',alt:'',mutationId:randomUUID()};
  const second=await (await write(variantData,webmaster)).json();
  const memberSlot=second.slots.find(s=>s.variantId==='shirt-member');
  assert.equal(memberSlot.photo.alt,'Club shirt · Member shirt');
  await assert.rejects(read(main.photo.url,null),{status:401});
  const publicImage='/api/shop/photos/'+main.version;
  await assert.rejects(read(publicImage,null),{status:404});
  assert.equal((await metadata()).photo,null);
  const bytes=await read(main.photo.url,finance);
  assert.equal(bytes.headers.get('content-type'),'image/jpeg');
  assert.equal(Buffer.from(await bytes.arrayBuffer()).includes(extra),false);
  await db.prepare("UPDATE shop_listings SET published=1 WHERE product_id='shirt'").run();
  const advertised=await metadata();
  assert.equal(advertised.photo.url,publicImage);
  assert.equal(advertised.photo.alt,data.alt);
  const variantImage=advertised.variants[0].photo.url;
  assert.match((await read(variantImage)).headers.get('cache-control'),/no-store/);
  await db.prepare("UPDATE shop_variants SET active=0 WHERE stock_item_id='shirt-member'").run();
  assert.equal((await metadata()).variants[0].photo,null);
  await assert.rejects(read(variantImage),{status:404});
  await assert.rejects(write({...variantData,version:memberSlot.version,mutationId:randomUUID()}),{status:404});
  await db.prepare("UPDATE shop_variants SET active=1 WHERE stock_item_id='shirt-member'").run();
  assert.equal((await read(variantImage)).status,200);
  const edit={action:'save',productId:'shirt',variantId:null,version:main.version,mutationId:randomUUID(),alt:'Member shirt with club badge'};
  const updated=(await (await write(edit)).json()).slots[0];assert.notEqual(updated.version,main.version);
  await assert.rejects(read(publicImage),{status:404});
  assert.equal((await metadata()).photo.alt,edit.alt);
  await assert.rejects(write({...edit,mutationId:randomUUID()}),{status:409});
  const remove={action:'remove',productId:'shirt',variantId:null,version:updated.version,mutationId:randomUUID()};
  const removed=(await (await write(remove)).json()).slots[0];assert.equal(removed.photo,null);
  assert.equal((await (await write(remove)).json()).slots[0].version,removed.version);
  assert.equal((await metadata()).photo,null);
  await assert.rejects(write({...data,mutationId:randomUUID()}),{status:409});
  const restored=(await (await write({...data,version:removed.version,mutationId:randomUUID()})).json()).slots[0];
  assert.ok(restored.photo.url);assert.equal((await metadata()).photo.alt,data.alt);
  await db.prepare("UPDATE shop_listings SET published=0 WHERE product_id='shirt'").run();
  await assert.rejects(read(variantImage),{status:404});
  await db.prepare("UPDATE club_accounts SET disabled=1 WHERE id='finance'").run();
  await assert.rejects(read(restored.photo.url,finance),{status:403});
  await assert.rejects(write(data,finance),{status:403});
});
