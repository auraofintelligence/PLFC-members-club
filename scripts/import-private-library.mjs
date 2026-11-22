import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values: options } = parseArgs({ options: {
  remote: { type: 'boolean' }, wrangler: { type: 'string' }, 'account-id': { type: 'string' }, 'member-editions': { type: 'boolean' },
  'club-dir': { type: 'string' }, 'downloads-dir': { type: 'string' },
} });
const club = options['club-dir'] ?? join(homedir(), 'Documents', 'Fishing Club');
const downloads = options['downloads-dir'] ?? join(homedir(), 'Downloads');
const minutes = join(club, 'Minutes');
const items = [
  ['constitution-v1-2', 'Club constitution, version 1.2', '2025-01', 'Constitution', 'Review copy. Adoption has yet to be verified.', 'member',
    join(club, 'Point Lookout Fishing Club (Constitution V1.2).pdf'), '1acbe9aa42229b3ea8dec6dee74a594be2441a081534f4b3ca834433deabb9c1'],
  ['minutes-2024-10-01', 'Meeting minutes', '2024-10-01', 'Minutes', 'Filed copy', 'committee',
    join(minutes, 'PLFC Minutes 1st October 2024.pdf'), 'fd71a43c85f5005dfc74cfc1a27891083a0d4bdc1e3fd5780379bf91328a5b8b'],
  ['minutes-2025-04-10', 'Meeting minutes', '2025-04-10', 'Minutes', 'Filed as double-signed', 'committee',
    join(minutes, 'PLFC Minutes 2025 04 10 Dbl-Sig (1).pdf'), 'ec182d766632effaf6ab28af58b3b056b3837163cc19636b2f4572f4f267c2e2'],
  ['minutes-2025-06-28', 'Meeting minutes', '2025-06-28', 'Minutes', 'Filed as double-signed', 'committee',
    join(minutes, 'PLFC Minutes 2025 06 28 Dbl-Sig (1).pdf'), '86161a074a4b1666414c798a53541d26d725923231d6a8b929e7ae7a69600f63'],
  ['minutes-2025-07-16', 'Meeting minutes', '2025-07-16', 'Minutes', 'Filed as double-signed', 'committee',
    join(minutes, 'PLFC Minutes 2025 07 16 Dbl-Sig (2).pdf'), '69df0573de644aeb91fdc9a92da68eb30128ecf8b233547ca8115b0e25bd419e'],
  ['report-2025-11-05', 'Secretary report and retrospective', '2025-11-05', 'Report', 'Filed as double-signed', 'committee',
    join(downloads, 'PLFC Minutes Oct-Nov 2025  Dbl-Sig.pdf'), '4607a36ff76d24dd305dd9a797ad3826d2120553100efcb49a4e97e1aaad25e4'],
  ['minutes-2026-03-10', 'Committee meeting minutes', '2026-03-10', 'Minutes', 'Filed copy', 'committee',
    join(downloads, 'PLFC Minutes 10 March 2026.pdf'), 'a7b5e6c0e88a7c54bc622728d8a5a69454c3b189ffc22201a2ba163c07d76ef9'],
];

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const documents = [];
let selected = items;
if (options['member-editions']) {
  const folder = fileURLToPath(new URL('../.local/member-library/', import.meta.url));
  const editions = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8'));
  selected = editions.map(edition => {
    const original = items.find(record => record[0] === edition.originalId);
    if (!original || original[5] !== 'committee' || edition.date !== original[2] ||
        edition.id !== 'member-' + edition.originalId + '-v1' || !/^[a-f0-9]{64}$/.test(edition.sha256)) {
      throw new Error('Unexpected member edition or source reference.');
    }
    return [edition.id, edition.title, edition.date, edition.type, 'Member edition of filed record', 'member',
      join(folder, edition.id + '.pdf'), edition.sha256];
  });
}
for (const [id, title, date, type, status, audience, path, digest] of selected) {
  const data = await readFile(path);
  if (data.length > 1000000 || data.subarray(0, 5).toString() !== '%PDF-' || hash(data) !== digest) {
    throw new Error(`The file for ${id} does not match the reviewed PDF.`);
  }
  documents.push({ id, title, date, type, status, audience, digest, data });
}

