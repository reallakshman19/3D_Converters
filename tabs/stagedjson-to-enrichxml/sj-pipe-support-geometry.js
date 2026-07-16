import { parsePoint } from './sj-point-resolver.js';
import {
  cleanText,
  clonePoint,
  finiteNumber,
  isPoint,
  nonNegativeNumber,
  positiveNumber,
} from './sj-pipe-support-utils.js';

export const STRAIGHT_CARRIER_TYPES = Object.freeze(new Set(['PIPE', 'TUBE', 'SEGMENT']));
export const FITTING_LOCATION_TYPES = Object.freeze([
  'INLET_PORT', 'OUTLET_PORT', 'BRANCH_PORT', 'COMPONENT_CENTRE',
  'ARC_STATION', 'AXIAL_STATION', 'SURFACE_ATTACHMENT',
]);
const FITTING_LOCATION_TYPE_SET = new Set(FITTING_LOCATION_TYPES);
const AXIAL_FITTING_TYPES = new Set(['REDU', 'VALV', 'FLAN', 'GASK', 'INST']);
const DEFAULT_PLANT_UP = Object.freeze({ x: 0, y: 0, z: 1 });

export function normalizePlantUp(value) {
  return normalizeVector(parsePoint(value)) || clonePoint(DEFAULT_PLANT_UP);
}

export function projectPointToStraightCarrier(point, carrier, options = {}) {
  const start = carrier.centerline?.start;
  const end = carrier.centerline?.end;
  if (!isPoint(start) || !isPoint(end) || !isPoint(point)) return null;

  const axis = sub(end, start);
  const lengthSq = dot(axis, axis);
  if (lengthSq <= 1e-18) return null;
  const lengthMm = Math.sqrt(lengthSq);
  const rawFraction = dot(sub(point, start), axis) / lengthSq;
  const fraction = clamp(rawFraction, 0, 1);
  const projected = add(start, scale(axis, fraction));
  const tangent = scale(axis, 1 / lengthMm);
  const localFrame = buildLocalFrame(projected, tangent, options.plantUp || DEFAULT_PLANT_UP);
  const offset = decomposeOffset(sub(point, projected), localFrame);
  const radialDistanceMm = distance(point, projected);
  const projectionToleranceMm = positiveNumber(options.projectionToleranceMm, 50);
  const onCenterlineToleranceMm = nonNegativeNumber(options.onCenterlineToleranceMm, 0.001);

  let positionStatus = 'OUTSIDE_PROJECTION_TOLERANCE';
  if (radialDistanceMm <= onCenterlineToleranceMm && rawFraction >= -1e-9 && rawFraction <= 1 + 1e-9) {
    positionStatus = 'ON_CENTERLINE';
  } else if (radialDistanceMm <= projectionToleranceMm) {
    positionStatus = 'PROJECTED_TO_CENTERLINE';
  }

  return {
    projectionKind: 'STRAIGHT_CENTERLINE',
    positionStatus,
    distanceMm: radialDistanceMm,
    centerlinePointGlobal: clonePoint(projected),
    carrierStationMm: lengthMm * fraction,
    carrierFraction: fraction,
    rawCarrierFraction: rawFraction,
    offsetFromCenterline: {
      alongMm: offset.alongMm,
      lateralMm: offset.lateralMm,
      verticalMm: offset.verticalMm,
      radialDistanceMm,
    },
    localFrame,
  };
}

