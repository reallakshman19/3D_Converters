import {
  deepFreeze, fail, requireArray, requireBoolean, requireClosedObject, requireObject, requireSha256, requireText, stableCompare,
} from './audit-utils.js';

const ROOT_KEYS = [
  'schema', 'manifestId', 'baseBenchmarkIdentitySha256', 'baseActualIdentitySha256',
  'baseEvidenceSha256', 'mutationGenerationPolicy', 'mutations', 'canonicalSha256',
];
const MUTATION_KEYS = [
  'mutationId', 'targetPopulation', 'targetOccurrenceIdentity', 'dimension', 'operator',
  'parameters', 'expectedDetector', 'expectedLedgerState', 'expectedGate',
  'expectedSummaryStatus', 'mustPreserveOtherDimensions',
];

function normalizeMutation(value, index, ids) {
  const item = requireClosedObject(value, `mutations[${index}]`, MUTATION_KEYS);
  const mutationId = requireText(item.mutationId, `mutations[${index}].mutationId`);
  if (ids.has(mutationId)) fail('BLOCKED_AUDIT_IDENTITY', `mutations repeats ${mutationId}.`);
  ids.add(mutationId);
  requireObject(item.parameters, `mutations[${index}].parameters`);
  return {
    mutationId,
    targetPopulation: requireText(item.targetPopulation, `mutations[${index}].targetPopulation`),
    targetOccurrenceIdentity: requireText(item.targetOccurrenceIdentity, `mutations[${index}].targetOccurrenceIdentity`),
    dimension: requireText(item.dimension, `mutations[${index}].dimension`),
    operator: requireText(item.operator, `mutations[${index}].operator`),
    parameters: structuredClone(item.parameters),
    expectedDetector: requireText(item.expectedDetector, `mutations[${index}].expectedDetector`),
    expectedLedgerState: requireText(item.expectedLedgerState, `mutations[${index}].expectedLedgerState`),
    expectedGate: requireText(item.expectedGate, `mutations[${index}].expectedGate`),
    expectedSummaryStatus: requireText(item.expectedSummaryStatus, `mutations[${index}].expectedSummaryStatus`),
    mustPreserveOtherDimensions: requireBoolean(item.mustPreserveOtherDimensions, `mutations[${index}].mustPreserveOtherDimensions`),
  };
}

export function validateAdversarialMutationManifest(input) {
  const value = requireClosedObject(input, 'adversarial manifest', ROOT_KEYS);
  if (value.schema !== 'FbxAdversarialMutationManifest.v1') fail('BLOCKED_AUDIT_CONTRACT', 'schema must be FbxAdversarialMutationManifest.v1.');
  const ids = new Set();
  const mutations = requireArray(value.mutations, 'mutations').map((item, index) => normalizeMutation(item, index, ids))
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