if (!options.remote) {
  console.log(`Checked ${documents.length} source PDFs (${documents.reduce((n, doc) => n + doc.data.length, 0)} bytes). Local check complete.`);
} else {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  const target = config.d1_databases.find(item => item.binding === 'DB' && item.database_name === 'plfc-clubhouse');
  if (!/^[a-f0-9-]{36}$/.test(target?.database_id) || !/^[a-f0-9]{32}$/.test(options['account-id'])) {
    throw new Error('Supply the Cloudflare account ID and configure the clubhouse D1 binding before importing.');
  }
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    if (!options.wrangler) throw new Error('Supply --wrangler with the path to the signed-in Wrangler CLI.');
    const auth = execFileSync(process.execPath, [options.wrangler, 'auth', 'token', '--json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
    });
    token = JSON.parse(auth).token;
  }
  if (!token) throw new Error('Sign in to the designated Cloudflare account before importing.');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${options['account-id']}/d1/database/${target.database_id}/query`;
  async function query(sql, params) {
    const response = await fetch(endpoint, { method: 'POST', headers: {
      Authorization: 'Bearer ' + token, 'Content-Type': 'application/json',
    }, body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(60000) });
    const result = await response.json();
    if (!response.ok || !result.success || !result.result?.[0]?.success) {
      throw new Error(`Clubhouse D1 request failed (HTTP ${response.status}, code ${result.errors?.[0]?.code ?? 'unknown'}). Document data was not logged.`);
    }
    return result.result[0].results;
  }
  for (const { id, title, date, type, status, audience, digest, data } of documents) {
    const existing = await query('SELECT digest FROM library_documents WHERE id = ?', [id]);
    if (existing.length && existing[0].digest !== digest) {
      throw new Error(`The library already has a different revision at ${id}. Use a separate version identifier.`);
    }
    const chunkSize = 32768;
    const parts = Array.from({ length: Math.ceil(data.length / chunkSize) }, (_, part) =>
      [digest, part, data.subarray(part * chunkSize, (part + 1) * chunkSize).toString('base64')]);
    if (!existing.length) {
      for (let n = 0; n < parts.length; n += 5) {
        const group = parts.slice(n, n + 5);
        await query(`INSERT INTO library_parts (digest, part, encoded) VALUES ${group.map(() => '(?, ?, ?)').join(', ')}
          ON CONFLICT(digest, part) DO UPDATE SET encoded = excluded.encoded WHERE encoded != excluded.encoded`, group.flat());
      }
    }
    const stored = await query('SELECT part, encoded FROM library_parts WHERE digest = ? ORDER BY part', [digest]);
    if (stored.length !== parts.length || stored.some((row, i) => row.part !== i) ||
        hash(Buffer.concat(stored.map(row => Buffer.from(row.encoded, 'base64')))) !== digest) {
      throw new Error(`The remote bytes did not verify for ${id}.`);
    }
    // Staged chunks are unreachable until their complete bytes have been verified.
    await query(`INSERT INTO library_documents
      (id, title, source_date, document_type, status, access_level, digest, byte_length, part_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`, [id, title, date, type, status, audience, digest, data.length, parts.length]);
    const final = await query('SELECT digest, access_level, byte_length FROM library_documents WHERE id = ?', [id]);
    if (final[0]?.digest !== digest || final[0]?.access_level !== audience || final[0]?.byte_length !== data.length) {
      throw new Error(`Remote library metadata verification failed for ${id}.`);
    }
    console.log(`Verified ${id} (${data.length} bytes, ${audience} access).`);
  }
  console.log(`Verified ${documents.length} private library PDFs in the clubhouse database.`);
}
