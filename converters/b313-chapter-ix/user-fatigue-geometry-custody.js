export const USER_KD3_ANALYSIS_GEOMETRY_TOLERANCE_MM = 1e-6;

function failure(code, message, details = {}) {
  return { ok: false, code, message, details, canUseForDesignAuthority: false };
}

function positive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function cycleId(row) {
  return String(row?.cycleId ?? '').trim() || null;
}

function declaredGeometry(row) {
  const geometry = row?.analysisGeometry;
  return geometry && typeof geometry === 'object' && !Array.isArray(geometry) ? geometry : null;
}

function mismatch(actual, expected) {
  return Math.abs(actual - expected) > USER_KD3_ANALYSIS_GEOMETRY_TOLERANCE_MM;
}

function validateExpectedGeometry(outsideDiameterMm, effectiveWallMm) {
  if (!positive(outsideDiameterMm) || !positive(effectiveWallMm)) {
    return failure(
      'USER_FATIGUE_CORE_GEOMETRY_INVALID',
      'CORE fatigue geometry requires positive finite outsideDiameterMm and effectiveWallMm.',
      { outsideDiameterMm, effectiveWallMm },
    );
  }
  return null;
}

function validateRowGeometry(row, expected) {
  const id = cycleId(row);
  const geometry = declaredGeometry(row);
  if (!geometry) {
    return failure(
      'USER_FATIGUE_ANALYSIS_GEOMETRY_REQUIRED',
      `${id ?? 'External KD3 row'} requires analysisGeometry before Seq/N can be consumed.`,
      { cycleId: id, field: 'analysisGeometry' },
    );
  }
  if (!positive(geometry.outsideDiameterMm) || !positive(geometry.effectiveWallMm)) {
    return failure(
      'USER_FATIGUE_ANALYSIS_GEOMETRY_INVALID',
      `${id ?? 'External KD3 row'} analysisGeometry requires positive finite OD and effective wall.`,
      { cycleId: id, analysisGeometry: geometry },
    );
  }
  if (mismatch(geometry.outsideDiameterMm, expected.outsideDiameterMm)) {
    return failure(
      'USER_FATIGUE_ANALYSIS_OD_MISMATCH',
      `${id ?? 'External KD3 row'} external analysis OD does not match the CORE fatigue OD.`,
      {
        cycleId: id,
        expectedOutsideDiameterMm: expected.outsideDiameterMm,
        suppliedOutsideDiameterMm: geometry.outsideDiameterMm,
        toleranceMm: USER_KD3_ANALYSIS_GEOMETRY_TOLERANCE_MM,
      },
    );
  }
  if (mismatch(geometry.effectiveWallMm, expected.effectiveWallMm)) {
    return failure(
      'USER_FATIGUE_ANALYSIS_WALL_MISMATCH',
      `${id ?? 'External KD3 row'} external analysis wall does not match the CORE fatigue wall.`,
      {
        cycleId: id,
        expectedEffectiveWallMm: expected.effectiveWallMm,
        suppliedEffectiveWallMm: geometry.effectiveWallMm,
        toleranceMm: USER_KD3_ANALYSIS_GEOMETRY_TOLERANCE_MM,
      },
    );
  }
  return null;
}

export function validateUserKd3ExternalAnalysisGeometry({
  outsideDiameterMm,
  effectiveWallMm,
  externalResults,
} = {}) {
  const expectedError = validateExpectedGeometry(outsideDiameterMm, effectiveWallMm);
  if (expectedError) return expectedError;
  if (!Array.isArray(externalResults) || !externalResults.length) {
    return failure(
      'USER_FATIGUE_RESULTS_REQUIRED',
      'externalResults must contain at least one geometry-bound KD3 result.',
      { field: 'externalResults' },
    );
  }
  const expected = { outsideDiameterMm, effectiveWallMm };
  for (const row of externalResults) {
    const error = validateRowGeometry(row, expected);
    if (error) return error;
  }
  return {
    ok: true,
    expectedGeometry: expected,
    rowCount: externalResults.length,
    toleranceMm: USER_KD3_ANALYSIS_GEOMETRY_TOLERANCE_MM,
    toleranceAuthority: 'REPOSITORY_DATA_COUPLING_QA_ONLY_NOT_ASME_ACCEPTANCE',
    canUseForDesignAuthority: false,
  };
}
