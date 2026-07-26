import { deepFreeze } from './canonical-json.js';
import { validateFbxBenchmarkZoneManifest } from './benchmark-zone-contract.js';

export const FBX_ZONE_MEMBERSHIP_INDEX_SCHEMA = 'FbxZoneMembershipIndex.v1';
export const FBX_ZONE_MEMBERSHIP_STATUSES = deepFreeze([
  'ASSIGNED', 'SHARED_BOUNDARY', 'CONFLICT', 'UNASSIGNED', 'EXCLUDED',
]);
export const FBX_ZONE_MEMBERSHIP_AUTHORITIES = deepFreeze([
  'shared-boundary', 'branch', 'owner', 'owner-site', 'none', 'exclusion',
]);

const INDEX_KEYS = [
  'schema', 'benchmark', 'zonePolicyId', 'records', 'zones',
  'conflictBranchNames', 'unassignedBranchNames', 'excludedBranchNames',
];
const RECORD_KEYS = [
  'branchName', 'owner', 'ownerSite', 'status', 'authority', 'zoneIds',
  'candidateZoneIds', 'signals', 'exclusionReason',
];
const SIGNAL_KEYS = ['authority', 'zoneIds'];
const ZONE_KEYS = ['zoneId', 'branchNames', 'sharedBoundaryBranchNames'];
const SIGNAL_ORDER = ['shared-boundary', 'branch', 'owner', 'owner-site'];
const STATUS_SET = new Set(FBX_ZONE_MEMBERSHIP_STATUSES);
const AUTHORITY_SET = new Set(FBX_ZONE_MEMBERSHIP_AUTHORITIES);

function compareText(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort(compareText);
  const expected = [...keys].sort(compareText);
  if (actual.join('\0') !== expected.join('\0')) throw new Error(`${label} fields are invalid.`);
}

function branchText(branch, key) {
  const value = branch?.attributes?.[key];
  return value == null ? '' : String(value);
}

function validateBranches(branches) {
  if (!Array.isArray(branches)) throw new Error('FBX benchmark branches must be an array.');
  const names = new Set();
  for (const branch of branches) {
    if (!branch || branch.type !== 'BRANCH' || typeof branch.name !== 'string' || !branch.name) {
      throw new Error('FBX benchmark zone membership requires named BRANCH records.');
    }
    if (!branch.attributes || typeof branch.attributes !== 'object' || Array.isArray(branch.attributes)) {
      throw new Error(`FBX benchmark branch ${branch.name} lacks attributes.`);
    }
    if (names.has(branch.name)) throw new Error(`Duplicate FBX benchmark branch ${branch.name}.`);
    names.add(branch.name);
  }
}

function selectorMaps(manifest) {
  const maps = {
    branch: new Map(), owner: new Map(), 'owner-site': new Map(), 'shared-boundary': new Map(),
  };
  for (const zone of manifest.zones) {
    for (const value of zone.branches) maps.branch.set(value, [zone.zoneId]);
    for (const value of zone.owners) maps.owner.set(value, [zone.zoneId]);
    for (const value of zone.ownerSites) maps['owner-site'].set(value, [zone.zoneId]);
    for (const value of zone.sharedBoundaryBranches) {
      const zones = maps['shared-boundary'].get(value) || [];
      zones.push(zone.zoneId);
      maps['shared-boundary'].set(value, zones.sort(compareText));
    }
  }
  return maps;
}

function signalsFor(branch, maps) {
  const values = {
    'shared-boundary': branch.name,
    branch: branch.name,
    owner: branchText(branch, 'OWNER'),
    'owner-site': branchText(branch, 'OWNER_SITE'),
  };
  return SIGNAL_ORDER.flatMap((authority) => {
    const zoneIds = maps[authority].get(values[authority]);
    return zoneIds ? [{ authority, zoneIds: [...zoneIds] }] : [];
  });
}

function sortedUnique(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array.`);
  const sorted = [...values].sort(compareText);
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicates.`);
  if (JSON.stringify(values) !== JSON.stringify(sorted)) throw new Error(`${label} is not sorted.`);
  return values;
}

