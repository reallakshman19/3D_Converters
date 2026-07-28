import assert from 'node:assert/strict';
import { buildLiveZonePackageInputs } from '../../tabs/model-converters/converters/fbx/zone-package/live-input.js';
import {
  buildSelectedZonePackage, validateSelectedZonePackage,
} from '../../tabs/model-converters/converters/fbx/zone-package/package-builder.js';
import { sourceIdentityFixture, COMPLETE_SOURCE_GRAPH_SHA256 } from './zone-package-fixtures.mjs';

function float64Bytes(values) {
  const bytes = new Uint8Array(values.length * 8), view = new DataView(bytes.buffer);
  values.forEach((value, index) => view.setFloat64(index * 8, value, true));
  return bytes;
}
function uint32Bytes(values) {
  const bytes = new Uint8Array(values.length * 4), view = new DataView(bytes.buffer);
  values.forEach((value, index) => view.setUint32(index * 4, value, true));
  return bytes;
}
function selectedBuffer(role, scalarType, values) {
  const bytes = scalarType === 'Float64' ? float64Bytes(values) : uint32Bytes(values);
  return { role, descriptor: { scalarType }, buffer: { bytes } };
}

const geometryId = '10';
const inputs = await buildLiveZonePackageInputs({
  zoneGeometryEvidence: {
    sourceGraphSha256: COMPLETE_SOURCE_GRAPH_SHA256,
    sourceIdentity: sourceIdentityFixture(),
  },
  scope: {
    selectedOccurrences: [
      { sourceOccurrenceId: 'occ:2', geometryObjectIds: [geometryId] },
      { sourceOccurrenceId: 'occ:1', geometryObjectIds: [geometryId] },
    ],
  },
  selections: [{
    geometry: { geometryObjectId: geometryId, sourceObjectId: '1' },
    buffers: [
      selectedBuffer('control-points-mm', 'Float64', [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]),
      selectedBuffer('polygon-offsets', 'Uint32', [0, 4]),
      selectedBuffer('polygon-vertex-indices', 'Uint32', [0, 1, 2, 3]),
    ],
  }],
  stagedJsonText: '[]\n',
});

assert.deepEqual(inputs.manifest.geometries[0].occurrenceIds, ['occ:1', 'occ:2']);
assert.equal(inputs.manifest.byteOrder, 'little-endian');
assert.equal(inputs.stagedJsonText, '[]\n');
const packageValue = await buildSelectedZonePackage(inputs);
await validateSelectedZonePackage(packageValue);
assert.equal(packageValue.audit.geometryCount, 1);
assert.ok(packageValue.files.some((file) => file.path === 'stagedjson.json'));

console.log('test-zone-package-live-input: PASS');
