import { VIBRATION_INTEGRITY_DATASET_SCHEMA } from '../dataset/schema.js';

export const VIBRATION_FACILITY_FIT_PLAN_SCHEMA = 'VibrationFacilityFitPlan.v1';
export const VIBRATION_FACILITY_FIT_CALCULATION_ID = 'VIB.FIV.FLOW_TURBULENCE';

export const FIT_FACILITY_ENRICHMENT_PROPERTIES = Object.freeze({
  ASSESSMENT_POINT: 'FIT_ASSESSMENT_POINT',
  OUTSIDE_DIAMETER: 'OUTSIDE_DIAMETER',
  WALL_THICKNESS: 'WALL_THICKNESS',
  INSIDE_DIAMETER: 'INSIDE_DIAMETER',
  MAX_UNSUPPORTED_SPAN: 'MAX_UNSUPPORTED_SPAN',
  NATURAL_FREQUENCY: 'NATURAL_FREQUENCY',
});

const SUPPORTED_PHASES = Object.freeze(['LIQUID', 'GAS', 'MULTIPHASE']);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function planningError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationFacilityFitPlanError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function assertDataset(dataset) {
  if (dataset?.schema !== VIBRATION_INTEGRITY_DATASET_SCHEMA) {
    throw planningError(
      'FIT_FACILITY_DATASET_SCHEMA_MISMATCH',
      `FIT facility planning requires ${VIBRATION_INTEGRITY_DATASET_SCHEMA}.`,
      { actual: dataset?.schema ?? null },
    );
  }
  if (!Array.isArray(dataset.lines) || !Array.isArray(dataset.operatingCases) || !Array.isArray(dataset.enrichment)) {
    throw planningError(
      'FIT_FACILITY_DATASET_INVALID',
      'Dataset lines, operatingCases and enrichment must be arrays.',
    );
  }
  return dataset;
}

function lineByCanonicalId(dataset) {
  const result = new Map();
  for (const line of dataset.lines) {
    for (const canonicalId of line.elementCanonicalIds ?? []) {
      if (result.has(canonicalId)) {
        throw planningError(
          'FIT_FACILITY_DUPLICATE_ELEMENT_LINE',
          `Canonical ID ${canonicalId} appears on more than one line.`,
          { canonicalId },
        );
      }
      result.set(canonicalId, line.line);
    }
  }
  for (const canonicalId of dataset.unassignedElementCanonicalIds ?? []) {
    if (!result.has(canonicalId)) result.set(canonicalId, null);
  }
  return result;
}

function enrichmentIndex(dataset) {
  const index = new Map();
  for (const row of dataset.enrichment) {
    const key = `${row.canonicalId}\u0000${row.caseId ?? ''}\u0000${row.property}`;
    index.set(key, row);
  }
  return index;
}

function enrichmentRow(index, canonicalId, property, caseId = null) {
  return index.get(`${canonicalId}\u0000${caseId ?? ''}\u0000${property}`) ?? null;
}

function assessmentPoints(dataset, lineMap, index) {
  const points = [];
  for (const canonicalId of lineMap.keys()) {
    const marker = enrichmentRow(index, canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.ASSESSMENT_POINT);
    if (!marker || marker.value !== true) continue;
    points.push({ canonicalId, line: lineMap.get(canonicalId), marker });
  }
  return points.sort((a, b) => String(a.line ?? '').localeCompare(String(b.line ?? ''))
    || a.canonicalId.localeCompare(b.canonicalId));
}

function quantityEvidence(row, field, missing, invalid) {
  if (!row) {
    missing.push(field);
    return null;
  }
  if (typeof row.value !== 'number' || !Number.isFinite(row.value) || typeof row.unit !== 'string' || !row.unit.trim()) {
    invalid.push(field);
    return null;
  }
  return row;
}

function optionalQuantityEvidence(row, field, invalid) {
  if (!row) return null;
  if (typeof row.value !== 'number' || !Number.isFinite(row.value) || typeof row.unit !== 'string' || !row.unit.trim()) {
    invalid.push(field);
    return null;
  }
  return row;
}

function processFlowSelection(row) {
  if (row.velocity) return 'VELOCITY_OVERRIDE';
  if (row.massFlow) return 'MASS_FLOW';
  return 'MISSING';
}

function operatingCaseTrace(row) {
  return {
    caseId: row.caseId,
    line: row.line,
    source: row.source,
    sourceRevision: row.sourceRevision ?? null,
    recordId: row.recordId ?? null,
    flowSelection: processFlowSelection(row),
    alternateMassFlowPresent: Boolean(row.velocity && row.massFlow),
  };
}

