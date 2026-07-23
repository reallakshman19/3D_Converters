/**
 * Builds hash-bound node-history closure candidates and evaluates lifecycle requests.
 * A candidate reports evidence truthfully; it never promotes or mutates production state.
 */

import {
  canonicalSemanticJson,
  deepFreeze,
  isRecord,
  text,
} from '../../contracts/topo-enriched-xml/contract-core.js';
import {
  NODE_HISTORY_MODES,
} from './node-history-lifecycle-policy.js';

export const NODE_HISTORY_CLOSURE_SCHEMA = 'NodeHistoryClosureCandidate.v1';
const GATE_IDS = Object.freeze(['EG-01', 'EG-02', 'EG-03', 'EG-04', 'EG-05', 'EG-06', 'EG-07', 'EG-08']);
const GATE_STATUSES = new Set(['PASS', 'REVIEW_REQUIRED', 'BLOCKED', 'NOT_EVALUATED']);
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

/** @param {Record<string, unknown>} input @returns {Promise<Readonly<Record<string, unknown>>>} */
export async function buildNodeHistoryClosureCandidate(input) {
  requireRecord(input, 'closure candidate input');
  const inputErrors = validateInputCollections(input, []);
  if (inputErrors.length) throw new TypeError(`Closure candidate input is invalid: ${inputErrors.join('; ')}`);
  const gates = sortGates(input.closureGates);
  const approval = structuredClone(input.approval);
  const enforcementEligible = enforcementIsEligible(gates, approval, input.downstreamComparison);
  const candidate = {
    schema: NODE_HISTORY_CLOSURE_SCHEMA,
    candidateId: requireText(input.candidateId, 'candidateId'),
    evidenceBaselineRevision: requireText(input.evidenceBaselineRevision, 'evidenceBaselineRevision'),
    projectId: requireText(input.projectId, 'projectId'),
    zoneId: requireText(input.zoneId, 'zoneId'),
    lifecyclePolicyHash: requireHash(input.lifecyclePolicyHash, 'lifecyclePolicyHash'),
    requestedMode: requireMode(input.requestedMode),
    decisionStatement: structuredClone(input.decisionStatement),
    benchmarks: sortBenchmarks(input.benchmarks),
    downstreamComparison: structuredClone(input.downstreamComparison),
    closureGates: gates,
    approval,
    evaluatedAt: requireTimestamp(input.evaluatedAt),
    enforcementEligible,
    validation: buildCandidateValidation(gates, approval, input.downstreamComparison),
  };
  candidate.candidateHash = await computeNodeHistoryClosureCandidateHash(candidate);
  const errors = await validateNodeHistoryClosureCandidate(candidate);
  if (errors.length) throw new TypeError(`Closure candidate validation failed: ${errors.join('; ')}`);
  return deepFreeze(candidate);
}

/** @param {Record<string, unknown>} value @returns {Promise<string>} */
export async function computeNodeHistoryClosureCandidateHash(value) {
  const semantic = structuredClone(value);
  delete semantic.candidateHash;
  return sha256Canonical(semantic);
}

/** @param {unknown} value @returns {Promise<ReadonlyArray<string>>} */
export async function validateNodeHistoryClosureCandidate(value) {
  const errors = [];
  if (!isRecord(value)) return Object.freeze(['Closure candidate must be an object.']);
  if (value.schema !== NODE_HISTORY_CLOSURE_SCHEMA) errors.push(`schema must equal ${NODE_HISTORY_CLOSURE_SCHEMA}.`);
  for (const field of ['candidateId', 'evidenceBaselineRevision', 'projectId', 'zoneId']) {
    if (!text(value[field])) errors.push(`${field} is required.`);
  }
  if (!HASH_PATTERN.test(text(value.lifecyclePolicyHash))) errors.push('lifecyclePolicyHash is invalid.');
  if (!NODE_HISTORY_MODES.includes(text(value.requestedMode))) errors.push('requestedMode is invalid.');
  validateInputCollections(value, errors);
  validateDerivedState(value, errors);
  if (!HASH_PATTERN.test(text(value.candidateHash))) errors.push('candidateHash is invalid.');
  else if (value.candidateHash !== await computeNodeHistoryClosureCandidateHash(value)) {
    errors.push('candidateHash does not match the candidate.');
  }
  return Object.freeze(errors);
}

