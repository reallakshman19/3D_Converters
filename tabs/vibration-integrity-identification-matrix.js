import { VIBRATION_MECHANISM_IDS } from '../converters/vibration/mechanisms/registry.js';
import { vibrationIdentificationAuthoringRowState } from './vibration-integrity-identification-model.js';

export const VIBRATION_IDENTIFICATION_MATRIX_SCHEMA = 'VibrationIdentificationMatrix.v1';
export const VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY = Object.freeze({
  purpose: 'T1_IDENTIFICATION_COVERAGE_PRESENTATION_ONLY',
  createsIdentificationEvidence: false,
  determinesApplicability: false,
  determinesCompleteness: false,
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
});

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalizedCaseId(value) {
  return text(value) || null;
}

function scopeFromRow(row = {}) {
  const line = text(row.line);
  const canonicalId = text(row.canonicalId);
  if (!line || !canonicalId) return null;
  return Object.freeze({
    line,
    caseId: normalizedCaseId(row.caseId),
    canonicalId,
  });
}

function scopeKey(scope) {
  return JSON.stringify([scope.line, scope.caseId, scope.canonicalId]);
}

function sameScope(row, scope) {
  return text(row?.line) === scope.line
    && normalizedCaseId(row?.caseId) === scope.caseId
    && text(row?.canonicalId) === scope.canonicalId;
}

function uniqueScopes(workspaceRows = []) {
  const byKey = new Map();
  for (const row of workspaceRows) {
    const scope = scopeFromRow(row);
    if (scope) byKey.set(scopeKey(scope), scope);
  }
  return [...byKey.values()];
}

function authoredRowsForCell(rows, scope, mechanismId) {
  return rows.filter((row) => text(row?.mechanismId) === mechanismId && sameScope(row, scope));
}

function rowSnapshot(row) {
  const authoringState = vibrationIdentificationAuthoringRowState(row);
  return Object.freeze({
    rowId: row.rowId ?? null,
    authoringState: authoringState.status,
    errors: authoringState.errors,
    disposition: text(row.disposition) || null,
    requiredQualification: text(row.requiredQualification) || null,
    assessmentUnitType: text(row.assessmentUnitType) || null,
    sourceId: text(row.sourceId) || null,
    reason: text(row.reason) || null,
  });
}

function duplicateState(rows) {
  const dispositions = new Set(rows.map((row) => text(row.disposition)).filter(Boolean));
  return dispositions.size > 1 ? 'CONFLICTED_EVIDENCE' : 'DUPLICATE_EVIDENCE';
}

function projectCell(scope, mechanismId, authoredRows) {
  const matching = authoredRowsForCell(authoredRows, scope, mechanismId);
  if (!matching.length) {
    return Object.freeze({
      mechanismId,
      state: 'MISSING_REVIEW',
      disposition: null,
      requiredQualification: null,
      authoredRows: Object.freeze([]),
    });
  }
  const snapshots = Object.freeze(matching.map(rowSnapshot));
  if (matching.length > 1) {
    return Object.freeze({
      mechanismId,
      state: duplicateState(matching),
      disposition: null,
      requiredQualification: null,
      authoredRows: snapshots,
    });
  }
  const [snapshot] = snapshots;
  return Object.freeze({
    mechanismId,
    state: snapshot.authoringState === 'READY'
      ? 'EVIDENCE_READY'
      : `${snapshot.authoringState}_EVIDENCE`,
    disposition: snapshot.disposition,
    requiredQualification: snapshot.requiredQualification,
    authoredRows: snapshots,
  });
}

function matrixSummary(scopes) {
  const cells = scopes.flatMap((scope) => scope.mechanisms);
  return Object.freeze({
    scopes: scopes.length,
    mechanismsPerScope: VIBRATION_MECHANISM_IDS.length,
    cells: cells.length,
    evidenceReady: cells.filter((cell) => cell.state === 'EVIDENCE_READY').length,
    missingReview: cells.filter((cell) => cell.state === 'MISSING_REVIEW').length,
    incompleteEvidence: cells.filter((cell) => cell.state === 'INCOMPLETE_EVIDENCE').length,
    invalidEvidence: cells.filter((cell) => cell.state === 'INVALID_EVIDENCE').length,
    duplicateOrConflicted: cells.filter((cell) => ['DUPLICATE_EVIDENCE', 'CONFLICTED_EVIDENCE'].includes(cell.state)).length,
  });
}

export function buildVibrationIdentificationMatrix({ workspaceRows = [], authoredRows = [] } = {}) {
  if (!Array.isArray(workspaceRows)) throw new TypeError('workspaceRows must be an array.');
  if (!Array.isArray(authoredRows)) throw new TypeError('authoredRows must be an array.');
  const scopes = uniqueScopes(workspaceRows).map((scope) => Object.freeze({
    scope,
    mechanisms: Object.freeze(VIBRATION_MECHANISM_IDS.map((mechanismId) => (
      projectCell(scope, mechanismId, authoredRows)
    ))),
  }));
  return Object.freeze({
    schema: VIBRATION_IDENTIFICATION_MATRIX_SCHEMA,
    authority: VIBRATION_IDENTIFICATION_MATRIX_AUTHORITY,
    mechanismIds: VIBRATION_MECHANISM_IDS,
    scopes: Object.freeze(scopes),
    summary: matrixSummary(scopes),
  });
}
