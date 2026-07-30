import { validateSupportCandidateEvidence } from './support-evidence.js';
import { fail } from './constants.js';

function recordsByRole(audit, role) {
  return audit.files.filter((record) => record.role === role);
}

function parsedJsonFile(files, path, code, label) {
  try {
    const value = JSON.parse(new TextDecoder().decode(files.get(path).bytes));
    if (!value || typeof value !== 'object') throw new Error(`${label} root is invalid.`);
    return value;
  } catch (error) {
    fail(code, `${label} is invalid JSON: ${error?.message || error}`);
  }
}

export async function verifyPackagedSupportAndStage(audit, manifest, files) {
  const staged = recordsByRole(audit, 'STAGEDJSON')[0];
  if (staged.disposition === 'PRESENT') {
    parsedJsonFile(files, staged.path, 'ZONE_PACKAGE_INVALID_STAGEDJSON', 'StagedJSON');
  }
  const support = recordsByRole(audit, 'SUPPORT_EVIDENCE')[0];
  if (support.disposition !== 'PRESENT') return null;
  const evidence = parsedJsonFile(files, support.path,
    'ZONE_PACKAGE_INVALID_SUPPORT_EVIDENCE', 'support evidence');
  await validateSupportCandidateEvidence(evidence);
  if (evidence.selectedZoneDigest !== manifest.selectedZoneDigest) {
    fail('ZONE_PACKAGE_INVALID_SUPPORT_EVIDENCE',
      'support evidence differs from the selected manifest.');
  }
  return evidence;
}

function supportBindingValid(root, supportEvidence) {
  const check = root?.checks?.find((item) => item.code === 'SUPPORT_EVIDENCE_BINDING');
  return check?.status === 'PASS' && supportEvidence
    && check.evidence?.supportEvidenceDigest === supportEvidence.evidenceDigest
    && check.evidence?.candidateCount === supportEvidence.candidates.length;
}

function hostBindingValid(root, supportEvidence, hostEvidence, manifest) {
  const check = root?.checks?.find((item) => (
    item.code === 'SUPPORT_HOST_ASSOCIATION_BINDING'
  ));
  const expectedStatus = hostEvidence?.status === 'PASS' ? 'PASS' : 'BLOCKED';
  return hostEvidence && check?.status === expectedStatus
    && hostEvidence.selectedZoneDigest === manifest.selectedZoneDigest
    && hostEvidence.sourceSupportEvidenceDigest === supportEvidence?.evidenceDigest
    && hostEvidence.sourceSupportCandidateCount === supportEvidence?.candidates?.length
    && check.evidence?.supportHostEvidenceDigest === hostEvidence.evidenceDigest
    && check.evidence?.supportHostStatus === hostEvidence.status
    && check.evidence?.candidateCount === hostEvidence.counts.candidateCount;
}

export function verifyQualifiedSupportBindings(root, supportEvidence, hostEvidence, manifest) {
  if (!root) return;
  if (!supportBindingValid(root, supportEvidence)) {
    fail('ZONE_PACKAGE_INVALID_QUALIFICATION',
      'qualification root support binding differs from support-evidence.json.');
  }
  if (!hostBindingValid(root, supportEvidence, hostEvidence, manifest)) {
    fail('ZONE_PACKAGE_INVALID_QUALIFICATION',
      'qualification root host binding differs from support-host-associations.json.');
  }
}
