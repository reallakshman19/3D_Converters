import assert from 'node:assert/strict';
import { classifyPipeOccurrence } from '../../tabs/model-converters/converters/fbx/auto-pipe/classify.js';

const occurrence = {
  sourceOccurrenceId: 'occ:1',
  geometryObjectIds: ['2'],
  geometryMatrixMm: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
};
const values = new Float64Array([0, 1, 0, 10, 1, 0]);
const selection = { buffers: [{ role: 'control-points-mm', buffer: { bytes: new Uint8Array(values.buffer) } }] };
const result = classifyPipeOccurrence({
  occurrence,
  selection,
  derivedPortEvidence: {
    candidates: [{ sourceOccurrenceId: 'occ:1', geometryObjectId: '2', admissionDisposition: 'ADMITTED', centreMm: [0, 0, 0], normal: [-1, 0, 0], radiusMm: 1 }],
  },
});
assert.equal(result.status, 'BLOCKED_AUTO_PIPE_CLASSIFICATION');
assert.equal(result.reason, 'BOUNDARY_COUNT');
console.log('PASS test-auto-pipe-classification-failures');
