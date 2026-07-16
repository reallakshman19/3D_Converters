/**
 * PipeSupportProjectionBundle.v1
 *
 * Resolves raw support siblings upstream and attaches semantic support families
 * to an already validated, ordered pipe/fitting carrier traversal.
 *
 * Out of scope: carrier traversal, support geometry, structural traversal,
 * matrix composition, clash checks and 25 mm structural proximity evaluation.
 */

import { parsePoint } from './sj-point-resolver.js';
import {
  classifySupportMemberRole,
  deriveSupportFamilyIdentity,
  reconstructSupportFamilies,
} from './sj-pipe-support-family.js';
import {
  FITTING_LOCATION_TYPES,
  STRAIGHT_CARRIER_TYPES,
  normalizePlantUp,
  normalizedTangent,
  pointDistance,
  projectPointToFittingCarrier,
  projectPointToStraightCarrier,
} from './sj-pipe-support-geometry.js';
import {
  cleanText,
  cloneJson,
  clonePoint,
  finiteNumber,
  isPoint,
  nonNegativeNumber,
  nullableNumber,
  nullableRound6,
  positiveNumber,
  round6,
  sequenceIndexFromPath,
  sourceAttributes,
  unique,
} from './sj-pipe-support-utils.js';

export const PIPE_SUPPORT_PROJECTION_SCHEMA = 'PipeSupportProjectionBundle.v1';
export const PIPE_SUPPORT_FITTING_LOCATION_TYPES = FITTING_LOCATION_TYPES;
export const PIPE_SUPPORT_POSITION_STATUSES = Object.freeze([
  'ON_CENTERLINE',
  'PROJECTED_TO_CENTERLINE',
  'OFFSET_FROM_CENTERLINE',
  'ATTACHED_TO_FITTING',
  'ATTACHED_TO_COMPONENT_PORT',
  'AMBIGUOUS_CARRIER',
  'OUTSIDE_PROJECTION_TOLERANCE',
  'UNRESOLVED',
]);

const POSITION_STATUS_SET = new Set(PIPE_SUPPORT_POSITION_STATUSES);
const DEFAULT_GLOBAL_AXES = Object.freeze({ x: 'EAST', y: 'NORTH', z: 'UP' });

export { classifySupportMemberRole, deriveSupportFamilyIdentity, reconstructSupportFamilies };
export { projectPointToStraightCarrier };

export function buildPipeSupportProjectionBundle(input = {}) {
  const branchId = cleanText(input.branchId);
  if (!branchId) throw new TypeError('branchId is required.');
  if (!Array.isArray(input.carriers)) throw new TypeError('carriers must be an array in validated traversal order.');
  if (!Array.isArray(input.supportRecords)) throw new TypeError('supportRecords must be an array.');
  const units = cleanText(input.coordinateSystem?.units || 'mm').toLowerCase();
  if (units !== 'mm') throw new TypeError('PipeSupportProjectionBundle.v1 coordinates must use millimetres (mm).');

  const diagnostics = [];
  const options = normalizeOptions(input);
  const carrierModels = input.carriers.map((carrier, index) => (
    normalizeCarrier(carrier, index, branchId, diagnostics)
  ));
  const outputCarriers = carrierModels.map((carrier) => carrier.output);
  const outputById = new Map(outputCarriers.map((carrier) => [carrier.carrierId, carrier]));

  const reconstructed = reconstructSupportFamilies(input.supportRecords, {
    branchId,
    diagnostics,
    hasPhysicalGeometry: input.hasPhysicalGeometry,
  });
  const acceptedBranches = new Set([branchId, ...(input.branchAliases || []).map(cleanText)].filter(Boolean));
  const families = reconstructed.filter((family) => includeFamilyInBranch(family, acceptedBranches, diagnostics));

  const supportGlyphs = [];
  const unresolvedSupportFamilies = [];
  for (const family of families) {
    const binding = resolveFamilyCarrierBinding(family, carrierModels, options, diagnostics);
    const projected = buildProjectedFamily(family, binding, options);
    if (binding.bindingStatus === 'RESOLVED' && binding.carrier) {
      const glyph = buildSupportGlyph(projected);
      projected.supportGlyph = cloneJson(glyph);
      outputById.get(binding.carrier.carrierId).supportFamilies.push(projected);
      supportGlyphs.push(glyph);
    } else {
      projected.supportGlyph = null;
      unresolvedSupportFamilies.push(projected);
    }
  }

  outputCarriers.forEach((carrier) => carrier.supportFamilies.sort(compareProjectedFamilies));
  const carrierOrder = new Map(carrierModels.map((carrier, index) => [carrier.carrierId, index]));
  supportGlyphs.sort((a, b) => {
    const order = carrierOrder.get(a.carrierId) - carrierOrder.get(b.carrierId);
    return order || nullableNumber(a.carrierStationMm, Infinity) - nullableNumber(b.carrierStationMm, Infinity);
  });

  return {
    schema: PIPE_SUPPORT_PROJECTION_SCHEMA,
    branchId,
    coordinateSystem: {
      units: 'mm',
      globalAxes: { ...DEFAULT_GLOBAL_AXES, ...(input.coordinateSystem?.globalAxes || {}) },
    },
    carriers: outputCarriers,
    supportGlyphs,
    unresolvedSupportFamilies,
    diagnostics,
  };
}

