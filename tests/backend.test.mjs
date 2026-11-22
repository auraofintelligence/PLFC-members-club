import test from 'node:test';
import assert from 'node:assert/strict';
import { database } from './d1-fixture.mjs';
import { webcrypto } from 'node:crypto';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { EVENTS, escapeIcs, foldIcsLine, makeCalendar } from '../worker/data.mjs';
import { getIdentity, handleRequest } from '../worker/index.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const HOST = 'https://plfc-clubhouse.example.workers.dev';
const envBase = {
  AUTH_MODE: 'access',
  ACCESS_ISSUER: 'https://club-test.cloudflareaccess.com',
  ACCESS_AUD: 'clubhouse-test',
  MEMBER_EMAILS: 'member@example.test, other@example.test',
  COMMITTEE_EMAILS: 'committee@example.test',
};

// Exercise the actual Access signature and claims checks with a local test issuer.
const { privateKey, publicKey } = await generateKeyPair('RS256');
const key = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256' };
const visitorTokens = new Map();
for (const email of ['member@example.test', 'other@example.test', 'committee@example.test', 'COMMITTEE@example.test', 'new@example.test']) {
  const token = await new SignJWT({ email }).setProtectedHeader({ alg: 'RS256', kid: key.kid })
    .setIssuer(envBase.ACCESS_ISSUER).setAudience(envBase.ACCESS_AUD).setSubject(email.toLowerCase())
    .setIssuedAt().setExpirationTime('1h').sign(privateKey);
  visitorTokens.set(email, token);
}
test.before(() => {
  test.mock.method(globalThis, 'fetch', async url => {
    assert.equal(String(url), envBase.ACCESS_ISSUER + '/cdn-cgi/access/certs');
    return Response.json({ keys: [key] });
  });
});
test.after(() => test.mock.restoreAll());

function req(path, { email, method = 'GET', body, origin = HOST, headers = {}, host = HOST } = {}) {
  const requestHeaders = new Headers(headers);
  if (email && !requestHeaders.has('cf-access-jwt-assertion')) {
    requestHeaders.set('cf-access-jwt-assertion', visitorTokens.get(email));
  }
  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    requestHeaders.set('Origin', origin);
  }
  return new Request(`${host}${path}`, { method, headers: requestHeaders, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function verifiedCatchDatabase(t) {
  const db=database(t);
  for(const file of ['0008_member_lifecycle.sql','0010_applications.sql','0025_member_network.sql','0028_member_safeguards.sql']) db.migrate(file);
  for(const email of ['member@example.test','other@example.test']) {
    const id='access:'+email;
    await db.batch([db.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,'member','x','y',0,'2099-01-01')").bind(id,email),
      db.prepare("INSERT INTO member_age_checks VALUES(?,'16+',0,1,'2026-11-21','fixture-officer')").bind(id)]);
  }
  return db;
}

test('calendar represents the one-off Sunday meeting at 10 am Brisbane time', () => {
  assert.equal(EVENTS.length, 1);
  assert.equal(EVENTS[0].startsAt, '2026-11-22T00:00:00.000Z');
  const calendar = makeCalendar();
  assert.match(calendar, /DTSTART:20261122T000000Z\r\n/);
  assert.match(calendar, /UID:hotel-meeting-2026-11-22@pointlookoutfishingclub.com/);
  assert.doesNotMatch(calendar, /RRULE/);
  assert.equal(calendar.replace(/\r\n/g, '').includes('\n'), false);
});

test('ICS escaping blocks extra properties and folding preserves UTF-8 text', () => {
  assert.equal(escapeIcs('a,b;c\\d\r\nATTENDEE:someone'), 'a\\,b\\;c\\\\d\\nATTENDEE:someone');
  const original = `DESCRIPTION:${'🎣 café '.repeat(35)}`;
  const folded = foldIcsLine(original);
  for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(folded.replace(/\r\n /g, ''), original);
});

test('local meets lead the programme and only scheduled events enter the calendar', async () => {
  const response = await handleRequest(req('/calendar.ics'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/calendar/);
  const calendar = (await response.text()).replace(/\r\n /g, '');
  assert.equal(calendar.match(/BEGIN:VEVENT/g)?.length, 1);
  assert.match(calendar, /The finish time is an estimate\./);
  assert.equal((await handleRequest(req('/calendar/missing.ics'))).status, 404);
  const club = await (await handleRequest(req('/api/club'))).json();
  assert.deepEqual(club.programme.map(({ id, status }) => [id, status]), [
    ['local-meets', 'undated'],
    ['interclub-invitationals', 'undated'],
    ['larger-competition', 'proposal'],
  ]);
  for (const item of club.programme) {
    assert.equal(item.date, null);
    assert.ok(!calendar.includes(`UID:${item.id}@`));
  }
  assert.equal(club.competition.date, null);
  assert.equal(club.competition.prizesConfirmed, false);
});

test('unsigned visitor headers cannot authorize an account on any host', async () => {
  for (const host of ['http://localhost:4173', 'https://example.workers.dev', 'https://pointlookoutfishingclub.com']) {
    const identity = await getIdentity(req('/api/session', { host, headers: { 'Cf-Access-Authenticated-User-Email': 'committee@example.test' } }), envBase);
    assert.equal(identity, null);
  }
  assert.equal(await getIdentity(req('/api/session', { email: 'committee@example.test' }), {}), null);
});

test('roles require server-side allowlists and ignore browser supplied roles', async () => {
  const identity = await getIdentity(req('/api/session', { email: 'new@example.test', headers: { 'x-role': 'committee' } }), envBase);
  assert.equal(identity.role, 'signed_in');
  const mixedCase = await getIdentity(req('/api/session', { email: 'COMMITTEE@example.test' }), envBase);
  assert.equal(mixedCase.role, 'committee');
  assert.equal((await handleRequest(req('/api/meeting', { email: 'new@example.test' }), envBase)).status, 403);
});

test('unverified Access tokens and identity headers cannot grant private access', async () => {
  const response = await handleRequest(req('/api/catches', { headers: { 'cf-access-jwt-assertion': 'invalid.token.data' } }), envBase);
  assert.equal(response.status, 401);
  const otherApp = await handleRequest(req('/api/catches', { email: 'member@example.test' }), { ...envBase, ACCESS_AUD: 'another-app' });
  assert.equal(otherApp.status, 401);
});

test('public demo opens anonymously and keeps private services closed', async () => {
  const result = await handleRequest(req('/api/session'));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {
    authenticated: false, identity: null, role: 'anonymous', accountRole:null,administrator:false, canManageStock:false, paidThrough:null, storageReady: false, authMode: 'unconfigured', signInUrl: null,
  });
  for (const path of ['/api/catches', '/api/meeting', '/api/audit']) {
    assert.equal((await handleRequest(req(path))).status, 401);
  }
});

test('all private services reject anonymous and unapproved accounts', async () => {
  for (const path of ['/api/catches', '/api/meeting', '/api/audit']) {
    const anonymous = await handleRequest(req(path), envBase);
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get('cache-control'), 'no-store');
    assert.equal((await handleRequest(req(path, { email: 'new@example.test' }), envBase)).status, 403);
  }
});

