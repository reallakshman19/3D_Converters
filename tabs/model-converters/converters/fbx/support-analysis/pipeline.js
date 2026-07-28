import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { buildSupportAssemblies } from './assembly.js';
import { buildSupportArtifact } from './artifact.js';
import { inventorySupportCandidates } from './candidate-inventory.js';
import { releaseBlock, terminalForGeometry, terminalForHost, terminalForInventory } from './classification.js';
import { analyseCandidateGeometry } from './geometry-analysis.js';
import { associateAssemblyHosts, witnessMedoid } from './host-association.js';
import { assemblyId, candidateId, hostAssociationId, profileSha256, sortedUnique, supportId } from './identity.js';
import { FBX_SUPPORT_PROFILE } from './profile.js';


async function validateSourceGraphBinding(zoneGeometryEvidence, sourceGraph) {
  if (!sourceGraph) return;
  if (!Array.isArray(sourceGraph.sourceObjects)) {
    throw new Error('BLOCKED_SUPPORT_BINDING source graph object evidence is unavailable.');
  }
  const digest = await sha256Hex(canonicalJson(sourceGraph));
  if (digest !== zoneGeometryEvidence.sourceGraphSha256) {
    throw new Error('BLOCKED_SUPPORT_BINDING source graph digest differs from zone evidence.');
  }
}

function validateHostBindings(zoneGeometryEvidence, pipeClassifications) {
  const occurrences = new Map(zoneGeometryEvidence.occurrenceEvidence.map((item) => (
    [item.sourceOccurrenceId, item]
  )));
  for (const classification of pipeClassifications.filter((item) => item?.admitted)) {
    const occurrence = occurrences.get(classification.sourceOccurrenceId);
    if (!occurrence || !occurrence.geometryObjectIds.includes(classification.geometryObjectId)
      || occurrence.sourceModelObjectId !== classification.sourceModelObjectId) {
      throw new Error('BLOCKED_SUPPORT_BINDING admitted PIPE host does not bind to selected-zone evidence.');
    }
  }
}

function geometryIds(item) {
  return sortedUnique(item.occurrence.geometryObjectIds || []);
}

async function attachCandidateIds(inventory, zoneGeometryEvidence, digest) {
  return Promise.all(inventory.map(async (item) => Object.freeze({ ...item, candidateId: await candidateId({
    sourceSha256: zoneGeometryEvidence.sourceIdentity.sha256,
    sourceZoneGeometryArtifactId: zoneGeometryEvidence.artifactId,
    sourceOccurrenceId: item.occurrence.sourceOccurrenceId,
    sourceGeometryObjectIds: geometryIds(item),
    analysisProfileSha256: digest,
  }) })));
}

function dispositionRecord(item, terminal, analysis = null) {
  return Object.freeze({
    candidateId: item.candidateId,
    sourceOccurrenceId: item.occurrence.sourceOccurrenceId,
    sourceModelObjectId: item.occurrence.sourceModelObjectId,
    sourceGeometryObjectIds: Object.freeze(geometryIds(item)),
    inventoryDisposition: item.inventoryDisposition,
    terminalDisposition: terminal.terminalDisposition,
    geometryDisposition: analysis?.geometryDisposition || 'NOT_APPLICABLE',
    hostDisposition: terminal.hostDisposition,
    classificationReasons: Object.freeze([...terminal.reasons]),
  });
}

function candidateForMember(member, candidates) {
  return candidates.find((item) => item.occurrence.sourceOccurrenceId
    === member.item.occurrence.sourceOccurrenceId);
}

async function attachAssemblyIdentity(assembly, candidates, zoneGeometryEvidence) {
  const candidateIds = assembly.members.map((member) => candidateForMember(member, candidates).candidateId).sort();
  return Object.freeze({ ...assembly, candidateIds: Object.freeze(candidateIds),
    supportAssemblyId: await assemblyId({ sourceZoneGeometryArtifactId: zoneGeometryEvidence.artifactId,
      candidateIds }) });
}

function contactEvidence(association) {
  return association.contactRegions.map((region) => ({
    sourcePolygonKey: region.polygonKey,
    sourceVertexIndices: [...region.sourceVertexIndices],
    candidateWitnessesMm: structuredClone(region.candidateWitnessesMm),
    pipeSurfaceWitnessesMm: structuredClone(region.pipeSurfaceWitnessesMm),
    pipeCentrelineWitnessesMm: structuredClone(region.pipeCentrelineWitnessesMm),
    maximumSurfaceDistanceMm: region.maximumSurfaceDistanceMm,
    normalRadialCosine: region.normalRadialCosine,
  }));
}

