import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';

function compareText(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') throw new TypeError('StagedJSON benchmark must be an object or array.');
  if (Array.isArray(value.hierarchy)) return value.hierarchy;
  if (Array.isArray(value.objects)) return value.objects;
  if (value.type && Array.isArray(value.children)) return [value];
  throw new TypeError('StagedJSON benchmark has no accepted branch collection.');
}

function nonEmptyText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function pointValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = [value.x, value.y, value.z];
  if (raw.some((item) => item === null || item === undefined || item === '')) return null;
  const point = { x: Number(raw[0]), y: Number(raw[1]), z: Number(raw[2]) };
  return Object.values(point).every(Number.isFinite) ? point : null;
}

function branchIdentity(node) {
  const attributes = node?.attributes && typeof node.attributes === 'object' ? node.attributes : {};
  return nonEmptyText(attributes.NAME) || nonEmptyText(node?.name) || nonEmptyText(attributes.REF) || null;
}

function rawTypeEvidence(attributes) {
  const values = [attributes.RAW_TYPE, attributes.TYPE].map(nonEmptyText).filter(Boolean);
  const unique = [...new Set(values)].sort(compareText);
  return { rawType: unique.length === 1 ? unique[0] : null, rawTypeConflicts: unique.length > 1 ? unique : [] };
}

function rawCandidate(node, parentBranch) {
  const attributes = node?.attributes && typeof node.attributes === 'object' && !Array.isArray(node.attributes)
    ? node.attributes : {};
  const rawType = rawTypeEvidence(attributes);
  return {
    parentBranch,
    rawNode: structuredClone(node),
    attributes: structuredClone(attributes),
    sourceRef: nonEmptyText(attributes.REF),
    sourceName: nonEmptyText(attributes.NAME),
    supportTag: nonEmptyText(attributes.SUPPORT_TAG) || nonEmptyText(node?.name),
    rawType: rawType.rawType,
    rawTypeConflicts: rawType.rawTypeConflicts,
    ownerBranch: nonEmptyText(attributes.OWNER),
    position: pointValue(attributes.POS),
    orientation: nonEmptyText(attributes.ORI),
  };
}

function collectCandidates(nodes) {
  const candidates = [];
  function visit(node, inheritedBranch) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const currentBranch = node.type === 'BRANCH' ? branchIdentity(node) : inheritedBranch;
    if (node.type === 'SUPPORT') candidates.push(rawCandidate(node, currentBranch));
    for (const child of Array.isArray(node.children) ? node.children : []) visit(child, currentBranch);
  }
  for (const node of nodes) visit(node, null);
  return candidates;
}

async function evidenceCandidate(candidate) {
  const canonical = canonicalJson({ parentBranch: candidate.parentBranch, rawNode: candidate.rawNode });
  return { ...candidate, evidenceSha256: await sha256Hex(canonical), canonical };
}

async function assignStableIds(candidates) {
  const evidenced = await Promise.all(candidates.map(evidenceCandidate));
  const groups = new Map();
  for (const candidate of evidenced) {
    const key = `${candidate.parentBranch ?? ''}\u0000${candidate.evidenceSha256}\u0000${candidate.canonical}`;
    const list = groups.get(key) || [];
    list.push(candidate);
    groups.set(key, list);
  }
  return finalizeGroups(groups);
}

async function finalizeGroups(groups) {
  const records = [];
  for (const [groupKey, group] of [...groups.entries()].sort(([a], [b]) => compareText(a, b))) {
    const groupSha256 = await sha256Hex(groupKey);
    for (let index = 0; index < group.length; index += 1) records.push(finalRecord(group[index], groupSha256, index + 1));
  }
  return records.sort((left, right) => compareText(left.recordId, right.recordId));
}

function finalRecord(candidate, groupSha256, occurrence) {
  const { canonical, ...retained } = candidate;
  return deepFreeze({
    ...retained,
    recordId: `support:sha256:${groupSha256}:${String(occurrence).padStart(4, '0')}`,
    sourceLocator: `${candidate.parentBranch || '<UNASSIGNED>'}/SUPPORT/${groupSha256}/${occurrence}`,
  });
}

export async function collectSupportRecords(stagedJson) {
  return assignStableIds(collectCandidates(asArray(stagedJson)));
}

function increment(counts, value) {
  const key = value ?? '<UNCLASSIFIED>';
  counts[key] = (counts[key] || 0) + 1;
}

export function buildSupportInventory(records) {
  if (!Array.isArray(records)) throw new TypeError('Support records must be an array.');
  const countsByRawType = {};
  const tags = new Map();
  let unassignedOwnerCount = 0;
  let rawTypeConflictCount = 0;
  for (const record of records) {
    increment(countsByRawType, record.rawType);
    if (!record.ownerBranch) unassignedOwnerCount += 1;
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
  return deepFreeze({ supportCount: records.length, countsByRawType, unassignedOwnerCount, rawTypeConflictCount, duplicateTagGroups });
}
