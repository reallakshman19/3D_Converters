import { canonicalJson, deepFreeze } from '../canonical-json.js';

const EXPLICIT_CLASS_PATHS = [
  'SUPPORT_KIND',
  'SUPPORT_MAPPER_KIND',
  'SUPPORT_TYPE',
];

function compareText(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') {
    throw new TypeError('StagedJSON benchmark must be an object or array.');
  }
  if (Array.isArray(value.hierarchy)) return value.hierarchy;
  if (Array.isArray(value.objects)) return value.objects;
  if (value.type && Array.isArray(value.children)) return [value];
  throw new TypeError('StagedJSON benchmark has no accepted branch collection.');
}

function valueAt(attributes, key) {
  return Object.hasOwn(attributes, key) ? attributes[key] : undefined;
}

function nonEmptyText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function pointValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const point = { x: Number(value.x), y: Number(value.y), z: Number(value.z) };
  return Object.values(point).every(Number.isFinite) ? point : null;
}

function fnv1a64(text) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, '0');
}

function branchIdentity(node) {
  const attributes = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};
  return nonEmptyText(attributes.NAME)
    || nonEmptyText(node?.name)
    || nonEmptyText(attributes.REF)
    || null;
}

function explicitClassEvidence(attributes) {
  const evidence = EXPLICIT_CLASS_PATHS.map((key) => ({
    path: `attributes.${key}`,
    valueState: Object.hasOwn(attributes, key)
      ? attributes[key] === null
        ? 'EXPLICIT_NULL'
        : attributes[key] === ''
          ? 'EMPTY_STRING'
          : 'VALUE_PRESENT'
      : 'MISSING_ATTRIBUTE',
    value: Object.hasOwn(attributes, key) ? attributes[key] : undefined,
    normalized: nonEmptyText(attributes[key])?.toUpperCase() || null,
  }));
  const normalized = [...new Set(evidence.map((item) => item.normalized).filter(Boolean))].sort(compareText);
  return {
    evidence,
    supportClass: normalized.length === 1 ? normalized[0] : null,
    conflicts: normalized.length > 1 ? normalized : [],
    hasExplicitEmpty: evidence.some((item) => item.valueState === 'EMPTY_STRING'),
  };
}

function rawCandidate(node, parentBranch) {
  const attributes = node?.attributes && typeof node.attributes === 'object' && !Array.isArray(node.attributes)
    ? node.attributes
    : {};
  const classResult = explicitClassEvidence(attributes);
  const rawTypeValues = [valueAt(attributes, 'RAW_TYPE'), valueAt(attributes, 'TYPE')]
    .map(nonEmptyText)
    .filter(Boolean);
  const uniqueRawTypes = [...new Set(rawTypeValues)].sort(compareText);
  const rawType = uniqueRawTypes.length === 1 ? uniqueRawTypes[0] : null;
  const projection = {
    parentBranch,
    rawNode: node,
  };
  const canonical = canonicalJson(projection);
  return {
    fingerprint: fnv1a64(canonical),
    canonical,
    parentBranch,
    rawNode: structuredClone(node),
    attributes: structuredClone(attributes),
    sourceRef: nonEmptyText(attributes.REF),
    sourceName: nonEmptyText(attributes.NAME),
    supportTag: nonEmptyText(attributes.SUPPORT_TAG) || nonEmptyText(node?.name),
    rawType,
    rawTypeConflicts: uniqueRawTypes.length > 1 ? uniqueRawTypes : [],
    ownerBranch: nonEmptyText(attributes.OWNER),
    position: pointValue(attributes.POS),
    orientation: nonEmptyText(attributes.ORI),
    classEvidence: classResult.evidence,
    supportClass: classResult.supportClass,
    classConflicts: classResult.conflicts,
    hasExplicitEmptyClass: classResult.hasExplicitEmpty,
  };
}

function collectCandidates(nodes) {
  const candidates = [];
  function visit(node, inheritedBranch) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const currentBranch = node.type === 'BRANCH' ? branchIdentity(node) : inheritedBranch;
    if (node.type === 'SUPPORT') candidates.push(rawCandidate(node, currentBranch));
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) visit(child, currentBranch);
  }
  for (const node of nodes) visit(node, null);
  return candidates;
}

function assignStableIds(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.parentBranch ?? ''}\u0000${candidate.fingerprint}\u0000${candidate.canonical}`;
    const list = groups.get(key) || [];
    list.push(candidate);
    groups.set(key, list);
  }
  const records = [];
  for (const [groupKey, group] of [...groups.entries()].sort(([left], [right]) => compareText(left, right))) {
    const groupDigest = fnv1a64(groupKey);
    for (let index = 0; index < group.length; index += 1) {
      const occurrence = index + 1;
      const recordId = `support:${groupDigest}:${String(occurrence).padStart(4, '0')}`;
      records.push(deepFreeze({
        ...group[index],
        recordId,
        sourceLocator: `${group[index].parentBranch || '<UNASSIGNED>'}/SUPPORT/${groupDigest}/${occurrence}`,
      }));
    }
  }
  return records.sort((left, right) => compareText(left.recordId, right.recordId));
}

export function collectSupportRecords(stagedJson) {
  return assignStableIds(collectCandidates(asArray(stagedJson)));
}

function increment(counts, value) {
  const key = value ?? '<UNCLASSIFIED>';
  counts[key] = (counts[key] || 0) + 1;
}

export function buildSupportInventory(records) {
  if (!Array.isArray(records)) throw new TypeError('Support records must be an array.');
  const countsByRawType = {};
  const countsByClass = {};
  const tags = new Map();
  let unassignedOwnerCount = 0;
  let classConflictCount = 0;
  let rawTypeConflictCount = 0;
  for (const record of records) {
    increment(countsByRawType, record.rawType);
    increment(countsByClass, record.supportClass);
    if (!record.ownerBranch) unassignedOwnerCount += 1;
    if (record.classConflicts.length) classConflictCount += 1;
    if (record.rawTypeConflicts.length) rawTypeConflictCount += 1;
    if (record.supportTag) {
      const list = tags.get(record.supportTag) || [];
      list.push(record.recordId);
      tags.set(record.supportTag, list);
    }
  }
  const duplicateTagGroups = [...tags.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([supportTag, recordIds]) => ({ supportTag, recordIds: [...recordIds].sort(compareText) }))
    .sort((left, right) => compareText(left.supportTag, right.supportTag));
  return deepFreeze({
    supportCount: records.length,
    countsByRawType,
    countsByClass,
    unclassifiedCount: countsByClass['<UNCLASSIFIED>'] || 0,
    unassignedOwnerCount,
    classConflictCount,
    rawTypeConflictCount,
    duplicateTagGroups,
  });
}
