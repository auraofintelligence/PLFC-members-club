import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './d1-fixture.mjs';
import {sponsorOffersEndpoint} from '../worker/sponsor-offers.mjs';
import {clubEquipmentEndpoint} from '../worker/club-equipment.mjs';

const intake='/api/sponsor-offers',office='/api/committee/sponsors';
const secretary={role:'committee',id:'officer-one',name:'secretary'};
const vice={role:'committee',id:'officer-two',name:'vicepresident'};
const member={role:'member',id:'member-one'};
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const error=(p,status)=>assert.rejects(p,e=>e.status===status);
function setup(t){
  const db=database(t,['0000_clubhouse.sql','0001_access_and_meetings.sql','0037_club_equipment.sql','0038_sponsor_offers.sql','0039_sponsor_loan_items.sql']);
  const env={DB:db,PRIVATE_AUTH_KEY:'isolated-sponsor-test-key'};
  const h={HttpError,bodyJson:r=>r.json(),json:(value,status,headers)=>({value,status,headers}),
    requireRole:(who,roles)=>{if(!roles.includes(who?.role))throw new HttpError(403,'No access');},
    requireDb:()=>db,textField:v=>v||'',dateField:v=>v||''};
  function call(path,who,data){
    const options=data?{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'192.0.2.17'},body:JSON.stringify(data)}:{};
    const endpoint=path.startsWith('/api/committee/equipment')?clubEquipmentEndpoint:sponsorOffersEndpoint;
    return endpoint(new Request('https://club.test'+path,options),env,who,h);
  }
  return {db,call};
}
const nomination=()=>({requestId:crypto.randomUUID(),organisation:'Private Brewery',contactName:'Jordan Demo',email:'private@example.test',
  offerTypes:['loan'],offer:'Private equipment terms',requestedReturn:'A discreet acknowledgement',eventName:'Winter club meet',participation:['observer','stand'],adultAreaRequested:true,consent:true});

test('public nominations stay private and encrypted; committee review is versioned, consented and linked to the register',async t=>{
  const {call,db}=setup(t),form=nomination();
  await error(call(intake,null),405);await error(call(office,null),401);await error(call(office,member),403);
  await error(call(intake,null,{...form,consent:false}),400);
  await error(call(intake,null,{...form,participation:['none','stand']}),400);
  const submitted=await call(intake,null,form);
  assert.deepEqual(submitted.value,{received:true});assert.equal(submitted.status,202);
  assert.deepEqual((await call(intake,null,{...form,organisation:'Changed on replay'})).value,submitted.value);
  const stored=await db.prepare('SELECT * FROM sponsor_offers').first();
  for(const value of ['private@example.test','Private Brewery','Private equipment terms',form.requestId])assert.ok(!JSON.stringify(stored).includes(value),value);
  const list=(await call(office,secretary)).value;
  assert.equal(list.offers.length,1);
  assert.equal(list.introductionTemplates.length,3);
  assert.ok(list.introductionTemplates.some(p=>p.organisation==='Straddie Brewing'));
  assert.ok(list.introductionTemplates.some(p=>p.owner==='vicepresident'&&p.contactRoute.includes('bowls')));
  assert.ok(!JSON.stringify(submitted.value).includes('distributor'));
  assert.equal(list.offers[0].adultAreaRequested,true);assert.equal(list.offers[0].alcoholSupplyProposed,false);
  assert.ok(!JSON.stringify(list).includes(form.email));assert.ok(!JSON.stringify(list).includes(form.requestedReturn));
  const {offer}= (await call(office+'?id='+stored.id,vice)).value;
  assert.equal(offer.source,'nomination');assert.equal(offer.email,form.email);assert.ok(offer.consentAt);
  assert.match(offer.consentText,/committee may store/);assert.deepEqual(offer.history,[]);
  const equipment='/api/committee/equipment';
  const asset={action:'create',id:crypto.randomUUID(),mutationId:crypto.randomUUID(),name:'Loan marquee',ownerType:'sponsor',lender:form.organisation,
    lenderContact:form.email,custodian:'Club officer',location:'Club shed',onDate:'2025-01-10',sourceOfferId:stored.id};
  await error(call(equipment,secretary,asset),409);
  const review={action:'review',id:stored.id,version:1,status:'agreed',owner:'vicepresident',followUpOn:'2026-12-04',reviewNote:'Return marquees on Sunday'};
  await error(call(office,member,review),403);
  await error(call(office,secretary,review),400);
  const agreed={...review,supporterConfirmed:true};
  const saved=(await call(office,secretary,agreed)).value.offer;
  assert.equal(saved.status,'agreed');assert.equal(saved.version,2);assert.equal(saved.history[0].supporterConfirmed,true);
  assert.equal(saved.assetId,null);assert.equal(saved.loanEligible,true);
  assert.equal((await db.prepare('SELECT count(*) n FROM club_equipment').first()).n,0);
  assert.equal((await call(office,secretary,agreed)).value.offer.version,2);
  await error(call(office,vice,{...agreed,status:'declined'}),409);
  assert.equal((await call(office+'?status=new',vice)).value.offers.length,0);
  const encrypted=await db.prepare('SELECT * FROM sponsor_offer_reviews').first();
  assert.ok(!JSON.stringify(encrypted).includes('Return marquees on Sunday'));
  const registered=await call(equipment,secretary,asset);
  assert.equal(registered.value.item.sourceOfferId,stored.id);
  assert.equal((await call(office+'?id='+stored.id,vice)).value.offer.assetId,asset.id);
  await error(call(equipment,vice,{...asset,id:crypto.randomUUID(),mutationId:crypto.randomUUID()}),409);
  assert.equal((await db.prepare('SELECT count(*) n FROM club_equipment').first()).n,1);
  const esky={...asset,name:'Blue esky',id:crypto.randomUUID(),mutationId:crypto.randomUUID()};
  await call(equipment,secretary,esky);
  const item=await call(equipment,secretary,{action:'returnOwner',id:esky.id,version:1,mutationId:crypto.randomUUID(),
    onDate:'2025-01-11',custodian:'Returned to lender',location:'Lender collection',notes:'Collected by the owner.'});
  assert.equal(item.value.item.status,'returned');
  const linked=(await call(office+'?id='+stored.id,vice)).value.offer.assets;
  assert.equal(linked.length,2);
  assert.equal(linked.find(i=>i.name==='Blue esky').status,'returned');
  assert.equal(linked.find(i=>i.id===asset.id).status,'available');
});