test('session reports real storage readiness and missing storage fails clearly', async t => {
  const withoutStorage = await (await handleRequest(req('/api/session', { email: 'member@example.test' }), envBase)).json();
  assert.equal(withoutStorage.storageReady, false);
  assert.equal(withoutStorage.role, 'member');
  assert.equal((await handleRequest(req('/api/catches', { email: 'member@example.test' }), envBase)).status, 503);
  const DB = database(t);
  const session = await (await handleRequest(req('/api/session', { email: 'member@example.test' }), { ...envBase, DB })).json();
  assert.equal(session.storageReady, true);
});

test('catches persist per owner and audit records contain metadata only', async t => {
  const DB = await verifiedCatchDatabase(t);
  const env = { ...envBase, DB };
  const saved = await handleRequest(req('/api/catches', { email: 'member@example.test', method: 'POST', body: { species: 'Bream', lengthCm: 31.5, date: '2026-11-20', location: 'Amity', notes: 'A personal catch note' } }), env);
  assert.equal(saved.status, 201);
  const { catch: record } = await saved.json();
  assert.equal(record.species, 'Bream');
  const own = await (await handleRequest(req('/api/catches', { email: 'member@example.test' }), env)).json();
  assert.equal(own.catches.length, 1);
  assert.equal(own.catches[0].id, record.id);
  const other = await (await handleRequest(req('/api/catches', { email: 'other@example.test' }), env)).json();
  assert.equal(other.catches.length, 0);
  const audit = await (await handleRequest(req('/api/audit', { email: 'committee@example.test' }), env)).json();
  assert.equal(audit.audit.length, 1);
  assert.equal(audit.audit[0].action, 'catch_created');
  assert.equal(audit.audit[0].entityId, record.id);
  assert.doesNotMatch(JSON.stringify(audit), /A personal catch note|Bream/);
  assert.equal((await handleRequest(req('/api/audit', { email: 'member@example.test' }), env)).status, 403);
});

