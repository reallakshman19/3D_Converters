import assert from 'node:assert/strict';
import { buildFbxQualificationAudit } from '../../tabs/model-converters/converters/fbx/benchmark/qualification-audit.js';

const exactHeadCommit = 'a'.repeat(40);
const benchmarkContentSha256 = 'b'.repeat(64);
const benchmarkIdentity = {
  benchmarkId: 'StaggedJsonBMforFBX',
  contentSha256: benchmarkContentSha256,
  benchmarkCommit: 'ecd841cd41cc7a8df1764cec502e0873f578a5dc',
};

function passingDomain(domainId, count) {
  return {
    domainId,
    status: 'PASS',
    executionCommitSha: exactHeadCommit,
    benchmarkContentSha256,
    coverage: {
      reference: { total: count, matched: count, missing: 0, ambiguous: 0, blocked: 0, excluded: 0 },
      actual: { total: count, matched: count, unexpected: 0, ambiguous: 0, blocked: 0, excluded: 0 },
    },
    findings: [],
    evidenceReferences: [`evidence:${domainId}`],
  };
}

const requiredDomains = ['zone', 'component', 'support', 'topology'];
const domains = [
  passingDomain('topology', 52),
  passingDomain('component', 354),
  passingDomain('zone', 37),
  passingDomain('support', 145),
];
const report = await buildFbxQualificationAudit({
  benchmarkIdentity, exactHeadCommit, requiredDomains, domains,
});

assert.equal(report.schema, 'FbxQualificationAuditReport.v1');
assert.match(report.reportId, /^FBQA-[0-9a-f]{32}$/);
assert.equal(report.summary.auditVerdict, 'PASS');
assert.equal(report.summary.certificationRecommendation, 'CERTIFY');
assert.equal(report.summary.failureIssueCount, 0);
assert.equal(report.summary.blockingIssueCount, 0);
assert.deepEqual(report.domains.map(({ domainId }) => domainId), [...requiredDomains].sort());
assert.deepEqual(report.requiredDomains, [...requiredDomains].sort());
assert.ok(Object.isFrozen(report));
assert.ok(Object.isFrozen(report.domains[0].reference));

const reordered = await buildFbxQualificationAudit({
  benchmarkIdentity: { benchmarkCommit: benchmarkIdentity.benchmarkCommit,
    contentSha256: benchmarkContentSha256, benchmarkId: benchmarkIdentity.benchmarkId },
  exactHeadCommit,
  requiredDomains: [...requiredDomains].reverse(),
  domains: [...domains].reverse().map((domain) => ({
    ...domain,
    evidenceReferences: [...domain.evidenceReferences].reverse(),
  })),
});
assert.deepEqual(reordered, report);

console.log('test-qualification-audit: PASS');