export function projectPointToFittingCarrier(point, carrier, options = {}) {
  if (!isPoint(point)) return null;
  const geometry = carrier.fittingGeometry || {};
  const candidates = [];

  for (const port of normalizePorts(carrier)) {
    const portPoint = parsePoint(port.point || port.position || port.centerlinePointGlobal);
    if (!portPoint) continue;
    const locationType = normalizeFittingLocationType(port.locationType || port.type || port.role, 'SURFACE_ATTACHMENT');
    const tangent = normalizeVector(parsePoint(port.tangent || port.axis || port.direction))
      || tangentFromCentreToPoint(geometry.componentCentre, portPoint);
    candidates.push({
      distanceMm: distance(point, portPoint),
      point: portPoint,
      tangent,
      fittingLocation: {
        locationType,
        nearestCenterlinePointGlobal: clonePoint(portPoint),
        portId: cleanText(port.portId || port.id || port.name) || null,
      },
    });
  }

  const arcCandidate = projectPointToArc(point, geometry.arc);
  if (arcCandidate) candidates.push(arcCandidate);

  const axis = geometry.axis || (AXIAL_FITTING_TYPES.has(carrier.carrierType) ? carrier.centerline : null);
  const axialCandidate = projectPointToAxis(point, axis);
  if (axialCandidate) candidates.push(axialCandidate);

  const componentCentre = parsePoint(geometry.componentCentre || carrier.componentCentre);
  if (componentCentre) candidates.push({
    distanceMm: distance(point, componentCentre),
    point: componentCentre,
    tangent: normalizeVector(parsePoint(geometry.tangent || carrier.tangent))
      || tangentFromCenterline(carrier.centerline),
    fittingLocation: {
      locationType: 'COMPONENT_CENTRE',
      nearestCenterlinePointGlobal: clonePoint(componentCentre),
    },
  });

  for (const surface of geometry.surfaceAttachments || []) {
    const surfacePoint = parsePoint(surface.point || surface.position);
    if (!surfacePoint) continue;
    candidates.push({
      distanceMm: distance(point, surfacePoint),
      point: surfacePoint,
      tangent: normalizeVector(parsePoint(surface.tangent || surface.axis || surface.direction))
        || tangentFromCenterline(carrier.centerline),
      fittingLocation: {
        locationType: 'SURFACE_ATTACHMENT',
        nearestCenterlinePointGlobal: clonePoint(surfacePoint),
        surfaceId: cleanText(surface.surfaceId || surface.id || surface.name) || null,
      },
    });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distanceMm - b.distanceMm);
  const selected = candidates[0];
  const localFrame = selected.tangent
    ? buildLocalFrame(selected.point, selected.tangent, options.plantUp || DEFAULT_PLANT_UP)
    : null;
  const offset = localFrame ? decomposeOffset(sub(point, selected.point), localFrame) : null;
  const portAttachment = /_PORT$/u.test(selected.fittingLocation.locationType);

  return {
    projectionKind: 'FITTING_LOCATION',
    positionStatus: portAttachment ? 'ATTACHED_TO_COMPONENT_PORT' : 'ATTACHED_TO_FITTING',
    distanceMm: selected.distanceMm,
    centerlinePointGlobal: clonePoint(selected.point),
    carrierStationMm: null,
    carrierFraction: null,
    offsetFromCenterline: {
      alongMm: offset?.alongMm ?? null,
      lateralMm: offset?.lateralMm ?? null,
      verticalMm: offset?.verticalMm ?? null,
      radialDistanceMm: selected.distanceMm,
    },
    localFrame,
    fittingLocation: selected.fittingLocation,
  };
}

export function buildLocalFrame(origin, tangentValue, plantUpValue = DEFAULT_PLANT_UP) {
  const tangent = normalizeVector(tangentValue);
  const vertical = normalizeVector(plantUpValue);
  if (!tangent || !vertical) return null;
  const lateral = normalizeVector(cross(vertical, tangent));
  if (!lateral) return {
    origin: clonePoint(origin),
    tangent: clonePoint(tangent),
    lateral: null,
    vertical: clonePoint(vertical),
    handedness: 'DEGENERATE',
    frameStatus: 'DEGENERATE',
    reason: 'TANGENT_PARALLEL_TO_PLANT_UP',
  };
  return {
    origin: clonePoint(origin),
    tangent: clonePoint(tangent),
    lateral: clonePoint(lateral),
    vertical: clonePoint(vertical),
    handedness: 'RIGHT_HANDED',
    frameStatus: 'RESOLVED',
  };
}

export function pointDistance(a, b) { return distance(a, b); }
export function normalizedTangent(centerline) { return tangentFromCenterline(centerline); }