test('writes reject cross-origin requests, oversized forms and invalid catch fields', async t => {
  const DB = await verifiedCatchDatabase(t);
  const env = { ...envBase, DB };
  const valid = { species: 'Bream', date: '2026-11-20', lengthCm: 30 };
  assert.equal((await handleRequest(req('/api/catches', { email: 'member@example.test', method: 'POST', origin: 'https://other.test', body: valid }), env)).status, 403);
  for (const body of [{ ...valid, date: '2026-02-30' }, { ...valid, lengthCm: -1 }, { ...valid, lengthCm: '30' }, { ...valid, ownerId: 'someone-else' }, { ...valid, role: 'committee' }]) {
    assert.equal((await handleRequest(req('/api/catches', { email: 'member@example.test', method: 'POST', body }), env)).status, 400);
  }
  assert.equal((await handleRequest(req('/api/catches', { email: 'member@example.test', method: 'POST', body: { ...valid, notes: 'x'.repeat(33000) } }), env)).status, 413);
  const malformed = req('/api/catches', { email: 'member@example.test', method: 'POST', body: valid });
  malformed.headers.set('Content-Type', 'text/plain');
  assert.equal((await handleRequest(malformed, env)).status, 415);
  const audit = await DB.prepare('SELECT * FROM audit_log').all();
  assert.equal(audit.results.length, 0);
});

test('meeting updates detect stale drafts and only successful saves create audit records', async t => {
  const DB = database(t);
  const env = { ...envBase, DB };
  const initial = await (await handleRequest(req('/api/meeting', { email: 'committee@example.test' }), env)).json();
  assert.equal(initial.meeting.version, 0);
  assert.equal(initial.meeting.notes, '');
  const payload = { notes: 'A private draft', actions: [{ id: 'hotel-chat', text: 'Prepare the meeting', owner: 'Secretary', dueDate: '2026-11-22', done: false }], version: 0 };
  const invalidVersion = await handleRequest(req('/api/meeting', { email: 'committee@example.test', method: 'PUT', body: { ...payload, version: 4 } }), env);
  assert.equal(invalidVersion.status, 409);
  const first = await handleRequest(req('/api/meeting', { email: 'committee@example.test', method: 'PUT', body: payload }), env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).meeting.version, 1);
  const stale = await handleRequest(req('/api/meeting', { email: 'committee@example.test', method: 'PUT', body: payload }), env);
  assert.equal(stale.status, 409);
  const second = await handleRequest(req('/api/meeting', { email: 'committee@example.test', method: 'PUT', body: { ...payload, notes: 'Updated private draft', version: 1 } }), env);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).meeting.version, 2);
  const stored = await (await handleRequest(req('/api/meeting', { email: 'committee@example.test' }), env)).json();
  assert.equal(stored.meeting.notes, 'Updated private draft');
  const audit = await (await handleRequest(req('/api/audit', { email: 'committee@example.test' }), env)).json();
  assert.equal(audit.audit.length, 2);
  assert.ok(audit.audit.every(entry => entry.action === 'meeting_updated'));
  assert.doesNotMatch(JSON.stringify(audit), /private draft|Prepare the meeting/);
});

test('a failed audit insert rolls back the associated catch', async t => {
  const DB = await verifiedCatchDatabase(t);
  await DB.prepare('DROP TABLE audit_log').run();
  const response = await handleRequest(req('/api/catches', { email: 'member@example.test', method: 'POST', body: { species: 'Bream', lengthCm: 31, date: '2026-11-20' } }), { ...envBase, DB });
  assert.equal(response.status, 503);
  const catches = await DB.prepare('SELECT id FROM catches').all();
  assert.equal(catches.results.length, 0);
});

test('fishing API validates calendar dates and location keys', async () => {
  const good = await handleRequest(req('/api/fishing?date=2026-11-22&location=point-lookout'));
  assert.equal(good.status, 200);
  const fishing = await good.json();
  assert.equal(fishing.timezone, 'Australia/Brisbane');
  assert.equal(fishing.date, '2026-11-22');
  assert.equal((await handleRequest(req('/api/fishing?date=2026-02-30'))).status, 400);
  assert.equal((await handleRequest(req('/api/fishing?date=2026-11-22&location=unknown'))).status, 400);
});

test('sensitive service errors do not reveal database details', async () => {
  const DB = { prepare() { throw new Error('secret database internal details'); } };
  const response = await handleRequest(req('/api/catches', { email: 'member@example.test' }), { ...envBase, DB });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret database/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self';/);
});
