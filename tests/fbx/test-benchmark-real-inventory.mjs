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
assert.deepEqual(inventory.counts, { totalRecords: 536, branches: 37, children: 499,
  supportOccurrences: 145, nonSupportOccurrences: 354 });
assert.deepEqual(inventory.outerTypes, [
  { outerType: 'BRANCH', count: 37 }, { outerType: 'ELBO', count: 29 }, { outerType: 'FLAN', count: 77 },
  { outerType: 'GASK', count: 88 }, { outerType: 'INST', count: 17 }, { outerType: 'OLET', count: 13 },
  { outerType: 'PIPE', count: 88 }, { outerType: 'REDU', count: 8 }, { outerType: 'SUPPORT', count: 145 },
  { outerType: 'TEE', count: 7 }, { outerType: 'VALV', count: 27 },
]);
assert.deepEqual(inventory.rawSupportObservations.supportKinds, [
  { value: 'GUIDE', count: 27 }, { value: 'LINESTOP', count: 3 }, { value: 'REST', count: 104 },
]);
assert.deepEqual(inventory.rawSupportObservationCoverage.supportKind, { observed: 134, missing: 11 });
for (const field of ['supportMapperKind', 'supportType']) {
  const coverage = inventory.rawSupportObservationCoverage[field];
  assert.equal(coverage.observed + coverage.missing, 145);
}
assert.deepEqual(inventory.ownerSites, [
  { ownerSite: '/TWGA-1000-CU-PI', count: 34 }, { ownerSite: '/TWGA-1000-CU-PL', count: 3 },
]);
assert.deepEqual(inventory.referenceCounts, { href: 33, tref: 19 });
assert.match(inventory.benchmarkIdentity.contentSha256, /^[0-9a-f]{64}$/);
assert.equal(inventory.parseResult.duplicateJsonKeyCount, 0);
assert.equal(inventory.parseResult.skippedRecordCount, 0);
assert.ok(!('supportClasses' in inventory));
assert.ok(!('classifiedSupports' in inventory.counts));
console.log('test-benchmark-real-inventory: PASS');
