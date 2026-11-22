import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { database } from './d1-fixture.mjs';
import { handleLibrary } from '../worker/library.mjs';

globalThis.crypto ??= webcrypto;

test('private PDFs stay role-scoped, byte-exact, and unavailable before publication', async t => {
  const db = database(t, ['0004_archive.sql']);
  const bytes = Buffer.from('%PDF-1.4\nA synthetic test document.\n%%EOF');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const get = (path, role, method = 'GET') => handleLibrary(new Request('https://club.example/api/library' + path, { method }),
    { DB: db }, role ? { id: 'test', role, accountRole: role } : null);

  await db.batch([bytes.subarray(0, 12), bytes.subarray(12)].map((part, i) =>
    db.prepare('INSERT INTO library_parts VALUES (?, ?, ?)').bind(digest, i, part.toString('base64'))));
  assert.equal((await get('/staged', 'administrator')).status, 404);
  const insert = (id, audience) => db.prepare(`INSERT INTO library_documents
    (id, title, source_date, document_type, status, access_level, digest, byte_length, part_count)
    VALUES (?, ?, '2025-01', 'Minutes', 'Filed copy', ?, ?, ?, 2)`).bind(id, id, audience, digest, bytes.length);
  await db.batch([insert('member-doc', 'member'), insert('committee-doc', 'committee')]);
  assert.equal((await get('', null)).status, 401);
  assert.equal((await get('/committee-doc', 'signed_in')).status, 403);
  const memberList = await (await get('', 'member')).json();
  assert.deepEqual(memberList.documents.map(d => d.id), ['member-doc']);
  assert.equal((await get('/committee-doc', 'member')).status, 404);
  assert.equal((await get('/committee-doc', 'member', 'HEAD')).status, 404);
  for (const role of ['committee', 'administrator', 'treasurer']) {
    assert.equal((await (await get('', role)).json()).documents.length, 2);
    assert.deepEqual((await (await get('?view=member',role)).json()).documents.map(d=>d.id),['member-doc']);
  }
  const read = await get('/member-doc', 'member');
  assert.equal(read.headers.get('Content-Type'), 'application/pdf');
  assert.match(read.headers.get('Cache-Control'), /no-store/);
  assert.match(read.headers.get('Content-Disposition'), /^inline/);
  assert.deepEqual(Buffer.from(await read.arrayBuffer()), bytes);
  const head = await get('/committee-doc?download=1', 'committee', 'HEAD');
  assert.equal(head.status, 200);
  assert.match(head.headers.get('Content-Disposition'), /^attachment/);
  assert.equal(head.headers.get('Content-Length'), String(bytes.length));
  assert.equal(await head.text(), '');
  await insert('constitution-v1-2', 'member').run();
  const publicRead = await handleLibrary(new Request('https://club.example/constitution.pdf'), { DB: db }, null);
  assert.equal(publicRead.status, 200);
  assert.deepEqual(Buffer.from(await publicRead.arrayBuffer()), bytes);
  const publicDownload = await handleLibrary(new Request('https://club.example/constitution.pdf?download=1&id=committee-doc',
    {method:'HEAD'}), { DB: db }, null);
  assert.equal(publicDownload.status, 200);
  assert.match(publicDownload.headers.get('Content-Disposition'), /attachment; filename="plfc-constitution-v1-2.pdf"/);
  assert.equal((await get('/constitution-v1-2', null)).status, 401);
  assert.equal((await get('/member-doc', 'signed_in')).status, 403);
  assert.equal((await handleLibrary(new Request('https://club.example/api/library'), {DB:db},
    {id:'access:example', role:'member'})).status, 403);
  await db.prepare('DELETE FROM library_parts WHERE digest = ? AND part = 0').bind(digest).run();
  assert.equal((await get('/committee-doc', 'committee')).status, 503);
});
