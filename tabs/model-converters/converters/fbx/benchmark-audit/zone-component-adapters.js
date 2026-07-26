import { fail, requireArray, requireText } from './audit-utils.js';
import { occurrence, reconciliationInput, requireSchema, sorted, terminal } from './adapter-common.js';

export function adaptZoneMembershipIndex(index) {
  const value = requireSchema(index, 'FbxZoneMembershipIndex.v1', 'zoneIndex');
  const names = new Set();
  const terminals = requireArray(value.records, 'zoneIndex.records').map((row, indexValue) => {
    const name = requireText(row.branchName, `zoneIndex.records[${indexValue}].branchName`);
    if (names.has(name)) fail('BLOCKED_AUDIT_IDENTITY', `zone index repeats ${name}.`);
    names.add(name);
    return terminal(`zone:${name}`, requireText(row.status, `zoneIndex.records[${indexValue}].status`),
      [`zone:${name}`], [], [`zone:${name}`], []);
  });
  const refs = sorted(names).map((name) => occurrence(`zone:${name}`, name));
  return reconciliationInput('zone-branch', 'ZONE_BRANCH', value.schema, refs, [], terminals);
}

function componentRows(report) {
  const ledger = requireArray(report.ledger, 'componentReport.ledger');
  const references = ledger.filter((row) => row.side === 'REFERENCE');
  const actuals = ledger.filter((row) => row.side === 'ACTUAL');
  return { ledger, references, actuals,
    referenceBySubject:new Map(references.map((row) => [row.subjectId, row])),
    actualBySubject:new Map(actuals.map((row) => [row.subjectId, row])) };
}

function componentOccurrence(row) {
  return occurrence(requireText(row?.subjectLocator?.sourceOccurrenceId, 'subjectLocator.sourceOccurrenceId'),
    requireText(row.subjectId, 'subjectId'));
}

function groupOccurrences(group, rows) {
  const references = group.referenceSubjectIds.map((id) => rows.referenceBySubject.get(id))
    .filter(Boolean).map((row) => row.subjectLocator.sourceOccurrenceId);
  const actuals = group.actualSubjectIds.map((id) => rows.actualBySubject.get(id))
    .filter(Boolean).map((row) => row.subjectLocator.sourceOccurrenceId);
  return { references:sorted(new Set(references)), actuals:sorted(new Set(actuals)) };
}

function unresolvedCollisions(report, rows) {
  const terminals = [], consumedSubjects = new Set();
  for (const group of requireArray(report.collisionGroups, 'componentReport.collisionGroups')) {
    if (group.resolution !== 'UNRESOLVED') continue;
    const ids = groupOccurrences(group, rows);
    const memberRows = [...group.referenceSubjectIds.map((id) => rows.referenceBySubject.get(id)),
      ...group.actualSubjectIds.map((id) => rows.actualBySubject.get(id))].filter(Boolean);
    const state = memberRows.some((row) => row.match?.state === 'BLOCKED_IDENTITY')
      ? 'BLOCKED_IDENTITY' : 'AMBIGUOUS_MATCH';
    terminals.push(terminal(`component-collision:${group.collisionGroupId}`, state,
      ids.references, ids.actuals, ids.references, ids.actuals));
    for (const id of [...group.referenceSubjectIds, ...group.actualSubjectIds]) consumedSubjects.add(id);
  }
  return { terminals, consumedSubjects };
}

function referenceTerminal(row, actualBySubject) {
  const state = requireText(row?.match?.state, 'component match.state');
  const subjectIds = row.match.passingCounterpartSubjectId
    ? [row.match.passingCounterpartSubjectId] : requireArray(row.match.counterpartSubjectIds, 'counterpartSubjectIds');
  const selected = subjectIds.map((id) => actualBySubject.get(id)?.subjectLocator?.sourceOccurrenceId).filter(Boolean);
  const candidates = requireArray(row?.identityEvidence?.candidateKeys, 'identityEvidence.candidateKeys')
    .flatMap((key) => key.candidateSubjectIds || [])
    .map((id) => actualBySubject.get(id)?.subjectLocator?.sourceOccurrenceId).filter(Boolean);
  return terminal(row.ledgerRecordId, state, [row.subjectLocator.sourceOccurrenceId], selected,
    [row.subjectLocator.sourceOccurrenceId], sorted(new Set(candidates.length ? candidates : selected)));
}

function componentDiagnostics(report, rows) {
  return report.collisionGroups.map((group) => {
    const ids = groupOccurrences(group, rows);
    return { diagnosticId:group.collisionGroupId, state:'DIAGNOSTIC_COLLISION',
      referenceOccurrenceIds:ids.references, actualOccurrenceIds:ids.actuals };
  });
}

export function adaptComponentBenchmarkReport(report) {
  const value = requireSchema(report, 'FbxComponentBenchmarkReport.v1', 'componentReport');
  const rows = componentRows(value), collisions = unresolvedCollisions(value, rows);
  const terminals = [...collisions.terminals];
  for (const row of rows.references) if (!collisions.consumedSubjects.has(row.subjectId)) {
    terminals.push(referenceTerminal(row, rows.actualBySubject));
  }
  const consumedActual = new Set(terminals.flatMap((row) => row.actualOccurrenceIds));
  for (const row of rows.actuals) if (!consumedActual.has(row.subjectLocator.sourceOccurrenceId)) {
    const id = row.subjectLocator.sourceOccurrenceId;
    terminals.push(terminal(row.ledgerRecordId, row.match.state === 'UNEXPECTED_ACTUAL'
      ? 'UNEXPECTED_ACTUAL' : 'BLOCKED_IDENTITY', [], [id], [], [id]));
  }
  return reconciliationInput('component', 'COMPONENT', value.schema,
    rows.references.map(componentOccurrence), rows.actuals.map(componentOccurrence),
    terminals, componentDiagnostics(value, rows));
}
