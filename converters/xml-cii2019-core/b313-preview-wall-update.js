import { calculateB313Thickness } from '../b313-thickness/index.js';
import { selectPipeWallForCalculation } from '../pipe-wall-master/index.js';

export const B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT = 12.5;
export const B313_PREVIEW_WALL_UPDATE_SCHEMA = 'xml-cii-b313-preview-wall-update/v1';

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function failure(code, message, details = {}) {
  return { ok: false, code, message, schema: B313_PREVIEW_WALL_UPDATE_SCHEMA, details };
}

export function calculateAndSelectPreviewB313Wall({
  dn,
  outsideDiameterMm,
  designPressure,
  pressureUnit,
  corrosionAllowanceMm,
  allowableStress,
  stressUnit,
  qualityFactorE,
  weldStrengthReductionW,
  coefficientY,
  dimensionStandard,
  edition = '2024',
} = {}) {
  const normalizedDn = positive(dn);
  const normalizedOd = positive(outsideDiameterMm);
  const normalizedPressure = positive(designPressure);
  const normalizedCorrosion = nonNegative(corrosionAllowanceMm);

  if (!normalizedDn) return failure('B313_PREVIEW_DN_REQUIRED', 'Preview DN must be a positive number.');
  if (!normalizedOd) return failure('B313_PREVIEW_OD_REQUIRED', 'Preview outside diameter must be a positive number.');
  if (!normalizedPressure) return failure('B313_PREVIEW_PRESSURE_REQUIRED', 'Preview design pressure must be a positive number.');
  if (normalizedCorrosion === null) return failure('B313_PREVIEW_CORROSION_REQUIRED', 'Preview corrosion allowance must be a non-negative number.');
  if (!String(pressureUnit || '').trim()) return failure('B313_PREVIEW_PRESSURE_UNIT_REQUIRED', 'Design-pressure unit is required.');
  if (!String(dimensionStandard || '').trim()) return failure('B313_PREVIEW_DIMENSION_STANDARD_REQUIRED', 'Pipe dimension standard is required.');

  const calculation = calculateB313Thickness({
    edition,
    pressureMode: 'internal',
    designPressure: normalizedPressure,
    pressureUnit,
    outsideDiameter: normalizedOd,
    lengthUnit: 'mm',
    allowableStress,
    stressUnit,
    qualityFactorE,
    weldStrengthReductionW,
    coefficientY,
    corrosionAllowance: normalizedCorrosion,
    allowanceUnit: 'mm',
    negativeMillTolerance: {
      basis: 'percent',
      value: B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT,
    },
  });

  if (!calculation.ok) {
    return failure('B313_PREVIEW_CALCULATION_FAILED', calculation.message || calculation.code, { calculation });
  }

  const selection = selectPipeWallForCalculation({
    dimensionStandard,
    dn: normalizedDn,
    calculation,
  });
  if (!selection.ok) {
    return failure('B313_PREVIEW_WALL_SELECTION_FAILED', selection.message || selection.code, { calculation, selection });
  }

  return {
    ok: true,
    code: 'B313_PREVIEW_WALL_SELECTED',
    schema: B313_PREVIEW_WALL_UPDATE_SCHEMA,
    dn: normalizedDn,
    outsideDiameterMm: normalizedOd,
    designPressure: normalizedPressure,
    pressureUnit: String(pressureUnit),
    corrosionAllowanceMm: normalizedCorrosion,
    negativeMillTolerancePct: B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT,
    dimensionStandard: selection.selected.dimensionStandard,
    calculation,
    selection,
    selectedNominalWallMm: selection.selected.nominalWallMm,
    selectedSchedule: selection.selected.schedule,
    equivalentSchedules: selection.selected.equivalentSchedules,
    selectionMarginMm: selection.selected.marginMm,
    authority: 'EXPLICIT_PREVIEW_ACTION_NOT_AUTOMATIC_WALL_AUTHORITY',
  };
}
