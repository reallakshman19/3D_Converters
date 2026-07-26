import { canonicalJson } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { deepFreeze, fail, requireArray, requireClosedObject, requireObject } from './audit-utils.js';
import { adaptSupportBenchmarkReport, auditLoadedBenchmarkOccurrenceContract } from './integrated-adapters.js';
import { reconcileCoverage } from './coverage-reconciliation.js';

const COMPONENT_INPUT_KEYS = ['identityPolicy', 'report'];
const SUPPORT_INPUT_KEYS = ['loadedBenchmark', 'report'];

export async function auditComponentIdentityInvariants(input) {
  const value = requireClosedObject(input, 'component identity audit', COMPONENT_INPUT_KEYS);
  const policy = requireObject(value.identityPolicy, 'identityPolicy');
  const report = requireObject(value.report, 'componentReport');
  if (policy.schema !== 'FbxComponentIdentityPolicy.v1' || report.schema !== 'FbxComponentBenchmarkReport.v1') {
    fail('BLOCKED_AUDIT_CONTRACT', 'component audit requires integrated policy and report schemas.');
  }
  const findings = [];
  const calculated = await sha256Hex(canonicalJson({ ...structuredClone(policy), policyContentSha256: null }));
  if (calculated !== policy.policyContentSha256) findings.push('POLICY_HASH_MISMATCH');
  const diagnosticRuleIds = new Set(policy.identityRules.filter((rule) => rule.kind.startsWith('DIAGNOSTIC_')).map((rule) => rule.ruleId));
  for (const rule of policy.identityRules) if (diagnosticRuleIds.has(rule.ruleId) && rule.passing !== false) findings.push('DIAGNOSTIC_RULE_PASSING');
  findings.push(...componentLedgerFindings(report, diagnosticRuleIds));
  return auditResult('FbxComponentIdentityAudit.v2', findings);
}
function componentLedgerFindings(report, diagnosticRuleIds) {
  const findings = [], groups = new Map(report.collisionGroups.map((group) => [group.collisionGroupId,
    new Set([...group.referenceSubjectIds, ...group.actualSubjectIds])]));
  for (const row of requireArray(report.ledger, 'componentReport.ledger')) {
    if (diagnosticRuleIds.has(row.identityEvidence.selectedRuleId)) findings.push('DIAGNOSTIC_RULE_SELECTED');
    for (const groupId of row.identityEvidence.collisionGroupIds) {
      const allowed = groups.get(groupId);
      if (!allowed || row.match.counterpartSubjectIds.some((id) => !allowed.has(id))) findings.push('COLLISION_GROUP_ESCAPE');
    }
  }
  return findings;
}

export function auditSupportFoundationInvariants(input) {
  const value = requireClosedObject(input, 'support foundation audit', SUPPORT_INPUT_KEYS);
  auditLoadedBenchmarkOccurrenceContract(value.loadedBenchmark);
  const reconciliation = reconcileCoverage(adaptSupportBenchmarkReport(value.report));
  const findings = [];
  if (!value.report.toleranceProfileId) findings.push('TOLERANCE_PROFILE_ID_MISSING');
  if (reconciliation.status === 'FAIL') findings.push('SUPPORT_RECONCILIATION_FAILED');
  if (reconciliation.status === 'BLOCKED') findings.push('SUPPORT_RECONCILIATION_BLOCKED');
  if (value.report.summary.status !== reconciliation.status) findings.push('SUPPORT_SUMMARY_MISMATCH');
  return auditResult('FbxSupportFoundationAudit.v2', findings);
}
function auditResult(schema, findings) {
  const unique = [...new Set(findings)].sort();
  return deepFreeze({ schema, findings: unique, status: unique.length ? 'FAIL' : 'PASS' });
}
