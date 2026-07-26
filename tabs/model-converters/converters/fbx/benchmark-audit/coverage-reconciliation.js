import {
  deepFreeze, fail, requireArray, requireClosedObject, requireText, sortedUniqueText, stableCompare,
} from './audit-utils.js';
import {
  requireLedgerSchema, requirePopulationKind, requireTerminalState, terminalClassForState,
} from './ledger-vocabularies.js';

const INPUT_KEYS = [
  'schema', 'populationId', 'populationKind', 'ledgerSchema',
  'referencePopulation', 'actualPopulation', 'terminalRecords', 'diagnosticRecords',
];
const OCCURRENCE_KEYS = ['occurrenceId', 'identityKey'];
const TERMINAL_KEYS = [
  'recordId', 'state', 'referenceOccurrenceIds', 'actualOccurrenceIds',
  'originalReferenceCandidateIds', 'originalActualCandidateIds',
];
const DIAGNOSTIC_KEYS = ['diagnosticId', 'state', 'referenceOccurrenceIds', 'actualOccurrenceIds'];

function normalizedPopulation(values, label) {
  const seen = new Set();
  return requireArray(values, label).map((value, index) => {
    const item = requireClosedObject(value, `${label}[${index}]`, OCCURRENCE_KEYS);
    const occurrenceId = requireText(item.occurrenceId, `${label}[${index}].occurrenceId`);
    if (seen.has(occurrenceId)) fail('BLOCKED_AUDIT_IDENTITY', `${label} repeats ${occurrenceId}.`);
    seen.add(occurrenceId);
    return { occurrenceId, identityKey: requireText(item.identityKey, `${label}[${index}].identityKey`) };
  }).sort((left, right) => stableCompare(left.occurrenceId, right.occurrenceId));
}

function requireKnownIds(values, known, label) {
  const ids = sortedUniqueText(values, label);
  for (const id of ids) if (!known.has(id)) {
    fail('BLOCKED_AUDIT_IDENTITY', `${label} references unknown occurrence ${id}.`);
  }
  return ids;
}

function normalizeTerminalRecords(values, populationKind, referenceIds, actualIds) {
  const recordIds = new Set();
  return requireArray(values, 'terminalRecords').map((value, index) => {
    const label = `terminalRecords[${index}]`;
    const item = requireClosedObject(value, label, TERMINAL_KEYS);
    const recordId = requireText(item.recordId, `${label}.recordId`);
    if (recordIds.has(recordId)) fail('BLOCKED_AUDIT_IDENTITY', `terminalRecords repeats ${recordId}.`);
    recordIds.add(recordId);
    const referenceOccurrenceIds = requireKnownIds(item.referenceOccurrenceIds, referenceIds, `${label}.referenceOccurrenceIds`);
    const actualOccurrenceIds = requireKnownIds(item.actualOccurrenceIds, actualIds, `${label}.actualOccurrenceIds`);
    if (!referenceOccurrenceIds.length && !actualOccurrenceIds.length) {
      fail('BLOCKED_AUDIT_CONTRACT', `${label} must consume at least one occurrence.`);
    }
    return {
      recordId,
      state: requireTerminalState(populationKind, item.state, `${label}.state`),
      referenceOccurrenceIds,
      actualOccurrenceIds,
      originalReferenceCandidateIds: requireKnownIds(
        item.originalReferenceCandidateIds, referenceIds, `${label}.originalReferenceCandidateIds`,
      ),
      originalActualCandidateIds: requireKnownIds(
        item.originalActualCandidateIds, actualIds, `${label}.originalActualCandidateIds`,
      ),
    };
  }).sort((left, right) => stableCompare(left.recordId, right.recordId));
}

function normalizeDiagnosticRecords(values, populationKind, referenceIds, actualIds) {
  const diagnosticIds = new Set();
  return requireArray(values, 'diagnosticRecords').map((value, index) => {
    const label = `diagnosticRecords[${index}]`;
    const item = requireClosedObject(value, label, DIAGNOSTIC_KEYS);
    const diagnosticId = requireText(item.diagnosticId, `${label}.diagnosticId`);
    if (diagnosticIds.has(diagnosticId)) fail('BLOCKED_AUDIT_IDENTITY', `diagnosticRecords repeats ${diagnosticId}.`);
    diagnosticIds.add(diagnosticId);
    return {
      diagnosticId,
      state: requireTerminalState(populationKind, item.state, `${label}.state`),
      referenceOccurrenceIds: requireKnownIds(item.referenceOccurrenceIds, referenceIds, `${label}.referenceOccurrenceIds`),
      actualOccurrenceIds: requireKnownIds(item.actualOccurrenceIds, actualIds, `${label}.actualOccurrenceIds`),
    };
  }).sort((left, right) => stableCompare(left.diagnosticId, right.diagnosticId));
}

function occurrenceUses(population, terminalRecords, side) {
  const key = side === 'reference' ? 'referenceOccurrenceIds' : 'actualOccurrenceIds';
  const uses = new Map(population.map((item) => [item.occurrenceId, []]));
  for (const record of terminalRecords) {
    for (const occurrenceId of record[key]) uses.get(occurrenceId).push(record.recordId);
  }
  return uses;
}

function duplicateConsumption(side, uses) {
  return [...uses.entries()].filter(([, recordIds]) => recordIds.length > 1)
    .map(([occurrenceId, recordIds]) => ({ side, occurrenceId, recordIds: [...recordIds].sort(stableCompare) }))
    .sort((left, right) => stableCompare(left.occurrenceId, right.occurrenceId));
}

