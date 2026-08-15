import assert from 'node:assert/strict';
import test from 'node:test';
import { sbcFacilityScopeId } from '../converters/vibration/sbc/facility.js';
import { buildVibrationMechanismMatrixRow } from '../tabs/vibration-integrity-mechanisms.js';
import { createVibrationUserDataUiState } from '../tabs/vibration-integrity-user-data-shell.js';
import { renderSbcType3UserInputPanel } from '../tabs/vibration-integrity-sbc-type3-view.js';

function row() {
  return {
    line: 'L-100', caseId: 'NORMAL', canonicalId: 'CAN-1',
    standardLof: 0.34, governingReferenceLof: 0.34,
    referenceBand: 'LOF_0_3_TO_LT_0_5', qualificationState: 'SCREENING',
  };
}

function precomputed(scopeId, lof = 0.7) {
  return Object.freeze({
    ok: true,
    status: 'CALCULATED_MASTER_ASSISTED_CANDIDATE',
    methodId: 'VIB.SBC.T3.TYPE3.MASTER_ASSISTED_CANDIDATE',
    scopeId,
    firstSpan: Object.freeze({
      hasUnsupportedMass: true, c: 0.68, d: 0.2, e: 0.7,
      geometryLof: 0.7, locationLof: 1, modifier: 0.7,
    }),
    subsequentSpans: Object.freeze({
      f: 0.6, g: 0.2, geometryLof: 0.6, locationLof: 1, modifier: 0.6,
    }),
    overallModifier: 0.7,
    mainline: Object.freeze({ lof: 1, multiplier: 1.42, adjustedLof: 1.42 }),
    lof,
    evidence: Object.freeze([]),
    masterAssistance: Object.freeze({ geometryC: 0.68, minimumSpanE: 0.7 }),
    curveMasterStatus: Object.freeze([]),
    authority: Object.freeze({
      engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false, masterDataAuthority: false,
    }),
  });
}

test('scope-matched master-assisted SBC remains candidate while FIT remains screening governing', () => {
  const target = row();
  const scopeId = sbcFacilityScopeId(target);
  const matrix = buildVibrationMechanismMatrixRow(target, {
    resultState: 'CURRENT_RESULT',
    sbcMasterAssistedScopes: { [scopeId]: true },
    sbcPrecomputedByScope: { [scopeId]: precomputed(scopeId) },
  });
  const sbc = matrix.assessments.find((item) => item.mechanism.id === 'smallBoreConnections');
  assert.equal(sbc.calculated, true);
  assert.equal(sbc.lof, 0.7);
  assert.equal(sbc.assessmentState, 'CALCULATED_CANDIDATE');
  assert.equal(sbc.contractSet.items[0].request.evidenceClass, 'CANDIDATE_EI_MASTER_PLUS_USER_PROJECT_INPUT');
  assert.equal(sbc.contractSet.items[0].qualification.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(matrix.screeningGoverning.mechanism.id, 'fit');
  assert.equal(matrix.screeningGoverning.lof, 0.34);
  assert.equal(matrix.candidateGoverning.mechanism.id, 'smallBoreConnections');
  assert.equal(matrix.candidateGoverning.lof, 0.7);
  assert.equal(matrix.fullScreeningGoverningEstablished, false);
});

test('master-assisted mode without a cached calculation stays input-required instead of falling back to legacy rows', () => {
  const target = row();
  const scopeId = sbcFacilityScopeId(target);
  const matrix = buildVibrationMechanismMatrixRow(target, {
    resultState: 'CURRENT_RESULT',
    sbcMasterAssistedScopes: { [scopeId]: true },
    userEngineeringDataRows: [],
  });
  const sbc = matrix.assessments.find((item) => item.mechanism.id === 'smallBoreConnections');
  assert.equal(sbc.calculated, false);
  assert.equal(sbc.assessmentState, 'APPLICABILITY_UNKNOWN');
  assert.deepEqual(sbc.readiness.missing, ['SBC_TYPE3_MASTER_ASSISTED_INPUTS']);
  assert.equal(matrix.candidateGoverning, null);
  assert.equal(matrix.screeningGoverning.mechanism.id, 'fit');
});

test('wrong-scope precomputed result fails closed and cannot create candidate governing', () => {
  const target = row();
  const scopeId = sbcFacilityScopeId(target);
  const wrong = 'SBC-FACILITY/L-OTHER/NORMAL/CAN-OTHER';
  const matrix = buildVibrationMechanismMatrixRow(target, {
    resultState: 'CURRENT_RESULT',
    sbcMasterAssistedScopes: { [scopeId]: true },
    sbcPrecomputedByScope: { [scopeId]: precomputed(wrong) },
  });
  const sbc = matrix.assessments.find((item) => item.mechanism.id === 'smallBoreConnections');
  assert.equal(sbc.calculated, false);
  assert.equal(sbc.assessmentState, 'APPLICABLE_INCOMPLETE');
  assert.ok(sbc.readiness.invalid.includes('scopeId'));
  assert.equal(matrix.candidateGoverning, null);
  assert.equal(matrix.screeningGoverning.mechanism.id, 'fit');
});

test('master-assisted SBC result inherits stale facility currency', () => {
  const target = row();
  const scopeId = sbcFacilityScopeId(target);
  const matrix = buildVibrationMechanismMatrixRow(target, {
    resultState: 'STALE_RESULT',
    sbcMasterAssistedScopes: { [scopeId]: true },
    sbcPrecomputedByScope: { [scopeId]: precomputed(scopeId) },
  });
  assert.equal(matrix.screeningGoverning, null);
  assert.equal(matrix.candidateGoverning, null);
  assert.equal(matrix.retainedScreeningGoverning.mechanism.id, 'fit');
  assert.equal(matrix.retainedCandidateGoverning.mechanism.id, 'smallBoreConnections');
  assert.equal(matrix.retainedCandidateGoverning.resultState, 'STALE_RESULT');
});

test('SBC panel exposes physical master-assisted workflow and retains explicit legacy fallback', () => {
  const state = createVibrationUserDataUiState();
  state.sbcType3ScopeId = 'SBC-FACILITY/L-100/NORMAL/CAN-1';
  const html = renderSbcType3UserInputPanel(state);
  assert.match(html, /Master-assisted physical inputs/u);
  assert.match(html, /data-vi-sbc-master-physical="fittingKey"/u);
  assert.match(html, /data-vi-sbc-master-template/u);
  assert.match(html, /data-vi-sbc-master-evaluate/u);
  assert.match(html, /T3-1…T3-4 are not activated/u);
  assert.match(html, /Legacy explicit-intermediate-input workflow/u);
  assert.doesNotMatch(html, /Add Type-3 inputs · first span WITH mass/u);
});
