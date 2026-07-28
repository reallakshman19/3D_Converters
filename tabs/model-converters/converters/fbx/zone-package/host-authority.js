import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { FBX_ZONE_PACKAGE_SCHEMAS, fail } from './constants.js';

const CANDIDATE_ID = /^[0-9a-f]{32}$/;
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function nonEmptyText(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail('ZONE_PACKAGE_INVALID_REVIEW', `${label} must be non-empty text.`);
  return value;
}

function validateHostOccurrenceIds(value, label) {
  if (!Array.isArray(value) || !value.length) fail('ZONE_PACKAGE_INVALID_REVIEW', `${label} must be a non-empty array.`);
  const ids = value.map((item, index) => nonEmptyText(item, `${label}[${index}]`));
  if (new Set(ids).size !== ids.length) fail('ZONE_PACKAGE_INVALID_REVIEW', `${label} contains duplicate host occurrence ids.`);
  return ids;
}

function validateReviewEntry(entry, candidateId) {
  if (!entry || typeof entry !== 'object') fail('ZONE_PACKAGE_INVALID_REVIEW', `owner mapping entry for ${candidateId} must be an object.`);
  if (entry.status !== 'APPROVED') fail('ZONE_PACKAGE_INVALID_REVIEW', `owner mapping entry for ${candidateId} must have status APPROVED.`);
  const reviewedBy = nonEmptyText(entry.reviewedBy, `${candidateId}.reviewedBy`);
  if (typeof entry.reviewedAt !== 'string' || !ISO_8601.test(entry.reviewedAt)) {
    fail('ZONE_PACKAGE_INVALID_REVIEW', `${candidateId}.reviewedAt must be an ISO-8601 UTC timestamp.`);
  }
  const ambiguous = entry.ambiguous === true;
  const hostOccurrenceIds = validateHostOccurrenceIds(entry.hostOccurrenceIds, `${candidateId}.hostOccurrenceIds`);
  return {
    candidateId, hostOccurrenceIds, multiHost: hostOccurrenceIds.length > 1, ambiguous, reviewedBy, reviewedAt: entry.reviewedAt,
  };
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Phase 4: binds Phase 3 support candidates to a host occurrence using only
 * an owner-reviewed external mapping keyed by exact candidateId. There is no
 * proximity/nearest-geometry fallback of any kind. A candidate missing from
 * the mapping, or explicitly flagged ambiguous by the reviewer, blocks the
 * overall binding status rather than being silently resolved.
 */
export async function buildHostAuthorityBinding({ supportEvidence, ownerMapping } = {}) {
  if (!supportEvidence || supportEvidence.schema !== FBX_ZONE_PACKAGE_SCHEMAS.supportEvidence) {
    fail('ZONE_PACKAGE_INVALID_INPUT', 'supportEvidence must be a validated FbxSupportEvidence.v1.');
  }
  if (!ownerMapping || typeof ownerMapping !== 'object' || Array.isArray(ownerMapping)) {
    fail('ZONE_PACKAGE_INVALID_INPUT', 'ownerMapping must be an object keyed by candidateId.');
  }
  const bindings = [];
  const unresolvedCandidateIds = [];
  const ambiguousCandidateIds = [];
  for (const candidate of supportEvidence.candidates) {
    if (!CANDIDATE_ID.test(candidate.candidateId)) fail('ZONE_PACKAGE_INVALID_IDENTITY', 'candidateId is malformed.');
    const entry = Object.hasOwn(ownerMapping, candidate.candidateId) ? ownerMapping[candidate.candidateId] : undefined;
    if (entry === undefined) {
      unresolvedCandidateIds.push(candidate.candidateId);
      continue;
    }
    const binding = validateReviewEntry(entry, candidate.candidateId);
    if (binding.ambiguous) ambiguousCandidateIds.push(candidate.candidateId);
    bindings.push(binding);
  }
  bindings.sort((left, right) => compareText(left.candidateId, right.candidateId));
  unresolvedCandidateIds.sort(compareText);
  ambiguousCandidateIds.sort(compareText);
  const status = unresolvedCandidateIds.length === 0 && ambiguousCandidateIds.length === 0 ? 'BOUND' : 'BLOCKED';
  const payload = {
    schema: FBX_ZONE_PACKAGE_SCHEMAS.hostAuthorityBinding,
    selectedZoneDigest: supportEvidence.selectedZoneDigest,
    status,
    bindings,
    unresolvedCandidateIds,
    ambiguousCandidateIds,
  };
  const bindingDigest = await sha256Hex(canonicalJson(payload));
  return deepFreeze({ ...payload, bindingDigest });
}
