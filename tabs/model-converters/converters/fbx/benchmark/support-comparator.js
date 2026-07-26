import { validateToleranceProfile } from './support-policy.js';

function valueState(value, hasValue = true) {
  if (!hasValue) return 'MISSING_ATTRIBUTE';
  if (value === null) return 'EXPLICIT_NULL';
  if (value === '') return 'EMPTY_STRING';
  return 'VALUE_PRESENT';
}

function tolerancePass(reference, actual, tolerance) {
  const residual = Math.abs(actual - reference);
  const scale = Math.max(Math.abs(reference), Math.abs(actual));
  const limit = Math.max(tolerance.absolute, tolerance.relative * scale);
  return { pass: residual <= limit, residual, limit };
}

function compareExact(fieldId, referenceValue, actualValue) {
  const pass = Object.is(referenceValue, actualValue);
  return {
    fieldId,
    comparison: 'EXACT',
    referenceValueState: valueState(referenceValue),
    actualValueState: valueState(actualValue),
    referenceValue,
    actualValue,
    state: pass ? 'PASS' : 'FAIL',
  };
}

function comparePosition(reference, actual, tolerance) {
  if (!reference || !actual) {
    return {
      fieldId: 'position',
      comparison: 'TOLERANCED',
      referenceValueState: valueState(reference, reference !== undefined),
      actualValueState: valueState(actual, actual !== undefined),
      referenceValue: reference,
      actualValue: actual,
      state: 'BLOCKED',
      reason: 'POSITION_VALUE_UNAVAILABLE',
    };
  }
  const residual = Math.hypot(actual.x - reference.x, actual.y - reference.y, actual.z - reference.z);
  const scale = Math.max(
    Math.hypot(reference.x, reference.y, reference.z),
    Math.hypot(actual.x, actual.y, actual.z),
  );
  const limit = Math.max(tolerance.absolute, tolerance.relative * scale);
  return {
    fieldId: 'position',
    comparison: 'TOLERANCED',
    referenceValueState: 'VALUE_PRESENT',
    actualValueState: 'VALUE_PRESENT',
    referenceValue: reference,
    actualValue: actual,
    absoluteResidual: residual,
    toleranceLimit: limit,
    state: residual <= limit ? 'PASS' : 'FAIL',
  };
}

