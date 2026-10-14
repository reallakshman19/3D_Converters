/** XML229 R1-A: advisory Build completion is not CII engineering acceptance.
 *
 * A complete current GC-PW InputBasis hash is supplied independently by the
 * caller. Never manufacture this hash from a cached receipt or file metadata.
 * The producer must finish all original selected occurrences before emitting
 * COMPLETED. The receipt is not a Match-1/Final decision.
 */
export const RUN_STAGE_COMPLETION_SCHEMA = 'XML229.RunCompletionReceipt.v1';

const SHA256 = /^[a-f0-9]{64}$/;
const stages = Object.freeze(new Set(['PREVIEW', 'WEIGHT_MATCH']));
const int = value => Number.isSafeInteger(value) && value >= 0;
const digest = value => typeof value === 'string' && SHA256.test(value);
const plain = value => value && typeof value === 'object' && !Array.isArray(value);

function result(status, reason, stage) {
  return Object.freeze({
    stage, status, reason,
    built: status === 'BUILT' || status === 'BUILT_PROPOSED',
    // This adapter cannot grant a weight or native CII release decision.
    engineeringAccepted: false,
  });
}

/** Receipt shape:
 * {schema, stage, state:'COMPLETED', authority:'READ_ONLY',
 *  basisId, sourceSha256, selectionSha256, processedCount, expectedCount}
 *
 * currentBasis is an independently regenerated full source/master/config/
 * selection GC-PW InputBasis, not the result's self-declared fingerprint.
 * Caller must check the actual source/job generation before publishing it.
 */
export function assessXmlCiiRunStageCompletion({stage, receipt, currentBasis} = {}) {
  if (!stages.has(stage)) return result('UNVERIFIED', 'UNKNOWN_STAGE', stage);
  if (receipt == null) return result('NOT_BUILT', 'NO_CURRENT_RECEIPT', stage);
  if (!plain(receipt) || receipt.schema !== RUN_STAGE_COMPLETION_SCHEMA ||
      receipt.stage !== stage || receipt.authority !== 'READ_ONLY') {
    return result('UNVERIFIED', 'INVALID_RECEIPT_AUTHORITY_OR_SCHEMA', stage);
  }
  if (!plain(currentBasis) || !digest(currentBasis.basisId) ||
      !digest(currentBasis.sourceSha256) ||
      !digest(currentBasis.selectionSha256)) {
    return result('UNVERIFIED', 'CURRENT_FULL_BASIS_REQUIRED', stage);
  }
  if (!digest(receipt.basisId) || !digest(receipt.sourceSha256) ||
      !digest(receipt.selectionSha256)) {
    return result('UNVERIFIED', 'INVALID_RECEIPT_BASIS', stage);
  }
  if (receipt.basisId !== currentBasis.basisId ||
      receipt.sourceSha256 !== currentBasis.sourceSha256 ||
      receipt.selectionSha256 !== currentBasis.selectionSha256) {
    return result('STALE', 'SOURCE_MASTER_CONFIG_OR_SELECTION_CHANGED', stage);
  }
  if (receipt.state !== 'COMPLETED') {
    return result('INCOMPLETE', 'JOB_NOT_COMPLETED', stage);
  }
  if (!int(receipt.processedCount) || !int(receipt.expectedCount) ||
      !int(currentBasis.expectedCount) ||
      receipt.expectedCount !== currentBasis.expectedCount ||
      receipt.processedCount !== receipt.expectedCount) {
    return result('INCOMPLETE', 'ORIGINAL_POPULATION_NOT_COMPLETE', stage);
  }
  if (receipt.expectedCount <= 0) {
    return result('INCOMPLETE', 'EMPTY_ORIGINAL_POPULATION_NOT_ATTESTED', stage);
  }
  if (receipt.sourceRightsBasis === 'SOURCE_FACTS_ONLY' ||
      receipt.sourcePhase === 'INDEX_COMMITTED') {
    return result('UNVERIFIED', 'SOURCE_INDEX_IS_NOT_ENGINEERING_BUILD', stage);
  }
  return result(stage === 'WEIGHT_MATCH' ? 'BUILT_PROPOSED' : 'BUILT',
    'CURRENT_BASIS_ADVISORY_BUILD_ONLY', stage);
}

export function xmlCiiRunStageReceiptMessage(audit) {
  if (audit.built) {
    return audit.stage === 'PREVIEW'
      ? 'Preview completed for verified current source/master/scope basis; this does not authorize CII.'
      : 'Weight Match proposals built for verified current basis; candidate masses are not accepted Match-1 or Final weights.';
  }
  const reasons = {
    NO_CURRENT_RECEIPT: 'No current source-bound completion receipt has been published.',
    UNKNOWN_STAGE: 'Unknown Run stage.',
    INVALID_RECEIPT_AUTHORITY_OR_SCHEMA: 'Completion receipt missing or wrong schema/authority.',
    CURRENT_FULL_BASIS_REQUIRED: 'Independent current full source/master/scope basis has not been verified.',
    INVALID_RECEIPT_BASIS: 'Malformed source or job basis digest.',
    SOURCE_MASTER_CONFIG_OR_SELECTION_CHANGED: 'Stage result is stale: source, master, configuration or selection changed.',
    JOB_NOT_COMPLETED: 'Stage execution has not completed.',
    ORIGINAL_POPULATION_NOT_COMPLETE: 'Incomplete original selected-component population; cannot use partial pages.',
    EMPTY_ORIGINAL_POPULATION_NOT_ATTESTED: 'Empty population was not independently attested.',
    SOURCE_INDEX_IS_NOT_ENGINEERING_BUILD: 'Source index is committed, but independent Preview/Weight calculation is not complete.',
  };
  return reasons[audit.reason] || 'Build completion has not been verified.';
}
