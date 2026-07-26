import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { buildFbxQualificationAudit } from '../../tabs/model-converters/converters/fbx/benchmark/qualification-audit.js';

function validateSchema(schema, instance) {
  const program = String.raw`
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
Draft202012Validator.check_schema(payload["schema"])
errors = sorted(Draft202012Validator(payload["schema"]).iter_errors(payload["instance"]),
    key=lambda error: (list(error.absolute_path), error.message))
print(json.dumps([{"path": list(error.absolute_path), "message": error.message} for error in errors]))
`;
  const python = process.env.FBX_SCHEMA_PYTHON || 'python3';
  const result = spawnSync(python, ['-c', program], {
    input: JSON.stringify({ schema, instance }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  return JSON.parse(result.stdout);
}

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
const schema = JSON.parse(await readFile(new URL(
  '../../contracts/fbx/fbx-qualification-audit-report.v1.schema.json', import.meta.url,
), 'utf8'));
assert.deepEqual(validateSchema(schema, report), []);

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
