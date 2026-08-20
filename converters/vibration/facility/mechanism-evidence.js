import { inspectAivFacilityScenarioPlanForAssessment } from '../aiv/aiv-facility-scenario-plan.js';
import {
  inspectMechanicalFacilityCandidate,
  mechanicalFacilityScopeId,
} from '../mechanical/facility.js';
import {
  inspectSbcFacilityType3,
  sbcFacilityScopeId,
} from '../sbc/facility.js';

export const VIBRATION_FACILITY_MECHANISM_EVIDENCE_SCHEMA = 'VibrationFacilityMechanismEvidence.v1';

export const VIBRATION_FACILITY_MECHANISM_EVIDENCE_AUTHORITY = Object.freeze({
  purpose: 'FACILITY_MECHANISM_REPRODUCIBILITY_PROJECTION_ONLY',
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  numericalAuthority: 'NONE',
  aggregationAuthority: 'NONE',
  persistenceAuthority: 'NONE',
  determinesApplicability: false,
  determinesCompleteness: false,
  blocksExecution: false,
  blocksNavigation: false,
  blocksCalculation: false,
  blocksPersistence: false,
});

function evidenceError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationFacilityMechanismEvidenceError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw evidenceError('VIBRATION_FACILITY_MECHANISM_EVIDENCE_TEXT_REQUIRED', `${field} is required.`, { field });
  return text;
}

