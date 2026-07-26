import { deepFreeze, fail, requireArray, requireObject, requireText, stableCompare } from './audit-utils.js';

const occurrence = (occurrenceId, identityKey = occurrenceId) => ({ occurrenceId, identityKey });
const terminal = (recordId, state, refs, actuals, refCandidates = refs, actualCandidates = actuals) => ({
  recordId, state, referenceOccurrenceIds: refs, actualOccurrenceIds: actuals,
  originalReferenceCandidateIds: refCandidates, originalActualCandidateIds: actualCandidates,
});
function requireSchema(value, schema, label) {
  const object = requireObject(value, label);
  if (object.schema !== schema) fail('BLOCKED_AUDIT_CONTRACT', `${label}.schema must be ${schema}.`);
  return object;
}
function sorted(values) { return [...values].sort(stableCompare); }
function byKey(values, key, label) {
  const result = new Map();
  for (const item of requireArray(values, label)) {
    const id = requireText(item[key], `${label}.${key}`);
    if (result.has(id)) fail('BLOCKED_AUDIT_IDENTITY', `${label} repeats ${id}.`);
    result.set(id, item);
  }
  return result;
}
function reconciliationInput(populationId, populationKind, ledgerSchema, refs, actuals, terminals, diagnostics = []) {
  return deepFreeze({ schema: 'FbxCoverageReconciliationInput.v1', populationId, populationKind, ledgerSchema,
    referencePopulation: refs, actualPopulation: actuals, terminalRecords: terminals, diagnosticRecords: diagnostics });
}

export function adaptZoneMembershipIndex({ reference, actual }) {
  const left = requireSchema(reference, 'FbxZoneMembershipIndex.v1', 'referenceZoneIndex');
  const right = requireSchema(actual, 'FbxZoneMembershipIndex.v1', 'actualZoneIndex');
  const refs = byKey(left.records, 'branchName', 'referenceZoneIndex.records');
  const actuals = byKey(right.records, 'branchName', 'actualZoneIndex.records');
  const names = sorted(new Set([...refs.keys(), ...actuals.keys()]));
  const records = names.map((name) => zoneRecord(name, refs.get(name), actuals.get(name)));
  return reconciliationInput('zone-branch', 'ZONE_BRANCH', 'FbxZoneMembershipIndex.v1',
    sorted(refs.keys()).map((id) => occurrence(`reference:${id}`, id)),
    sorted(actuals.keys()).map((id) => occurrence(`actual:${id}`, id)), records);
}
function zoneRecord(name, reference, actual) {
  const refs = reference ? [`reference:${name}`] : [];
  const actuals = actual ? [`actual:${name}`] : [];
  const state = reference && actual && reference.status === actual.status ? reference.status : 'CONFLICT';
  return terminal(`zone:${name}`, state, refs, actuals);
}