function uniqueZoneIds(signals) {
  return [...new Set(signals.flatMap((signal) => signal.zoneIds))].sort(compareText);
}

function hasConflictingSignal(selected, signals) {
  const accepted = new Set(selected.zoneIds);
  return signals.some((signal) => signal.zoneIds.some((zoneId) => !accepted.has(zoneId)));
}

function classifiedRecord(signals) {
  if (!signals.length) return { status: 'UNASSIGNED', authority: 'none', zoneIds: [] };
  const selected = signals[0];
  if (hasConflictingSignal(selected, signals.slice(1))) {
    return { status: 'CONFLICT', authority: selected.authority, zoneIds: [] };
  }
  return {
    status: selected.authority === 'shared-boundary' ? 'SHARED_BOUNDARY' : 'ASSIGNED',
    authority: selected.authority,
    zoneIds: [...selected.zoneIds],
  };
}

function exclusionMap(manifest) {
  return new Map(manifest.exclusions.map((item) => [item.branchName, item.reason]));
}

function recordFor(branch, maps, exclusions) {
  const signals = signalsFor(branch, maps);
  const exclusionReason = exclusions.get(branch.name) || null;
  const classification = exclusionReason
    ? { status: 'EXCLUDED', authority: 'exclusion', zoneIds: [] }
    : classifiedRecord(signals);
  return {
    branchName: branch.name,
    owner: branchText(branch, 'OWNER'),
    ownerSite: branchText(branch, 'OWNER_SITE'),
    status: classification.status,
    authority: classification.authority,
    zoneIds: classification.zoneIds,
    candidateZoneIds: uniqueZoneIds(signals),
    signals,
    exclusionReason,
  };
}

function zoneSummaries(manifest, records) {
  return manifest.zones.map((zone) => ({
    zoneId: zone.zoneId,
    branchNames: records.filter((record) => (
      record.status === 'ASSIGNED' && record.zoneIds.includes(zone.zoneId)
    )).map((record) => record.branchName).sort(compareText),
    sharedBoundaryBranchNames: records.filter((record) => (
      record.status === 'SHARED_BOUNDARY' && record.zoneIds.includes(zone.zoneId)
    )).map((record) => record.branchName).sort(compareText),
  }));
}

function validateSignal(signal, label, zoneIds) {
  exactKeys(signal, SIGNAL_KEYS, label);
  if (!SIGNAL_ORDER.includes(signal.authority)) throw new Error(`${label} authority is invalid.`);
  sortedUnique(signal.zoneIds, `${label}.zoneIds`);
  if (!signal.zoneIds.length) throw new Error(`${label}.zoneIds must not be empty.`);
  for (const zoneId of signal.zoneIds) if (!zoneIds.has(zoneId)) {
    throw new Error(`${label} references unknown zone ${zoneId}.`);
  }
}

function validateRecord(record, index, zoneIds) {
  const label = `records[${index}]`;
  exactKeys(record, RECORD_KEYS, label);
  if (typeof record.branchName !== 'string' || !record.branchName) {
    throw new Error(`${label}.branchName is invalid.`);
  }
  if (!STATUS_SET.has(record.status) || !AUTHORITY_SET.has(record.authority)) {
    throw new Error(`${label} status or authority is invalid.`);
  }
  sortedUnique(record.zoneIds, `${label}.zoneIds`);
  sortedUnique(record.candidateZoneIds, `${label}.candidateZoneIds`);
  if (!Array.isArray(record.signals)) throw new Error(`${label}.signals must be an array.`);
  record.signals.forEach((signal, signalIndex) => validateSignal(
    signal, `${label}.signals[${signalIndex}]`, zoneIds,
  ));
  if (JSON.stringify(record.candidateZoneIds) !== JSON.stringify(uniqueZoneIds(record.signals))) {
    throw new Error(`${label}.candidateZoneIds do not match signals.`);
  }
  validateRecordState(record, label);
}

