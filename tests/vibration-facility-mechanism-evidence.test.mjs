import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAivFacilityScenarioExecutionPlan } from '../converters/vibration/aiv/aiv-facility-scenario-plan.js';
import {
  VIBRATION_OPERATING_SCENARIO_DECLARATION,
  assembleVibrationIntegrityDataset,
  buildVibrationOperatingScenario,
} from '../converters/vibration/dataset/index.js';
import {
  VIBRATION_FACILITY_MECHANISM_EVIDENCE_AUTHORITY,
  VIBRATION_FACILITY_MECHANISM_EVIDENCE_SCHEMA,
  buildVibrationFacilityMechanismEvidence,
} from '../converters/vibration/facility/mechanism-evidence.js';
import { createVibrationFacilityScenarioHandoff } from '../converters/vibration/facility/scenario-handoff.js';
import { mechanicalFacilityScope, mechanicalFacilityScopeId } from '../converters/vibration/mechanical/facility.js';
import { sbcFacilityScopeId } from '../converters/vibration/sbc/facility.js';
import {
  VIBRATION_TABLE_EXCHANGE_INTEGRITY,
  VIBRATION_TABLE_EXCHANGE_SCHEMA,
} from '../converters/vibration/exchange/schema.js';

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

function operatingCases(sourceFlow = 100, assessmentFlow = 80) {
  return [
    {
      caseId: 'NORMAL', line: 'L-SOURCE', phase: 'GAS', source: 'HMB-1',
      sourceRevision: 'A', recordId: 'HMB-SOURCE-NORMAL',
      massFlow: { value: sourceFlow, unit: 'kg/s' },
      pressure: { value: 20, unit: 'barg', reference: 'gauge' },
    },
    {
      caseId: 'NORMAL', line: 'L-ASSESS', phase: 'GAS', source: 'HMB-1',
      sourceRevision: 'A', recordId: 'HMB-ASSESS-NORMAL',
      massFlow: { value: assessmentFlow, unit: 'kg/s' },
      pressure: { value: 15, unit: 'barg', reference: 'gauge' },
    },
  ];
}

function dataset(sourceFlow = 100, assessmentFlow = 80) {
  return assembleVibrationIntegrityDataset({
    exchange: exchange(),
    operatingCases: operatingCases(sourceFlow, assessmentFlow),
    enrichment: [],
  });
}

function scenarios(sourceFlow = 100, assessmentFlow = 80) {
  const source = dataset(sourceFlow, assessmentFlow);
  return ['L-SOURCE', 'L-ASSESS'].map((line) => buildVibrationOperatingScenario(source, {
    line,
    caseId: 'NORMAL',
    coherenceDeclaration: VIBRATION_OPERATING_SCENARIO_DECLARATION,
  }));
}

function executionBasis(scenario) {
  return Object.freeze({
    schema: 'VibrationScenarioExecutionBasis.v1',
    scenarioId: scenario.scenarioId,
    scenarioSnapshotHash: scenario.snapshotHash,
    datasetId: scenario.datasetId,
    line: scenario.line,
    caseId: scenario.caseId,
  });
}

function fixture(sourceFlow = 100, assessmentFlow = 80) {
  const operatingScenarios = scenarios(sourceFlow, assessmentFlow);
  const handoff = createVibrationFacilityScenarioHandoff({
    operatingScenarios,
    runId: 'FIT-RUN-1',
  });
  const assessmentScenario = operatingScenarios.find((item) => item.line === 'L-ASSESS');
  const row = Object.freeze({
    line: 'L-ASSESS',
    caseId: 'NORMAL',
    canonicalId: 'CAN-1',
    scenarioSetKey: handoff.scenarioSetKey,
    scenarioExecutionBasis: executionBasis(assessmentScenario),
  });
  return { operatingScenarios, handoff, row };
}

function readiness() {
  return {
    schema: 'AivReadinessTableEnvelope.v2',
    readiness: {
      rows: [{
        rowKey: JSON.stringify(['RV-101', 'CAN-1', 'NORMAL']),
        status: 'READY_FOR_QUALIFICATION',
        sourceCanonicalId: 'RV-101',
        assessmentCanonicalId: 'CAN-1',
        sourceLine: 'L-SOURCE',
        assessmentLine: 'L-ASSESS',
        caseId: 'NORMAL',
      }],
    },
  };
}

