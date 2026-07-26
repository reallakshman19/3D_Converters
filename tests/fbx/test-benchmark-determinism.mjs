import assert from 'node:assert/strict';
import { canonicalBenchmarkEvidenceJson } from '../../tabs/model-converters/converters/fbx/benchmark/evidence-json.js';

const inventory = { schema: 'FbxBenchmarkInventory.v1', ownerSites: [{ ownerSite: 'B', count: 1 }, { ownerSite: 'A', count: 2 }],
  normalizedTypes: [{ type: 'SUPPORT', count: 2 }, { type: 'BRANCH', count: 1 }], rawTypes: [], supportClasses: [],
  duplicateIdentities: [{ indexName: 'z', key: 'b' }, { indexName: 'a', key: 'z' }] };
const reversed = structuredClone(inventory);
for (const key of ['ownerSites', 'normalizedTypes', 'duplicateIdentities']) reversed[key].reverse();
assert.equal(canonicalBenchmarkEvidenceJson(inventory), canonicalBenchmarkEvidenceJson(reversed));
assert.match(canonicalBenchmarkEvidenceJson(inventory), /\n$/);
console.log('test-benchmark-determinism: PASS');