test('committee-origin leads preserve the contact route, assignment and confirmed terms without inventing initial sponsor consent',async t=>{
  const {call}=setup(t);
  const lead={action:'lead',requestId:crypto.randomUUID(),organisation:'Local distributor',contactRoute:'Ask the bowls club introduction contact',owner:'vicepresident',reviewNote:'Check meeting availability'};
  await error(call(office,member,lead),403);
  await error(call(office,vice,{...lead,owner:''}),400);
  const {offer}= (await call(office,vice,lead)).value;
  assert.equal(offer.source,'lead');assert.equal(offer.consent,false);assert.equal(offer.consentAt,null);
  assert.equal(offer.consentText,'');assert.equal(offer.contactRoute,lead.contactRoute);
  assert.equal(offer.history[0].actor,'vicepresident');assert.equal(offer.history[0].supporterConfirmed,false);
  assert.equal((await call(office,vice,lead)).value.offer.id,offer.id);
  const result=(await call(office,secretary,{action:'review',id:offer.id,version:1,status:'agreed',owner:'treasurer',
    reviewNote:'Lender confirmed the gear loan and donated shirts to sell.',supporterConfirmed:true,agreedLoan:true,agreedShopProducts:true})).value.offer;
  assert.equal(result.loanEligible,true);assert.equal(result.consent,false);assert.equal(result.history.length,2);
  assert.equal(result.agreedShopProducts,true);
  const next={action:'review',id:offer.id,version:2,status:'agreed',owner:'treasurer',supporterConfirmed:true,reviewNote:'Agreed pickup time.'};
  assert.equal((await call(office,secretary,next)).value.offer.agreedShopProducts,true);
  assert.equal((await call(office,secretary,{...next,version:3,agreedShopProducts:false,reviewNote:'Supporter confirmed shirts will be raffle prizes.'})).value.offer.agreedShopProducts,false);
});

test('officers can distinguish a maker’s raffle prize, workshop and shop donation',async t=>{
  const {call}=setup(t);
  const maker={...nomination(),organisation:'Island studio',adultAreaRequested:false};
  const offers=[
    {offer:'A signed print for the raffle',offerTypes:['gift'],participation:['none']},
    {offer:'A family printmaking tutorial',offerTypes:['service'],participation:['workshop']},
    {offer:'Six hand-printed tea towels for the club shop',offerTypes:['clubSale'],participation:[]}
  ];
  for(const offer of offers)assert.equal((await call(intake,null,{...maker,...offer,requestId:crypto.randomUUID()})).status,202);
  const inbox=(await call(office,vice)).value.offers;
  assert.equal(inbox.length,3);
  for(const offer of offers){
    const row=inbox.find(r=>r.offerSummary===offer.offer);
    assert.ok(row);
    assert.deepEqual(row.offerTypes,offer.offerTypes);
    assert.equal(row.organisation,maker.organisation);
    const detail=(await call(office+'?id='+row.id,secretary)).value.offer;
    assert.deepEqual(detail.participation,offer.participation);
  }
});

test('retries do not spend a new public submission slot; extra offers from a single time window are throttled',async t=>{
  const {call,db}=setup(t),form=nomination();
  for(let i=0;i<12;i++)await call(intake,null,i===0?form:{...form,requestId:crypto.randomUUID()});
  await error(call(intake,null,{...form,requestId:crypto.randomUUID()}),429);
  assert.deepEqual((await call(intake,null,form)).value,{received:true});
  assert.equal((await db.prepare('SELECT count(*) n FROM sponsor_offers').first()).n,12);
});
