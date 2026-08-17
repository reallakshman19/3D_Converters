export const VIBRATION_MECHANISM_IDENTIFICATION_SCHEMA = 'VibrationMechanismIdentification.v1';
export const VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA = 'RequiredAssessmentSet.v1';

export const VIBRATION_MECHANISM_IDS = Object.freeze([
  'fit',
  'mechanicalExcitation',
  'reciprocatingPulsation',
  'rotatingStall',
  'deadlegPulsation',
  'corrugationPulsation',
  'slugFlow',
  'aiv',
  'valveTransients',
  'cavitationFlashing',
  'thermowells',
  'smallBoreConnections',
]);

export const VIBRATION_ASSESSMENT_UNIT_TYPES = Object.freeze([
  'MAIN_LINE_SECTION',
  'DEADLEG_BRANCH',
  'AIV_SOURCE_ASSESSMENT_PAIR',
  'SBC_CONNECTION',
  'TRANSIENT_EVENT_PATH',
  'INTRUSIVE_ELEMENT',
  'SPECIALIST_SYSTEM',
]);

export const VIBRATION_IDENTIFICATION_DISPOSITIONS = Object.freeze([
  'REQUIRED',
  'NOT_APPLICABLE',
  'UNRESOLVED',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value;
}

function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new RangeError(`${field} must be one of ${allowed.join(', ')}.`);
  }
  return value;
}

function scopeValue(scope = {}) {
  return {
    line: requiredText(scope.line, 'scope.line'),
    caseId: scope.caseId === null || scope.caseId === undefined
      ? null
      : requiredText(scope.caseId, 'scope.caseId'),
    canonicalId: requiredText(scope.canonicalId, 'scope.canonicalId'),
  };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sameScope(left, right) {
  return left.line === right.line
    && left.caseId === right.caseId
    && left.canonicalId === right.canonicalId;
}

function evidenceValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('evidence must be an object.');
  }
  requiredText(value.sourceReference, 'evidence.sourceReference');
  return canonicalize(value);
}

export function vibrationMechanismIdentificationId(input = {}) {
  const scope = scopeValue(input.scope);
  const mechanismId = enumValue(input.mechanismId, VIBRATION_MECHANISM_IDS, 'mechanismId');
  const assessmentUnitType = enumValue(
    input.assessmentUnitType,
    VIBRATION_ASSESSMENT_UNIT_TYPES,
    'assessmentUnitType',
  );
  const assessmentKey = requiredText(input.assessmentKey, 'assessmentKey');
  return JSON.stringify([
    mechanismId,
    scope.line,
    scope.caseId,
    scope.canonicalId,
    assessmentUnitType,
    assessmentKey,
  ]);
}

export function createVibrationMechanismIdentification(input = {}) {
  const scope = scopeValue(input.scope);
  const mechanismId = enumValue(input.mechanismId, VIBRATION_MECHANISM_IDS, 'mechanismId');
  const assessmentUnitType = enumValue(
    input.assessmentUnitType,
    VIBRATION_ASSESSMENT_UNIT_TYPES,
    'assessmentUnitType',
  );
  const assessmentKey = requiredText(input.assessmentKey, 'assessmentKey');
  const disposition = enumValue(
    input.identificationDisposition,
    VIBRATION_IDENTIFICATION_DISPOSITIONS,
    'identificationDisposition',
  );
  return deepFreeze({
    schema: VIBRATION_MECHANISM_IDENTIFICATION_SCHEMA,
    identificationId: vibrationMechanismIdentificationId({
      scope, mechanismId, assessmentUnitType, assessmentKey,
    }),
    scope,
    mechanismId,
    assessmentUnitType,
    assessmentKey,
    identificationDisposition: disposition,
    reason: input.reason ?? null,
    evidence: evidenceValue(input.evidence),
  });
}

function validateIdentification(input, scope) {
  if (input?.schema !== VIBRATION_MECHANISM_IDENTIFICATION_SCHEMA) {
    throw new TypeError(`Identification must use ${VIBRATION_MECHANISM_IDENTIFICATION_SCHEMA}.`);
  }
  if (!sameScope(input.scope, scope)) throw new Error('Identification scope mismatch.');
  if (vibrationMechanismIdentificationId(input) !== input.identificationId) {
    throw new Error('Identification identity mismatch.');
  }
  return input;
}

function requiredSetId(scope, identifications) {
  return canonicalJson([
    VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA,
    scope,
    identifications.map((item) => ({
      identificationId: item.identificationId,
      disposition: item.identificationDisposition,
      reason: item.reason,
      evidence: item.evidence,
    })),
  ]);
}

export function createRequiredAssessmentSet(input = {}) {
  const scope = scopeValue(input.scope);
  const source = Array.isArray(input.identifications) ? input.identifications : [];
  const ids = new Set();
  const identifications = source.map((item) => validateIdentification(item, scope));
  for (const item of identifications) {
    if (ids.has(item.identificationId)) {
      throw new Error(`Duplicate or contradictory mechanism identification: ${item.identificationId}`);
    }
    ids.add(item.identificationId);
  }
  identifications.sort((left, right) => left.identificationId.localeCompare(right.identificationId));
  return deepFreeze({
    schema: VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA,
    setId: requiredSetId(scope, identifications),
    scope,
    identifications,
    required: identifications.filter((item) => item.identificationDisposition === 'REQUIRED'),
    notApplicable: identifications.filter((item) => item.identificationDisposition === 'NOT_APPLICABLE'),
    unresolved: identifications.filter((item) => item.identificationDisposition === 'UNRESOLVED'),
  });
}