function validateRecordState(record, label) {
  const assigned = record.status === 'ASSIGNED';
  const shared = record.status === 'SHARED_BOUNDARY';
  if (assigned && record.zoneIds.length !== 1) throw new Error(`${label} assigned zone count is invalid.`);
  if (shared && record.zoneIds.length < 2) throw new Error(`${label} shared boundary is incomplete.`);
  if (!assigned && !shared && record.zoneIds.length) throw new Error(`${label} must not assign zones.`);
  if (record.status === 'UNASSIGNED' && (record.authority !== 'none' || record.signals.length)) {
    throw new Error(`${label} unassigned state is invalid.`);
  }
  if (record.status === 'EXCLUDED') {
    if (record.authority !== 'exclusion' || typeof record.exclusionReason !== 'string') {
      throw new Error(`${label} exclusion state is invalid.`);
    }
  } else if (record.exclusionReason !== null) throw new Error(`${label} has an unexpected exclusion.`);
}

function validateZones(zones, records) {
  if (!Array.isArray(zones)) throw new Error('zones must be an array.');
  const ids = new Set();
  zones.forEach((zone, index) => {
    exactKeys(zone, ZONE_KEYS, `zones[${index}]`);
    if (ids.has(zone.zoneId)) throw new Error(`Duplicate zone summary ${zone.zoneId}.`);
    ids.add(zone.zoneId);
    sortedUnique(zone.branchNames, `zones[${index}].branchNames`);
    sortedUnique(zone.sharedBoundaryBranchNames, `zones[${index}].sharedBoundaryBranchNames`);
  });
  const expected = zoneSummaries({ zones }, records);
  if (JSON.stringify(zones) !== JSON.stringify(expected)) throw new Error('Zone summaries are not derived.');
  return ids;
}

function validateDerivedLists(index) {
  const derived = (status) => index.records.filter((record) => record.status === status)
    .map((record) => record.branchName);
  const checks = [
    ['CONFLICT', 'conflictBranchNames'],
    ['UNASSIGNED', 'unassignedBranchNames'],
    ['EXCLUDED', 'excludedBranchNames'],
  ];
  for (const [status, key] of checks) {
    sortedUnique(index[key], key);
    if (JSON.stringify(index[key]) !== JSON.stringify(derived(status))) {
      throw new Error(`${key} is not derived from records.`);
    }
  }
}

export function validateFbxZoneMembershipIndex(index) {
  exactKeys(index, INDEX_KEYS, 'zone membership index');
  if (index.schema !== FBX_ZONE_MEMBERSHIP_INDEX_SCHEMA) throw new Error('Zone index schema is invalid.');
  if (!index.benchmark || typeof index.zonePolicyId !== 'string') {
    throw new Error('Zone index identity is invalid.');
  }
  if (!Array.isArray(index.records)) throw new Error('records must be an array.');
  const zoneIds = validateZones(index.zones, index.records);
  index.records.forEach((record, recordIndex) => validateRecord(record, recordIndex, zoneIds));
  const names = index.records.map((record) => record.branchName);
  sortedUnique(names, 'record branch names');
  validateDerivedLists(index);
  return index;
}

export function buildFbxZoneMembershipIndex(manifest, branches) {
  validateFbxBenchmarkZoneManifest(manifest);
  validateBranches(branches);
  const maps = selectorMaps(manifest);
  const exclusions = exclusionMap(manifest);
  const records = branches.map((branch) => recordFor(branch, maps, exclusions))
    .sort((a, b) => compareText(a.branchName, b.branchName));
  const byStatus = (status) => records.filter((record) => record.status === status)
    .map((record) => record.branchName);
  const index = {
    schema: FBX_ZONE_MEMBERSHIP_INDEX_SCHEMA,
    benchmark: structuredClone(manifest.benchmark),
    zonePolicyId: manifest.zonePolicyId,
    records,
    zones: zoneSummaries(manifest, records),
    conflictBranchNames: byStatus('CONFLICT'),
    unassignedBranchNames: byStatus('UNASSIGNED'),
    excludedBranchNames: byStatus('EXCLUDED'),
  };
  validateFbxZoneMembershipIndex(index);
  return deepFreeze(index);
}
