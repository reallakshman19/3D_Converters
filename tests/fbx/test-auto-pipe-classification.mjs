import assert from 'node:assert/strict';
import { classifyPipeOccurrence } from '../../tabs/model-converters/converters/fbx/auto-pipe/classify.js';

function selection() {
  const values = new Float64Array([
    0, 1, 0, 0, -1, 0,
    10, 1, 0, 10, -1, 0,
  ]);
  return { buffers: [{ role: 'control-points-mm', buffer: { bytes: new Uint8Array(values.buffer) } }] };
}

const occurrence = {
  sourceOccurrenceId: 'occ:1',
  geometryObjectIds: ['2'],
  geometryMatrixMm: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
};
const derivedPortEvidence = {
  candidates: [
    { sourceOccurrenceId: 'occ:1', geometryObjectId: '2', admissionDisposition: 'ADMITTED', centreMm: [0, 0, 0], normal: [-1, 0, 0], radiusMm: 1 },
    { sourceOccurrenceId: 'occ:1', geometryObjectId: '2', admissionDisposition: 'ADMITTED', centreMm: [10, 0, 0], normal: [1, 0, 0], radiusMm: 1 },
  ],
};

const result = classifyPipeOccurrence({ occurrence, selection: selection(), derivedPortEvidence });
assert.equal(result.status, 'PIPE_INFERENCE_PASS');
assert.deepEqual(result.A.centreMm, [0, 0, 0]);
assert.deepEqual(result.L.centreMm, [10, 0, 0]);
console.log('PASS test-auto-pipe-classification');
