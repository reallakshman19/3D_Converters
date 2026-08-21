import { assertVibrationMeasurementEvidencePackage } from '../converters/vibration/measurement/contracts.js';
import { createEmptyVibrationMeasurementEvidencePackage } from '../converters/vibration/project/measurement.js';
import { assertVibrationIntegrityProject } from '../converters/vibration/project/schema.js';

export const VIBRATION_PROJECT_EVIDENCE_HANDOFF_SCHEMA = 'VibrationProjectEvidenceHandoff.v1';
export const VIBRATION_PROJECT_EVIDENCE_HANDOFF_EVENT = 'vibration-project-evidence-handoff';

export const VIBRATION_PROJECT_EVIDENCE_HANDOFF_AUTHORITY = Object.freeze({
  purpose: 'PROJECT_MEASUREMENT_EVIDENCE_HANDOFF_ONLY',
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  numericalAuthority: 'NONE',
  persistenceAuthority: 'NONE',
  measurementAuthority: 'DELEGATED_TO_PROJECT_MEASUREMENT_EVIDENCE',
  determinesApplicability: false,
  determinesAssessmentCompleteness: false,
  determinesCompletion: false,
  determinesGoverningResult: false,
  rootCauseAuthority: false,
});

function handoffError(code, message) {
  const error = new Error(message);
  error.name = 'VibrationProjectEvidenceHandoffError';
  error.code = code;
  return error;
}

function text(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw handoffError('VIBRATION_PROJECT_EVIDENCE_TEXT_REQUIRED', `${field} is required.`);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function scopeKey(scope = {}) {
  return [scope.lineId, scope.caseId, scope.operatingCaseSnapshotId, scope.operatingCaseSnapshotHash]
    .map((value) => String(value ?? '').trim()).join('|');
}

function evidenceRevisionKey(pkg) {
  const sessions = pkg.sessions.map((session) => ({
    sessionId: session.sessionId,
    scope: scopeKey(session.scope),
    rawHashes: session.channels.map((channel) => channel.rawData.sha256).sort(),
  })).sort((a, b) => a.sessionId.localeCompare(b.sessionId));
  const products = pkg.products.map((product) => ({
    productId: product.productId,
    sessionId: product.sessionId,
    productType: product.productType,
    artifactSha256: product.artifact.sha256,
    inputRawDataHashes: [...product.inputRawDataHashes].sort(),
  })).sort((a, b) => a.productId.localeCompare(b.productId));
  return JSON.stringify({ sessions, products });
}

function authority(value) {
  for (const [key, expected] of Object.entries(VIBRATION_PROJECT_EVIDENCE_HANDOFF_AUTHORITY)) {
    if (value?.[key] !== expected) {
      throw handoffError('VIBRATION_PROJECT_EVIDENCE_AUTHORITY_INVALID', `Project evidence handoff authority mismatch at ${key}.`);
    }
  }
}

export function createVibrationProjectEvidenceHandoff({ project, selectedLineId = null } = {}) {
  assertVibrationIntegrityProject(project);
  const projectId = text(project.project?.projectId, 'project.projectId');
  const measurementEvidence = assertVibrationMeasurementEvidencePackage(
    project.measurementEvidence ?? createEmptyVibrationMeasurementEvidencePackage(),
  );
  const lineId = selectedLineId == null ? null : String(selectedLineId).trim() || null;
  if (lineId && !project.subjects.lines.some((line) => line.lineId === lineId)) {
    throw handoffError('VIBRATION_PROJECT_EVIDENCE_LINE_INVALID', 'Selected roadmap line is not present in the project.');
  }
  return deepFreeze({
    schema: VIBRATION_PROJECT_EVIDENCE_HANDOFF_SCHEMA,
    projectId,
    selectedLineId: lineId,
    evidenceRevisionKey: evidenceRevisionKey(measurementEvidence),
    measurementEvidence,
    authority: VIBRATION_PROJECT_EVIDENCE_HANDOFF_AUTHORITY,
  });
}

export function assertVibrationProjectEvidenceHandoff(value) {
  if (value?.schema !== VIBRATION_PROJECT_EVIDENCE_HANDOFF_SCHEMA) {
    throw handoffError('VIBRATION_PROJECT_EVIDENCE_SCHEMA_INVALID', `Expected ${VIBRATION_PROJECT_EVIDENCE_HANDOFF_SCHEMA}.`);
  }
  text(value.projectId, 'handoff.projectId');
  if (value.selectedLineId != null && !String(value.selectedLineId).trim()) {
    throw handoffError('VIBRATION_PROJECT_EVIDENCE_LINE_INVALID', 'selectedLineId must be null or non-empty text.');
  }
  const pkg = assertVibrationMeasurementEvidencePackage(value.measurementEvidence);
  if (value.evidenceRevisionKey !== evidenceRevisionKey(pkg)) {
    throw handoffError('VIBRATION_PROJECT_EVIDENCE_REVISION_INVALID', 'Project evidence revision key does not match the measurement package.');
  }
  authority(value.authority);
  return value;
}
