import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAivFacilityScenarioExecutionPlan,
  inspectAivFacilityScenarioPlanForAssessment,
} from '../converters/vibration/aiv/aiv-facility-scenario-plan.js';
import { executeAivWithFacilityScenarioCustody } from '../converters/vibration/aiv/aiv-facility-execution.js';
import {
  VIBRATION_OPERATING_SCENARIO_DECLARATION,
  assembleVibrationIntegrityDataset,
  buildVibrationOperatingScenario,
} from '../converters/vibration/dataset/index.js';
import {
  createVibrationFacilityScenarioHandoff,
} from '../converters/vibration/facility/scenario-handoff.js';
import {
  VIBRATION_TABLE_EXCHANGE_INTEGRITY,
  VIBRATION_TABLE_EXCHANGE_SCHEMA,
} from '../converters/vibration/exchange/schema.js';
import {
  clearCurrentAivScreeningSession,
  publishCurrentAivScreeningSession,
} from '../tabs/vibration-aiv-screening-session.js';

function exchange(datasetId = 'plant-a') {
  return {
    schema: VIBRATION_TABLE_EXCHANGE_SCHEMA,
    completeExchange: true,
    integrityStatus: VIBRATION_TABLE_EXCHANGE_INTEGRITY.DECLARED_NOT_REVERIFIED,
    authority: {
      canonicalHash: `sha256:${datasetId}-canonical`,
      projectionHash: `sha256:${datasetId}-projection`,
      sourceHash: `sha256:${datasetId}-source`,
      datasetId,
      datasetVersion: 'rev-1',
    },
    sourceFileName: `${datasetId}.xlsx`,
    elements: [
      { canonicalId: 'RV-101', line: 'L-SOURCE', type: 'VALVE' },
      { canonicalId: 'CAN-1', line: 'L-ASSESS', type: 'PIPE' },
    ],
  };
}

function operatingCases(massFlow = 100) {
  return [
    {
      caseId: 'NORMAL', line: 'L-SOURCE', phase: 'GAS', source: 'HMB-1',
      sourceRevision: 'A', recordId: 'HMB-1-SOURCE-NORMAL',
      massFlow: { value: massFlow, unit: 'kg/s' },
      pressure: { value: 20, unit: 'barg', reference: 'gauge' },
    },
    {
      caseId: 'NORMAL', line: 'L-ASSESS', phase: 'GAS', source: 'HMB-1',
      sourceRevision: 'A', recordId: 'HMB-1-ASSESS-NORMAL',
      massFlow: { value: massFlow, unit: 'kg/s' },
      pressure: { value: 15, unit: 'barg', reference: 'gauge' },
    },
  ];
}

function dataset(datasetId = 'plant-a', massFlow = 100) {
  return assembleVibrationIntegrityDataset({
    exchange: exchange(datasetId),
    operatingCases: operatingCases(massFlow),
    enrichment: [],
  });
}

function scenario(source, line) {
  return buildVibrationOperatingScenario(source, {
    line,
    caseId: 'NORMAL',
    coherenceDeclaration: VIBRATION_OPERATING_SCENARIO_DECLARATION,
  });
}

function scenarioSet(datasetId = 'plant-a', massFlow = 100) {
  const source = dataset(datasetId, massFlow);
  return [scenario(source, 'L-SOURCE'), scenario(source, 'L-ASSESS')];
}

function readiness(sourceLine = 'L-SOURCE', assessmentLine = 'L-ASSESS') {
  return {
    schema: 'AivReadinessTableEnvelope.v2',
    readiness: {
      rows: [{
        rowKey: JSON.stringify(['RV-101', 'CAN-1', 'NORMAL']),
        status: 'READY_FOR_QUALIFICATION',
        sourceCanonicalId: 'RV-101', assessmentCanonicalId: 'CAN-1',
        sourceLine, assessmentLine, caseId: 'NORMAL',
      }],
    },
  };
}

function screeningResult() {
  return {
    ok: true,
    calculationId: 'VIB.AIV.ACOUSTIC',
    outputs: { screeningResultScope: 'ASSESSMENT', assessmentResults: [] },
    assessment: {
      resultScope: 'ASSESSMENT_SCREENING', screeningAuthority: 'AUTHORIZED',
      lineCaseSummaryAuthoritativeForScreening: false, designAuthority: false,
    },
  };
}

function currentHandoff(massFlow = 100) {
  return createVibrationFacilityScenarioHandoff({
    operatingScenarios: scenarioSet('plant-a', massFlow),
    runId: 'FIT-RUN-1',
  });
}

test('facility handoff retains one governed dataset and exact source/assessment scenario bindings', () => {
  const handoff = currentHandoff();
  assert.equal(handoff.datasetId, 'plant-a');
  assert.equal(handoff.cardinality, 2);
  assert.deepEqual(handoff.entries.map((entry) => entry.line), ['L-SOURCE', 'L-ASSESS']);
  assert(handoff.entries.every((entry) => entry.binding.scenarioSnapshotHash === entry.scenario.snapshotHash));
});

test('facility handoff rejects mixed datasets before AIV planning', () => {
  const a = scenarioSet('plant-a')[0];
  const b = scenarioSet('plant-b')[1];
  assert.throws(
    () => createVibrationFacilityScenarioHandoff({ operatingScenarios: [a, b], runId: 'FIT-RUN-MIX' }),
    (error) => error.code === 'VIBRATION_FACILITY_HANDOFF_DATASET_MIX_FORBIDDEN',
  );
});

