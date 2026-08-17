import {
  VIBRATION_MECHANISM_ASSESSMENT_ITEM_SCHEMA,
  VIBRATION_MECHANISM_ASSESSMENT_SET_SCHEMA,
} from './contracts.js';
import {
  VIBRATION_REQUIRED_ASSESSMENT_SET_SCHEMA,
} from './coverage-identification.js';

export const VIBRATION_MECHANISM_COVERAGE_SCHEMA = 'MechanismCoverage.v1';
export const VIBRATION_ASSESSMENT_COMPLETENESS_SCHEMA = 'AssessmentCompleteness.v1';

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

function incompleteEntry(identification, item, reason) {
  return {
    identification,
    assessmentItemId: item?.itemId ?? null,
    coverageState: 'ASSESSMENT_INCOMPLETE',
    reason,
  };
}

function requiredCoverageEntry(identification, index, requiredQualificationState) {
  const key = JSON.stringify([identification.mechanismId, identification.assessmentKey]);
  const item = index.get(key) ?? null;
  if (!item) return incompleteEntry(identification, null, 'MISSING_REQUIRED_ASSESSMENT');
  if (item.assessmentState !== 'CALCULATED') {
    return incompleteEntry(identification, item, `ASSESSMENT_STATE_${item.assessmentState}`);
  }
  if (item.resultState !== 'CURRENT_RESULT') {
    return incompleteEntry(identification, item, `RESULT_STATE_${item.resultState}`);
  }
  const effective = item.qualification?.effective ?? null;
  if (effective !== requiredQualificationState) {
    return incompleteEntry(identification, item, `QUALIFICATION_${effective ?? 'NONE'}`);
  }
  return {
    identification,
    assessmentItemId: item.itemId,
    coverageState: 'ASSESSMENT_COMPLETE',
    reason: 'CURRENT_REQUIRED_QUALIFICATION',
  };
}

function coverageEntry(identification, index, requiredQualificationState) {
  if (identification.identificationDisposition === 'NOT_APPLICABLE') {
    return {
      identification,
      assessmentItemId: null,
      coverageState: 'NOT_APPLICABLE',
      reason: 'EXPLICIT_NOT_APPLICABLE',
    };
  }
  if (identification.identificationDisposition === 'UNRESOLVED') {
    return {
      identification,
      assessmentItemId: null,
      coverageState: 'UNRESOLVED_IDENTIFICATION',
      reason: 'IDENTIFICATION_UNRESOLVED',
    };
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

function coverageCounts(entries) {
  const counts = Object.fromEntries(VIBRATION_COVERAGE_STATES.map((state) => [state, 0]));
  for (const entry of entries) {
    if (!(entry.coverageState in counts)) {
      throw new RangeError(`Unknown coverage state: ${entry.coverageState}`);
    }
    counts[entry.coverageState] += 1;
  }
  return counts;
}

function completenessState(requiredAssessmentSet, counts) {
  if (!requiredAssessmentSet.identifications.length) return 'INCOMPLETE';
  if (counts.ASSESSMENT_INCOMPLETE || counts.UNRESOLVED_IDENTIFICATION) return 'INCOMPLETE';
  if (!requiredAssessmentSet.required.length) return 'NOT_APPLICABLE';
  return 'COMPLETE';
}

function completenessReasons(requiredAssessmentSet, counts) {
  const reasons = [];
  if (!requiredAssessmentSet.identifications.length) reasons.push('IDENTIFICATION_EVIDENCE_MISSING');
  if (counts.UNRESOLVED_IDENTIFICATION) reasons.push('IDENTIFICATION_UNRESOLVED');
  if (counts.ASSESSMENT_INCOMPLETE) reasons.push('REQUIRED_ASSESSMENT_INCOMPLETE');
  return reasons;
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
  const counts = coverageCounts(coverage.entries);
  const state = completenessState(requiredAssessmentSet, counts);
  const reasons = completenessReasons(requiredAssessmentSet, counts);
  const missingRequiredAssessmentIds = coverage.entries
    .filter((entry) => entry.coverageState === 'ASSESSMENT_INCOMPLETE')
    .map((entry) => entry.identification.identificationId);
  return deepFreeze({
    schema: VIBRATION_ASSESSMENT_COMPLETENESS_SCHEMA,
    completenessId: canonicalJson([requiredAssessmentSet.setId, coverage.coverageId, state, reasons]),
    requiredAssessmentSetId: requiredAssessmentSet.setId,
    mechanismCoverageId: coverage.coverageId,
    scope: requiredAssessmentSet.scope,
    state,
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
