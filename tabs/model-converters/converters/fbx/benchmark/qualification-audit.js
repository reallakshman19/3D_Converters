import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';

const DOMAIN_STATUSES = new Set(['PASS', 'PASS_WITH_OBSERVATIONS', 'FAIL', 'BLOCKED', 'UNEXECUTED']);
const FINDING_SEVERITIES = new Set(['FAILURE', 'BLOCKER', 'OBSERVATION']);
const REFERENCE_BUCKETS = ['matched', 'missing', 'ambiguous', 'blocked', 'excluded'];
const ACTUAL_BUCKETS = ['matched', 'unexpected', 'ambiguous', 'blocked', 'excluded'];
const SEVERITY_RANK = Object.freeze({ FAILURE: 0, BLOCKER: 1, OBSERVATION: 2 });

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function assertSha256(value, label) {
  if (!/^[0-9a-f]{64}$/.test(value || '')) throw new TypeError(`${label} must be a lowercase SHA-256 digest.`);
  return value;
}

function assertCommitSha(value, label) {
  if (!/^[0-9a-f]{40}$/.test(value || '')) throw new TypeError(`${label} must be a lowercase commit SHA.`);
  return value;
}

function assertCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative safe integer.`);
  return value;
}

function normalizeSide(side, buckets, label) {
  assertObject(side, label);
  const normalized = { total: assertCount(side.total, `${label}.total`) };
  for (const bucket of buckets) normalized[bucket] = assertCount(side[bucket], `${label}.${bucket}`);
  return normalized;
}

function normalizeFinding(finding, domainId, index) {
  assertObject(finding, `${domainId}.findings[${index}]`);
  const severity = assertNonEmptyString(finding.severity, `${domainId}.findings[${index}].severity`);
  if (!FINDING_SEVERITIES.has(severity)) throw new TypeError(`Unsupported finding severity: ${severity}.`);
  return {
    code: assertNonEmptyString(finding.code, `${domainId}.findings[${index}].code`),
    severity,
    details: finding.details === undefined ? null : finding.details,
  };
}

function normalizeDomain(domain, index) {
  assertObject(domain, `domains[${index}]`);
  const domainId = assertNonEmptyString(domain.domainId, `domains[${index}].domainId`);
  const status = assertNonEmptyString(domain.status, `${domainId}.status`);
  if (!DOMAIN_STATUSES.has(status)) throw new TypeError(`Unsupported domain status: ${status}.`);
  const coverage = assertObject(domain.coverage, `${domainId}.coverage`);
  const evidenceReferences = [...(domain.evidenceReferences || [])].map((value, itemIndex) => (
    assertNonEmptyString(value, `${domainId}.evidenceReferences[${itemIndex}]`)
  )).sort();
  assertUnique(evidenceReferences, `${domainId}.evidenceReferences`);
  return {
    schema: 'FbxQualificationDomainEvidence.v1',
    domainId,
    status,
    executionCommitSha: assertCommitSha(domain.executionCommitSha, `${domainId}.executionCommitSha`),
    benchmarkContentSha256: assertSha256(domain.benchmarkContentSha256, `${domainId}.benchmarkContentSha256`),
    reference: normalizeSide(coverage.reference, REFERENCE_BUCKETS, `${domainId}.coverage.reference`),
    actual: normalizeSide(coverage.actual, ACTUAL_BUCKETS, `${domainId}.coverage.actual`),
    findings: (domain.findings || []).map((item, findingIndex) => normalizeFinding(item, domainId, findingIndex)),
    evidenceReferences,
  };
}

function issue(code, severity, domainId = null, details = null) {
  return { code, severity, domainId, details };
}

function sideTotal(side, buckets) {
  return buckets.reduce((total, bucket) => total + side[bucket], 0);
}

function coverageIssues(domain) {
  const issues = [];
  const referenceObserved = sideTotal(domain.reference, REFERENCE_BUCKETS);
  const actualObserved = sideTotal(domain.actual, ACTUAL_BUCKETS);
  if (referenceObserved !== domain.reference.total) issues.push(issue('REFERENCE_COVERAGE_EQUATION_MISMATCH', 'FAILURE', domain.domainId,
    { expected: domain.reference.total, observed: referenceObserved }));
  if (actualObserved !== domain.actual.total) issues.push(issue('ACTUAL_COVERAGE_EQUATION_MISMATCH', 'FAILURE', domain.domainId,
    { expected: domain.actual.total, observed: actualObserved }));
  if (domain.reference.matched !== domain.actual.matched) issues.push(issue('MATCHED_CARDINALITY_MISMATCH', 'FAILURE', domain.domainId,
    { referenceMatched: domain.reference.matched, actualMatched: domain.actual.matched }));
  return issues;
}

function falsePassIssues(domain) {
  if (!['PASS', 'PASS_WITH_OBSERVATIONS'].includes(domain.status)) return [];
  const unresolved = domain.reference.missing + domain.reference.ambiguous + domain.reference.blocked
    + domain.actual.unexpected + domain.actual.ambiguous + domain.actual.blocked;
  const severeFindings = domain.findings.filter(({ severity }) => severity !== 'OBSERVATION').length;
  if (unresolved === 0 && severeFindings === 0) return [];
  return [issue('FALSE_PASS_STATUS', 'FAILURE', domain.domainId, { unresolved, severeFindings, claimedStatus: domain.status })];
}

function statusIssues(domain) {
  if (domain.status === 'FAIL') return [issue('DOMAIN_REPORTED_FAILURE', 'FAILURE', domain.domainId)];
  if (domain.status === 'BLOCKED') return [issue('DOMAIN_REPORTED_BLOCKED', 'BLOCKER', domain.domainId)];
  if (domain.status === 'UNEXECUTED') return [issue('DOMAIN_UNEXECUTED', 'BLOCKER', domain.domainId)];
  return [];
}

function bindingIssues(domain, exactHeadCommit, benchmarkDigest) {
  const issues = [];
  if (domain.executionCommitSha !== exactHeadCommit) issues.push(issue('EXACT_HEAD_MISMATCH', 'BLOCKER', domain.domainId,
    { expected: exactHeadCommit, observed: domain.executionCommitSha }));
  if (domain.benchmarkContentSha256 !== benchmarkDigest) issues.push(issue('BENCHMARK_IDENTITY_MISMATCH', 'BLOCKER', domain.domainId,
    { expected: benchmarkDigest, observed: domain.benchmarkContentSha256 }));
  return issues;
}

function compareIssues(left, right) {
  const severity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  if (severity !== 0) return severity;
  const leftKey = `${left.domainId || ''}\u0000${left.code}\u0000${canonicalJson(left.details)}`;
  const rightKey = `${right.domainId || ''}\u0000${right.code}\u0000${canonicalJson(right.details)}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function statusCounts(domains) {
  const counts = Object.fromEntries([...DOMAIN_STATUSES].sort().map((status) => [status, 0]));
  for (const domain of domains) counts[domain.status] += 1;
  return counts;
}

