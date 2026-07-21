import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const base = new URL('../../third_party/ufbx/', import.meta.url);
const provenance = JSON.parse(await readFile(new URL('provenance.json', base), 'utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const source = Buffer.concat([await readFile(new URL('ufbx.c', base)), await readFile(new URL('ufbx.h', base))]);
assert.equal(provenance.upstreamRevision, '729ab835444f5f229e5f7cff332692ce6c00415d');
assert.equal(digest(source), provenance.sourceSha256);
assert.equal(digest(await readFile(new URL('fbx_parser.wasm', base))), provenance.wasmSha256);
assert.match(await readFile(new URL('LICENSE', base), 'utf8'), /MIT License/);
console.log('test-provenance: PASS');
