import assert from 'node:assert/strict';
import { buildSolidFittingPortEvidence } from '../../tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js';
import { classifySolidFittingPipeOccurrence } from '../../tabs/model-converters/converters/fbx/solid-fitting-ports/classifier.js';
import { SOLID_FITTING_PORT_PROFILE } from '../../tabs/model-converters/converters/fbx/solid-fitting-ports/profile.js';
import { occurrenceFixture, selectionFromGeometry } from './solid-fitting-port-fixtures.mjs';

function splitCappedCylinder(radius = 30.15, height = 240, sides = 32, seam = 1.5e-6) {
  const points = [];
  for (let end = 0; end < 2; end += 1) for (let index = 0; index < sides; index += 1) {
    const angle = (index * Math.PI * 2) / sides;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle), end * height]);
  }
  const faces = [Array.from({ length: sides }, (_, index) => sides - 1 - index)];
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    faces.push([index, next, sides + next, sides + index]);
  }
  const capStart = points.length;
  for (let index = 0; index < sides; index += 1) {
    const angle = (index * Math.PI * 2) / sides;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle), height + seam]);
  }
  const centre = points.length;
  points.push([0, 0, height + seam]);
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    faces.push([centre, capStart + index, capStart + next]);
  }
  const polygonOffsets = [0], polygonVertexIndices = [];
  for (const face of faces) {
    polygonVertexIndices.push(...face);
    polygonOffsets.push(polygonVertexIndices.length);
  }
  return { controlPointsMm: points.flat(), polygonOffsets, polygonVertexIndices };
}

async function main() {
  const geometry = splitCappedCylinder();
  const selection = selectionFromGeometry('101', '1', geometry);
  const occurrence = occurrenceFixture('occ:1', '1', '101', {
    inheritMode: 2, originalInheritMode: 2,
  });
  const scope = { selectedOccurrences: [occurrence] };
  const zoneArtifact = { artifactId: `fbx-zone-geometry-evidence:${'b'.repeat(64)}` };

  const evidence = await buildSolidFittingPortEvidence(zoneArtifact, scope, [selection]);
  const [record] = evidence.occurrenceEvidence;
  assert.equal(record.analysisProjection.mergedVertexCount, 32);
  assert(record.analysisProjection.maximumMergeResidualMm > 1e-6);
  assert(record.analysisProjection.maximumMergeResidualMm <= 2e-6);
  assert.equal(record.topologyDisposition, 'STRAIGHT_TWO_PORT');
  assert.equal(record.candidates.filter((item) => item.admissionDisposition === 'ADMITTED').length, 2);
  const classified = classifySolidFittingPipeOccurrence({ occurrence, selection, record });
  assert.equal(classified?.admitted, true);
  assert.equal(classified.inferenceMethod, 'CLOSED_SOLID_CYLINDER');

  const narrow = { ...SOLID_FITTING_PORT_PROFILE, vertexMergeAbsoluteMm: 1e-6 };
  const blocked = await buildSolidFittingPortEvidence(zoneArtifact, scope, [selection], narrow);
  assert.equal(blocked.occurrenceEvidence[0].topologyDisposition, 'REJECTED');
  assert.deepEqual(blocked.occurrenceEvidence[0].rejectionReasons, ['MULTIPLE_SHELLS']);

  console.log('PASS test-solid-fitting-welded-taya-profile');
}
await main();
