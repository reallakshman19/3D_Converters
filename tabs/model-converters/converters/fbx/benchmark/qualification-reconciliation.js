import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';

export const FBX_QUALIFICATION_RECONCILIATION_SCHEMA = 'FbxQualificationReconciliation.v1';
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const PRODUCER_ORDER = ['E', 'Z', 'T', 'C', 'S'];
const LEDGER_STATUSES = new Set(['PASS', 'FAIL', 'BLOCKED', 'OBSERVATION']);
const TOPOLOGY_STATUSES = new Set(['PASS', 'PASS_WITH_OBSERVATIONS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE']);

function fail(code) { throw new Error(code); }
function compareText(left, right) { return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0; }
function assertText(value, code) { if (typeof value !== 'string' || !value || value !== value.trim()) fail(code); }
function assertSha(value, pattern, code) { if (typeof value !== 'string' || !pattern.test(value)) fail(code); }
function sameJson(left, right) { return canonicalJson(left) === canonicalJson(right); }
function authorityIdentity(identity) {
  return { commit: identity.benchmarkCommit, path: identity.benchmarkPath, blobSha: identity.benchmarkBlobSha };
}
function normalizeBenchmarkIdentity(value, code = 'E_BENCHMARK_IDENTITY_INVALID') {
  assertText(value?.benchmarkId, `${code}_ID`);
  assertText(value?.repository, `${code}_REPOSITORY`);
  assertSha(value?.benchmarkCommit, SHA1, `${code}_COMMIT`);
  assertText(value?.benchmarkPath, `${code}_PATH`);
  assertSha(value?.benchmarkBlobSha, SHA1, `${code}_BLOB`);
  assertSha(value?.contentSha256, SHA256, `${code}_CONTENT_HASH`);
  if (!Number.isSafeInteger(value?.byteLength) || value.byteLength < 0) fail(`${code}_BYTE_LENGTH`);
  return {
    benchmarkId: value.benchmarkId, repository: value.repository,
    benchmarkCommit: value.benchmarkCommit, benchmarkPath: value.benchmarkPath,
    benchmarkBlobSha: value.benchmarkBlobSha, contentSha256: value.contentSha256,
    byteLength: value.byteLength,
  };
}
function coreIdentity(value, side) {
  assertSha(value?.contentSha256, SHA256, `${side}_LOADED_CONTENT_HASH_INVALID`);
  if (!Number.isSafeInteger(value?.byteLength) || value.byteLength < 0) fail(`${side}_LOADED_BYTE_LENGTH_INVALID`);
  return { contentSha256: value.contentSha256, byteLength: value.byteLength };
}
function expectedPopulation(branches, side) {
  let childRecords = 0, supportRecords = 0;
  branches.forEach((branch, index) => {
    if (!branch || typeof branch !== 'object' || Array.isArray(branch)
      || branch.type !== 'BRANCH' || !Array.isArray(branch.children)) fail(`${side}_BRANCH_POPULATION_INVALID`);
    childRecords += branch.children.length;
    supportRecords += branch.children.filter((child) => child?.type === 'SUPPORT').length;
    if (branch.children.some((child) => !child || typeof child !== 'object' || Array.isArray(child))) {
      fail(`${side}_CHILD_POPULATION_INVALID_${index}`);
    }
  });
  return { totalRecords: branches.length + childRecords, branchRecords: branches.length,
    childRecords, supportRecords, componentRecords: childRecords - supportRecords };
}
function validateLoaded(value, side, requireAuthority = false) {
  if (value?.schema !== 'FbxBenchmarkLoaded.v1') fail(`${side}_LOADED_SCHEMA_INVALID`);
  if (!Array.isArray(value.branches) || !Array.isArray(value.occurrences)
    || !value.occurrenceById || typeof value.occurrenceById !== 'object'
    || Array.isArray(value.occurrenceById)) fail(`${side}_OCCURRENCE_INDEX_REQUIRED`);
  const population = expectedPopulation(value.branches, side);
  if (value.occurrences.length !== population.totalRecords) fail(`${side}_OCCURRENCE_POPULATION_INVALID`);
  const ids = new Set();
  value.occurrences.forEach((occurrence, index) => {
    if (!occurrence || typeof occurrence !== 'object' || Array.isArray(occurrence)
      || !Number.isInteger(occurrence.branchIndex) || occurrence.branchIndex < 0
      || occurrence.branchIndex >= value.branches.length || !occurrence.record || typeof occurrence.record !== 'object') {
      fail(`${side}_OCCURRENCE_INVALID_${index}`);
    }
    const branchId = `branch:${occurrence.branchIndex}`;
    const expectedId = occurrence.childIndex === null ? branchId : `${branchId}/child:${occurrence.childIndex}`;
    if (occurrence.occurrenceId !== expectedId || occurrence.branchOccurrenceId !== branchId
      || ids.has(expectedId) || value.occurrenceById[expectedId] !== occurrence) {
      fail(`${side}_OCCURRENCE_OBJECT_IDENTITY_INVALID`);
    }
    ids.add(expectedId);
    if (occurrence.childIndex === null) {
      if (occurrence.recordRole !== 'BRANCH_RECORD' || occurrence.parentOccurrenceId !== null
        || occurrence.record.type !== 'BRANCH' || value.branches[occurrence.branchIndex] !== occurrence.record) {
        fail(`${side}_BRANCH_OCCURRENCE_INVALID`);
      }
    } else if (!Number.isInteger(occurrence.childIndex) || occurrence.childIndex < 0
      || occurrence.recordRole !== 'CHILD_RECORD' || occurrence.parentOccurrenceId !== branchId
      || value.branches[occurrence.branchIndex].children[occurrence.childIndex] !== occurrence.record) {
      fail(`${side}_CHILD_OCCURRENCE_INVALID`);
    }
  });
  if (Object.keys(value.occurrenceById).length !== ids.size) fail(`${side}_OCCURRENCE_INDEX_COVERAGE_INVALID`);
  return { core: coreIdentity(value.identity, side),
    authority: requireAuthority ? normalizeBenchmarkIdentity(value.identity, `${side}_BENCHMARK_IDENTITY_INVALID`) : null,
    population };
}
function validateInventory(inventory, reference) {
  if (inventory?.schema !== 'FbxBenchmarkInventory.v1') fail('E_INVENTORY_SCHEMA_INVALID');
  if (inventory.inventoryStatus !== 'PASS' || inventory.parseResult?.status !== 'PASS'
    || inventory.parseResult?.skippedRecordCount !== 0) fail('E_INVENTORY_NOT_PASSING');
  const identity = normalizeBenchmarkIdentity(inventory.benchmarkIdentity);
  const counts = inventory.counts;
  const expected = reference.population;
  if (!counts || counts.totalRecords !== expected.totalRecords || counts.branchRecords !== expected.branchRecords
    || counts.childRecords !== expected.childRecords || counts.supportOuterTypeRecords !== expected.supportRecords
    || counts.nonSupportChildRecords !== expected.componentRecords) fail('E_INVENTORY_COUNTS_INVALID');
  if (!sameJson(identity, reference.authority)) fail('E_REFERENCE_LOAD_IDENTITY_MISMATCH');
  return identity;
}
function occurrenceFor(loaded, id, side, role, expectedType) {
  assertText(id, `${side}_${role}_OCCURRENCE_ID_REQUIRED`);
  const occurrence = loaded.occurrenceById[id];
  if (!occurrence) fail(`${side}_${role}_OCCURRENCE_NOT_FOUND`);
  if (role !== 'BRANCH' && occurrence.childIndex === null) fail(`${side}_${role}_MUST_BE_CHILD_OCCURRENCE`);
  if (expectedType && occurrence.record.type !== expectedType) fail(`${side}_${role}_OCCURRENCE_TYPE_INVALID`);
  return occurrence;
}
function validateBranchBinding(loaded, occurrence, branchId, side) {
  if (branchId !== occurrence.branchOccurrenceId) fail(`${side}_BRANCH_ANCESTRY_MISMATCH`);
  const branch = occurrenceFor(loaded, branchId, side, 'BRANCH');
  if (branch.childIndex !== null || branch.recordRole !== 'BRANCH_RECORD') fail(`${side}_BRANCH_OCCURRENCE_INVALID`);
}
function validateComponentLedger(report, referenceLoaded, actualLoaded, populations) {
  if (report?.schema !== 'FbxComponentBenchmarkReport.v1' || !Array.isArray(report.ledger)
    || !Array.isArray(report.collisionGroups)) fail('C_REPORT_INVALID');
  const subjectIds = new Set(), occurrences = { REFERENCE: new Set(), ACTUAL: new Set() };
  for (const entry of report.ledger) {
    if (!['REFERENCE', 'ACTUAL'].includes(entry?.side) || !LEDGER_STATUSES.has(entry.recordStatus)) fail('C_LEDGER_STATUS_INVALID');
    assertText(entry.subjectId, 'C_SUBJECT_ID_INVALID');
    if (subjectIds.has(entry.subjectId)) fail('C_SUBJECT_ID_DUPLICATED');
    subjectIds.add(entry.subjectId);
    const loaded = entry.side === 'REFERENCE' ? referenceLoaded : actualLoaded;
    const sourceId = entry.subjectLocator?.sourceOccurrenceId;
    if (occurrences[entry.side].has(sourceId)) fail(`C_${entry.side}_OCCURRENCE_DUPLICATED`);
    const source = occurrenceFor(loaded, sourceId, entry.side, 'COMPONENT');
    if (source.record.type === 'SUPPORT') fail('C_LEDGER_CONTAINS_SUPPORT');
    validateBranchBinding(loaded, source, entry.subjectLocator?.branchOccurrenceId, entry.side);
    occurrences[entry.side].add(sourceId);
  }
  const expected = { REFERENCE: populations.reference.componentRecords, ACTUAL: populations.actual.componentRecords };
  const inventory = report.inventory, summary = report.summary;
  if (occurrences.REFERENCE.size !== expected.REFERENCE || occurrences.ACTUAL.size !== expected.ACTUAL
    || inventory?.referenceComponentCount !== expected.REFERENCE || inventory?.actualComponentCount !== expected.ACTUAL
    || summary?.referenceCoverageCount !== expected.REFERENCE || summary.actualCoverageCount !== expected.ACTUAL
    || !summary.referenceCoverageComplete || !summary.actualCoverageComplete) fail('C_COVERAGE_INCOMPLETE');
  const statuses = new Set(report.ledger.map((entry) => entry.recordStatus));
  const observations = report.ledger.some((entry) => entry.comparisons?.some((comparison) =>
    comparison.outcome === 'OBSERVATION' && comparison.diagnosticCodes?.length));
  const expectedStatus = statuses.has('BLOCKED') ? 'BLOCKED' : statuses.has('FAIL') ? 'FAIL'
    : observations || statuses.has('OBSERVATION') ? 'PASS_WITH_OBSERVATIONS' : 'PASS';
  if (summary.componentStatus !== expectedStatus) fail('C_SUMMARY_STATUS_INCONSISTENT');
  return { referenceLedgerCount: occurrences.REFERENCE.size, actualLedgerCount: occurrences.ACTUAL.size,
    collisionGroupCount: report.collisionGroups.length };
}
function validateSupportLedger(report, referenceLoaded, actualLoaded, populations) {
  if (report?.schema !== 'FbxSupportBenchmarkReport.v1' || !Array.isArray(report.ledgerEntries)) fail('S_REPORT_INVALID');
  const seen = { reference: new Set(), actual: new Set() };
  for (const entry of report.ledgerEntries) {
    if (!LEDGER_STATUSES.has(entry?.disposition)) fail('S_LEDGER_STATUS_INVALID');
    for (const [side, loaded] of [['reference', referenceLoaded], ['actual', actualLoaded]]) {
      const view = entry[side];
      if (!view) continue;
      if (seen[side].has(view.sourceOccurrenceId)) fail(`S_${side.toUpperCase()}_OCCURRENCE_DUPLICATED`);
      const source = occurrenceFor(loaded, view.sourceOccurrenceId, side.toUpperCase(), 'SUPPORT', 'SUPPORT');
      validateBranchBinding(loaded, source, view.branchOccurrenceId, side.toUpperCase());
      seen[side].add(view.sourceOccurrenceId);
    }
  }
  const expected = { reference: populations.reference.supportRecords, actual: populations.actual.supportRecords };
  const coverage = report.coverage;
  if (seen.reference.size !== expected.reference || seen.actual.size !== expected.actual
    || report.referenceInventory?.supportCount !== expected.reference || report.actualInventory?.supportCount !== expected.actual
    || coverage?.referenceLedgerCount !== expected.reference || coverage.actualLedgerCount !== expected.actual
    || !coverage.referencesCoveredExactlyOnce || !coverage.actualsCoveredExactlyOnce || !coverage.invariantsPassed
    || coverage.discardedReferenceCount !== 0 || coverage.discardedActualCount !== 0) fail('S_COVERAGE_INCOMPLETE');
  const dispositions = new Set(report.ledgerEntries.map((entry) => entry.disposition));
  const expectedStatus = report.ledgerEntries.length === 0 ? 'NOT_APPLICABLE'
    : dispositions.has('BLOCKED') ? 'BLOCKED' : dispositions.has('FAIL') ? 'FAIL'
      : dispositions.has('OBSERVATION') ? 'PASS_WITH_OBSERVATIONS' : 'PASS';
  if (report.summary?.status !== expectedStatus) fail('S_SUMMARY_STATUS_INCONSISTENT');
  return { referenceLedgerCount: seen.reference.size, actualLedgerCount: seen.actual.size };
}
function validateTopology(report, identity) {
  if (report?.schema !== 'FbxTopologyBenchmarkReport.v1'
    || (!sameJson(report.benchmarkIdentity, identity) && !sameJson(report.benchmarkIdentity, authorityIdentity(identity)))) {
    fail('T_BENCHMARK_IDENTITY_MISMATCH');
  }
  const coverage = report.coverage, groups = ['branches', 'relationships', 'junctions', 'boundaries'];
  const anomalyKeys = ['unresolvedReferences', 'ambiguousReferences', 'reciprocityMismatches', 'duplicateEdges',
    'selfConnections', 'orphanBranches', 'disconnectedIslands', 'unexpectedCycles',
    'boundaryDiscontinuities', 'relationshipKindConflicts'];
  if (!coverage || groups.some((key) => !Array.isArray(report[key]))
    || anomalyKeys.some((key) => !Array.isArray(report.anomalies?.[key]))) fail('T_LEDGER_OR_ANOMALY_GROUP_INVALID');
  for (const key of ['unrepresentedReferenceEntities', 'unrepresentedActualEntities',
    'unrepresentedReferenceRelationships', 'unrepresentedActualRelationships']) {
    if (!Array.isArray(coverage[key])) fail('T_COVERAGE_INVALID');
  }
  const statuses = groups.flatMap((key) => report[key].map((row) => row?.status));
  if (statuses.some((status) => !TOPOLOGY_STATUSES.has(status))) fail('T_LEDGER_STATUS_INVALID');
  if (coverage.relationshipLedgerCount !== report.relationships.length) fail('T_RELATIONSHIP_COVERAGE_INVALID');
  const blocker = report.anomalies.ambiguousReferences.some((row) => row?.blocking)
    || report.anomalies.unresolvedReferences.some((row) => row?.blocking) || statuses.includes('BLOCKED');
  const failed = coverage.unrepresentedReferenceEntities.length || coverage.unrepresentedActualEntities.length
    || ['reciprocityMismatches', 'selfConnections', 'disconnectedIslands', 'unexpectedCycles',
      'orphanBranches', 'boundaryDiscontinuities'].some((key) => report.anomalies[key].length)
    || statuses.includes('FAIL');
  const expectedStatus = blocker ? 'BLOCKED' : failed ? 'FAIL' : 'PASS';
  if (report.status !== expectedStatus || report.summary?.topologyStatus !== expectedStatus) fail('T_SUMMARY_STATUS_INCONSISTENT');
  return { referenceEntityCount: coverage.referenceEntityCount, actualEntityCount: coverage.actualEntityCount,
    referenceRelationshipCount: coverage.referenceRelationshipCount,
    actualRelationshipCount: coverage.actualRelationshipCount, relationshipLedgerCount: coverage.relationshipLedgerCount };
}
function validateZone(report, identity) {
  if (report?.schema !== 'FbxZoneBenchmarkReport.v1' || !sameJson(report.benchmark, authorityIdentity(identity))) {
    fail('Z_BENCHMARK_IDENTITY_MISMATCH');
  }
  const arrays = ['zones', 'referenceConflictBranchNames', 'referenceUnassignedBranchNames',
    'actualConflictBranchNames', 'actualUnassignedBranchNames'];
  if (arrays.some((key) => !Array.isArray(report[key]))) fail('Z_REPORT_COVERAGE_INVALID');
  if (report.zones.some((zone) => !['PASS', 'FAIL'].includes(zone?.status))) fail('Z_ZONE_STATUS_INVALID');
  const referenceBlockerCount = report.referenceConflictBranchNames.length + report.referenceUnassignedBranchNames.length;
  const actualIssueCount = report.actualConflictBranchNames.length + report.actualUnassignedBranchNames.length;
  const failedZoneCount = report.zones.filter((zone) => zone.status === 'FAIL').length;
  const expectedStatus = referenceBlockerCount ? 'BLOCKED_REFERENCE' : failedZoneCount || actualIssueCount ? 'FAIL' : 'PASS';
  if (report.status !== expectedStatus) fail('Z_SUMMARY_STATUS_INCONSISTENT');
  return { zoneCount: report.zones.length, failedZoneCount, referenceBlockerCount, actualIssueCount };
}
function disposition(status) {
  if (status === 'PASS' || status === 'PASS_WITH_OBSERVATIONS' || status === 'NOT_APPLICABLE') return status;
  if (status === 'BLOCKED' || status === 'BLOCKED_REFERENCE') return 'BLOCKED';
  if (status === 'FAIL') return 'FAIL';
  fail('PRODUCER_STATUS_INVALID');
}
function summaryStatus(producers) {
  if (producers.some((item) => item.disposition === 'BLOCKED')) return 'BLOCKED';
  if (producers.some((item) => item.disposition === 'FAIL')) return 'FAIL';
  if (producers.some((item) => item.disposition === 'PASS_WITH_OBSERVATIONS')) return 'PASS_WITH_OBSERVATIONS';
  return 'PASS';
}

