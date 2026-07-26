import assert from 'node:assert/strict';
import {
  auditComponentIdentityInvariants,
  auditSupportFoundationInvariants,
} from '../../tabs/model-converters/converters/fbx/benchmark-audit/integrated-invariants.js';
import {
  branch, componentPolicy, fitting, pipe, qualify, toleranceProfile,
} from './component-benchmark-fixtures.mjs';
import {
  benchmarkFixture, explicitHostResolver, identityPolicy, loadedBenchmarkFixture,
  normalizers, propertyRules, toleranceProfile as supportToleranceProfile,
} from './support-benchmark-fixtures.mjs';
import { validateSupportBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/support-validator.js';

const referenceComponents = branch('/LINE/B1', [
  fitting('FLAN', '=F1'), pipe('PIPE AUTO /LINE/B1 1'),
]);
const actualComponents = structuredClone(referenceComponents);
const policy = componentPolicy();
const componentReport = await qualify({
  reference: referenceComponents,
  actual: actualComponents,
  identityPolicy: policy,
  toleranceProfile,
});
assert.equal((await auditComponentIdentityInvariants({ identityPolicy: policy, report: componentReport })).status, 'PASS');
const wrongPolicy = structuredClone(policy);
wrongPolicy.policyContentSha256 = '0'.repeat(64);
assert.ok((await auditComponentIdentityInvariants({ identityPolicy: wrongPolicy, report: componentReport }))
  .findings.includes('POLICY_HASH_MISMATCH'));
const escapedReport = structuredClone(componentReport);
const referenceLedger = escapedReport.ledger.find((row) => row.side === 'REFERENCE');
const actualLedger = escapedReport.ledger.find((row) => row.side === 'ACTUAL');
escapedReport.collisionGroups = [{ collisionGroupId: 'g1', identityRuleId: 'source', normalizedKey: 'x',
  referenceSubjectIds: [referenceLedger.subjectId], actualSubjectIds: [actualLedger.subjectId],
  resolution: 'UNRESOLVED', resolutionRuleIds: [] }];
referenceLedger.identityEvidence.collisionGroupIds = ['g1'];
referenceLedger.match.counterpartSubjectIds = ['outside-subject'];
assert.ok((await auditComponentIdentityInvariants({ identityPolicy: policy, report: escapedReport }))
  .findings.includes('COLLISION_GROUP_ESCAPE'));
assert.throws(() => auditComponentIdentityInvariants({
  frozenPolicyContentSha256: 'a'.repeat(64), declaredPolicySha256: 'a'.repeat(64),
}), /BLOCKED_AUDIT_CONTRACT/);

const supportBranches = benchmarkFixture();
const loadedSupport = loadedBenchmarkFixture(supportBranches);
const actualSupport = loadedBenchmarkFixture(structuredClone(supportBranches));
const supportReport = await validateSupportBenchmark({
  reference: loadedSupport,
  actual: actualSupport,
  identityPolicy: identityPolicy(),
  toleranceProfile: supportToleranceProfile,
  propertyRules,
  normalizers,
  hostResolver: explicitHostResolver,
  hostRequired: true,
});
assert.equal(auditSupportFoundationInvariants({ loadedBenchmark: loadedSupport, report: supportReport }).status, 'PASS');
const fabricated = { ...loadedSupport, schema: 'Fabricated.v1' };
assert.throws(() => auditSupportFoundationInvariants({ loadedBenchmark: fabricated, report: supportReport }),
  /BLOCKED_AUDIT_CONTRACT/);
const incompleteLookup = { ...loadedSupport, occurrenceById: {} };
assert.throws(() => auditSupportFoundationInvariants({ loadedBenchmark: incompleteLookup, report: supportReport }),
  /BLOCKED_AUDIT_COVERAGE/);
assert.throws(() => auditSupportFoundationInvariants({
  loadedSchema: 'FbxBenchmarkLoaded.v1', canonicalOccurrenceIdsValid: true,
}), /BLOCKED_AUDIT_CONTRACT/);
console.log('test-benchmark-audit-integrated-invariants: PASS');
