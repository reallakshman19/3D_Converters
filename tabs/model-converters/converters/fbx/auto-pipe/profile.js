export const AUTO_PIPE_PROFILE = Object.freeze({
  schema: 'FbxAutoPipeProfile.v1',
  minimumSpanMm: 1e-6,
  normalDotTolerance: 1e-8,
  radiusAbsoluteMm: 0.05,
  radiusRatio: 0.001,
  axialAbsoluteMm: 0.01,
  axialSpanRatio: 0.0001,
  radialAbsoluteMm: 0.05,
  radialRadiusRatio: 0.001,
});

export const AUTO_PIPE_CONNECTIVITY_PROFILE = Object.freeze({
  schema: 'FbxAutoPipeConnectivityProfile.v1',
  centreAbsoluteMm: 1e-6,
  normalDotTolerance: 1e-8,
  radiusAbsoluteMm: 0.05,
  radiusRatio: 0.001,
});

export function scaledTolerance(absolute, ratio, scale) {
  return Math.max(absolute, ratio * scale);
}
