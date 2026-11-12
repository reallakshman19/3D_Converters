#!/usr/bin/env node
// Create a card folder from the template:
//   node prototypes/_kit/new-card.mjs <card-id> "<title>" [--prefix CODEPREFIX]
// e.g. node prototypes/_kit/new-card.mjs p02-cii-edit-kernel "CII edit kernel" --prefix KERNEL
// Copies prototypes/_template -> prototypes/<card-id>, fills placeholders, and copies the kit
// runtime (core.mjs, node.mjs, BENCHMARKS.json) into <card-id>/kit/ with a hash manifest.
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const KIT = dirname(fileURLToPath(import.meta.url));
const PROTOS = resolve(KIT, '..');
const SHARED = resolve(PROTOS, '..', 'shared', 'topofix-formats');
export const KIT_RUNTIME = ['core.mjs', 'node.mjs', 'cii14.mjs'];

const [id, title, ...rest] = process.argv.slice(2);
const pi = rest.indexOf('--prefix');
if (!id || !/^p\d{2}-[a-z0-9-]+$/.test(id) || !title) {
  console.error('usage: node prototypes/_kit/new-card.mjs <pNN-short-name> "<title>" [--prefix CODEPREFIX]');
  process.exit(2);
}
const prefix = (pi >= 0 ? rest[pi + 1] : id.split('-')[1]).toUpperCase().replace(/[^A-Z0-9]/g, '');
const dest = join(PROTOS, id);
if (existsSync(dest)) { console.error('refused: ' + dest + ' already exists'); process.exit(1); }

cpSync(join(PROTOS, '_template'), dest, { recursive: true });
const fill = dir => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { fill(p); continue; }
    if (!/\.(md|mjs|js|json|html)$/.test(name)) continue;
    const t = readFileSync(p, 'utf8');
    const u = t.replaceAll('__CARD_ID__', id).replaceAll('__CARD_TITLE__', title).replaceAll('__CARD_PREFIX__', prefix);
    if (u !== t) writeFileSync(p, u);
  }
};
fill(dest);

const kitDest = join(dest, 'kit');
mkdirSync(kitDest, { recursive: true });
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const manifest = {};
for (const f of KIT_RUNTIME) { copyFileSync(join(KIT, f), join(kitDest, f)); manifest[f] = sha(join(kitDest, f)); }
copyFileSync(join(SHARED, 'BENCHMARKS.json'), join(kitDest, 'BENCHMARKS.json'));
manifest['BENCHMARKS.json'] = sha(join(kitDest, 'BENCHMARKS.json'));
writeFileSync(join(kitDest, 'KIT.sha256.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('created ' + dest + ' (refusal prefix ' + prefix + '_). Next: paste your card into CARD.md, then run node prototypes/_kit/card-check.mjs prototypes/' + id);
