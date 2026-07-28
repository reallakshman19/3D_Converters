import { transformPoint, validateOccurrenceTransform } from '../transform-policy.js';
import { cross, dot, magnitude, subtract, triangleNormal } from './vector.js';

function viewFor(selection, role, Type) {
  const item = selection?.buffers?.find((buffer) => buffer.role === role);
  const bytes = item?.buffer?.bytes;
  if (!(bytes instanceof ArrayBuffer)) throw new Error(`BLOCKED_SUPPORT_BINDING missing ${role}.`);
  return new Type(bytes);
}

export function topologyViews(selection) {
  return Object.freeze({
    points: viewFor(selection, 'control-points-mm', Float64Array),
    offsets: viewFor(selection, 'polygon-offsets', Uint32Array),
    indices: viewFor(selection, 'polygon-vertex-indices', Uint32Array),
  });
}

export function worldPoints(selection, occurrence) {
  try { validateOccurrenceTransform(occurrence); }
  catch (error) { throw new Error(`BLOCKED_SUPPORT_SCOPE ${error.message}`); }
  const { points } = topologyViews(selection), output = [];
  if (points.length % 3 !== 0) throw new Error('BLOCKED_SUPPORT_BINDING invalid control point buffer.');
  for (let index = 0; index < points.length; index += 3) {
    output.push(transformPoint(occurrence.geometryMatrixMm,
      [points[index], points[index + 1], points[index + 2]]));
  }
  return output;
}

function newell(points) {
  const normal = [0, 0, 0];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index], next = points[(index + 1) % points.length];
    normal[0] += (current[1] - next[1]) * (current[2] + next[2]);
    normal[1] += (current[2] - next[2]) * (current[0] + next[0]);
    normal[2] += (current[0] - next[0]) * (current[1] + next[1]);
  }
  return normal;
}

function projectionAxis(normal) {
  const values = normal.map(Math.abs), maximum = Math.max(...values);
  return values.findIndex((value) => value === maximum);
}

function project(point, dropped) {
  return dropped === 0 ? [point[1], point[2]] : dropped === 1 ? [point[0], point[2]] : [point[0], point[1]];
}

function area2(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    area += points[index][0] * next[1] - next[0] * points[index][1];
  }
  return area;
}

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function pointInTriangle(point, a, b, c, sign) {
  const values = [orient(a, b, point), orient(b, c, point), orient(c, a, point)];
  return values.every((value) => sign * value >= -1e-12);
}

function onSegment(a, b, point) {
  return Math.min(a[0], b[0]) <= point[0] && point[0] <= Math.max(a[0], b[0])
    && Math.min(a[1], b[1]) <= point[1] && point[1] <= Math.max(a[1], b[1]);
}

function segmentsIntersect(a, b, c, d) {
  const values = [orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)];
  if (values[0] === 0 && onSegment(a, b, c)) return true;
  if (values[1] === 0 && onSegment(a, b, d)) return true;
  if (values[2] === 0 && onSegment(c, d, a)) return true;
  if (values[3] === 0 && onSegment(c, d, b)) return true;
  return Math.sign(values[0]) !== Math.sign(values[1]) && Math.sign(values[2]) !== Math.sign(values[3]);
}

function simplePolygon(points) {
  for (let left = 0; left < points.length; left += 1) {
    const leftNext = (left + 1) % points.length;
    for (let right = left + 1; right < points.length; right += 1) {
      const rightNext = (right + 1) % points.length;
      if (left === right || leftNext === right || rightNext === left) continue;
      if (segmentsIntersect(points[left], points[leftNext], points[right], points[rightNext])) return false;
    }
  }
  return true;
}

function canonicalRing(indices) {
  const variants = [];
  for (const ring of [indices, [...indices].reverse()]) {
    for (let offset = 0; offset < ring.length; offset += 1) {
      variants.push([...ring.slice(offset), ...ring.slice(0, offset)].join(','));
    }
  }
  return variants.sort()[0];
}

function earKey(vertex, sourceIndex) {
  return `${vertex[0].toPrecision(17)}|${vertex[1].toPrecision(17)}|${String(sourceIndex).padStart(12, '0')}`;
}

