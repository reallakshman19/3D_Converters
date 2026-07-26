import assert from 'node:assert/strict';
import { auditComponentIdentityInvariants, auditSupportFoundationInvariants } from '../../tabs/model-converters/converters/fbx/benchmark-audit/integrated-invariants.js';

const sha = 'a'.repeat(64);
const component = {
  frozenPolicyContentSha256: sha,
  declaredPolicySha256: sha,
  diagnosticRules: [{ ruleId: 'diagnostic', passing: false, blocking: false, reservesCounterparts: false }],
  collisionGroups: [{ groupId: 'g1', candidateOccurrenceIds: ['a1', 'a2'] }],
  laterRuleSelections: [{ ruleId: 'later', collisionGroupId: 'g1', selectedOccurrenceId: 'a2' }],
};
assert.equal(auditComponentIdentityInvariants(component).status, 'PASS');
assert.deepEqual(auditComponentIdentityInvariants({ ...component, declaredPolicySha256: 'b'.repeat(64) }).findings, ['POLICY_HASH_MISMATCH']);
assert.ok(auditComponentIdentityInvariants({ ...component, diagnosticRules: [{ ruleId: 'd', passing: true, blocking: true, reservesCounterparts: true }] }).findings.includes('DIAGNOSTIC_RULE_PASSING'));
assert.deepEqual(auditComponentIdentityInvariants({ ...component, laterRuleSelections: [{ ruleId: 'later', collisionGroupId: 'g1', selectedOccurrenceId: 'outside' }] }).findings, ['COLLISION_GROUP_ESCAPE']);

const support = {
  loadedSchema: 'FbxBenchmarkLoaded.v1', occurrenceIds: ['b:1', 'c:1'], occurrenceByIdKeys: ['c:1', 'b:1'],
  branchOccurrenceIds: ['b:1'], branchIds: ['b:1'], childOccurrenceIds: ['c:1'], branchChildIds: ['c:1'],
  canonicalOccurrenceIdsValid: true, parentAncestryValid: true, toleranceAdmittedBeforeMatching: true,
  populationCount: 0, summaryStatus: 'NOT_APPLICABLE',
};
assert.equal(auditSupportFoundationInvariants(support).status, 'PASS');
assert.ok(auditSupportFoundationInvariants({ ...support, loadedSchema: 'Fabricated.v1' }).findings.includes('FABRICATED_LOADED_SCHEMA'));
assert.ok(auditSupportFoundationInvariants({ ...support, occurrenceByIdKeys: ['b:1'] }).findings.includes('OCCURRENCE_BY_ID_COVERAGE'));
assert.ok(auditSupportFoundationInvariants({ ...support, canonicalOccurrenceIdsValid: false }).findings.includes('NON_CANONICAL_OCCURRENCE_ID'));
assert.ok(auditSupportFoundationInvariants({ ...support, parentAncestryValid: false }).findings.includes('INVALID_PARENT_ANCESTRY'));
assert.ok(auditSupportFoundationInvariants({ ...support, toleranceAdmittedBeforeMatching: false }).findings.includes('TOLERANCE_ADMISSION_BYPASS'));
assert.ok(auditSupportFoundationInvariants({ ...support, summaryStatus: 'PASS' }).findings.includes('ZERO_SUPPORT_STATUS'));

console.log('test-benchmark-audit-integrated-invariants: PASS');
