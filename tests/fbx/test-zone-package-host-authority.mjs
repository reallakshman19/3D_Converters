import assert from 'node:assert/strict';
import { buildSupportCandidateEvidence } from '../../tabs/model-converters/converters/fbx/zone-package/support-evidence.js';
import { buildHostAuthorityBinding } from '../../tabs/model-converters/converters/fbx/zone-package/host-authority.js';
import { FbxZonePackageError } from '../../tabs/model-converters/converters/fbx/zone-package/constants.js';
import { COMPLETE_SOURCE_GRAPH_SHA256 } from './zone-package-fixtures.mjs';

const evidence = await buildSupportCandidateEvidence({
  selectedZoneDigest: COMPLETE_SOURCE_GRAPH_SHA256,
  occurrences: [1, 2, 3].map((index) => ({ occurrenceId: `occ:support-${index}`,
    record: { type: 'ATTA', attributes: { REF: `=1/${index}`, RAW_TYPE: 'ATTA' } } })),
});
const [c1, c2, c3] = evidence.candidates;
const approved = (hosts, extra = {}) => ({ status: 'APPROVED', reviewedBy: 'owner@example.com',
  reviewedAt: '2026-07-28T00:00:00Z', hostOccurrenceIds: hosts, ...extra });
{
  const binding = await buildHostAuthorityBinding({ supportEvidence: evidence, ownerMapping: {
    [c1.candidateId]: approved(['occ:pipe-1']),
    [c2.candidateId]: approved(['occ:pipe-2', 'occ:pipe-1']),
    [c3.candidateId]: approved(['occ:pipe-3']),
  } });
  assert.equal(binding.status, 'BOUND');
  assert.deepEqual(binding.bindings.find((item) => item.candidateId === c2.candidateId).hostOccurrenceIds,
    ['occ:pipe-1', 'occ:pipe-2']);
}
{
  const binding = await buildHostAuthorityBinding({ supportEvidence: evidence,
    ownerMapping: { [c1.candidateId]: approved(['occ:pipe-1']) } });
  assert.equal(binding.status, 'BLOCKED');
  assert.deepEqual(binding.unresolvedCandidateIds, [c2.candidateId, c3.candidateId].sort());
}
await assert.rejects(() => buildHostAuthorityBinding({ supportEvidence: evidence, ownerMapping: {
  [c1.candidateId]: approved(['occ:pipe-1']), [c2.candidateId]: approved(['occ:pipe-2']),
  [c3.candidateId]: approved(['occ:pipe-3']), deadbeefdeadbeefdeadbeefdeadbeef: approved(['occ:pipe-x']),
} }), (error) => error instanceof FbxZonePackageError && error.code === 'ZONE_PACKAGE_INVALID_REVIEW');
await assert.rejects(() => buildHostAuthorityBinding({ supportEvidence: { ...evidence, evidenceDigest: '0'.repeat(64) }, ownerMapping: {} }),
  (error) => error instanceof FbxZonePackageError && error.code === 'ZONE_PACKAGE_INVALID_INPUT');
console.log('test-zone-package-host-authority: PASS');
