export const AIV_EXECUTABLE_CONTRACT_SCHEMA = 'AivExecutableContract.v1';

const PRESSURE_FACTORS = Object.freeze({ Pa: 1, kPa: 1e3, MPa: 1e6, bar: 1e5 });
const SUPPORTED_MASS_FLOW_UNITS = Object.freeze(['kg/s', 'kg/h']);
const SUPPORTED_TEMPERATURE_UNITS = Object.freeze(['K', 'degC']);
const SUPPORTED_MW_UNITS = Object.freeze(['g/mol', 'kg/kmol', 'kg/mol']);
const SUPPORTED_DISTANCE_UNITS = Object.freeze(['m', 'mm']);
const SUPPORTED_DIAMETER_UNITS = Object.freeze(['m', 'mm']);
const SUPPORTED_STAGE8_ASSESSMENT_TYPES = Object.freeze(['WELDOLET', 'WELDED_TEE']);
const SUPPORTED_SONIC_STATES = Object.freeze(['SONIC', 'NON_SONIC']);
const SUPPORTED_TRIM_STATES = Object.freeze(['NONE', 'MANUFACTURER_REDUCTION']);

function text(value) { return String(value ?? '').trim(); }
function finite(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function issue(kind, code, field, message, details = {}) {
  return Object.freeze({ kind, code, field, message, details: Object.freeze({ ...details }) });
}
function unitIssue(field, unit, allowed) {
  return issue('INVALID', 'AIV_EXECUTABLE_UNIT_UNSUPPORTED', field, `${field} uses unsupported unit ${unit || '(blank)'}.`, {
    unit: unit || null,
    allowed: [...allowed],
  });
}
function quantityPositive(quantity, field, allowedUnits, issues) {
  const value = finite(quantity?.value);
  const unit = text(quantity?.unit);
  if (!(value > 0)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_QUANTITY_NOT_POSITIVE', field, `${field} must be finite and positive.`));
  if (!allowedUnits.includes(unit)) issues.push(unitIssue(field, unit, allowedUnits));
  return value;
}

function pressurePa(quantity, field, issues) {
  const value = finite(quantity?.value);
  const unit = text(quantity?.unit);
  const factor = PRESSURE_FACTORS[unit];
  if (value === null) issues.push(issue('INVALID', 'AIV_EXECUTABLE_PRESSURE_NOT_FINITE', field, `${field} must be finite.`));
  if (!factor) issues.push(unitIssue(field, unit, Object.keys(PRESSURE_FACTORS)));
  return value === null || !factor ? null : value * factor;
}

function absolutePressurePa(source, key, field, issues) {
  const pressure = source?.[key];
  const value = pressurePa(pressure, field, issues);
  const basis = text(pressure?.basis);
  if (!['ABSOLUTE', 'GAUGE'].includes(basis)) {
    issues.push(issue('INVALID', 'AIV_EXECUTABLE_PRESSURE_BASIS_INVALID', `${field}.basis`, `${field} basis must be ABSOLUTE or GAUGE.`));
    return null;
  }
  if (value === null) return null;
  if (basis === 'ABSOLUTE') return value;
  if (!source?.referencePressure || !text(source.referencePressureSource) || !text(source.referencePressureSourceRevision)) {
    issues.push(issue('INVALID', 'AIV_EXECUTABLE_GAUGE_REFERENCE_EVIDENCE_REQUIRED', 'source.referencePressure', 'Gauge pressure requires reference pressure, source and source revision before execution.'));
  }
  const reference = pressurePa(source?.referencePressure, 'Reference Pressure', issues);
  return reference === null ? null : value + reference;
}

function validateTemperature(quantity, issues) {
  const value = finite(quantity?.value);
  const unit = text(quantity?.unit);
  if (value === null) issues.push(issue('INVALID', 'AIV_EXECUTABLE_TEMPERATURE_NOT_FINITE', 'source.upstreamTemperature', 'Upstream Temperature must be finite.'));
  if (!SUPPORTED_TEMPERATURE_UNITS.includes(unit)) {
    issues.push(unitIssue('source.upstreamTemperature', unit, SUPPORTED_TEMPERATURE_UNITS));
    return;
  }
  const kelvin = unit === 'K' ? value : value === null ? null : value + 273.15;
  if (!(kelvin > 0)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_TEMPERATURE_NOT_POSITIVE_K', 'source.upstreamTemperature', 'Upstream Temperature must be above absolute zero.'));
}

function validateTrim(row, issues) {
  const trim = row?.lowNoiseTrim;
  const state = text(trim?.state);
  if (!SUPPORTED_TRIM_STATES.includes(state)) {
    issues.push(issue('INVALID', 'AIV_EXECUTABLE_TRIM_STATE_INVALID', 'source.lowNoiseTrim.state', 'Low-noise trim state must be NONE or MANUFACTURER_REDUCTION before execution.'));
    return;
  }
  if (state === 'NONE') return;
  const value = finite(trim?.reduction?.value);
  const unit = text(trim?.reduction?.unit);
  if (!(value > 0)) issues.push(issue('INVALID', 'AIV_LOW_NOISE_TRIM_REDUCTION_INVALID', 'source.lowNoiseTrim.reduction', 'Manufacturer trim reduction must be finite and positive.'));
  if (unit !== 'dB') issues.push(unitIssue('source.lowNoiseTrim.reduction', unit, ['dB']));
  if (!text(trim?.source) || !text(trim?.sourceRevision)) {
    issues.push(issue('INVALID', 'AIV_EXECUTABLE_TRIM_EVIDENCE_REQUIRED', 'source.lowNoiseTrim', 'Manufacturer trim requires source and source revision before execution.'));
  }
}

export function validateAivExecutableSource(row) {
  if (!row) return Object.freeze([]);
  const issues = [];
  if (!text(row.sourceCanonicalId) || !text(row.caseId)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_SOURCE_IDENTITY_REQUIRED', 'source', 'Source Canonical ID and Operating Case are required before execution.'));
  if (!SUPPORTED_SONIC_STATES.includes(text(row.sonicState))) issues.push(issue('INVALID', 'AIV_EXECUTABLE_SONIC_STATE_INVALID', 'source.sonicState', 'Sonic state must be SONIC or NON_SONIC before execution.'));
  quantityPositive(row.massFlow, 'source.massFlow', SUPPORTED_MASS_FLOW_UNITS, issues);
  quantityPositive(row.molecularWeight, 'source.molecularWeight', SUPPORTED_MW_UNITS, issues);
  validateTemperature(row.upstreamTemperature, issues);
  validateTrim(row, issues);
  const p1 = absolutePressurePa(row, 'upstreamPressure', 'source.upstreamPressure', issues);
  const p2 = absolutePressurePa(row, 'downstreamPressure', 'source.downstreamPressure', issues);
  if (p1 !== null && !(p1 > 0)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_UPSTREAM_ABSOLUTE_PRESSURE_NOT_POSITIVE', 'source.upstreamPressure', 'Resolved upstream absolute pressure must be greater than zero.'));
  if (p2 !== null && !(p2 > 0)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_DOWNSTREAM_ABSOLUTE_PRESSURE_NOT_POSITIVE', 'source.downstreamPressure', 'Resolved downstream absolute pressure must be greater than zero.'));
  if (p1 !== null && p2 !== null && !(p1 > p2)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_PRESSURE_DROP_INVALID', 'source.upstreamPressure', 'Resolved upstream absolute pressure must exceed downstream absolute pressure.'));
  return Object.freeze(issues);
}

function validateDiameter(quantity, field, issues) {
  quantityPositive(quantity, field, SUPPORTED_DIAMETER_UNITS, issues);
}

export function validateAivExecutableAssessment(row) {
  if (!row) return Object.freeze([]);
  const issues = [];
  if (!text(row.assessmentCanonicalId)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_ASSESSMENT_IDENTITY_REQUIRED', 'assessment.assessmentCanonicalId', 'Assessment Canonical ID is required before execution.'));
  if (!SUPPORTED_STAGE8_ASSESSMENT_TYPES.includes(text(row.assessmentType))) {
    issues.push(issue(
      'METHOD_GAP',
      'AIV_EXECUTABLE_ASSESSMENT_TYPE_OUTSIDE_STAGE8_ENVELOPE',
      'assessment.assessmentType',
      'Current qualified Stage-8 discontinuity model is limited to WELDOLET and WELDED_TEE assessments.',
      { assessmentType: row.assessmentType ?? null },
    ));
  }
  validateDiameter(row.mainOutsideDiameter, 'assessment.mainOutsideDiameter', issues);
  validateDiameter(row.mainInsideDiameter, 'assessment.mainInsideDiameter', issues);
  if (SUPPORTED_STAGE8_ASSESSMENT_TYPES.includes(text(row.assessmentType))) validateDiameter(row.branchOutsideDiameter, 'assessment.branchOutsideDiameter', issues);
  return Object.freeze(issues);
}

export function validateAivExecutableRelationship(row) {
  if (!row || row.applicabilityDisposition !== 'APPLICABLE') return Object.freeze([]);
  const issues = [];
  if (!text(row.sourceCanonicalId) || !text(row.assessmentCanonicalId) || !text(row.caseId)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_RELATIONSHIP_IDENTITY_REQUIRED', 'relationship', 'Applicable relationship requires Source, Assessment and Operating Case identities.'));
  const value = finite(row.physicalDistance?.value);
  const unit = text(row.physicalDistance?.unit);
  if (value === null || value < 0) issues.push(issue('INVALID', 'AIV_EXECUTABLE_DISTANCE_INVALID', 'relationship.physicalDistance', 'Physical Distance must be finite and non-negative.'));
  if (!SUPPORTED_DISTANCE_UNITS.includes(unit)) issues.push(unitIssue('relationship.physicalDistance', unit, SUPPORTED_DISTANCE_UNITS));
  if (!text(row.distanceSource) || !text(row.distanceSourceRevision)) issues.push(issue('INVALID', 'AIV_EXECUTABLE_DISTANCE_EVIDENCE_REQUIRED', 'relationship.physicalDistance', 'Applicable relationship requires Distance Source and Distance Source Revision.'));
  return Object.freeze(issues);
}

function scopeKey(row) { return JSON.stringify([text(row?.assessmentCanonicalId), text(row?.caseId)]); }
function groupToken(row) { return text(row?.simultaneousSourceGroup) || '(IMPLICIT_SINGLE_GROUP)'; }

export function findAivUnsupportedSimultaneousScopes(relationships = []) {
  const scopes = new Map();
  relationships.forEach((row, index) => {
    if (row?.applicabilityDisposition !== 'APPLICABLE') return;
    const key = scopeKey(row);
    if (!scopes.has(key)) scopes.set(key, { rows: [], groups: new Set() });
    const scope = scopes.get(key);
    scope.rows.push(index);
    scope.groups.add(groupToken(row));
  });
  return Object.freeze([...scopes.entries()].flatMap(([key, scope]) => {
    if (scope.groups.size <= 1) return [];
    const [assessmentCanonicalId, caseId] = JSON.parse(key);
    return [Object.freeze({
      assessmentCanonicalId,
      caseId,
      relationshipIndices: Object.freeze([...scope.rows]),
      groups: Object.freeze([...scope.groups].sort()),
    })];
  }));
}

export function validateAivExecutableContract({ sources = [], assessments = [], relationships = [] } = {}) {
  const issues = [];
  sources.forEach((row, index) => validateAivExecutableSource(row).forEach((item) => issues.push({ ...item, table: 'sources', rowIndex: index })));
  assessments.forEach((row, index) => validateAivExecutableAssessment(row).forEach((item) => issues.push({ ...item, table: 'assessments', rowIndex: index })));
  relationships.forEach((row, index) => validateAivExecutableRelationship(row).forEach((item) => issues.push({ ...item, table: 'relationships', rowIndex: index })));
  for (const scope of findAivUnsupportedSimultaneousScopes(relationships)) {
    for (const rowIndex of scope.relationshipIndices) issues.push({
      ...issue('METHOD_GAP', 'AIV_MULTIPLE_SIMULTANEOUS_GROUPS_UNSUPPORTED', 'relationship.simultaneousSourceGroup', 'Multiple simultaneous-source groups for one Assessment + Operating Case require a separately qualified result-scope contract.', scope),
      table: 'relationships',
      rowIndex,
    });
  }
  return Object.freeze({
    schema: AIV_EXECUTABLE_CONTRACT_SCHEMA,
    valid: issues.length === 0,
    issues: Object.freeze(issues.map(Object.freeze)),
  });
}

export function assertAivExecutableContract(input) {
  const validation = validateAivExecutableContract(input);
  if (validation.valid) return validation;
  const error = new Error(`AIV executable screening contract rejected ${validation.issues.length} issue(s).`);
  error.name = 'AivExecutableContractError';
  error.code = 'AIV_EXECUTABLE_CONTRACT_INVALID';
  error.details = validation;
  throw error;
}
