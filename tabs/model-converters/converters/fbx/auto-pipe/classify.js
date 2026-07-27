import { AUTO_PIPE_PROFILE, scaledTolerance } from './profile.js';
import { distance, dot, finiteVector, normalize, subtract } from './vector.js';

function fail(reason, detail) {
  return Object.freeze({ admitted: false, status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION', reason, detail });
}

function admittedCandidates(derived, occurrenceId, geometryId) {
  return derived.candidates.filter((item) => item.sourceOccurrenceId === occurrenceId
    && item.geometryObjectId === geometryId && item.admissionDisposition === 'ADMITTED');
}

function allCandidates(derived, occurrenceId, geometryId) {
  return derived.candidates.filter((item) => item.sourceOccurrenceId === occurrenceId
    && item.geometryObjectId === geometryId);
}

function roleAssignment(left, right, profile) {
  if (!finiteVector(left.centreMm) || !finiteVector(right.centreMm)
      || !finiteVector(left.normal) || !finiteVector(right.normal)) return null;
  const delta = subtract(right.centreMm, left.centreMm), span = Math.hypot(...delta);
  if (!(span > profile.minimumSpanMm)) return null;
  const axis = normalize(delta);
  const aligned = dot(left.normal, axis) <= -1 + profile.normalDotTolerance
    && dot(right.normal, axis) >= 1 - profile.normalDotTolerance;
  return aligned ? { A: left, L: right, spanMm: span, axis } : null;
}

function assignRoles(first, second, profile) {
  const assignments = [roleAssignment(first, second, profile), roleAssignment(second, first, profile)].filter(Boolean);
  return assignments.length === 1 ? assignments[0] : null;
}

function radiusMatches(ports, profile) {
  const scale = Math.max(ports.A.radiusMm, ports.L.radiusMm);
  const tolerance = scaledTolerance(profile.radiusAbsoluteMm, profile.radiusRatio, scale);
  return Math.abs(ports.A.radiusMm - ports.L.radiusMm) <= tolerance;
}

function controlPoints(selection) {
  const item = selection.buffers.find((buffer) => buffer.role === 'control-points-mm');
  if (!item) return [];
  const bytes = item.buffer.bytes;
  const view = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8);
  const points = [];
  for (let index = 0; index < view.length; index += 3) points.push([view[index], view[index + 1], view[index + 2]]);
  return points;
}

function cylinderResiduals(points, ports, profile) {
  const origin = ports.A.centreMm, axis = ports.axis, radius = (ports.A.radiusMm + ports.L.radiusMm) / 2;
  const axialTolerance = scaledTolerance(profile.axialAbsoluteMm, profile.axialSpanRatio, ports.spanMm);
  const radialTolerance = scaledTolerance(profile.radialAbsoluteMm, profile.radialRadiusRatio, radius);
  for (const point of points) {
    const offset = subtract(point, origin), axial = dot(offset, axis);
    if (axial < -axialTolerance || axial > ports.spanMm + axialTolerance) return false;
    const radial = subtract(offset, axis.map((value) => value * axial));
    if (Math.abs(Math.hypot(...radial) - radius) > radialTolerance) return false;
  }
  return true;
}

export function classifyPipeOccurrence({ occurrence, selection, derivedPortEvidence, profile = AUTO_PIPE_PROFILE }) {
  const geometryIds = occurrence.geometryObjectIds || [];
  if (geometryIds.length !== 1) return fail('GEOMETRY_COUNT', 'PIPE requires exactly one selected geometry.');
  const geometryId = geometryIds[0], candidates = allCandidates(derivedPortEvidence, occurrence.sourceOccurrenceId, geometryId);
  const admitted = admittedCandidates(derivedPortEvidence, occurrence.sourceOccurrenceId, geometryId);
  if (candidates.length !== 2 || admitted.length !== 2) return fail('BOUNDARY_COUNT', 'PIPE requires exactly two admitted boundary loops and no rejected candidates.');
  const ports = assignRoles(admitted[0], admitted[1], profile);
  if (!ports) return fail('ROLE_ASSIGNMENT', 'Exactly one deterministic A/L assignment is required.');
  if (!radiusMatches(ports, profile)) return fail('RADIUS_MISMATCH', 'End radii exceed the PIPE admission tolerance.');
  if (!cylinderResiduals(controlPoints(selection), ports, profile)) return fail('CYLINDER_RESIDUAL', 'Exact control points do not form a constant-radius open cylinder.');
  return Object.freeze({ admitted: true, status: 'PIPE_INFERENCE_PASS', geometryObjectId: geometryId, ...ports });
}

export function classifySelectedPipes({ zoneGeometryEvidence, derivedPortEvidence, selections, profile = AUTO_PIPE_PROFILE }) {
  const selectionById = new Map(selections.map((item) => [item.geometry.geometryObjectId, item]));
  return zoneGeometryEvidence.occurrenceEvidence.map((occurrence) => classifyPipeOccurrence({
    occurrence,
    selection: selectionById.get(occurrence.geometryObjectIds?.[0]),
    derivedPortEvidence,
    profile,
  }));
}