function validateInputCollections(value, errors) {
  if (!Array.isArray(value.benchmarks) || !value.benchmarks.length) errors.push('benchmarks must be a non-empty array.');
  else validateBenchmarks(value.benchmarks, errors);
  if (!Array.isArray(value.closureGates) || value.closureGates.length !== GATE_IDS.length) {
    errors.push('closureGates must contain EG-01 through EG-08.');
  } else {
    const ids = [...value.closureGates].map((row) => text(row?.gateId)).sort();
    if (ids.join('|') !== GATE_IDS.join('|')) errors.push('closureGates must contain each evidence gate exactly once.');
    for (const row of value.closureGates) {
      if (!GATE_STATUSES.has(text(row?.status))) errors.push(`closure gate ${text(row?.gateId)} has invalid status.`);
    }
  }
  if (!isRecord(value.decisionStatement)) errors.push('decisionStatement must be an object.');
  else validateDecisionStatement(value.decisionStatement, errors);
  validateEvidenceResult(value.downstreamComparison, 'downstreamComparison', errors);
  validateApproval(value.approval, errors);
  return errors;
}

function validateDerivedState(value, errors) {
  if (!text(value.evaluatedAt) || Number.isNaN(Date.parse(text(value.evaluatedAt)))) {
    errors.push('evaluatedAt must be an ISO-8601 timestamp.');
  }
  const expectedEligible = enforcementIsEligible(value.closureGates, value.approval, value.downstreamComparison);
  if (value.enforcementEligible !== expectedEligible) errors.push('enforcementEligible is inconsistent with gates and approval.');
  const expected = buildCandidateValidation(value.closureGates, value.approval, value.downstreamComparison);
  if (canonicalSemanticJson(value.validation, { excludedKeys: [] })
    !== canonicalSemanticJson(expected, { excludedKeys: [] })) errors.push('validation is inconsistent with closure evidence.');
}

function validateBenchmarks(rows, errors) {
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    const owner = `benchmarks[${index}]`;
    if (!isRecord(row)) {
      errors.push(`${owner} must be an object.`);
      continue;
    }
    const benchmarkId = text(row.benchmarkId);
    if (!benchmarkId || ids.has(benchmarkId)) errors.push(`${owner}.benchmarkId is blank or duplicated.`);
    ids.add(benchmarkId);
    if (!['REAL_PROJECT', '[SIMULATED]'].includes(row.basis)) errors.push(`${owner}.basis is invalid.`);
    if (!text(row.command)) errors.push(`${owner}.command is required.`);
    for (const field of ['status', 'positiveResult', 'negativeResult', 'determinismResult']) {
      if (!GATE_STATUSES.has(text(row[field]))) errors.push(`${owner}.${field} is invalid.`);
    }
    validateArtifactHashes(row.artifactHashes, owner, errors);
  }
}

function validateArtifactHashes(rows, owner, errors) {
  if (!Array.isArray(rows) || !rows.length) {
    errors.push(`${owner}.artifactHashes must be a non-empty array.`);
    return;
  }
  for (const [index, row] of rows.entries()) {
    if (!text(row?.path) || !HASH_PATTERN.test(text(row?.sha256))) {
      errors.push(`${owner}.artifactHashes[${index}] is invalid.`);
    }
  }
}

function validateDecisionStatement(value, errors) {
  if (!text(value.decisionId) || !text(value.statement)) {
    errors.push('decisionStatement requires decisionId and statement.');
  }
  if (!Array.isArray(value.contractImpact) || !value.contractImpact.length
    || value.contractImpact.some((row) => !text(row))) {
    errors.push('decisionStatement.contractImpact must be a non-empty string array.');
  }
}

function validateEvidenceResult(value, field, errors) {
  if (!isRecord(value)) {
    errors.push(`${field} must be an object.`);
    return;
  }
  if (!GATE_STATUSES.has(text(value.status))) errors.push(`${field}.status is invalid.`);
  if (!text(value.basis) || !text(value.summary)) errors.push(`${field} requires basis and summary.`);
}

