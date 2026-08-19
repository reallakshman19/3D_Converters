import { evaluateVibrationAssessmentEvidenceLedgerCurrentness } from './assessment-currentness.js';
import { createVibrationAssessmentEvidenceLedger } from './assessment-evidence.js';
import { assertVibrationIntegrityProject, deepFreezeProjectValue } from './schema.js';

export const VIBRATION_INTEGRITY_PROJECT_LOAD_CURRENTNESS_SCHEMA = 'VibrationIntegrityProjectLoadCurrentness.v1';
export const VIBRATION_INTEGRITY_PROJECT_LOAD_CURRENTNESS_AUTHORITY = Object.freeze({
  authority: 'PROJECT_LOAD_CURRENTNESS_PROJECTION_ONLY',
  createsCurrentEngineeringResult: false,
  determinesAssessmentCompleteness: false,
  determinesApplicability: false,
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  rootCauseAuthority: false,
  codeCompliance: false,
  safetyAuthority: false,
});

function emptyLedger() {
  return createVibrationAssessmentEvidenceLedger({ receipts: [] });
}

export function evaluateVibrationIntegrityProjectLoadCurrentness(project, options = {}) {
  assertVibrationIntegrityProject(project);
  const assessmentEvidence = project.assessmentEvidence ?? emptyLedger();
  const assessmentEvidenceCurrentness = evaluateVibrationAssessmentEvidenceLedgerCurrentness({
    ledger: assessmentEvidence,
    currentBasisByAssessmentItemId: options.currentBasisByAssessmentItemId ?? {},
  });
  return deepFreezeProjectValue({
    schema: VIBRATION_INTEGRITY_PROJECT_LOAD_CURRENTNESS_SCHEMA,
    projectSchema: project.schema,
    projectId: project.project?.projectId ?? project.project?.id ?? null,
    assessmentEvidenceCurrentness,
    authority: VIBRATION_INTEGRITY_PROJECT_LOAD_CURRENTNESS_AUTHORITY,
  });
}