function unreconciled(side, uses) {
  return [...uses.entries()].filter(([, recordIds]) => recordIds.length === 0)
    .map(([occurrenceId]) => ({ side, occurrenceId }))
    .sort((left, right) => stableCompare(left.occurrenceId, right.occurrenceId));
}

function candidateEscape(record, side) {
  const selectedKey = side === 'reference' ? 'referenceOccurrenceIds' : 'actualOccurrenceIds';
  const candidatesKey = side === 'reference' ? 'originalReferenceCandidateIds' : 'originalActualCandidateIds';
  const candidates = new Set(record[candidatesKey]);
  if (!candidates.size) return [];
  return record[selectedKey].filter((occurrenceId) => !candidates.has(occurrenceId)).map((occurrenceId) => ({
    recordId: record.recordId, side, occurrenceId, originalCandidateIds: [...record[candidatesKey]],
  }));
}

function stateCounts(populationKind, records) {
  const counts = {};
  const classCounts = { PASS: 0, OBSERVATION: 0, FAIL: 0, BLOCKED: 0 };
  for (const record of records) {
    counts[record.state] = (counts[record.state] || 0) + 1;
    classCounts[terminalClassForState(populationKind, record.state)] += 1;
  }
  return {
    counts: Object.fromEntries(Object.entries(counts).sort(([left], [right]) => stableCompare(left, right))),
    classCounts,
  };
}

function equation(name, left, right) {
  return { name, left, right, pass: left === right };
}

function coveredExactlyOnce(uses) {
  return [...uses.values()].filter((recordIds) => recordIds.length === 1).length;
}

function summaryStatus(populationKind, referenceTotal, actualTotal, classCounts, auditFailures) {
  if (populationKind === 'SUPPORT' && referenceTotal === 0 && actualTotal === 0) return 'NOT_APPLICABLE';
  if (classCounts.BLOCKED) return 'BLOCKED';
  if (auditFailures || classCounts.FAIL) return 'FAIL';
  if (classCounts.OBSERVATION) return 'PASS_WITH_OBSERVATIONS';
  return 'PASS';
}

export function reconcileCoverage(input) {
  const value = requireClosedObject(input, 'coverage input', INPUT_KEYS);
  if (value.schema !== 'FbxCoverageReconciliationInput.v1') {
    fail('BLOCKED_AUDIT_CONTRACT', 'schema must be FbxCoverageReconciliationInput.v1.');
  }
  const populationKind = requirePopulationKind(value.populationKind);
  const ledgerSchema = requireLedgerSchema(populationKind, value.ledgerSchema);
  const referencePopulation = normalizedPopulation(value.referencePopulation, 'referencePopulation');
  const actualPopulation = normalizedPopulation(value.actualPopulation, 'actualPopulation');
  const referenceIds = new Set(referencePopulation.map((item) => item.occurrenceId));
  const actualIds = new Set(actualPopulation.map((item) => item.occurrenceId));
  const terminalRecords = normalizeTerminalRecords(value.terminalRecords, populationKind, referenceIds, actualIds);
  const diagnosticRecords = normalizeDiagnosticRecords(value.diagnosticRecords, populationKind, referenceIds, actualIds);
  const referenceUses = occurrenceUses(referencePopulation, terminalRecords, 'reference');
  const actualUses = occurrenceUses(actualPopulation, terminalRecords, 'actual');
  const duplicateConsumptionAttempts = [
    ...duplicateConsumption('reference', referenceUses), ...duplicateConsumption('actual', actualUses),
  ];
  const unreconciledRecords = [...unreconciled('reference', referenceUses), ...unreconciled('actual', actualUses)];
  const collisionEscapeAttempts = terminalRecords.flatMap((record) => [
    ...candidateEscape(record, 'reference'), ...candidateEscape(record, 'actual'),
  ]).sort((left, right) => stableCompare(`${left.recordId}:${left.side}:${left.occurrenceId}`,
    `${right.recordId}:${right.side}:${right.occurrenceId}`));
  const reconciliationEquations = [
    equation('reference population coverage', coveredExactlyOnce(referenceUses), referencePopulation.length),
    equation('actual population coverage', coveredExactlyOnce(actualUses), actualPopulation.length),
    equation('diagnostic reference consumption', 0, 0),
    equation('diagnostic actual consumption', 0, 0),
  ];
  const { counts: terminalStateCounts, classCounts: terminalClassCounts } = stateCounts(populationKind, terminalRecords);
  const { counts: diagnosticStateCounts } = stateCounts(populationKind, diagnosticRecords);
  const auditFailures = duplicateConsumptionAttempts.length + unreconciledRecords.length
    + collisionEscapeAttempts.length + reconciliationEquations.filter((item) => !item.pass).length;
  return deepFreeze({
    schema: 'FbxCoverageReconciliation.v2',
    populationId: requireText(value.populationId, 'populationId'),
    populationKind,
    ledgerSchema,
    referencePopulationCount: referencePopulation.length,
    actualPopulationCount: actualPopulation.length,
    terminalRecordCount: terminalRecords.length,
    diagnosticRecordCount: diagnosticRecords.length,
    terminalStateCounts,
    terminalClassCounts,
    diagnosticStateCounts,
    duplicateConsumptionAttempts,
    unreconciledRecords,
    collisionEscapeAttempts,
    reconciliationEquations,
    status: summaryStatus(populationKind, referencePopulation.length, actualPopulation.length,
      terminalClassCounts, auditFailures),
  });
}
