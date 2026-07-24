import assert from 'node:assert/strict';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import {
  CAPABILITY_STATUS_VOCABULARY, FBX_FEATURE_CAPABILITY_REGISTRY,
  FEATURE_LIMITATIONS, getFeatureCapability, validateFeatureCapabilityRegistry,
} from '../../tabs/model-converters/converters/fbx/feature-capability-registry.js';

const registry = FBX_FEATURE_CAPABILITY_REGISTRY;
assert.equal(registry.schema, 'FbxFeatureCapabilityRegistry.v1');
assert.equal(registry.registryVersion, '1.0.0');
assert.deepEqual(registry.statusVocabulary, CAPABILITY_STATUS_VOCABULARY);
assert.equal(registry.entries.length, 27);
assert.deepEqual(registry.entries.map((item) => item.featureId), [...registry.entries.map((item) => item.featureId)].sort());
assert.equal(Object.isFrozen(registry), true);
assert.equal(Object.isFrozen(registry.entries), true);
assert.equal(Object.isFrozen(registry.entries[0]), true);
assert.match(canonicalJson(registry), /FbxFeatureCapabilityRegistry\.v1/);

assert.deepEqual(getFeatureCapability('mesh-points'), {
  featureId: 'mesh-points', evidenceStatus: 'supported', renderStatus: 'blocked-missing-data',
  exportStatus: 'blocked-missing-data', engineeringMappingStatus: 'supported',
  limitations: ['EXPLICIT_GOVERNED_MAPPING_REQUIRED', 'MESH_TOPOLOGY_NOT_RETAINED', 'TRANSFERABLE_GEOMETRY_ABSENT'],
  futureWorkPack: 'FBX-RUNTIME-003',
});
assert.equal(getFeatureCapability('unknown-elements').evidenceStatus, 'unknown');
assert.ok(FEATURE_LIMITATIONS.includes('GENERAL_MODEL_EXPORTER_ABSENT'));
assert.throws(() => getFeatureCapability('missing'), /Unknown FBX feature/);

function mutable() { return structuredClone(registry); }
for (const mutate of [
  (value) => { value.extra = true; },
  (value) => { value.registryVersion = 'v1'; },
  (value) => { value.statusVocabulary.reverse(); },
  (value) => { value.entries[0].extra = true; },
  (value) => { value.entries[0].featureId = 'wrong'; },
  (value) => { value.entries[0].evidenceStatus = 'requires-governed-mapping'; },
  (value) => { value.entries[0].renderStatus = 'unknown'; },
  (value) => { value.entries[0].limitations = ['UNKNOWN_LIMITATION']; },
  (value) => { value.entries[0].futureWorkPack = 'FUTURE'; },
  (value) => { value.entries.pop(); },
]) {
  const value = mutable(); mutate(value); assert.throws(() => validateFeatureCapabilityRegistry(value));
}

console.log('test-feature-capability-registry: PASS');
