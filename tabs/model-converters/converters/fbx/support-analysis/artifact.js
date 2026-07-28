import { deepFreeze } from '../canonical-json.js';
import { supportArtifactId } from './identity.js';
import { FBX_SUPPORT_SCHEMA } from './profile.js';

function counts(dispositions, supports, hosts, selectedOccurrenceCount) {
  const count = (terminal) => dispositions.filter((item) => item.terminalDisposition === terminal).length;
  const hosted = supports.filter((item) => item.hostAssociation.outcome
    === 'SINGLE_HOST_PROVED' || item.hostAssociation.outcome === 'MULTI_HOST_PROVED').length;
  return Object.freeze({
    selectedOccurrenceCount,
    inventoryCount: dispositions.length,
    candidateCount: dispositions.filter((item) => item.inventoryDisposition
      === 'POSSIBLE_SUPPORT_CANDIDATE').length,
    admittedSupportCount: supports.length,
    rejectedCandidateCount: count('SUPPORT_CANDIDATE_REJECTED'),
    ambiguousCandidateCount: count('SUPPORT_CANDIDATE_AMBIGUOUS'),
    contextOnlyCount: count('CONTEXT_ONLY'),
    notSupportEvidenceCount: count('NOT_SUPPORT_EVIDENCE'),
    hostAssociationCount: hosts.length,
    hostedSupportCount: hosted,
    unhostedSupportCount: dispositions.filter((item) => item.hostDisposition === 'HOST_NOT_FOUND').length,
  });
}

export async function buildSupportArtifact(input) {
  const conservation = counts(input.candidateDispositions, input.admittedSupports,
    input.hostAssociations, input.zoneGeometryEvidence.conservation.selectedOccurrenceCount);
  const core = {
    schema: FBX_SUPPORT_SCHEMA,
    sourceIdentity: structuredClone(input.zoneGeometryEvidence.sourceIdentity),
    parserIdentity: structuredClone(input.zoneGeometryEvidence.parserIdentity),
    sourceGraphSha256: input.zoneGeometryEvidence.sourceGraphSha256,
    geometryBundleDigest: input.zoneGeometryEvidence.geometryBundleDigest,
    sourceZoneGeometryArtifactId: input.zoneGeometryEvidence.artifactId,
    selectedZone: structuredClone(input.zoneGeometryEvidence.selectedZone),
    analysisProfile: structuredClone(input.profile),
    analysisProfileSha256: input.profileSha256,
    candidateDispositions: structuredClone(input.candidateDispositions),
    admittedSupports: structuredClone(input.admittedSupports),
    rejectedCandidates: structuredClone(input.candidateDispositions.filter((item) => (
      item.terminalDisposition === 'SUPPORT_CANDIDATE_REJECTED'))),
    ambiguousCandidates: structuredClone(input.candidateDispositions.filter((item) => (
      item.terminalDisposition === 'SUPPORT_CANDIDATE_AMBIGUOUS'))),
    hostAssociations: structuredClone(input.hostAssociations),
    conservation,
    releaseDisposition: {
      analysisStatus: input.blockStatus || 'SUPPORT_ANALYSIS_PASS',
      evidenceStatus: 'SUPPORT_EVIDENCE_PASS',
      blockStatus: input.blockStatus,
      complete: true,
    },
  };
  const artifactId = await supportArtifactId(core);
  return deepFreeze({ schema: core.schema, artifactId, ...Object.fromEntries(
    Object.entries(core).filter(([key]) => key !== 'schema')) });
}
