import { assertVibrationMeasurementEvidencePackage } from '../measurement/contracts.js';
import { createVibrationAssessmentEvidenceLedger } from './assessment-evidence.js';
import {
  createVibrationMeasurementDisposition,
  createVibrationVerificationRequirement,
} from '../verification/contracts.js';
import { createVibrationVisualInspectionEvidencePackage } from '../visual-inspection/contracts.js';

export const VIBRATION_INTEGRITY_PROJECT_V1_SCHEMA = 'VibrationIntegrityProject.v1';
export const VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA = 'VibrationIntegrityProject.v2';
export const VIBRATION_INTEGRITY_PROJECT_SCHEMA = VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA;
export const VIBRATION_INTEGRITY_PROJECT_AUTHORITY = 'PERSISTENCE_CONTAINER_ONLY';

function projectError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationIntegrityProjectError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw projectError('VIBRATION_PROJECT_OBJECT_REQUIRED', `${field} must be an object.`, { field });
  }
  return value;
}

function requiredArray(value, field) {
  if (!Array.isArray(value)) {
    throw projectError('VIBRATION_PROJECT_ARRAY_REQUIRED', `${field} must be an array.`, { field });
  }
  return value;
}

function uniqueIds(rows, field, code) {
  const values = rows.map((row) => String(row?.[field] ?? '')).filter(Boolean);
  if (values.length !== rows.length || new Set(values).size !== values.length) {
    throw projectError(code, `${field} values must be present and unique.`, { field });
  }
  return new Set(values);
}

function assertAuthority(project) {
  const authority = requiredObject(project.authority, 'project.authority');
  const commonSafe = authority.containerAuthority === VIBRATION_INTEGRITY_PROJECT_AUTHORITY
    && authority.importedResultsAreCurrentEngineeringAuthority === false
    && authority.screeningAuthorized === false
    && authority.designAuthority === false
    && authority.rootCauseAuthority !== true
    && authority.measurementEvidenceIsCurrentEngineeringAuthority !== true;
  const v2Safe = project.schema !== VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA
    || (authority.assessmentEvidenceIsCurrentEngineeringAuthority === false
      && authority.verificationDispositionIsScreeningAuthority === false
      && authority.visualInspectionEvidenceIsCurrentEngineeringAuthority === false);
  if (!commonSafe || !v2Safe) {
    throw projectError(
      'VIBRATION_PROJECT_AUTHORITY_INVALID',
      'Project persistence metadata cannot grant engineering, screening, design, root-cause, or persisted-evidence authority.',
    );
  }
}

function assertCurrentResults(project) {
  const currentResults = requiredArray(project.currentResults, 'project.currentResults');
  if (currentResults.length) {
    throw projectError(
      'VIBRATION_PROJECT_CURRENT_RESULT_CONTRACT_UNQUALIFIED',
      'Project persistence does not yet accept current-result authority records; rerun registered calculations after load.',
    );
  }
}

function assertKnownLine(lineIds, lineId, code, details = {}) {
  const normalized = String(lineId ?? '');
  if (!lineIds.has(normalized)) {
    throw projectError(code, 'Persisted vibration evidence references an unknown project line.', {
      ...details,
      lineId: lineId ?? null,
    });
  }
}

function assertMeasurementEvidence(project, lineIds) {
  const legacyMeasurements = requiredArray(project.measurements ?? [], 'project.measurements');
  if (legacyMeasurements.length) {
    throw projectError(
      'VIBRATION_PROJECT_LEGACY_MEASUREMENTS_UNQUALIFIED',
      'Non-empty legacy measurements are not accepted; use validated project.measurementEvidence.',
    );
  }
  if (project.measurementEvidence == null) return { sessions: [], products: [] };
  assertVibrationMeasurementEvidencePackage(project.measurementEvidence);
  for (const session of project.measurementEvidence.sessions) {
    if (!lineIds.has(String(session.scope?.lineId ?? ''))) {
      throw projectError(
        'VIBRATION_PROJECT_MEASUREMENT_DANGLING_LINE',
        'Measurement session references an unknown project line.',
        { sessionId: session.sessionId ?? null, lineId: session.scope?.lineId ?? null },
      );
    }
  }
  return project.measurementEvidence;
}

function sameScope(left, right) {
  return left.lineId === right.lineId
    && left.caseId === right.caseId
    && left.operatingCaseSnapshotId === right.operatingCaseSnapshotId
    && left.operatingCaseSnapshotHash === right.operatingCaseSnapshotHash;
}

function assertAssessmentEvidence(project, lineIds) {
  const ledger = createVibrationAssessmentEvidenceLedger(project.assessmentEvidence);
  for (const receipt of ledger.receipts) {
    assertKnownLine(lineIds, receipt.scope.line, 'VIBRATION_PROJECT_ASSESSMENT_EVIDENCE_DANGLING_LINE', {
      receiptId: receipt.receiptId,
    });
  }
}

function evidenceIndexes(measurementEvidence) {
  return {
    sessions: new Map(measurementEvidence.sessions.map((item) => [item.sessionId, item])),
    products: new Map(measurementEvidence.products.map((item) => [item.productId, item])),
  };
}