function projectPointToArc(point, arc) {
  if (!arc || typeof arc !== 'object') return null;
  const center = parsePoint(arc.center);
  const normal = normalizeVector(parsePoint(arc.normal));
  const startPoint = parsePoint(arc.startPoint);
  const sweepRadians = finiteNumber(arc.sweepRadians)
    ?? degreesToRadians(finiteNumber(arc.sweepDegrees));
  if (!center || !normal || !startPoint || !Number.isFinite(sweepRadians) || Math.abs(sweepRadians) <= 1e-12) return null;

  const startRadial = rejectFromAxis(sub(startPoint, center), normal);
  const startUnit = normalizeVector(startRadial);
  if (!startUnit) return null;
  const radiusMm = positiveNumber(arc.radiusMm, length(startRadial));
  if (!(radiusMm > 0)) return null;

  const pointUnit = normalizeVector(rejectFromAxis(sub(point, center), normal)) || startUnit;
  const signedAngle = signedAngleAroundAxis(startUnit, pointUnit, normal);
  const fraction = clamp(signedAngle / sweepRadians, 0, 1);
  const radialUnit = rotateAroundAxis(startUnit, normal, sweepRadians * fraction);
  const projected = add(center, scale(radialUnit, radiusMm));
  const tangent = sweepRadians >= 0
    ? normalizeVector(cross(normal, radialUnit))
    : normalizeVector(cross(radialUnit, normal));

  return {
    distanceMm: distance(point, projected),
    point: projected,
    tangent,
    fittingLocation: {
      locationType: 'ARC_STATION',
      arcFraction: fraction,
      nearestCenterlinePointGlobal: clonePoint(projected),
    },
  };
}

function projectPointToAxis(point, axis) {
  if (!axis || typeof axis !== 'object') return null;
  const start = parsePoint(axis.start || axis.apos || axis.APOS);
  const end = parsePoint(axis.end || axis.lpos || axis.LPOS);
  if (!start || !end) return null;
  const vector = sub(end, start);
  const lengthSq = dot(vector, vector);
  if (lengthSq <= 1e-18) return null;
  const fraction = clamp(dot(sub(point, start), vector) / lengthSq, 0, 1);
  const projected = add(start, scale(vector, fraction));
  return {
    distanceMm: distance(point, projected),
    point: projected,
    tangent: normalizeVector(vector),
    fittingLocation: {
      locationType: 'AXIAL_STATION',
      axialFraction: fraction,
      nearestCenterlinePointGlobal: clonePoint(projected),
    },
  };
}

function decomposeOffset(displacement, localFrame) {
  return {
    alongMm: dot(displacement, localFrame.tangent),
    lateralMm: localFrame.lateral ? dot(displacement, localFrame.lateral) : null,
    verticalMm: dot(displacement, localFrame.vertical),
  };
}

function normalizePorts(carrier) {
  const raw = carrier.ports || carrier.fittingGeometry?.ports || [];
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw).map(([key, value]) => ({
    ...(value && typeof value === 'object' ? value : { point: value }),
    locationType: value?.locationType || key,
  }));
}

function normalizeFittingLocationType(value, fallback) {
  const compact = cleanText(value).toUpperCase().replace(/[\s-]+/gu, '_');
  const aliases = {
    INLET: 'INLET_PORT', OUTLET: 'OUTLET_PORT', BRANCH: 'BRANCH_PORT',
    CENTRE: 'COMPONENT_CENTRE', CENTER: 'COMPONENT_CENTRE',
    COMPONENT_CENTER: 'COMPONENT_CENTRE', ARC: 'ARC_STATION',
    AXIS: 'AXIAL_STATION', SURFACE: 'SURFACE_ATTACHMENT',
  };
  const resolved = aliases[compact] || compact;
  return FITTING_LOCATION_TYPE_SET.has(resolved) ? resolved : fallback;
}

function tangentFromCenterline(centerline) {
  if (!isPoint(centerline?.start) || !isPoint(centerline?.end)) return null;
  return normalizeVector(sub(centerline.end, centerline.start));
}

function tangentFromCentreToPoint(centreValue, point) {
  const centre = parsePoint(centreValue);
  return centre ? normalizeVector(sub(point, centre)) : null;
}

function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function scale(v, factor) { return { x: v.x * factor, y: v.y * factor, z: v.z * factor }; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function length(v) { return Math.hypot(v.x, v.y, v.z); }
function distance(a, b) { return length(sub(a, b)); }
function normalizeVector(v) {
  if (!isPoint(v)) return null;
  const magnitude = length(v);
  return magnitude > 1e-12 ? scale(v, 1 / magnitude) : null;
}
function rejectFromAxis(v, axis) { return sub(v, scale(axis, dot(v, axis))); }
function signedAngleAroundAxis(from, to, axis) {
  return Math.atan2(dot(axis, cross(from, to)), clamp(dot(from, to), -1, 1));
}
function rotateAroundAxis(vector, axis, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return add(add(scale(vector, cos), scale(cross(axis, vector), sin)), scale(axis, dot(axis, vector) * (1 - cos)));
}
function degreesToRadians(value) { return Number.isFinite(value) ? value * Math.PI / 180 : null; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
