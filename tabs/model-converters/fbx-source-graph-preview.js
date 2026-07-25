// Build a bounded, transform-aware point preview from governed FBX source-graph geometry.
// Inputs are an FbxSourceGraph.v2 value, its output name, and an explicit point limit.
// Output is a preview project or null when the graph contains no renderable control points.
import { transformPoint } from './converters/fbx/transform-policy.js';

export const FBX_SOURCE_GRAPH_PREVIEW_POINT_LIMIT = 250000;

const IDENTITY_MATRIX = Object.freeze([
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
  0, 0, 0,
]);

function geometryPoints(geometry) {
  if (geometry?.kind === 'MESH') return geometry.verticesMm;
  if (geometry?.kind === 'NURBS_CURVE') return geometry.controlPointsMm;
  return [];
}

function previewItems(graph) {
  const geometryById = new Map(
    graph.geometries.map((geometry) => [geometry.geometryObjectId, geometry]),
  );
  const referenced = new Set();
  const items = [];
  for (const occurrence of graph.occurrences) {
    const geometryIds = [...new Set(occurrence.geometryObjectIds)];
    for (const geometryId of geometryIds) {
      const geometry = geometryById.get(geometryId);
      if (!geometry) continue;
      referenced.add(geometryId);
      items.push({ geometry, matrix: occurrence.geometryMatrixMm });
    }
  }
  for (const geometry of graph.geometries) {
    if (!referenced.has(geometry.geometryObjectId)) {
      items.push({ geometry, matrix: IDENTITY_MATRIX });
    }
  }
  return items;
}

function countSourcePoints(items) {
  return items.reduce((total, item) => total + geometryPoints(item.geometry).length, 0);
}

function sampledPoints(items, sourcePointCount, maxPoints) {
  const stride = Math.max(1, Math.ceil(sourcePointCount / maxPoints));
  const points = [];
  let ordinal = 0;
  for (const item of items) {
    for (const point of geometryPoints(item.geometry)) {
      if (ordinal % stride === 0 && points.length < maxPoints) {
        const transformed = transformPoint(item.matrix, point);
        points.push({ x: transformed[0], y: transformed[1], z: transformed[2] });
      }
      ordinal += 1;
    }
  }
  return points;
}

export function buildFbxSourceGraphPreviewProject(graph, sourceName, maxPoints) {
  if (graph?.schema !== 'FbxSourceGraph.v2') return null;
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 1) {
    throw new TypeError('FBX source-graph preview maxPoints must be a positive integer.');
  }
  const items = previewItems(graph);
  const sourcePointCount = countSourcePoints(items);
  if (!sourcePointCount) return null;
  const points = sampledPoints(items, sourcePointCount, maxPoints);
  return {
    id: 'fbx-source-graph-preview',
    name: `FBX Source Graph Preview: ${sourceName}`,
    points,
    segments: [],
    nodes: [],
    supports: [],
    annotations: [],
    sourcePointCount,
    displayedPointCount: points.length,
    truncated: points.length < sourcePointCount,
  };
}
