export const VIBRATION_WORKSPACE_REQUEST_EVENT = 'vibration-integrity-workspace-request';
export const VIBRATION_WORKSPACE_REQUEST_SCHEMA = 'VibrationIntegrityWorkspaceNavigationRequest.v1';

export const VIBRATION_WORKSPACE_NAVIGATION_AUTHORITY = Object.freeze({
  purpose: 'RIGHT_RAIL_WORKSPACE_NAVIGATION_ONLY',
  nextActionSource: 'VibrationLineCaseAssessmentStatus.v1',
  determinesNextAction: false,
  determinesApplicability: false,
  determinesCompleteness: false,
  createsCaseIdentity: false,
  persistenceAuthority: 'NONE',
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
});

const IDENTIFICATION_ACTIONS = new Set([
  'RESTORE_IDENTIFICATION_RESOLUTION',
  'AUTHOR_T1_IDENTIFICATION',
  'COMPLETE_T1_IDENTIFICATION_EVIDENCE',
  'CORRECT_T1_IDENTIFICATION_EVIDENCE',
  'AUTHOR_MISSING_MECHANISM_IDENTIFICATIONS',
  'RESOLVE_T1_IDENTIFICATION_DISPOSITIONS',
  'REVIEW_NOT_APPLICABLE_EVIDENCE',
]);

const SCREENING_ACTIONS = new Set([
  'COMPLETE_REQUIRED_ASSESSMENTS',
  'REVIEW_ASSESSMENT_GAPS',
  'REVIEW_COMPLETE_ASSESSMENT_EVIDENCE',
]);

export function resolveVibrationCaseActionWorkspace(nextActionCode) {
  const actionCode = String(nextActionCode ?? '').trim();
  if (IDENTIFICATION_ACTIONS.has(actionCode)) {
    return Object.freeze({ actionCode, workspaceId: 'identification' });
  }
  if (SCREENING_ACTIONS.has(actionCode)) {
    return Object.freeze({ actionCode, workspaceId: 'screening' });
  }
  return null;
}

export function buildVibrationWorkspaceNavigationRequest({ workspaceId, actionCode } = {}) {
  const route = resolveVibrationCaseActionWorkspace(actionCode);
  if (!route || route.workspaceId !== workspaceId) return null;
  return Object.freeze({
    schema: VIBRATION_WORKSPACE_REQUEST_SCHEMA,
    workspaceId: route.workspaceId,
    sourceActionCode: route.actionCode,
    authority: VIBRATION_WORKSPACE_NAVIGATION_AUTHORITY,
  });
}

export function isGovernedVibrationWorkspaceNavigationRequest(value) {
  const authority = value?.authority;
  return value?.schema === VIBRATION_WORKSPACE_REQUEST_SCHEMA
    && resolveVibrationCaseActionWorkspace(value.sourceActionCode)?.workspaceId === value.workspaceId
    && authority?.purpose === 'RIGHT_RAIL_WORKSPACE_NAVIGATION_ONLY'
    && authority?.determinesNextAction === false
    && authority?.determinesApplicability === false
    && authority?.determinesCompleteness === false
    && authority?.createsCaseIdentity === false
    && authority?.persistenceAuthority === 'NONE'
    && authority?.engineeringAuthority === 'NONE'
    && authority?.screeningAuthority === 'NOT_AUTHORIZED';
}
