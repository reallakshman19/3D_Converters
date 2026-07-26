import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import {
  canonicalKey, cloneJson, compareText, fail, isObject, point,
} from './component-common.js';
import {
  catalogEntryForTypes, validateComponentIdentityPolicy,
} from './component-policy.js';

const FIELD_ALIASES = Object.freeze({
  zoneId: (subject) => subject.zoneId,
  branchId: (subject) => subject.branchId,
  owner: (subject) => subject.owner,
  family: (subject) => subject.family,
  outerType: (subject) => subject.outerType,
  rawType: (subject) => subject.rawType,
  subtype: (subject) => subject.subtype,
  reference: (subject) => subject.reference,
  name: (subject) => subject.sourceName,
  sourceIdentity: (subject) => subject.sourceIdentity,
  'geometry.position': (subject) => subject.geometry.position,
  'geometry.apos': (subject) => subject.geometry.apos,
  'geometry.lpos': (subject) => subject.geometry.lpos,
  'attributes.AUTO_GENERATED_PIPE': (subject) => subject.attributes.AUTO_GENERATED_PIPE,
  'attributes.GAP_MM': (subject) => subject.attributes.GAP_MM,
  'attributes.ROUTE_TIER': (subject) => subject.attributes.ROUTE_TIER,
  'attributes.ROUTE_SPLIT': (subject) => subject.attributes.ROUTE_SPLIT,
  'attributes.BORE_SOURCE': (subject) => subject.attributes.BORE_SOURCE,
});

export function childType(child) {
  return String(child?.type ?? '').trim().toUpperCase();
}

export function rawType(child) {
  const attributes = isObject(child?.attributes) ? child.attributes : {};
  return String(attributes.RAW_TYPE ?? attributes.TYPE ?? child?.type ?? '')
    .trim().toUpperCase() || null;
}

function branchIdentity(branch) {
  const attributes = isObject(branch?.attributes) ? branch.attributes : {};
  return String(
    attributes.REF ?? attributes.NAME ?? branch?.id ?? branch?.name ?? '',
  ).trim() || null;
}

function sourceIdentityOf(child) {
  const attributes = isObject(child?.attributes) ? child.attributes : {};
  const value = attributes.sourceModelObjectId
    ?? attributes.SOURCE_OBJECT_ID
    ?? child?.sourceModelObjectId;
  return value === undefined || value === null || value === '' ? null : String(value);
}

export function fieldValue(subject, path) {
  if (FIELD_ALIASES[path]) return FIELD_ALIASES[path](subject);
  const parts = path.split('.');
  let value = subject;
  for (const part of parts) {
    if (!isObject(value) && !Array.isArray(value)) return undefined;
    value = value[part];
  }
  return value;
}

function branchesOf(value, label) {
  if (Array.isArray(value)) return value;
  if (isObject(value) && Array.isArray(value.hierarchy)) return value.hierarchy;
  if (isObject(value) && Array.isArray(value.objects)) return value.objects;
  if (isObject(value) && value.type && Array.isArray(value.children)) return [value];
  fail(`${label} must be a StagedJSON branch array or recognized envelope.`);
}

