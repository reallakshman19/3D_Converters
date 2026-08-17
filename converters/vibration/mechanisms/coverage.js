import {
  VIBRATION_MECHANISM_ASSESSMENT_ITEM_SCHEMA,
  VIBRATION_MECHANISM_ASSESSMENT_SET_SCHEMA,
} from './contracts.js';

export const VIBRATION_MECHANISM_IDENTIFICATION_SCHEMA = 'VibrationMechanismIdentification.v1';
export const VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA = 'RequiredAssessmentSet.v1';
export const VIBRATION_MECHANISM_COVERAGE_SCHEMA = 'MechanismCoverage.v1';
export const VIBRATION_ASSESSMENT_COMPLETENESS_SCHEMA = 'AssessmentCompleteness.v1';

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

export const VIBRATION_COVERAGE_STATES = Object.freeze([
  'ASSESSMENT_COMPLETE',
  'ASSESSMENT_INCOMPLETE',
  'NOT_APPLICABLE',
  'UNRESOLVED_IDENTIFICATION',
]);

export const VIBRATION_ASSESSMENT_COMPLETENESS_STATES = Object.freeze([
  'COMPLETE',
  'INCOMPLETE',
  'NOT_APPLICABLE',
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
  const recomputed = vibrationMechanismIdentificationId(input);
  if (recomputed !== input.identificationId) throw new Error('Identification identity mismatch.');
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

function assessmentItemIndex(requiredAssessmentSet, assessmentSets = []) {
  const index = new Map();
  for (const set of assessmentSets) {
    if (set?.schema !== VIBRATION_MECHANISM_ASSESSMENT_SET_SCHEMA) {
      throw new TypeError(`Assessment set must use ${VIBRATION_MECHANISM_ASSESSMENT_SET_SCHEMA}.`);
    }
    if (!sameScope(set.scope, requiredAssessmentSet.scope)) {
      throw new Error('Assessment set scope mismatch.');
    }
    for (const item of set.items ?? []) {
      if (item?.schema !== VIBRATION_MECHANISM_ASSESSMENT_ITEM_SCHEMA) {
        throw new TypeError(`Assessment item must use ${VIBRATION_MECHANISM_ASSESSMENT_ITEM_SCHEMA}.`);
      }
      const key = JSON.stringify([item.mechanismId, item.child?.key]);
      if (index.has(key)) throw new Error(`Duplicate assessment coverage item: ${key}`);
      index.set(key, item);
    }
  }
  return index;
}

function requiredCoverageEntry(identification, index, requiredQualificationState) {
  const key = JSON.stringify([identification.mechanismId, identification.assessmentKey]);
  const item = index.get(key) ?? null;
  if (!item) return { identification, assessmentItemId: null, coverageState: 'ASSESSMENT_INCOMPLETE', reason: 'MISSING_REQUIRED_ASSESSMENT' };
  if (item.assessmentState !== 'CALCULATED') {
    return { identification, assessmentItemId: item.itemId, coverageState: 'ASSESSMENT_INCOMPLETE', reason: `ASSESSMENT_STATE_${item.assessmentState}` };
  }
  if (item.resultState !== 'CURRENT_RESULT') {
    return { identification, assessmentItemId: item.itemId, coverageState: 'ASSESSMENT_INCOMPLETE', reason: `RESULT_STATE_${item.resultState}` };
  }
  const effective = item.qualification?.effective ?? null;
  if (effective !== requiredQualificationState) {
    return { identification, assessmentItemId: item.itemId, coverageState: 'ASSESSMENT_INCOMPLETE', reason: `QUALIFICATION_${effective ?? 'NONE'}` };
  }
  return { identification, assessmentItemId: item.itemId, coverageState: 'ASSESSMENT_COMPLETE', reason: 'CURRENT_REQUIRED_QUALIFICATION' };
}

function coverageEntry(identification, index, requiredQualificationState) {
  if (identification.identificationDisposition === 'NOT_APPLICABLE') {
    return { identification, assessmentItemId: null, coverageState: 'NOT_APPLICABLE', reason: 'EXPLICIT_NOT_APPLICABLE' };
  }
  if (identification.identificationDisposition === 'UNRESOLVED') {
    return { identification, assessmentItemId: null, coverageState: 'UNRESOLVED_IDENTIFICATION', reason: 'IDENTIFICATION_UNRESOLVED' };
  }
  return requiredCoverageEntry(identification, index, requiredQualificationState);
}

export function createMechanismCoverage(input = {}) {
  const requiredAssessmentSet = input.requiredAssessmentSet;
  if (requiredAssessmentSet?.schema !== VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA) {
    throw new TypeError(`requiredAssessmentSet must use ${VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA}.`);
  }
  const requiredQualificationState = requiredText(
    input.requiredQualificationState ?? 'SCREENING',
    'requiredQualificationState',
  );
  const index = assessmentItemIndex(requiredAssessmentSet, input.assessmentSets ?? []);
  const entries = requiredAssessmentSet.identifications.map((identification) => (
    coverageEntry(identification, index, requiredQualificationState)
  ));
  return deepFreeze({
    schema: VIBRATION_MECHANISM_COVERAGE_SCHEMA,
    coverageId: canonicalJson([
      requiredAssessmentSet.setId,
      requiredQualificationState,
      entries,
    ]),
    requiredAssessmentSetId: requiredAssessmentSet.setId,
    scope: requiredAssessmentSet.scope,
    requiredQualificationState,
    entries,
  });
}

export function createAssessmentCompleteness(input = {}) {
  const requiredAssessmentSet = input.requiredAssessmentSet;
  const coverage = input.mechanismCoverage;
  if (requiredAssessmentSet?.schema !== VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA) {
    throw new TypeError(`requiredAssessmentSet must use ${VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA}.`);
  }
  if (coverage?.schema !== VIBRATION_MECHANISM_COVERAGE_SCHEMA) {
    throw new TypeError(`mechanismCoverage must use ${VIBRATION_MECHANISM_COVERAGE_SCHEMA}.`);
  }
  if (coverage.requiredAssessmentSetId !== requiredAssessmentSet.setId) {
    throw new Error('Mechanism coverage does not belong to required assessment set.');
  }
  const counts = Object.fromEntries(VIBRATION_COVERAGE_STATES.map((state) => [state, 0]));
  for (const entry of coverage.entries) counts[entry.coverageState] += 1;
  const noIdentification = requiredAssessmentSet.identifications.length === 0;
  const incomplete = counts.ASSESSMENT_INCOMPLETE > 0 || counts.UNRESOLVED_IDENTIFICATION > 0;
  const state = noIdentification || incomplete
    ? 'INCOMPLETE'
    : requiredAssessmentSet.required.length === 0
      ? 'NOT_APPLICABLE'
      : 'COMPLETE';
  const reasons = [];
  if (noIdentification) reasons.push('IDENTIFICATION_EVIDENCE_MISSING');
  if (counts.UNRESOLVED_IDENTIFICATION) reasons.push('IDENTIFICATION_UNRESOLVED');
  if (counts.ASSESSMENT_INCOMPLETE) reasons.push('REQUIRED_ASSESSMENT_INCOMPLETE');
  const missingRequiredAssessmentIds = coverage.entries
    .filter((entry) => entry.coverageState === 'ASSESSMENT_INCOMPLETE')
    .map((entry) => entry.identification.identificationId);
  return deepFreeze({
    schema: VIBRATION_ASSESSMENT_COMPLETENESS_SCHEMA,
    completenessId: canonicalJson([requiredAssessmentSet.setId, coverage.coverageId, state, reasons]),
    requiredAssessmentSetId: requiredAssessmentSet.setId,
    mechanismCoverageId: coverage.coverageId,
    scope: requiredAssessmentSet.scope,
    state: enumValue(state, VIBRATION_ASSESSMENT_COMPLETENESS_STATES, 'state'),
    counts: {
      requiredCount: requiredAssessmentSet.required.length,
      completeCount: counts.ASSESSMENT_COMPLETE,
      incompleteCount: counts.ASSESSMENT_INCOMPLETE,
      notApplicableCount: counts.NOT_APPLICABLE,
      unresolvedIdentificationCount: counts.UNRESOLVED_IDENTIFICATION,
    },
    missingRequiredAssessmentIds,
    reasons,
  });
}
