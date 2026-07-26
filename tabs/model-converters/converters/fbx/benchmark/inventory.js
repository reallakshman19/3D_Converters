import { deepFreeze } from '../canonical-json.js';
import { benchmarkIndexCollisions, buildFbxBenchmarkIndexes } from './semantic-indexes.js';

function increment(map, key) {
  const normalized = key == null || key === '' ? 'UNCLASSIFIED' : String(key);
  map.set(normalized, (map.get(normalized) || 0) + 1);
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
  if (!Number.isFinite(extents.minimum.x)) return null;
  return extents;
}

function observeOccurrence(occurrence, state) {
  const { record } = occurrence, attributes = record.attributes || {};
  increment(state.normalizedTypes, record.type);
  if (occurrence.childIndex === null) increment(state.ownerSites, attributes.OWNER_SITE);
  else increment(state.rawTypes, attributes.RAW_TYPE || attributes.TYPE);
  if (record.type === 'SUPPORT') increment(state.supportClasses, attributes.SUPPORT_KIND);
  if (attributes.HREF !== undefined) state.referenceCounts.href += 1;
  if (attributes.TREF !== undefined) state.referenceCounts.tref += 1;
  for (const point of coordinateValues(record)) extendExtents(state.extents, point);
}

function createState() {
  return { normalizedTypes: new Map(), rawTypes: new Map(), supportClasses: new Map(), ownerSites: new Map(),
    referenceCounts: { href: 0, tref: 0 }, extents: { minimum: { x: Infinity, y: Infinity, z: Infinity },
      maximum: { x: -Infinity, y: -Infinity, z: -Infinity } } };
}

export function buildFbxBenchmarkInventory(loaded) {
  const state = createState();
  for (const occurrence of loaded.occurrences) observeOccurrence(occurrence, state);
  const indexes = buildFbxBenchmarkIndexes(loaded);
  const supportCount = state.normalizedTypes.get('SUPPORT') || 0;
  const classifiedSupportCount = [...state.supportClasses.values()].reduce((sum, value) => sum + value, 0)
    - (state.supportClasses.get('UNCLASSIFIED') || 0);
  return deepFreeze({ schema: 'FbxBenchmarkInventory.v1', benchmarkIdentity: loaded.identity,
    parseResult: { status: 'PASS', duplicateJsonKeyCount: loaded.parserMetrics.duplicateKeyCount,
      skippedRecordCount: 0 }, observedLimits: loaded.parserMetrics,
    counts: { totalRecords: loaded.occurrences.length, branches: loaded.branches.length,
      children: loaded.occurrences.length - loaded.branches.length,
      components: loaded.occurrences.length - loaded.branches.length - supportCount, supports: supportCount,
      classifiedSupports: classifiedSupportCount, unclassifiedSupports: supportCount - classifiedSupportCount },
    normalizedTypes: sortedCounts(state.normalizedTypes, 'type'), rawTypes: sortedCounts(state.rawTypes, 'rawType'),
    supportClasses: sortedCounts(state.supportClasses, 'supportClass'), ownerSites: sortedCounts(state.ownerSites, 'ownerSite'),
    referenceCounts: state.referenceCounts, duplicateIdentities: benchmarkIndexCollisions(indexes),
    coordinateExtents: finalExtents(state.extents), inventoryStatus: 'PASS' });
}