function enrichmentTrace(row, selection = 'GLOBAL') {
  if (!row) return null;
  return {
    property: row.property,
    canonicalId: row.canonicalId,
    caseId: row.caseId ?? null,
    source: row.source,
    sourceRevision: row.sourceRevision ?? null,
    recordId: row.recordId ?? null,
    status: row.status ?? null,
    reviewer: row.reviewer ?? null,
    selection,
  };
}

function resolveNaturalFrequency(index, canonicalId, caseId, invalid) {
  const caseSpecific = enrichmentRow(
    index,
    canonicalId,
    FIT_FACILITY_ENRICHMENT_PROPERTIES.NATURAL_FREQUENCY,
    caseId,
  );
  if (caseSpecific) {
    const row = optionalQuantityEvidence(caseSpecific, 'naturalFrequency', invalid);
    return { row, selection: 'CASE_SPECIFIC' };
  }
  const global = enrichmentRow(
    index,
    canonicalId,
    FIT_FACILITY_ENRICHMENT_PROPERTIES.NATURAL_FREQUENCY,
  );
  const row = optionalQuantityEvidence(global, 'naturalFrequency', invalid);
  return { row, selection: global ? 'GLOBAL' : 'NOT_PRESENT' };
}

function processReadiness(operatingCase, missing, invalid) {
  const phase = operatingCase.phase;
  if (!phase) missing.push('phase');
  else if (!SUPPORTED_PHASES.includes(phase)) invalid.push('phase');

  if (!operatingCase.density) missing.push('density');
  if (!operatingCase.massFlow && !operatingCase.velocity) missing.push('massFlowOrVelocity');
  if (phase === 'GAS' && !operatingCase.dynamicViscosity) missing.push('dynamicViscosity');

  return phase;
}

function requestFromEvidence({
  operatingCase,
  phase,
  outsideDiameter,
  wallThickness,
  insideDiameter,
  maximumUnsupportedSpan,
  naturalFrequency,
}) {
  const inputs = {
    phase,
    outsideDiameter: outsideDiameter.value,
    wallThickness: wallThickness.value,
    maximumUnsupportedSpan: maximumUnsupportedSpan.value,
    density: operatingCase.density.value,
  };
  const inputUnits = {
    outsideDiameter: outsideDiameter.unit,
    wallThickness: wallThickness.unit,
    maximumUnsupportedSpan: maximumUnsupportedSpan.unit,
    density: operatingCase.density.unit,
  };

  if (insideDiameter) {
    inputs.insideDiameter = insideDiameter.value;
    inputUnits.insideDiameter = insideDiameter.unit;
  }
  if (operatingCase.velocity) {
    inputs.fluidVelocity = operatingCase.velocity.value;
    inputUnits.fluidVelocity = operatingCase.velocity.unit;
  } else if (operatingCase.massFlow) {
    inputs.massFlow = operatingCase.massFlow.value;
    inputUnits.massFlow = operatingCase.massFlow.unit;
  }
  if (phase === 'GAS') {
    inputs.gasDynamicViscosity = operatingCase.dynamicViscosity.value;
    inputUnits.gasDynamicViscosity = operatingCase.dynamicViscosity.unit;
  }
  if (phase === 'MULTIPHASE') {
    inputs.multiphaseResolutionMode = 'AGGREGATE_EFFECTIVE';
  }
  if (naturalFrequency) {
    inputs.naturalFrequency = naturalFrequency.value;
    inputUnits.naturalFrequency = naturalFrequency.unit;
  }

  return {
    calculationId: VIBRATION_FACILITY_FIT_CALCULATION_ID,
    inputs,
    inputUnits,
    options: {
      qualificationMode: 'benchmark',
      includeEvidence: true,
    },
  };
}

function noCaseItem(point) {
  return {
    status: 'NOT_READY',
    calculationId: VIBRATION_FACILITY_FIT_CALCULATION_ID,
    canonicalId: point.canonicalId,
    line: point.line,
    caseId: null,
    missing: Object.freeze(point.line ? ['operatingCase'] : ['line', 'operatingCase']),
    invalid: Object.freeze([]),
    reasons: Object.freeze([
      point.line ? 'LINE_HAS_NO_OPERATING_CASES' : 'ASSESSMENT_POINT_HAS_NO_LINE',
    ]),
    request: null,
    sourceTrace: Object.freeze({ assessmentPoint: enrichmentTrace(point.marker) }),
  };
}

