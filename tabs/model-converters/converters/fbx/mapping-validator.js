const PORT_AUTHORITIES = new Set(['mesh-vertex', 'nurbs-control-point']);

function fail(message) {
  throw new Error(`BLOCKED_MAPPING ${message}`);
}

function indexMany(items, key) {
  const result = new Map();
  for (const item of items) {
    const value = String(item[key]);
    const list = result.get(value) || [];
    list.push(item);
    result.set(value, list);
  }
  return result;
}

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is required.`);
  return value;
}

function validatePort(port, label) {
  if (!port || typeof port !== 'object') fail(`${label} is required.`);
  if (!PORT_AUTHORITIES.has(port.authority)) fail(`${label} has unsupported authority.`);
  requireText(port.geometryObjectId, `${label}.geometryObjectId`);
  const indexName = port.authority === 'mesh-vertex' ? 'vertexIndex' : 'controlPointIndex';
  if (!Number.isInteger(port[indexName]) || port[indexName] < 0) fail(`${label}.${indexName} is invalid.`);
  if (port.coordinate || port.position || port.xyz) fail(`${label} cannot contain coordinate authority.`);
  if (port.connections !== undefined && !Array.isArray(port.connections)) fail(`${label}.connections must be an array.`);
}

function validateEntryShape(entry) {
  for (const key of ['mappingEntryId', 'logicalComponentId', 'sourceModelObjectId', 'sourceOccurrenceId']) {
    requireText(entry[key], key);
  }
  if (entry.componentType !== 'PIPE') fail(`${entry.mappingEntryId} componentType must be PIPE.`);
  if (entry.scopeDisposition !== 'promote') fail(`${entry.mappingEntryId} must be promoted.`);
  validatePort(entry.portA, `${entry.mappingEntryId}.portA`);
  validatePort(entry.portB, `${entry.mappingEntryId}.portB`);
}

function validateUnique(items, key, label) {
  const values = new Set();
  for (const item of items) {
    const value = item[key];
    if (values.has(value)) fail(`duplicate ${label} ${value}.`);
    values.add(value);
  }
}

function validateScope(manifest, entries) {
  if (!Array.isArray(manifest.inScopeSourceObjectIds) || !manifest.inScopeSourceObjectIds.length) {
    fail('inScopeSourceObjectIds must declare the exact scope.');
  }
  const scope = manifest.inScopeSourceObjectIds.map(String);
  if (new Set(scope).size !== scope.length) fail('scope contains duplicate object IDs.');
  const dispositions = new Map();
  for (const entry of entries) dispositions.set(entry.sourceModelObjectId, 'promote');
  for (const excluded of manifest.exclusions || []) {
    if (excluded.scopeDisposition !== 'exclude-with-reason' || !excluded.reason?.trim()) {
      fail(`exclusion ${excluded.sourceModelObjectId || ''} requires a reason.`);
    }
    if (dispositions.has(String(excluded.sourceModelObjectId))) fail('object has multiple dispositions.');
    dispositions.set(String(excluded.sourceModelObjectId), 'exclude-with-reason');
  }
  for (const id of scope) if (!dispositions.has(id)) fail(`object ${id} has no disposition.`);
  for (const id of dispositions.keys()) if (!scope.includes(id)) fail(`object ${id} is outside declared scope.`);
  return scope.sort();
}

function validateSourceResolution(graph, scope, entries) {
  const objects = indexMany(graph.sourceObjects, 'sourceObjectId');
  const occurrences = indexMany(graph.occurrences, 'sourceOccurrenceId');
  const geometry = indexMany(graph.geometries, 'geometryObjectId');
  for (const id of scope) {
    const count = objects.get(id)?.length || 0;
    if (count !== 1) fail(`source object ${id} resolves ${count} times.`);
  }
  for (const entry of entries) {
    const occurrenceList = occurrences.get(entry.sourceOccurrenceId) || [];
    if (occurrenceList.length !== 1) fail(`occurrence ${entry.sourceOccurrenceId} resolves ${occurrenceList.length} times.`);
    const occurrence = occurrenceList[0];
    if (occurrence.sourceModelObjectId !== entry.sourceModelObjectId) fail('occurrence/model identity mismatch.');
    for (const port of [entry.portA, entry.portB]) {
      const list = geometry.get(port.geometryObjectId) || [];
      if (list.length !== 1) fail(`geometry ${port.geometryObjectId} resolves ${list.length} times.`);
      if (!occurrence.geometryObjectIds.includes(port.geometryObjectId)) fail('occurrence does not own referenced geometry.');
    }
  }
}

function normalizeEntries(entries) {
  return entries.map((entry) => ({ ...entry, portA: { ...entry.portA }, portB: { ...entry.portB } }))
    .sort((a, b) => a.mappingEntryId.localeCompare(b.mappingEntryId));
}

export function validateMappingManifest(manifest, graph) {
  if (!manifest) fail('mapping manifest is required.');
  if (manifest.schema !== 'FbxStagedMapping.v1') fail('unsupported mapping schema.');
  if (!Array.isArray(manifest.entries) || !manifest.entries.length) fail('mapping entries are required.');
  const entries = normalizeEntries(manifest.entries);
  entries.forEach(validateEntryShape);
  validateUnique(entries, 'mappingEntryId', 'mappingEntryId');
  validateUnique(entries, 'logicalComponentId', 'logicalComponentId');
  validateUnique(entries, 'sourceOccurrenceId', 'sourceOccurrenceId');
  const scope = validateScope(manifest, entries);
  validateSourceResolution(graph, scope, entries);
  return { schema: manifest.schema, scope, entries, exclusions: manifest.exclusions || [] };
}
