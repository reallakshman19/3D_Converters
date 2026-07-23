/**
 * Evaluates node-history lifecycle requests without wiring a production selector.
 * Blocked requests have no effective mode; there is no downgrade or fallback.
 */

import {
  canonicalSemanticJson,
  deepFreeze,
  isRecord,
  text,
} from '../../contracts/topo-enriched-xml/contract-core.js';
import {
  validateNodeHistoryClosureCandidate,
} from './node-history-closure-candidate.js';
import {
  NODE_HISTORY_MODES,
  validateNodeHistoryLifecyclePolicy,
} from './node-history-lifecycle-policy.js';

/** @param {Record<string, unknown>} input @returns {Promise<Readonly<Record<string, unknown>>>} */
export async function evaluateNodeHistoryMode(input) {
  if (!isRecord(input)) throw new TypeError('mode decision input must be an object.');
  const requestedMode = requireMode(input.requestedMode);
  const issues = await collectIssues(input, requestedMode);
  const blockers = uniqueIssues(issues);
  return deepFreeze({
    schema: 'NodeHistoryModeDecision.v1',
    requestedMode,
    effectiveMode: blockers.length ? null : requestedMode,
    historyAuthoritative: false,
    productionSelectionAllowed: false,
    registryMutationAllowed: false,
    validation: {
      status: blockers.length ? 'BLOCKED' : 'PASS',
      blockers,
      reviewItems: [],
      warnings: [],
    },
  });
}

async function collectIssues(input, requestedMode) {
  const policyIssues = (await validateNodeHistoryLifecyclePolicy(input.lifecyclePolicy))
    .map((message) => issue('LIFECYCLE_POLICY_INVALID', { message }));
  const availabilityIssues = input.lifecyclePolicy?.modes?.[requestedMode]?.modeAvailable === true
    ? [] : [issue('NODE_HISTORY_MODE_UNAVAILABLE', { requestedMode })];
  if (requestedMode === 'BOOTSTRAP_REVIEW') return [...policyIssues, ...availabilityIssues];
  const candidate = input.closureCandidate;
  const candidateProblems = await candidateIssues(candidate);
  return [
    ...policyIssues,
    ...availabilityIssues,
    ...candidateProblems,
    ...scopeIssues(input.lifecyclePolicy, candidate, requestedMode),
    ...modeGateIssues(candidate, requestedMode),
  ];
}

async function candidateIssues(candidate) {
  if (!candidate) return [issue('CLOSURE_CANDIDATE_REQUIRED', {})];
  return (await validateNodeHistoryClosureCandidate(candidate))
    .map((message) => issue('CLOSURE_CANDIDATE_INVALID', { message }));
}

function scopeIssues(policy, candidate, requestedMode) {
  const issues = [];
  if (text(candidate?.lifecyclePolicyHash) !== text(policy?.lifecyclePolicyHash)) {
    issues.push(issue('LIFECYCLE_POLICY_SCOPE_MISMATCH', {
      expected: text(policy?.lifecyclePolicyHash),
      actual: text(candidate?.lifecyclePolicyHash),
    }));
  }
  if (text(candidate?.requestedMode) !== requestedMode) {
    issues.push(issue('CLOSURE_MODE_SCOPE_MISMATCH', {
      expected: requestedMode,
      actual: text(candidate?.requestedMode),
    }));
  }
  return issues;
}

function modeGateIssues(candidate, requestedMode) {
  const issues = [];
  if (requestedMode === 'HISTORY_SHADOW' && candidate?.validation?.status === 'BLOCKED') {
    issues.push(issue('SHADOW_CLOSURE_EVIDENCE_BLOCKED', { candidateHash: text(candidate?.candidateHash) }));
  }
  if (requestedMode === 'HISTORY_ENFORCED' && candidate?.enforcementEligible !== true) {
    issues.push(issue('HISTORY_ENFORCEMENT_NOT_APPROVED', { candidateHash: text(candidate?.candidateHash) }));
  }
  if (requestedMode === 'HISTORY_ENFORCED') issues.push(issue('HISTORY_ENFORCEMENT_UNAVAILABLE', {
    reason: 'GROUNDWORK_DOES_NOT_INSTALL_PRODUCTION_AUTHORITY',
  }));
  return issues;
}

function uniqueIssues(rows) {
  const byKey = new Map(rows.map((row) => [canonicalSemanticJson(row, { excludedKeys: [] }), row]));
  return [...byKey.values()].sort((a, b) => a.code.localeCompare(b.code)
    || canonicalSemanticJson(a.evidence).localeCompare(canonicalSemanticJson(b.evidence)));
}

function issue(code, evidence) {
  return { code, evidence: structuredClone(evidence) };
}

function requireMode(value) {
  const mode = text(value);
  if (!NODE_HISTORY_MODES.includes(mode)) throw new RangeError(`Unsupported node-history mode: ${mode || 'MISSING'}.`);
  return mode;
}
