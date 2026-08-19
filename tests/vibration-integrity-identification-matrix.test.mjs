import assert from 'node:assert/strict';
import test from 'node:test';
import { VIBRATION_MECHANISM_IDS } from '../converters/vibration/mechanisms/registry.js';
import { createVibrationIdentificationAuthoringTable } from '../tabs/vibration-integrity-identification-model.js';
import {
  VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY,
  buildVibrationIdentificationMatrix,
} from '../tabs/vibration-integrity-identification-matrix.js';

const scopeA = Object.freeze({ line: '10-P-100', caseId: 'NORMAL', canonicalId: 'LINE-A' });
const scopeB = Object.freeze({ line: '12-P-200', caseId: 'STARTUP', canonicalId: 'LINE-B' });

function readyRow(scope, overrides = {}) {
  return {
    mechanismId: 'fit',
    line: scope.line,
    caseId: scope.caseId,
    canonicalId: scope.canonicalId,
    assessmentUnitType: 'MAIN_LINE_SECTION',
    disposition: 'REQUIRED',
    requiredQualification: 'SCREENING',
    sourceId: 'project:T1-review',
    reason: 'Engineer-reviewed T1 basis',
    ...overrides,
  };
}

function cell(matrix, scopeIndex, mechanismId) {
  return matrix.scopes[scopeIndex].mechanisms.find((item) => item.mechanismId === mechanismId);
}

test('full T1 matrix projects every known mechanism for every exact workspace scope', () => {
  const authored = createVibrationIdentificationAuthoringTable([
    readyRow(scopeA),
    readyRow(scopeA, {
      mechanismId: 'aiv',
      assessmentUnitType: 'AIV_SOURCE_ASSESSMENT_PAIR',
      disposition: 'NOT_APPLICABLE',
      requiredQualification: '',
    }),
    readyRow(scopeB, { disposition: 'UNRESOLVED', requiredQualification: '' }),
  ]);
  const matrix = buildVibrationIdentificationMatrix({
    workspaceRows: [scopeA, scopeA, scopeB],
    authoredRows: authored.rows,
  });

  assert.equal(matrix.scopes.length, 2);
  assert.equal(matrix.summary.mechanismsPerScope, VIBRATION_MECHANISM_IDS.length);
  assert.equal(matrix.summary.cells, VIBRATION_MECHANISM_IDS.length * 2);
  assert.equal(matrix.summary.evidenceReady, 3);
  assert.equal(matrix.summary.missingReview, matrix.summary.cells - 3);
  assert.deepEqual(matrix.scopes[0].mechanisms.map((item) => item.mechanismId), VIBRATION_MECHANISM_IDS);
  assert.equal(cell(matrix, 0, 'fit').disposition, 'REQUIRED');
  assert.equal(cell(matrix, 0, 'aiv').disposition, 'NOT_APPLICABLE');
  assert.equal(cell(matrix, 1, 'fit').disposition, 'UNRESOLVED');
});

test('absence is fail-closed as MISSING_REVIEW and wrong-scope evidence cannot satisfy a cell', () => {
  const authored = createVibrationIdentificationAuthoringTable([
    readyRow(scopeB, { mechanismId: 'mechanicalExcitation' }),
  ]);
  const matrix = buildVibrationIdentificationMatrix({
    workspaceRows: [scopeA, scopeB],
    authoredRows: authored.rows,
  });

  assert.equal(cell(matrix, 0, 'mechanicalExcitation').state, 'MISSING_REVIEW');
  assert.equal(cell(matrix, 0, 'mechanicalExcitation').disposition, null);
  assert.equal(cell(matrix, 1, 'mechanicalExcitation').state, 'EVIDENCE_READY');
});

test('incomplete authored evidence remains visible and is never promoted to a disposition-ready state', () => {
  const authored = createVibrationIdentificationAuthoringTable([
    readyRow(scopeA, {
      mechanismId: 'mechanicalExcitation',
      sourceId: '',
      reason: '',
    }),
  ]);
  const matrix = buildVibrationIdentificationMatrix({
    workspaceRows: [scopeA],
    authoredRows: authored.rows,
  });
  const projected = cell(matrix, 0, 'mechanicalExcitation');

  assert.equal(projected.state, 'INCOMPLETE_EVIDENCE');
  assert.equal(projected.authoredRows[0].authoringState, 'INCOMPLETE');
  assert(projected.authoredRows[0].errors.includes('SOURCEID_REQUIRED'));
  assert(projected.authoredRows[0].errors.includes('REASON_REQUIRED'));
});

test('duplicate contradictory dispositions fail visibly as CONFLICTED_EVIDENCE', () => {
  const authored = createVibrationIdentificationAuthoringTable([
    readyRow(scopeA),
    readyRow(scopeA, { disposition: 'NOT_APPLICABLE', requiredQualification: '' }),
  ]);
  const matrix = buildVibrationIdentificationMatrix({
    workspaceRows: [scopeA],
    authoredRows: authored.rows,
  });
  const projected = cell(matrix, 0, 'fit');

  assert.equal(projected.state, 'CONFLICTED_EVIDENCE');
  assert.equal(projected.disposition, null);
  assert.equal(projected.authoredRows.length, 2);
});

test('matrix authority is presentation-only and cannot create applicability or completeness authority', () => {
  assert.equal(VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY.createsIdentificationEvidence, false);
  assert.equal(VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY.determinesApplicability, false);
  assert.equal(VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY.determinesCompleteness, false);
  assert.equal(VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY.designAuthority, false);
});
