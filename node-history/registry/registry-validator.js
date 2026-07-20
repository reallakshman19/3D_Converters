import { canonicalSemanticJson, deepFreeze, isRecord, text } from '../../contracts/topo-enriched-xml/contract-core.js';
import {
  LIFECYCLE_STATES,
  REGISTRY_VERSION,
  buildValidation,
  issue,
  isCanonicalMainLineKey,
  validateLineHistoryShape,
  validateSnapshotManifestShape,
  validateZoneRegistryShape,
} from './registry-contracts.js';
import {
  computeLineHistoryHash,
  computeRegistrySnapshotHash,
  computeZoneRegistryHash,
  normalizeLineHistorySemantic,
  normalizeManifestForHash,
  normalizeZoneRegistrySemantic,
} from './registry-hash.js';
const ACTIVE_STATES = new Set(['ACTIVE', 'REACTIVATED', 'REVIEW_REQUIRED']);
const ALLOWED_TRANSITIONS = Object.freeze({
  ACTIVE: new Set(['RETIRED', 'SUPERSEDED', 'REVIEW_REQUIRED']),
  RETIRED: new Set(['REACTIVATED', 'REVIEW_REQUIRED']),
  REACTIVATED: new Set(['ACTIVE', 'RETIRED', 'SUPERSEDED', 'REVIEW_REQUIRED']),
  SUPERSEDED: new Set(['REVIEW_REQUIRED']),
  REVIEW_REQUIRED: new Set(['ACTIVE', 'RETIRED', 'REACTIVATED', 'SUPERSEDED']),
});
export async function validateRegistrySnapshot({ zoneRegistry, lineHistories, manifest = null }) {
  const blockers = [];
  addShapeErrors(blockers, validateZoneRegistryShape(zoneRegistry), 'ZONE_REGISTRY_INVALID');
  const histories = Array.isArray(lineHistories) ? lineHistories : [];
  if (!Array.isArray(lineHistories)) blockers.push(issue('LINE_HISTORIES_INVALID'));
  for (const history of histories) addShapeErrors(blockers, validateLineHistoryShape(history), 'LINE_HISTORY_INVALID', {
    mainLineKey: text(history?.mainLineKey),
  });
  validateRegistryRoots(zoneRegistry, histories, blockers);
  validateLeases(zoneRegistry, blockers);
  validateHistorySet(zoneRegistry, histories, blockers);
  await validateArtifactHashes(zoneRegistry, histories, blockers);
  if (manifest) await validateManifest(zoneRegistry, histories, manifest, blockers);
  return deepFreeze(buildValidation(blockers));
}
export function validateLifecycleChanges({ baseLineHistories, proposedLineHistories, operations = [] }) {
  const blockers = [];
  const base = indexNodes(baseLineHistories);
  const proposed = indexNodes(proposedLineHistories);
  const operationByNode = indexLifecycleOperations(operations, blockers);
  for (const [historyNodeId, before] of base.entries()) {
    const after = proposed.get(historyNodeId);
    if (!after) {
      blockers.push(issue('HISTORY_NODE_DELETION_PROHIBITED', { historyNodeId }));
      continue;
    }
    validateImmutableFacts(before, after, blockers);
    validateTransition(before, after, operationByNode.get(historyNodeId), blockers);
  }
  for (const [historyNodeId, after] of proposed.entries()) {
    if (base.has(historyNodeId)) continue;
    const operation = operationByNode.get(historyNodeId);
    if (text(operation?.type) !== 'ADD_NODE') blockers.push(issue('NEW_HISTORY_NODE_OPERATION_MISSING', { historyNodeId }));
    if (!ACTIVE_STATES.has(text(after.lifecycleStatus))) blockers.push(issue('NEW_HISTORY_NODE_STATE_INVALID', {
      historyNodeId, lifecycleStatus: after.lifecycleStatus,
    }));
  }
  validateRetiredNumberOwnership(base, proposed, blockers);
  return deepFreeze(buildValidation(blockers));
}
function validateRegistryRoots(registry, histories, blockers) {
  const projectId = text(registry?.projectId);
  const zoneId = text(registry?.zoneId);
  if (!projectId || !zoneId) blockers.push(issue('REGISTRY_ROOT_AUTHORITY_MISSING', { projectId, zoneId }));
  if (text(registry?.registryVersion) !== REGISTRY_VERSION) blockers.push(issue('UNSUPPORTED_REGISTRY_VERSION', {
    registryVersion: text(registry?.registryVersion),
  }));
  for (const history of histories) {
    for (const field of ['projectId', 'zoneId', 'registryVersion']) {
      if (text(history?.[field]) !== text(registry?.[field])) blockers.push(issue('REGISTRY_ROOT_CHAIN_MISMATCH', {
        mainLineKey: text(history?.mainLineKey), field,
        expected: text(registry?.[field]), actual: text(history?.[field]),
      }));
    }
  }
}
function validateLeases(registry, blockers) {
  const leases = Array.isArray(registry?.leases) ? registry.leases : [];
  const leaseIds = new Set();
  const ranges = [];
  const namespace = registry?.namespace || {};
  for (const lease of leases) {
    const leaseId = text(lease?.leaseId);
    const mainLineKey = text(lease?.mainLineKey);
    if (!leaseId || leaseIds.has(leaseId)) blockers.push(issue('DUPLICATE_RANGE_LEASE_ID', { leaseId }));
    leaseIds.add(leaseId);
    if (!isCanonicalMainLineKey(mainLineKey)) blockers.push(issue('MAIN_LINE_KEY_NONCANONICAL', { mainLineKey }));
    if (!['ACTIVE', 'RETIRED'].includes(text(lease?.status))) blockers.push(issue('RANGE_LEASE_STATUS_INVALID', { leaseId, status: lease?.status }));
    if (!Array.isArray(lease?.ranges) || !lease.ranges.length) blockers.push(issue('RANGE_LEASE_EMPTY', { leaseId }));
    for (const [rangeIndex, range] of (lease?.ranges || []).entries()) {
      if (!validRange(range, namespace)) blockers.push(issue('RANGE_LEASE_INVALID', { leaseId, rangeIndex, range }));
      else ranges.push({ leaseId, mainLineKey, start: range.start, end: range.end });
    }
  }
  ranges.sort((a, b) => a.start - b.start || a.end - b.end || a.leaseId.localeCompare(b.leaseId));
  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1], current = ranges[index];
    if (current.start <= previous.end) blockers.push(issue('OVERLAPPING_RANGE_LEASE', { previous, current }));
  }
}
function validateHistorySet(registry, histories, blockers) {
  const historyIds = new Map();
  const numberOwners = new Map();
  const lineKeys = new Set();
  const leasesByLine = leaseIndex(registry?.leases);
  for (const history of histories) {
    const mainLineKey = text(history?.mainLineKey);
    if (lineKeys.has(mainLineKey)) blockers.push(issue('DUPLICATE_LINE_HISTORY', { mainLineKey }));
    lineKeys.add(mainLineKey);
    if (!isCanonicalMainLineKey(mainLineKey)) blockers.push(issue('MAIN_LINE_KEY_NONCANONICAL', { mainLineKey }));
    for (const node of history?.historyNodes || []) {
      validateHistoryNode(node, mainLineKey, blockers);
      const historyNodeId = text(node?.historyNodeId);
      const number = node?.engineeringNodeNumber;
      if (historyIds.has(historyNodeId)) blockers.push(issue('DUPLICATE_HISTORY_IDENTITY', {
        historyNodeId, firstMainLineKey: historyIds.get(historyNodeId), mainLineKey,
      }));
      historyIds.set(historyNodeId, mainLineKey);
      validateNumberOwnership(numberOwners, node, mainLineKey, blockers);
      if (ACTIVE_STATES.has(text(node?.lifecycleStatus)) && !numberInLease(number, leasesByLine.get(mainLineKey))) {
        blockers.push(issue('ACTIVE_NODE_OUTSIDE_OWNER_LEASE', { historyNodeId, mainLineKey, engineeringNodeNumber: number }));
      }
    }
  }
  validateLineReferences(registry, histories, blockers);
}
function validateHistoryNode(node, mainLineKey, blockers) {
  const historyNodeId = text(node?.historyNodeId);
  const status = text(node?.lifecycleStatus);
  if (!historyNodeId) blockers.push(issue('HISTORY_IDENTITY_MISSING', { mainLineKey }));
  if (!Number.isInteger(node?.engineeringNodeNumber) || node.engineeringNodeNumber < 0) {
    blockers.push(issue('ENGINEERING_NODE_NUMBER_INVALID', { historyNodeId, value: node?.engineeringNodeNumber }));
  }
  if (!LIFECYCLE_STATES.includes(status)) blockers.push(issue('LIFECYCLE_STATUS_INVALID', { historyNodeId, status }));
  if (!text(node?.firstObservedRevision) || !text(node?.lastObservedRevision)) blockers.push(issue('REVISION_EVIDENCE_MISSING', { historyNodeId }));
  if (!Array.isArray(node?.sourceAliases) || node.sourceAliases.some((alias) => !text(alias))
    || new Set(node?.sourceAliases || []).size !== (node?.sourceAliases || []).length) {
    blockers.push(issue('SOURCE_ALIAS_EVIDENCE_INVALID', { historyNodeId }));
  }
  if (!Array.isArray(node?.identityEvidence) || !node.identityEvidence.length
    || node.identityEvidence.some((row) => !text(row?.kind) || !text(row?.value) || !text(row?.authority))) {
    blockers.push(issue('IDENTITY_EVIDENCE_INVALID', { historyNodeId }));
  }
  const facts = node?.immutableFacts;
  if (!isRecord(facts)
    || text(facts.historyNodeId) !== historyNodeId
    || facts.engineeringNodeNumber !== node?.engineeringNodeNumber
    || text(facts.mainLineKey) !== mainLineKey
    || text(facts.firstObservedRevision) !== text(node?.firstObservedRevision)) {
    blockers.push(issue('IMMUTABLE_HISTORICAL_FACTS_INVALID', { historyNodeId }));
  }
  if (status === 'RETIRED' && !isRecord(node?.retirementEvidence)) blockers.push(issue('RETIREMENT_EVIDENCE_MISSING', { historyNodeId }));
  if (status === 'REACTIVATED' && !isRecord(node?.reactivationEvidence)) blockers.push(issue('REACTIVATION_EVIDENCE_MISSING', { historyNodeId }));
  if (status === 'SUPERSEDED' && (!isRecord(node?.supersessionEvidence) || !text(node?.supersededByHistoryNodeId))) {
    blockers.push(issue('SUPERSESSION_EVIDENCE_MISSING', { historyNodeId }));
  }
}

