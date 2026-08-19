import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyVibrationMeasurementEvidencePackage } from '../converters/vibration/project/measurement.js';
import { createVibrationAssessmentEvidenceReceipt } from '../converters/vibration/project/assessment-evidence.js';
import { assertVibrationIntegrityProject } from '../converters/vibration/project/schema.js';
import {
  parseVibrationIntegrityProject,
  parseVibrationIntegrityProjectWithCurrentness,
  serializeVibrationIntegrityProject,
  upgradeVibrationIntegrityProjectToV2,
} from '../converters/vibration/project/serialize.js';
import { verificationEvidencePackage, verificationScope } from './vibration-verification-fixtures.mjs';

const METHOD_HASH = `sha256:${'1'.repeat(64)}`;
const INPUT_HASH = `sha256:${'2'.repeat(64)}`;
const SOURCE_HASH = `sha256:${'3'.repeat(64)}`;
const STALE_INPUT_HASH = `sha256:${'4'.repeat(64)}`;

function authorityV1() {
  return {
    containerAuthority: 'PERSISTENCE_CONTAINER_ONLY',
    importedResultsAreCurrentEngineeringAuthority: false,
    measurementEvidenceIsCurrentEngineeringAuthority: false,
    screeningAuthorized: false,
    designAuthority: false,
    rootCauseAuthority: false,
  };
}

function projectV1(measurementEvidence = createEmptyVibrationMeasurementEvidencePackage()) {
  return {
    schema: 'VibrationIntegrityProject.v1',
    project: { projectId: 'P-1', title: 'Project V1' },
    subjects: { lines: [{ lineId: 'L-1' }] },
    mechanismImports: [], currentResults: [], measurements: [], measurementEvidence,
    actions: [], authority: authorityV1(),
  };
}

function basis(overrides = {}) {
  return {
    methodId: 'VIB.FIV.FLOW_TURBULENCE', methodRevision: 'R1', qualificationRevision: 'Q1',
    methodDefinitionHash: METHOD_HASH, engineeringInputsHash: INPUT_HASH, sourceBasisHash: SOURCE_HASH,
    ...overrides,
  };
}

function assessmentReceipt(overrides = {}) {
  return createVibrationAssessmentEvidenceReceipt({
    receiptId: 'AE-1', assessmentItemId: 'AI-1', mechanismId: 'fit',
    scope: { line: 'L-1', caseId: 'NORMAL', canonicalId: 'CAN-1' },
    calculatedAt: '2026-08-19T12:00:00Z', basis: basis(), resultStateAtCalculation: 'CURRENT_RESULT',
    resultPayload: { lof: 0.2 },
    authorityAtCalculation: {
      qualificationEffective: 'SCREENING', engineeringAuthority: 'SCREENING', screeningAuthority: 'AUTHORIZED_BOUNDED',
      designAuthority: false, rootCauseAuthority: false, codeCompliance: false,
    },
    ...overrides,
  });
}

function v2WithAssessmentReceipt() {
  const project = JSON.parse(JSON.stringify(upgradeVibrationIntegrityProjectToV2(projectV1())));
  project.assessmentEvidence.receipts.push(assessmentReceipt());
  return project;
}

function verificationRequirement(scope = verificationScope()) {
  return {
    requirementId: 'VR-1', scope, mechanismId: 'mechanicalExcitation',
    requirementType: 'BASIC_MEASUREMENT', reason: 'Confirm exact operating-case response.',
    requiredProductTypes: ['OVERALL'],
  };
}

function verificationDisposition(scope = verificationScope(), evidence = { sessionIds: ['MS-1'], productIds: ['SP-1'] }) {
  return {
    dispositionId: 'VD-1', requirementId: 'VR-1', scope, mechanismId: 'mechanicalExcitation',
    outcome: 'EVIDENCE_ACCEPTED_FOR_REQUIREMENT', evidence,
    review: { reviewerId: 'eng-1', reviewedAt: '2026-08-19T12:30:00Z' },
    reason: 'Exact-scope evidence reviewed.',
  };
}

function visualRecord(scope = verificationScope()) {
  return {
    inspectionId: 'VI-1', scope, inspectedAt: '2026-08-19T12:15:00Z',
    inspector: { inspectorId: 'inspector-1' },
    subject: { subjectType: 'PIPE_OR_COMPONENT', subjectId: 'CAN-1' },
    observations: [{ observationId: 'OBS-1', code: 'FRETTING_OR_WEAR', state: 'NOT_OBSERVED' }],
    evidenceRefs: [],
    source: { source: 'FIELD-WALKDOWN', sourceRevision: 'R1', recordId: 'VI-1' },
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, code);
}

test('V1 parse/save migrates deterministically to V2 without current-result promotion', () => {
  const text = JSON.stringify(projectV1());
  const migrated = parseVibrationIntegrityProject(text);
  assert.equal(migrated.schema, 'VibrationIntegrityProject.v2');
  assert.equal(migrated.currentResults.length, 0);
  assert.equal(migrated.assessmentEvidence.receipts.length, 0);
  assert.deepEqual(migrated.verificationRequirements, []);
  assert.deepEqual(migrated.verificationDispositions, []);
  assert.equal(migrated.visualInspectionEvidence.records.length, 0);
  assert.equal(migrated.authority.assessmentEvidenceIsCurrentEngineeringAuthority, false);
  assert.equal(parseVibrationIntegrityProject(serializeVibrationIntegrityProject(migrated)).schema, 'VibrationIntegrityProject.v2');
});

