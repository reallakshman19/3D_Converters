import assert from 'node:assert/strict';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { fixture, pipeClassification, translatedMatrix } from './test-support-fixtures.mjs';

const matrix = translatedMatrix(1000, 2000, 3000);
const input = fixture({ supportMatrix: matrix, pipeMatrix: matrix,
  pipeClassifications: [pipeClassification({
    A: { centreMm: [1000,2000,3000], radiusMm: 50, normal: [-1,0,0], portEvidenceId: 'a' },
    L: { centreMm: [1200,2000,3000], radiusMm: 50, normal: [1,0,0], portEvidenceId: 'l' },
  })] });
const result = await runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications });
assert.equal(result.counts.admittedSupportCount, 1);
const position = result.supportEvidence.admittedSupports[0].worldPositionMm;
const exactWitnesses = [[1040,1995,2950],[1160,1995,2950],[1160,2005,2950],[1040,2005,2950]];
assert.ok(exactWitnesses.some((point) => point.every((value, index) => value === position[index])));
console.log('PASS test-support-transforms');
