import { deepFreeze, fail, requireArray, requireBoolean, requireClosedObject, requireSha256, requireText } from './audit-utils.js';

const COMPONENT_KEYS = ['frozenPolicyContentSha256', 'declaredPolicySha256', 'diagnosticRules', 'collisionGroups', 'laterRuleSelections'];
const DIAGNOSTIC_RULE_KEYS = ['ruleId', 'passing', 'blocking', 'reservesCounterparts'];
const COLLISION_GROUP_KEYS = ['groupId', 'candidateOccurrenceIds'];
const SELECTION_KEYS = ['ruleId', 'collisionGroupId', 'selectedOccurrenceId'];

export function auditComponentIdentityInvariants(input) {
  const value = requireClosedObject(input, 'component identity audit', COMPONENT_KEYS);
  const recomputed = requireSha256(value.frozenPolicyContentSha256, 'frozenPolicyContentSha256');
  const declared = requireSha256(value.declaredPolicySha256, 'declaredPolicySha256');
  const findings = [];
  if (recomputed !== declared) findings.push('POLICY_HASH_MISMATCH');
  for (const [index, ruleValue] of requireArray(value.diagnosticRules, 'diagnosticRules').entries()) {
    const rule = requireClosedObject(ruleValue, `diagnosticRules[${index}]`, DIAGNOSTIC_RULE_KEYS);
    requireText(rule.ruleId, `diagnosticRules[${index}].ruleId`);
    if (requireBoolean(rule.passing, `diagnosticRules[${index}].passing`)) findings.push('DIAGNOSTIC_RULE_PASSING');
    if (requireBoolean(rule.blocking, `diagnosticRules[${index}].blocking`)) findings.push('DIAGNOSTIC_RULE_BLOCKING');
    if (requireBoolean(rule.reservesCounterparts, `diagnosticRules[${index}].reservesCounterparts`)) findings.push('DIAGNOSTIC_RULE_RESERVES_COUNTERPART');
  }
  const groups = new Map(requireArray(value.collisionGroups, 'collisionGroups').map((groupValue, index) => {
    const group = requireClosedObject(groupValue, `collisionGroups[${index}]`, COLLISION_GROUP_KEYS);
    return [requireText(group.groupId, `collisionGroups[${index}].groupId`), new Set(requireArray(group.candidateOccurrenceIds, `collisionGroups[${index}].candidateOccurrenceIds`).map((id, idIndex) => requireText(id, `collisionGroups[${index}].candidateOccurrenceIds[${idIndex}]`)))];
  }));
  for (const [index, selectionValue] of requireArray(value.laterRuleSelections, 'laterRuleSelections').entries()) {
    const selection = requireClosedObject(selectionValue, `laterRuleSelections[${index}]`, SELECTION_KEYS);
    const groupId = requireText(selection.collisionGroupId, `laterRuleSelections[${index}].collisionGroupId`);
    const selected = requireText(selection.selectedOccurrenceId, `laterRuleSelections[${index}].selectedOccurrenceId`);
    if (!groups.has(groupId) || !groups.get(groupId).has(selected)) findings.push('COLLISION_GROUP_ESCAPE');
  }
  return deepFreeze({ schema: 'FbxComponentIdentityAudit.v1', findings: [...new Set(findings)].sort(), status: findings.length ? 'FAIL' : 'PASS' });
}

const SUPPORT_KEYS = ['loadedSchema', 'occurrenceIds', 'occurrenceByIdKeys', 'branchOccurrenceIds', 'branchIds', 'childOccurrenceIds', 'branchChildIds', 'canonicalOccurrenceIdsValid', 'parentAncestryValid', 'toleranceAdmittedBeforeMatching', 'populationCount', 'summaryStatus'];

export function auditSupportFoundationInvariants(input) {
  const value = requireClosedObject(input, 'support foundation audit', SUPPORT_KEYS);
  const findings = [];
  if (value.loadedSchema !== 'FbxBenchmarkLoaded.v1') findings.push('FABRICATED_LOADED_SCHEMA');
  const exactSet = (left, right) => [...left].sort().join('\0') === [...right].sort().join('\0');
  const textArray = (field) => requireArray(value[field], field).map((item, index) => requireText(item, `${field}[${index}]`));
  if (!exactSet(textArray('occurrenceIds'), textArray('occurrenceByIdKeys'))) findings.push('OCCURRENCE_BY_ID_COVERAGE');
  if (!exactSet(textArray('branchOccurrenceIds'), textArray('branchIds'))) findings.push('BRANCH_OCCURRENCE_COVERAGE');
  if (!exactSet(textArray('childOccurrenceIds'), textArray('branchChildIds'))) findings.push('CHILD_OCCURRENCE_COVERAGE');
  if (!requireBoolean(value.canonicalOccurrenceIdsValid, 'canonicalOccurrenceIdsValid')) findings.push('NON_CANONICAL_OCCURRENCE_ID');
  if (!requireBoolean(value.parentAncestryValid, 'parentAncestryValid')) findings.push('INVALID_PARENT_ANCESTRY');
  if (!requireBoolean(value.toleranceAdmittedBeforeMatching, 'toleranceAdmittedBeforeMatching')) findings.push('TOLERANCE_ADMISSION_BYPASS');
  if (!Number.isSafeInteger(value.populationCount) || value.populationCount < 0) fail('BLOCKED_AUDIT_CONTRACT', 'populationCount must be non-negative integer.');
  const summaryStatus = requireText(value.summaryStatus, 'summaryStatus');
  if (value.populationCount === 0 && summaryStatus !== 'NOT_APPLICABLE') findings.push('ZERO_SUPPORT_STATUS');
  return deepFreeze({ schema: 'FbxSupportFoundationAudit.v1', findings: [...new Set(findings)].sort(), status: findings.length ? 'FAIL' : 'PASS' });
}
