import {
  deepFreeze, fail, requireArray, requireBoolean, requireClosedObject, requireObject, requireSha256, requireText, stableCompare,
} from './audit-utils.js';
import { requirePopulationKind, requireTerminalState } from './ledger-vocabularies.js';

const ROOT_KEYS = [
  'schema', 'manifestId', 'baseBenchmarkIdentitySha256', 'baseActualIdentitySha256',
  'baseEvidenceSha256', 'mutationGenerationPolicy', 'mutations', 'canonicalSha256',
];
const MUTATION_KEYS = [
  'mutationId', 'targetPopulation', 'targetOccurrenceIdentity', 'dimension', 'operator',
  'parameters', 'expectedDetector', 'expectedLedgerState', 'expectedGate',
  'expectedSummaryStatus', 'mustPreserveOtherDimensions',
];
const SUMMARY_STATUSES = new Set(['PASS', 'PASS_WITH_OBSERVATIONS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE']);

function normalizeMutation(value, index, ids) {
  const label = `mutations[${index}]`;
  const item = requireClosedObject(value, label, MUTATION_KEYS);
  const mutationId = requireText(item.mutationId, `${label}.mutationId`);
  if (ids.has(mutationId)) fail('BLOCKED_AUDIT_IDENTITY', `mutations repeats ${mutationId}.`);
  ids.add(mutationId);
  const targetPopulation = requirePopulationKind(item.targetPopulation, `${label}.targetPopulation`);
  requireObject(item.parameters, `${label}.parameters`);
  const expectedSummaryStatus = requireText(item.expectedSummaryStatus, `${label}.expectedSummaryStatus`);
  if (!SUMMARY_STATUSES.has(expectedSummaryStatus)) {
    fail('BLOCKED_AUDIT_VOCABULARY', `${label}.expectedSummaryStatus is unknown.`);
  }
  return {
    mutationId,
    targetPopulation,
    targetOccurrenceIdentity: requireText(item.targetOccurrenceIdentity, `${label}.targetOccurrenceIdentity`),
    dimension: requireText(item.dimension, `${label}.dimension`),
    operator: requireText(item.operator, `${label}.operator`),
    parameters: structuredClone(item.parameters),
    expectedDetector: requireText(item.expectedDetector, `${label}.expectedDetector`),
    expectedLedgerState: requireTerminalState(targetPopulation, item.expectedLedgerState, `${label}.expectedLedgerState`),
    expectedGate: requireText(item.expectedGate, `${label}.expectedGate`),
    expectedSummaryStatus,
    mustPreserveOtherDimensions: requireBoolean(item.mustPreserveOtherDimensions, `${label}.mustPreserveOtherDimensions`),
  };
}

export function validateAdversarialMutationManifest(input) {
  const value = requireClosedObject(input, 'adversarial manifest', ROOT_KEYS);
  if (value.schema !== 'FbxAdversarialMutationManifest.v2') {
    fail('BLOCKED_AUDIT_CONTRACT', 'schema must be FbxAdversarialMutationManifest.v2.');
  }
  const ids = new Set();
  const mutations = requireArray(value.mutations, 'mutations')
    .map((item, index) => normalizeMutation(item, index, ids))
    .sort((left, right) => stableCompare(left.mutationId, right.mutationId));
  if (!mutations.length) fail('BLOCKED_AUDIT_CONTRACT', 'mutations must not be empty.');
  return deepFreeze({
    schema: value.schema,
    manifestId: requireText(value.manifestId, 'manifestId'),
    baseBenchmarkIdentitySha256: requireSha256(value.baseBenchmarkIdentitySha256, 'baseBenchmarkIdentitySha256'),
    baseActualIdentitySha256: requireSha256(value.baseActualIdentitySha256, 'baseActualIdentitySha256'),
    baseEvidenceSha256: requireSha256(value.baseEvidenceSha256, 'baseEvidenceSha256'),
    mutationGenerationPolicy: requireText(value.mutationGenerationPolicy, 'mutationGenerationPolicy'),
    mutations,
    canonicalSha256: requireSha256(value.canonicalSha256, 'canonicalSha256'),
  });
}