function includeFamilyInBranch(family, acceptedBranches, diagnostics) {
  const evidence = family.sourceParentBranches.filter(Boolean);
  const accepted = !evidence.length || evidence.some((value) => acceptedBranches.has(value));
  if (!accepted) diagnostics.push({
    severity: 'INFO',
    code: 'SUPPORT_FAMILY_EXCLUDED_FROM_BRANCH_BUNDLE',
    familyId: family.familyId,
    sourceParentBranches: evidence,
    message: 'Support family belongs to a different source branch and was excluded from this bundle.',
  });
  return accepted;
}

function resolveFamilyCarrierBinding(family, carriers, options, diagnostics) {
  if (!family.supportPosGlobal) {
    diagnostics.push({
      severity: 'WARNING',
      code: 'SUPPORT_POSITION_MISSING',
      familyId: family.familyId,
      message: 'No usable source support position was found.',
    });
    return unresolvedBinding('UNRESOLVED', null, family, []);
  }

  const branchCandidates = carriers.filter((carrier) => carrierBelongsToFamilyBranch(carrier, family, options.branchId));
  const candidates = (branchCandidates.length ? branchCandidates : carriers)
    .map((carrier) => buildCarrierCandidate(family, carrier, options))
    .filter(Boolean);
  if (!candidates.length) {
    diagnostics.push({
      severity: 'WARNING',
      code: 'NO_PROJECTABLE_CARRIER',
      familyId: family.familyId,
      message: 'No carrier had sufficient centreline or fitting geometry for projection.',
    });
    return unresolvedBinding('UNRESOLVED', null, family, []);
  }

  const explicitMatches = candidates.filter((candidate) => candidate.explicitReferenceMatch);
  if (explicitMatches.length === 1) {
    const selected = explicitMatches[0];
    if (!frameResolved(selected.projection)) return frameFailure(selected, family, candidates, diagnostics);
    return resolvedBinding(selected, family, options, ['EXPLICIT_CARRIER_REFERENCE']);
  }
  if (explicitMatches.length > 1) {
    diagnostics.push({
      severity: 'WARNING',
      code: 'MULTIPLE_EXPLICIT_CARRIER_REFERENCES',
      familyId: family.familyId,
      message: 'Multiple carriers match explicit support carrier references.',
    });
    return unresolvedBinding('AMBIGUOUS_CARRIER', explicitMatches[0], family, explicitMatches);
  }

  candidates.sort(compareBindingCandidates);
  const nearestDistance = candidates[0].projection.distanceMm;
  const equivalent = candidates.filter((candidate) => (
    Math.abs(candidate.projection.distanceMm - nearestDistance) <= options.ambiguityToleranceMm
  ));
  let selected = candidates[0];
  if (equivalent.length > 1) {
    const sequenceMatches = equivalent.filter((candidate) => candidate.sourceSequenceMatch);
    if (sequenceMatches.length === 1) selected = sequenceMatches[0];
    else {
      diagnostics.push({
        severity: 'WARNING',
        code: 'AMBIGUOUS_SUPPORT_CARRIER',
        familyId: family.familyId,
        candidateCarrierIds: equivalent.map((candidate) => candidate.carrier.carrierId),
        message: 'Multiple carriers are equivalent within ambiguity tolerance.',
      });
      return unresolvedBinding('AMBIGUOUS_CARRIER', selected, family, equivalent);
    }
  }

  if (selected.projection.distanceMm > options.projectionToleranceMm) {
    diagnostics.push({
      severity: 'WARNING',
      code: 'SUPPORT_OUTSIDE_PROJECTION_TOLERANCE',
      familyId: family.familyId,
      carrierId: selected.carrier.carrierId,
      radialDistanceMm: round6(selected.projection.distanceMm),
      projectionToleranceMm: options.projectionToleranceMm,
      message: 'Nearest carrier is outside projection tolerance; the support was not attached.',
    });
    return unresolvedBinding('OUTSIDE_PROJECTION_TOLERANCE', selected, family, candidates);
  }
  if (!frameResolved(selected.projection)) return frameFailure(selected, family, candidates, diagnostics);

  return resolvedBinding(
    selected,
    family,
    options,
    selected.sourceSequenceMatch ? ['SOURCE_SEQUENCE'] : [],
  );
}

