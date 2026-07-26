import assert from 'node:assert/strict';
import { loadFbxBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/benchmark-loader.js';
import { buildFbxBenchmarkInventory } from '../../tabs/model-converters/converters/fbx/benchmark/inventory.js';

const fixture = [{ name: '/A/B1', type: 'BRANCH', attributes: { NAME: '/A/B1', OWNER: '/A', OWNER_SITE: '/SITE',
  HREF: '/BOUNDARY', HPOS: { x: 0, y: 1, z: 2 }, TPOS: { x: 3, y: 4, z: 5 } }, children: [
  { name: 'PIPE AUTO', type: 'PIPE', attributes: { APOS: { x: 0, y: 1, z: 2 }, LPOS: { x: 3, y: 4, z: 5 } } },
  { name: 'SUPPORT S1', type: 'SUPPORT', attributes: { TYPE: 'ATTA', SUPPORT_TAG: 'S1', SUPPORT_KIND: 'REST', OWNER: '/A/B1' } },
  { name: 'SUPPORT S1', type: 'SUPPORT', attributes: { TYPE: 'ATTA', SUPPORT_TAG: 'S1', OWNER: '/A/B1' } },
] }];
const bytes = new TextEncoder().encode(JSON.stringify(fixture));
const loaded = await loadFbxBenchmark({ bytes });
const inventory = buildFbxBenchmarkInventory(loaded);
assert.deepEqual(inventory.counts, { totalRecords: 4, branches: 1, children: 3, components: 1, supports: 2,
  classifiedSupports: 1, unclassifiedSupports: 1 });
assert.deepEqual(inventory.ownerSites, [{ ownerSite: '/SITE', count: 1 }]);
assert.deepEqual(inventory.supportClasses, [{ supportClass: 'REST', count: 1 }, { supportClass: 'UNCLASSIFIED', count: 1 }]);
assert.ok(inventory.duplicateIdentities.some((item) => item.indexName === 'supportByTag' && item.key === 'S1'));
assert.deepEqual(inventory.coordinateExtents, { minimum: { x: 0, y: 1, z: 2 }, maximum: { x: 3, y: 4, z: 5 } });
console.log('test-benchmark-inventory: PASS');
