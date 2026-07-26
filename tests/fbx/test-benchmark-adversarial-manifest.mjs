import assert from 'node:assert/strict';
import { validateAdversarialMutationManifest } from '../../tabs/model-converters/converters/fbx/benchmark-audit/adversarial-manifest.js';

const sha256 = 'f'.repeat(64);
function mutation(mutationId) {
  return {
    mutationId, targetPopulation: 'SUPPORT', targetOccurrenceIdentity: 'support:1', dimension: 'support class',
    operator: 'replace', parameters: { value: 'GUIDE' }, expectedDetector: 'support comparator',
    expectedLedgerState: 'TYPE_MISMATCH', expectedGate: 'B4', expectedSummaryStatus: 'FAIL',
    mustPreserveOtherDimensions: true,
  };
}
function manifest() {
  return {
    schema: 'FbxAdversarialMutationManifest.v1', manifestId: 'agent-q-core',
    baseBenchmarkIdentitySha256: sha256, baseActualIdentitySha256: sha256, baseEvidenceSha256: sha256,
    mutationGenerationPolicy: 'immutable-copy-on-write', mutations: [mutation('M-002'), mutation('M-001')],
    canonicalSha256: sha256,
  };
}

const normalized = validateAdversarialMutationManifest(manifest());
assert.deepEqual(normalized.mutations.map((item) => item.mutationId), ['M-001', 'M-002']);
assert.ok(Object.isFrozen(normalized));

const duplicate = manifest();
duplicate.mutations = [mutation('M-001'), mutation('M-001')];
assert.throws(() => validateAdversarialMutationManifest(duplicate), /BLOCKED_AUDIT_IDENTITY/);

const missingDetector = manifest();
missingDetector.mutations[0].expectedDetector = '';
assert.throws(() => validateAdversarialMutationManifest(missingDetector), /BLOCKED_AUDIT_CONTRACT/);

console.log('test-benchmark-adversarial-manifest: PASS');
