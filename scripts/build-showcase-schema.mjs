import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadDemoSchema} from './demo-schema.mjs';

// Start with the reviewed fictional records, then add all later schema changes.
// The live historical stock import is intentionally excluded.
const migrations=(await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>/^\d{4}_.*\.sql$/.test(name)&&Number(name.slice(0,4))>=14).sort();
const later=await Promise.all(migrations.map(name=>readFile(new URL('../drizzle/'+name,import.meta.url),'utf8')));
await mkdir(new URL('../.local/',import.meta.url),{recursive:true});
await writeFile(new URL('../.local/showcase-schema.sql',import.meta.url),[await loadDemoSchema(),...later].join('\n'));
console.log('Prepared the separate demonstration database schema and fictional examples.');
