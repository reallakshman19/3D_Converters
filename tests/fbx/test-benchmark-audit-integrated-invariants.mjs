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
  fitting('FLAN','=F1'), pipe('PIPE AUTO /LINE/B1 1'),
]);
const policy = componentPolicy();
const componentReport = await qualify({
  reference:referenceComponents, actual:structuredClone(referenceComponents),
  identityPolicy:policy, toleranceProfile,
});
assert.equal(auditComponentIdentityInvariants({ identityPolicy:policy, report:componentReport }).status,'PASS');

const falsePassReport = structuredClone(componentReport);
for (const row of falsePassReport.ledger.filter((item) => item.side === 'REFERENCE')) {
  row.match.state = 'ATTRIBUTE_MISMATCH';
}
assert.deepEqual(
  auditComponentIdentityInvariants({ identityPolicy:policy, report:falsePassReport }).findings,
  ['COMPONENT_SUMMARY_FALSE_PASS'],
);

const wrongPolicy = structuredClone(policy);
wrongPolicy.policyContentSha256 = '0'.repeat(64);
assert.throws(() => auditComponentIdentityInvariants({ identityPolicy:wrongPolicy, report:componentReport }),
  /component policy content hash mismatch/);
const diagnosticPolicy = structuredClone(policy);
diagnosticPolicy.identityRules.find((rule) => rule.kind.startsWith('DIAGNOSTIC_')).passing = true;
diagnosticPolicy.policyContentSha256 = policy.policyContentSha256;
assert.throws(() => auditComponentIdentityInvariants({ identityPolicy:diagnosticPolicy, report:componentReport }),
  /content hash mismatch|diagnostic rule can pass/);

const escapedReport = structuredClone(componentReport);
const referenceLedger = escapedReport.ledger.find((row) => row.side === 'REFERENCE');
const actualLedger = escapedReport.ledger.find((row) => row.side === 'ACTUAL');
escapedReport.collisionGroups = [{ collisionGroupId:'g1', identityRuleId:'source', normalizedKey:'x',
  referenceSubjectIds:[referenceLedger.subjectId], actualSubjectIds:[actualLedger.subjectId],
  resolution:'UNRESOLVED', resolutionRuleIds:[] }];
referenceLedger.identityEvidence.collisionGroupIds = ['g1'];
referenceLedger.match.passingCounterpartSubjectId = 'outside-subject';
assert.throws(() => auditComponentIdentityInvariants({ identityPolicy:policy, report:escapedReport }),
  /escaped collision group/);
assert.throws(() => auditComponentIdentityInvariants({
  frozenPolicyContentSha256:'a'.repeat(64), declaredPolicySha256:'a'.repeat(64),
}), /BLOCKED_AUDIT_CONTRACT/);

const supportBranches = benchmarkFixture();
const loadedSupport = loadedBenchmarkFixture(supportBranches);
const actualSupport = loadedBenchmarkFixture(structuredClone(supportBranches));
const supportReport = await validateSupportBenchmark({
  reference:loadedSupport, actual:actualSupport, identityPolicy:identityPolicy(),
  toleranceProfile:supportToleranceProfile, propertyRules, normalizers,
  hostResolver:explicitHostResolver, hostRequired:true,
});
assert.equal(auditSupportFoundationInvariants({ loadedBenchmark:loadedSupport, report:supportReport }).status,'PASS');
const fabricated = { ...loadedSupport, schema:'Fabricated.v1' };
assert.throws(() => auditSupportFoundationInvariants({ loadedBenchmark:fabricated, report:supportReport }),
  /BLOCKED_AUDIT_CONTRACT/);
const incompleteLookup = { ...loadedSupport, occurrenceById:{} };
assert.throws(() => auditSupportFoundationInvariants({ loadedBenchmark:incompleteLookup, report:supportReport }),
  /BLOCKED_AUDIT_COVERAGE/);
const bypassedCoverage = structuredClone(supportReport);
bypassedCoverage.coverage.invariantsPassed = false;
assert.throws(() => auditSupportFoundationInvariants({ loadedBenchmark:loadedSupport, report:bypassedCoverage }),
  /support report coverage is incomplete/);
assert.throws(() => auditSupportFoundationInvariants({
  loadedSchema:'FbxBenchmarkLoaded.v1', canonicalOccurrenceIdsValid:true,
}), /BLOCKED_AUDIT_CONTRACT/);
console.log('test-benchmark-audit-integrated-invariants: PASS');
