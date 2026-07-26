import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadFbxBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/benchmark-loader.js';
import { buildFbxBenchmarkInventory } from '../../tabs/model-converters/converters/fbx/benchmark/inventory.js';

const benchmarkPath = 'Benchmarks/fbx BM/StaggedJsonBMforFBX';
const bytes = new Uint8Array(await readFile(new URL(`../../${benchmarkPath}`, import.meta.url)));
const loaded = await loadFbxBenchmark({ bytes, identity: { benchmarkId: 'StaggedJsonBMforFBX',
  repository: 'reallaksh19/3D_Converters', benchmarkCommit: 'ecd841cd41cc7a8df1764cec502e0873f578a5dc',
  benchmarkPath, benchmarkBlobSha: 'e4ce63f180d3bcc3cba0e85137ce9811cef477e9' } });
const inventory = buildFbxBenchmarkInventory(loaded);
assert.deepEqual(inventory.counts, { totalRecords: 536, branches: 37, children: 499, components: 354,
  supports: 145, classifiedSupports: 134, unclassifiedSupports: 11 });
assert.deepEqual(inventory.normalizedTypes, [
  { type: 'BRANCH', count: 37 }, { type: 'ELBO', count: 29 }, { type: 'FLAN', count: 77 },
  { type: 'GASK', count: 88 }, { type: 'INST', count: 17 }, { type: 'OLET', count: 13 },
  { type: 'PIPE', count: 88 }, { type: 'REDU', count: 8 }, { type: 'SUPPORT', count: 145 },
  { type: 'TEE', count: 7 }, { type: 'VALV', count: 27 },
]);
assert.deepEqual(inventory.supportClasses, [
  { supportClass: 'GUIDE', count: 27 }, { supportClass: 'LINESTOP', count: 3 },
  { supportClass: 'REST', count: 104 }, { supportClass: 'UNCLASSIFIED', count: 11 },
]);
assert.deepEqual(inventory.ownerSites, [
  { ownerSite: '/TWGA-1000-CU-PI', count: 34 }, { ownerSite: '/TWGA-1000-CU-PL', count: 3 },
]);
assert.deepEqual(inventory.referenceCounts, { href: 33, tref: 19 });
assert.match(inventory.benchmarkIdentity.contentSha256, /^[0-9a-f]{64}$/);
assert.equal(inventory.parseResult.duplicateJsonKeyCount, 0);
assert.equal(inventory.parseResult.skippedRecordCount, 0);
console.log('test-benchmark-real-inventory: PASS');
