import assert from 'node:assert/strict';
import { transformPoint, validateOccurrenceTransform } from '../../tabs/model-converters/converters/fbx/transform-policy.js';

const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1, 10, 20, 30];
assert.deepEqual(transformPoint(identity, [1, 2, 3]), [11, 22, 33]);
validateOccurrenceTransform({ sourceOccurrenceId: 'ok', inheritMode: 0, geometryMatrixMm: identity });
assert.throws(() => validateOccurrenceTransform({ sourceOccurrenceId: 'inherit', inheritMode: 1, geometryMatrixMm: identity }), /inheritance/);
assert.throws(() => validateOccurrenceTransform({ sourceOccurrenceId: 'singular', inheritMode: 0, geometryMatrixMm: [0,0,0,0,1,0,0,0,1,0,0,0] }), /singular/);
assert.throws(() => validateOccurrenceTransform({ sourceOccurrenceId: 'scale', inheritMode: 0, geometryMatrixMm: [2,0,0,0,1,0,0,0,1,0,0,0] }), /non-uniform/);
assert.throws(() => validateOccurrenceTransform({ sourceOccurrenceId: 'shear', inheritMode: 0, geometryMatrixMm: [1,0,0,0.5,1,0,0,0,1,0,0,0] }), /shear/);
console.log('test-transforms: PASS');
