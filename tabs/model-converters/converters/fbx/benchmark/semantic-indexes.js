import { deepFreeze } from '../canonical-json.js';

function text(value) {
  return value == null ? '' : String(value);
}

function add(index, key, occurrence) {
  const normalized = text(key);
  if (!normalized) return;
  const values = index.get(normalized) || [];
  values.push(occurrence);
  index.set(normalized, values);
}

function freezeIndex(index) {
  return Object.freeze(Object.fromEntries(
    [...index.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, values]) => [key, deepFreeze([...values])]),
  ));
}

function childIndexes(occurrence, indexes) {
  const attributes = occurrence.record.attributes || {};
  add(indexes.byNormalizedType, occurrence.record.type, occurrence);
  add(indexes.byRawType, attributes.RAW_TYPE || attributes.TYPE, occurrence);
  add(indexes.bySourceReference, attributes.REF, occurrence);
  if (occurrence.record.type !== 'SUPPORT') return;
  add(indexes.supportByTag, attributes.SUPPORT_TAG || occurrence.record.name, occurrence);
  add(indexes.supportByClass, attributes.SUPPORT_KIND || 'UNCLASSIFIED', occurrence);
  add(indexes.supportByOwnerBranch, attributes.OWNER, occurrence);
}

export function buildFbxBenchmarkIndexes(loaded) {
  const indexes = { branchByName: new Map(), branchByOwner: new Map(), branchByOwnerSite: new Map(),
    byNormalizedType: new Map(), byRawType: new Map(), bySourceReference: new Map(),
    supportByTag: new Map(), supportByClass: new Map(), supportByOwnerBranch: new Map() };
  for (const occurrence of loaded.occurrences) {
    if (occurrence.childIndex !== null) { childIndexes(occurrence, indexes); continue; }
    const attributes = occurrence.record.attributes || {};
    add(indexes.branchByName, attributes.NAME || occurrence.record.name, occurrence);
    add(indexes.branchByOwner, attributes.OWNER, occurrence);
    add(indexes.branchByOwnerSite, attributes.OWNER_SITE, occurrence);
    add(indexes.byNormalizedType, occurrence.record.type, occurrence);
  }
  return deepFreeze(Object.fromEntries(Object.entries(indexes).map(([name, index]) => [name, freezeIndex(index)])));
}

export function benchmarkIndexCollisions(indexes) {
  const collisions = [];
  const identityIndexes = ['branchByName', 'bySourceReference', 'supportByTag'];
  for (const indexName of identityIndexes) {
    const index = indexes[indexName];
    for (const [key, occurrences] of Object.entries(index)) {
      if (occurrences.length > 1) collisions.push({ indexName, key,
        occurrenceIds: occurrences.map((item) => item.occurrenceId).sort() });
    }
  }
  return deepFreeze(collisions.sort((left, right) => left.indexName === right.indexName
    ? left.key < right.key ? -1 : left.key > right.key ? 1 : 0
    : left.indexName < right.indexName ? -1 : 1));
}
