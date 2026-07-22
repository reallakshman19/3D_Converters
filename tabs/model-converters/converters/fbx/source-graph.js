const MIN_FBX_VERSION = 3000;
const MAX_FBX_VERSION = 7700;

function assertArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`FbxSourceGraph.v1 missing ${name}.`);
}

function compareText(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    if (a.length !== b.length) return a.length - b.length;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareFields(fields) {
  return (left, right) => {
    for (const field of fields) {
      const result = compareText(left?.[field], right?.[field]);
      if (result) return result;
    }
    return 0;
  };
}

function stableValueKey(value) {
  if (Array.isArray(value)) return `[${value.map(stableValueKey).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${key}:${stableValueKey(value[key])}`).join(',')}}`;
}

function sortGeneric(items) {
  return [...items].map((item) => ({ ...item }))
    .sort((left, right) => compareText(stableValueKey(left), stableValueKey(right)));
}

function sortSourceObjects(items) {
  return [...items].map((item) => ({
    ...item,
    customProperties: sortGeneric(item.customProperties || []),
  })).sort(compareFields(['sourceObjectId', 'class', 'subtype', 'sourceName']));
}

function sortOccurrences(items) {
  return [...items].map((item) => ({
    ...item,
    geometryObjectIds: [...(item.geometryObjectIds || [])].sort(compareText),
  })).sort(compareFields(['sourceOccurrenceId', 'sourceModelObjectId']));
}

function sortGeometries(items) {
  return [...items].map((item) => ({
    ...item,
    ownerOccurrenceIds: [...(item.ownerOccurrenceIds || [])].sort(compareText),
  })).sort(compareFields(['geometryObjectId', 'kind']));
}

function duplicateValues(items, key) {
  const counts = new Map();
  for (const item of items) counts.set(item[key], (counts.get(item[key]) || 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value).sort(compareText);
}

function canonicalGraph(graph) {
  const sourceObjects = sortSourceObjects(graph.sourceObjects);
  const occurrences = sortOccurrences(graph.occurrences);
  const geometries = sortGeometries(graph.geometries);
  return {
    ...graph,
    sourceObjects,
    occurrences,
    geometries,
    hierarchyEdges: [...graph.hierarchyEdges].map((item) => ({ ...item }))
      .sort(compareFields(['parentOccurrenceId', 'childOccurrenceId'])),
    connectionEdges: [...graph.connectionEdges].map((item) => ({ ...item }))
      .sort(compareFields(['sourceObjectId', 'destinationObjectId', 'sourceProperty', 'destinationProperty'])),
    warnings: sortGeneric(graph.warnings || []),
    unsupportedRecords: sortGeneric(graph.unsupportedRecords || []),
    unresolvedReferences: sortGeneric(graph.unresolvedReferences || []),
    duplicateSourceObjectIds: duplicateValues(sourceObjects, 'sourceObjectId'),
  };
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
  return canonicalGraph(graph);
}
