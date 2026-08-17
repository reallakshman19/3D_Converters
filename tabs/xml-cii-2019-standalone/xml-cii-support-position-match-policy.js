function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function positiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function firstPositive(values) {
  for (const value of values) {
    const numeric = positiveNumber(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function normalizeMode(value) {
  const mode = text(value).toLowerCase();
  if (!mode || mode === 'euclidean' || mode === '3d' || mode === 'radius') return 'euclidean';
  if (mode === 'axis-box' || mode === 'box' || mode === 'axis') return 'axis-box';
  return mode;
}

function legacyToleranceMm(config = {}) {
  return firstPositive([
    config?.resolverJsonTrace?.coordinateTolerance,
    config?.jsonTrace?.coordinateTolerance,
    config?.dtxrCoordinateToleranceMm,
    config?.coordinateTolerance,
    config?.dtxrPositionOffset?.tolerance,
  ]) || 6;
}

export function resolveSupportPositionMatchPolicy(config = {}) {
  const raw = config?.supportPositionMatch && typeof config.supportPositionMatch === 'object'
    ? config.supportPositionMatch
    : null;
  const legacyTolerance = legacyToleranceMm(config);
  if (!raw || raw.enabled === false) {
    return {
      enabled: raw?.enabled !== false,
      mode: 'euclidean',
      toleranceMm: legacyTolerance,
      source: raw?.enabled === false ? 'legacy-fallback-disabled-new-policy' : 'legacy',
      valid: true,
      reason: '',
    };
  }

  const mode = normalizeMode(raw.mode || raw.distanceMode || 'euclidean');
  const toleranceMm = positiveNumber(raw.toleranceMm) || legacyTolerance;
  const valid = mode === 'euclidean';
  return {
    enabled: true,
    mode,
    toleranceMm,
    source: positiveNumber(raw.toleranceMm) !== null ? 'supportPositionMatch.toleranceMm' : 'legacy-fallback',
    valid,
    reason: valid ? '' : `Unsupported supportPositionMatch mode: ${mode}. Only euclidean is currently qualified.`,
  };
}

export function applySupportPositionMatchPolicy(config = {}) {
  const policy = resolveSupportPositionMatchPolicy(config);
  if (!policy.enabled || !policy.valid) return { config, policy };
  return {
    config: {
      ...config,
      resolverJsonTrace: {
        ...(config?.resolverJsonTrace || {}),
        coordinateTolerance: policy.toleranceMm,
      },
      dtxrCoordinateToleranceMm: policy.toleranceMm,
    },
    policy,
  };
}

export function supportPositionMatchExample(toleranceMm = 20) {
  const tolerance = positiveNumber(toleranceMm) || 20;
  return {
    supportPositionMatch: {
      enabled: true,
      toleranceMm: tolerance,
      mode: 'euclidean',
    },
  };
}
