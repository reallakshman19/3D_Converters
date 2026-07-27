import { transformPoint, validateOccurrenceTransform } from '../transform-policy.js';
import { FBX_DERIVED_PORT_TOLERANCE_PROFILE } from './constants.js';
import { normalizedNumber } from './compare.js';
import { windingNormalForPoints } from './circle-fit.js';

function linearMatrix(matrix) {
  return [[matrix[0], matrix[3], matrix[6]], [matrix[1], matrix[4], matrix[7]],
    [matrix[2], matrix[5], matrix[8]]];
}

function determinant(value) {
  return value[0][0] * (value[1][1] * value[2][2] - value[1][2] * value[2][1])
    - value[0][1] * (value[1][0] * value[2][2] - value[1][2] * value[2][0])
    + value[0][2] * (value[1][0] * value[2][1] - value[1][1] * value[2][0]);
}

function inverse(value, det) {
  return [
    [(value[1][1] * value[2][2] - value[1][2] * value[2][1]) / det,
      (value[0][2] * value[2][1] - value[0][1] * value[2][2]) / det,
      (value[0][1] * value[1][2] - value[0][2] * value[1][1]) / det],
    [(value[1][2] * value[2][0] - value[1][0] * value[2][2]) / det,
      (value[0][0] * value[2][2] - value[0][2] * value[2][0]) / det,
      (value[0][2] * value[1][0] - value[0][0] * value[1][2]) / det],
    [(value[1][0] * value[2][1] - value[1][1] * value[2][0]) / det,
      (value[0][1] * value[2][0] - value[0][0] * value[2][1]) / det,
      (value[0][0] * value[1][1] - value[0][1] * value[1][0]) / det],
  ];
}

function multiplyTranspose(matrix, vector) {
  return [matrix[0][0] * vector[0] + matrix[1][0] * vector[1] + matrix[2][0] * vector[2],
    matrix[0][1] * vector[0] + matrix[1][1] * vector[1] + matrix[2][1] * vector[2],
    matrix[0][2] * vector[0] + matrix[1][2] * vector[1] + matrix[2][2] * vector[2]];
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function length(value) { return Math.sqrt(dot(value, value)); }
function normalize(value) { const size = length(value); return size ? value.map((item) => item / size) : null; }
function clean(value) { return value.map(normalizedNumber); }

function transformReason(error) {
  const text = String(error?.message || error);
  if (/inheritance/i.test(text)) return 'UNSUPPORTED_INHERITANCE';
  if (/missing geometry matrix/i.test(text)) return 'MISSING_TRANSFORM';
  if (/singular/i.test(text)) return 'SINGULAR_TRANSFORM';
  if (/shear/i.test(text)) return 'SHEAR_TRANSFORM';
  if (/non-uniform/i.test(text)) return 'NON_UNIFORM_SCALE';
  return 'NON_FINITE_RESULT';
}

function scaleFor(matrix) {
  const columns = [[matrix[0], matrix[1], matrix[2]], [matrix[3], matrix[4], matrix[5]],
    [matrix[6], matrix[7], matrix[8]]];
  return columns.reduce((sum, column) => sum + length(column), 0) / 3;
}

function tolerance(radiusMm) {
  const profile = FBX_DERIVED_PORT_TOLERANCE_PROFILE;
  return {
    planarityMm: Math.max(profile.planarityAbsoluteMm, radiusMm * profile.planarityRadiusRatio),
    circularMm: Math.max(profile.circularAbsoluteMm, radiusMm * profile.circularRadiusRatio),
  };
}

export function transformBoundaryFit(occurrence, fit, localPoints) {
  try { validateOccurrenceTransform(occurrence); }
  catch (error) { return { rejectionReasons: [transformReason(error)] }; }
  const matrix = occurrence.geometryMatrixMm, linear = linearMatrix(matrix), det = determinant(linear);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return { rejectionReasons: ['SINGULAR_TRANSFORM'] };
  const inverseMatrix = inverse(linear, det);
  const transformed = multiplyTranspose(inverseMatrix, fit.normal).map((value) => value * Math.sign(det));
  const worldNormal = normalize(transformed);
  if (!worldNormal) return { rejectionReasons: ['SINGULAR_TRANSFORM'] };
  const worldPoints = localPoints.map((point) => transformPoint(matrix, point));
  const winding = windingNormalForPoints(worldPoints);
  if (!winding || dot(worldNormal, winding) <= 0) return { rejectionReasons: ['MIRRORED_ORIENTATION_MISMATCH'] };
  const uniformScale = scaleFor(matrix), radiusMm = fit.radius * uniformScale;
  const planarityResidualMm = fit.planarityResidual * uniformScale;
  const circularResidualMm = fit.circularResidual * uniformScale;
  const limits = tolerance(radiusMm), reasons = [];
  if (radiusMm < FBX_DERIVED_PORT_TOLERANCE_PROFILE.minimumRadiusMm) reasons.push('RADIUS_BELOW_MINIMUM');
  if (planarityResidualMm > limits.planarityMm) reasons.push('NON_PLANAR');
  if (circularResidualMm > limits.circularMm) reasons.push('NON_CIRCULAR');
  return {
    centreMm: clean(transformPoint(matrix, fit.centre)), normal: clean(worldNormal),
    radiusMm: normalizedNumber(radiusMm), diameterMm: normalizedNumber(radiusMm * 2),
    planarityResidualMm: normalizedNumber(planarityResidualMm),
    circularResidualMm: normalizedNumber(circularResidualMm), tolerancesMm: limits,
    orientationRule: 'sign(det(A))*inverse-transpose(local-winding-normal)',
    transformDisposition: det < 0 ? 'MIRRORED_NEGATIVE_DETERMINANT_ACCEPTED' : 'ORDINARY_POSITIVE_DETERMINANT',
    rejectionReasons: reasons,
  };
}
