import { transformPoint, validateOccurrenceTransform } from './transform-policy.js';

function byId(items, key, value) {
  return items.find((item) => item[key] === value);
}

function resolveLocalPoint(geometry, port) {
  if (port.authority === 'mesh-vertex') {
    if (geometry.kind !== 'MESH') throw new Error('BLOCKED_MAPPING mesh authority targets non-mesh geometry.');
    const point = geometry.verticesMm?.[port.vertexIndex];
    if (!point) throw new Error(`BLOCKED_MAPPING invalid mesh vertex ${port.vertexIndex}.`);
    return point;
  }
  if (geometry.kind !== 'NURBS_CURVE') {
    throw new Error('BLOCKED_MAPPING NURBS authority targets non-NURBS geometry.');
  }
  const point = geometry.controlPointsMm?.[port.controlPointIndex];
  if (!point) throw new Error(`BLOCKED_MAPPING invalid NURBS control point ${port.controlPointIndex}.`);
  return point.slice(0, 3);
}

export function resolveEntryPorts(entry, graph) {
  const occurrence = byId(graph.occurrences, 'sourceOccurrenceId', entry.sourceOccurrenceId);
  validateOccurrenceTransform(occurrence);
  const resolve = (name, port) => {
    const geometry = byId(graph.geometries, 'geometryObjectId', port.geometryObjectId);
    const positionMm = transformPoint(occurrence.geometryMatrixMm, resolveLocalPoint(geometry, port));
    return {
      port: name,
      authority: port.authority,
      geometryObjectId: port.geometryObjectId,
      vertexIndex: port.vertexIndex,
      controlPointIndex: port.controlPointIndex,
      positionMm,
      connections: [...(port.connections || [])],
    };
  };
  return { A: resolve('A', entry.portA), B: resolve('B', entry.portB) };
}
