import assert from 'node:assert/strict';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { FBX_SUPPORT_PROFILE } from '../../tabs/model-converters/converters/fbx/support-analysis/profile.js';
import { fixture, pipeClassification } from './test-support-fixtures.mjs';

const absent = fixture({ pipeClassifications: [] });
const blocked = await runFbxSupportAnalysis({ zoneGeometryEvidence: absent.zoneGeometryEvidence,
  selections: absent.selections, pipeClassifications: [] });
assert.equal(blocked.status, 'BLOCKED_SUPPORT_HOST_ASSOCIATION');
assert.ok(blocked.counts.ambiguousCandidateCount >= 1);
assert.ok(blocked.counts.unhostedSupportCount >= 1);

const separated = fixture({ pipeClassifications: [pipeClassification({
  A: { centreMm: [0,0,100], radiusMm: 50, normal: [-1,0,0], portEvidenceId: 'a-far' },
  L: { centreMm: [200,0,100], radiusMm: 50, normal: [1,0,0], portEvidenceId: 'l-far' },
})] });
const noShortcut = await runFbxSupportAnalysis({ zoneGeometryEvidence: separated.zoneGeometryEvidence,
  selections: separated.selections, pipeClassifications: separated.classifications });
assert.equal(noShortcut.counts.admittedSupportCount, 0);
assert.equal(noShortcut.status, 'BLOCKED_SUPPORT_AMBIGUITY');

const duplicate = fixture({ extraOccurrences: [
  { sourceOccurrenceId: 'occ:4', sourceModelObjectId: '104', parentOccurrenceId: 'occ:0',
    geometryObjectIds: ['40'], inheritMode: 0, originalInheritMode: 0,
    hasGeometryTransform: false, geometryMatrixMm: [1,0,0,0,1,0,0,0,1,0,0,0] },
], pipeClassifications: [pipeClassification(), pipeClassification({
  sourceOccurrenceId: 'occ:4', sourceModelObjectId: '104', geometryObjectId: '40' })] });
const multi = await runFbxSupportAnalysis({ zoneGeometryEvidence: duplicate.zoneGeometryEvidence,
  selections: duplicate.selections, pipeClassifications: duplicate.classifications });
assert.equal(multi.supportEvidence.admittedSupports[0].hostAssociation.outcome, 'MULTI_HOST_PROVED');
assert.equal(multi.supportEvidence.hostAssociations.length, 2);

const duplicateInterpretation = fixture({ pipeClassifications: [pipeClassification(), pipeClassification({
  A: { centreMm: [0,0,0], radiusMm: 50, normal: [-1,0,0], portEvidenceId: 'a-2' },
  L: { centreMm: [220,0,0], radiusMm: 50, normal: [1,0,0], portEvidenceId: 'l-2' },
  spanMm: 220,
})] });
const ambiguous = await runFbxSupportAnalysis({ zoneGeometryEvidence: duplicateInterpretation.zoneGeometryEvidence,
  selections: duplicateInterpretation.selections,
  pipeClassifications: duplicateInterpretation.classifications });
const ambiguousCandidate = ambiguous.supportEvidence.candidateDispositions
  .find((item) => item.sourceOccurrenceId === 'occ:2');
assert.equal(ambiguousCandidate.hostDisposition, 'HOST_AMBIGUOUS');
assert.equal(ambiguous.status, 'BLOCKED_SUPPORT_AMBIGUITY');

const remote = fixture({ pipeClassifications: [pipeClassification({
  A: { centreMm: [0,0,3000], radiusMm: 50, normal: [-1,0,0], portEvidenceId: 'a-remote' },
  L: { centreMm: [200,0,3000], radiusMm: 50, normal: [1,0,0], portEvidenceId: 'l-remote' },
})] });
const bounded = await runFbxSupportAnalysis({ zoneGeometryEvidence: remote.zoneGeometryEvidence,
  selections: remote.selections, pipeClassifications: remote.classifications,
  profile: { ...FBX_SUPPORT_PROFILE, maximumCandidateHostPairs: 0 } });
assert.equal(bounded.counts.admittedSupportCount, 0);
assert.equal(bounded.status, 'BLOCKED_SUPPORT_AMBIGUITY');

console.log('PASS test-support-host-ambiguity');
