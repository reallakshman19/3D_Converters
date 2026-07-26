import { deepFreeze, fail, requireObject, stableCompare } from './audit-utils.js';

export const occurrence = (occurrenceId, identityKey = occurrenceId) => ({ occurrenceId, identityKey });
export const terminal = (recordId, state, refs, actuals, refCandidates = refs, actualCandidates = actuals) => ({
  recordId, state, referenceOccurrenceIds: refs, actualOccurrenceIds: actuals,
  originalReferenceCandidateIds: refCandidates, originalActualCandidateIds: actualCandidates,
});
export function requireSchema(value, schema, label) {
  const object = requireObject(value, label);
  if (object.schema !== schema) fail('BLOCKED_AUDIT_CONTRACT', `${label}.schema must be ${schema}.`);
  return object;
}
export function sorted(values) { return [...values].sort(stableCompare); }
export function reconciliationInput(populationId, populationKind, ledgerSchema, refs, actuals, terminals, diagnostics = []) {
  return deepFreeze({ schema: 'FbxCoverageReconciliationInput.v2', populationId, populationKind, ledgerSchema,
    referencePopulation: refs, actualPopulation: actuals, terminalRecords: terminals, diagnosticRecords: diagnostics });
}