function verdictFor(issues) {
  if (issues.some(({ severity }) => severity === 'FAILURE')) return 'FAIL';
  if (issues.some(({ severity }) => severity === 'BLOCKER')) return 'CONDITIONAL_PASS';
  return 'PASS';
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} contains duplicate value ${value}.`);
    seen.add(value);
  }
}

function requiredDomainIssues(requiredDomains, domains) {
  const present = new Set(domains.map(({ domainId }) => domainId));
  return requiredDomains.filter((domainId) => !present.has(domainId))
    .map((domainId) => issue('REQUIRED_DOMAIN_MISSING', 'BLOCKER', domainId));
}

function carriedFindings(domains) {
  return domains.flatMap((domain) => domain.findings.map((finding) => issue(
    `DOMAIN_FINDING:${finding.code}`, finding.severity, domain.domainId, finding.details,
  )));
}

function buildSummary(domains, requiredDomains, issues) {
  const auditVerdict = verdictFor(issues);
  return {
    statusCounts: statusCounts(domains),
    requiredDomainCount: requiredDomains.length,
    presentRequiredDomainCount: requiredDomains.filter((required) => domains.some(({ domainId }) => domainId === required)).length,
    failureIssueCount: issues.filter(({ severity }) => severity === 'FAILURE').length,
    blockingIssueCount: issues.filter(({ severity }) => severity === 'BLOCKER').length,
    observationCount: issues.filter(({ severity }) => severity === 'OBSERVATION').length,
    auditVerdict,
    certificationRecommendation: auditVerdict === 'PASS' ? 'CERTIFY' : 'DO_NOT_CERTIFY',
  };
}

export async function buildFbxQualificationAudit(input) {
  assertObject(input, 'qualification audit input');
  const benchmarkIdentity = assertObject(input.benchmarkIdentity, 'benchmarkIdentity');
  const benchmarkDigest = assertSha256(benchmarkIdentity.contentSha256, 'benchmarkIdentity.contentSha256');
  const exactHeadCommit = assertCommitSha(input.exactHeadCommit, 'exactHeadCommit');
  const requiredDomains = [...(input.requiredDomains || [])].map((value, index) => (
    assertNonEmptyString(value, `requiredDomains[${index}]`)
  )).sort();
  assertUnique(requiredDomains, 'requiredDomains');
  const domains = (input.domains || []).map(normalizeDomain).sort((left, right) => (
    left.domainId < right.domainId ? -1 : left.domainId > right.domainId ? 1 : 0
  ));
  assertUnique(domains.map(({ domainId }) => domainId), 'domains');
  const issues = [
    ...requiredDomainIssues(requiredDomains, domains),
    ...domains.flatMap((domain) => coverageIssues(domain)),
    ...domains.flatMap((domain) => falsePassIssues(domain)),
    ...domains.flatMap((domain) => statusIssues(domain)),
    ...domains.flatMap((domain) => bindingIssues(domain, exactHeadCommit, benchmarkDigest)),
    ...carriedFindings(domains),
  ].sort(compareIssues);
  const payload = {
    schema: 'FbxQualificationAuditReport.v1', benchmarkIdentity: { ...benchmarkIdentity }, exactHeadCommit,
    requiredDomains, domains, issues, summary: buildSummary(domains, requiredDomains, issues),
    canonicalOrdering: { domains: ['domainId'], issues: ['severity', 'domainId', 'code', 'details'] },
  };
  const reportId = `FBQA-${(await sha256Hex(canonicalJson(payload))).slice(0, 32)}`;
  return deepFreeze({ ...payload, reportId });
}
