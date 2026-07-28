import { derivePipeConnectivity } from './connectivity.js';
import { AUTO_PIPE_CONNECTIVITY_PROFILE, AUTO_PIPE_PROFILE } from './profile.js';
import {
  compareOccurrenceId, deterministicId, profileHash, splitEndpoint,
} from './identity.js';

function requireAdmitted(classifications) {
  if (!classifications.length || classifications.some((item) => !item.admitted)) {
    throw new Error('BLOCKED_AUTO_PIPE_CLASSIFICATION selected scope is not fully PIPE-admitted.');
  }
}

async function identityRecord(classification, source) {
  const basis = {
    sourceZoneGeometryArtifactId: source.zoneArtifactId,
    sourceDerivedPortArtifactId: source.portArtifactId,
    sourceOccurrenceId: classification.sourceOccurrenceId,
    geometryObjectId: classification.geometryObjectId,
  };
  return {
    mappingEntryId: await deterministicId('auto-pipe-entry', 'FbxAutoPipeEntry.v1', basis),
    logicalComponentId: await deterministicId('FBX-PIPE', 'FbxAutoPipeComponent.v1', basis),
  };
}

async function portRecord(role, candidate, entryIdentity) {
  const basis = {
    mappingEntryId: entryIdentity.mappingEntryId,
    role,
    sourcePortEvidenceId: candidate.portEvidenceId,
  };
  return {
    portId: await deterministicId(`auto-pipe-port-${role}`, 'FbxAutoPipePort.v1', basis),
    role,
    sourcePortEvidenceId: candidate.portEvidenceId,
    boundaryLoopId: candidate.boundaryLoopId,
    geometryObjectId: candidate.geometryObjectId,
    centreMm: [...candidate.centreMm],
    normal: [...candidate.normal],
    radiusMm: candidate.radiusMm,
    diameterMm: candidate.diameterMm,
    connections: [],
  };
}

async function entryRecord(classification, source) {
  const identity = await identityRecord(classification, source);
  const ports = {
    A: await portRecord('A', classification.A, identity),
    L: await portRecord('L', classification.L, identity),
  };
  return {
    ...identity,
    sourceModelObjectId: classification.sourceModelObjectId,
    sourceOccurrenceId: classification.sourceOccurrenceId,
    sourceGeometryObjectIds: [classification.geometryObjectId],
    componentType: 'PIPE',
    scopeDisposition: 'promote',
    engineering: {},
    ports,
  };
}

function connectivityPorts(entries) {
  return entries.flatMap((entry) => ['A', 'L'].map((role) => ({
    componentId: entry.mappingEntryId,
    portId: entry.ports[role].portId,
    centreMm: entry.ports[role].centreMm,
    normal: entry.ports[role].normal,
    radiusMm: entry.ports[role].radiusMm,
  })));
}

function connectionMap(links) {
  const result = new Map();
  for (const link of links) {
    const [left, right] = link.endpoints.map(splitEndpoint);
    result.set(link.endpoints[0], [right]);
    result.set(link.endpoints[1], [left]);
  }
  return result;
}

function attachConnections(entries, links) {
  const byEndpoint = connectionMap(links);
  return entries.map((entry) => ({
    ...entry,
    ports: Object.fromEntries(['A', 'L'].map((role) => {
      const port = entry.ports[role], key = `${entry.mappingEntryId}:${port.portId}`;
      return [role, { ...port, connections: byEndpoint.get(key) || [] }];
    })),
  }));
}

async function linkRecords(links) {
  return Promise.all(links.map(async (link) => ({
    linkId: await deterministicId('auto-pipe-link', 'FbxAutoPipeLink.v1', link.endpoints),
    pairKey: link.pairKey,
    endpoints: [...link.endpoints],
  })));
}

function occurrenceDispositions(classifications) {
  return classifications.map((item) => ({
    sourceOccurrenceId: item.sourceOccurrenceId,
    sourceModelObjectId: item.sourceModelObjectId,
    geometryObjectId: item.geometryObjectId,
    disposition: 'PIPE_ADMITTED',
    status: item.status,
  }));
}

export async function buildInternalPipeMapping({
  zoneGeometryEvidence, derivedPortEvidence, classifications,
  classificationProfile = AUTO_PIPE_PROFILE,
  connectivityProfile = AUTO_PIPE_CONNECTIVITY_PROFILE,
}) {
  requireAdmitted(classifications);
  const ordered = [...classifications].sort((a, b) => compareOccurrenceId(
    a.sourceOccurrenceId, b.sourceOccurrenceId));
  const source = {
    zoneArtifactId: zoneGeometryEvidence.artifactId,
    portArtifactId: derivedPortEvidence.artifactId,
  };
  let entries = await Promise.all(ordered.map((item) => entryRecord(item, source)));
  const rawLinks = derivePipeConnectivity(connectivityPorts(entries), connectivityProfile);
  entries = attachConnections(entries, rawLinks);
  const links = await linkRecords(rawLinks);
  const core = {
    schema: 'FbxInternalPipeMapping.v1',
    authorityDisposition: 'INTERNAL_DERIVED_ONLY',
    publicMappingDisposition: 'NOT_FBX_STAGED_MAPPING',
    sourceIdentity: structuredClone(zoneGeometryEvidence.sourceIdentity),
    parserIdentity: structuredClone(zoneGeometryEvidence.parserIdentity),
    sourceGraphSha256: zoneGeometryEvidence.sourceGraphSha256,
    sourceZoneGeometryArtifactId: zoneGeometryEvidence.artifactId,
    sourceDerivedPortArtifactId: derivedPortEvidence.artifactId,
    selectedZone: { zoneId: zoneGeometryEvidence.selectedZone.zoneId },
    classificationProfile: structuredClone(classificationProfile),
    classificationProfileSha256: await profileHash(classificationProfile),
    connectivityProfile: structuredClone(connectivityProfile),
    connectivityProfileSha256: await profileHash(connectivityProfile),
    occurrenceDispositions: occurrenceDispositions(ordered),
    entries,
    links,
    conservation: {
      selectedOccurrenceCount: ordered.length,
      dispositionCount: ordered.length,
      admittedPipeCount: entries.length,
      rejectedOccurrenceCount: 0,
      portCount: entries.length * 2,
      linkCount: links.length,
      openPortCount: entries.length * 2 - links.length * 2,
    },
    releaseDisposition: 'PIPE_ONLY_RELEASED',
  };
  const artifactId = await deterministicId(
    'fbx-internal-pipe-mapping', 'FbxInternalPipeMapping.v1', core);
  return Object.freeze({ artifactId, ...core });
}
