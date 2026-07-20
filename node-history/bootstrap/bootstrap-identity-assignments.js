import { canonicalSemanticJson, deepFreeze, text } from '../../contracts/topo-enriched-xml/contract-core.js';
import { issue } from '../registry/registry-contracts.js';

const PROHIBITED_IDENTITY_FIELDS = new Set([
  'engineeringNodeNumber', 'nodeNumber', 'coordinate', 'coordinates', 'position',
  'distance', 'sourceOrder', 'writerOrder', 'arrayOrder', 'timestamp', 'evaluatedAt',
]);

export async function validateApprovedIdentityAssignments({
  assignments,
  acceptedMatches,
  seedLineHistories,
  approval,
}) {
  const blockers = [];
  const normalized = normalizeAssignments(assignments, blockers);
  const byLogical = new Map(), byHistory = new Map();
  const existingHistory = new Set(flattenHistoryNodes(seedLineHistories).map((row) => text(row.historyNodeId)));
  for (const assignment of normalized) {
    registerUnique(byLogical, assignment.logicalNodeId, assignment, 'BOOTSTRAP_IDENTITY_ASSIGNMENT_DUPLICATE', blockers);
    registerUnique(byHistory, assignment.historyNodeId, assignment, 'BOOTSTRAP_IDENTITY_ASSIGNMENT_DUPLICATE', blockers);
    validateAssignmentEvidence(assignment, approval, blockers);
    if (existingHistory.has(assignment.historyNodeId)) blockers.push(issue('BOOTSTRAP_IDENTITY_CONFLICT', {
      logicalNodeId: assignment.logicalNodeId, historyNodeId: assignment.historyNodeId,
      reason: 'NEW_ASSIGNMENT_REUSES_EXISTING_HISTORY_ID',
    }));
  }
  for (const [logicalNodeId, match] of acceptedMatches) {
    const assignment = byLogical.get(logicalNodeId);
    if (match.kind === 'NEW' && !assignment) blockers.push(issue('BOOTSTRAP_IDENTITY_ASSIGNMENT_MISSING', { logicalNodeId }));
    if (match.kind !== 'NEW' && assignment) blockers.push(issue('BOOTSTRAP_IDENTITY_CONFLICT', {
      logicalNodeId, historyNodeId: assignment.historyNodeId,
      acceptedHistoryNodeId: match.historyNodeId, reason: 'EXISTING_MATCH_MUST_RETAIN_HISTORY_ID',
    }));
  }
  for (const logicalNodeId of byLogical.keys()) if (!acceptedMatches.has(logicalNodeId)) blockers.push(issue('BOOTSTRAP_IDENTITY_CONFLICT', {
    logicalNodeId, reason: 'ASSIGNMENT_HAS_NO_ACCEPTED_MATCH_DISPOSITION',
  }));
  const assignmentHash = await sha256Canonical({ assignments: normalized });
  return deepFreeze({
    assignments: normalized,
    byLogical: Object.fromEntries([...byLogical].map(([key, value]) => [key, value])),
    assignmentHash,
    blockers: sortIssues(blockers),
  });
}

export function normalizeAssignments(assignments, blockers = []) {
  if (!Array.isArray(assignments)) {
    blockers.push(issue('BOOTSTRAP_IDENTITY_ASSIGNMENT_MISSING', { reason: 'ASSIGNMENT_SET_INVALID' }));
    return [];
  }
  return assignments.map((row) => normalizeAssignment(row, blockers)).sort(compareAssignment);
}

function normalizeAssignment(row, blockers) {
  const logicalNodeId = text(row?.logicalNodeId);
  const historyNodeId = text(row?.historyNodeId);
  const mainLineKey = text(row?.mainLineKey);
  const identityAuthority = text(row?.identityAuthority);
  const approvalRecordId = text(row?.approvalRecordId);
  const sourceAliases = normalizeAliases(row?.sourceAliases, logicalNodeId, blockers);
  const identityEvidence = normalizeEvidence(row?.identityEvidence, logicalNodeId, blockers);
  for (const key of Object.keys(row || {})) if (PROHIBITED_IDENTITY_FIELDS.has(key)) blockers.push(issue('BOOTSTRAP_IDENTITY_CONFLICT', {
    logicalNodeId, field: key, reason: 'IDENTITY_DERIVATION_FIELD_PROHIBITED',
  }));
  if (!logicalNodeId || !historyNodeId || !mainLineKey || !identityAuthority || !approvalRecordId) blockers.push(issue(
    'BOOTSTRAP_IDENTITY_ASSIGNMENT_MISSING', { logicalNodeId, historyNodeId, mainLineKey },
  ));
  return {
    logicalNodeId, historyNodeId, mainLineKey, identityAuthority,
    identityEvidence, sourceAliases, approvalRecordId,
  };
}

