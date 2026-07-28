import { canonicalJson } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';

export function compareText(left, right) {
  const a = String(left), b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortedUnique(values) {
  return [...new Set(values)].sort(compareText);
}

export async function domainId(prefix, domain, payload) {
  const digest = await sha256Hex(`${domain}\0${canonicalJson(payload)}`);
  return `${prefix}:${digest}`;
}

export async function profileSha256(profile) {
  return sha256Hex(`fbx-support-profile/v1\0${canonicalJson(profile)}`);
}

export async function candidateId(input) {
  return domainId('fbx-support-candidate', 'fbx-support-candidate/v1', input);
}

export async function assemblyId(input) {
  return domainId('fbx-support-assembly', 'fbx-support-assembly/v1', input);
}

export async function hostAssociationId(input) {
  return domainId('fbx-support-host-association', 'fbx-support-host-association/v1', input);
}

export async function supportId(input) {
  return domainId('fbx-support', 'fbx-support/v1', input);
}

export async function supportArtifactId(input) {
  return domainId('fbx-support-evidence', 'FbxSupportEvidence.v1/artifact', input);
}

export async function packageContentDigest(input) {
  return sha256Hex(`FbxSelectedZoneEngineeringPackage.v1/content\0${canonicalJson(input)}`);
}

export async function packageId(digest) {
  return domainId('fbx-selected-zone-engineering-package',
    'FbxSelectedZoneEngineeringPackage.v1/package', { packageDigest: digest });
}
