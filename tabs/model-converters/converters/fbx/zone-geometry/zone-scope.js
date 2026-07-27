import { compareDecimalId, compareOccurrenceId, compareText } from './compare.js';
import { failZoneGeometry } from './errors.js';
import { ZONE_GEOMETRY_STATUS } from './constants.js';

export const UNOWNED_ZONE_ID = 'preview-zone:unowned';

function mapsFor(graph) {
  return {
    occurrences: new Map(graph.occurrences.map((item) => [item.sourceOccurrenceId, item])),
    geometries: new Map(graph.geometries.map((item) => [item.geometryObjectId, item])),
    sources: new Map(graph.sourceObjects.map((item) => [item.sourceObjectId, item])),
  };
}

function geometryPointCount(geometry) {
  if (geometry?.kind === 'MESH') return geometry.verticesMm?.length || 0;
  if (geometry?.kind === 'NURBS_CURVE') return geometry.controlPointsMm?.length || 0;
  return 0;
}

function occurrenceChain(item, byId) {
  const chain = [], seen = new Set();
  let current = item;
  while (current && !seen.has(current.sourceOccurrenceId)) {
    seen.add(current.sourceOccurrenceId); chain.unshift(current);
    current = current.parentOccurrenceId ? byId.get(current.parentOccurrenceId) : null;
  }
  return chain;
}

function commonPrefixLength(chains) {
  if (!chains.length) return 0;
  const limit = Math.min(...chains.map((chain) => chain.length));
  let index = 0;
  while (index < limit && chains.every((chain) => chain[index].sourceOccurrenceId
    === chains[0][index].sourceOccurrenceId)) index += 1;
  return index;
}

function isNullGroup(occurrence, maps) {
  const source = maps.sources.get(occurrence?.sourceModelObjectId);
  return String(source?.domSubtype || '').trim().toUpperCase() === 'NULL';
}

function zoneForChain(chain, commonLength, maps) {
  for (let index = commonLength; index < chain.length; index += 1) {
    if (isNullGroup(chain[index], maps)) return chain[index];
  }
  for (let index = Math.min(commonLength - 1, chain.length - 1); index >= 0; index -= 1) {
    if (isNullGroup(chain[index], maps)) return chain[index];
  }
  return chain[Math.min(commonLength, chain.length - 1)];
}

function assignedOccurrences(graph, maps) {
  const renderable = graph.occurrences.filter((item) => item.geometryObjectIds.some((id) => (
    geometryPointCount(maps.geometries.get(id)) > 0
  )));
  const groups = new Map(), assignment = new Map();
  for (const occurrence of renderable) {
    const chain = occurrenceChain(occurrence, maps.occurrences);
    const root = chain[0]?.sourceOccurrenceId || occurrence.sourceOccurrenceId;
    const group = groups.get(root) || []; group.push({ occurrence, chain }); groups.set(root, group);
  }
  for (const group of groups.values()) {
    const common = commonPrefixLength(group.map((item) => item.chain));
    for (const item of group) assignment.set(item.occurrence.sourceOccurrenceId,
      zoneForChain(item.chain, common, maps).sourceOccurrenceId);
  }
  return assignment;
}

function cleanName(value) {
  return String(value ?? '').replace(/^[^:]+::/, '').trim();
}

function labelFor(zoneId, maps) {
  if (zoneId === UNOWNED_ZONE_ID) return 'Unowned geometry';
  const occurrence = maps.occurrences.get(zoneId);
  const source = maps.sources.get(occurrence?.sourceModelObjectId);
  return cleanName(source?.displayName) || cleanName(source?.domSourceName) || zoneId;
}

