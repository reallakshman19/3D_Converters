export const AIV_SCREENING_PROFILE_VALIDATION_SCHEMA = 'AivScreeningProfileValidation.v1';
const AIV_ASSUMPTION_PROFILE_SCHEMA = 'AivAssumptionProfile.v1';

function requiredPolicy(profile, key) {
  return profile?.policy?.[key] === true;
}

export function validateAivScreeningProfile(profile) {
  const issues = [];
  if (profile?.schema !== AIV_ASSUMPTION_PROFILE_SCHEMA) {
    issues.push('AIV_SCREENING_PROFILE_SCHEMA_INVALID');
  }
  if (!requiredPolicy(profile, 'assumptionsMustBeVisible')) {
    issues.push('AIV_SCREENING_ASSUMPTIONS_MUST_BE_VISIBLE');
  }
  if (!requiredPolicy(profile, 'assumptionsMustBeEditable')) {
    issues.push('AIV_SCREENING_ASSUMPTIONS_MUST_BE_EDITABLE');
  }
  if (!requiredPolicy(profile, 'assumptionsMustBeExportedWithResults')) {
    issues.push('AIV_SCREENING_ASSUMPTIONS_MUST_BE_EXPORTED');
  }
  if (profile?.policy?.screeningAuthorityImplied !== false) {
    issues.push('AIV_SCREENING_PROFILE_MUST_NOT_IMPLY_AUTHORITY');
  }
  if (profile?.policy?.designAuthority !== false) {
    issues.push('AIV_SCREENING_PROFILE_DESIGN_AUTHORITY_FORBIDDEN');
  }
  return Object.freeze({
    schema: AIV_SCREENING_PROFILE_VALIDATION_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    qualificationMode: 'screening',
    status: issues.length ? 'INVALID_SCREENING_PROFILE' : 'PASS',
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    benchmarkIntermediatesRequired: false,
    designAuthority: false,
  });
}
