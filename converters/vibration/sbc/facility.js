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

export function evaluateSbcFacilityType3(row, options = {}) {
  const scope = sbcFacilityScope(row);
  const userRows = sbcFacilityUserRows(row, options.userRows);
  if (!userRows.length) {
    return Object.freeze({
      ok: false,
      status: 'INPUT_REQUIRED',
      scope,
      userRows,
      result: null,
      authority: Object.freeze({
        engineeringAuthority: 'NONE',
        screeningAuthority: 'NOT_AUTHORIZED',
        designAuthority: false,
      }),
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
    authority: result.authority,
  });
}
