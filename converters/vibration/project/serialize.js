import { createVibrationAssessmentEvidenceLedger } from './assessment-evidence.js';
import { evaluateVibrationIntegrityProjectLoadCurrentness } from './load-currentness.js';
import { createVibrationVisualInspectionEvidencePackage } from '../visual-inspection/contracts.js';
import {
  VIBRATION_INTEGRITY_PROJECT_V1_SCHEMA,
  VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA,
  assertVibrationIntegrityProject,
  cloneProjectValue,
  deepFreezeProjectValue,
  createVibrationProjectError,
} from './schema.js';

export const VIBRATION_INTEGRITY_PROJECT_FILE_EXTENSION = '.vibproj';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function v2Authority(authority = {}) {
  return {
    ...authority,
    assessmentEvidenceIsCurrentEngineeringAuthority: false,
    verificationDispositionIsScreeningAuthority: false,
    visualInspectionEvidenceIsCurrentEngineeringAuthority: false,
  };
}

export function upgradeVibrationIntegrityProjectToV2(project) {
  assertVibrationIntegrityProject(project);
  if (project.schema === VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA) {
    return deepFreezeProjectValue(cloneProjectValue(project));
  }
  if (project.schema !== VIBRATION_INTEGRITY_PROJECT_V1_SCHEMA) {
    throw createVibrationProjectError('VIBRATION_PROJECT_SCHEMA_MISMATCH', 'Only governed V1 projects can be upgraded to V2.');
  }
  const upgraded = cloneProjectValue(project);
  upgraded.schema = VIBRATION_INTEGRITY_PROJECT_V2_SCHEMA;
  upgraded.assessmentEvidence = cloneProjectValue(
    project.assessmentEvidence ?? createVibrationAssessmentEvidenceLedger({ receipts: [] }),
  );
  upgraded.verificationRequirements = cloneProjectValue(project.verificationRequirements ?? []);
  upgraded.verificationDispositions = cloneProjectValue(project.verificationDispositions ?? []);
  upgraded.visualInspectionEvidence = cloneProjectValue(
    project.visualInspectionEvidence ?? createVibrationVisualInspectionEvidencePackage({ records: [] }),
  );
  upgraded.authority = v2Authority(upgraded.authority);
  assertVibrationIntegrityProject(upgraded);
  return deepFreezeProjectValue(upgraded);
}

export function serializeVibrationIntegrityProject(project) {
  const upgraded = upgradeVibrationIntegrityProjectToV2(project);
  return `${JSON.stringify(canonical(upgraded), null, 2)}\n`;
}

function parseJson(text) {
  try { return JSON.parse(String(text ?? '')); }
  catch (error) {
    throw createVibrationProjectError('VIBRATION_PROJECT_JSON_INVALID', 'Vibration project import requires valid JSON.', {
      message: String(error?.message || error),
    });
  }
}

export function parseVibrationIntegrityProject(text) {
  return upgradeVibrationIntegrityProjectToV2(parseJson(text));
}

export function parseVibrationIntegrityProjectWithCurrentness(text, options = {}) {
  const project = parseVibrationIntegrityProject(text);
  const currentness = evaluateVibrationIntegrityProjectLoadCurrentness(project, options);
  return deepFreezeProjectValue({ project, currentness });
}
