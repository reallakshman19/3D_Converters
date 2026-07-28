import { triangulateSelection } from './topology.js';
import { canonicalDirection, distance, subtract } from './vector.js';

function bounds(points) {
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  for (const point of points) for (let axis = 0; axis < 3; axis += 1) {
    minimum[axis] = Math.min(minimum[axis], point[axis]);
    maximum[axis] = Math.max(maximum[axis], point[axis]);
  }
  const extent = maximum.map((value, axis) => value - minimum[axis]);
  return { minimum, maximum, extent, diagonal: Math.hypot(...extent) };
}

function farthestPair(points, projector = (point) => point) {
  let selected = null;
  for (let left = 0; left < points.length; left += 1) for (let right = left + 1; right < points.length; right += 1) {
    const a = projector(points[left]), b = projector(points[right]);
    const score = a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0);
    const key = `${points[left].join(',')}|${points[right].join(',')}`;
    if (!selected || score > selected.score || (score === selected.score && key < selected.key)) {
      selected = { left: points[left], right: points[right], score, key };
    }
  }
  return selected;
}

function principalAxes(points) {
  const primary = farthestPair(points);
  if (!primary) return [];
  const axis1 = canonicalDirection(subtract(primary.right, primary.left));
  if (!axis1) return [];
  const projected = (point) => {
    const origin = primary.left, offset = subtract(point, origin);
    const axial = offset.reduce((sum, value, index) => sum + value * axis1[index], 0);
    return offset.map((value, index) => value - axial * axis1[index]);
  };
  const secondary = farthestPair(points, projected);
  const axis2 = secondary ? canonicalDirection(subtract(projected(secondary.right), projected(secondary.left))) : null;
  const axis3 = axis2 ? canonicalDirection([
    axis1[1] * axis2[2] - axis1[2] * axis2[1],
    axis1[2] * axis2[0] - axis1[0] * axis2[2],
    axis1[0] * axis2[1] - axis1[1] * axis2[0],
  ]) : null;
  return [axis1, axis2, axis3].filter(Boolean);
}

function topologyCounts(item) {
  return item.selections.reduce((counts, selection) => {
    const descriptor = selection.geometry;
    counts.polygons += descriptor.polygonCount || 0;
    counts.vertices += descriptor.polygonVertexCount || 0;
    counts.pointPolygons += descriptor.pointPolygonCount || 0;
    counts.linePolygons += descriptor.linePolygonCount || 0;
    counts.emptyPolygons += descriptor.emptyPolygonCount || 0;
    return counts;
  }, { polygons: 0, vertices: 0, pointPolygons: 0, linePolygons: 0, emptyPolygons: 0 });
}

function resourceCheck(counts, profile) {
  if (counts.polygons > profile.maximumSourcePolygonsPerCandidate
    || counts.vertices > profile.maximumSourceVertexReferencesPerCandidate) {
    throw new Error('BLOCKED_SUPPORT_RESOURCE candidate topology limit exceeded.');
  }
}

function sizeReasons(box, profile) {
  const reasons = [];
  if (box.diagonal < profile.minimumCandidateDiagonalMm) reasons.push('CANDIDATE_BELOW_MINIMUM_SIZE');
  if (box.diagonal > profile.maximumCandidateDiagonalMm) reasons.push('CANDIDATE_ABOVE_MAXIMUM_SIZE');
  if (box.extent.some((value) => value > profile.maximumAxisSpanMm)) reasons.push('CANDIDATE_AXIS_SPAN_EXCEEDED');
  if (box.extent.filter((value) => value >= profile.minimumOccupiedAxisExtentMm).length < 2) {
    reasons.push('CANDIDATE_GEOMETRY_IS_POINT_OR_LINE_LIKE');
  }
  return reasons;
}

function slendernessReasons(box, profile) {
  const [first, second, third] = [...box.extent].sort((left, right) => right - left);
  const reasons = [];
  if (first / Math.max(second, 1) > profile.lineLikeSlendernessExclusive) {
    reasons.push('LINE_LIKE_SLENDERNESS_AMBIGUOUS');
  }
  if (second / Math.max(third, 1) > profile.sheetLikeSlendernessExclusive) {
    reasons.push('SHEET_LIKE_SLENDERNESS_AMBIGUOUS');
  }
  return reasons;
}

export function analyseCandidateGeometry(item, profile) {
  if (item.inventoryDisposition !== 'POSSIBLE_SUPPORT_CANDIDATE') return null;
  const counts = topologyCounts(item); resourceCheck(counts, profile);
  if (counts.pointPolygons || counts.linePolygons || counts.emptyPolygons) return Object.freeze({
    item, geometryDisposition: 'AMBIGUOUS', blockStatus: 'BLOCKED_SUPPORT_TOPOLOGY',
    reasons: Object.freeze(['UNSUPPORTED_POINT_LINE_OR_EMPTY_POLYGONS']), triangles: Object.freeze([]),
    points: Object.freeze([]), shellCount: 0, boundingEvidence: null, principalAxes: Object.freeze([]),
  });
  const derived = item.selections.map((selection) => triangulateSelection(selection, item.occurrence, profile));
  const triangles = derived.flatMap((value) => value.triangles);
  const points = derived.flatMap((value) => value.points);
  const rejected = derived.flatMap((value) => value.rejectedPolygonKeys);
  const shellCount = derived.reduce((sum, value) => sum + value.shellCount, 0);
  if (triangles.length > profile.maximumDerivedTrianglesPerCandidate) {
    throw new Error('BLOCKED_SUPPORT_RESOURCE candidate triangle limit exceeded.');
  }
  const box = bounds(points), reasons = sizeReasons(box, profile);
  const slenderness = slendernessReasons(box, profile);
  reasons.push(...slenderness);
  if (rejected.length) reasons.push('UNTRIANGULATED_SOURCE_POLYGONS');
  if (shellCount < 1 || shellCount > profile.maximumConnectedShellCount) reasons.push('CONNECTED_SHELL_LIMIT');
  const topologyAmbiguous = rejected.length > 0
    || shellCount < 1 || shellCount > profile.maximumConnectedShellCount;
  const classificationAmbiguous = slenderness.length > 0;
  return Object.freeze({
    item, geometryDisposition: topologyAmbiguous || classificationAmbiguous
      ? 'AMBIGUOUS' : reasons.length ? 'REJECTED' : 'ELIGIBLE',
    blockStatus: topologyAmbiguous ? 'BLOCKED_SUPPORT_TOPOLOGY'
      : classificationAmbiguous ? 'BLOCKED_SUPPORT_CLASSIFICATION' : null,
    reasons: Object.freeze(reasons), triangles: Object.freeze(triangles), points: Object.freeze(points),
    shellCount, boundingEvidence: Object.freeze({ minMm: box.minimum, maxMm: box.maximum,
      extentMm: box.extent, diagonalMm: box.diagonal }),
    principalAxes: Object.freeze(principalAxes(points)),
  });
}

export function aabbGap(left, right) {
  const axisGaps = left.minMm.map((minimum, axis) => Math.max(0,
    minimum - right.maxMm[axis], right.minMm[axis] - left.maxMm[axis]));
  return Math.hypot(...axisGaps);
}

export function mergeBounds(items) {
  const points = items.flatMap((item) => [item.boundingEvidence.minMm, item.boundingEvidence.maxMm]);
  return bounds(points);
}

export function maximumPointDistance(points, origin) {
  return Math.max(...points.map((point) => distance(point, origin)));
}
