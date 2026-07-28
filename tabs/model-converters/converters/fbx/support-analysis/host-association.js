import { scaledBound } from './profile.js';
import { add, dot, magnitude, normalize, scale, squaredDistance, subtract } from './vector.js';

function pipeGeometry(classification) {
  const origin = classification.A?.centreMm;
  const axis = normalize(classification.axis || subtract(classification.L?.centreMm, origin));
  const radius = classification.A?.radiusMm;
  const span = classification.spanMm || magnitude(subtract(classification.L?.centreMm, origin));
  if (!origin || !axis || !(radius > 0) || !(span > 0)) return null;
  return { origin, axis, radius, span };
}

function pipeSearchBounds(pipe, radius) {
  const end = add(pipe.origin, scale(pipe.axis, pipe.span));
  return {
    minMm: pipe.origin.map((value, axis) => Math.min(value, end[axis]) - pipe.radius - radius),
    maxMm: pipe.origin.map((value, axis) => Math.max(value, end[axis]) + pipe.radius + radius),
  };
}

function boundsIntersect(left, right) {
  return left.minMm.every((minimum, axis) => minimum <= right.maxMm[axis]
    && right.minMm[axis] <= left.maxMm[axis]);
}

function pointWitness(point, pipe, clearance) {
  const offset = subtract(point, pipe.origin), axial = dot(offset, pipe.axis);
  if (axial < -clearance || axial > pipe.span + clearance) return null;
  const centreline = add(pipe.origin, scale(pipe.axis, axial));
  const radialVector = subtract(point, centreline), radialDistance = magnitude(radialVector);
  if (!(radialDistance > 0) || Math.abs(radialDistance - pipe.radius) > clearance) return null;
  const radialDirection = scale(radialVector, 1 / radialDistance);
  return { pointMm: point, centrelineMm: centreline,
    pipeSurfaceMm: add(centreline, scale(radialDirection, pipe.radius)), axialMm: axial,
    radialDirection, surfaceDistanceMm: Math.abs(radialDistance - pipe.radius) };
}

function contactTriangle(triangle, pipe, profile, clearance) {
  const witnesses = triangle.points.map((point) => pointWitness(point, pipe, clearance));
  if (witnesses.some((item) => !item)) return null;
  const cosines = witnesses.map((item) => Math.abs(dot(triangle.normal, item.radialDirection)));
  const minimumCosine = Math.cos(profile.contactNormalToleranceDegrees * Math.PI / 180);
  const conservativeCosine = Math.min(...cosines);
  return conservativeCosine >= minimumCosine
    ? { triangle, witnesses, normalRadialCosine: conservativeCosine } : null;
}

function continuationPassed(points, pipe, threshold) {
  return points.some((point) => {
    const offset = subtract(point, pipe.origin), axial = dot(offset, pipe.axis);
    const clamped = Math.max(0, Math.min(pipe.span, axial));
    const centreline = add(pipe.origin, scale(pipe.axis, clamped));
    return Math.abs(magnitude(subtract(point, centreline)) - pipe.radius) >= threshold;
  });
}

