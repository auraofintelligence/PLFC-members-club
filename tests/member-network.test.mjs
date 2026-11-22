import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {database} from './d1-fixture.mjs';
import {handleRequest} from '../worker/index.mjs';
import {privateAreaKeys,sealPrivateText} from '../worker/member-network.mjs';

const base='/api/member/network',origin='https://club.example';
const original=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/AOXr/9k=','base64');
const metadata=Buffer.concat([Buffer.from([255,225,0,13]),Buffer.from('GPS-EXAMPLE')]);
const photo='data:image/jpeg;base64,'+Buffer.concat([original.subarray(0,2),metadata,original.subarray(2,-2),metadata,original.subarray(-2)]).toString('base64');
const op=(action,extra)=>({action,mutationId:randomUUID(),...extra});
async function fixture(t){
  const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>/^\d.*\.sql$/.test(n)&&n.slice(0,4)<='0028').sort();
  const db=database(t,files),env={DB:db,PRIVATE_AUTH_KEY:'test-fixture-private'},cookies={};
  for(const [account,role,category] of [['a','member','adult'],['b','member','adult'],['c','member','social'],['d','member','adult'],
    ['junior','member','junior'],['unknown','member','unconfirmed'],['admin','administrator','adult']]){
    const token=randomBytes(32).toString('hex');cookies[account]='__Host-plfc_session='+token;
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,?,'s','v',0,'2099-12-31')")
      .bind(account,account+'@private.example',role),db.prepare('INSERT INTO club_sessions VALUES(?,?,4102444800)').bind(createHash('sha256').update(token).digest('hex'),account),
      db.prepare('UPDATE member_profiles SET membership_type=? WHERE account_id=?').bind(category,account)]);
    if(role==='member'&&account!=='unknown'){
      await db.prepare("INSERT INTO member_age_checks VALUES(?,?,?,1,'2026-11-21','fixture-officer')").bind(account,account==='junior'?'under16':'16+',Number(account==='junior')).run();
      if(account!=='junior') await db.prepare("INSERT INTO member_terms_acceptance SELECT ?,terms_version,1,1,'2026-11-21' FROM member_safeguard_policy").bind(account).run();
    }
  }
  const raw=(who,body,route=base,method=body?'POST':'GET')=>{
    const headers={Origin:origin,'Content-Type':'application/json'};if(cookies[who])headers.Cookie=cookies[who];
    return handleRequest(new Request(origin+route,{headers,method,body:body?JSON.stringify(body):undefined}),env);
  };
  const call=async(who,body,status=200,route=base)=>{
    const r=await raw(who,body,route);const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));assert.match(r.headers.get('Cache-Control'),/no-store/);
    return data;
  };
  const profile=async(who,listed=true,extra={})=>(await call(who,op('profile',{version:0,displayName:'Fisher '+who,avatarId:'angler-24',listed,...extra}),201)).profile;
  const friend=async(who,other,p,q,version=0)=>{
    await call(who,op('request',{peerId:q.id,version}));
    await call(other,op('accept',{peerId:p.id,version:version+1}));
  };
  return {db,raw,call,profile,friend};
}

