import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { database } from './d1-fixture.mjs';
import { sharedMealsEndpoint } from '../worker/shared-meals.mjs';
import { memberExportEndpoint } from '../worker/member-export.mjs';

async function mealFixture(t){
  const db=database(t,readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort());
  const env={DB:db,PRIVATE_AUTH_KEY:'synthetic test key'};
  class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
  const h={HttpError,requireDb:()=>db,requireRole(who,roles){if(!roles.includes(who?.role))throw new HttpError(401,'Sign in');},
    json:(body,status,headers)=>Response.json(body,{status,headers}),bodyJson:r=>r.json()};
  const ids={},seed=[];
  for(const name of ['host','friend','listed','outsider','junior']){
    ids[name]=randomUUID();
    seed.push(db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,'member','a','b',1,'2099-12-31')").bind(name,name),
      db.prepare("INSERT INTO member_age_checks VALUES(?,?,?,1,'today','officer')").bind(name,name==='junior'?'under16':'16+',+(name==='junior')),
      db.prepare("INSERT INTO member_terms_acceptance SELECT ?,terms_version,1,1,'today' FROM member_safeguard_policy").bind(name),
      db.prepare('INSERT INTO network_profiles VALUES(?,?,?,?,?,NULL,1,?)').bind(ids[name],name,name,'angler-01',+(name==='listed'),randomUUID()));
  }
  const friends=[ids.host,ids.friend].sort();
  seed.push(db.prepare("INSERT INTO network_pairs VALUES(?,?,'friend',NULL,0,0,1,?)").bind(...friends,randomUUID()));
  await db.batch(seed);
  const call=(who,body,guest=false,cookie='',query='')=>{
    const request=new Request('https://club.test'+(guest?'/api/meal-guest':'/api/member/meals')+query,
      {method:body?'POST':'GET',headers:{Origin:'https://club.test','Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):null});
    const identity=typeof who==='object'?who:who?{id:who,role:'member',accountRole:'member'}:null;
    return sharedMealsEndpoint(request,env,identity,h);
  };
  const list=async who=>(await(await call(who)).json()).meals;
  const status=code=>e=>e.status===code;
  const create={action:'create',id:randomUUID(),date:'2098-01-02',time:'18:30',venueType:'home',area:'Amity',
    location:'House 87, private exact address',menu:'Snapper',hostName:'Island cook',title:'Catch BBQ',jobs:['Bring the tunes','Cook at the BBQ']};
  return {db,env,h,ids,friends,call,list,status,create};
}

test('private, open and guest meals share an address only with the host and current attendees',async t=>{
  const {db,env,h,ids,friends,call,list,status,create}=await mealFixture(t);
  const inv=randomUUID(),otherInv=randomUUID(),external=randomUUID();
  const memberInvite=(peerId,id)=>call('host',{action:'inviteMember',mealId:create.id,peerId,id});
  const webmaster={id:'technical-officer',role:'committee',accountRole:'administrator',administrator:true};
  const reply=(inviteId,notes='secret allergy')=>({action:'rsvp',inviteId,response:'going',partySize:2,dietary:notes,sideDish:'Potato salad for six',contribution:'Island playlist'});
  await assert.rejects(call('junior',create),status(403));
  await call('host',create);await call('host',create);
  const modify={action:'updateMenu',mealId:create.id,menu:'Lemon fish',recipe:'Lemon butter',byo:'BYO chair'};
  await assert.rejects(call('friend',modify),status(404));
  await call('host',modify);assert.equal((await list('host'))[0].menu,'Lemon fish');
  assert.deepEqual(await list(webmaster),[],'a private home invitation is invisible to the Webmaster');
  await assert.rejects(call(webmaster,null,false,'','?q=host'),status(403));
  await assert.rejects(call(webmaster,{...modify,menu:'Attempted staff edit'}),status(403));
  assert.deepEqual(await list('outsider'),[]);
  assert.equal((await list('host'))[0].location,create.location);
  assert.deepEqual((await(await call('host',null,false,'','?q=')).json()).people.map(p=>p.id),[ids.friend]);
  assert.deepEqual((await(await call('host',null,false,'','?q=liste')).json()).people.map(p=>p.id),[ids.listed]);
  await assert.rejects(memberInvite(ids.outsider,randomUUID()),status(409));
  await memberInvite(ids.friend,inv);await memberInvite(ids.listed,otherInv);
  const pending=(await list('friend'))[0];assert.equal(pending.location,null);assert.equal(pending.invites,undefined);
  await assert.rejects(call('outsider',reply(inv)),status(404));
  await call('friend',reply(inv));await call('listed',reply(otherInv,'different allergy'));
  const exported=async(who,group)=>(await memberExportEndpoint(new Request('https://club.test/api/member/export/'+group+'?after=0&through=1000'),env,{id:who,role:'member',accountRole:'member'},h)).json();
  const personal=await exported('friend','mealReplies');
  assert.equal(personal.rows.length,1);
  assert.equal(personal.rows[0].sideDish,'Potato salad for six');
  assert.doesNotMatch(JSON.stringify(personal),/different allergy|House 87|Island cook/);
  assert.deepEqual((await exported('friend','meals')).rows,[]);
  assert.equal((await exported('host','meals')).rows[0].location,create.location);
  const friend=(await list('friend'))[0];assert.equal(friend.location,create.location);assert.equal(friend.invitation.dietary,'secret allergy');
  assert.doesNotMatch(JSON.stringify(friend),/different allergy/);
  const job=who=>call(who,{action:'job',mealId:create.id,jobIndex:0,claim:true});
  const competition=await Promise.allSettled([job('friend'),job('listed')]);
  assert.equal(competition.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(competition.find(r=>r.status==='rejected').reason.status,409);
  const hostView=(await list('host'))[0];assert.equal(hostView.invites.length,2);assert.equal(hostView.shared.length,2);
  assert.ok(['friend','listed'].includes(hostView.jobs[0].claimedBy));
  assert.equal((await list('listed'))[0].jobs[0].claimedBy,undefined);
  const guestInvite={action:'inviteGuest',mealId:create.id,id:external,name:'Personal guest'};
  const token=(await(await call('host',guestInvite)).json()).token;
  assert.equal((await(await call('host',guestInvite)).json()).token,token);
  const guest=(action,cookie='',extra={})=>call(null,{token,action,...extra},true,cookie);
  const first=await guest('view'),second=await guest('view');
  const cookie=r=>r.headers.get('set-cookie').split(';')[0];
  assert.match(first.headers.get('set-cookie'),/HttpOnly/);assert.equal((await first.json()).meal.location,null);
  const yes={response:'going',partySize:1,dietary:'guest allergy',ageConfirmed:true,sideDish:'Bread'};
  const answers=await Promise.allSettled([guest('rsvp',cookie(first),yes),guest('rsvp',cookie(second),yes)]);
  assert.equal(answers.filter(r=>r.status==='fulfilled').length,1);
  const winningCookie=cookie(answers[0].status==='fulfilled'?first:second);
  assert.equal((await(await guest('view',winningCookie)).json()).meal.location,create.location);
  await assert.rejects(guest('view'),status(404));
  await assert.rejects(call('junior',{action:'view',token},true,winningCookie),status(403));
  await guest('job',winningCookie,{jobIndex:1,claim:true});
  await call('host',{action:'revoke',mealId:create.id,inviteId:external});
  await assert.rejects(guest('view',winningCookie),status(404));assert.equal((await list('host'))[0].jobs[1].taken,false);
  await assert.rejects(call('host',guestInvite),status(409));
  const again={...guestInvite,id:randomUUID()};
  const anotherToken=(await(await call('host',again)).json()).token;
  const anotherView=()=>call(null,{action:'view',token:anotherToken},true);
  await db.prepare("UPDATE club_accounts SET paid_through='2000-01-01' WHERE id='host'").run();
  await assert.rejects(anotherView(),status(404));
  await db.prepare("UPDATE club_accounts SET paid_through='2099-12-31' WHERE id='host'").run();
  assert.equal((await(await anotherView()).json()).meal.invitation.response,'pending');
  const open={...create,id:randomUUID(),visibility:'members',title:'Open members BBQ',recipe:'Cooked fish tacos',byo:'Bring a chair'};
  await call('host',open);
  let view=(await list('outsider'))[0];assert.equal(view.location,null);assert.equal(view.invitation,null);
  const joinId=randomUUID(),join={action:'join',id:joinId,mealId:open.id,partySize:2,dietary:'no shellfish',sideDish:'Rolls'};
  await call('outsider',join);view=(await list('outsider'))[0];assert.equal(view.location,open.location);
  await call('outsider',{action:'job',mealId:open.id,jobIndex:0,claim:true});
  const inspection=await call(webmaster);
  assert.equal(inspection.headers.get('Cache-Control'),'private, no-store');
  assert.deepEqual(await inspection.json(),{mode:'webmaster',meals:[{id:open.id,title:open.title,area:open.area,date:open.date,time:open.time,
    venueType:open.venueType,menu:open.menu,recipe:open.recipe,byo:open.byo,guestLimit:null,placesLeft:null,jobs:[{index:0,label:'Bring the tunes'},{index:1,label:'Cook at the BBQ'}]}]});
  for(const payload of [join,{...modify,mealId:open.id},{action:'cancel',mealId:open.id},{action:'revoke',mealId:open.id,inviteId:joinId},
    {action:'inviteGuest',mealId:open.id,id:randomUUID(),name:'Fictional guest'},{action:'job',mealId:open.id,jobIndex:1,claim:true}]){
    await assert.rejects(call(webmaster,payload),status(403));
  }
  await call('host',{action:'revoke',mealId:open.id,inviteId:joinId});assert.deepEqual(await list('outsider'),[]);
  await assert.rejects(call('outsider',{...join,id:randomUUID()}),status(409));
  await db.prepare('UPDATE network_pairs SET low_block=1 WHERE low_id=? AND high_id=?').bind(...friends).run();
  assert.deepEqual(await list('friend'),[]);
  await call('host',{action:'cancel',mealId:create.id});
  assert.equal((await list('listed')).find(m=>m.id===create.id).location,null);
  await assert.rejects(anotherView(),status(404));
  const row=await db.prepare('SELECT contents,location FROM shared_meals WHERE id=?').bind(create.id).first();
  assert.doesNotMatch(JSON.stringify(row),/House 87|Snapper|Amity/);
  await db.prepare('UPDATE member_terms_acceptance SET accepted=0 WHERE account_id=?').bind('host').run();
  assert.deepEqual(await list('listed'),[]);
  assert.deepEqual(await list(webmaster),[],'withdrawal also removes member-open meals from the staff view');
  await db.prepare('UPDATE member_terms_acceptance SET accepted=1 WHERE account_id=?').bind('host').run();
  await call('host',{action:'cancel',mealId:open.id});assert.deepEqual(await list(webmaster),[]);
});

test('accepted parties share the same guest limit at home and at public meals',async t=>{
  const {ids,call,list,status,create}=await mealFixture(t);
  const full=error=>error.status===409 && /places|guests are already coming/.test(error.message);
  const update=(mealId,guestLimit,who='host')=>call(who,{action:'updatePlaces',mealId,guestLimit});
  const hostMeal=async id=>(await list('host')).find(m=>m.id===id);
  for(const bad of [0,-1,1.5,'3',true]){
    await assert.rejects(call('host',{...create,guestLimit:bad}),status(400));
  }
  for(const [venueType,visibility] of [['bbq','members'],['home','invited']]){
    const id=randomUUID(),address=venueType==='home'?'45 Example Street':'Riverside Park, shelter 2';
    const draft={...create,id,area:'Brisbane',location:address,venueType,visibility,guestLimit:3};
    await call('host',draft);await call('host',draft);
    await assert.rejects(call('host',{...draft,guestLimit:4}),status(409));
    await assert.rejects(update(id,5,'friend'),status(404));
    const inviteId=randomUUID(),guestId=randomUUID();
    await call('host',{action:'inviteMember',mealId:id,id:inviteId,peerId:ids.friend});
    const token=(await(await call('host',{action:'inviteGuest',mealId:id,id:guestId,name:'Guest and family'})).json()).token;
    const view=await call(null,{action:'view',token},true),cookie=view.headers.get('set-cookie').split(';')[0];
    const before=(await view.json()).meal;
    assert.equal(before.location,null);assert.equal(before.placesLeft,3);assert.equal(before.area,'Brisbane');
    const reply=(partySize,response='going')=>call('friend',{action:'rsvp',inviteId,partySize,response});
    const guest=(partySize,response='going')=>call(null,{action:'rsvp',token,partySize,response,ageConfirmed:true},true,cookie);
    const race=await Promise.allSettled([reply(2),guest(2)]);
    assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
    assert.ok(full(race.find(r=>r.status==='rejected').reason));
    assert.equal((await hostMeal(id)).placesLeft,1);
    const [winning,other]=race[0].status==='fulfilled'?[reply,guest]:[guest,reply];
    await winning(2);await other(1);
    assert.equal((await hostMeal(id)).placesLeft,0);
    await assert.rejects(other(2),full);
    await assert.rejects(update(id,2),full);
    assert.equal((await hostMeal(id)).guestLimit,3);
    await other(1,'declined');
    await update(id,2);
    assert.equal((await hostMeal(id)).placesLeft,0);
    await update(id,null);
    assert.equal((await hostMeal(id)).placesLeft,null);
    await winning(8);await other(8);
    await assert.rejects(update(id,15),full);
    await update(id,16);
    await call('host',{action:'revoke',mealId:id,inviteId:guestId});
    assert.equal((await hostMeal(id)).placesLeft,8);
    if(visibility==='members'){
      await update(id,9);
      const join={action:'join',mealId:id,id:randomUUID(),partySize:2};
      await assert.rejects(call('outsider',join),full);
      const available=(await list('outsider')).find(m=>m.id===id);
      assert.equal(available.invitation,null);assert.equal(available.location,null);
      join.partySize=1;
      await call('outsider',join);await call('outsider',join);
      assert.equal((await list('outsider')).find(m=>m.id===id).location,address);
      assert.equal((await hostMeal(id)).placesLeft,0);
    }else{
      assert.equal((await list('outsider')).some(m=>m.id===id),false);
      await assert.rejects(call('outsider',{action:'join',mealId:id,id:randomUUID(),partySize:1}),status(409));
    }
  }
});
