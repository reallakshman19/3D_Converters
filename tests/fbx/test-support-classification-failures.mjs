import assert from 'node:assert/strict';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { bindSourceGraph, fixture } from './test-support-fixtures.mjs';

const tiny = fixture({ supportMinimum: [40,-0.5,-51], supportMaximum: [45,0.5,-50] });
const result = await runFbxSupportAnalysis({ zoneGeometryEvidence: tiny.zoneGeometryEvidence,
  selections: tiny.selections, pipeClassifications: tiny.classifications });
assert.equal(result.counts.admittedSupportCount, 0);
assert.equal(result.counts.rejectedCandidateCount, 1);
const candidate = result.supportEvidence.candidateDispositions.find((item) => item.sourceOccurrenceId === 'occ:2');
assert.equal(candidate.terminalDisposition, 'SUPPORT_CANDIDATE_REJECTED');
assert.ok(candidate.classificationReasons.includes('CANDIDATE_BELOW_MINIMUM_SIZE'));
const slender = fixture({ supportMinimum: [0,-0.5,-100], supportMaximum: [200,0.5,400] });
const slenderResult = await runFbxSupportAnalysis({ zoneGeometryEvidence: slender.zoneGeometryEvidence,
  selections: slender.selections, pipeClassifications: slender.classifications });
assert.equal(slenderResult.status, 'BLOCKED_SUPPORT_CLASSIFICATION');
const slenderCandidate = slenderResult.supportEvidence.candidateDispositions
  .find((item) => item.sourceOccurrenceId === 'occ:2');
assert.ok(slenderCandidate.classificationReasons.includes('SHEET_LIKE_SLENDERNESS_AMBIGUOUS'));

const nameOnly = await bindSourceGraph(fixture({ pipeClassifications: [],
  supportDisplayName: 'SUPPORT GUIDE STOP' }));
const nameOnlyResult = await runFbxSupportAnalysis({ zoneGeometryEvidence: nameOnly.zoneGeometryEvidence,
  selections: nameOnly.selections, pipeClassifications: [], sourceGraph: nameOnly.sourceGraph });
assert.equal(nameOnlyResult.counts.admittedSupportCount, 0);
assert.equal(nameOnlyResult.status, 'BLOCKED_SUPPORT_HOST_ASSOCIATION');

await assert.rejects(() => runFbxSupportAnalysis({ zoneGeometryEvidence: nameOnly.zoneGeometryEvidence,
  selections: nameOnly.selections, pipeClassifications: [], sourceGraph: { sourceObjects: [] } }),
  /BLOCKED_SUPPORT_BINDING/);
const badHost = fixture({ pipeClassifications: [{ ...fixture().classifications[0], geometryObjectId: '999' }] });
await assert.rejects(() => runFbxSupportAnalysis({ zoneGeometryEvidence: badHost.zoneGeometryEvidence,
  selections: badHost.selections, pipeClassifications: badHost.classifications }),
  /BLOCKED_SUPPORT_BINDING/);

console.log('PASS test-support-classification-failures');