function zoneOptions(graph, maps, assignment) {
  const counts = new Map();
  for (const occurrence of graph.occurrences) {
    const zoneId = assignment.get(occurrence.sourceOccurrenceId);
    if (!zoneId) continue;
    const count = [...new Set(occurrence.geometryObjectIds)].reduce((sum, id) => (
      sum + geometryPointCount(maps.geometries.get(id))
    ), 0);
    counts.set(zoneId, (counts.get(zoneId) || 0) + count);
  }
  const referenced = new Set(graph.occurrences.flatMap((item) => item.geometryObjectIds));
  const unowned = graph.geometries.reduce((sum, item) => referenced.has(item.geometryObjectId)
    ? sum : sum + geometryPointCount(item), 0);
  if (unowned) counts.set(UNOWNED_ZONE_ID, unowned);
  return [...counts].map(([zoneId, sourcePointCount]) => ({
    zoneId, label: labelFor(zoneId, maps), sourcePointCount,
  })).sort((a, b) => compareText(a.label, b.label) || compareText(a.zoneId, b.zoneId));
}

function ancestorIds(selected, occurrenceById) {
  const selectedIds = new Set(selected.map((item) => item.sourceOccurrenceId));
  const ancestors = new Set();
  for (const occurrence of selected) {
    let current = occurrence;
    while (current?.parentOccurrenceId) {
      current = occurrenceById.get(current.parentOccurrenceId);
      if (!current || selectedIds.has(current.sourceOccurrenceId)) continue;
      ancestors.add(current.sourceOccurrenceId);
    }
  }
  return [...ancestors].sort(compareOccurrenceId);
}

function selectedPopulation(graph, maps, assignment, zoneId) {
  if (zoneId === UNOWNED_ZONE_ID) return { occurrences: [], geometryIds: graph.geometries
    .filter((item) => item.kind === 'MESH' && !graph.occurrences.some((occ) => (
      occ.geometryObjectIds.includes(item.geometryObjectId)
    ))).map((item) => item.geometryObjectId).sort(compareDecimalId) };
  const occurrences = graph.occurrences.filter((item) => assignment.get(item.sourceOccurrenceId) === zoneId)
    .filter((item) => item.geometryObjectIds.some((id) => maps.geometries.get(id)?.kind === 'MESH'))
    .sort((a, b) => compareOccurrenceId(a.sourceOccurrenceId, b.sourceOccurrenceId));
  const geometryIds = [...new Set(occurrences.flatMap((item) => item.geometryObjectIds)
    .filter((id) => maps.geometries.get(id)?.kind === 'MESH'))].sort(compareDecimalId);
  return { occurrences, geometryIds };
}

function sharedEvidence(population, maps) {
  const selectedIds = new Set(population.occurrences.map((item) => item.sourceOccurrenceId));
  return population.geometryIds.map((id) => {
    const owners = [...(maps.geometries.get(id)?.ownerOccurrenceIds || [])].sort(compareOccurrenceId);
    const selectedOwners = owners.filter((owner) => selectedIds.has(owner));
    const siblingOwners = owners.filter((owner) => !selectedIds.has(owner));
    return { geometryObjectId: id, selectedOwnerOccurrenceIds: selectedOwners,
      siblingOwnerOccurrenceIds: siblingOwners, sharedAcrossZones: siblingOwners.length > 0 };
  });
}

export function resolveSelectedZoneScope(graph, zoneId) {
  if (graph?.schema !== 'FbxSourceGraph.v2' || !zoneId) {
    failZoneGeometry(ZONE_GEOMETRY_STATUS.SCOPE, 'A governed source graph and explicit zone are required.');
  }
  const maps = mapsFor(graph), assignment = assignedOccurrences(graph, maps);
  const option = zoneOptions(graph, maps, assignment).find((item) => item.zoneId === zoneId);
  if (!option) failZoneGeometry(ZONE_GEOMETRY_STATUS.SCOPE, `Unknown selected zone ${zoneId}.`);
  const population = selectedPopulation(graph, maps, assignment, zoneId);
  if (!population.geometryIds.length) failZoneGeometry(ZONE_GEOMETRY_STATUS.SCOPE,
    'The selected zone contains no exact mesh topology.');
  return Object.freeze({
    zoneId, zoneLabel: option.label, selectedOccurrences: population.occurrences,
    selectedGeometryIds: population.geometryIds,
    ancestorOccurrenceIds: ancestorIds(population.occurrences, maps.occurrences),
    geometryOwnership: sharedEvidence(population, maps),
  });
}
