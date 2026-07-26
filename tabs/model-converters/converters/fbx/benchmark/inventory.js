import { deepFreeze } from '../canonical-json.js';
import { benchmarkIndexCollisions, buildFbxBenchmarkIndexes } from './semantic-indexes.js';

function increment(map, key) {
  if (key == null || key === '') return;
  const observed = String(key);
  map.set(observed, (map.get(observed) || 0) + 1);
}

function sortedCounts(map, keyName) {
  return [...map.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, count]) => ({ [keyName]: key, count }));
}

function coordinateValues(record) {
  const attributes = record.attributes || {};
  return ['POS', 'APOS', 'LPOS', 'HPOS', 'TPOS', 'BPOS'].map((key) => attributes[key])
    .filter((value) => value && ['x', 'y', 'z'].every((axis) => Number.isFinite(value[axis])));
}

function extendExtents(extents, point) {
  for (const axis of ['x', 'y', 'z']) {
    extents.minimum[axis] = Math.min(extents.minimum[axis], point[axis]);
    extents.maximum[axis] = Math.max(extents.maximum[axis], point[axis]);
  }
}

function finalExtents(extents) {
  return Number.isFinite(extents.minimum.x) ? extents : null;
}

function observeSupport(attributes, state) {
  increment(state.supportKinds, attributes.SUPPORT_KIND);
  increment(state.supportMapperKinds, attributes.SUPPORT_MAPPER_KIND);
  increment(state.supportTypes, attributes.SUPPORT_TYPE);
}

function observeOccurrence(occurrence, state) {
  const { record } = occurrence;
  const attributes = record.attributes || {};
  increment(state.outerTypes, record.type);
  increment(state.attributeTypes, attributes.TYPE);
  increment(state.attributeRawTypes, attributes.RAW_TYPE);
  if (occurrence.childIndex === null) increment(state.ownerSites, attributes.OWNER_SITE);
  if (record.type === 'SUPPORT') observeSupport(attributes, state);
  if (attributes.HREF !== undefined) state.referenceCounts.href += 1;
  if (attributes.TREF !== undefined) state.referenceCounts.tref += 1;
  for (const point of coordinateValues(record)) extendExtents(state.extents, point);
}

function createState() {
  return {
    outerTypes: new Map(), attributeTypes: new Map(), attributeRawTypes: new Map(),
    supportKinds: new Map(), supportMapperKinds: new Map(), supportTypes: new Map(),
    ownerSites: new Map(), referenceCounts: { href: 0, tref: 0 },
    extents: { minimum: { x: Infinity, y: Infinity, z: Infinity },
      maximum: { x: -Infinity, y: -Infinity, z: -Infinity } },
  };
}

function observedCount(map) {
  return [...map.values()].reduce((sum, count) => sum + count, 0);
}

function rawSupportCoverage(state, supportCount) {
  const coverage = {};
  for (const [field, map] of [
    ['supportKind', state.supportKinds],
    ['supportMapperKind', state.supportMapperKinds],
    ['supportType', state.supportTypes],
  ]) {
    const observed = observedCount(map);
    coverage[field] = { observed, missing: supportCount - observed };
  }
  return coverage;
}

export function buildFbxBenchmarkInventory(loaded) {
  const state = createState();
  for (const occurrence of loaded.occurrences) observeOccurrence(occurrence, state);
  const indexes = buildFbxBenchmarkIndexes(loaded);
  const supportCount = state.outerTypes.get('SUPPORT') || 0;
  const childCount = loaded.occurrences.length - loaded.branches.length;
  return deepFreeze({
    schema: 'FbxBenchmarkInventory.v1', benchmarkIdentity: loaded.identity,
    parseResult: { status: 'PASS', duplicateJsonKeyCount: loaded.parserMetrics.duplicateKeyCount,
      skippedRecordCount: 0 }, observedLimits: loaded.parserMetrics,
    counts: { totalRecords: loaded.occurrences.length, branches: loaded.branches.length,
      children: childCount, supportOccurrences: supportCount,
      nonSupportOccurrences: childCount - supportCount },
    outerTypes: sortedCounts(state.outerTypes, 'outerType'),
    attributeTypes: sortedCounts(state.attributeTypes, 'attributeType'),
    attributeRawTypes: sortedCounts(state.attributeRawTypes, 'attributeRawType'),
    rawSupportObservations: {
      supportKinds: sortedCounts(state.supportKinds, 'value'),
      supportMapperKinds: sortedCounts(state.supportMapperKinds, 'value'),
      supportTypes: sortedCounts(state.supportTypes, 'value'),
    },
    rawSupportObservationCoverage: rawSupportCoverage(state, supportCount),
    ownerSites: sortedCounts(state.ownerSites, 'ownerSite'),
    referenceCounts: state.referenceCounts,
    duplicateIdentities: benchmarkIndexCollisions(indexes),
    coordinateExtents: finalExtents(state.extents), inventoryStatus: 'PASS',
  });
}