function buildCarrierCandidate(family, carrier, options) {
  const explicitReferenceMatch = family.explicitCarrierReferences.some((ref) => carrier.references.has(ref));
  const sourceSequenceMatch = isSourceSequenceMatch(family, carrier, options.sourceCarriers);
  const projection = STRAIGHT_CARRIER_TYPES.has(carrier.carrierType)
    ? projectPointToStraightCarrier(family.supportPosGlobal, carrier, options)
    : projectPointToFittingCarrier(family.supportPosGlobal, carrier, options);
  return projection ? { carrier, projection, explicitReferenceMatch, sourceSequenceMatch } : null;
}

function resolvedBinding(selected, family, options, extraBasis) {
  let positionStatus = selected.projection.positionStatus;
  if (selected.explicitReferenceMatch && selected.projection.distanceMm > options.projectionToleranceMm) {
    positionStatus = 'OFFSET_FROM_CENTERLINE';
  }
  return {
    bindingStatus: 'RESOLVED',
    bindingBasis: unique([
      carrierBelongsToFamilyBranch(selected.carrier, family, options.branchId) ? 'SOURCE_OWNER' : null,
      selected.projection.projectionKind === 'STRAIGHT_CENTERLINE' ? 'CENTERLINE_PROJECTION' : 'FITTING_GEOMETRY',
      ...extraBasis,
    ]),
    carrier: selected.carrier,
    projection: { ...selected.projection, positionStatus },
    positionStatus,
    candidateCarrierIds: [selected.carrier.carrierId],
  };
}

function unresolvedBinding(status, nearest, family, candidates) {
  return {
    bindingStatus: status === 'AMBIGUOUS_CARRIER' ? 'AMBIGUOUS' : 'UNRESOLVED',
    bindingBasis: unique([
      nearest && carrierBelongsToFamilyBranch(nearest.carrier, family) ? 'SOURCE_OWNER' : null,
      nearest?.projection?.projectionKind === 'STRAIGHT_CENTERLINE' ? 'CENTERLINE_PROJECTION' : null,
      nearest?.projection?.projectionKind === 'FITTING_LOCATION' ? 'FITTING_GEOMETRY' : null,
    ]),
    carrier: nearest?.carrier || null,
    projection: nearest?.projection ? { ...nearest.projection, positionStatus: status } : null,
    positionStatus: status,
    candidateCarrierIds: candidates.map((candidate) => candidate.carrier.carrierId),
  };
}

function frameFailure(selected, family, candidates, diagnostics) {
  diagnostics.push({
    severity: 'WARNING',
    code: 'LOCAL_FRAME_UNRESOLVED',
    familyId: family.familyId,
    carrierId: selected.carrier.carrierId,
    message: 'Projection succeeded, but an explicit non-degenerate local carrier frame could not be established.',
  });
  return unresolvedBinding('UNRESOLVED', selected, family, candidates);
}

function frameResolved(projection) {
  return projection?.localFrame?.frameStatus === 'RESOLVED';
}