export function adaptComponentBenchmarkReport(report) {
  const value = requireSchema(report, 'FbxComponentBenchmarkReport.v1', 'componentReport');
  const ledger = requireArray(value.ledger, 'componentReport.ledger');
  const references = ledger.filter((row) => row.side === 'REFERENCE');
  const actuals = ledger.filter((row) => row.side === 'ACTUAL');
  const actualBySubject = new Map(actuals.map((row) => [row.subjectId, row]));
  const terminals = references.map((row) => componentReferenceTerminal(row, actualBySubject));
  const consumedActual = new Set(terminals.flatMap((row) => row.actualOccurrenceIds));
  for (const row of actuals) if (!consumedActual.has(row.subjectLocator.sourceOccurrenceId)) {
    terminals.push(terminal(row.ledgerRecordId, row.match.state, [], [row.subjectLocator.sourceOccurrenceId], [], [row.subjectLocator.sourceOccurrenceId]));
  }
  return reconciliationInput('component', 'COMPONENT', 'FbxComponentBenchmarkReport.v1',
    references.map(componentOccurrence), actuals.map(componentOccurrence), terminals, componentDiagnostics(value));
}
function componentOccurrence(row) {
  return occurrence(row.subjectLocator.sourceOccurrenceId, row.subjectId);
}
function componentReferenceTerminal(row, actualBySubject) {
  const counterpartIds = row.match.passingCounterpartSubjectId
    ? [row.match.passingCounterpartSubjectId] : requireArray(row.match.counterpartSubjectIds, 'counterpartSubjectIds');
  const actualOccurrences = counterpartIds.map((id) => actualBySubject.get(id)?.subjectLocator?.sourceOccurrenceId).filter(Boolean);
  const allCandidates = row.identityEvidence.candidateKeys.flatMap((key) => key.candidateSubjectIds)
    .map((id) => actualBySubject.get(id)?.subjectLocator?.sourceOccurrenceId).filter(Boolean);
  return terminal(row.ledgerRecordId, row.match.state, [row.subjectLocator.sourceOccurrenceId], actualOccurrences,
    [row.subjectLocator.sourceOccurrenceId], sorted(new Set(allCandidates.length ? allCandidates : actualOccurrences)));
}
function componentDiagnostics(report) {
  return report.collisionGroups.map((group) => ({ diagnosticId: group.collisionGroupId, state: 'DIAGNOSTIC_COLLISION',
    referenceOccurrenceIds: group.referenceSubjectIds.map((id) => subjectOccurrence(report.ledger, 'REFERENCE', id)),
    actualOccurrenceIds: group.actualSubjectIds.map((id) => subjectOccurrence(report.ledger, 'ACTUAL', id)) }));
}
function subjectOccurrence(ledger, side, subjectId) {
  const row = ledger.find((item) => item.side === side && item.subjectId === subjectId);
  if (!row) fail('BLOCKED_AUDIT_IDENTITY', `component report references unknown ${side} subject ${subjectId}.`);
  return row.subjectLocator.sourceOccurrenceId;
}

export function adaptSupportBenchmarkReport(report) {
  const value = requireSchema(report, 'FbxSupportBenchmarkReport.v1', 'supportReport');
  const rows = requireArray(value.ledgerEntries, 'supportReport.ledgerEntries');
  const refs = uniqueRecordOccurrences(rows, 'reference');
  const actuals = uniqueRecordOccurrences(rows, 'actual');
  const terminals = rows.map((row) => supportTerminal(row));
  if (value.coverage.invariantsPassed !== true) fail('BLOCKED_AUDIT_COVERAGE', 'support report coverage invariants did not pass.');
  if (!refs.length && !actuals.length && value.summary.status !== 'NOT_APPLICABLE') {
    fail('BLOCKED_AUDIT_COVERAGE', 'zero-support report must be NOT_APPLICABLE.');
  }
  return reconciliationInput('support', 'SUPPORT', 'FbxSupportBenchmarkReport.v1', refs, actuals, terminals);
}
function uniqueRecordOccurrences(rows, side) {
  const found = new Map();
  for (const row of rows) if (row[side]) {
    const record = row[side];
    requireText(record.sourceOccurrenceId, `${side}.sourceOccurrenceId`);
    requireText(record.branchOccurrenceId, `${side}.branchOccurrenceId`);
    found.set(record.sourceOccurrenceId, occurrence(record.sourceOccurrenceId, record.recordId || record.sourceOccurrenceId));
  }
  return sorted(found.keys()).map((id) => found.get(id));
}
function supportTerminal(row) {
  const refs = row.reference ? [row.reference.sourceOccurrenceId] : [];
  const actuals = row.actual ? [row.actual.sourceOccurrenceId] : [];
  return terminal(row.ledgerKey, row.matchState, refs, actuals);
}