function planItem(point, operatingCase, index) {
  const missing = [];
  const invalid = [];
  const outsideDiameter = quantityEvidence(
    enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.OUTSIDE_DIAMETER),
    'outsideDiameter', missing, invalid,
  );
  const wallThickness = quantityEvidence(
    enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.WALL_THICKNESS),
    'wallThickness', missing, invalid,
  );
  const maximumUnsupportedSpan = quantityEvidence(
    enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.MAX_UNSUPPORTED_SPAN),
    'maximumUnsupportedSpan', missing, invalid,
  );
  const insideDiameter = optionalQuantityEvidence(
    enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.INSIDE_DIAMETER),
    'insideDiameter', invalid,
  );
  const naturalFrequencyResolution = resolveNaturalFrequency(index, point.canonicalId, operatingCase.caseId, invalid);
  const phase = processReadiness(operatingCase, missing, invalid);

  const ready = missing.length === 0 && invalid.length === 0;
  const geometryTrace = {
    outsideDiameter: enrichmentTrace(
      enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.OUTSIDE_DIAMETER),
    ),
    wallThickness: enrichmentTrace(
      enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.WALL_THICKNESS),
    ),
    insideDiameter: enrichmentTrace(
      enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.INSIDE_DIAMETER),
    ),
    maximumUnsupportedSpan: enrichmentTrace(
      enrichmentRow(index, point.canonicalId, FIT_FACILITY_ENRICHMENT_PROPERTIES.MAX_UNSUPPORTED_SPAN),
    ),
    naturalFrequency: enrichmentTrace(
      naturalFrequencyResolution.row,
      naturalFrequencyResolution.selection,
    ),
  };

  return {
    status: ready ? 'READY' : 'NOT_READY',
    calculationId: VIBRATION_FACILITY_FIT_CALCULATION_ID,
    canonicalId: point.canonicalId,
    line: point.line,
    caseId: operatingCase.caseId,
    missing: Object.freeze([...missing].sort()),
    invalid: Object.freeze([...invalid].sort()),
    reasons: Object.freeze(ready
      ? ['EXPLICIT_FIT_ASSESSMENT_POINT', 'REQUIRED_INPUT_EVIDENCE_AVAILABLE']
      : ['FIT_REQUEST_INPUT_INCOMPLETE']),
    request: ready ? requestFromEvidence({
      operatingCase,
      phase,
      outsideDiameter,
      wallThickness,
      insideDiameter,
      maximumUnsupportedSpan,
      naturalFrequency: naturalFrequencyResolution.row,
    }) : null,
    sourceTrace: Object.freeze({
      assessmentPoint: enrichmentTrace(point.marker),
      operatingCase: operatingCaseTrace(operatingCase),
      geometry: deepFreeze(geometryTrace),
    }),
  };
}

export function buildVibrationFacilityFitPlan(datasetInput = {}) {
  const dataset = assertDataset(datasetInput);
  const lineMap = lineByCanonicalId(dataset);
  const index = enrichmentIndex(dataset);
  const points = assessmentPoints(dataset, lineMap, index);
  const casesByLine = new Map();
  for (const operatingCase of dataset.operatingCases) {
    if (!casesByLine.has(operatingCase.line)) casesByLine.set(operatingCase.line, []);
    casesByLine.get(operatingCase.line).push(operatingCase);
  }

  const items = [];
  for (const point of points) {
    const cases = point.line ? casesByLine.get(point.line) ?? [] : [];
    if (!cases.length) {
      items.push(noCaseItem(point));
      continue;
    }
    for (const operatingCase of cases) items.push(planItem(point, operatingCase, index));
  }
  items.sort((a, b) => String(a.line ?? '').localeCompare(String(b.line ?? ''))
    || a.canonicalId.localeCompare(b.canonicalId)
    || String(a.caseId ?? '').localeCompare(String(b.caseId ?? '')));

  const ready = items.filter((item) => item.status === 'READY').length;
  return deepFreeze({
    schema: VIBRATION_FACILITY_FIT_PLAN_SCHEMA,
    authority: 'REQUEST_PLANNING_ONLY',
    engineeringAuthority: 'NONE',
    screeningAuthorized: false,
    calculationId: VIBRATION_FACILITY_FIT_CALCULATION_ID,
    qualificationMode: 'benchmark',
    datasetSchema: dataset.schema,
    datasetExchangeIntegrityStatus: dataset.exchangeIntegrityStatus ?? null,
    items,
    counts: {
      assessmentPoints: points.length,
      items: items.length,
      ready,
      notReady: items.length - ready,
    },
    warnings: Object.freeze([
      ...(points.length === 0 ? [{
        code: 'NO_FIT_ASSESSMENT_POINTS',
        message: 'No enrichment rows mark FIT_ASSESSMENT_POINT=true.',
      }] : []),
      ...(dataset.exchangeIntegrityStatus === 'LIMITED_ELEMENTS_ONLY' ? [{
        code: 'LIMITED_EXCHANGE_INPUT',
        message: 'FIT planning is based on an explicitly accepted limited Elements-only exchange.',
      }] : []),
    ]),
  });
}