test('private profiles and member assets require a current paid account; searches never reveal sign-in details',async t=>{
  const {db,raw,call,profile,friend}=await fixture(t);
  await call('guest',null,401);await call('admin',null,403);
  const blank=await call('a');assert.equal(blank.profile.avatarId,'angler-01');assert.equal(blank.profile.displayName,'');assert.equal(blank.canShare,false);
  const a=await profile('a',false,{photo});const b=await profile('b');await profile('c');
  const hidden=await call('b',null,200,base+'?q=Fisher%20a');assert.deepEqual(hidden.people,[]);
  const discover=await call('a',null,200,base+'?q=Fisher');assert.equal(discover.people.length,2);
  assert.ok(!JSON.stringify(discover).includes('@private'));assert.ok(discover.people.every(p=>p.photoUrl===null));
  await call('b',null,404,a.photoUrl);await call('guest',null,401,a.photoUrl);
  await friend('a','b',a,b);
  const pic=await raw('b',null,a.photoUrl);assert.equal(pic.status,200);assert.match(pic.headers.get('Cache-Control'),/no-store/);
  const jpg=Buffer.from(await pic.arrayBuffer());assert.ok(!jpg.includes(Buffer.from('GPS-EXAMPLE')));assert.equal(jpg[0],255);assert.equal(jpg.at(-1),217);
  const bad=op('profile',{version:1,avatarId:'angler-37',displayName:'Updated',listed:false});
  await call('a',bad,400);
  const change=op('profile',{version:1,avatarId:'angler-36',displayName:'Dolphin',listed:false});
  const updated=await call('a',change);assert.equal(updated.profile.version,2);assert.equal(updated.profile.photoUrl,a.photoUrl);await call('a',change);
  await call('a',{...change,mutationId:randomUUID()},409);
  await db.prepare("UPDATE club_accounts SET paid_through='2001-01-01' WHERE id='a'").run();
  await call('a',null,403);await call('b',null,404,a.photoUrl);assert.deepEqual((await call('b')).connections,[]);
  await db.prepare("UPDATE club_accounts SET paid_through='2099-12-31' WHERE id='a'").run();
  await call('a',op('profile',{...change,version:2,mutationId:randomUUID(),photo:null}));await call('a',null,404,a.photoUrl);
});

test('a first private map spot needs no social profile and remains private after profile setup',async t=>{
  const {db,raw,call,profile}=await fixture(t);
  const peer=await profile('b'),id=randomUUID(),entry=op('create',{id,title:'My first fishing spot',
    pin:{latitude:-27.43,longitude:153.54,label:'Point Lookout'},photo,recipients:[],duration:'week'});
  assert.equal((await call('a')).profile.id,null);
  assert.equal((await db.prepare("SELECT count(*) n FROM network_profiles WHERE account_id='a'").first()).n,0);
  const saved=await call('a',entry,201);
  assert.equal(saved.profile.id,null);assert.equal(saved.canShare,false);assert.equal(saved.mine[0].pin.label,'Point Lookout');
  assert.equal((await call('a',entry)).mine.length,1);
  const link=saved.mine[0].photoUrl;assert.equal((await raw('a',null,link)).status,200);
  await call('b',null,404,link);await call('a',null,403,base+'?q=Fisher');
  await call('a',op('request',{peerId:peer.id,version:0}),403);
  await call('a',op('grant',{id,version:1,duration:'week',recipients:[peer.id]}),403);
  await call('a',op('pinStyle',{id,version:1,style:'manual'}),400);
  const change=op('pinStyle',{id,version:1,style:'fish'});
  const styled=(await call('a',change)).mine[0];assert.equal(styled.pin.style,'fish');assert.deepEqual(styled.recipients,[]);
  assert.equal((await call('a',change)).mine[0].version,2);
  await call('b',op('pinStyle',{id,version:2,style:'flag'}),404);
  await call('a',op('pinStyle',{id,version:1,style:'flag'}),409);
  await call('junior',op('pinStyle',{id,version:2,style:'flag'}),403);
  await call('junior',{...entry,mutationId:randomUUID(),id:randomUUID()},403);
  assert.equal((await call('b',null,200,base+'?q=Fisher%20a')).people.length,0);
  const updated=await profile('a',false);assert.ok(updated.id);assert.equal(updated.version,1);
  const after=await call('a');assert.equal(after.mine.length,1);assert.equal(after.mine[0].pin.latitude,-27.43);
  assert.equal(after.mine[0].photoUrl,link);assert.deepEqual(after.mine[0].recipients,[]);
  await call('b',null,404,link);
});

