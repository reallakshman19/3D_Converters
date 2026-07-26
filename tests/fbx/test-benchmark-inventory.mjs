import assert from 'node:assert/strict';
import { loadFbxBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/benchmark-loader.js';
import { buildFbxBenchmarkInventory } from '../../tabs/model-converters/converters/fbx/benchmark/inventory.js';
import { buildFbxBenchmarkIndexes } from '../../tabs/model-converters/converters/fbx/benchmark/semantic-indexes.js';

const fixture = [{ name: '/A/B1', type: 'BRANCH', attributes: { NAME: '/A/B1', OWNER: '/A', OWNER_SITE: '/SITE',
  HREF: '/BOUNDARY', HPOS: { x: 0, y: 1, z: 2 }, TPOS: { x: 3, y: 4, z: 5 } }, children: [
  { name: 'PIPE AUTO', type: 'PIPE', attributes: { APOS: { x: 0, y: 1, z: 2 }, LPOS: { x: 3, y: 4, z: 5 } } },
  { name: 'SUPPORT S1', type: 'SUPPORT', attributes: { TYPE: 'ATTA', RAW_TYPE: 'RAW_ATTA', SUPPORT_TAG: 'S1',
    SUPPORT_KIND: 'REST', SUPPORT_MAPPER_KIND: 'MAPPED_REST', SUPPORT_TYPE: 'CLAMP', OWNER: '/A/B1' } },
  { name: 'SUPPORT S1', type: 'SUPPORT', attributes: { TYPE: 'ATTA', SUPPORT_TAG: 'S1', OWNER: '/A/B1' } },
] }];
const bytes = new TextEncoder().encode(JSON.stringify(fixture));
const loaded = await loadFbxBenchmark({ bytes });
const inventory = buildFbxBenchmarkInventory(loaded);
const indexes = buildFbxBenchmarkIndexes(loaded);

assert.deepEqual(inventory.counts, { totalRecords: 4, branches: 1, children: 3,
  supportOccurrences: 2, nonSupportOccurrences: 1 });
assert.deepEqual(inventory.outerTypes, [
  { outerType: 'BRANCH', count: 1 }, { outerType: 'PIPE', count: 1 }, { outerType: 'SUPPORT', count: 2 },
]);
assert.deepEqual(inventory.attributeTypes, [{ attributeType: 'ATTA', count: 2 }]);
assert.deepEqual(inventory.attributeRawTypes, [{ attributeRawType: 'RAW_ATTA', count: 1 }]);
assert.deepEqual(inventory.rawSupportObservations, {
  supportKinds: [{ value: 'REST', count: 1 }],
  supportMapperKinds: [{ value: 'MAPPED_REST', count: 1 }],
  supportTypes: [{ value: 'CLAMP', count: 1 }],
});
assert.deepEqual(inventory.rawSupportObservationCoverage, {
  supportKind: { observed: 1, missing: 1 },
  supportMapperKind: { observed: 1, missing: 1 },
  supportType: { observed: 1, missing: 1 },
});
assert.equal(indexes.occurrenceById['branch:0/child:1'][0], loaded.occurrences[2]);
assert.equal(indexes.supportByObservedKind.REST[0], loaded.occurrences[2]);
assert.equal(indexes.supportByObservedMapperKind.MAPPED_REST[0], loaded.occurrences[2]);
assert.equal(indexes.supportByObservedType.CLAMP[0], loaded.occurrences[2]);
assert.ok(Object.isFrozen(loaded.occurrences));
assert.ok(Object.isFrozen(indexes));
assert.ok(inventory.duplicateIdentities.some((item) => item.indexName === 'supportByTag' && item.key === 'S1'));
assert.deepEqual(inventory.coordinateExtents, { minimum: { x: 0, y: 1, z: 2 }, maximum: { x: 3, y: 4, z: 5 } });
assert.ok(!('supportClasses' in inventory));
assert.ok(!('classifiedSupports' in inventory.counts));
console.log('test-benchmark-inventory: PASS');