async function validateArtifactHashes(registry, histories, blockers) {
  const actualRegistryHash = await computeZoneRegistryHash(registry || {});
  if (text(registry?.zoneRegistryHash) !== actualRegistryHash) blockers.push(issue('ZONE_REGISTRY_HASH_MISMATCH', {
    expected: text(registry?.zoneRegistryHash), actual: actualRegistryHash,
  }));
  for (const history of histories) {
    const actual = await computeLineHistoryHash(history);
    if (text(history?.lineHistoryHash) !== actual) blockers.push(issue('LINE_HISTORY_HASH_MISMATCH', {
      mainLineKey: text(history?.mainLineKey), expected: text(history?.lineHistoryHash), actual,
    }));
  }
}

async function validateManifest(registry, histories, manifest, blockers) {
  addShapeErrors(blockers, validateSnapshotManifestShape(manifest), 'REGISTRY_SNAPSHOT_MANIFEST_INVALID');
  if (text(manifest?.projectId) !== text(registry?.projectId) || text(manifest?.zoneId) !== text(registry?.zoneId)) {
    blockers.push(issue('SNAPSHOT_ROOT_CHAIN_MISMATCH'));
  }
  const expectedPool = { ...normalizeZoneRegistrySemantic(registry), zoneRegistryHash: text(registry?.zoneRegistryHash) };
  if (canonicalSemanticJson(expectedPool) !== canonicalSemanticJson(normalizeManifestForHash(manifest).pool)) {
    blockers.push(issue('SNAPSHOT_POOL_COVERAGE_MISMATCH'));
  }
  const refs = new Map((manifest?.lineHistories || []).map((row) => [text(row?.mainLineKey), row]));
  for (const history of histories) {
    const key = text(history?.mainLineKey), reference = refs.get(key);
    if (!reference) blockers.push(issue('SNAPSHOT_LINE_HISTORY_OMITTED', { mainLineKey: key }));
    else if (text(reference.lineHistoryHash) !== text(history.lineHistoryHash)) blockers.push(issue('SNAPSHOT_LINE_HASH_MISMATCH', { mainLineKey: key }));
    refs.delete(key);
  }
  for (const mainLineKey of refs.keys()) blockers.push(issue('SNAPSHOT_LINE_HISTORY_UNPLANNED', { mainLineKey }));
  const actual = await computeRegistrySnapshotHash(manifest);
  if (text(manifest?.registrySnapshotHash) !== actual) blockers.push(issue('REGISTRY_SNAPSHOT_HASH_MISMATCH', {
    expected: text(manifest?.registrySnapshotHash), actual,
  }));
}

