import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AIV_RELEASE_PLAN_SCHEMA,
  buildAivReleasePlan,
} from '../converters/vibration/aiv/aiv-release-plan.js';

const SHA = `sha256:${'a'.repeat(64)}`;

function wrapped(document, sha = SHA) {
  return { verification: document, artifactSha256: sha };
}

function benchmarkEvidence() {
  return {
    qualificationParityManifest: wrapped({
      schema: 'AivQualificationParityManifest.v1',
      status: 'MACHINE_PARITY_PASS',
      productionEquationAuthorized: false,
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
    }),
    benchmarkKernelQualification: wrapped({
      schema: 'AivBenchmarkKernelQualification.v1',
      methodId: 'VIB.AIV.ACOUSTIC',
      releaseTarget: 'BENCHMARK_ONLY',
      status: 'PASS',
      releaseGateSatisfied: true,
      counts: {
        totalStages: 10,
        productPathQualifiedStages: 10,
      },
      authority: {
        authorityTransitionApplied: false,
        productionEquationAuthorized: false,
        screeningAuthority: 'NOT_AUTHORIZED',
        designAuthority: false,
      },
    }),
    promotionReadiness: wrapped({
      schema: 'AivQualificationPromotionReadiness.v1',
      status: 'READY_FOR_INDEPENDENT_AUTHORITY_REVIEW',
      eligibleForAuthorityReview: true,
      authorityPromotionAuthorized: false,
    }),
    independentPromotionReview: wrapped({
      schema: 'AivIndependentVibrationEngineerPromotionReviewVerification.v1',
      reviewComplete: true,
      recommendation: 'RECOMMEND_BENCHMARK_ONLY_PROMOTION',
      recommendedAuthorityTarget: 'BENCHMARK_ONLY',
      authorityTransitionApplied: false,
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
    }),
    releaseValidation: wrapped({
      schema: 'AivReleaseValidationReceipt.v1',
      methodId: 'VIB.AIV.ACOUSTIC',
      releaseTarget: 'BENCHMARK_ONLY',
      status: 'PASS',
      exactHeadValidated: true,
    }),
  };
}

test('AIV release plan defaults to BLOCKED and forbids direct screening release', () => {
  const plan = buildAivReleasePlan();
  assert.equal(plan.schema, AIV_RELEASE_PLAN_SCHEMA);
  assert.equal(plan.currentPhase, 'BLOCKED');
  assert.equal(plan.nextTarget, 'BENCHMARK_ONLY');
  assert.equal(plan.releasePolicy.directBlockedToScreeningForbidden, true);
  assert.equal(plan.releasePolicy.designAuthorityTarget, false);
  assert.equal(plan.benchmarkOnly.status, 'NOT_READY');
  assert.equal(plan.benchmarkOnly.counts.pending, 5);
  assert.equal(plan.screening.status, 'BLOCKED_BY_PREVIOUS_PHASE');
  assert.equal(plan.screening.counts.blockedByPreviousPhase, 7);
  assert.equal(plan.authorityTransitionApplied, false);
});

test('all five benchmark release evidence artifacts make only BENCHMARK_ONLY eligible for transition review', () => {
  const plan = buildAivReleasePlan({ evidence: benchmarkEvidence() });
  assert.equal(plan.benchmarkOnly.status, 'ELIGIBLE_FOR_REVIEWED_AUTHORITY_TRANSITION');
  assert.equal(plan.benchmarkOnly.eligibleForTransitionReview, true);
  assert.equal(plan.benchmarkOnly.counts.satisfied, 5);
  assert.equal(plan.screening.status, 'BLOCKED_BY_PREVIOUS_PHASE');
  assert.equal(plan.authorityTransitionApplied, false);
  assert.equal(plan.benchmarkOnly.targetAuthority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(plan.benchmarkOnly.targetAuthority.designAuthority, false);
});

test('isolated qualification parity is not enough when real product-kernel qualification is missing', () => {
  const evidence = benchmarkEvidence();
  delete evidence.benchmarkKernelQualification;
  const plan = buildAivReleasePlan({ evidence });
  const kernelGate = plan.benchmarkOnly.gates.find((gate) => gate.gateId === 'BENCHMARK_KERNEL_QUALIFICATION');
  assert.equal(kernelGate.status, 'PENDING');
  assert.equal(plan.benchmarkOnly.status, 'NOT_READY');
  assert.equal(plan.benchmarkOnly.eligibleForTransitionReview, false);
});

test('bare or malformed evidence cannot satisfy a release gate', () => {
  const evidence = benchmarkEvidence();
  evidence.releaseValidation = {
    schema: 'AivReleaseValidationReceipt.v1',
    methodId: 'VIB.AIV.ACOUSTIC',
    releaseTarget: 'BENCHMARK_ONLY',
    status: 'PASS',
    exactHeadValidated: true,
  };
  const plan = buildAivReleasePlan({ evidence });
  const validation = plan.benchmarkOnly.gates.find((gate) => gate.gateId === 'EXACT_HEAD_RELEASE_VALIDATION');
  assert.equal(validation.status, 'INVALID_EVIDENCE');
  assert.equal(plan.benchmarkOnly.status, 'INVALID_EVIDENCE');
});

test('SCREENING remains a second release program after BENCHMARK_ONLY', () => {
  const plan = buildAivReleasePlan({ currentPhase: 'BENCHMARK_ONLY' });
  assert.equal(plan.nextTarget, 'SCREENING');
  assert.equal(plan.benchmarkOnly.status, 'RELEASED');
  assert.equal(plan.screening.status, 'NOT_READY');
  assert.equal(plan.screening.counts.pending, 7);
  assert.equal(plan.screening.eligibleForTransitionReview, false);
  assert.equal(plan.screening.targetAuthority.designAuthority, false);
});

test('release planner is immutable and never exposes an authority mutation operation', () => {
  const plan = buildAivReleasePlan();
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.benchmarkOnly.gates), true);
  assert.equal('applyTransition' in plan, false);
  assert.equal('calculate' in plan, false);
  assert.equal('run' in plan, false);
});
