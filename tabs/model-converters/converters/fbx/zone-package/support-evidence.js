import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { FBX_ZONE_PACKAGE_SCHEMAS, fail } from './constants.js';

const HASH = /^[0-9a-f]{64}$/;
const CANDIDATE_RAW_TYPES = Object.freeze(['ATTA', 'SUPPORT']);

function nonEmptyText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function candidateRawType(record) {
  const attributes = isObject(record?.attributes) ? record.attributes : {};
  const raw = nonEmptyText(attributes.RAW_TYPE) || nonEmptyText(attributes.TYPE) || nonEmptyText(record?.type);
  return raw ? raw.trim().toUpperCase() : null;
}

function candidateIdentity(record) {
  const attributes = isObject(record?.attributes) ? record.attributes : {};
  return {
    tag: nonEmptyText(attributes.SUPPORT_TAG) || nonEmptyText(attributes.CMPSUPREFN),
    reference: nonEmptyText(attributes.REF),
    name: nonEmptyText(attributes.NAME) || nonEmptyText(record?.name),
  };
}

async function buildCandidate(occurrenceId, record) {
  const identity = candidateIdentity(record);
  const identified = Boolean(identity.tag || identity.reference || identity.name);
  const candidateId = (await sha256Hex(canonicalJson({ occurrenceId }))).slice(0, 32);
  return {
    candidateId,
    occurrenceId,
    sourceIdentity: identity,
    disposition: identified ? 'GENERIC_SUPPORT' : 'UNCLASSIFIED_SUPPORT',
    dispositionReason: identified
      ? 'CANDIDATE_HAS_IDENTITY_EVIDENCE'
      : 'CANDIDATE_MISSING_IDENTITY_EVIDENCE',
  };
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Phase 3: identifies support candidates within a selected zone from raw
 * StagedJSON-shaped records and assigns each an explicit, closed
 * GENERIC_SUPPORT / UNCLASSIFIED_SUPPORT disposition. Deliberately does not
 * classify REST/GUIDE/LINE_STOP kind, restraint DOFs, or a host — those
 * require owner-reviewed authority not available at this layer (Phase 4+).
 */
export async function buildSupportCandidateEvidence({ selectedZoneDigest, occurrences } = {}) {
  if (typeof selectedZoneDigest !== 'string' || !HASH.test(selectedZoneDigest)) {
    fail('ZONE_PACKAGE_INVALID_IDENTITY', 'selectedZoneDigest must be a SHA-256 hex digest.');
  }
  if (!Array.isArray(occurrences)) fail('ZONE_PACKAGE_INVALID_INPUT', 'occurrences must be an array.');
  const seen = new Set();
  const eligible = occurrences.filter((occurrence) => {
    const occurrenceId = occurrence?.occurrenceId;
    if (typeof occurrenceId !== 'string' || !occurrenceId.trim()) fail('ZONE_PACKAGE_INVALID_IDENTITY', 'occurrenceId must be non-empty text.');
    if (!CANDIDATE_RAW_TYPES.includes(candidateRawType(occurrence?.record))) return false;
    if (seen.has(occurrenceId)) fail('ZONE_PACKAGE_DUPLICATE_OCCURRENCE', `duplicate occurrenceId ${occurrenceId}.`);
    seen.add(occurrenceId);
    return true;
  });
  const candidates = await Promise.all(eligible.map((occurrence) => buildCandidate(occurrence.occurrenceId, occurrence.record)));
  candidates.sort((left, right) => compareText(left.candidateId, right.candidateId));
  const payload = { schema: FBX_ZONE_PACKAGE_SCHEMAS.supportEvidence, selectedZoneDigest, candidates };
  const evidenceDigest = await sha256Hex(canonicalJson(payload));
  return deepFreeze({ ...payload, evidenceDigest });
}
