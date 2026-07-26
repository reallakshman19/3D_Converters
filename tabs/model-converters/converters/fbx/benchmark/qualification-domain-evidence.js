import { deepFreeze } from '../canonical-json.js';

const PAIRED_STATES = new Set([
  'EXACT_MATCH', 'APPROVED_EQUIVALENT', 'ATTRIBUTE_MISMATCH', 'GEOMETRY_MISMATCH', 'TOPOLOGY_MISMATCH',
]);
const FAILURE_STATES = new Set([
  'ATTRIBUTE_MISMATCH', 'GEOMETRY_MISMATCH', 'TOPOLOGY_MISMATCH', 'MISSING_ACTUAL', 'UNEXPECTED_ACTUAL',
]);
const BLOCKED_STATES = new Set(['AMBIGUOUS_MATCH', 'BLOCKED_IDENTITY']);
const KNOWN_STATES = new Set([...PAIRED_STATES, ...FAILURE_STATES, ...BLOCKED_STATES]);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function finding(code, details = null, severity = 'FAILURE') {
  return { code, severity, details };
}

function emptyCoverage(side) {
  return side === 'REFERENCE'
    ? { total: 0, matched: 0, missing: 0, ambiguous: 0, blocked: 0, excluded: 0 }
    : { total: 0, matched: 0, unexpected: 0, ambiguous: 0, blocked: 0, excluded: 0 };
}

function observeState(coverage, side, state) {
  coverage.total += 1;
  if (PAIRED_STATES.has(state)) coverage.matched += 1;
  else if (state === 'AMBIGUOUS_MATCH') coverage.ambiguous += 1;
  else if (state === 'BLOCKED_IDENTITY') coverage.blocked += 1;
  else if (side === 'REFERENCE' && state === 'MISSING_ACTUAL') coverage.missing += 1;
  else if (side === 'ACTUAL' && state === 'UNEXPECTED_ACTUAL') coverage.unexpected += 1;
  else coverage.blocked += 1;
}

function hasObservation(record) {
  return Array.isArray(record.comparisons) && record.comparisons.some((comparison) => comparison?.outcome === 'OBSERVATION');
}

function derivedStatus(records, findings) {
  const states = records.map((record) => record?.match?.state);
  if (states.some((state) => BLOCKED_STATES.has(state) || !KNOWN_STATES.has(state))) return 'BLOCKED';
  if (states.some((state) => FAILURE_STATES.has(state))) return 'FAIL';
  if (findings.some(({ severity }) => severity === 'BLOCKER')) return 'BLOCKED';
  return records.some(hasObservation) ? 'PASS_WITH_OBSERVATIONS' : 'PASS';
}

function duplicateFindings(records, field, code) {
  const counts = new Map();
  for (const record of records) {
    const value = record?.[field];
    if (typeof value === 'string') counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1)
    .map(([value, count]) => finding(code, { value, count }));
}

function ledgerIndexes(records, findings) {
  const bySideAndSubject = new Map();
  for (const record of records) {
    const side = record?.side, subjectId = record?.subjectId;
    if (!['REFERENCE', 'ACTUAL'].includes(side)) {
      findings.push(finding('INVALID_LEDGER_SIDE', { side, subjectId }));
      continue;
    }
    if (typeof subjectId !== 'string' || subjectId.length === 0) {
      findings.push(finding('INVALID_LEDGER_SUBJECT_ID', { side }));
      continue;
    }
    bySideAndSubject.set(`${side}\u0000${subjectId}`, record);
  }
  return bySideAndSubject;
}

function pairFindings(record, indexes) {
  const state = record?.match?.state;
  if (!PAIRED_STATES.has(state)) return [];
  const counterparts = record?.match?.counterpartSubjectIds;
  if (!Array.isArray(counterparts) || counterparts.length !== 1) {
    return [finding('PAIRED_STATE_REQUIRES_ONE_COUNTERPART', {
      side: record?.side, subjectId: record?.subjectId, state, counterpartCount: counterparts?.length ?? null,
    })];
  }
  const otherSide = record.side === 'REFERENCE' ? 'ACTUAL' : 'REFERENCE';
  const counterpart = indexes.get(`${otherSide}\u0000${counterparts[0]}`);
  if (!counterpart || !counterpart.match?.counterpartSubjectIds?.includes(record.subjectId)) {
    return [finding('NON_RECIPROCAL_COUNTERPART', {
      side: record.side, subjectId: record.subjectId, counterpartSubjectId: counterparts[0],
    })];
  }
  return [];
}

