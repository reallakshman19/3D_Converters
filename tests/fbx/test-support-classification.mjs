import assert from 'node:assert/strict';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { bindSourceGraph, fixture } from './test-support-fixtures.mjs';

const input = await bindSourceGraph(fixture());
const result = await runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications, sourceGraph: input.sourceGraph });
assert.equal(result.status, 'SUPPORT_ANALYSIS_PASS');
assert.equal(result.counts.admittedSupportCount, 1);
assert.equal(result.counts.candidateCount, 1);
assert.equal(result.supportEvidence.admittedSupports[0].supportClass, 'GENERIC_SUPPORT');
assert.equal(result.supportEvidence.admittedSupports[0].supportSubtypeDisposition, 'NOT_EVALUATED');
assert.equal(result.supportEvidence.admittedSupports[0].orientationDisposition,
  'EVIDENCE_ONLY_NO_RESTRAINT_INFERENCE');
assert.equal(result.supportEvidence.admittedSupports[0].assemblyId,
  result.supportEvidence.admittedSupports[0].supportAssemblyId);
assert.match(result.supportEvidence.admittedSupports[0].geometrySemanticDigest, /^[0-9a-f]{64}$/);
assert.equal(result.supportEvidence.admittedSupports[0].hostAssociation.outcome, 'SINGLE_HOST_PROVED');
assert.equal(result.supportEvidence.admittedSupports[0].sourcePropertyEvidence[0].displayName,
  'SUPPORT SHOE 202');
assert.equal(result.supportEvidence.admittedSupports[0].supportTagEvidence[0].authority,
  'NON_AUTHORITATIVE');
console.log('PASS test-support-classification');
