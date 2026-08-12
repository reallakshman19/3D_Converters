import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  updateAivAssumptionProfile,
} from '../converters/vibration/aiv/aiv-assumption-profile.js';
import {
  AIV_AUTO_STAGE_STATUS,
  buildAivAutoStagePlan,
} from '../converters/vibration/aiv/aiv-auto-stage-plan.js';

function productPathPass() {
  return {
    schema: 'AivProductPathBenchmarkParityReceipt.v1',
    methodId: 'VIB.AIV.ACOUSTIC',
    status: 'PASS',
  };
}

function exactHeadPass() {
  return {
    schema: 'AivReleaseValidationReceipt.v1',
    methodId: 'VIB.AIV.ACOUSTIC',
    status: 'PASS',
  };
}

test('AUTO mode advances directly to stages 8–10 implementation with default benchmark assumptions', () => {
  const plan = buildAivAutoStagePlan();
  assert.equal(plan.mode, 'AUTO');
  assert.equal(plan.humanEvidenceRequired, false);
  assert.equal(plan.configuration.status, 'PASS');
  assert.equal(plan.nextStageId, '16B.3');
  assert.equal(plan.nextAction, 'IMPLEMENT_STAGES_8_TO_10');
  assert.equal(plan.stages.find((stage) => stage.stageId === '16B.2').status, AIV_AUTO_STAGE_STATUS.COMPLETE);
});

test('invalid assumption configuration is the only configuration stop, not missing human evidence', () => {
  const profile = updateAivAssumptionProfile(AIV_DEFAULT_ASSUMPTION_PROFILE, 'benchmark.publishedB', 'invalid');
  const plan = buildAivAutoStagePlan({ assumptionProfile: profile });
  assert.equal(plan.configuration.status, 'INVALID_ASSUMPTION_PROFILE');
  assert.equal(plan.stages.find((stage) => stage.stageId === '16B.2').status, AIV_AUTO_STAGE_STATUS.BLOCKED_INVALID_CONFIGURATION);
  assert.equal(plan.stages.find((stage) => stage.stageId === '16B.3').status, AIV_AUTO_STAGE_STATUS.BLOCKED_BY_PREVIOUS_STAGE);
  assert.equal(plan.stopConditions.includes('HUMAN_REVIEW_REQUIRED'), false);
});

test('after stages 8–10 implementation AUTO mode advances to full product-path benchmark parity', () => {
  const plan = buildAivAutoStagePlan({ stages8To10Implemented: true });
  assert.equal(plan.nextStageId, '17');
  assert.equal(plan.nextAction, 'BUILD_PRODUCT_PATH_BENCHMARK_PARITY_RECEIPT');
});

test('after product-path parity AUTO mode advances to result UI/export and exact-head validation', () => {
  const plan = buildAivAutoStagePlan({
    stages8To10Implemented: true,
    productPathBenchmarkParity: productPathPass(),
  });
  assert.equal(plan.stages.find((stage) => stage.stageId === '17').status, AIV_AUTO_STAGE_STATUS.COMPLETE);
  assert.equal(plan.nextStageId, '18');
  assert.equal(plan.nextAction, 'WIRE_BENCHMARK_RESULT_UI_AND_EXPORT');
});

test('exact-head pass makes BENCHMARK_ONLY authority transition ready without human recommendation', () => {
  const plan = buildAivAutoStagePlan({
    stages8To10Implemented: true,
    productPathBenchmarkParity: productPathPass(),
    exactHeadReleaseValidation: exactHeadPass(),
  });
  const release = plan.stages.find((stage) => stage.stageId === '19');
  assert.equal(release.status, AIV_AUTO_STAGE_STATUS.READY);
  assert.equal(release.autoAction, 'APPLY_BENCHMARK_ONLY_AUTHORITY_TRANSITION');
  assert.equal(plan.humanEvidenceRequired, false);
});