function normalizeAliases(values, logicalNodeId, blockers) {
  if (!Array.isArray(values) || !values.length) {
    blockers.push(issue('BOOTSTRAP_UNAPPROVED_ALIAS', { logicalNodeId, reason: 'SOURCE_ALIAS_REQUIRED' }));
    return [];
  }
  const aliases = values.map(text).filter(Boolean).sort();
  if (aliases.length !== values.length || new Set(aliases).size !== aliases.length) blockers.push(issue('BOOTSTRAP_UNAPPROVED_ALIAS', {
    logicalNodeId, reason: 'SOURCE_ALIAS_INVALID_OR_DUPLICATE',
  }));
  return aliases;
}

function normalizeEvidence(values, logicalNodeId, blockers) {
  if (!Array.isArray(values) || !values.length) {
    blockers.push(issue('BOOTSTRAP_IDENTITY_ASSIGNMENT_MISSING', { logicalNodeId, reason: 'IDENTITY_EVIDENCE_REQUIRED' }));
    return [];
  }
  const rows = values.map((row) => normalizeEvidenceRow(row, logicalNodeId, blockers));
  rows.sort((a, b) => canonicalSemanticJson(a).localeCompare(canonicalSemanticJson(b)));
  if (new Set(rows.map(canonicalSemanticJson)).size !== rows.length) blockers.push(issue('BOOTSTRAP_IDENTITY_CONFLICT', {
    logicalNodeId, reason: 'DUPLICATE_IDENTITY_EVIDENCE',
  }));
  return rows;
}

function normalizeEvidenceRow(row, logicalNodeId, blockers) {
  const normalized = {
    kind: text(row?.kind), value: text(row?.value), authority: text(row?.authority),
    approvalRecordId: text(row?.approvalRecordId),
  };
  if (!Object.values(normalized).every(Boolean)) blockers.push(issue('BOOTSTRAP_IDENTITY_ASSIGNMENT_MISSING', {
    logicalNodeId, reason: 'IDENTITY_EVIDENCE_INCOMPLETE', evidence: normalized,
  }));
  return normalized;
}

function validateAssignmentEvidence(assignment, approval, blockers) {
  if (assignment.approvalRecordId !== text(approval?.approvalRecordId)) blockers.push(issue('BOOTSTRAP_APPROVAL_SCOPE_MISMATCH', {
    logicalNodeId: assignment.logicalNodeId, field: 'approvalRecordId',
    expected: text(approval?.approvalRecordId), actual: assignment.approvalRecordId,
  }));
  for (const evidence of assignment.identityEvidence) {
    if (evidence.approvalRecordId !== assignment.approvalRecordId
      || evidence.authority !== assignment.identityAuthority) blockers.push(issue('BOOTSTRAP_IDENTITY_CONFLICT', {
      logicalNodeId: assignment.logicalNodeId, reason: 'IDENTITY_EVIDENCE_AUTHORITY_MISMATCH', evidence,
    }));
  }
}

function registerUnique(index, key, value, code, blockers) {
  if (!key || index.has(key)) blockers.push(issue(code, { key }));
  else index.set(key, value);
}
function flattenHistoryNodes(histories) {
  return (Array.isArray(histories) ? histories : []).flatMap((history) => history?.historyNodes || []);
}
async function sha256Canonical(value) {
  const bytes = new TextEncoder().encode(canonicalSemanticJson(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
function compareAssignment(a, b) { return a.mainLineKey.localeCompare(b.mainLineKey) || a.logicalNodeId.localeCompare(b.logicalNodeId); }
function issueKey(row) { return `${text(row?.code)}|${canonicalSemanticJson(row?.evidence || {})}`; }
function sortIssues(rows) { return [...rows].sort((a, b) => issueKey(a).localeCompare(issueKey(b))); }
