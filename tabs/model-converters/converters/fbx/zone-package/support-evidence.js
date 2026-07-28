import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { FBX_ZONE_PACKAGE_SCHEMAS, fail } from './constants.js';

const HASH = /^[0-9a-f]{64}$/;
const CANDIDATE_RAW_TYPES = Object.freeze(['ATTA', 'SUPPORT']);
function nonEmptyText(value) { if (typeof value !== 'string') return null; const text = value.trim(); return text || null; }
function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function candidateRawType(record) {
  const attributes = isObject(record?.attributes) ? record.attributes : {};
  const raw = nonEmptyText(attributes.RAW_TYPE) || nonEmptyText(attributes.TYPE) || nonEmptyText(record?.type);
  return raw ? raw.toUpperCase() : null;
}
function candidateIdentity(record) {
  const attributes = isObject(record?.attributes) ? record.attributes : {};
  return { tag: nonEmptyText(attributes.SUPPORT_TAG) || nonEmptyText(attributes.CMPSUPREFN),
    reference: nonEmptyText(attributes.REF), name: nonEmptyText(attributes.NAME) || nonEmptyText(record?.name) };
}
async function buildCandidate(selectedZoneDigest, occurrenceId, record) {
  const sourceIdentity = candidateIdentity(record), rawType = candidateRawType(record);
  const candidateId = (await sha256Hex(canonicalJson({ selectedZoneDigest, occurrenceId, rawType, sourceIdentity }))).slice(0, 32);
  const identified = Boolean(sourceIdentity.tag || sourceIdentity.reference || sourceIdentity.name);
  return { candidateId, occurrenceId, rawType, sourceIdentity,
    disposition: identified ? 'GENERIC_SUPPORT' : 'UNCLASSIFIED_SUPPORT',
    dispositionReason: identified ? 'CANDIDATE_HAS_IDENTITY_EVIDENCE' : 'CANDIDATE_MISSING_IDENTITY_EVIDENCE' };
}
function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
export async function buildSupportCandidateEvidence({ selectedZoneDigest, occurrences } = {}) {
  if (typeof selectedZoneDigest !== 'string' || !HASH.test(selectedZoneDigest)) {
    fail('ZONE_PACKAGE_INVALID_IDENTITY', 'selectedZoneDigest must be a SHA-256 hex digest.');
  }
  if (!Array.isArray(occurrences)) fail('ZONE_PACKAGE_INVALID_INPUT', 'occurrences must be an array.');
  const seenOccurrences = new Set();
  const eligible = occurrences.filter((occurrence) => {
    const occurrenceId = String(occurrence?.occurrenceId || '').trim();
    if (!occurrenceId) fail('ZONE_PACKAGE_INVALID_IDENTITY', 'occurrenceId must be non-empty text.');
    if (seenOccurrences.has(occurrenceId)) fail('ZONE_PACKAGE_DUPLICATE_OCCURRENCE', `duplicate occurrenceId ${occurrenceId}.`);
    seenOccurrences.add(occurrenceId);
    return CANDIDATE_RAW_TYPES.includes(candidateRawType(occurrence?.record));
  });
  const candidates = await Promise.all(eligible.map((occurrence) => buildCandidate(
    selectedZoneDigest, String(occurrence.occurrenceId).trim(), occurrence.record)));
  const seenCandidates = new Set();
  for (const candidate of candidates) {
    if (seenCandidates.has(candidate.candidateId)) fail('ZONE_PACKAGE_CANDIDATE_COLLISION', `candidateId collision ${candidate.candidateId}.`);
    seenCandidates.add(candidate.candidateId);
  }
  candidates.sort((left, right) => compareText(left.candidateId, right.candidateId));
  const payload = { schema: FBX_ZONE_PACKAGE_SCHEMAS.supportEvidence, selectedZoneDigest, candidates };
  return deepFreeze({ ...payload, evidenceDigest: await sha256Hex(canonicalJson(payload)) });
}