function associationFor(assembly, classification, profile) {
  const pipe = pipeGeometry(classification);
  if (!pipe) return null;
  const diameter = pipe.radius * 2;
  const clearance = scaledBound(profile.contactClearanceAbsoluteMm,
    profile.contactClearanceMaximumMm, profile.contactClearanceDiameterRatio, diameter);
  const contacts = assembly.triangles.map((triangle) => contactTriangle(triangle, pipe, profile, clearance))
    .filter(Boolean);
  const witnesses = contacts.flatMap((contact) => contact.witnesses);
  const uniqueWitnesses = new Map(witnesses.map((item) => [item.pointMm.join(','), item]));
  if (uniqueWitnesses.size < profile.minimumContactWitnessCount || !contacts.length) return null;
  const axial = [...uniqueWitnesses.values()].map((item) => item.axialMm);
  const overlap = Math.max(...axial) - Math.min(...axial);
  const minimumOverlap = scaledBound(profile.minimumAxialContactOverlapAbsoluteMm,
    profile.minimumAxialContactOverlapMaximumMm,
    profile.minimumAxialContactOverlapDiameterRatio, diameter);
  const continuation = scaledBound(profile.minimumStructuralContinuationAbsoluteMm,
    profile.minimumStructuralContinuationMaximumMm,
    profile.minimumStructuralContinuationDiameterRatio, diameter);
  if (overlap < minimumOverlap || !continuationPassed(assembly.points, pipe, continuation)) return null;
  return Object.freeze({
    classification, pipe, clearanceMm: clearance, axialOverlapMm: overlap,
    contactRegions: Object.freeze(contacts.map((contact) => Object.freeze({
      polygonKey: contact.triangle.polygonKey,
      sourceVertexIndices: Object.freeze([...contact.triangle.indices]),
      candidateWitnessesMm: Object.freeze(contact.witnesses.map((item) => item.pointMm)),
      pipeSurfaceWitnessesMm: Object.freeze(contact.witnesses.map((item) => item.pipeSurfaceMm)),
      pipeCentrelineWitnessesMm: Object.freeze(contact.witnesses.map((item) => item.centrelineMm)),
      maximumSurfaceDistanceMm: Math.max(...contact.witnesses.map((item) => item.surfaceDistanceMm)),
      normalRadialCosine: contact.normalRadialCosine,
    }))),
    witnessPoints: Object.freeze([...uniqueWitnesses.values()].map((item) => item.pointMm)),
  });
}

function associationKey(association) {
  const pipe = association.pipe, classification = association.classification;
  return [classification.sourceOccurrenceId, classification.sourceModelObjectId,
    classification.geometryObjectId, ...pipe.origin, ...pipe.axis, pipe.radius, pipe.span]
    .map((value) => String(value)).join('|');
}

function resolveAssociations(associations) {
  const unique = new Map(associations.map((item) => [associationKey(item), item]));
  const byHost = new Map();
  for (const item of unique.values()) {
    const host = String(item.classification.sourceOccurrenceId);
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(item);
  }
  if ([...byHost.values()].some((items) => items.length > 1)) {
    return Object.freeze({ outcome: 'HOST_AMBIGUOUS', associations: Object.freeze([]) });
  }
  const proved = [...byHost.values()].map((items) => items[0]).sort((left, right) => {
    const a = String(left.classification.sourceOccurrenceId);
    const b = String(right.classification.sourceOccurrenceId);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const outcome = proved.length === 0 ? 'HOST_NOT_FOUND'
    : proved.length === 1 ? 'SINGLE_HOST_PROVED' : 'MULTI_HOST_PROVED';
  return Object.freeze({ outcome, associations: Object.freeze(proved) });
}

export function associateAssemblyHosts(assembly, pipeClassifications, profile, pairCounter) {
  const admitted = (pipeClassifications || []).filter((item) => item?.admitted);
  const associations = [];
  for (const classification of admitted) {
    const pipe = pipeGeometry(classification);
    if (!pipe || !boundsIntersect(assembly.boundingEvidence,
      pipeSearchBounds(pipe, profile.maximumPipeSearchRadiusMm))) continue;
    pairCounter.count += 1;
    if (pairCounter.count > profile.maximumCandidateHostPairs) {
      throw new Error('BLOCKED_SUPPORT_RESOURCE candidate-host pair limit exceeded.');
    }
    const association = associationFor(assembly, classification, profile);
    if (association) associations.push(association);
  }
  return resolveAssociations(associations);
}

export function witnessMedoid(associations) {
  const witnesses = associations.flatMap((association) => association.witnessPoints);
  if (!witnesses.length) return null;
  const ranked = witnesses.map((point) => ({ point,
    maximum: Math.max(...witnesses.map((other) => squaredDistance(point, other))),
    key: point.map((value) => value.toPrecision(17)).join('|') }));
  ranked.sort((left, right) => {
    const distanceOrder = left.maximum - right.maximum;
    if (distanceOrder) return distanceOrder;
    return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
  });
  return ranked[0].point;
}
