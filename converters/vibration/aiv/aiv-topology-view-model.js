import {
  VIBRATION_TOPOLOGY_PATH_SCHEMA,
  buildVibrationTopologyGraph,
  resolveVibrationTopologyPath,
} from '../topology/graph.js';

export const AIV_TOPOLOGY_VIEW_MODEL_SCHEMA = 'AivTopologyViewModel.v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function roleLabel(role) {
  if (role === 'SOURCE') return 'Acoustic source';
  if (role === 'ASSESSMENT') return 'Assessment point';
  if (role === 'SOURCE_AND_ASSESSMENT') return 'Source + assessment';
  return 'Propagation path';
}

function diagnosticMessage(path) {
  if (path.status === 'IDENTITY_NOT_FOUND') {
    return `Source or assessment identity is absent from the certified topology: ${(path.missingCanonicalIds ?? []).join(', ')}.`;
  }
  if (path.status === 'AMBIGUOUS_SHORTEST_PATH') {
    return `More than one equally short certified topology path exists (${path.shortestPathCount}). AIV source-to-assessment mapping must be resolved explicitly.`;
  }
  if (path.status === 'AMBIGUOUS_TOPOLOGY_PATH') {
    return 'More than one certified topology route connects the selected source and assessment identities. Readiness will not choose a route by hop count or presentation geometry.';
  }
  return 'No certified topology path connects the selected source and assessment identities.';
}

export function buildAivTopologyViewModel(exchange, input = {}) {
  const graph = buildVibrationTopologyGraph(exchange);
  const path = resolveVibrationTopologyPath(graph, {
    sourceCanonicalId: input.sourceCanonicalId,
    assessmentCanonicalId: input.assessmentCanonicalId,
  });

  const rows = path.status === 'RESOLVED'
    ? path.elements.map((element, index) => ({
        sequence: index + 1,
        canonicalId: element.canonicalId,
        tag: element.tag,
        type: element.type,
        line: element.line,
        declaredLengthMm: element.lengthMm,
        role: element.role,
        roleLabel: roleLabel(element.role),
        sourceStatus: element.sourceStatus,
        catalogueAuthority: element.catalogueAuthority,
      }))
    : [];

  return deepFreeze({
    schema: AIV_TOPOLOGY_VIEW_MODEL_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    authority: {
      calculationState: 'BLOCKED',
      qualificationState: 'BLOCKED',
      screeningAuthority: 'NOT_AUTHORIZED',
      engineeringAuthority: 'NONE',
      designAuthority: false,
      visualizationAuthority: 'READ_ONLY_TOPOLOGY_EVIDENCE',
    },
    sourceCanonicalId: path.sourceCanonicalId,
    assessmentCanonicalId: path.assessmentCanonicalId,
    pathStatus: path.status,
    shortestPathCount: path.shortestPathCount ?? null,
    shortestHopCount: path.shortestHopCount ?? null,
    alternateRouteDetected: path.alternateRouteDetected ?? false,
    physicalDistanceMm: null,
    distanceStatus: path.distanceStatus,
    rows,
    topologyAuthority: path.authority,
    diagnostics: path.status === 'RESOLVED' ? [] : [{
      code: `AIV_TOPOLOGY_${path.status}`,
      message: diagnosticMessage(path),
    }],
    notes: [
      'This model is a read-only table projection; it is not geometry or design authority.',
      'Physical AIV source-to-assessment distance is intentionally not derived by this visualization layer.',
      'No AIV equation, PWL, attenuation, LOF or assessment threshold is evaluated here.',
    ],
  });
}

export function assertAivTopologyViewModel(value) {
  if (value?.schema !== AIV_TOPOLOGY_VIEW_MODEL_SCHEMA) {
    throw new TypeError(`AIV topology view model must use ${AIV_TOPOLOGY_VIEW_MODEL_SCHEMA}.`);
  }
  if (value.pathStatus === 'RESOLVED' && !Array.isArray(value.rows)) {
    throw new TypeError('Resolved AIV topology view model requires rows.');
  }
  return value;
}

export { VIBRATION_TOPOLOGY_PATH_SCHEMA };
