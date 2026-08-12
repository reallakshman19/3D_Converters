import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AIV_STAGE8_GATE_STATUS,
  buildAivDiscontinuityStage8EvidenceGate,
} from '../converters/vibration/aiv/aiv-stage8-evidence-gate.js';

const SHA = `sha256:${'c'.repeat(64)}`;

function wrapped(verification) {
  return { verification, artifactSha256: SHA };
}

function validEvidence() {
  return {
    t27Reconciliation: wrapped({
      schema: 'AivT27ReconciliationVerification.v1',
      methodId: 'VIB.AIV.ACOUSTIC',
      reconciliationComplete: true,
      reviewedTraceCount: 9,
      productionEquationAuthorized: false,
    }),
    d23Flm1Reconciliation: wrapped({
      schema: 'AivD23Flm1ReconciliationVerification.v1',
      methodId: 'VIB.AIV.ACOUSTIC',
      reconciliationComplete: true,
      disposition: 'PUBLISHED_EXAMPLE_VARIANCE_ACCEPTED',
      benchmarkExpectedFlm1: 1.2133,
      benchmarkToleranceAbs: 0.0024,
      productionEquationAuthorized: false,
    }),
  };
}

test('stage 8 remains blocked while human T2-6/FLM1 evidence is absent', () => {
  const gate = buildAivDiscontinuityStage8EvidenceGate();
  assert.equal(gate.status, AIV_STAGE8_GATE_STATUS.BLOCKED_PENDING_T2_6_RECONCILIATION);
  assert.equal(gate.readyForCandidateImplementation, false);
  assert.equal(gate.requirements.every((item) => item.status === 'PENDING'), true);
  assert.equal(gate.authority.productionEquationAuthorized, false);
});

test('stage 8 becomes ready for candidate implementation only from hash-bound completed verification artifacts', () => {
  const gate = buildAivDiscontinuityStage8EvidenceGate({ evidence: validEvidence() });
  assert.equal(gate.status, AIV_STAGE8_GATE_STATUS.READY_FOR_CANDIDATE_IMPLEMENTATION);
  assert.equal(gate.readyForCandidateImplementation, true);
  assert.equal(gate.requirements.every((item) => item.status === 'SATISFIED'), true);
  assert.deepEqual(gate.reviewedBenchmarkDisposition, {
    flm1Disposition: 'PUBLISHED_EXAMPLE_VARIANCE_ACCEPTED',
    benchmarkExpectedFlm1: 1.2133,
    benchmarkToleranceAbs: 0.0024,
  });
  assert.equal(gate.authority.authorityTransitionApplied, false);
  assert.equal(gate.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(gate.authority.designAuthority, false);
});

test('unhashed or malformed human evidence is invalid rather than pending', () => {
  const evidence = validEvidence();
  evidence.t27Reconciliation = evidence.t27Reconciliation.verification;
  const gate = buildAivDiscontinuityStage8EvidenceGate({ evidence });
  assert.equal(gate.status, AIV_STAGE8_GATE_STATUS.BLOCKED_INVALID_EVIDENCE);
  assert.equal(gate.requirements[0].status, 'INVALID_EVIDENCE');
});

test('published D.2.3 A/S/B values are marked benchmark-only and cannot become defaults', () => {
  const gate = buildAivDiscontinuityStage8EvidenceGate();
  assert.equal(gate.implementationBoundary.publishedA, 0.93989);
  assert.equal(gate.implementationBoundary.publishedS, 68.229);
  assert.equal(gate.implementationBoundary.publishedB, 152.207);
  assert.equal(gate.implementationBoundary.publishedIntermediatesAreBenchmarkEvidenceNotGenericInputDefaults, true);
  assert.equal(gate.implementationBoundary.silentFlm1SelectionForbidden, true);
});
