import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AIV_POST_DISCONTINUITY_GATE_STATUS,
  buildAivPostDiscontinuityEvidenceGate,
} from '../converters/vibration/aiv/aiv-post-discontinuity-evidence-gate.js';

const SHA = `sha256:${'e'.repeat(64)}`;
const EVIDENCE_SHA = `sha256:${'f'.repeat(64)}`;
function wrapped(verification) { return { verification, artifactSha256: SHA }; }

function validEvidence() {
  return {
    workedExampleResultScopeReview: wrapped({
      schema: 'AivWorkedExampleResultScopeReviewVerification.v1',
      methodId: 'VIB.AIV.ACOUSTIC',
      reviewComplete: true,
      scopeSeparationAccepted: true,
      evidenceSha256: EVIDENCE_SHA,
      productionEquationAuthorized: false,
      lineAggregationImplementationAuthorized: false,
    }),
    independentBenchmarkReview: wrapped({
      schema: 'AivIndependentBenchmarkReviewVerification.v1',
      methodId: 'VIB.AIV.ACOUSTIC',
      reviewComplete: true,
      acceptedBenchmarkCount: 3,
      sonicSff6BenchmarkAccepted: true,
      multiSourceBenchmarksAccepted: true,
      productionEquationAuthorized: false,
    }),
  };
}

test('stages 9 and 10 remain blocked while scope/benchmark human evidence is absent', () => {
  const gate = buildAivPostDiscontinuityEvidenceGate();
  assert.equal(gate.status, AIV_POST_DISCONTINUITY_GATE_STATUS.BLOCKED_PENDING_RESULT_SCOPE_AND_ASSESSMENT_REVIEW);
  assert.equal(gate.readyForCandidateImplementation, false);
  assert.equal(gate.requirements.every((item) => item.status === 'PENDING'), true);
});

test('completed hash-bound scope and independent-benchmark reviews make stages 9 and 10 implementable', () => {
  const gate = buildAivPostDiscontinuityEvidenceGate({ evidence: validEvidence() });
  assert.equal(gate.status, AIV_POST_DISCONTINUITY_GATE_STATUS.READY_FOR_POST_DISCONTINUITY_CANDIDATE_IMPLEMENTATION);
  assert.equal(gate.readyForCandidateImplementation, true);
  assert.equal(gate.requirements.every((item) => item.status === 'SATISFIED'), true);
  assert.equal(gate.authority.authorityTransitionApplied, false);
  assert.equal(gate.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(gate.authority.designAuthority, false);
});

test('unhashed or malformed scope evidence fails closed', () => {
  const evidence = validEvidence();
  evidence.workedExampleResultScopeReview = evidence.workedExampleResultScopeReview.verification;
  const gate = buildAivPostDiscontinuityEvidenceGate({ evidence });
  assert.equal(gate.status, AIV_POST_DISCONTINUITY_GATE_STATUS.BLOCKED_INVALID_EVIDENCE);
});

test('scope boundary explicitly keeps D.2.3 first-discontinuity and line-level LOF separate', () => {
  const gate = buildAivPostDiscontinuityEvidenceGate();
  assert.equal(gate.scopeBoundary.firstDiscontinuityScope, 'ASSESSMENT');
  assert.equal(gate.scopeBoundary.derivedReportScope, 'LINE_CASE_SUMMARY');
  assert.equal(gate.scopeBoundary.d23FirstDiscontinuityLof, 0.29);
  assert.equal(gate.scopeBoundary.workedExampleReliefLineLof, 1.48);
  assert.equal(gate.scopeBoundary.valuesAreNotInterchangeable, true);
  assert.equal(gate.scopeBoundary.aggregationMustNotBeInferredFromSingleFirstDiscontinuity, true);
});
