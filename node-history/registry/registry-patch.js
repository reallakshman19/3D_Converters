import { canonicalSemanticJson, deepFreeze, text } from '../../contracts/topo-enriched-xml/contract-core.js';
import { TOPONODEREGISTRYPATCH_V1 } from '../../contracts/topo-enriched-xml/contracts.js';
import {
  COVERAGE_SCOPES,
  PATCH_OPERATION_TYPES,
  REGISTRY_PATCH_SCHEMA,
  buildValidation,
  freezeArtifact,
  issue,
} from './registry-contracts.js';
import {
  computeProposedRegistryHash,
  computeRegistrySnapshotHash,
  normalizeLineHistorySemantic,
  normalizePatchOperation,
  normalizeZoneRegistrySemantic,
} from './registry-hash.js';
import { validateLifecycleChanges, validateRegistrySnapshot } from './registry-validator.js';

export async function buildTopoNodeRegistryPatch({
  baseRegistryCommit,
  baseZoneRegistry,
  baseLineHistories,
  baseManifest,
  proposedZoneRegistry,
  proposedLineHistories,
  proposedManifest,
  currentRegistrySnapshotHash,
  coverage,
  operations = [],
  preconditions = [],
  evaluatedAt,
  sourceHash = null,
  configHash = null,
  nodePlanHash = null,
}) {
  const blockers = [];
  const baseValidation = await validateRegistrySnapshot({
    zoneRegistry: baseZoneRegistry, lineHistories: baseLineHistories, manifest: baseManifest,
  });
  const proposedValidation = await validateRegistrySnapshot({
    zoneRegistry: proposedZoneRegistry, lineHistories: proposedLineHistories, manifest: proposedManifest,
  });
  mergeValidation(blockers, baseValidation, 'BASE_REGISTRY_INVALID');
  mergeValidation(blockers, proposedValidation, 'PROPOSED_REGISTRY_INVALID');
  validateRoots(baseZoneRegistry, proposedZoneRegistry, blockers);
  validateCoverage(coverage, blockers);
  validateOperations(operations, coverage, blockers);
  validateEvaluatedAt(evaluatedAt, blockers);
  const baseHash = await computeRegistrySnapshotHash(baseManifest || {});
  const proposedHash = await computeRegistrySnapshotHash(proposedManifest || {});
  if (text(currentRegistrySnapshotHash) !== baseHash) blockers.push(issue('PATCH_BASE_SNAPSHOT_MISMATCH', {
    expected: baseHash, actual: text(currentRegistrySnapshotHash),
  }));
  if (text(baseManifest?.registrySnapshotHash) !== baseHash) blockers.push(issue('PATCH_BASE_MANIFEST_HASH_MISMATCH', {
    expected: text(baseManifest?.registrySnapshotHash), actual: baseHash,
  }));
  if (text(proposedManifest?.registrySnapshotHash) !== proposedHash) blockers.push(issue('PATCH_PROPOSED_MANIFEST_HASH_MISMATCH', {
    expected: text(proposedManifest?.registrySnapshotHash), actual: proposedHash,
  }));
  const lifecycle = validateLifecycleChanges({
    baseLineHistories, proposedLineHistories, operations,
  });
  mergeValidation(blockers, lifecycle, 'LIFECYCLE_UPDATE_INVALID');
  const affectedMainLines = changedMainLines(baseLineHistories, proposedLineHistories);
  validateAffectedCoverage(affectedMainLines, coverage, blockers);
  const normalizedOperations = [...operations].map(normalizePatchOperation).sort(operationSort);
  const semanticPatch = {
    schema: REGISTRY_PATCH_SCHEMA,
    projectId: text(baseZoneRegistry?.projectId),
    zoneId: text(baseZoneRegistry?.zoneId),
    baseRegistryCommit: text(baseRegistryCommit),
    baseRegistrySnapshotHash: baseHash,
    coverage: normalizeCoverage(coverage),
    preconditions: [...preconditions].map(normalizePatchOperation).sort(canonicalSort),
    operations: normalizedOperations,
    affectedZones: [text(baseZoneRegistry?.zoneId)],
    affectedMainLines,
    poolUpdates: describePoolUpdates(baseZoneRegistry, proposedZoneRegistry),
    lineHistoryUpdates: affectedMainLines.map((mainLineKey) => ({ mainLineKey })),
    lifecycleActions: normalizedOperations.filter((row) => isLifecycleOperation(row.type)),
    proposedRegistrySnapshotHash: proposedHash,
    ...(text(sourceHash) ? { sourceHash: text(sourceHash) } : {}),
    ...(text(configHash) ? { configHash: text(configHash) } : {}),
    ...(text(nodePlanHash) ? { nodePlanHash: text(nodePlanHash) } : {}),
    audit: { evaluatedAt: text(evaluatedAt) },
  };
  const candidate = {
    ...semanticPatch,
    validation: buildValidation(blockers),
    proposedRegistryHash: await computeProposedRegistryHash(semanticPatch),
  };
  const contractErrors = TOPONODEREGISTRYPATCH_V1.validate(candidate);
  if (contractErrors.length) throw new TypeError(`TopoNodeRegistryPatch.v1 validation failed: ${contractErrors.join('; ')}`);
  return freezeArtifact(candidate);
}

