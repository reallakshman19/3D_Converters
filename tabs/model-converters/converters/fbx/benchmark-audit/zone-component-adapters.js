import { fail, requireArray, requireText } from './audit-utils.js';
import { occurrence, reconciliationInput, requireSchema, sorted, terminal } from './adapter-common.js';

export function adaptZoneMembershipIndex(index) {
  const value = requireSchema(index, 'FbxZoneMembershipIndex.v1', 'zoneIndex');
  const names = new Set();
  const terminals = requireArray(value.records, 'zoneIndex.records').map((row) => {
    const name = requireText(row.branchName, 'zoneIndex.records.branchName');
    if (names.has(name)) fail('BLOCKED_AUDIT_IDENTITY', `zone index repeats ${name}.`);
    names.add(name);
    return terminal(`zone:${name}`, requireText(row.status, 'zoneIndex.records.status'),
      [`zone:${name}`], [], [`zone:${name}`], []);
  });
  const refs = sorted(names).map((name) => occurrence(`zone:${name}`, name));
  return reconciliationInput('zone-branch', 'ZONE_BRANCH', 'FbxZoneMembershipIndex.v1', refs, [], terminals);
}

export function adaptComponentBenchmarkReport(report) {
  const value = requireSchema(report, 'FbxComponentBenchmarkReport.v1', 'componentReport');
  const ledger = requireArray(value.ledger, 'componentReport.ledger');
  const refs = ledger.filter((row) => row.side === 'REFERENCE');
  const actuals = ledger.filter((row) => row.side === 'ACTUAL');
  const actualBySubject = new Map(actuals.map((row) => [row.subjectId, row]));
  const terminals = refs.map((row) => referenceTerminal(row, actualBySubject));
  const consumed = new Set(terminals.flatMap((row) => row.actualOccurrenceIds));
  for (const row of actuals) if (!consumed.has(row.subjectLocator.sourceOccurrenceId)) terminals.push(actualTerminal(row));
  return reconciliationInput('component', 'COMPONENT', 'FbxComponentBenchmarkReport.v1',
    refs.map(componentOccurrence), actuals.map(componentOccurrence), terminals, collisionDiagnostics(value));
}
function componentOccurrence(row) {
  return occurrence(row.subjectLocator.sourceOccurrenceId, row.subjectId);
}
function referenceTerminal(row, actualBySubject) {
  const subjectIds = row.match.passingCounterpartSubjectId
    ? [row.match.passingCounterpartSubjectId] : requireArray(row.match.counterpartSubjectIds, 'counterpartSubjectIds');
  const selected = subjectIds.map((id) => actualBySubject.get(id)?.subjectLocator?.sourceOccurrenceId).filter(Boolean);
  const candidates = row.identityEvidence.candidateKeys.flatMap((key) => key.candidateSubjectIds)
    .map((id) => actualBySubject.get(id)?.subjectLocator?.sourceOccurrenceId).filter(Boolean);
  return terminal(row.ledgerRecordId, row.match.state, [row.subjectLocator.sourceOccurrenceId], selected,
    [row.subjectLocator.sourceOccurrenceId], sorted(new Set(candidates.length ? candidates : selected)));
}
function actualTerminal(row) {
  const id = row.subjectLocator.sourceOccurrenceId;
  return terminal(row.ledgerRecordId, row.match.state, [], [id], [], [id]);
}
function collisionDiagnostics(report) {
  return report.collisionGroups.map((group) => ({ diagnosticId: group.collisionGroupId,
    state: 'DIAGNOSTIC_COLLISION',
    referenceOccurrenceIds: group.referenceSubjectIds.map((id) => subjectOccurrence(report.ledger, 'REFERENCE', id)),
    actualOccurrenceIds: group.actualSubjectIds.map((id) => subjectOccurrence(report.ledger, 'ACTUAL', id)) }));
}
function subjectOccurrence(ledger, side, subjectId) {
  const row = ledger.find((item) => item.side === side && item.subjectId === subjectId);
  if (!row) fail('BLOCKED_AUDIT_IDENTITY', `component report references unknown ${side} subject ${subjectId}.`);
  return row.subjectLocator.sourceOccurrenceId;
}
