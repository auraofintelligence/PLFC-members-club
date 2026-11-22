import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fieldSpecies,fieldSpeciesCard} from '../public/field-species.js';
import {catchSpecies} from '../public/catch-species.mjs';
import {FISH_PHOTOS} from '../public/fish-photos.js';

test('all competition and ID-only species use the same catalog and have a real specimen photo or a direct museum reference',()=>{
  assert.equal(new Set(fieldSpecies.map(s=>s.id)).size,fieldSpecies.length);
  for(const id of ['bull-shark','longtail-tuna','red-emperor','australian-cownose-ray'])assert.ok(fieldSpecies.some(s=>s.id===id),id);
  assert.deepEqual(fieldSpecies.map(s=>s.id),catchSpecies.map(s=>s.id));
  for(const s of fieldSpecies){
    assert.ok(s.scientificName,s.name);
    assert.ok(s.photo && s.family,s.name);
    if(s.photo){
      const photo=readFileSync(new URL('../public'+s.photo.src,import.meta.url));
      const jpg=photo[0]===255&&photo[1]===216,webp=photo.toString('ascii',8,12)==='WEBP';
      assert.ok(jpg||webp,s.name);assert.ok(s.photo.credit&&s.photo.license&&s.photo.sourceUrl,s.name);
    }
    if(!FISH_PHOTOS[s.id]){
      assert.match(s.reference,/^https:\/\//);
      const card=fieldSpeciesCard(s);assert.ok(card.includes(s.reference.replaceAll('&','&amp;')),s.name);
      assert.ok(card.includes(s.eligible?'Club honours species':'Protected · Identification only'),s.name);
      if(!s.photo)assert.ok(!card.includes('<img'),s.name);
    }
  }
  const ray=fieldSpecies.find(s=>s.id==='eastern-shovelnose-ray');
  assert.ok(ray.photo);assert.match(ray.scientificName,/Aptychotrema rostrata/);assert.match(fieldSpeciesCard(ray),/#guide\/sharks/);
});