function jsonClone(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function scope(row) {
  return Object.freeze({
    line: row.line ?? null,
    caseId: row.caseId ?? null,
    canonicalId: row.canonicalId ?? null,
  });
}

function basisMatches(candidate, current) {
  if (!candidate || !current) return false;
  return candidate.datasetId === current.datasetId
    && candidate.scenarioId === current.scenarioId
    && candidate.scenarioSnapshotHash === current.scenarioSnapshotHash
    && candidate.line === current.line
    && candidate.caseId === current.caseId;
}

function runRows(rowsInput, datasetId, scenarioSetKey) {
  if (!Array.isArray(rowsInput)) {
    throw evidenceError('VIBRATION_FACILITY_MECHANISM_EVIDENCE_ROWS_INVALID', 'Facility register rows must be an array.');
  }
  return rowsInput.map((row) => {
    const rowScope = scope(row);
    if (!rowScope.line || !rowScope.canonicalId || !rowScope.caseId) {
      throw evidenceError('VIBRATION_FACILITY_MECHANISM_EVIDENCE_SCOPE_INVALID', 'Facility mechanism evidence requires line, caseId and canonicalId.', rowScope);
    }
    if (row.scenarioSetKey !== scenarioSetKey
        || row.scenarioExecutionBasis?.datasetId !== datasetId) {
      throw evidenceError(
        'VIBRATION_FACILITY_MECHANISM_EVIDENCE_BASE_RUN_MISMATCH',
        'Facility register row does not belong to the supplied run/scenario set.',
        rowScope,
      );
    }
    return row;
  });
}

function excluded(mechanismId, row, reason, evidenceSchema = null) {
  return Object.freeze({
    mechanismId,
    scope: row ? scope(row) : null,
    status: 'STALE_OR_FOREIGN',
    reason,
    evidenceSchema,
    numericalValueRetained: false,
  });
}

function mechanicalEvidence(rows, resultsByScope, current, rejected) {
  const currentScopeIds = new Set();
  for (const row of rows) {
    const scopeId = mechanicalFacilityScopeId(row);
    currentScopeIds.add(scopeId);
    const candidate = resultsByScope?.[scopeId] ?? null;
    if (!candidate) continue;
    const inspected = inspectMechanicalFacilityCandidate(row, candidate);
    if (!inspected.ok) {
      rejected.push(excluded('mechanicalExcitation', row, inspected.status, candidate?.schema ?? null));
      continue;
    }
    if (!basisMatches(candidate.scenarioExecutionBasis, row.scenarioExecutionBasis)) {
      rejected.push(excluded('mechanicalExcitation', row, 'SCENARIO_BASIS_MISMATCH', candidate.schema));
      continue;
    }
    current.push(Object.freeze({
      mechanismId: 'mechanicalExcitation',
      evidenceTier: 'SCREENING',
      scope: scope(row),
      facilityScopeId: scopeId,
      resultSchema: candidate.schema,
      resultStatus: candidate.status,
      value: Object.freeze({
        governingLof: candidate.governingLof,
        governingSourceKey: candidate.governingSourceKey ?? null,
      }),
      authority: jsonClone(candidate.authority ?? null),
      scenarioExecutionBasis: jsonClone(candidate.scenarioExecutionBasis),
    }));
  }
  for (const [scopeId, candidate] of Object.entries(resultsByScope ?? {})) {
    if (!currentScopeIds.has(scopeId)) {
      rejected.push(excluded('mechanicalExcitation', null, 'FACILITY_SCOPE_NOT_CURRENT', candidate?.schema ?? null));
    }
  }
}

function sbcEvidence(rows, resultsByScope, current, rejected) {
  const currentScopeIds = new Set();
  for (const row of rows) {
    const scopeId = sbcFacilityScopeId(row);
    currentScopeIds.add(scopeId);
    const candidate = resultsByScope?.[scopeId] ?? null;
    if (!candidate) continue;
    const inspected = inspectSbcFacilityType3(row, { precomputedCandidate: candidate });
    if (!inspected.ok) {
      rejected.push(excluded('smallBoreConnections', row, inspected.status, candidate?.schema ?? null));
      continue;
    }
    if (!basisMatches(candidate.scenarioExecutionBasis, row.scenarioExecutionBasis)) {
      rejected.push(excluded('smallBoreConnections', row, 'SCENARIO_BASIS_MISMATCH', candidate?.schema ?? null));
      continue;
    }
    current.push(Object.freeze({
      mechanismId: 'smallBoreConnections',
      evidenceTier: 'CANDIDATE',
      scope: scope(row),
      facilityScopeId: scopeId,
      resultSchema: candidate.schema ?? null,
      resultStatus: candidate.status ?? null,
      value: Object.freeze({ lof: candidate.lof }),
      authority: jsonClone(candidate.authority ?? inspected.authority ?? null),
      scenarioExecutionBasis: jsonClone(candidate.scenarioExecutionBasis),
    }));
  }
  for (const [scopeId, candidate] of Object.entries(resultsByScope ?? {})) {
    if (!currentScopeIds.has(scopeId)) {
      rejected.push(excluded('smallBoreConnections', null, 'FACILITY_SCOPE_NOT_CURRENT', candidate?.schema ?? null));
    }
  }
}

function aivEvidence(rows, session, scenarioSetKey, current, rejected) {
  if (!session) return;
  if (session.executionContext !== 'FACILITY_LINKED' || !session.scenarioExecutionPlan) {
    rejected.push(excluded('aiv', null, 'AIV_STANDALONE_NOT_FACILITY_EVIDENCE', session.schema ?? null));
    return;
  }
  if (session.scenarioExecutionPlan.scenarioSetKey !== scenarioSetKey) {
    rejected.push(excluded('aiv', null, 'AIV_FACILITY_SCENARIO_SET_STALE', session.schema ?? null));
    return;
  }
  const byScope = new Map(rows.map((row) => [JSON.stringify([row.line, row.caseId, row.canonicalId]), row]));
  const results = session.screeningResult?.outputs?.assessmentResults ?? [];
  for (const result of results) {
    const row = byScope.get(JSON.stringify([result.line, result.caseId, result.assessmentCanonicalId])) ?? null;
    if (!row) {
      rejected.push(excluded('aiv', null, 'AIV_FACILITY_ASSESSMENT_SCOPE_NOT_CURRENT', result.schema ?? null));
      continue;
    }
    const admission = inspectAivFacilityScenarioPlanForAssessment(session.scenarioExecutionPlan, row);
    if (!admission.ok) {
      rejected.push(excluded('aiv', row, admission.status, result.schema ?? null));
      continue;
    }
    current.push(Object.freeze({
      mechanismId: 'aiv',
      evidenceTier: 'ASSESSMENT_SCREENING',
      scope: scope(row),
      facilityScopeId: null,
      resultSchema: result.schema ?? null,
      resultStatus: result.status ?? null,
      value: Object.freeze({ lof: result.lof }),
      authority: jsonClone(result.authority ?? null),
      scenarioExecutionBasis: jsonClone(row.scenarioExecutionBasis),
      linkedFacilityRunId: session.scenarioExecutionPlan.facilityRunId ?? null,
    }));
  }
}

function countByMechanism(items) {
  const counts = {};
  for (const item of items) counts[item.mechanismId] = (counts[item.mechanismId] ?? 0) + 1;
  return counts;
}

export function buildVibrationFacilityMechanismEvidence({
  runId,
  datasetId,
  scenarioSetKey,
  registerRows = [],
  mechanicalResultsByScope = {},
  sbcResultsByScope = {},
  aivSession = null,
} = {}) {
  const run = Object.freeze({
    runId: requiredText(runId, 'runId'),
    datasetId: requiredText(datasetId, 'datasetId'),
    scenarioSetKey: requiredText(scenarioSetKey, 'scenarioSetKey'),
  });
  const rows = runRows(registerRows, run.datasetId, run.scenarioSetKey);
  const currentEvidence = [];
  const excludedEvidence = [];
  mechanicalEvidence(rows, mechanicalResultsByScope, currentEvidence, excludedEvidence);
  sbcEvidence(rows, sbcResultsByScope, currentEvidence, excludedEvidence);
  aivEvidence(rows, aivSession, run.scenarioSetKey, currentEvidence, excludedEvidence);

  return deepFreeze({
    schema: VIBRATION_FACILITY_MECHANISM_EVIDENCE_SCHEMA,
    authority: VIBRATION_FACILITY_MECHANISM_EVIDENCE_AUTHORITY,
    run,
    currentEvidence,
    excludedEvidence,
    summary: {
      currentCount: currentEvidence.length,
      excludedCount: excludedEvidence.length,
      currentByMechanism: countByMechanism(currentEvidence),
      excludedByMechanism: countByMechanism(excludedEvidence),
      completenessDetermined: false,
      governingResultDetermined: false,
    },
  });
}
