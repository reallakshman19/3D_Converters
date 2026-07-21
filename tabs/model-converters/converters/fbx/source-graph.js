const MIN_FBX_VERSION = 3000;
const MAX_FBX_VERSION = 7700;

function assertArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`FbxSourceGraph.v1 missing ${name}.`);
}

function duplicateValues(items, key) {
  const counts = new Map();
  for (const item of items) counts.set(item[key], (counts.get(item[key]) || 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value).sort();
}

export function enforceSourceGraphPolicy(graph) {
  if (graph?.schema !== 'FbxSourceGraph.v1') throw new Error('Parser returned an unsupported source graph.');
  if (graph.file?.ascii) throw new Error('Only binary FBX is accepted by F2S-001.');
  const version = Number(graph.file?.version);
  if (version < MIN_FBX_VERSION || version > MAX_FBX_VERSION) {
    throw new Error(`Unsupported FBX version ${version}.`);
  }
  for (const key of ['sourceObjects', 'occurrences', 'geometries', 'hierarchyEdges', 'connectionEdges']) {
    assertArray(graph[key], key);
  }
  graph.duplicateSourceObjectIds = duplicateValues(graph.sourceObjects, 'sourceObjectId');
  graph.unsupportedRecords ||= [];
  graph.unresolvedReferences ||= [];
  graph.warnings ||= [];
  return graph;
}
