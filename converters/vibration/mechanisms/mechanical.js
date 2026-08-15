import {
  inspectMechanicalFacilityCandidate,
  mechanicalFacilityScope,
} from '../mechanical/facility.js';
import {
  createVibrationMechanismAssessmentItem,
  createVibrationMechanismAssessmentSet,
} from './contracts.js';

export const MECHANICAL_VIBRATION_MECHANISM_ID = 'mechanicalExcitation';
export const MECHANICAL_VIBRATION_MECHANISM_IMPLEMENTATION_STATE = 'IMPLEMENTED_CANDIDATE_MASTER';

function scopeFromRow(row = {}) {
  return {
    line: row.line,
    caseId: row.caseId ?? null,
    canonicalId: row.canonicalId,
  };
}

function readiness(sourceKeys, inspected) {
  if (!sourceKeys.length) {
    return {
      missing: ['MECHANICAL_T23_EQUIPMENT_SOURCE_SELECTION'],
      invalid: [],
      reasons: ['MECHANICAL_T23_APPLICABILITY_UNKNOWN'],
    };
  }
  if (inspected.status === 'NOT_EVALUATED') {
    return {
      missing: ['MECHANICAL_T23_CANDIDATE_EVALUATION'],
      invalid: [],
      reasons: ['MECHANICAL_T23_EVALUATION_REQUIRED'],
    };
  }
  if (!inspected.ok) {
    return {
      missing: [],
      invalid: [inspected.status],
      reasons: [inspected.status],
    };
  }
  return { missing: [], invalid: [], reasons: [] };
}

function assessmentState(sourceKeys, inspected) {
  if (!sourceKeys.length) return 'APPLICABILITY_UNKNOWN';
  if (!inspected.ok) return 'APPLICABLE_INCOMPLETE';
  return 'CALCULATED';
}

function resultState(inspected, requested) {
  if (!inspected.ok) return 'UNRUN';
  return requested === 'STALE_RESULT' ? 'STALE_RESULT' : 'CURRENT_RESULT';
}

function resultValue(inspected) {
  if (!inspected.ok) {
    return {
      calculated: false,
      governingLof: null,
      status: inspected.status,
      governingSourceKey: null,
    };
  }
  const candidate = inspected.candidate;
  return {
    calculated: true,
    governingLof: candidate.governingLof,
    status: candidate.status,
    governingSourceKey: candidate.governingSourceKey,
    sourceRows: candidate.rows,
  };
}

export function buildMechanicalVibrationMechanismAssessmentItem({
  row,
  sourceKeys = [],
  cachedCandidate = null,
  resultState: requestedResultState = null,
} = {}) {
  const facilityScope = mechanicalFacilityScope(row);
  const normalizedKeys = Array.isArray(sourceKeys)
    ? [...new Set(sourceKeys.map((value) => String(value ?? '').trim()).filter(Boolean))]
    : [];
  const inspected = inspectMechanicalFacilityCandidate(row, cachedCandidate);
  const result = resultValue(inspected);
  return createVibrationMechanismAssessmentItem({
    mechanismId: MECHANICAL_VIBRATION_MECHANISM_ID,
    scope: scopeFromRow(row),
    childKey: 't2.3-baseline',
    childOrdinal: 0,
    implementationState: MECHANICAL_VIBRATION_MECHANISM_IMPLEMENTATION_STATE,
    assessmentState: assessmentState(normalizedKeys, inspected),
    resultState: resultState(inspected, requestedResultState),
    applicability: {
      status: normalizedKeys.length ? 'USER_SELECTED_EQUIPMENT_SOURCES' : 'UNKNOWN',
      facilityScopeId: facilityScope.scopeId,
      sourceKeys: normalizedKeys,
    },
    readiness: readiness(normalizedKeys, inspected),
    request: {
      methodId: 'VIB.MECHANICAL.T2_3.BASELINE',
      facilityScopeId: facilityScope.scopeId,
      evidenceClass: 'EI_METHOD_MASTER_CANDIDATE_PLUS_PROJECT_APPLICABILITY',
    },
    execution: inspected.ok ? {
      status: 'CALCULATED_MASTER_CANDIDATE',
      screeningAuthorized: false,
    } : null,
    result,
    trace: {
      equationIds: [],
      ruleIds: ['EI-AVIFF-T2.3-MAX-BASELINE-LOF'],
      correlationIds: [],
      inputTrace: {
        status: normalizedKeys.length ? 'SOURCE_AND_NORMALIZED_ONLY' : 'UNAVAILABLE',
        normalizedInputs: { sourceKeys: normalizedKeys },
        sourceTrace: inspected.ok ? inspected.candidate.rows : null,
      },
    },
    qualification: {
      effective: 'CANDIDATE_MASTER',
      engineeringAuthority: 'NONE',
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
      masterDataAuthority: false,
    },
    evidence: inspected.ok ? {
      facilityScope: inspected.scope,
      provenance: inspected.candidate.provenance,
      usagePolicy: inspected.candidate.usagePolicy,
      authority: inspected.candidate.authority,
    } : { facilityScope: inspected.scope, status: inspected.status },
  });
}

export function buildMechanicalVibrationMechanismAssessmentSet(options = {}) {
  const item = buildMechanicalVibrationMechanismAssessmentItem(options);
  return createVibrationMechanismAssessmentSet({
    mechanismId: MECHANICAL_VIBRATION_MECHANISM_ID,
    scope: item.scope,
    items: [item],
  });
}