export function adaptTopologyBenchmarkReport(report, populationKind) {
  const value = requireSchema(report, 'FbxTopologyBenchmarkReport.v1', 'topologyReport');
  const rows = topologyRows(value, populationKind);
  const refs = uniqueTopologyOccurrences(rows, 'referenceId');
  const actuals = uniqueTopologyOccurrences(rows, 'actualId');
  const terminals = rows.map((row) => terminal(row.recordId, row.state,
    row.referenceId ? [row.referenceId] : [], row.actualId ? [row.actualId] : []));
  return reconciliationInput(`topology:${populationKind}`, populationKind, 'FbxTopologyBenchmarkReport.v1', refs, actuals, terminals);
}
function topologyRows(report, kind) {
  if (kind === 'TOPOLOGY_BRANCH') return report.branches.map((row) => ({ recordId: row.branchId, state: row.matchState, referenceId: row.referenceBranchId, actualId: row.actualBranchId }));
  if (kind === 'TOPOLOGY_RELATIONSHIP') return report.relationships.map((row) => ({ recordId: row.ledgerId, state: row.matchState, referenceId: row.reference?.relationshipId || null, actualId: row.actual?.relationshipId || null }));
  if (kind === 'TOPOLOGY_JUNCTION') return report.junctions.map((row) => ({ recordId: row.ledgerId, state: row.matchState, referenceId: row.referenceComponentId, actualId: row.actualComponentId }));
  if (kind === 'TOPOLOGY_BOUNDARY') return report.boundaries.map((row) => ({ recordId: row.ledgerId, state: boundaryState(row.status), referenceId: row.referencePair?.relationshipId || null, actualId: row.actualPair?.relationshipId || null }));
  fail('BLOCKED_AUDIT_VOCABULARY', `unsupported topology population ${kind}.`);
}
function boundaryState(status) {
  if (status === 'PASS') return 'EXACT_MATCH';
  if (status === 'BLOCKED') return 'BLOCKED_IDENTITY';
  return 'ZONE_BOUNDARY_MISMATCH';
}
function uniqueTopologyOccurrences(rows, field) {
  const ids = new Set(rows.map((row) => row[field]).filter(Boolean));
  return sorted(ids).map((id) => occurrence(id));
}

export function auditLoadedBenchmarkOccurrenceContract(loaded) {
  const value = requireSchema(loaded, 'FbxBenchmarkLoaded.v1', 'loadedBenchmark');
  const occurrences = requireArray(value.occurrences, 'loadedBenchmark.occurrences');
  const byIdKeys = Object.keys(requireObject(value.occurrenceById, 'loadedBenchmark.occurrenceById')).sort(stableCompare);
  const occurrenceIds = occurrences.map((row) => requireText(row.occurrenceId, 'occurrenceId')).sort(stableCompare);
  if (occurrenceIds.join('\0') !== byIdKeys.join('\0')) fail('BLOCKED_AUDIT_COVERAGE', 'occurrenceById does not exactly cover occurrences.');
  for (const row of occurrences) validateOccurrence(row, value.branches);
  return deepFreeze({ schema: 'FbxLoadedBenchmarkOccurrenceAudit.v1', occurrenceCount: occurrences.length, status: 'PASS' });
}
function validateOccurrence(row, branches) {
  const expectedBranch = `branch:${row.branchIndex}`;
  const expected = row.childIndex === null ? expectedBranch : `${expectedBranch}/child:${row.childIndex}`;
  if (row.occurrenceId !== expected || row.branchOccurrenceId !== expectedBranch) fail('BLOCKED_AUDIT_IDENTITY', 'non-canonical occurrence identity.');
  if (row.parentOccurrenceId !== (row.childIndex === null ? null : expectedBranch)) fail('BLOCKED_AUDIT_IDENTITY', 'invalid occurrence ancestry.');
  const record = row.childIndex === null ? branches[row.branchIndex] : branches[row.branchIndex]?.children?.[row.childIndex];
  if (row.record !== record) fail('BLOCKED_AUDIT_IDENTITY', 'occurrence record does not preserve loaded object identity.');
}