function inventoryFindings(report, reference, actual) {
  const findings = [];
  const expectedReference = report.inventory?.referenceComponentCount;
  const expectedActual = report.inventory?.actualComponentCount;
  if (expectedReference !== reference.total) findings.push(finding('REFERENCE_INVENTORY_LEDGER_MISMATCH',
    { inventory: expectedReference ?? null, ledger: reference.total }));
  if (expectedActual !== actual.total) findings.push(finding('ACTUAL_INVENTORY_LEDGER_MISMATCH',
    { inventory: expectedActual ?? null, ledger: actual.total }));
  return findings;
}

function summaryFindings(report, status, reference, actual) {
  const findings = [];
  if (report.summary?.componentStatus !== status) findings.push(finding('CLAIMED_STATUS_MISMATCH',
    { claimed: report.summary?.componentStatus ?? null, derived: status }));
  if (report.summary?.referenceCoverageCount !== reference.total) findings.push(finding('REFERENCE_SUMMARY_COVERAGE_MISMATCH',
    { claimed: report.summary?.referenceCoverageCount ?? null, derived: reference.total }));
  if (report.summary?.actualCoverageCount !== actual.total) findings.push(finding('ACTUAL_SUMMARY_COVERAGE_MISMATCH',
    { claimed: report.summary?.actualCoverageCount ?? null, derived: actual.total }));
  return findings;
}

function evidenceReferences(report) {
  const identities = report.executionIdentity || {};
  return [
    report.reportId ? `COMPONENT_REPORT:${report.reportId}` : null,
    identities.componentIdentityPolicyIdentity?.contentSha256
      ? `COMPONENT_POLICY:${identities.componentIdentityPolicyIdentity.contentSha256}` : null,
    identities.zoneMembershipIndexes?.reference?.contentSha256
      ? `ZONE_INDEX:REFERENCE:${identities.zoneMembershipIndexes.reference.contentSha256}` : null,
    identities.zoneMembershipIndexes?.actual?.contentSha256
      ? `ZONE_INDEX:ACTUAL:${identities.zoneMembershipIndexes.actual.contentSha256}` : null,
  ].filter(Boolean).sort();
}

export function componentQualificationDomainEvidence(report, { executionCommitSha, domainId = 'component' } = {}) {
  assertObject(report, 'component report');
  if (report.schema !== 'FbxComponentBenchmarkReport.v1') throw new TypeError('component report schema is invalid.');
  assertString(executionCommitSha, 'executionCommitSha');
  const digest = assertString(report.executionIdentity?.benchmarkLoads?.reference?.contentSha256,
    'component report reference benchmark digest');
  const records = Array.isArray(report.ledger) ? report.ledger : [];
  const findings = [
    ...duplicateFindings(records, 'ledgerRecordId', 'DUPLICATE_LEDGER_RECORD_ID'),
    ...duplicateFindings(records, 'subjectId', 'DUPLICATE_SUBJECT_ID'),
  ];
  const indexes = ledgerIndexes(records, findings);
  for (const record of records) {
    if (!KNOWN_STATES.has(record?.match?.state)) findings.push(finding('UNKNOWN_MATCH_STATE',
      { subjectId: record?.subjectId ?? null, state: record?.match?.state ?? null }));
    findings.push(...pairFindings(record, indexes));
  }
  const reference = emptyCoverage('REFERENCE'), actual = emptyCoverage('ACTUAL');
  for (const record of records) {
    if (record?.side === 'REFERENCE') observeState(reference, 'REFERENCE', record?.match?.state);
    if (record?.side === 'ACTUAL') observeState(actual, 'ACTUAL', record?.match?.state);
  }
  findings.push(...inventoryFindings(report, reference, actual));
  const status = derivedStatus(records, findings);
  findings.push(...summaryFindings(report, status, reference, actual));
  return deepFreeze({
    domainId, status, executionCommitSha, benchmarkContentSha256: digest,
    coverage: { reference, actual }, findings, evidenceReferences: evidenceReferences(report),
  });
}