async function identifiedHost(assembly, association) {
  const classification = association.classification;
  const core = {
    supportAssemblyId: assembly.supportAssemblyId,
    hostPipeOccurrenceId: classification.sourceOccurrenceId,
    hostPipeSourceModelObjectId: classification.sourceModelObjectId,
    hostPipeGeometryObjectId: classification.geometryObjectId,
    contactRegions: contactEvidence(association),
  };
  return Object.freeze({ hostAssociationId: await hostAssociationId(core), ...core,
    pipeOutsideRadiusMm: association.pipe.radius, pipeAxis: [...association.pipe.axis],
    axialOverlapMm: association.axialOverlapMm, clearanceMm: association.clearanceMm });
}

function assemblySources(assembly) {
  return {
    sourceOccurrenceId: assembly.members[0].item.occurrence.sourceOccurrenceId,
    sourceModelObjectId: assembly.members[0].item.occurrence.sourceModelObjectId,
    sourceOccurrenceIds: sortedUnique(assembly.members.map((member) => (
      member.item.occurrence.sourceOccurrenceId))),
    sourceModelObjectIds: sortedUnique(assembly.members.map((member) => (
      member.item.occurrence.sourceModelObjectId))),
    sourceGeometryObjectIds: sortedUnique(assembly.members.flatMap((member) => (
      member.item.occurrence.geometryObjectIds || []))),
  };
}

function propertySnapshot(sourceObject) {
  return Object.freeze({
    sourceObjectId: sourceObject.sourceObjectId,
    displayName: String(sourceObject.displayName || ''),
    domSourceName: String(sourceObject.domSourceName || ''),
    domClass: String(sourceObject.domClass || ''),
    domSubtype: String(sourceObject.domSubtype || ''),
    customProperties: Object.freeze((sourceObject.customProperties || []).map((property) => Object.freeze({
      name: String(property.name || ''), type: Number(property.type || 0),
      flags: Number(property.flags || 0), valueInt: Number(property.valueInt || 0),
      valueReal: Number(property.valueReal || 0),
      valueVec4: Object.freeze([...(property.valueVec4 || [0, 0, 0, 0])]),
      valueString: String(property.valueString || ''),
    }))),
  });
}