function mechanical(row, basis = row.scenarioExecutionBasis) {
  return Object.freeze({
    schema: 'MechanicalFacilityScreeningResult.v1',
    status: 'CALCULATED_SCREENING',
    scope: mechanicalFacilityScope(row),
    sourceKeys: Object.freeze(['ELECTRIC_MOTOR_OR_ALTERNATOR_GE_15KW']),
    governingLof: 0.4,
    governingSourceKey: 'ELECTRIC_MOTOR_OR_ALTERNATOR_GE_15KW',
    rows: Object.freeze([]),
    provenance: Object.freeze({}),
    methodId: 'VIB.MECHANICAL.T2_3.BASELINE',
    methodRevision: 'test',
    authority: Object.freeze({
      engineeringAuthority: 'SCREENING',
      screeningAuthority: 'AUTHORIZED',
      authorityScope: 'DIRECT_TABLE_T2_3_BASELINE_ONLY',
      dynamicReductionAuthorized: false,
      sharedSupportTransferAuthorized: false,
      designAuthority: false,
    }),
    scenarioExecutionBasis: basis,
  });
}

function sbc(row, basis = row.scenarioExecutionBasis) {
  return Object.freeze({
    schema: 'SbcType3Candidate.v1',
    ok: true,
    status: 'CALCULATED_CANDIDATE',
    scopeId: sbcFacilityScopeId(row),
    lof: 0.7,
    authority: Object.freeze({
      engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false, masterDataAuthority: false,
    }),
    scenarioExecutionBasis: basis,
  });
}

function linkedAivSession(handoff, lof = 0.42) {
  const plan = buildAivFacilityScenarioExecutionPlan({ handoff, readinessEnvelope: readiness() });
  return Object.freeze({
    schema: 'AivScreeningSessionEvidence.v1',
    executionContext: 'FACILITY_LINKED',
    scenarioExecutionPlan: plan,
    screeningResult: Object.freeze({
      outputs: Object.freeze({
        assessmentResults: Object.freeze([Object.freeze({
          schema: 'AivAssessmentResult.v1',
          status: 'SCREENING_CALCULATED',
          assessmentCanonicalId: 'CAN-1',
          line: 'L-ASSESS',
          caseId: 'NORMAL',
          lof,
          authority: Object.freeze({
            engineeringAuthority: 'SCREENING',
            screeningAuthority: 'AUTHORIZED',
            designAuthority: false,
          }),
        })]),
      }),
    }),
  });
}

function build(options = {}) {
  const base = options.base ?? fixture();
  return buildVibrationFacilityMechanismEvidence({
    runId: 'FIT-RUN-1',
    datasetId: 'plant-a',
    scenarioSetKey: base.handoff.scenarioSetKey,
    registerRows: [base.row],
    mechanicalResultsByScope: options.mechanicalResultsByScope ?? {},
    sbcResultsByScope: options.sbcResultsByScope ?? {},
    aivSession: options.aivSession ?? null,
  });
}

test('mechanism evidence envelope has no applicability, completeness, governing or blocking authority', () => {
  const evidence = build();
  assert.equal(evidence.schema, VIBRATION_FACILITY_MECHANISM_EVIDENCE_SCHEMA);
  assert.deepEqual(evidence.authority, VIBRATION_FACILITY_MECHANISM_EVIDENCE_AUTHORITY);
  assert.equal(evidence.summary.currentCount, 0);
  assert.equal(evidence.summary.excludedCount, 0);
  assert.equal(evidence.summary.completenessDetermined, false);
  assert.equal(evidence.summary.governingResultDetermined, false);
  assert.equal(evidence.authority.blocksExecution, false);
  assert.equal(evidence.authority.blocksNavigation, false);
});