function compareOrientation(referenceRecord, actualRecord, orientationComparator, tolerance) {
  const reference = referenceRecord.orientation;
  const actual = actualRecord.orientation;
  if (reference === actual) return compareExact('orientation', reference, actual);
  if (typeof orientationComparator !== 'function') {
    return {
      ...compareExact('orientation', reference, actual),
      state: 'BLOCKED',
      reason: 'ORIENTATION_COMPARATOR_REQUIRED',
    };
  }
  let result;
  try {
    result = orientationComparator({ reference, actual, referenceRecord, actualRecord });
  } catch (error) {
    return {
      ...compareExact('orientation', reference, actual),
      state: 'BLOCKED',
      reason: `ORIENTATION_COMPARATOR_ERROR:${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (!result || typeof result !== 'object'
    || typeof result.authorityId !== 'string' || !result.authorityId
    || !Number.isFinite(result.angularResidual) || result.angularResidual < 0) {
    return {
      ...compareExact('orientation', reference, actual),
      state: 'BLOCKED',
      reason: 'ORIENTATION_COMPARATOR_INVALID_RESULT',
    };
  }
  return {
    fieldId: 'orientation',
    comparison: 'TOLERANCED',
    authorityId: result.authorityId,
    referenceValueState: valueState(reference),
    actualValueState: valueState(actual),
    referenceValue: reference,
    actualValue: actual,
    angularResidual: result.angularResidual,
    toleranceLimit: tolerance.absolute,
    state: result.angularResidual <= tolerance.absolute ? 'PASS' : 'FAIL',
  };
}

function getAttribute(record, attribute) {
  return Object.hasOwn(record.attributes, attribute)
    ? { present: true, value: record.attributes[attribute] }
    : { present: false, value: undefined };
}

function propertyApplicable(rule, supportClass) {
  if (!Array.isArray(rule.requiredForClasses) || !rule.requiredForClasses.length) return true;
  return rule.requiredForClasses.includes(supportClass);
}

function compareProperty(rule, referenceRecord, actualRecord, tolerance, normalizers) {
  if (!propertyApplicable(rule, referenceRecord.supportClass)) {
    return { fieldId: rule.fieldId, comparison: 'NOT_APPLICABLE', state: 'NOT_APPLICABLE' };
  }
  const reference = getAttribute(referenceRecord, rule.attribute);
  const actual = getAttribute(actualRecord, rule.attribute);
  if (!reference.present || !actual.present || reference.value === null || actual.value === null || reference.value === '' || actual.value === '') {
    const sameState = valueState(reference.value, reference.present) === valueState(actual.value, actual.present);
    return {
      fieldId: rule.fieldId,
      comparison: rule.comparison || 'TOLERANCED',
      referenceValueState: valueState(reference.value, reference.present),
      actualValueState: valueState(actual.value, actual.present),
      referenceValue: reference.value,
      actualValue: actual.value,
      state: sameState ? 'PASS' : 'FAIL',
    };
  }
  const normalizer = normalizers?.[rule.normalizerId];
  if (typeof normalizer !== 'function') {
    return {
      fieldId: rule.fieldId,
      comparison: rule.comparison || 'TOLERANCED',
      referenceValueState: 'VALUE_PRESENT',
      actualValueState: 'VALUE_PRESENT',
      referenceValue: reference.value,
      actualValue: actual.value,
      state: 'BLOCKED',
      reason: `NORMALIZER_REQUIRED:${rule.normalizerId}`,
    };
  }
  let normalizedReference;
  let normalizedActual;
  try {
    normalizedReference = normalizer(reference.value);
    normalizedActual = normalizer(actual.value);
  } catch (error) {
    return {
      fieldId: rule.fieldId,
      comparison: rule.comparison || 'TOLERANCED',
      referenceValueState: 'UNPARSEABLE_VALUE',
      actualValueState: 'UNPARSEABLE_VALUE',
      referenceValue: reference.value,
      actualValue: actual.value,
      state: 'BLOCKED',
      reason: `NORMALIZER_ERROR:${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (!Number.isFinite(normalizedReference) || !Number.isFinite(normalizedActual)) {
    return {
      fieldId: rule.fieldId,
      comparison: rule.comparison || 'TOLERANCED',
      referenceValueState: 'UNPARSEABLE_VALUE',
      actualValueState: 'UNPARSEABLE_VALUE',
      referenceValue: reference.value,
      actualValue: actual.value,
      state: 'BLOCKED',
      reason: 'UNPARSEABLE_PROPERTY',
    };
  }
  const result = tolerancePass(normalizedReference, normalizedActual, tolerance);
  return {
    fieldId: rule.fieldId,
    comparison: 'TOLERANCED',
    referenceValueState: 'VALUE_PRESENT',
    actualValueState: 'VALUE_PRESENT',
    referenceValue: reference.value,
    actualValue: actual.value,
    normalizedReferenceValue: normalizedReference,
    normalizedActualValue: normalizedActual,
    absoluteResidual: result.residual,
    toleranceLimit: result.limit,
    state: result.pass ? 'PASS' : 'FAIL',
  };
}

function resolveHost(record, side, resolver, required) {
  if (typeof resolver !== 'function') {
    return required
      ? { state: 'BLOCKED', hostIdentity: null, candidateHostIdentities: [], reason: 'HOST_RESOLVER_REQUIRED' }
      : { state: 'NOT_APPLICABLE', hostIdentity: null, candidateHostIdentities: [] };
  }
  let result;
  try {
    result = resolver({ record, side });
  } catch (error) {
    return {
      state: 'BLOCKED',
      hostIdentity: null,
      candidateHostIdentities: [],
      reason: `HOST_RESOLVER_ERROR:${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (!result || typeof result !== 'object') {
    return { state: 'BLOCKED', hostIdentity: null, candidateHostIdentities: [], reason: 'HOST_RESOLVER_INVALID_RESULT' };
  }
  const state = result.state;
  if (!['RESOLVED', 'ORPHAN', 'AMBIGUOUS', 'NOT_APPLICABLE', 'BLOCKED'].includes(state)) {
    return { state: 'BLOCKED', hostIdentity: null, candidateHostIdentities: [], reason: 'HOST_RESOLVER_INVALID_STATE' };
  }
  const allowedAuthorities = new Set(['EXPLICIT_SOURCE_REFERENCE', 'APPROVED_HOST_MANIFEST']);
  if (state === 'RESOLVED' && (typeof result.hostIdentity !== 'string' || !result.hostIdentity)) {
    return { state: 'BLOCKED', hostIdentity: null, authority: null, candidateHostIdentities: [], reason: 'HOST_IDENTITY_REQUIRED' };
  }
  if (state === 'RESOLVED' && !allowedAuthorities.has(result.authority)) {
    return { state: 'BLOCKED', hostIdentity: null, authority: null, candidateHostIdentities: [], reason: 'HOST_AUTHORITY_NOT_APPROVED' };
  }
  return {
    state,
    hostIdentity: result.hostIdentity ?? null,
    authority: result.authority ?? null,
    candidateHostIdentities: Array.isArray(result.candidateHostIdentities)
      ? [...result.candidateHostIdentities].map(String).sort()
      : [],
    reason: result.reason ?? null,
  };
}

function compareHost(referenceRecord, actualRecord, resolver, required) {
  const reference = resolveHost(referenceRecord, 'reference', resolver, required);
  const actual = resolveHost(actualRecord, 'actual', resolver, required);
  let state;
  if ([reference.state, actual.state].includes('BLOCKED') || [reference.state, actual.state].includes('AMBIGUOUS')) {
    state = 'BLOCKED';
  } else if ([reference.state, actual.state].includes('ORPHAN')) {
    state = 'ORPHAN';
  } else if (reference.state === 'NOT_APPLICABLE' && actual.state === 'NOT_APPLICABLE') {
    state = 'NOT_APPLICABLE';
  } else if (reference.state !== 'RESOLVED' || actual.state !== 'RESOLVED') {
    state = 'BLOCKED';
  } else if (reference.authority !== actual.authority) {
    state = 'BLOCKED';
  } else {
    state = reference.hostIdentity === actual.hostIdentity ? 'PASS' : 'FAIL';
  }
  return Object.freeze({
    authorityMode: reference.authority && reference.authority === actual.authority
      ? reference.authority
      : null,
    referenceHostIdentity: reference.hostIdentity,
    actualHostIdentity: actual.hostIdentity,
    referenceState: reference.state,
    actualState: actual.state,
    candidateHostIdentities: [...new Set([
      ...reference.candidateHostIdentities,
      ...actual.candidateHostIdentities,
    ])].sort(),
    reasons: [reference.reason, actual.reason].filter(Boolean),
    state,
  });
}

function firstFailure(fieldResults, fieldId) {
  return fieldResults.some((item) => item.fieldId === fieldId && item.state === 'FAIL');
}

export function compareMatchedSupport(referenceRecord, actualRecord, options) {
  const toleranceProfile = validateToleranceProfile(options.toleranceProfile);
  const policy = options.identityPolicy;
  const fieldResults = [
    compareExact('rawType', referenceRecord.rawType, actualRecord.rawType),
    compareExact('supportClass', referenceRecord.supportClass, actualRecord.supportClass),
    compareExact('ownerBranch', referenceRecord.ownerBranch, actualRecord.ownerBranch),
    comparePosition(referenceRecord.position, actualRecord.position, toleranceProfile.supportPositionTolerance),
    compareOrientation(
      referenceRecord,
      actualRecord,
      options.orientationComparator,
      toleranceProfile.orientationAngularTolerance,
    ),
  ];
  for (const rule of options.propertyRules || []) {
    fieldResults.push(compareProperty(
      rule,
      referenceRecord,
      actualRecord,
      toleranceProfile.scalarEngineeringTolerance,
      options.normalizers,
    ));
  }
  const hostResult = compareHost(referenceRecord, actualRecord, options.hostResolver, options.hostRequired === true);
  const classBlocked = Boolean(
    referenceRecord.classConflicts.length
    || actualRecord.classConflicts.length
    || ((referenceRecord.supportClass === null || actualRecord.supportClass === null)
      && policy.classAuthority.emptyExplicitClassDisposition === 'BLOCKED_CLASSIFICATION'),
  );
  const hasBlocked = classBlocked
    || hostResult.state === 'BLOCKED'
    || fieldResults.some((item) => item.state === 'BLOCKED');
  let matchState;
  if (hasBlocked) matchState = 'BLOCKED';
  else if (hostResult.state === 'ORPHAN') matchState = 'ORPHAN_SUPPORT';
  else if (hostResult.state === 'FAIL') matchState = 'HOST_MISMATCH';
  else if (firstFailure(fieldResults, 'rawType') || firstFailure(fieldResults, 'supportClass')) matchState = 'TYPE_MISMATCH';
  else if (firstFailure(fieldResults, 'ownerBranch')) matchState = 'PROPERTY_MISMATCH';
  else if (firstFailure(fieldResults, 'position')) matchState = 'POSITION_MISMATCH';
  else if (firstFailure(fieldResults, 'orientation')) matchState = 'ORIENTATION_MISMATCH';
  else if (fieldResults.some((item) => item.state === 'FAIL')) matchState = 'PROPERTY_MISMATCH';
  else matchState = options.identityAuthority === 'APPROVED_EQUIVALENT' ? 'APPROVED_EQUIVALENT' : 'EXACT_MATCH';
  return Object.freeze({
    matchState,
    classResult: Object.freeze({
      referenceClass: referenceRecord.supportClass,
      actualClass: actualRecord.supportClass,
      referenceConflicts: referenceRecord.classConflicts,
      actualConflicts: actualRecord.classConflicts,
      state: classBlocked ? 'BLOCKED' : referenceRecord.supportClass === actualRecord.supportClass ? 'PASS' : 'FAIL',
    }),
    hostResult,
    fieldResults: Object.freeze(fieldResults),
  });
}
