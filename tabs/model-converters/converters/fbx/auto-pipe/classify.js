import { transformPoint } from '../transform-policy.js';
import { compareOccurrenceId, compareText } from './identity.js';
import { AUTO_PIPE_PROFILE, scaledTolerance } from './profile.js';
import { dot, finiteVector, normalize, subtract } from './vector.js';

function fail(occurrence, reason, detail) {
  return Object.freeze({
    admitted: false,
    status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION',
    sourceOccurrenceId: occurrence.sourceOccurrenceId,
    sourceModelObjectId: occurrence.sourceModelObjectId,
    geometryObjectId: occurrence.geometryObjectIds?.[0] || null,
    reason,
    detail,
  });
}

function candidatesFor(derived, occurrenceId, geometryId) {
  return derived.candidates.filter((item) => item.sourceOccurrenceId === occurrenceId
    && item.geometryObjectId === geometryId);
}

function compareCentre(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left.centreMm[index] < right.centreMm[index]) return -1;
    if (left.centreMm[index] > right.centreMm[index]) return 1;
  }
  return compareText(left.portEvidenceId, right.portEvidenceId);
}

function roleAssignment(left, right, profile) {
  if (!finiteVector(left.centreMm) || !finiteVector(right.centreMm)
      || !finiteVector(left.normal) || !finiteVector(right.normal)) return null;
  if (profile.roleOrdering !== 'world-centre-lexicographic'
      || compareCentre(left, right) >= 0) return null;
  const delta = subtract(right.centreMm, left.centreMm), span = Math.hypot(...delta);
  if (!(span > profile.minimumSpanMm)) return null;
  const axis = normalize(delta);
  if (!axis) return null;
  const aligned = dot(left.normal, axis) <= -1 + profile.normalDotTolerance
    && dot(right.normal, axis) >= 1 - profile.normalDotTolerance;
  return aligned ? { A: left, L: right, spanMm: span, axis } : null;
}

function assignRoles(first, second, profile) {
  const assignments = [
    roleAssignment(first, second, profile),
    roleAssignment(second, first, profile),
  ].filter(Boolean);
  return assignments.length === 1 ? assignments[0] : null;
}

function radiusMatches(ports, profile) {
  if (![ports.A.radiusMm, ports.L.radiusMm].every((value) => Number.isFinite(value) && value > 0)) {
    return false;
  }
  const scale = Math.max(ports.A.radiusMm, ports.L.radiusMm);
  const tolerance = scaledTolerance(profile.radiusAbsoluteMm, profile.radiusRatio, scale);
  return Math.abs(ports.A.radiusMm - ports.L.radiusMm) <= tolerance;
}

function float64View(value) {
  if (value instanceof ArrayBuffer) return new Float64Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Float64Array(value.buffer, value.byteOffset, value.byteLength / 8);
  }
  return null;
}

function localControlPoints(selection) {
  const item = selection?.buffers.find((buffer) => buffer.role === 'control-points-mm');
  const view = float64View(item?.buffer?.bytes);
  if (!view || view.length % 3 !== 0) return [];
  const points = [];
  for (let index = 0; index < view.length; index += 3) {
    points.push([view[index], view[index + 1], view[index + 2]]);
  }
  return points;
}

function worldControlPoints(selection, occurrence) {
  return localControlPoints(selection).map((point) => (
    transformPoint(occurrence.geometryMatrixMm, point)
  ));
}

function cylinderResiduals(points, ports, profile) {
  const origin = ports.A.centreMm, axis = ports.axis;
  const radius = (ports.A.radiusMm + ports.L.radiusMm) / 2;
  const axialTolerance = scaledTolerance(
    profile.axialAbsoluteMm, profile.axialSpanRatio, ports.spanMm);
  const radialTolerance = scaledTolerance(
    profile.radialAbsoluteMm, profile.radialRadiusRatio, radius);
  for (const point of points) {
    if (!finiteVector(point)) return false;
    const offset = subtract(point, origin), axial = dot(offset, axis);
    if (axial < -axialTolerance || axial > ports.spanMm + axialTolerance) return false;
    const radial = subtract(offset, axis.map((value) => value * axial));
    if (Math.abs(Math.hypot(...radial) - radius) > radialTolerance) return false;
  }
  return points.length >= 6;
}

function validateCandidateSet(occurrence, candidates) {
  const admitted = candidates.filter((item) => item.admissionDisposition === 'ADMITTED');
  if (candidates.length !== 2 || admitted.length !== 2) {
    return { failure: fail(occurrence, 'BOUNDARY_COUNT',
      'PIPE requires exactly two admitted boundary loops and no rejected candidates.') };
  }
  if (new Set(admitted.map((item) => item.shellId)).size !== 1) {
    return { failure: fail(occurrence, 'SHELL_COUNT',
      'PIPE boundary loops must belong to one authoritative shell.') };
  }
  return { admitted };
}

export function classifyPipeOccurrence({
  occurrence, selection, derivedPortEvidence, profile = AUTO_PIPE_PROFILE,
}) {
  const geometryIds = occurrence.geometryObjectIds || [];
  if (geometryIds.length !== 1) {
    return fail(occurrence, 'GEOMETRY_COUNT', 'PIPE requires exactly one selected geometry.');
  }
  const geometryId = geometryIds[0];
  if (!selection || selection.geometry.geometryObjectId !== geometryId) {
    return fail(occurrence, 'GEOMETRY_BINDING', 'Selected topology does not bind to the occurrence geometry.');
  }
  const checked = validateCandidateSet(
    occurrence, candidatesFor(derivedPortEvidence, occurrence.sourceOccurrenceId, geometryId));
  if (checked.failure) return checked.failure;
  const ports = assignRoles(checked.admitted[0], checked.admitted[1], profile);
  if (!ports) {
    return fail(occurrence, 'ROLE_ASSIGNMENT',
      'Exactly one deterministic A/L assignment is required.');
  }
  if (!radiusMatches(ports, profile)) {
    return fail(occurrence, 'RADIUS_MISMATCH',
      'End radii exceed the PIPE admission tolerance.');
  }
  if (!cylinderResiduals(worldControlPoints(selection, occurrence), ports, profile)) {
    return fail(occurrence, 'CYLINDER_RESIDUAL',
      'Exact transformed control points do not form a constant-radius open cylinder.');
  }
  return Object.freeze({
    admitted: true,
    status: 'PIPE_INFERENCE_PASS',
    sourceOccurrenceId: occurrence.sourceOccurrenceId,
    sourceModelObjectId: occurrence.sourceModelObjectId,
    geometryObjectId: geometryId,
    ...ports,
  });
}

export function classifySelectedPipes({
  zoneGeometryEvidence, derivedPortEvidence, selections, profile = AUTO_PIPE_PROFILE,
}) {
  const selectionById = new Map(selections.map((item) => [item.geometry.geometryObjectId, item]));
  const occurrences = zoneGeometryEvidence.occurrenceEvidence
    .filter((item) => item.geometryObjectIds?.length)
    .sort((a, b) => compareOccurrenceId(a.sourceOccurrenceId, b.sourceOccurrenceId));
  return occurrences.map((occurrence) => classifyPipeOccurrence({
    occurrence,
    selection: selectionById.get(occurrence.geometryObjectIds?.[0]),
    derivedPortEvidence,
    profile,
  }));
}
