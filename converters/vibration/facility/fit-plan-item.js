import {
  FIT_FACILITY_ENRICHMENT_PROPERTIES,
  FIT_FACILITY_SUPPORTED_PHASES,
  VIBRATION_FACILITY_FIT_CALCULATION_ID,
} from './fit-plan-contract.js';
import {
  fitFacilityEnrichmentRow,
  fitFacilityEnrichmentTrace,
  fitFacilityOperatingCaseTrace,
} from './fit-plan-context.js';

function quantityEvidence(row, field, missing, invalid) {
  if (!row) {
    missing.push(field);
    return null;
  }
  if (typeof row.value !== 'number' || !Number.isFinite(row.value)
      || typeof row.unit !== 'string' || !row.unit.trim()) {
    invalid.push(field);
    return null;
  }
  return row;
}

function optionalQuantityEvidence(row, field, invalid) {
  if (!row) return null;
  if (typeof row.value !== 'number' || !Number.isFinite(row.value)
      || typeof row.unit !== 'string' || !row.unit.trim()) {
    invalid.push(field);
    return null;
  }
  return row;
}

function resolveNaturalFrequency(index, canonicalId, caseId, invalid) {
  const caseSpecific = fitFacilityEnrichmentRow(
    index,
    canonicalId,
    FIT_FACILITY_ENRICHMENT_PROPERTIES.NATURAL_FREQUENCY,
    caseId,
  );
  if (caseSpecific) {
    return {
      row: optionalQuantityEvidence(caseSpecific, 'naturalFrequency', invalid),
      selection: 'CASE_SPECIFIC',
    };
  }
  const global = fitFacilityEnrichmentRow(
    index,
    canonicalId,
    FIT_FACILITY_ENRICHMENT_PROPERTIES.NATURAL_FREQUENCY,
  );
  return {
    row: optionalQuantityEvidence(global, 'naturalFrequency', invalid),
    selection: global ? 'GLOBAL' : 'NOT_PRESENT',
  };
}

function processReadiness(operatingCase, missing, invalid) {
  const phase = operatingCase.phase;
  if (!phase) missing.push('phase');
  else if (!FIT_FACILITY_SUPPORTED_PHASES.includes(phase)) invalid.push('phase');
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
  if (phase === 'MULTIPHASE') inputs.multiphaseResolutionMode = 'AGGREGATE_EFFECTIVE';
  if (naturalFrequency) {
    inputs.naturalFrequency = naturalFrequency.value;
    inputUnits.naturalFrequency = naturalFrequency.unit;
  }
  return {
    calculationId: VIBRATION_FACILITY_FIT_CALCULATION_ID,
    inputs,
    inputUnits,
    options: { qualificationMode: 'benchmark', includeEvidence: true },
  };
}

function geometryTrace(index, canonicalId, naturalFrequencyResolution) {
  const property = FIT_FACILITY_ENRICHMENT_PROPERTIES;
  return {
    outsideDiameter: fitFacilityEnrichmentTrace(
      fitFacilityEnrichmentRow(index, canonicalId, property.OUTSIDE_DIAMETER),
    ),
    wallThickness: fitFacilityEnrichmentTrace(
      fitFacilityEnrichmentRow(index, canonicalId, property.WALL_THICKNESS),
    ),
    insideDiameter: fitFacilityEnrichmentTrace(
      fitFacilityEnrichmentRow(index, canonicalId, property.INSIDE_DIAMETER),
    ),
    maximumUnsupportedSpan: fitFacilityEnrichmentTrace(
      fitFacilityEnrichmentRow(index, canonicalId, property.MAX_UNSUPPORTED_SPAN),
    ),
    naturalFrequency: fitFacilityEnrichmentTrace(
      naturalFrequencyResolution.row,
      naturalFrequencyResolution.selection,
    ),
  };
}

export function buildFitFacilityNoCaseItem(point) {
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
    sourceTrace: Object.freeze({ assessmentPoint: fitFacilityEnrichmentTrace(point.marker) }),
  };
}

export function buildFitFacilityPlanItem(point, operatingCase, index) {
  const missing = [];
  const invalid = [];
  const property = FIT_FACILITY_ENRICHMENT_PROPERTIES;
  const outsideDiameter = quantityEvidence(
    fitFacilityEnrichmentRow(index, point.canonicalId, property.OUTSIDE_DIAMETER),
    'outsideDiameter', missing, invalid,
  );
  const wallThickness = quantityEvidence(
    fitFacilityEnrichmentRow(index, point.canonicalId, property.WALL_THICKNESS),
    'wallThickness', missing, invalid,
  );
  const maximumUnsupportedSpan = quantityEvidence(
    fitFacilityEnrichmentRow(index, point.canonicalId, property.MAX_UNSUPPORTED_SPAN),
    'maximumUnsupportedSpan', missing, invalid,
  );
  const insideDiameter = optionalQuantityEvidence(
    fitFacilityEnrichmentRow(index, point.canonicalId, property.INSIDE_DIAMETER),
    'insideDiameter', invalid,
  );
  const naturalFrequency = resolveNaturalFrequency(index, point.canonicalId, operatingCase.caseId, invalid);
  const phase = processReadiness(operatingCase, missing, invalid);
  const ready = missing.length === 0 && invalid.length === 0;

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
      naturalFrequency: naturalFrequency.row,
    }) : null,
    sourceTrace: Object.freeze({
      assessmentPoint: fitFacilityEnrichmentTrace(point.marker),
      operatingCase: fitFacilityOperatingCaseTrace(operatingCase),
      geometry: geometryTrace(index, point.canonicalId, naturalFrequency),
    }),
  };
}
