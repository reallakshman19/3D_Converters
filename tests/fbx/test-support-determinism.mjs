import assert from 'node:assert/strict';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { fixture } from './test-support-fixtures.mjs';

const input = fixture();
const first = await runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications });
const shuffledEvidence = { ...input.zoneGeometryEvidence,
  occurrenceEvidence: [...input.zoneGeometryEvidence.occurrenceEvidence].reverse() };
const second = await runFbxSupportAnalysis({ zoneGeometryEvidence: shuffledEvidence,
  selections: [...input.selections].reverse(), pipeClassifications: [...input.classifications].reverse() });
assert.equal(first.supportEvidence.artifactId, second.supportEvidence.artifactId);
assert.equal(first.supportEvidenceJson, second.supportEvidenceJson);
console.log('PASS test-support-determinism');