function validateTransition(before, after, operation, blockers) {
  if (before.lifecycleStatus === after.lifecycleStatus) {
    if (operation) blockers.push(issue('LIFECYCLE_OPERATION_NO_STATE_CHANGE', { historyNodeId: before.historyNodeId }));
    return;
  }
  const allowed = ALLOWED_TRANSITIONS[text(before.lifecycleStatus)];
  if (!allowed?.has(text(after.lifecycleStatus))) blockers.push(issue('INVALID_LIFECYCLE_TRANSITION', {
    historyNodeId: before.historyNodeId, from: before.lifecycleStatus, to: after.lifecycleStatus,
  }));
  const expectedType = operationTypeForStatus(after.lifecycleStatus);
  if (text(operation?.type) !== expectedType || !isRecord(operation?.evidence)) blockers.push(issue('LIFECYCLE_TRANSITION_EVIDENCE_MISSING', {
    historyNodeId: before.historyNodeId, expectedType,
  }));
}

function validateImmutableFacts(before, after, blockers) {
  for (const field of ['historyNodeId', 'engineeringNodeNumber', 'firstObservedRevision']) {
    if (before[field] !== after[field]) blockers.push(issue('IMMUTABLE_HISTORICAL_FACT_CHANGED', { historyNodeId: before.historyNodeId, field }));
  }
  if (canonicalSemanticJson(before.immutableFacts) !== canonicalSemanticJson(after.immutableFacts)) {
    blockers.push(issue('IMMUTABLE_HISTORICAL_FACT_CHANGED', { historyNodeId: before.historyNodeId, field: 'immutableFacts' }));
  }
}