function buildProjectedFamily(family, binding, options) {
  const projection = binding.projection;
  const position = {
    supportPosGlobal: family.supportPosGlobal ? clonePoint(family.supportPosGlobal) : null,
    centerlinePointGlobal: projection?.centerlinePointGlobal ? clonePoint(projection.centerlinePointGlobal) : null,
    carrierStationMm: nullableRound6(projection?.carrierStationMm),
    carrierFraction: nullableRound6(projection?.carrierFraction),
    offsetFromCenterline: projection?.offsetFromCenterline
      ? roundOffset(projection.offsetFromCenterline)
      : null,
    positionStatus: normalizePositionStatus(binding.positionStatus || projection?.positionStatus),
    projectionToleranceMm: options.projectionToleranceMm,
  };
  if (projection?.fittingLocation) position.fittingLocation = cloneJson(projection.fittingLocation);

  return {
    familyId: family.familyId,
    familyIdBasis: family.familyIdBasis,
    sourceParentBranch: family.sourceParentBranch,
    carrierBinding: {
      carrierId: binding.carrier?.carrierId || null,
      carrierType: binding.carrier?.carrierType || null,
      bindingStatus: binding.bindingStatus,
      bindingBasis: binding.bindingBasis,
      candidateCarrierIds: binding.candidateCarrierIds,
    },
    position,
    traversal: binding.carrier ? cloneJson(binding.carrier.traversal) : null,
    localFrame: projection?.localFrame ? roundLocalFrame(projection.localFrame) : null,
    resolvedFunction: {
      supportKind: family.resolvedSupportKind,
      providedBy: 'SUPPORT_RESOLUTION_MODULE',
    },
    members: family.members.map(cloneJson),
  };
}

