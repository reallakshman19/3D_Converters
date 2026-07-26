import assert from 'node:assert/strict';
import { buildFbxQualificationAudit } from '../../tabs/model-converters/converters/fbx/benchmark/qualification-audit.js';

const exactHeadCommit = 'a'.repeat(40);
const benchmarkContentSha256 = 'b'.repeat(64);
const benchmarkIdentity = { benchmarkId: 'benchmark', contentSha256: benchmarkContentSha256 };

function domain(overrides = {}) {
  return {
    domainId: 'component', status: 'PASS', executionCommitSha: exactHeadCommit,
    benchmarkContentSha256,
    coverage: {
      reference: { total: 1, matched: 1, missing: 0, ambiguous: 0, blocked: 0, excluded: 0 },
      actual: { total: 1, matched: 1, unexpected: 0, ambiguous: 0, blocked: 0, excluded: 0 },
    },
    findings: [], evidenceReferences: [], ...overrides,
  };
}

async function audit(item, options = {}) {
  return buildFbxQualificationAudit({
    benchmarkIdentity, exactHeadCommit, requiredDomains: ['component'], domains: [item], ...options,
  });
}

const falsePass = await audit(domain({
  coverage: {
    reference: { total: 2, matched: 1, missing: 1, ambiguous: 0, blocked: 0, excluded: 0 },
    actual: { total: 2, matched: 1, unexpected: 1, ambiguous: 0, blocked: 0, excluded: 0 },
  },
}));
assert.equal(falsePass.summary.auditVerdict, 'FAIL');
assert.equal(falsePass.summary.certificationRecommendation, 'DO_NOT_CERTIFY');
assert.ok(falsePass.issues.some(({ code }) => code === 'FALSE_PASS_STATUS'));
assert.equal(falsePass.domains[0].reference.missing, 1);
assert.equal(falsePass.domains[0].actual.unexpected, 1);

const badEquation = await audit(domain({
  status: 'FAIL',
  coverage: {
    reference: { total: 2, matched: 1, missing: 0, ambiguous: 0, blocked: 0, excluded: 0 },
    actual: { total: 1, matched: 1, unexpected: 0, ambiguous: 0, blocked: 0, excluded: 0 },
  },
}));
assert.ok(badEquation.issues.some(({ code }) => code === 'REFERENCE_COVERAGE_EQUATION_MISMATCH'));

const cardinalityMismatch = await audit(domain({
  status: 'FAIL',
  coverage: {
    reference: { total: 2, matched: 2, missing: 0, ambiguous: 0, blocked: 0, excluded: 0 },
    actual: { total: 1, matched: 1, unexpected: 0, ambiguous: 0, blocked: 0, excluded: 0 },
  },
}));
assert.ok(cardinalityMismatch.issues.some(({ code }) => code === 'MATCHED_CARDINALITY_MISMATCH'));

const wrongHead = await audit(domain({ executionCommitSha: 'c'.repeat(40) }));
assert.equal(wrongHead.summary.auditVerdict, 'CONDITIONAL_PASS');
assert.ok(wrongHead.issues.some(({ code }) => code === 'EXACT_HEAD_MISMATCH'));

const wrongBenchmark = await audit(domain({ benchmarkContentSha256: 'd'.repeat(64) }));
assert.equal(wrongBenchmark.summary.auditVerdict, 'CONDITIONAL_PASS');
assert.ok(wrongBenchmark.issues.some(({ code }) => code === 'BENCHMARK_IDENTITY_MISMATCH'));

const missingDomain = await buildFbxQualificationAudit({
  benchmarkIdentity, exactHeadCommit, requiredDomains: ['component', 'support'], domains: [domain()],
});
assert.equal(missingDomain.summary.auditVerdict, 'CONDITIONAL_PASS');
assert.ok(missingDomain.issues.some(({ code, domainId }) => code === 'REQUIRED_DOMAIN_MISSING' && domainId === 'support'));

const unexecuted = await audit(domain({
  status: 'UNEXECUTED',
  coverage: {
    reference: { total: 0, matched: 0, missing: 0, ambiguous: 0, blocked: 0, excluded: 0 },
    actual: { total: 0, matched: 0, unexpected: 0, ambiguous: 0, blocked: 0, excluded: 0 },
  },
}));
assert.equal(unexecuted.summary.auditVerdict, 'CONDITIONAL_PASS');
assert.ok(unexecuted.issues.some(({ code }) => code === 'DOMAIN_UNEXECUTED'));

const hiddenBlocker = await audit(domain({
  findings: [{ code: 'AUTHORITY_UNRESOLVED', severity: 'BLOCKER', details: { field: 'zone' } }],
}));
assert.equal(hiddenBlocker.summary.auditVerdict, 'FAIL');
assert.ok(hiddenBlocker.issues.some(({ code }) => code === 'FALSE_PASS_STATUS'));
assert.ok(hiddenBlocker.issues.some(({ code }) => code === 'DOMAIN_FINDING:AUTHORITY_UNRESOLVED'));

await assert.rejects(
  () => buildFbxQualificationAudit({
    benchmarkIdentity, exactHeadCommit, requiredDomains: ['component'], domains: [domain(), domain()],
  }),
  /domains contains duplicate value component/,
);
await assert.rejects(
  () => audit(domain({ evidenceReferences: ['same', 'same'] })),
  /evidenceReferences contains duplicate value same/,
);
await assert.rejects(
  () => audit(domain({ benchmarkContentSha256: 'not-a-digest' })),
  /lowercase SHA-256 digest/,
);

console.log('test-qualification-audit-adversarial: PASS');
