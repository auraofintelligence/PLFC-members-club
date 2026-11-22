import test from 'node:test';
import assert from 'node:assert/strict';
import {opportunities} from '../public/grant-opportunities.mjs';
import {recommendedGrantsForWish, recommendedWishesForGrant, recommendedSavedGrantsForWish, wishIdeasForGrant} from '../public/grant-wish-matches.js';

const now = '2026-11-21T10:00';
const fisheries = opportunities.find(g => g.name === 'Community Fishing Grants');
const standard = {id:'a', name:'Brag-mats', purpose:'Teach families to measure and release at our public clinics.'};
const prize = {id:'b',name:'Raffle prize rods',purpose:'Draw at our public clinic.'};

test('a concrete idea points back to its source and gives the same reason from either screen', () => {
  for (const grant of opportunities) {
    for (const idea of wishIdeasForGrant(grant,now)) {
      const lead = recommendedGrantsForWish(idea,now).find(result => result.grant === grant);
      assert.ok(lead, grant.name + ': ' + idea.name);
      assert.deepEqual(recommendedWishesForGrant(grant,[idea],now),[{wish:idea,reason:lead.reason}]);
    }
  }
  const record = {title:'Our public clinic',sourceUrl:fisheries.url,stage:'preparing'};
  assert.deepEqual(recommendedWishesForGrant(record,[standard,prize],now).map(r=>r.wish.id),['a']);
  assert.ok(wishIdeasForGrant(record,now).length);
});

test('a closed application window, fulfilled wish and unsuitable purchase stay out of suggestions', () => {
  assert.deepEqual(wishIdeasForGrant(fisheries,'2026-12-10'),[]);
  assert.deepEqual(recommendedGrantsForWish(prize,now),[]);
  assert.deepEqual(recommendedGrantsForWish({...standard,status:'fulfilled'},now),[]);
  assert.deepEqual(recommendedWishesForGrant(fisheries,[{name:'Rods',purpose:'Private members only'}],now),[]);
  assert.deepEqual(wishIdeasForGrant({title:'Events Grant',funder:'Redland City Council'},now),[]);
  const clubhouse = opportunities.find(g=>g.name==='Club House Grant');
  assert.ok(wishIdeasForGrant(clubhouse,'2027-04-01T16:59').length);
  assert.deepEqual(wishIdeasForGrant(clubhouse,'2027-04-01T17:00'),[]);
});

test('the same equipment match applies to an officer-entered grant with a clear purpose', () => {
  const grant={title:'Island first aid equipment fund',stage:'checking'};
  const kit={name:'First aid kit',purpose:'Shared supplies for local meets'};
  const [match]=recommendedSavedGrantsForWish(kit,[grant],now);
  assert.equal(match.grant,grant);
  assert.equal(recommendedWishesForGrant(grant,[kit],now)[0].reason,match.reason);
  assert.deepEqual(wishIdeasForGrant({...grant,stage:'declined'},now),[]);
  assert.deepEqual(recommendedSavedGrantsForWish(kit,[{...grant,deadline:'2026-09-01'}],now),[]);
  assert.deepEqual(wishIdeasForGrant({title:'Island community fund',nextStep:'Ask whether first aid equipment is excluded.'},now),[]);
});

test('cold storage and portable event kits have distinct leads from boats and fixed works', () => {
  const recommendations = (name, purpose) => recommendedGrantsForWish({name,purpose}, now).map(({grant}) => grant.name);
  for (const name of ['Shared eskies','Insulated ice boxes','Bait freezer']) {
    assert.deepEqual(recommendations(name,'Keep gear for regular club meets.'), ['Club House Grant']);
  }
  for (const name of ['Portable PA','Competition check-in kit']) {
    assert.deepEqual(recommendations(name,'Volunteer equipment for public events.'), ['Rapid Response Grant','Club House Grant']);
  }
  // Incidental references to equipment must not change what the club wants to fund.
  assert.deepEqual(recommendations('Portable PA system','A prize presentation at a local meet.'), ['Rapid Response Grant','Club House Grant']);
  for (const name of ['Boat-launch tractor','Permanent surf ramp','Enclosed equipment trailer','Lockable gear store']) {
    assert.deepEqual(recommendations(name,'Consider access at public events with a portable PA and first aid kit.'), []);
  }
});
