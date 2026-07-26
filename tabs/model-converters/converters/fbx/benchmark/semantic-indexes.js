import { deepFreeze } from '../canonical-json.js';

function text(value) {
  return value == null ? '' : String(value);
}

function add(index, key, occurrence) {
  const observed = text(key);
  if (!observed) return;
  const values = index.get(observed) || [];
  values.push(occurrence);
  index.set(observed, values);
}

function freezeIndex(index) {
  return Object.freeze(Object.fromEntries(
    [...index.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, values]) => [key, deepFreeze([...values])]),
  ));
}

function observeRawRecord(occurrence, indexes) {
  const { record } = occurrence;
  const attributes = record.attributes || {};
  add(indexes.occurrenceById, occurrence.occurrenceId, occurrence);
  add(indexes.byOuterType, record.type, occurrence);
  add(indexes.byAttributeType, attributes.TYPE, occurrence);
  add(indexes.byAttributeRawType, attributes.RAW_TYPE, occurrence);
  add(indexes.bySourceReference, attributes.REF, occurrence);
}

function observeBranch(occurrence, indexes) {
  const attributes = occurrence.record.attributes || {};
  add(indexes.branchByName, attributes.NAME || occurrence.record.name, occurrence);
  add(indexes.branchByOwner, attributes.OWNER, occurrence);
  add(indexes.branchByOwnerSite, attributes.OWNER_SITE, occurrence);
}

function observeSupport(occurrence, indexes) {
  const { record } = occurrence;
  const attributes = record.attributes || {};
  add(indexes.supportByTag, attributes.SUPPORT_TAG || record.name, occurrence);
  add(indexes.supportByOwnerBranch, attributes.OWNER, occurrence);
  add(indexes.supportByOuterType, record.type, occurrence);
  add(indexes.supportByAttributeType, attributes.TYPE, occurrence);
  add(indexes.supportByAttributeRawType, attributes.RAW_TYPE, occurrence);
  add(indexes.supportByObservedKind, attributes.SUPPORT_KIND, occurrence);
  add(indexes.supportByObservedMapperKind, attributes.SUPPORT_MAPPER_KIND, occurrence);
  add(indexes.supportByObservedType, attributes.SUPPORT_TYPE, occurrence);
}

export function buildFbxBenchmarkIndexes(loaded) {
  const indexes = {
    occurrenceById: new Map(), branchByName: new Map(), branchByOwner: new Map(),
    branchByOwnerSite: new Map(), byOuterType: new Map(), byAttributeType: new Map(),
    byAttributeRawType: new Map(), bySourceReference: new Map(), supportByTag: new Map(),
    supportByOwnerBranch: new Map(), supportByOuterType: new Map(), supportByAttributeType: new Map(),
    supportByAttributeRawType: new Map(), supportByObservedKind: new Map(),
    supportByObservedMapperKind: new Map(), supportByObservedType: new Map(),
  };
  for (const occurrence of loaded.occurrences) {
    observeRawRecord(occurrence, indexes);
    if (occurrence.childIndex === null) observeBranch(occurrence, indexes);
    else if (occurrence.record.type === 'SUPPORT') observeSupport(occurrence, indexes);
  }
  return deepFreeze(Object.fromEntries(
    Object.entries(indexes).map(([name, index]) => [name, freezeIndex(index)]),
  ));
}

export function benchmarkIndexCollisions(indexes) {
  const collisions = [];
  const identityIndexes = ['branchByName', 'bySourceReference', 'supportByTag'];
  for (const indexName of identityIndexes) {
    for (const [key, occurrences] of Object.entries(indexes[indexName])) {
      if (occurrences.length > 1) collisions.push({ indexName, key,
        occurrenceIds: occurrences.map((item) => item.occurrenceId).sort() });
    }
  }
  return deepFreeze(collisions.sort((left, right) => left.indexName === right.indexName
    ? left.key < right.key ? -1 : left.key > right.key ? 1 : 0
    : left.indexName < right.indexName ? -1 : 1));
}