export async function buildFbxQualificationReconciliation(input) {
  assertSha(input?.integrationBaselineSha, SHA1, 'Q_BASELINE_SHA_INVALID');
  assertSha(input?.sourceHeadSha, SHA1, 'Q_SOURCE_HEAD_SHA_INVALID');
  const reference = validateLoaded(input.referenceLoaded, 'REFERENCE', true);
  const actual = validateLoaded(input.actualLoaded, 'ACTUAL');
  const identity = validateInventory(input.benchmarkInventory, reference);
  const componentLoads = input.componentReport?.executionIdentity?.benchmarkLoads;
  if (componentLoads?.reference?.contentSha256 !== reference.core.contentSha256
    || componentLoads.reference.byteLength !== reference.core.byteLength) fail('C_REFERENCE_LOAD_IDENTITY_MISMATCH');
  if (componentLoads?.actual?.contentSha256 !== actual.core.contentSha256
    || componentLoads.actual.byteLength !== actual.core.byteLength) fail('C_ACTUAL_LOAD_IDENTITY_MISMATCH');
  if (!sameJson(input.componentReport?.benchmarkIdentity, authorityIdentity(identity))) fail('C_BENCHMARK_IDENTITY_MISMATCH');
  const populations = { reference: reference.population, actual: actual.population };
  const producers = [
    { agent: 'E', schema: input.benchmarkInventory.schema, nativeStatus: 'PASS', disposition: 'PASS',
      coverage: { totalRecords: reference.population.totalRecords, branchRecords: reference.population.branchRecords,
        childRecords: reference.population.childRecords } },
    { agent: 'Z', schema: input.zoneReport?.schema, nativeStatus: input.zoneReport?.status,
      disposition: disposition(input.zoneReport?.status), coverage: validateZone(input.zoneReport, identity) },
    { agent: 'T', schema: input.topologyReport?.schema, nativeStatus: input.topologyReport?.status,
      disposition: disposition(input.topologyReport?.status), coverage: validateTopology(input.topologyReport, identity) },
    { agent: 'C', schema: input.componentReport?.schema, nativeStatus: input.componentReport?.summary?.componentStatus,
      disposition: disposition(input.componentReport?.summary?.componentStatus),
      coverage: validateComponentLedger(input.componentReport, input.referenceLoaded, input.actualLoaded, populations) },
    { agent: 'S', schema: input.supportReport?.schema, nativeStatus: input.supportReport?.summary?.status,
      disposition: disposition(input.supportReport?.summary?.status),
      coverage: validateSupportLedger(input.supportReport, input.referenceLoaded, input.actualLoaded, populations) },
  ];
  if (producers.some((item, index) => item.agent !== PRODUCER_ORDER[index])) fail('Q_PRODUCER_ORDER_INVALID');
  const dispositions = ['PASS', 'PASS_WITH_OBSERVATIONS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE'];
  const payload = { schema: FBX_QUALIFICATION_RECONCILIATION_SCHEMA,
    integrationBaselineSha: input.integrationBaselineSha, sourceHeadSha: input.sourceHeadSha,
    benchmarkIdentity: identity, producers,
    summary: { status: summaryStatus(producers), producerCountsByDisposition: Object.fromEntries(
      dispositions.map((status) => [status, producers.filter((item) => item.disposition === status).length])) } };
  const digest = await sha256Hex(canonicalJson(payload));
  return deepFreeze({ ...payload, reconciliationId: `FBXQUAL-${digest.slice(0, 32)}` });
}

export async function validateFbxQualificationReconciliation(value, inputs) {
  if (value?.schema !== FBX_QUALIFICATION_RECONCILIATION_SCHEMA) fail('Q_RECONCILIATION_SCHEMA_INVALID');
  const rebuilt = await buildFbxQualificationReconciliation(inputs);
  if (rebuilt.reconciliationId !== value.reconciliationId) fail('Q_RECONCILIATION_ID_MISMATCH');
  if (canonicalJson(rebuilt) !== canonicalJson(value)) fail('Q_RECONCILIATION_NOT_CANONICAL');
  return value;
}