test('exact Mechanical and SBC scenario custody is admitted while preserving their different authority tiers', () => {
  const base = fixture();
  const mechanicalResult = mechanical(base.row);
  const sbcResult = sbc(base.row);
  const evidence = build({
    base,
    mechanicalResultsByScope: { [mechanicalFacilityScopeId(base.row)]: mechanicalResult },
    sbcResultsByScope: { [sbcFacilityScopeId(base.row)]: sbcResult },
  });
  assert.equal(evidence.currentEvidence.length, 2);
  const mech = evidence.currentEvidence.find((item) => item.mechanismId === 'mechanicalExcitation');
  const smallBore = evidence.currentEvidence.find((item) => item.mechanismId === 'smallBoreConnections');
  assert.equal(mech.evidenceTier, 'SCREENING');
  assert.equal(mech.value.governingLof, 0.4);
  assert.equal(mech.authority.screeningAuthority, 'AUTHORIZED');
  assert.equal(smallBore.evidenceTier, 'CANDIDATE');
  assert.equal(smallBore.value.lof, 0.7);
  assert.equal(smallBore.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(evidence.excludedEvidence.length, 0);
});

test('stale Mechanical and SBC snapshots are excluded without retaining numerical values', () => {
  const base = fixture();
  const staleBasis = { ...base.row.scenarioExecutionBasis, scenarioSnapshotHash: 'stale-snapshot' };
  const evidence = build({
    base,
    mechanicalResultsByScope: { [mechanicalFacilityScopeId(base.row)]: mechanical(base.row, staleBasis) },
    sbcResultsByScope: { [sbcFacilityScopeId(base.row)]: sbc(base.row, staleBasis) },
  });
  assert.equal(evidence.currentEvidence.length, 0);
  assert.equal(evidence.excludedEvidence.length, 2);
  assert(evidence.excludedEvidence.every((item) => item.reason === 'SCENARIO_BASIS_MISMATCH'));
  assert(evidence.excludedEvidence.every((item) => item.numericalValueRetained === false));
});

test('standalone AIV is explicitly retained as excluded, not silently promoted to facility evidence', () => {
  const evidence = build({
    aivSession: { schema: 'AivScreeningSessionEvidence.v1', executionContext: 'STANDALONE' },
  });
  assert.equal(evidence.currentEvidence.length, 0);
  assert.equal(evidence.excludedEvidence.length, 1);
  assert.equal(evidence.excludedEvidence[0].mechanismId, 'aiv');
  assert.equal(evidence.excludedEvidence[0].reason, 'AIV_STANDALONE_NOT_FACILITY_EVIDENCE');
});

test('current facility-linked AIV assessment is admitted at assessment scope only', () => {
  const base = fixture();
  const evidence = build({ base, aivSession: linkedAivSession(base.handoff) });
  assert.equal(evidence.currentEvidence.length, 1);
  const aiv = evidence.currentEvidence[0];
  assert.equal(aiv.mechanismId, 'aiv');
  assert.equal(aiv.evidenceTier, 'ASSESSMENT_SCREENING');
  assert.equal(aiv.scope.canonicalId, 'CAN-1');
  assert.equal(aiv.value.lof, 0.42);
  assert.equal(aiv.linkedFacilityRunId, 'FIT-RUN-1');
  assert.equal(evidence.summary.governingResultDetermined, false);
});

test('source-line-only facility scenario drift excludes previously linked AIV even when assessment basis is unchanged', () => {
  const oldBase = fixture(100, 80);
  const newerBase = fixture(101, 80);
  assert.equal(oldBase.row.scenarioExecutionBasis.scenarioSnapshotHash,
    newerBase.row.scenarioExecutionBasis.scenarioSnapshotHash);
  assert.notEqual(oldBase.handoff.scenarioSetKey, newerBase.handoff.scenarioSetKey);
  const evidence = buildVibrationFacilityMechanismEvidence({
    runId: 'FIT-RUN-2',
    datasetId: 'plant-a',
    scenarioSetKey: newerBase.handoff.scenarioSetKey,
    registerRows: [newerBase.row],
    aivSession: linkedAivSession(oldBase.handoff),
  });
  assert.equal(evidence.currentEvidence.length, 0);
  assert.equal(evidence.excludedEvidence.length, 1);
  assert.equal(evidence.excludedEvidence[0].reason, 'AIV_FACILITY_SCENARIO_SET_STALE');
});

test('base facility register rows from another scenario set fail closed', () => {
  const oldBase = fixture(100, 80);
  const newerBase = fixture(101, 80);
  assert.throws(
    () => buildVibrationFacilityMechanismEvidence({
      runId: 'FIT-RUN-2',
      datasetId: 'plant-a',
      scenarioSetKey: newerBase.handoff.scenarioSetKey,
      registerRows: [oldBase.row],
    }),
    (error) => error.code === 'VIBRATION_FACILITY_MECHANISM_EVIDENCE_BASE_RUN_MISMATCH',
  );
});