test('AIV relationship plan binds source and assessment lines for the same facility case', () => {
  const plan = buildAivFacilityScenarioExecutionPlan({
    handoff: currentHandoff(), readinessEnvelope: readiness(),
  });
  assert.equal(plan.datasetId, 'plant-a');
  assert.equal(plan.cardinality, 1);
  const item = plan.relationshipExecutions[0];
  assert.equal(item.sourceLine, 'L-SOURCE');
  assert.equal(item.assessmentLine, 'L-ASSESS');
  assert.equal(item.caseId, 'NORMAL');
  assert.equal(item.sourceScenarioExecutionBasis.datasetId, 'plant-a');
  assert.equal(item.assessmentScenarioExecutionBasis.datasetId, 'plant-a');
});

test('missing source scenario blocks linked AIV before calculation callback', () => {
  let calls = 0;
  assert.throws(
    () => executeAivWithFacilityScenarioCustody({
      facilityLinkIntent: true,
      facilityScenarioHandoff: currentHandoff(),
      facilityScenarioHandoffStatus: 'CURRENT',
      readinessEnvelope: readiness('L-MISSING', 'L-ASSESS'),
      request: { calculationId: 'VIB.AIV.ACOUSTIC' },
      calculate: () => { calls += 1; return screeningResult(); },
    }),
    (error) => error.code === 'AIV_FACILITY_SOURCE_SCENARIO_MISSING',
  );
  assert.equal(calls, 0);
});

test('non-current facility link blocks AIV before calculation callback', () => {
  let calls = 0;
  assert.throws(
    () => executeAivWithFacilityScenarioCustody({
      facilityLinkIntent: true,
      facilityScenarioHandoff: null,
      facilityScenarioHandoffStatus: 'FACILITY_RESULT_NOT_CURRENT',
      readinessEnvelope: readiness(),
      request: { calculationId: 'VIB.AIV.ACOUSTIC' },
      calculate: () => { calls += 1; return screeningResult(); },
    }),
    (error) => error.code === 'AIV_FACILITY_SCENARIO_HANDOFF_NOT_CURRENT',
  );
  assert.equal(calls, 0);
});

test('exact linked facility custody reaches AIV callback once and returns the plan', () => {
  let calls = 0;
  const executed = executeAivWithFacilityScenarioCustody({
    facilityLinkIntent: true,
    facilityScenarioHandoff: currentHandoff(),
    facilityScenarioHandoffStatus: 'CURRENT',
    readinessEnvelope: readiness(),
    request: { calculationId: 'VIB.AIV.ACOUSTIC' },
    calculate: (request) => { calls += 1; return { ok: true, calculationId: request.calculationId }; },
  });
  assert.equal(calls, 1);
  assert.equal(executed.result.ok, true);
  assert.equal(executed.scenarioExecutionPlan.cardinality, 1);
});

test('standalone AIV remains executable but produces no facility scenario plan', () => {
  let calls = 0;
  const executed = executeAivWithFacilityScenarioCustody({
    facilityLinkIntent: false,
    readinessEnvelope: readiness(),
    request: { calculationId: 'VIB.AIV.ACOUSTIC' },
    calculate: () => { calls += 1; return { ok: true }; },
  });
  assert.equal(calls, 1);
  assert.equal(executed.scenarioExecutionPlan, null);
});

test('facility admission detects an older AIV assessment snapshot after a later facility rerun', () => {
  const oldHandoff = currentHandoff(100);
  const plan = buildAivFacilityScenarioExecutionPlan({ handoff: oldHandoff, readinessEnvelope: readiness() });
  const newer = scenarioSet('plant-a', 101).find((item) => item.line === 'L-ASSESS');
  const admission = inspectAivFacilityScenarioPlanForAssessment(plan, {
    line: 'L-ASSESS', caseId: 'NORMAL', canonicalId: 'CAN-1',
    scenarioExecutionBasis: {
      datasetId: newer.datasetId, scenarioId: newer.scenarioId,
      scenarioSnapshotHash: newer.snapshotHash, line: newer.line, caseId: newer.caseId,
    },
  });
  assert.equal(admission.ok, false);
  assert.equal(admission.status, 'AIV_FACILITY_SCENARIO_STALE');
});

test('session classifies linked and standalone AIV evidence without changing screening authority', () => {
  clearCurrentAivScreeningSession();
  const standalone = publishCurrentAivScreeningSession(screeningResult(), { inputRevision: 1 });
  assert.equal(standalone.executionContext, 'STANDALONE');
  assert.equal(standalone.scenarioExecutionPlan, null);

  const plan = buildAivFacilityScenarioExecutionPlan({ handoff: currentHandoff(), readinessEnvelope: readiness() });
  const linked = publishCurrentAivScreeningSession(screeningResult(), {
    inputRevision: 2, scenarioExecutionPlan: plan,
  });
  assert.equal(linked.executionContext, 'FACILITY_LINKED');
  assert.equal(linked.scenarioExecutionPlan, plan);
  assert.equal(linked.authority.screeningAuthority, 'INHERITED_FROM_REGISTERED_AIV_RESULT');
  assert.equal(linked.authority.designAuthority, false);
  clearCurrentAivScreeningSession();
});