export async function verifyTopoNodeRegistryPatch({
  patch,
  baseZoneRegistry,
  baseLineHistories,
  baseManifest,
  proposedZoneRegistry,
  proposedLineHistories,
  proposedManifest,
  currentRegistrySnapshotHash,
}) {
  const rebuilt = await buildTopoNodeRegistryPatch({
    baseRegistryCommit: patch?.baseRegistryCommit,
    baseZoneRegistry,
    baseLineHistories,
    baseManifest,
    proposedZoneRegistry,
    proposedLineHistories,
    proposedManifest,
    currentRegistrySnapshotHash,
    coverage: patch?.coverage,
    operations: patch?.operations,
    preconditions: patch?.preconditions,
    evaluatedAt: patch?.audit?.evaluatedAt,
    sourceHash: patch?.sourceHash,
    configHash: patch?.configHash,
    nodePlanHash: patch?.nodePlanHash,
  });
  const blockers = [];
  if (canonicalSemanticJson(patch, { excludedKeys: [] }) !== canonicalSemanticJson(rebuilt, { excludedKeys: [] })) {
    blockers.push(issue('REGISTRY_PATCH_BUNDLE_MISMATCH'));
  }
  if (text(patch?.proposedRegistryHash) !== await computeProposedRegistryHash(patch || {})) {
    blockers.push(issue('PROPOSED_REGISTRY_HASH_MISMATCH'));
  }
  return deepFreeze(buildValidation(blockers));
}

function validateRoots(base, proposed, blockers) {
  for (const field of ['projectId', 'zoneId', 'registryVersion', 'policyVersion', 'configVersion']) {
    if (text(base?.[field]) !== text(proposed?.[field])) blockers.push(issue('REGISTRY_PATCH_ROOT_CHAIN_MISMATCH', {
      field, expected: text(base?.[field]), actual: text(proposed?.[field]),
    }));
  }
}

function validateCoverage(coverage, blockers) {
  if (!coverage || !COVERAGE_SCOPES.includes(text(coverage.scope)) || typeof coverage.authoritativeForRetirement !== 'boolean') {
    blockers.push(issue('REGISTRY_PATCH_COVERAGE_INVALID'));
    return;
  }
  if (coverage.scope === 'FULL_LINE' && (!Array.isArray(coverage.mainLineKeys) || !coverage.mainLineKeys.length)) {
    blockers.push(issue('FULL_LINE_COVERAGE_KEYS_MISSING'));
  }
}