function validateApproval(value, errors) {
  if (!isRecord(value)) {
    errors.push('approval must be an object.');
    return;
  }
  if (value.status === 'UNAPPROVED') {
    const exact = value.approvalRecordId === null && value.approvedAt === null
      && value.approvalRecordHash === null && Array.isArray(value.approvers) && value.approvers.length === 0;
    if (!exact) errors.push('UNAPPROVED approval must not contain approval evidence.');
    return;
  }
  const approved = value.status === 'APPROVED' && text(value.approvalRecordId)
    && Array.isArray(value.approvers) && value.approvers.length > 0
    && text(value.approvedAt) && !Number.isNaN(Date.parse(text(value.approvedAt)))
    && HASH_PATTERN.test(text(value.approvalRecordHash));
  if (!approved) errors.push('APPROVED approval evidence is incomplete.');
}

function buildCandidateValidation(gates, approval, downstream) {
  const blockers = gates.filter((row) => row.status === 'BLOCKED')
    .map((row) => issue('CLOSURE_GATE_BLOCKED', { gateId: row.gateId, reason: row.reason }));
  const reviewItems = gates.filter((row) => ['REVIEW_REQUIRED', 'NOT_EVALUATED'].includes(row.status))
    .map((row) => issue('CLOSURE_GATE_REVIEW_REQUIRED', { gateId: row.gateId, status: row.status }));
  if (text(approval?.status) !== 'APPROVED') reviewItems.push(issue('CLOSURE_APPROVAL_REQUIRED', {}));
  if (text(downstream?.status) !== 'PASS') reviewItems.push(issue('DOWNSTREAM_COMPARISON_REQUIRED', {
    status: text(downstream?.status) || 'MISSING',
  }));
  return {
    status: blockers.length ? 'BLOCKED' : (reviewItems.length ? 'REVIEW_REQUIRED' : 'PASS'),
    blockers: uniqueIssues(blockers),
    reviewItems: uniqueIssues(reviewItems),
    warnings: [],
  };
}

function enforcementIsEligible(gates, approval, downstream) {
  return gates.length === GATE_IDS.length
    && gates.every((row) => row.status === 'PASS')
    && approval?.status === 'APPROVED'
    && Array.isArray(approval?.approvers) && approval.approvers.length > 0
    && text(approval?.approvedAt)
    && HASH_PATTERN.test(text(approval?.approvalRecordHash))
    && downstream?.status === 'PASS';
}

function sortGates(rows) {
  return structuredClone(rows).sort((a, b) => text(a.gateId).localeCompare(text(b.gateId)));
}

function sortBenchmarks(rows) {
  return structuredClone(rows).sort((a, b) => text(a.benchmarkId).localeCompare(text(b.benchmarkId)));
}

function uniqueIssues(rows) {
  const byKey = new Map(rows.map((row) => [canonicalSemanticJson(row, { excludedKeys: [] }), row]));
  return [...byKey.values()].sort((a, b) => a.code.localeCompare(b.code)
    || canonicalSemanticJson(a.evidence).localeCompare(canonicalSemanticJson(b.evidence)));
}

function issue(code, evidence) {
  return { code, evidence: structuredClone(evidence) };
}

function requireRecord(value, field) {
  if (!isRecord(value)) throw new TypeError(`${field} must be an object.`);
}

function requireText(value, field) {
  const result = text(value);
  if (!result) throw new TypeError(`${field} is required.`);
  return result;
}

function requireHash(value, field) {
  const result = requireText(value, field);
  if (!HASH_PATTERN.test(result)) throw new TypeError(`${field} must use sha256:<64 lowercase hexadecimal characters>.`);
  return result;
}

function requireMode(value) {
  const mode = text(value);
  if (!NODE_HISTORY_MODES.includes(mode)) throw new RangeError(`Unsupported node-history mode: ${mode || 'MISSING'}.`);
  return mode;
}

function requireTimestamp(value) {
  const timestamp = requireText(value, 'evaluatedAt');
  if (Number.isNaN(Date.parse(timestamp))) throw new TypeError('evaluatedAt must be an ISO-8601 timestamp.');
  return timestamp;
}

async function sha256Canonical(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is required.');
  const bytes = new TextEncoder().encode(canonicalSemanticJson(value, { excludedKeys: [] }));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}
