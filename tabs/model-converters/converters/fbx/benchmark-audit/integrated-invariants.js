import { deepFreeze, requireClosedObject } from './audit-utils.js';
import {
  adaptComponentBenchmarkReport, adaptSupportBenchmarkReport,
  auditLoadedBenchmarkOccurrenceContract,
} from './integrated-adapters.js';
import {
  validateComponentPolicy, validateComponentReportInvariants,
  validateSupportReportInvariants,
} from './integrated-adapter-validation.js';
import { reconcileCoverage } from './coverage-reconciliation.js';

const COMPONENT_INPUT_KEYS = ['identityPolicy', 'report'];
const SUPPORT_INPUT_KEYS = ['loadedBenchmark', 'report'];

function auditResult(schema, findings) {
  const unique = [...new Set(findings)].sort();
  return deepFreeze({ schema, findings:unique, status:unique.length ? 'FAIL' : 'PASS' });
}

export function auditComponentIdentityInvariants(input) {
  const value = requireClosedObject(input, 'component identity audit', COMPONENT_INPUT_KEYS);
  const policyAudit = validateComponentPolicy(value.identityPolicy);
  validateComponentReportInvariants(value.report, policyAudit);
  const reconciliation = reconcileCoverage(adaptComponentBenchmarkReport(value.report));
  const findings = [];
  if (value.report.summary.componentStatus !== reconciliation.status) {
    findings.push('COMPONENT_SUMMARY_MISMATCH');
  }
  return auditResult('FbxComponentIdentityAudit.v3', findings);
}

export function auditSupportFoundationInvariants(input) {
  const value = requireClosedObject(input, 'support foundation audit', SUPPORT_INPUT_KEYS);
  const occurrenceAudit = auditLoadedBenchmarkOccurrenceContract(value.loadedBenchmark);
  const adapted = adaptSupportBenchmarkReport(value.report);
  validateSupportReportInvariants(value.report, adapted.referencePopulation, adapted.actualPopulation);
  const reconciliation = reconcileCoverage(adapted), findings = [];
  if (occurrenceAudit.status !== 'PASS') findings.push('LOADED_OCCURRENCE_CONTRACT_FAILED');
  if (value.report.summary.status !== reconciliation.status) findings.push('SUPPORT_SUMMARY_MISMATCH');
  return auditResult('FbxSupportFoundationAudit.v3', findings);
}