function validateRetiredNumberOwnership(base, proposed, blockers) {
  const retired = new Map();
  for (const node of base.values()) if (['RETIRED', 'SUPERSEDED'].includes(text(node.lifecycleStatus))) retired.set(node.engineeringNodeNumber, node.historyNodeId);
  for (const node of proposed.values()) {
    const owner = retired.get(node.engineeringNodeNumber);
    if (owner && owner !== node.historyNodeId) blockers.push(issue('RETIRED_NUMBER_REASSIGNED', {
      engineeringNodeNumber: node.engineeringNodeNumber, retiredHistoryNodeId: owner, proposedHistoryNodeId: node.historyNodeId,
    }));
  }
}

function validateNumberOwnership(owners, node, mainLineKey, blockers) {
  const number = node?.engineeringNodeNumber, owner = owners.get(number);
  if (owner && owner.historyNodeId !== node?.historyNodeId) blockers.push(issue(
    ACTIVE_STATES.has(owner.status) && ACTIVE_STATES.has(text(node?.lifecycleStatus))
      ? 'DUPLICATE_ACTIVE_ZONE_NODE_NUMBER' : 'HISTORICAL_NUMBER_IDENTITY_CONFLICT',
    { engineeringNodeNumber: number, first: owner, second: { historyNodeId: node?.historyNodeId, mainLineKey, status: node?.lifecycleStatus } },
  ));
  owners.set(number, { historyNodeId: node?.historyNodeId, mainLineKey, status: text(node?.lifecycleStatus) });
}

function validateLineReferences(registry, histories, blockers) {
  const expected = new Set(histories.map((row) => text(row?.mainLineKey)));
  const references = registry?.lineHistoryRefs || [];
  const actual = new Set(references.map((row) => text(row?.mainLineKey)));
  if (actual.size !== references.length) blockers.push(issue('DUPLICATE_LINE_HISTORY_REFERENCE'));
  for (const key of expected) if (!actual.has(key)) blockers.push(issue('LINE_HISTORY_REFERENCE_MISSING', { mainLineKey: key }));
  for (const key of actual) if (!expected.has(key)) blockers.push(issue('LINE_HISTORY_REFERENCE_UNPLANNED', { mainLineKey: key }));
}

function leaseIndex(leases) {
  const result = new Map();
  for (const lease of leases || []) {
    if (text(lease?.status) !== 'ACTIVE') continue;
    const key = text(lease?.mainLineKey), rows = result.get(key) || [];
    rows.push(...(lease?.ranges || []));
    result.set(key, rows);
  }
  return result;
}

function numberInLease(number, ranges = []) {
  return ranges.some((range) => Number.isInteger(number) && number >= range.start && number <= range.end && (number - range.start) % range.step === 0);
}

function validRange(range, namespace) {
  return Number.isInteger(range?.start) && Number.isInteger(range?.end) && Number.isInteger(range?.step)
    && range.start >= namespace.minimum && range.end <= namespace.maximum && range.start <= range.end && range.step > 0;
}

function indexNodes(histories) {
  const result = new Map();
  for (const history of histories || []) for (const node of history?.historyNodes || []) result.set(text(node?.historyNodeId), node);
  return result;
}

function indexLifecycleOperations(operations, blockers) {
  const result = new Map();
  for (const operation of operations || []) {
    const historyNodeId = text(operation?.historyNodeId);
    if (!historyNodeId) continue;
    if (result.has(historyNodeId)) blockers.push(issue('DUPLICATE_LIFECYCLE_OPERATION', { historyNodeId }));
    result.set(historyNodeId, operation);
  }
  return result;
}

function operationTypeForStatus(status) {
  return ({ ACTIVE: 'ACTIVATE_NODE', RETIRED: 'RETIRE_NODE', REACTIVATED: 'REACTIVATE_NODE', SUPERSEDED: 'SUPERSEDE_NODE', REVIEW_REQUIRED: 'MARK_REVIEW_REQUIRED' })[status];
}

function addShapeErrors(blockers, errors, code, evidence = {}) {
  if (errors.length) blockers.push(issue(code, { ...evidence, errors }));
}