test('only current selected friends can read encrypted items and photos; closure, expiry and individual revocation apply to every read',async t=>{
  const {db,raw,call,profile,friend}=await fixture(t);
  const a=await profile('a'),b=await profile('b'),c=await profile('c'),d=await profile('d');
  await friend('a','b',a,b);await friend('a','c',a,c);
  const catchId=randomUUID();await db.prepare("INSERT INTO catches VALUES(?,'a','Bream',32,'2026-10-04','do not reveal this spot','private notebook','2026-10-04')").bind(catchId).run();
  const itemId=randomUUID(),create=op('create',{id:itemId,title:'Evening bream',message:'Private message',pin:{latitude:-27.412345,longitude:153.5321,label:'Little gutter',style:'flag'},
    photo,catchId,recipients:[b.id,c.id],duration:'week'});
  await call('a',{...create,id:randomUUID(),mutationId:randomUUID(),recipients:[b.id,d.id]},409);
  await call('d',{...create,id:randomUUID(),mutationId:randomUUID(),recipients:[]},404);
  const saved=(await call('a',create,201)).mine[0];assert.equal(saved.recipients.length,2);assert.ok(saved.recipients.every(r=>r.active&&r.expiresAt));
  await call('a',create);assert.equal((await call('a')).mine.length,1);
  const copy=(await call('b')).inbox[0];assert.equal(copy.pin.latitude,-27.412345);assert.equal(copy.pin.style,'flag');assert.equal(copy.title,create.title);
  assert.deepEqual(copy.catch,{species:'Bream',lengthCm:32,date:'2026-10-04'});assert.deepEqual(copy.recipients,[]);assert.ok(!JSON.stringify(copy).includes('do not reveal'));
  const stored=await db.prepare('SELECT content,photo FROM network_items WHERE id=?').bind(itemId).first();
  for(const clear of ['Little gutter','27.412345','Evening bream','/9j/'])assert.ok(!JSON.stringify(stored).includes(clear));
  const direct=base+'?item='+itemId;
  await call('d',null,404,direct);await call('d',null,404,saved.photoUrl);await call('guest',null,401,saved.photoUrl);
  assert.equal((await raw('b',null,saved.photoUrl,'HEAD')).status,200);
  await call('a',op('revoke',{id:itemId,peerId:b.id,version:1}));await call('b',null,404,direct);await call('b',null,404,saved.photoUrl);
  await call('c',null,200,direct);await call('b',op('grant',{id:itemId,version:2,recipients:[c.id],duration:'day'}),404);
  await db.prepare("UPDATE network_recipients SET expires_at='2001-01-01T00:00:00.000Z' WHERE item_id=? AND peer_id=?").bind(itemId,c.id).run();
  await call('c',null,404,direct);await call('c',null,404,saved.photoUrl);
  await call('a',op('grant',{id:itemId,version:2,recipients:[b.id,c.id],duration:'until-revoked'}));
  await db.prepare("UPDATE club_accounts SET paid_through='2001-01-01' WHERE id='a'").run();await call('c',null,404,direct);await call('c',null,404,saved.photoUrl);
  await db.prepare("UPDATE club_accounts SET paid_through='2099-12-31' WHERE id='a'").run();
  await call('b',op('block',{peerId:a.id,version:2}));await call('b',null,404,direct);await call('a',null,200,base+'?q=Fisher%20b');
  await call('b',op('unblock',{peerId:a.id,version:3}));await friend('a','b',a,b,4);
  await call('b',null,404,direct);await call('c',null,200,direct);
  await call('a',op('revoke',{id:itemId,version:3}));await call('c',null,404,direct);
});

test('under 16 with guardian approval has a private journal; unconfirmed accounts cannot access it, and membership labels never override checked age',async t=>{
  const {db,call,profile}=await fixture(t);
  const friend=await profile('a');
  await call('unknown',null,403);
  await call('unknown',op('profile',{version:0,displayName:'Unknown fisher',avatarId:'angler-01',listed:false}),403);
  {
    const who='junior';
    await profile(who,false);
    const desk=await call(who);assert.equal(desk.eligibleToShare,false);assert.equal(desk.canShare,false);
    await call(who,null,403,base+'?q=Fisher');
    await call(who,op('request',{version:0,peerId:friend.id}),403);
    await call(who,op('profile',{version:1,listed:true,displayName:'Young fisher',avatarId:'angler-01'}),403);
    const entry=op('create',{id:randomUUID(),title:'My private catch',photo,recipients:[],duration:'day'});
    const privateDesk=await call(who,entry,201);assert.equal(privateDesk.mine[0].title,entry.title);
    await call('a',null,404,privateDesk.mine[0].photoUrl);
    await call(who,{...entry,mutationId:randomUUID(),id:randomUUID(),pin:{latitude:-27,longitude:153}},403);
    await call(who,{...entry,mutationId:randomUUID(),id:randomUUID(),recipients:[friend.id]},403);
  }
  await db.prepare(`INSERT INTO membership_applications(id,request_id,full_name,membership_type,pack_method,status,account_id,guardian_authorised,guardian_social,guardian_reviewed,social_reviewed)
    VALUES('youth-file','test-request','Young member','junior','collect','active','a',1,1,1,1)`).run();
  assert.equal((await call('a')).eligibleToShare,true);
  await db.prepare("DELETE FROM club_sessions WHERE account_id='junior'").run();await call('junior',null,401);
});