function assertEvidenceRef(scope, id, kind, indexes, dispositionId) {
  const value = indexes[kind].get(id);
  if (!value) {
    throw projectError(
      'VIBRATION_PROJECT_VERIFICATION_EVIDENCE_REFERENCE_UNKNOWN',
      'Persisted verification disposition references measurement evidence that is not in the project.',
      { dispositionId, evidenceId: id, evidenceKind: kind },
    );
  }
  const session = kind === 'sessions' ? value : indexes.sessions.get(value.sessionId);
  if (!session || !sameScope(session.scope, scope)) {
    throw projectError(
      'VIBRATION_PROJECT_VERIFICATION_EVIDENCE_SCOPE_MISMATCH',
      'Persisted verification evidence references must match the requirement operating-case scope.',
      { dispositionId, evidenceId: id, evidenceKind: kind },
    );
  }
}

function assertDisposition(disposition, byId, indexes) {
  const requirement = byId.get(disposition.requirementId);
  if (!requirement) {
    throw projectError(
      'VIBRATION_PROJECT_VERIFICATION_ORPHAN_DISPOSITION',
      'Persisted verification disposition references an unknown requirement.',
      { dispositionId: disposition.dispositionId, requirementId: disposition.requirementId },
    );
  }
  if (disposition.mechanismId !== requirement.mechanismId || !sameScope(disposition.scope, requirement.scope)) {
    throw projectError(
      'VIBRATION_PROJECT_VERIFICATION_DISPOSITION_SCOPE_MISMATCH',
      'Persisted verification disposition must match its requirement scope and mechanism exactly.',
      { dispositionId: disposition.dispositionId, requirementId: disposition.requirementId },
    );
  }
  for (const id of disposition.evidence.sessionIds) assertEvidenceRef(requirement.scope, id, 'sessions', indexes, disposition.dispositionId);
  for (const id of disposition.evidence.productIds) assertEvidenceRef(requirement.scope, id, 'products', indexes, disposition.dispositionId);
}

function assertVerification(project, lineIds, measurementEvidence) {
  const requirements = requiredArray(project.verificationRequirements, 'project.verificationRequirements')
    .map(createVibrationVerificationRequirement);
  const dispositions = requiredArray(project.verificationDispositions, 'project.verificationDispositions')
    .map(createVibrationMeasurementDisposition);
  uniqueIds(requirements, 'requirementId', 'VIBRATION_PROJECT_VERIFICATION_REQUIREMENT_ID_INVALID');
  uniqueIds(dispositions, 'dispositionId', 'VIBRATION_PROJECT_VERIFICATION_DISPOSITION_ID_INVALID');
  const byId = new Map(requirements.map((item) => [item.requirementId, item]));
  const indexes = evidenceIndexes(measurementEvidence);
  for (const requirement of requirements) {
    assertKnownLine(lineIds, requirement.scope.lineId, 'VIBRATION_PROJECT_VERIFICATION_DANGLING_LINE', {
      requirementId: requirement.requirementId,
    });
  }
  for (const disposition of dispositions) assertDisposition(disposition, byId, indexes);
}

function assertVisualInspectionEvidence(project, lineIds) {
  const evidence = createVibrationVisualInspectionEvidencePackage(project.visualInspectionEvidence);
  for (const record of evidence.records) {
    assertKnownLine(lineIds, record.scope.lineId, 'VIBRATION_PROJECT_VISUAL_EVIDENCE_DANGLING_LINE', {
      inspectionId: record.inspectionId,
    });
  }
}

function assertV2Evidence(project, lineIds, measurementEvidence) {
  assertAssessmentEvidence(project, lineIds);
  assertVerification(project, lineIds, measurementEvidence);
  assertVisualInspectionEvidence(project, lineIds);
}

function assertSchema(project) {
  const supported = [VIBRATION_INTEGRITY_PROJECT_V1_SCHEMA, VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA];
  if (!supported.includes(project.schema)) {
    throw projectError(
      'VIBRATION_PROJECT_SCHEMA_MISMATCH',
      `Project must use ${supported.join(' or ')}.`,
      { actual: project.schema ?? null },
    );
  }
}

export function assertVibrationIntegrityProject(value) {
  const project = requiredObject(value, 'project');
  assertSchema(project);
  requiredObject(project.project, 'project.project');
  const subjects = requiredObject(project.subjects, 'project.subjects');
  const lines = requiredArray(subjects.lines, 'project.subjects.lines');
  const mechanisms = requiredArray(project.mechanismImports, 'project.mechanismImports');
  assertCurrentResults(project);
  assertAuthority(project);
  const lineIds = uniqueIds(lines, 'lineId', 'VIBRATION_PROJECT_LINE_ID_INVALID');
  uniqueIds(mechanisms, 'recordId', 'VIBRATION_PROJECT_MECHANISM_RECORD_ID_INVALID');
  for (const record of mechanisms) {
    assertKnownLine(lineIds, record.lineId, 'VIBRATION_PROJECT_DANGLING_LINE_REFERENCE', {
      recordId: record.recordId ?? null,
    });
  }
  const measurementEvidence = assertMeasurementEvidence(project, lineIds);
  if (project.schema === VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA) assertV2Evidence(project, lineIds, measurementEvidence);
  return project;
}

export function cloneProjectValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function deepFreezeProjectValue(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeProjectValue(child);
  return Object.freeze(value);
}

export function createVibrationProjectError(code, message, details = {}) {
  return projectError(code, message, details);
}
