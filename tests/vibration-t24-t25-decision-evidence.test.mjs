import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  addVibrationPulsationDecisionEvidenceRecord,
  buildVibrationPulsationDecisionEvidenceWorkspace,
  createVibrationPulsationDecisionEvidenceStore,
  recordVibrationPulsationDecisionReview,
  updateVibrationPulsationDecisionApplicability,
  updateVibrationPulsationDecisionEvidenceRef,
  updateVibrationPulsationDecisionScope,
} from '../tabs/vibration-integrity-pulsation-decision-evidence-model.js';

const root = fileURLToPath(new URL('..', import.meta.url));

function setScope(store, recordId) {
  let next = updateVibrationPulsationDecisionScope(store, recordId, 'line', 'L-2401');
  next = updateVibrationPulsationDecisionScope(next, recordId, 'caseId', 'NORMAL');
  return updateVibrationPulsationDecisionScope(next, recordId, 'canonicalId', 'EQ-2401');
}

function fill(store, recordId, entries) {
  let next = store;
  for (const [key, value] of Object.entries(entries)) {
    next = updateVibrationPulsationDecisionEvidenceRef(next, recordId, key, value);
  }
  return next;
}

test('T2.4 applicable evidence can become project-complete but never numerically executable', () => {
  let store = addVibrationPulsationDecisionEvidenceRecord(createVibrationPulsationDecisionEvidenceStore(), 'reciprocatingPulsation');
  const id = store.records[0].recordId;
  store = setScope(store, id);
  store = updateVibrationPulsationDecisionApplicability(store, id, 'APPLICABLE');
  store = fill(store, id, {
    equipmentIdentityRef: 'OEM-DATASHEET-RPD-1',
    operatingScenarioRef: 'OPERATING-CASE-NORMAL',
    applicabilityBasisRef: 'PROJECT-T24-DISPOSITION-1',
    pulsationEvidenceRef: 'PULSATION-STUDY-PS-14',
    systemResponseEvidenceRef: 'ACOUSTIC-RESPONSE-AR-8',
  });
  const record = buildVibrationPulsationDecisionEvidenceWorkspace(store).records[0];
  assert.equal(record.projectEvidenceComplete, true);
  assert.equal(record.sourceMasterId, 'EI_AVIFF.T2.4.RECIP_PD_RULES.v1');
  assert.equal(record.sourceBinding.status, 'RECONCILIATION_REQUIRED');
  assert.equal(record.controlledRuleContentExecuted, false);
  assert.equal(record.numericalExecutionAllowed, false);
  assert.equal(record.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(record.authority.governingEligible, false);
  assert.equal(record.status, 'PROJECT_EVIDENCE_COMPLETE_SOURCE_RECONCILIATION_REQUIRED');
});

test('NOT_APPLICABLE remains explicit and evidence-backed without requiring applicable-only studies', () => {
  let store = addVibrationPulsationDecisionEvidenceRecord(createVibrationPulsationDecisionEvidenceStore(), 'rotatingStall');
  const id = store.records[0].recordId;
  store = setScope(store, id);
  store = updateVibrationPulsationDecisionApplicability(store, id, 'NOT_APPLICABLE');
  store = fill(store, id, {
    equipmentIdentityRef: 'COMPRESSOR-DATASHEET-C-1',
    operatingScenarioRef: 'CASE-NORMAL',
    applicabilityBasisRef: 'OEM-NONSTALL-DISPOSITION-1',
  });
  const record = buildVibrationPulsationDecisionEvidenceWorkspace(store).records[0];
  assert.equal(record.projectEvidenceComplete, true);
  assert.equal(record.fields.find((field) => field.key === 'oemPerformanceMapRef').required, false);
  assert.equal(record.fields.find((field) => field.key === 'operatingPointAssessmentRef').required, false);
  assert.equal(record.authority.automaticApplicability, false);
});

test('T2.5 applicable evidence requires OEM map and operating-point assessment references', () => {
  let store = addVibrationPulsationDecisionEvidenceRecord(createVibrationPulsationDecisionEvidenceStore(), 'rotatingStall');
  const id = store.records[0].recordId;
  store = setScope(store, id);
  store = updateVibrationPulsationDecisionApplicability(store, id, 'APPLICABLE');
  store = fill(store, id, {
    equipmentIdentityRef: 'COMPRESSOR-C-2',
    operatingScenarioRef: 'LOW-FLOW-CASE',
    applicabilityBasisRef: 'PROJECT-T25-DISPOSITION-2',
  });
  let record = buildVibrationPulsationDecisionEvidenceWorkspace(store).records[0];
  assert.equal(record.projectEvidenceComplete, false);
  assert.deepEqual(record.missingEvidence.sort(), ['oemPerformanceMapRef', 'operatingPointAssessmentRef'].sort());
  store = fill(store, id, {
    oemPerformanceMapRef: 'OEM-MAP-REV-C',
    operatingPointAssessmentRef: 'STALL-ASSESSMENT-SA-4',
  });
  record = buildVibrationPulsationDecisionEvidenceWorkspace(store).records[0];
  assert.equal(record.projectEvidenceComplete, true);
});

test('review cannot be recorded for incomplete project evidence and becomes stale after revision', () => {
  let store = addVibrationPulsationDecisionEvidenceRecord(createVibrationPulsationDecisionEvidenceStore(), 'reciprocatingPulsation');
  const id = store.records[0].recordId;
  assert.throws(() => recordVibrationPulsationDecisionReview(store, id, 'Engineer A', 'REV-1'), /PROJECT_EVIDENCE_INCOMPLETE/);
  store = setScope(store, id);
  store = updateVibrationPulsationDecisionApplicability(store, id, 'NOT_APPLICABLE');
  store = fill(store, id, {
    equipmentIdentityRef: 'RPD-3',
    operatingScenarioRef: 'CASE-3',
    applicabilityBasisRef: 'DISPOSITION-3',
  });
  store = recordVibrationPulsationDecisionReview(store, id, 'Engineer A', 'REVIEW-MINUTE-17');
  let record = buildVibrationPulsationDecisionEvidenceWorkspace(store).records[0];
  assert.equal(record.review.current, true);
  assert.equal(record.status, 'PROJECT_REVIEW_CURRENT_SOURCE_RECONCILIATION_REQUIRED');
  store = updateVibrationPulsationDecisionEvidenceRef(store, id, 'applicabilityBasisRef', 'DISPOSITION-3-REV-B');
  record = buildVibrationPulsationDecisionEvidenceWorkspace(store).records[0];
  assert.equal(record.review.current, false);
  assert.equal(record.status, 'PROJECT_EVIDENCE_COMPLETE_SOURCE_RECONCILIATION_REQUIRED');
});

test('source-register T2.4 row uses the governed family mechanism id without changing locator authority', () => {
  const register = JSON.parse(readFileSync(`${root}/docs/Masters/Vibration/source-register.json`, 'utf8'));
  const t24 = register.entries.find((entry) => entry.masterId === 'EI_AVIFF.T2.4.RECIP_PD_RULES.v1');
  const t25 = register.entries.find((entry) => entry.masterId === 'EI_AVIFF.T2.5.ROTATING_STALL_RULES.v1');
  assert.equal(t24.mechanismId, 'reciprocatingPulsation');
  assert.equal(t24.locator.identifier, 'Flowchart T2-2');
  assert.equal(t24.locator.locatorStatus, 'NAVIGATION_ONLY');
  assert.equal(t25.mechanismId, 'rotatingStall');
  assert.equal(t25.locator.identifier, 'Flowchart T2-3');
  assert.equal(t25.locator.locatorStatus, 'NAVIGATION_ONLY');
  assert.equal(JSON.stringify(register).includes('reciprocatingPositiveDisplacement'), false);
});

test('evidence model and UI expose no numerical rule execution seam', () => {
  const model = readFileSync(`${root}/tabs/vibration-integrity-pulsation-decision-evidence-model.js`, 'utf8');
  const view = readFileSync(`${root}/tabs/vibration-integrity-pulsation-decision-evidence-view.js`, 'utf8');
  const matrix = readFileSync(`${root}/tabs/vibration-integrity-mechanisms.js`, 'utf8');
  assert.equal(/export function calculate[A-Z]/.test(model), false);
  assert.equal(model.includes('governingLof'), false);
  assert.equal(model.includes('threshold'), false);
  assert.ok(model.includes('numericalExecutionAllowed: false'));
  assert.ok(model.includes("secondarySynthesisAuthority: 'NONE'"));
  assert.equal(view.includes('data-vi-puls-decision-evaluate'), false);
  assert.ok(view.includes('Numerical execution: <strong>BLOCKED</strong>'));
  assert.equal(matrix.includes('pulsation-decision-evidence'), false);
});