function earClip(indices, projected) {
  const sign = Math.sign(area2(projected));
  if (!sign) return null;
  const remaining = indices.map((sourceIndex, localIndex) => ({ sourceIndex, localIndex }));
  const triangles = [];
  while (remaining.length > 3) {
    const ears = [];
    for (let index = 0; index < remaining.length; index += 1) {
      const previous = remaining[(index + remaining.length - 1) % remaining.length];
      const current = remaining[index], next = remaining[(index + 1) % remaining.length];
      const a = projected[previous.localIndex], b = projected[current.localIndex], c = projected[next.localIndex];
      if (sign * orient(a, b, c) <= 1e-12) continue;
      const contains = remaining.some((item) => item !== previous && item !== current && item !== next
        && pointInTriangle(projected[item.localIndex], a, b, c, sign));
      if (!contains) ears.push({ index, key: earKey(b, current.sourceIndex), triangle: [previous, current, next] });
    }
    if (!ears.length) return null;
    ears.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
    const ear = ears[0];
    triangles.push(ear.triangle.map((item) => item.sourceIndex));
    remaining.splice(ear.index, 1);
  }
  triangles.push(remaining.map((item) => item.sourceIndex));
  return triangles;
}

function planarity(points, normal, profile) {
  const unit = normal.map((value) => value / magnitude(normal)), origin = points[0];
  const diagonal = Math.max(...points.map((point) => magnitude(subtract(point, origin))));
  const tolerance = Math.max(profile.polygonPlanarityAbsoluteMm, profile.polygonPlanarityRatio * diagonal);
  return points.every((point) => Math.abs(dot(subtract(point, origin), unit)) <= tolerance);
}

function polygonTriangles(indices, points, profile) {
  if (indices.length < 3 || new Set(indices).size !== indices.length) return null;
  const polygonPoints = indices.map((index) => points[index]);
  const normal = newell(polygonPoints);
  if (magnitude(normal) <= profile.degenerateTriangleAreaMm2Inclusive * 2) return null;
  if (!planarity(polygonPoints, normal, profile)) return null;
  const projected = polygonPoints.map((point) => project(point, projectionAxis(normal)));
  if (!simplePolygon(projected)) return null;
  return earClip(indices, projected);
}

function shellCount(triangles) {
  if (!triangles.length) return 0;
  const parent = triangles.map((_, index) => index), firstByVertex = new Map();
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (left, right) => { const a = find(left), b = find(right); if (a !== b) parent[b] = a; };
  triangles.forEach((triangle, triangleIndex) => triangle.indices.forEach((vertex) => {
    if (firstByVertex.has(vertex)) join(triangleIndex, firstByVertex.get(vertex));
    else firstByVertex.set(vertex, triangleIndex);
  }));
  return new Set(triangles.map((_, index) => find(index))).size;
}

export function triangulateSelection(selection, occurrence, profile) {
  const topology = topologyViews(selection), points = worldPoints(selection, occurrence);
  const triangles = [], rejectedPolygonKeys = [];
  for (let polygon = 0; polygon + 1 < topology.offsets.length; polygon += 1) {
    const start = topology.offsets[polygon], end = topology.offsets[polygon + 1];
    const indices = [...topology.indices.slice(start, end)], polygonKey = canonicalRing(indices);
    const derived = polygonTriangles(indices, points, profile);
    if (!derived) { rejectedPolygonKeys.push(polygonKey); continue; }
    for (const triangle of derived) {
      const world = triangle.map((index) => points[index]), normal = triangleNormal(world);
      if (!normal || magnitude(cross(subtract(world[1], world[0]), subtract(world[2], world[0]))) / 2
        <= profile.degenerateTriangleAreaMm2Inclusive) {
        rejectedPolygonKeys.push(polygonKey); continue;
      }
      triangles.push(Object.freeze({ polygonKey, indices: triangle, points: world, normal }));
    }
  }
  return Object.freeze({ triangles: Object.freeze(triangles), rejectedPolygonKeys: Object.freeze(
    [...new Set(rejectedPolygonKeys)].sort()), shellCount: shellCount(triangles), points: Object.freeze(points) });
}
