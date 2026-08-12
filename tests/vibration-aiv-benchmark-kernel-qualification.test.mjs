import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS,
  buildAivBenchmarkKernelQualification,
} from '../converters/vibration/aiv/aiv-benchmark-kernel-qualification.js';

const SHA = `sha256:${'d'.repeat(64)}`;
function wrapped(document) { return { document, artifactSha256: SHA }; }

function candidateParity() {
  return wrapped({
    schema: 'AivKernelCandidateParity.v1',
    methodId: 'VIB.AIV.ACOUSTIC',
    status: 'CANDIDATE_PARITY_PASS',
    counts: { total: 8, passed: 8, failed: 0 },
    candidateStatus: { implementedStages: Array.from({ length: 7 }, (_, i) => `STAGE-${i + 1}`) },
    blockedStages: ['CALCULATE_DISCONTINUITY_RESULT', 'AGGREGATE_LINE_CASE_RESULT', 'ASSESS_RESULT'],
    authority: {
      productionEquationAuthorized: false,
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
    },
  });
}

function stage8Gate() {
  return wrapped({
    schema: 'AivDiscontinuityStage8EvidenceGate.v1',
    methodId: 'VIB.AIV.ACOUSTIC',
    stageId: 'CALCULATE_DISCONTINUITY_RESULT',
    status: 'READY_FOR_CANDIDATE_IMPLEMENTATION',
    readyForCandidateImplementation: true,
    authority: {
      productionEquationAuthorized: false,
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
    },
  });
}

function completeProductPath() {
  return wrapped({
    schema: 'AivProductPathBenchmarkParityReceipt.v1',
    methodId: 'VIB.AIV.ACOUSTIC',
    releaseTarget: 'BENCHMARK_ONLY',
    status: 'PASS',
    completeKernelStageCount: 10,
    resultContractsValidated: true,
    sourceAssessmentLineScopesValidated: true,
    authorityTransitionApplied: false,
    screeningAuthority: 'NOT_AUTHORIZED',
    designAuthority: false,
  });
}

test('candidate stages 1 through 7 alone are only partial release evidence', () => {
  const result = buildAivBenchmarkKernelQualification({ evidence: { candidateParity: candidateParity() } });
  assert.equal(result.status, AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.PARTIAL_STAGES_1_TO_7);
  assert.equal(result.releaseGateSatisfied, false);
  assert.equal(result.counts.candidateParityStages, 7);
  assert.equal(result.counts.pendingStages, 3);
  assert.equal(result.nextAction, 'COMPLETE_STAGE_8_HUMAN_EVIDENCE_GATE');
});

test('reviewed stage-8 evidence makes stages 8 through 10 implementable but not releasable', () => {
  const result = buildAivBenchmarkKernelQualification({
    evidence: { candidateParity: candidateParity(), stage8EvidenceGate: stage8Gate() },
  });
  assert.equal(result.status, AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.READY_FOR_STAGES_8_TO_10_IMPLEMENTATION);
  assert.equal(result.releaseGateSatisfied, false);
  assert.equal(result.stages[7].status, 'READY_FOR_CANDIDATE_IMPLEMENTATION');
  assert.equal(result.stages[8].status, 'PENDING');
  assert.equal(result.stages[9].status, 'PENDING');
});

test('only complete product-path benchmark parity can satisfy the kernel release gate', () => {
  const result = buildAivBenchmarkKernelQualification({
    evidence: {
      candidateParity: candidateParity(),
      stage8EvidenceGate: stage8Gate(),
      productPathBenchmarkParity: completeProductPath(),
    },
  });
  assert.equal(result.status, AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.PASS);
  assert.equal(result.releaseGateSatisfied, true);
  assert.equal(result.counts.productPathQualifiedStages, 10);
  assert.equal(result.authority.authorityTransitionApplied, false);
  assert.equal(result.authority.productionEquationAuthorized, false);
  assert.equal(result.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(result.authority.designAuthority, false);
});

test('unhashed or malformed evidence fails closed', () => {
  const bad = candidateParity().document;
  const result = buildAivBenchmarkKernelQualification({ evidence: { candidateParity: bad } });
  assert.equal(result.status, AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.INVALID_EVIDENCE);
  assert.equal(result.releaseGateSatisfied, false);
});
