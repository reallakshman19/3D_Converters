import assert from 'node:assert/strict';
import { canonicalBenchmarkEvidenceJson } from '../../tabs/model-converters/converters/fbx/benchmark/evidence-json.js';

const inventory = {
  schema: 'FbxBenchmarkInventory.v1',
  ownerSites: [{ ownerSite: 'B', count: 1 }, { ownerSite: 'A', count: 2 }],
  outerTypes: [{ outerType: 'SUPPORT', count: 2 }, { outerType: 'BRANCH', count: 1 }],
  attributeTypes: [{ attributeType: 'ATTA', count: 2 }],
  attributeRawTypes: [],
  rawSupportObservations: {
    supportKinds: [{ value: 'REST', count: 1 }, { value: 'GUIDE', count: 1 }],
    supportMapperKinds: [],
    supportTypes: [],
  },
  duplicateIdentities: [{ indexName: 'z', key: 'b' }, { indexName: 'a', key: 'z' }],
};
const reversed = structuredClone(inventory);
for (const key of ['ownerSites', 'outerTypes', 'attributeTypes', 'duplicateIdentities']) reversed[key].reverse();
reversed.rawSupportObservations.supportKinds.reverse();
assert.equal(canonicalBenchmarkEvidenceJson(inventory), canonicalBenchmarkEvidenceJson(reversed));
assert.match(canonicalBenchmarkEvidenceJson(inventory), /\n$/);
console.log('test-benchmark-determinism: PASS');