test('terms withdrawal retires existing shares in both directions, profile listing and friendships, with no resurrection on accepting again',async t=>{
  const {db,call,profile,friend}=await fixture(t),a=await profile('a'),b=await profile('b');
  await friend('a','b',a,b);
  const item=async(who,peer,title)=> (await call(who,op('create',{id:randomUUID(),title,
    pin:{latitude:-27.3,longitude:153.4,label:'Private spot'},photo,recipients:[peer.id],duration:'until-revoked'}),201)).mine[0];
  const first=await item('a',b,'First spot'),second=await item('b',a,'Second spot');
  assert.equal((await call('a')).inbox.length,1);
  const path='/api/member/safeguards',state=await call('a',null,200,path);
  await call('a',{action:'withdraw',version:state.version,termsVersion:state.termsVersion},200,path);
  assert.equal((await call('a')).mine[0].pin,null);assert.deepEqual((await call('a')).inbox,[]);
  await call('b',null,404,first.photoUrl);await call('a',null,404,second.photoUrl);
  await call('a',{action:'accept',version:state.version+1,termsVersion:state.termsVersion},200,path);
  const relisted=await call('a');assert.equal(relisted.profile.listed,false);assert.deepEqual(relisted.connections,[]);
  assert.deepEqual(relisted.inbox,[]);assert.ok(relisted.mine[0].pin);assert.equal(relisted.mine[0].recipients[0].active,false);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM network_recipients WHERE revoked_at IS NULL').first()).n,0);
});

test('a member can find and revoke old shares across pages; page tokens belong to the member and list',async t=>{
  const {db,call,profile,friend}=await fixture(t),a=await profile('a'),b=await profile('b');await friend('a','b',a,b);
  const keys=await privateAreaKeys('test-fixture-private'),rows=[];
  for(let n=0;n<61;n++){
    const id=randomUUID(),stamp=new Date(Date.UTC(2026,0,1,0,n)).toISOString();
    const body=await sealPrivateText(keys.content,'item:'+id,JSON.stringify({title:'Catch '+n,message:'',pin:null,catch:null}));
    rows.push(db.prepare('INSERT INTO network_items(id,owner_id,created_at,content,mutation) VALUES(?,?,?,?,?)').bind(id,a.id,stamp,body,randomUUID()));
    rows.push(db.prepare('INSERT INTO network_recipients(item_id,peer_id) VALUES(?,?)').bind(id,b.id));
  }
  await db.batch(rows);
  const mine=await call('a'),inbox=await call('b');
  assert.equal(mine.mine.length,60);assert.ok(mine.nextMine);assert.equal(inbox.inbox.length,60);assert.ok(inbox.nextInbox);
  const list=(kind,cursor)=>base+'?list='+kind+'&before='+encodeURIComponent(cursor);
  await call('b',null,400,list('inbox',mine.nextMine));await call('a',null,400,list('inbox',mine.nextMine));
  const older=await call('a',null,200,list('mine',mine.nextMine)),received=await call('b',null,200,list('inbox',inbox.nextInbox));
  assert.equal(older.items[0].title,'Catch 0');assert.equal(older.nextCursor,null);assert.equal(older.items[0].id,received.items[0].id);
  await call('a',op('revoke',{id:older.items[0].id,version:1,peerId:b.id}));
  assert.deepEqual((await call('b',null,200,list('inbox',inbox.nextInbox))).items,[]);
});
