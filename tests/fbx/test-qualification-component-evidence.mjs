import assert from 'node:assert/strict';
import { componentQualificationDomainEvidence } from '../../tabs/model-converters/converters/fbx/benchmark/qualification-domain-evidence.js';
import { buildFbxQualificationAudit } from '../../tabs/model-converters/converters/fbx/benchmark/qualification-audit.js';

const exactHeadCommit = 'a'.repeat(40);
const benchmarkContentSha256 = 'b'.repeat(64);

function record(side, subjectId, state, counterpartSubjectIds = [], comparisons = []) {
  return {
    ledgerRecordId: `LEDGER-${subjectId}`, side, subjectId,
    match: { state, counterpartSubjectIds, passingCounterpartSubjectId: null }, comparisons,
  };
}

function report(ledger, overrides = {}) {
  const referenceCount = ledger.filter(({ side }) => side === 'REFERENCE').length;
  const actualCount = ledger.filter(({ side }) => side === 'ACTUAL').length;
  return {
    schema: 'FbxComponentBenchmarkReport.v1', reportId: 'FBCOMP-' + 'c'.repeat(32),
    executionIdentity: { benchmarkLoads: { reference: { contentSha256: benchmarkContentSha256 } } },
    inventory: { referenceComponentCount: referenceCount, actualComponentCount: actualCount },
    ledger,
    summary: { componentStatus: 'PASS', referenceCoverageCount: referenceCount, actualCoverageCount: actualCount },
    ...overrides,
  };
}

const passingReport = report([
  record('REFERENCE', 'R-1', 'EXACT_MATCH', ['A-1']),
  record('ACTUAL', 'A-1', 'EXACT_MATCH', ['R-1']),
]);
const passingEvidence = componentQualificationDomainEvidence(passingReport, { executionCommitSha: exactHeadCommit });
assert.equal(passingEvidence.status, 'PASS');
assert.equal(passingEvidence.coverage.reference.matched, 1);
assert.equal(passingEvidence.coverage.actual.matched, 1);
assert.equal(passingEvidence.findings.length, 0);

const spoofedSummary = report([
  record('REFERENCE', 'R-1', 'MISSING_ACTUAL'),
  record('ACTUAL', 'A-1', 'UNEXPECTED_ACTUAL'),
]);
const spoofedEvidence = componentQualificationDomainEvidence(spoofedSummary, { executionCommitSha: exactHeadCommit });
assert.equal(spoofedEvidence.status, 'FAIL');
assert.ok(spoofedEvidence.findings.some(({ code }) => code === 'CLAIMED_STATUS_MISMATCH'));
assert.equal(spoofedEvidence.coverage.reference.missing, 1);
assert.equal(spoofedEvidence.coverage.actual.unexpected, 1);

const duplicateLedger = report([
  record('REFERENCE', 'R-1', 'EXACT_MATCH', ['A-1']),
  record('REFERENCE', 'R-1', 'EXACT_MATCH', ['A-1']),
  record('ACTUAL', 'A-1', 'EXACT_MATCH', ['R-1']),
]);
const duplicateEvidence = componentQualificationDomainEvidence(duplicateLedger, { executionCommitSha: exactHeadCommit });
assert.ok(duplicateEvidence.findings.some(({ code }) => code === 'DUPLICATE_SUBJECT_ID'));
const duplicateAudit = await buildFbxQualificationAudit({
  benchmarkIdentity: { contentSha256: benchmarkContentSha256 }, exactHeadCommit,
  requiredDomains: ['component'], domains: [duplicateEvidence],
});
assert.equal(duplicateAudit.summary.auditVerdict, 'FAIL');
assert.ok(duplicateAudit.issues.some(({ code }) => code === 'FALSE_PASS_STATUS'));

const nonReciprocal = report([
  record('REFERENCE', 'R-1', 'EXACT_MATCH', ['A-1']),
  record('ACTUAL', 'A-1', 'EXACT_MATCH', ['R-2']),
]);
const nonReciprocalEvidence = componentQualificationDomainEvidence(nonReciprocal, { executionCommitSha: exactHeadCommit });
assert.ok(nonReciprocalEvidence.findings.some(({ code }) => code === 'NON_RECIPROCAL_COUNTERPART'));

const unknownState = report([record('REFERENCE', 'R-1', 'MAGIC')], {
  inventory: { referenceComponentCount: 1, actualComponentCount: 0 },
  summary: { componentStatus: 'PASS', referenceCoverageCount: 1, actualCoverageCount: 0 },
});
const unknownEvidence = componentQualificationDomainEvidence(unknownState, { executionCommitSha: exactHeadCommit });
assert.equal(unknownEvidence.status, 'BLOCKED');
assert.ok(unknownEvidence.findings.some(({ code }) => code === 'UNKNOWN_MATCH_STATE'));

console.log('test-qualification-component-evidence: PASS');
