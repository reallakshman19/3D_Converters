import { resolveVibrationIdentificationEvidenceForScope } from './vibration-integrity-identification-model.js';
import { buildVibrationLineCaseAssessmentStatus } from './vibration-integrity-assessment-status.js';
import { buildVibrationMechanismMatrixRow } from './vibration-integrity-mechanisms.js?v=20260815-sbc-pf05-cache-1';
import { buildVibrationRoadmapMechanismSummary } from './vibration-roadmap-mechanism-summary.js';
import { buildVibrationRoadmapScopeChoices } from './vibration-roadmap-scope-selection.js';

export const VIBRATION_INTEGRITY_ROADMAP_ASSESSMENT_CONTEXT_SCHEMA =
  'VibrationIntegrityRoadmapAssessmentContext.v1';

export const VIBRATION_INTEGRITY_ROADMAP_ASSESSMENT_CONTEXT_AUTHORITY = Object.freeze({
  purpose: 'SELECTED_REGISTER_SCOPE_WORKFLOW_CONTEXT_ONLY',
  statusSource: 'VibrationLineCaseAssessmentStatus.v1',
  mechanismSummarySource: 'VibrationRoadmapMechanismSummary.v1',
  determinesApplicability: false,
  determinesCompleteness: false,
  createsCaseIdentity: false,
  persistenceAuthority: 'NONE',
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
});

function matrixContext(state) {
  return {
    resultState: state.resultState,
    userEngineeringDataRows: state.userEngineeringData?.rows ?? [],
    mechanicalSourceKeysByScope: state.mechanicalSourceKeysByScope ?? {},
    mechanicalNotApplicableByScope: state.mechanicalNotApplicableByScope ?? {},
    mechanicalCandidateResultsByScope: state.mechanicalCandidateResultsByScope ?? {},
    sbcCandidateResultsByScope: state.sbcFacilityCandidateResults ?? {},
  };
}

function rowWithIdentificationEvidence(state, row) {
  const evidence = resolveVibrationIdentificationEvidenceForScope(
    state.mechanismIdentificationAuthoring,
    { line: row.line, caseId: row.caseId ?? null, canonicalId: row.canonicalId },
  );
  return Object.freeze({
    ...row,
    mechanismIdentifications: evidence.status === 'READY' ? evidence.records : Object.freeze([]),
    mechanismIdentificationEvidenceStatus: evidence.status,
    mechanismIdentificationEvidenceErrors: evidence.errors,
  });
}

function selectedWorkspaceRow(state) {
  const rowKey = state.selectedRowKey ?? state.workspace?.selectedRowKey ?? null;
  if (!rowKey) return null;
  return state.workspace?.rows?.find((row) => row.rowKey === rowKey) ?? null;
}

function buildLineCaseProjection(state, row) {
  const scopedRow = rowWithIdentificationEvidence(state, row);
  const matrix = buildVibrationMechanismMatrixRow(scopedRow, matrixContext(state));
  const status = buildVibrationLineCaseAssessmentStatus({ row: scopedRow, matrix });
  return Object.freeze({ scopedRow, matrix, status });
}

export function buildVibrationIntegrityLineCaseStatusForRow(state, row) {
  if (!row) return null;
  return buildLineCaseProjection(state, row).status;
}

export function buildVibrationIntegritySelectedAssessmentContext(state = {}) {
  const row = selectedWorkspaceRow(state);
  if (!row) return null;
  const projection = buildLineCaseProjection(state, row);
  const scopeChoices = buildVibrationRoadmapScopeChoices(state.workspace?.rows ?? [], row.rowKey);
  return Object.freeze({
    schema: VIBRATION_INTEGRITY_ROADMAP_ASSESSMENT_CONTEXT_SCHEMA,
    rowKey: row.rowKey ?? null,
    lineCaseAssessmentStatus: projection.status,
    mechanismSummary: buildVibrationRoadmapMechanismSummary(projection.matrix),
    scopeChoices,
    authority: VIBRATION_INTEGRITY_ROADMAP_ASSESSMENT_CONTEXT_AUTHORITY,
  });
}
