import {
  SBC_TYPE3_RECORD_KEY,
  calculateSbcType3FromUserEngineeringData,
} from './type3-user-data.js';

export const SBC_FACILITY_SCOPE_SCHEMA = 'SbcFacilityScope.v1';

function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} must be a non-empty string.`);
  return text;
}

function scopePart(value) {
  return encodeURIComponent(value === null || value === undefined ? '-' : String(value));
}

export function sbcFacilityScopeId(row = {}) {
  const line = requiredText(row.line, 'row.line');
  const canonicalId = requiredText(row.canonicalId, 'row.canonicalId');
  const caseId = row.caseId === null || row.caseId === undefined || row.caseId === ''
    ? null
    : String(row.caseId).trim();
  return `SBC-FACILITY/${scopePart(line)}/${scopePart(caseId)}/${scopePart(canonicalId)}`;
}

export function sbcFacilityScope(row = {}) {
  return Object.freeze({
    schema: SBC_FACILITY_SCOPE_SCHEMA,
    scopeId: sbcFacilityScopeId(row),
    line: requiredText(row.line, 'row.line'),
    caseId: row.caseId === null || row.caseId === undefined || row.caseId === ''
      ? null : String(row.caseId).trim(),
    canonicalId: requiredText(row.canonicalId, 'row.canonicalId'),
  });
}

export function sbcFacilityUserRows(row, userRows = []) {
  const scopeId = sbcFacilityScopeId(row);
  return Object.freeze((Array.isArray(userRows) ? userRows : []).filter((item) => (
    item?.mechanismId === 'smallBoreConnections'
      && item?.recordKey === SBC_TYPE3_RECORD_KEY
      && item?.scopeId === scopeId
  )));
}

function baseAuthority() {
  return Object.freeze({
    engineeringAuthority: 'NONE',
    screeningAuthority: 'NOT_AUTHORIZED',
    designAuthority: false,
  });
}

function masterAssistedEvaluation(scope, userRows, options) {
  const result = options.precomputedResult ?? null;
  if (!result) {
    return Object.freeze({
      ok: false, status: 'INPUT_REQUIRED', scope, userRows, result: null,
      mode: 'MASTER_ASSISTED', authority: baseAuthority(),
    });
  }
  if (result.scopeId !== scope.scopeId) {
    return Object.freeze({
      ok: false, status: 'INVALID_PRECOMPUTED_SCOPE', scope, userRows,
      result: Object.freeze({
        ok: false, status: 'INVALID_PRECOMPUTED_SCOPE',
        methodId: result.methodId ?? null, scopeId: result.scopeId ?? null,
        problems: Object.freeze([Object.freeze({
          term: 'scopeId', status: 'INVALID_INPUT', reason: 'SBC_PRECOMPUTED_SCOPE_MISMATCH',
        })]),
      }),
      mode: 'MASTER_ASSISTED', authority: baseAuthority(),
    });
  }
  return Object.freeze({
    ok: result.ok === true,
    status: result.status,
    scope,
    userRows,
    result,
    mode: 'MASTER_ASSISTED',
    authority: result.authority ?? baseAuthority(),
  });
}

export function evaluateSbcFacilityType3(row, options = {}) {
  const scope = sbcFacilityScope(row);
  const userRows = sbcFacilityUserRows(row, options.userRows);
  if (options.preferMasterAssisted) {
    return masterAssistedEvaluation(scope, userRows, options);
  }
  if (!userRows.length) {
    return Object.freeze({
      ok: false,
      status: 'INPUT_REQUIRED',
      scope,
      userRows,
      result: null,
      mode: 'USER_INPUT',
      authority: baseAuthority(),
    });
  }
  const result = calculateSbcType3FromUserEngineeringData({
    scopeId: scope.scopeId,
    userRows,
    governed: options.governed ?? {},
  });
  return Object.freeze({
    ok: result.ok,
    status: result.status,
    scope,
    userRows,
    result,
    mode: 'USER_INPUT',
    authority: result.authority,
  });
}
