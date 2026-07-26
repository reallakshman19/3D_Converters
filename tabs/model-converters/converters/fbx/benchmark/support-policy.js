const STAGE_AUTHORITIES = new Set(['EXACT', 'APPROVED_EQUIVALENT', 'DIAGNOSTIC_ONLY']);
const EMPTY_CLASS_DISPOSITIONS = new Set(['BLOCKED_CLASSIFICATION', 'ALLOW_UNCLASSIFIED']);

function fail(message) {
  throw new Error(`BLOCKED_SUPPORT_POLICY ${message}`);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  return value;
}

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is required.`);
  return value;
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || !value.length) fail(`${label} must be a non-empty array.`);
  const values = value.map((item, index) => requireText(item, `${label}[${index}]`));
  if (new Set(values).size !== values.length) fail(`${label} contains duplicate values.`);
  return values;
}

export function validateSupportIdentityPolicy(policy) {
  const record = requireObject(policy, 'policy');
  if (record.schema !== 'FbxSupportIdentityPolicy.v1') fail('policy.schema must be FbxSupportIdentityPolicy.v1.');
  requireText(record.policyId, 'policy.policyId');
  if (!Array.isArray(record.identityStages) || !record.identityStages.length) {
    fail('policy.identityStages must be a non-empty array.');
  }
  const stageIds = new Set();
  const ranks = new Set();
  const identityStages = record.identityStages.map((stage, index) => {
    const item = requireObject(stage, `policy.identityStages[${index}]`);
    const stageId = requireText(item.stageId, `policy.identityStages[${index}].stageId`);
    if (stageIds.has(stageId)) fail(`duplicate stageId ${stageId}.`);
    stageIds.add(stageId);
    if (!Number.isInteger(item.rank) || item.rank < 1) fail(`${stageId}.rank must be a positive integer.`);
    if (ranks.has(item.rank)) fail(`duplicate stage rank ${item.rank}.`);
    ranks.add(item.rank);
    if (!STAGE_AUTHORITIES.has(item.authority)) fail(`${stageId}.authority is invalid.`);
    return {
      stageId,
      rank: item.rank,
      authority: item.authority,
      keyPaths: requireStringArray(item.keyPaths, `${stageId}.keyPaths`),
      requireNonEmpty: item.requireNonEmpty !== false,
    };
  }).sort((left, right) => left.rank - right.rank || left.stageId.localeCompare(right.stageId));
  const classAuthority = requireObject(record.classAuthority, 'policy.classAuthority');
  const emptyExplicitClassDisposition = classAuthority.emptyExplicitClassDisposition || 'BLOCKED_CLASSIFICATION';
  if (!EMPTY_CLASS_DISPOSITIONS.has(emptyExplicitClassDisposition)) {
    fail('policy.classAuthority.emptyExplicitClassDisposition is invalid.');
  }
  return Object.freeze({
    schema: record.schema,
    policyId: record.policyId,
    identityStages: Object.freeze(identityStages),
    classAuthority: Object.freeze({
      emptyExplicitClassDisposition,
      explicitConflictDisposition: classAuthority.explicitConflictDisposition || 'BLOCKED_CLASSIFICATION',
    }),
  });
}

export function validateToleranceProfile(profile) {
  const record = requireObject(profile, 'toleranceProfile');
  if (record.schema !== 'FbxBenchmarkToleranceProfile.v1') {
    fail('toleranceProfile.schema must be FbxBenchmarkToleranceProfile.v1.');
  }
  requireText(record.profileId, 'toleranceProfile.profileId');
  const position = requireObject(record.supportPositionTolerance, 'toleranceProfile.supportPositionTolerance');
  const absolute = Number(position.absolute);
  const relative = Number(position.relative ?? 0);
  if (!Number.isFinite(absolute) || absolute < 0) fail('supportPositionTolerance.absolute must be non-negative.');
  if (!Number.isFinite(relative) || relative < 0) fail('supportPositionTolerance.relative must be non-negative.');
  const scalar = requireObject(record.scalarEngineeringTolerance, 'toleranceProfile.scalarEngineeringTolerance');
  const scalarAbsolute = Number(scalar.absolute);
  const scalarRelative = Number(scalar.relative ?? 0);
  if (!Number.isFinite(scalarAbsolute) || scalarAbsolute < 0) fail('scalarEngineeringTolerance.absolute must be non-negative.');
  if (!Number.isFinite(scalarRelative) || scalarRelative < 0) fail('scalarEngineeringTolerance.relative must be non-negative.');
  return Object.freeze({
    schema: record.schema,
    profileId: record.profileId,
    supportPositionTolerance: Object.freeze({ absolute, relative }),
    scalarEngineeringTolerance: Object.freeze({ absolute: scalarAbsolute, relative: scalarRelative }),
  });
}
