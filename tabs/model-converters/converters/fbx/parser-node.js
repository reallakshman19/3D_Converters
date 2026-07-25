import { deepFreeze } from './canonical-json.js';
import { parseFbxBytesWithWasm, parseFbxGeometryBundleWithWasm } from './parser-wasm.js';
import { enforceSourceGraphPolicy } from './source-graph.js';

export async function parseFbxBytesNode(bytes) {
  const graph = await parseFbxBytesWithWasm(bytes);
  return deepFreeze(enforceSourceGraphPolicy(graph));
}

export async function parseFbxGeometryBundleNode(bytes, options = {}) {
  return parseFbxGeometryBundleWithWasm(bytes, options);
}