function normalizeSubject(branch, child, policy, side, zoneResolver) {
  const attributes = isObject(child.attributes) ? child.attributes : {};
  const outer = childType(child), raw = rawType(child);
  const catalogEntry = catalogEntryForTypes(outer, raw, policy);
  const zoneId = typeof zoneResolver === 'function'
    ? zoneResolver({ branch, child, side }) : null;
  if (zoneId !== null && (typeof zoneId !== 'string' || !zoneId.trim())) {
    fail('zoneResolver must return a non-empty string or null.');
  }
  const subject = {
    side,
    zoneId,
    family: catalogEntry?.familyId ?? 'UNKNOWN',
    outerType: outer,
    rawType: raw,
    subtype: catalogEntry?.preserveRawSubtype ? raw : null,
    disposition: catalogEntry?.disposition ?? 'BLOCK',
    comparatorId: catalogEntry?.comparatorId ?? null,
    exclusionReason: catalogEntry?.exclusionReason ?? null,
    branchId: branchIdentity(branch),
    owner: attributes.OWNER == null ? null : String(attributes.OWNER),
    reference: attributes.REF == null ? null : String(attributes.REF),
    sourceName: attributes.NAME == null
      ? (child.name == null ? null : String(child.name)) : String(attributes.NAME),
    displayName: child.name == null ? null : String(child.name),
    sourceIdentity: sourceIdentityOf(child),
    geometry: {
      position: point(attributes.POS),
      apos: point(attributes.APOS),
      lpos: point(attributes.LPOS),
    },
    attributes: cloneJson(attributes),
    raw: cloneJson(child),
  };
  subject.canonicalSubject = canonicalKey({
    family: subject.family,
    outerType: subject.outerType,
    rawType: subject.rawType,
    zoneId: subject.zoneId,
    branchId: subject.branchId,
    owner: subject.owner,
    reference: subject.reference,
    sourceName: subject.sourceName,
    sourceIdentity: subject.sourceIdentity,
    geometry: subject.geometry,
    attributes: subject.attributes,
  });
  return subject;
}

async function assignSubjectIds(subjects, side) {
  const grouped = new Map();
  for (const subject of subjects) {
    const list = grouped.get(subject.canonicalSubject) || [];
    list.push(subject);
    grouped.set(subject.canonicalSubject, list);
  }
  const result = [];
  for (const key of [...grouped.keys()].sort(compareText)) {
    const hash = await sha256Hex(key), list = grouped.get(key);
    for (let index = 0; index < list.length; index += 1) {
      result.push({
        ...list[index],
        subjectId: `${side === 'REFERENCE' ? 'R' : 'A'}-COMP-${hash.slice(0, 24)}-${index + 1}`,
        canonicalSubjectPayloadSha256: hash,
        multiplicityIndex: index + 1,
      });
    }
  }
  return result.sort((left, right) => compareText(left.subjectId, right.subjectId));
}

export async function buildComponentSubjects(
  value,
  policyValue,
  side = 'REFERENCE',
  { zoneResolver = null } = {},
) {
  const policy = validateComponentIdentityPolicy(policyValue), subjects = [];
  for (const [branchIndex, branch] of branchesOf(value, side).entries()) {
    if (!isObject(branch) || childType(branch) !== 'BRANCH'
      || !Array.isArray(branch.children)) {
      fail(`${side} branch[${branchIndex}] is invalid.`);
    }
    for (const child of branch.children) {
      if (!isObject(child)) {
        fail(`${side} branch[${branchIndex}] contains a non-object child.`);
      }
      if (childType(child) === 'SUPPORT') continue;
      subjects.push(normalizeSubject(branch, child, policy, side, zoneResolver));
    }
  }
  return deepFreeze(await assignSubjectIds(subjects, side));
}

export function discoverComponentCatalog(value) {
  const countsByOuterType = new Map(), countsByRawType = new Map();
  let branchCount = 0, supportCount = 0, componentCount = 0;
  for (const [branchIndex, branch] of branchesOf(value, 'benchmark').entries()) {
    if (!isObject(branch) || childType(branch) !== 'BRANCH'
      || !Array.isArray(branch.children)) {
      fail(`benchmark branch[${branchIndex}] is invalid.`);
    }
    branchCount += 1;
    for (const child of branch.children) {
      const outer = childType(child);
      if (outer === 'SUPPORT') {
        supportCount += 1;
        continue;
      }
      componentCount += 1;
      const raw = rawType(child) ?? 'UNKNOWN';
      countsByOuterType.set(outer, (countsByOuterType.get(outer) || 0) + 1);
      countsByRawType.set(raw, (countsByRawType.get(raw) || 0) + 1);
    }
  }
  const sortedObject = (map) => Object.fromEntries(
    [...map.entries()].sort(([left], [right]) => compareText(left, right)),
  );
  return deepFreeze({
    schema: 'FbxComponentCatalog.v1',
    branchCount,
    componentCount,
    supportCount,
    countsByOuterType: sortedObject(countsByOuterType),
    countsByRawType: sortedObject(countsByRawType),
  });
}
