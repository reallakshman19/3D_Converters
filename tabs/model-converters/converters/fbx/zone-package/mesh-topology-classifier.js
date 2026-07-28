// Self-contained mesh-topology classifier operating directly on polygon
// buffers (offsets + vertex indices). No dependency on any other module's
// shell/boundary-loop implementation.

function polygonsFrom(polygonOffsets, polygonVertexIndices) {
  const polygons = [];
  for (let index = 0; index < polygonOffsets.length - 1; index += 1) {
    polygons.push(polygonVertexIndices.slice(polygonOffsets[index], polygonOffsets[index + 1]));
  }
  return polygons;
}

function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function buildEdgeIndex(polygons) {
  const edges = new Map();
  polygons.forEach((polygon, polygonIndex) => {
    for (let vertex = 0; vertex < polygon.length; vertex += 1) {
      const from = polygon[vertex], to = polygon[(vertex + 1) % polygon.length];
      const key = edgeKey(from, to);
      const entry = edges.get(key) || { polygonIndices: [], directed: [] };
      entry.polygonIndices.push(polygonIndex);
      entry.directed.push([from, to]);
      edges.set(key, entry);
    }
  });
  return edges;
}

function unionFind(size) {
  const parent = Array.from({ length: size }, (_, index) => index);
  const find = (value) => (parent[value] === value ? value : (parent[value] = find(parent[value])));
  const union = (left, right) => { parent[find(left)] = find(right); };
  return { find, union };
}

function shellCountOf(edges, polygonCount) {
  const sets = unionFind(polygonCount);
  for (const entry of edges.values()) {
    if (entry.polygonIndices.length === 2) sets.union(entry.polygonIndices[0], entry.polygonIndices[1]);
  }
  return new Set(Array.from({ length: polygonCount }, (_, index) => sets.find(index))).size;
}

function boundaryLoopCount(edges) {
  const next = new Map();
  for (const entry of edges.values()) {
    if (entry.polygonIndices.length !== 1) continue;
    const [from, to] = entry.directed[0];
    if (next.has(from)) return null;
    next.set(from, to);
  }
  const visited = new Set();
  let loops = 0;
  for (const start of next.keys()) {
    if (visited.has(start)) continue;
    let cursor = start, steps = 0;
    while (!visited.has(cursor)) {
      visited.add(cursor);
      const target = next.get(cursor);
      if (target === undefined) return null;
      cursor = target;
      steps += 1;
      if (steps > next.size + 1) return null;
    }
    if (cursor !== start) return null;
    loops += 1;
  }
  return loops;
}

function degenerateReason(polygons) {
  if (!polygons.length) return 'EMPTY_GEOMETRY';
  if (polygons.some((polygon) => polygon.length < 3)) return 'DEGENERATE_POLYGON';
  return null;
}

function classifyByShape(boundaryEdgeCount, shellCount, loops) {
  if (boundaryEdgeCount === 0) {
    return shellCount === 1
      ? { disposition: 'CLOSED', reasonCode: 'WATERTIGHT_SINGLE_SHELL' }
      : { disposition: 'MULTI_SHELL', reasonCode: 'WATERTIGHT_MULTIPLE_SHELLS' };
  }
  if (shellCount > 1) return { disposition: 'OTHER_GOVERNED', reasonCode: 'MULTI_SHELL_WITH_BOUNDARY' };
  if (loops === 2) return { disposition: 'CAPPED', reasonCode: 'TWO_BOUNDARY_LOOPS' };
  if (loops === 1) return { disposition: 'MERGED', reasonCode: 'SINGLE_BOUNDARY_LOOP' };
  return { disposition: 'OTHER_GOVERNED', reasonCode: 'UNGOVERNED_BOUNDARY_LOOP_COUNT' };
}

/**
 * Classifies one selected geometry's topology into a governed disposition:
 * CLOSED, CAPPED, MERGED, MULTI_SHELL, INVALID_TOPOLOGY, or OTHER_GOVERNED.
 * Pure graph analysis over the polygon buffers; no widening of
 * FbxAutoPipeProfile.v1 admission and no dependency on prior pipe/support
 * classification.
 */
export function classifyGeometryTopology({ polygonOffsets, polygonVertexIndices }) {
  const polygons = polygonsFrom(polygonOffsets, polygonVertexIndices);
  const degenerate = degenerateReason(polygons);
  if (degenerate) return { disposition: 'INVALID_TOPOLOGY', reasonCode: degenerate, stats: { polygonCount: polygons.length, boundaryEdgeCount: 0, shellCount: 0, boundaryLoopCount: 0 } };
  const edges = buildEdgeIndex(polygons);
  const nonManifold = [...edges.values()].some((entry) => entry.polygonIndices.length > 2);
  const boundaryEdgeCount = [...edges.values()].filter((entry) => entry.polygonIndices.length === 1).length;
  if (nonManifold) return { disposition: 'INVALID_TOPOLOGY', reasonCode: 'NON_MANIFOLD_EDGE', stats: { polygonCount: polygons.length, boundaryEdgeCount, shellCount: 0, boundaryLoopCount: 0 } };
  const shellCount = shellCountOf(edges, polygons.length);
  const loops = boundaryLoopCount(edges);
  const stats = { polygonCount: polygons.length, boundaryEdgeCount, shellCount, boundaryLoopCount: loops ?? 0 };
  if (loops === null) return { disposition: 'OTHER_GOVERNED', reasonCode: 'IRREGULAR_BOUNDARY', stats };
  return { ...classifyByShape(boundaryEdgeCount, shellCount, loops), stats };
}