function buildSupportGlyph(family) {
  return {
    familyId: family.familyId,
    carrierId: family.carrierBinding.carrierId,
    carrierStationMm: family.position.carrierStationMm,
    centerlinePointGlobal: cloneJson(family.position.centerlinePointGlobal),
    offsetFromCenterline: family.position.offsetFromCenterline
      ? {
          lateralMm: family.position.offsetFromCenterline.lateralMm,
          verticalMm: family.position.offsetFromCenterline.verticalMm,
        }
      : null,
    fittingLocation: family.position.fittingLocation ? cloneJson(family.position.fittingLocation) : null,
    displayKind: family.resolvedFunction.supportKind,
    label: family.familyId.replace(/^\//u, ''),
    resolutionStatus: 'RESOLVED',
  };
}

function normalizeCarrier(carrier, index, branchId, diagnostics) {
  if (!carrier || typeof carrier !== 'object' || Array.isArray(carrier)) {
    throw new TypeError(`carriers[${index}] must be an object.`);
  }
  const carrierId = cleanText(carrier.carrierId || carrier.id || carrier.ref || carrier.name);
  if (!carrierId) throw new TypeError(`carriers[${index}].carrierId is required.`);
  const carrierType = cleanText(carrier.carrierType || carrier.componentType || carrier.type).toUpperCase() || 'UNKNOWN';
  const sourceBranchId = cleanText(
    carrier.sourceBranchId || carrier.sourceBranchName || carrier.branchId || carrier.branchName,
  ) || branchId;
  const attrs = sourceAttributes(carrier);
  const traversal = normalizeTraversal(carrier.traversal || carrier);
  const centerline = normalizeCenterline(carrier, attrs, traversal);
  if (!centerline && STRAIGHT_CARRIER_TYPES.has(carrierType)) diagnostics.push({
    severity: 'WARNING',
    code: 'CARRIER_CENTERLINE_MISSING',
    carrierId,
    message: 'Straight carrier has no usable validated centreline.',
  });

  const references = new Set([
    carrierId, cleanText(carrier.sourceRef), cleanText(carrier.ref),
    cleanText(attrs.REF), cleanText(attrs.COMPRE), cleanText(attrs.NAME),
  ].filter(Boolean));
  const sourceSequenceIndex = finiteNumber(carrier.sourceSequenceIndex)
    ?? sequenceIndexFromPath(carrier.sourcePath || carrier.path);
  const fittingGeometry = cloneJson(carrier.fittingGeometry || {});
  const ports = cloneJson(carrier.ports || carrier.fittingGeometry?.ports || []);
  const componentCentre = parsePoint(carrier.componentCentre || carrier.fittingGeometry?.componentCentre);
  const tangent = parsePoint(carrier.tangent || carrier.fittingGeometry?.tangent)
    || normalizedTangent(centerline);

  return {
    carrierId,
    carrierType,
    sourceBranchId,
    sourceSequenceIndex,
    centerline,
    traversal,
    fittingGeometry,
    ports,
    componentCentre,
    tangent,
    references,
    output: {
      carrierId,
      carrierType,
      sourceBranchId,
      sourceSequenceIndex,
      centerline: centerline ? cloneJson(centerline) : null,
      traversal: cloneJson(traversal),
      supportFamilies: [],
    },
  };
}

function normalizeCenterline(carrier, attrs, traversal) {
  const explicitStart = parsePoint(carrier.centerline?.start);
  const explicitEnd = parsePoint(carrier.centerline?.end);
  if (explicitStart && explicitEnd) return {
    start: clonePoint(explicitStart),
    end: clonePoint(explicitEnd),
    lengthMm: finiteNumber(carrier.centerline.lengthMm) ?? pointDistance(explicitStart, explicitEnd),
  };

  const apos = parsePoint(attrs.APOS);
  const lpos = parsePoint(attrs.LPOS);
  if (!apos || !lpos) return null;
  const start = traversal.reversedForTraversal ? lpos : apos;
  const end = traversal.reversedForTraversal ? apos : lpos;
  return { start: clonePoint(start), end: clonePoint(end), lengthMm: pointDistance(start, end) };
}

function normalizeTraversal(value = {}) {
  const reversedForTraversal = Boolean(value.reversedForTraversal);
  return {
    sourceStartField: cleanText(value.sourceStartField) || 'APOS',
    traversalStartField: cleanText(value.traversalStartField) || (reversedForTraversal ? 'LPOS' : 'APOS'),
    reversedForTraversal,
  };
}

function normalizeOptions(input) {
  return {
    branchId: cleanText(input.branchId),
    projectionToleranceMm: positiveNumber(input.projectionToleranceMm, 50),
    onCenterlineToleranceMm: nonNegativeNumber(input.onCenterlineToleranceMm, 0.001),
    ambiguityToleranceMm: nonNegativeNumber(input.ambiguityToleranceMm, 1),
    plantUp: normalizePlantUp(input.plantUp),
    sourceCarriers: input.carriers,
  };
}

function isSourceSequenceMatch(family, carrier, sourceCarriers) {
  if (!Number.isFinite(family.sourceSequenceIndex) || !Number.isFinite(carrier.sourceSequenceIndex)) return false;
  const rows = sourceCarriers.map((row, index) => ({
    id: cleanText(row.carrierId || row.id || row.ref || row.name),
    sequence: finiteNumber(row.sourceSequenceIndex) ?? sequenceIndexFromPath(row.sourcePath || row.path) ?? index,
  })).filter((row) => row.id);
  const preceding = rows
    .filter((row) => row.sequence <= family.sourceSequenceIndex)
    .sort((a, b) => b.sequence - a.sequence)[0];
  return preceding?.id === carrier.carrierId;
}

function carrierBelongsToFamilyBranch(carrier, family, branchId = '') {
  const sourceBranch = cleanText(family.sourceParentBranch);
  return !sourceBranch || carrier.sourceBranchId === sourceBranch || carrier.sourceBranchId === branchId;
}

function compareBindingCandidates(a, b) {
  if (a.explicitReferenceMatch !== b.explicitReferenceMatch) return a.explicitReferenceMatch ? -1 : 1;
  if (a.sourceSequenceMatch !== b.sourceSequenceMatch) return a.sourceSequenceMatch ? -1 : 1;
  return a.projection.distanceMm - b.projection.distanceMm;
}

function compareProjectedFamilies(a, b) {
  const station = nullableNumber(a.position.carrierStationMm, Infinity)
    - nullableNumber(b.position.carrierStationMm, Infinity);
  if (station) return station;
  const aFit = nullableNumber(a.position.fittingLocation?.arcFraction, a.position.fittingLocation?.axialFraction ?? Infinity);
  const bFit = nullableNumber(b.position.fittingLocation?.arcFraction, b.position.fittingLocation?.axialFraction ?? Infinity);
  return aFit - bFit || a.familyId.localeCompare(b.familyId);
}

function roundOffset(offset) {
  return {
    alongMm: nullableRound6(offset.alongMm),
    lateralMm: nullableRound6(offset.lateralMm),
    verticalMm: nullableRound6(offset.verticalMm),
    radialDistanceMm: nullableRound6(offset.radialDistanceMm),
  };
}

function roundLocalFrame(frame) {
  return {
    ...frame,
    origin: roundPoint(frame.origin),
    tangent: roundPoint(frame.tangent),
    lateral: frame.lateral ? roundPoint(frame.lateral) : null,
    vertical: roundPoint(frame.vertical),
  };
}

function roundPoint(point) {
  return isPoint(point) ? { x: round6(point.x), y: round6(point.y), z: round6(point.z) } : null;
}

function normalizePositionStatus(value) {
  return POSITION_STATUS_SET.has(value) ? value : 'UNRESOLVED';
}