test('V2 persists assessment evidence but load currentness remains non-authorizing', () => {
  const text = serializeVibrationIntegrityProject(v2WithAssessmentReceipt());
  const loaded = parseVibrationIntegrityProjectWithCurrentness(text, {
    currentBasisByAssessmentItemId: { 'AI-1': basis() },
  });
  assert.equal(loaded.project.assessmentEvidence.receipts.length, 1);
  assert.equal(loaded.currentness.assessmentEvidenceCurrentness.results[0].state, 'EVIDENCE_CURRENT');
  assert.equal(loaded.currentness.authority.createsCurrentEngineeringResult, false);
  assert.equal(loaded.currentness.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(loaded.project.currentResults.length, 0);
});

test('load currentness exposes stale and unavailable receipt basis without promotion', () => {
  const text = serializeVibrationIntegrityProject(v2WithAssessmentReceipt());
  const stale = parseVibrationIntegrityProjectWithCurrentness(text, {
    currentBasisByAssessmentItemId: { 'AI-1': basis({ engineeringInputsHash: STALE_INPUT_HASH }) },
  });
  assert.equal(stale.currentness.assessmentEvidenceCurrentness.results[0].state, 'STALE_EVIDENCE');
  assert.deepEqual(stale.currentness.assessmentEvidenceCurrentness.results[0].reasons, ['ENGINEERING_INPUTS_CHANGED']);
  const unavailable = parseVibrationIntegrityProjectWithCurrentness(text);
  assert.equal(unavailable.currentness.assessmentEvidenceCurrentness.results[0].state, 'BASIS_UNAVAILABLE');
});

test('V2 persists exact-scope verification requirements and engineer dispositions', () => {
  const project = JSON.parse(JSON.stringify(upgradeVibrationIntegrityProjectToV2(projectV1(verificationEvidencePackage()))));
  project.verificationRequirements = [verificationRequirement()];
  project.verificationDispositions = [verificationDisposition()];
  assert.equal(assertVibrationIntegrityProject(project), project);
  const restored = parseVibrationIntegrityProject(serializeVibrationIntegrityProject(project));
  assert.equal(restored.verificationDispositions[0].outcome, 'EVIDENCE_ACCEPTED_FOR_REQUIREMENT');
  assert.equal(restored.authority.verificationDispositionIsScreeningAuthority, false);
});

test('V2 rejects disposition scope mismatch and unknown measurement evidence references', () => {
  const project = JSON.parse(JSON.stringify(upgradeVibrationIntegrityProjectToV2(projectV1(verificationEvidencePackage()))));
  project.verificationRequirements = [verificationRequirement()];
  project.verificationDispositions = [verificationDisposition(verificationScope({ caseId: 'STARTUP' }))];
  expectCode(() => assertVibrationIntegrityProject(project), 'VIBRATION_PROJECT_VERIFICATION_DISPOSITION_SCOPE_MISMATCH');
  project.verificationDispositions = [verificationDisposition(verificationScope(), { sessionIds: [], productIds: ['SP-NOT-THERE'] })];
  expectCode(() => assertVibrationIntegrityProject(project), 'VIBRATION_PROJECT_VERIFICATION_EVIDENCE_REFERENCE_UNKNOWN');
});

test('V2 persists visual field evidence without promoting its authority', () => {
  const project = JSON.parse(JSON.stringify(upgradeVibrationIntegrityProjectToV2(projectV1())));
  project.visualInspectionEvidence.records = [visualRecord()];
  assert.equal(assertVibrationIntegrityProject(project), project);
  const restored = parseVibrationIntegrityProject(serializeVibrationIntegrityProject(project));
  assert.equal(restored.visualInspectionEvidence.records.length, 1);
  assert.equal(restored.visualInspectionEvidence.authority.eiChecklistCoverage, 'NOT_CLAIMED_NON_EXHAUSTIVE_CAPTURE');
  assert.equal(restored.authority.visualInspectionEvidenceIsCurrentEngineeringAuthority, false);
});

test('V2 rejects persisted evidence that references an unknown project line', () => {
  const assessment = JSON.parse(JSON.stringify(v2WithAssessmentReceipt()));
  assessment.assessmentEvidence.receipts[0].scope.line = 'L-404';
  expectCode(() => assertVibrationIntegrityProject(assessment), 'VIBRATION_PROJECT_ASSESSMENT_EVIDENCE_DANGLING_LINE');
  const visual = JSON.parse(JSON.stringify(upgradeVibrationIntegrityProjectToV2(projectV1())));
  visual.visualInspectionEvidence.records = [visualRecord(verificationScope({ lineId: 'L-404' }))];
  expectCode(() => assertVibrationIntegrityProject(visual), 'VIBRATION_PROJECT_VISUAL_EVIDENCE_DANGLING_LINE');
});

test('V2 still rejects persisted current-result authority and forged project authority', () => {
  const result = JSON.parse(JSON.stringify(upgradeVibrationIntegrityProjectToV2(projectV1())));
  result.currentResults.push({ result: 'forbidden' });
  expectCode(() => assertVibrationIntegrityProject(result), 'VIBRATION_PROJECT_CURRENT_RESULT_CONTRACT_UNQUALIFIED');
  const forged = JSON.parse(JSON.stringify(upgradeVibrationIntegrityProjectToV2(projectV1())));
  forged.authority.assessmentEvidenceIsCurrentEngineeringAuthority = true;
  expectCode(() => assertVibrationIntegrityProject(forged), 'VIBRATION_PROJECT_AUTHORITY_INVALID');
});
