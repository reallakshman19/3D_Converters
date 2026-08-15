import { buildAivMasterEvidence } from '../converters/vibration/aiv/aiv-master-evidence.js';

export const AIV_MASTER_ACCEPTANCE_SCHEMA = 'AivMasterAcceptance.v1';

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function acceptanceKey(resolution) {
  const evidence = buildAivMasterEvidence(resolution);
  return evidence?.records?.length ? JSON.stringify(evidence.records) : null;
}

export function aivMasterAcceptanceRequired(resolution) {
  return Boolean(acceptanceKey(resolution));
}

export function aivMasterResolutionFingerprint(resolution) {
  const key = acceptanceKey(resolution);
  return key ? `fnv1a32:${fnv1a32(key)}` : null;
}

export function createAivMasterAcceptance(resolution) {
  const key = acceptanceKey(resolution);
  if (!key) return null;
  const evidence = buildAivMasterEvidence(resolution);
  return Object.freeze({
    schema: AIV_MASTER_ACCEPTANCE_SCHEMA,
    key,
    fingerprint: `fnv1a32:${fnv1a32(key)}`,
    fieldCount: evidence.records.length,
    reviewDisposition: 'USER_REVIEWED_REFERENCE_INPUT',
    masterEngineeringQualification: 'NOT_ESTABLISHED_BY_ADAPTER',
    screeningAuthorityConferredByMaster: false,
    designAuthority: false,
  });
}

export function isAivMasterAcceptanceCurrent(resolution, acceptance) {
  if (!aivMasterAcceptanceRequired(resolution)) return true;
  if (acceptance?.schema !== AIV_MASTER_ACCEPTANCE_SCHEMA) return false;
  return acceptance.key === acceptanceKey(resolution);
}