function sourceEvidence(source, sourceGraph) {
  const byId = new Map((sourceGraph?.sourceObjects || []).map((item) => [item.sourceObjectId, item]));
  const properties = source.sourceModelObjectIds.map((id) => byId.get(id)).filter(Boolean)
    .map(propertySnapshot).sort((left, right) => left.sourceObjectId < right.sourceObjectId ? -1 : 1);
  const tags = [];
  for (const item of properties) for (const field of ['displayName', 'domSourceName', 'domClass', 'domSubtype']) {
    if (/support|rest|guide|stop|shoe|clamp|hanger|frame/i.test(item[field])) tags.push(Object.freeze({
      sourceObjectId: item.sourceObjectId, field, value: item[field], authority: 'NON_AUTHORITATIVE',
    }));
  }
  tags.sort((left, right) => {
    const a = `${left.sourceObjectId}|${left.field}|${left.value}`;
    const b = `${right.sourceObjectId}|${right.field}|${right.value}`;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return { properties: Object.freeze(properties), tags: Object.freeze(tags) };
}

async function admittedSupport(assembly, hostResult, identifiedHosts, profile, sourceGraph) {
  const source = assemblySources(assembly), evidence = sourceEvidence(source, sourceGraph);
  const hostIds = identifiedHosts.map((item) => item.hostAssociationId).sort();
  const id = await supportId({ supportAssemblyId: assembly.supportAssemblyId,
    supportClass: 'GENERIC_SUPPORT', hostAssociationIds: hostIds });
  const axial = identifiedHosts.map((item) => item.pipeAxis);
  return Object.freeze({
    supportId: id,
    supportAssemblyId: assembly.supportAssemblyId,
    candidateIds: [...assembly.candidateIds],
    ...source,
    supportClass: 'GENERIC_SUPPORT',
    supportSubtypeDisposition: 'NOT_EVALUATED',
    supportTagEvidence: evidence.tags,
    worldPositionMm: witnessMedoid(hostResult.associations),
    positionAuthority: 'CONTACT_WITNESS_MEDOID',
    orientationEvidence: Object.freeze({ supportLocalVertical: [...profile.worldUp],
      pipeAxialDirections: axial, restraintDirection: null,
      supportBaseNormal: null, supportFrameAxes: structuredClone(assembly.principalAxes) }),
    boundingEvidence: structuredClone(assembly.boundingEvidence),
    contactEvidence: identifiedHosts.flatMap((item) => item.contactRegions),
    hostAssociation: Object.freeze({ outcome: hostResult.outcome,
      hostAssociationIds: hostIds,
      hostPipeOccurrenceIds: identifiedHosts.map((item) => item.hostPipeOccurrenceId).sort() }),
    hostAssociationConfidenceClass: 'GEOMETRICALLY_PROVED',
    sourcePropertyEvidence: evidence.properties,
    geometryEvidence: Object.freeze({ connectedShellCount: assembly.members.reduce((sum, member) => (
      sum + member.shellCount), 0), sourceOccurrenceCount: assembly.members.length,
      sourceGeometryCount: source.sourceGeometryObjectIds.length }),
    classificationReasons: Object.freeze(['GENERIC_SUPPORT_GEOMETRY_AND_HOST_PROVED']),
  });
}

function mergeTerminal(dispositions, assembly, terminal) {
  for (const candidateIdValue of assembly.candidateIds) {
    const index = dispositions.findIndex((item) => item.candidateId === candidateIdValue);
    const current = dispositions[index];
    dispositions[index] = Object.freeze({ ...current,
      terminalDisposition: terminal.terminalDisposition,
      hostDisposition: terminal.hostDisposition,
      classificationReasons: Object.freeze([...terminal.reasons]) });
  }
}

export async function runFbxSupportAnalysis({
  zoneGeometryEvidence, selections, pipeClassifications = [], sourceGraph = null,
  profile = FBX_SUPPORT_PROFILE,
}) {
  await validateSourceGraphBinding(zoneGeometryEvidence, sourceGraph);
  validateHostBindings(zoneGeometryEvidence, pipeClassifications);
  const digest = await profileSha256(profile);
  const inventory = await attachCandidateIds(inventorySupportCandidates({
    zoneGeometryEvidence, selections, pipeClassifications,
  }), zoneGeometryEvidence, digest);
  const analyses = inventory.map((item) => analyseCandidateGeometry(item, profile)).filter(Boolean);
  const triangleCount = analyses.reduce((sum, item) => sum + item.triangles.length, 0);
  if (triangleCount > profile.maximumDerivedTrianglesPerZone) {
    throw new Error('BLOCKED_SUPPORT_RESOURCE zone triangle limit exceeded.');
  }
  const analysisByOccurrence = new Map(analyses.map((item) => (
    [item.item.occurrence.sourceOccurrenceId, item]
  )));
  const dispositions = inventory.map((item) => {
    const analysis = analysisByOccurrence.get(item.occurrence.sourceOccurrenceId);
    const terminal = terminalForInventory(item) || terminalForGeometry(analysis) || {
      terminalDisposition: 'SUPPORT_CANDIDATE_AMBIGUOUS',
      hostDisposition: 'HOST_NOT_FOUND', reasons: ['HOST_ASSOCIATION_NOT_EXECUTED'],
    };
    return dispositionRecord(item, terminal, analysis);
  });
  const assemblies = await Promise.all(buildSupportAssemblies(analyses, profile)
    .map((assembly) => attachAssemblyIdentity(assembly, inventory, zoneGeometryEvidence)));
  const hostAssociations = [], admittedSupports = [], pairCounter = { count: 0 };
  for (const assembly of assemblies) {
    const hostResult = associateAssemblyHosts(assembly, pipeClassifications, profile, pairCounter);
    const identified = await Promise.all(hostResult.associations.map((item) => identifiedHost(assembly, item)));
    hostAssociations.push(...identified);
    const terminal = terminalForHost(hostResult); mergeTerminal(dispositions, assembly, terminal);
    if (terminal.terminalDisposition === 'SUPPORT_ADMITTED') {
      admittedSupports.push(await admittedSupport(assembly, hostResult, identified, profile, sourceGraph));
    }
  }
  dispositions.sort((left, right) => left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0);
  hostAssociations.sort((left, right) => left.hostAssociationId < right.hostAssociationId ? -1 : 1);
  admittedSupports.sort((left, right) => left.supportId < right.supportId ? -1 : 1);
  const blockStatus = releaseBlock(dispositions, analyses,
    pipeClassifications.filter((item) => item?.admitted).length);
  const supportEvidence = await buildSupportArtifact({ zoneGeometryEvidence, profile,
    profileSha256: digest, candidateDispositions: dispositions, admittedSupports,
    hostAssociations, blockStatus });
  return deepFreeze({
    status: blockStatus || 'SUPPORT_ANALYSIS_PASS',
    evidenceStatus: 'SUPPORT_EVIDENCE_PASS', supportEvidence,
    supportEvidenceJson: canonicalJson(supportEvidence), counts: supportEvidence.conservation,
  });
}