function validateOperations(operations, coverage, blockers) {
  if (!Array.isArray(operations)) {
    blockers.push(issue('REGISTRY_PATCH_OPERATIONS_INVALID'));
    return;
  }
  const ids = new Set();
  for (const operation of operations) {
    const operationId = text(operation?.operationId);
    const type = text(operation?.type);
    if (!operationId || ids.has(operationId)) blockers.push(issue('DUPLICATE_REGISTRY_OPERATION_ID', { operationId }));
    ids.add(operationId);
    if (!PATCH_OPERATION_TYPES.includes(type)) blockers.push(issue('REGISTRY_OPERATION_TYPE_UNSUPPORTED', { operationId, type }));
    if (isLifecycleOperation(type) && !operation?.evidence) blockers.push(issue('LIFECYCLE_OPERATION_EVIDENCE_MISSING', { operationId, type }));
    if (type === 'RETIRE_NODE' && !retirementPermitted(coverage)) blockers.push(issue('PARTIAL_COVERAGE_RETIREMENT_PROHIBITED', { operationId }));
  }
}

function validateAffectedCoverage(affectedMainLines, coverage, blockers) {
  if (coverage?.scope === 'FULL_LINE') {
    const covered = new Set((coverage.mainLineKeys || []).map(text));
    for (const key of affectedMainLines) if (!covered.has(key)) blockers.push(issue('AFFECTED_LINE_OUTSIDE_COVERAGE', { mainLineKey: key }));
  }
}

function validateEvaluatedAt(value, blockers) {
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) {
    blockers.push(issue('PATCH_EVALUATED_AT_INVALID', { evaluatedAt: raw }));
  }
}

function changedMainLines(baseHistories = [], proposedHistories = []) {
  const base = new Map(baseHistories.map((row) => [text(row?.mainLineKey), canonicalSemanticJson(normalizeLineHistorySemantic(row))]));
  const proposed = new Map(proposedHistories.map((row) => [text(row?.mainLineKey), canonicalSemanticJson(normalizeLineHistorySemantic(row))]));
  const keys = new Set([...base.keys(), ...proposed.keys()]);
  return [...keys].filter((key) => base.get(key) !== proposed.get(key)).sort();
}

function describePoolUpdates(base, proposed) {
  const before = normalizeZoneRegistrySemantic(base || {});
  const after = normalizeZoneRegistrySemantic(proposed || {});
  if (canonicalSemanticJson({ namespace: before.namespace, leases: before.leases })
    === canonicalSemanticJson({ namespace: after.namespace, leases: after.leases })) return [];
  return [{ type: 'REPLACE_POOL_STATE', zoneId: text(base?.zoneId) }];
}

function normalizeCoverage(coverage = {}) {
  return {
    scope: text(coverage.scope),
    authoritativeForRetirement: coverage.authoritativeForRetirement === true,
    ...(Array.isArray(coverage.mainLineKeys) ? { mainLineKeys: [...coverage.mainLineKeys].map(text).sort() } : {}),
  };
}

function retirementPermitted(coverage) {
  return coverage?.authoritativeForRetirement === true && ['FULL_LINE', 'FULL_ZONE'].includes(text(coverage?.scope));
}

function isLifecycleOperation(type) {
  return ['RETIRE_NODE', 'REACTIVATE_NODE', 'SUPERSEDE_NODE', 'MARK_REVIEW_REQUIRED', 'ACTIVATE_NODE'].includes(text(type));
}

function mergeValidation(blockers, validation, code) {
  if (validation.status === 'BLOCKED') blockers.push(issue(code, { blockers: validation.blockers }));
}

function operationSort(a, b) { return `${text(a.type)}|${text(a.operationId)}`.localeCompare(`${text(b.type)}|${text(b.operationId)}`); }
function canonicalSort(a, b) { return canonicalSemanticJson(a).localeCompare(canonicalSemanticJson(b)); }
