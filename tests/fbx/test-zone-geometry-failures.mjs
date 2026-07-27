import assert from 'node:assert/strict';
import { analyseFbxZoneGeometry } from '../../tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js';
import { ZONE_GEOMETRY_STATUS } from '../../tabs/model-converters/converters/fbx/zone-geometry/constants.js';
import { buildFixture } from './test-zone-geometry-evidence.mjs';

async function expectCode(run, code) {
  await assert.rejects(run, (error) => error?.code === code);
}

const graphMismatch = await buildFixture();
graphMismatch.graph.file.creator = 'tampered-active-graph';
await expectCode(() => analyseFbxZoneGeometry({ sourceGraph: graphMismatch.graph,
  geometryBundle: graphMismatch.bundle, zoneId: 'occ:3' }), ZONE_GEOMETRY_STATUS.BINDING);

const unknownZone = await buildFixture();
await expectCode(() => analyseFbxZoneGeometry({ sourceGraph: unknownZone.graph,
  geometryBundle: unknownZone.bundle, zoneId: 'occ:999' }), ZONE_GEOMETRY_STATUS.SCOPE);

const siblingTamper = await buildFixture();
const siblingBuffer = siblingTamper.bundle.buffers.find((item) => item.bufferId.startsWith('geometry/11/'));
new Uint8Array(siblingBuffer.bytes)[0] ^= 1;
await expectCode(() => analyseFbxZoneGeometry({ sourceGraph: siblingTamper.graph,
  geometryBundle: siblingTamper.bundle, zoneId: 'occ:3' }), ZONE_GEOMETRY_STATUS.TOPOLOGY);

const selectedTamper = await buildFixture();
selectedTamper.bundle.manifest.geometries[0].bufferIds.controlPointsMm = 'geometry/10/missing';
await expectCode(() => analyseFbxZoneGeometry({ sourceGraph: selectedTamper.graph,
  geometryBundle: selectedTamper.bundle, zoneId: 'occ:3' }), ZONE_GEOMETRY_STATUS.TOPOLOGY);

const sourceBinding = await buildFixture();
sourceBinding.bundle.manifest.sourceIdentity.byteLength += 1;
await expectCode(() => analyseFbxZoneGeometry({ sourceGraph: sourceBinding.graph,
  geometryBundle: sourceBinding.bundle, zoneId: 'occ:3' }), ZONE_GEOMETRY_STATUS.TOPOLOGY);

console.log('test-zone-geometry-failures: PASS');
