const DEFAULTS = Object.freeze({
  pointToleranceMm: 0.001,
  acceptanceScore: 8,
  competitionMargin: 3,
  maxNeighborHops: 16,
});

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distance(a, b) {
  if (!a || !b) return null;
  const value = Math.hypot(
    Number(b.x) - Number(a.x),
    Number(b.y) - Number(a.y),
    Number(b.z) - Number(a.z),
  );
  return Number.isFinite(value) ? value : null;
}

function normalizedVector(from, to) {
  if (!from || !to) return null;
  const dx = Number(to.x) - Number(from.x);
  const dy = Number(to.y) - Number(from.y);
  const dz = Number(to.z) - Number(from.z);
  const magnitude = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return null;
  return { x: dx / magnitude, y: dy / magnitude, z: dz / magnitude };
}

function dot(a, b) {
  if (!a || !b) return null;
  const value = (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
  return Number.isFinite(value) ? value : null;
}

function distinctRouteNeighbor(node, direction, nodeMap, options) {
  if (!node?.point) return null;
  let identity = direction === 'previous' ? node.previousSourceIdentity : node.nextSourceIdentity;
  const visited = new Set([node.sourceIdentity]);
  for (let hop = 0; identity && hop < options.maxNeighborHops; hop += 1) {
    if (visited.has(identity)) break;
    visited.add(identity);
    const neighbor = nodeMap.get(identity);
    if (!neighbor) break;
    const gap = distance(node.point, neighbor.point);
    if (gap !== null && gap > options.pointToleranceMm) {
      return {
        sourceIdentity: neighbor.sourceIdentity,
        direction,
        hopCount: hop + 1,
        distanceMm: Number(gap.toFixed(6)),
        vector: normalizedVector(node.point, neighbor.point),
        componentType: neighbor.componentType || '',
        role: neighbor.role || '',
      };
    }
    identity = direction === 'previous' ? neighbor.previousSourceIdentity : neighbor.nextSourceIdentity;
  }
  return null;
}

function routeContext(node, nodeMap, options) {
  const previous = distinctRouteNeighbor(node, 'previous', nodeMap, options);
  const next = distinctRouteNeighbor(node, 'next', nodeMap, options);
  const directions = [previous, next].filter(Boolean);
  return {
    sourceIdentity: node?.sourceIdentity || '',
    previous,
    next,
    distinctDirectionCount: directions.length,
  };
}

function routeCompatibility(aContext, bContext) {
  const vectorsA = [aContext?.previous?.vector, aContext?.next?.vector].filter(Boolean);
  const vectorsB = [bContext?.previous?.vector, bContext?.next?.vector].filter(Boolean);
  if (!vectorsA.length || !vectorsB.length) {
    return { status: 'UNKNOWN', bestOppositionDot: null, pairCount: 0 };
  }
  const values = [];
  for (const a of vectorsA) for (const b of vectorsB) {
    const value = dot(a, b);
    if (value !== null) values.push(value);
  }
  if (!values.length) return { status: 'UNKNOWN', bestOppositionDot: null, pairCount: 0 };
  const best = Math.min(...values);
  const status = best <= -0.9 ? 'MATCH' : (best <= -0.5 ? 'PARTIAL' : (best >= 0.5 ? 'CONFLICT' : 'UNKNOWN'));
  return { status, bestOppositionDot: Number(best.toFixed(6)), pairCount: values.length };
}

function scoreCandidate(candidate, sourceA, sourceB, nodeMap, options) {
  const originalEvidence = candidate?.evidence || {};
  const contextA = routeContext(sourceA, nodeMap, options);
  const contextB = routeContext(sourceB, nodeMap, options);
  const route = routeCompatibility(contextA, contextB);
  const scoreParts = [{ key: 'position-within-tolerance', score: 1 }];
  let score = 1;

  const add = (condition, key, points) => {
    if (!condition) return;
    score += points;
    scoreParts.push({ key, score: points });
  };
  add(originalEvidence.componentRefMatch === true, 'component-ref-match', 5);
  add(originalEvidence.endpointMatch === true, 'endpoint-match', 1);
  add(originalEvidence.componentTypeMatch === true, 'component-type-match', 2);
  add(originalEvidence.connectionTypeMatch === true, 'connection-type-match', 2);
  add(originalEvidence.outsideDiameterCompatibility === 'MATCH', 'outside-diameter-match', 2);
  add(originalEvidence.boreCompatibility === 'MATCH', 'bore-match', 2);
  add(route.status === 'MATCH', 'route-opposition-match', 3);
  add(route.status === 'PARTIAL', 'route-opposition-partial', 1);

  const hardConflicts = [];
  if (originalEvidence.outsideDiameterCompatibility === 'CONFLICT') hardConflicts.push('outside-diameter-conflict');
  if (originalEvidence.boreCompatibility === 'CONFLICT') hardConflicts.push('bore-conflict');

  const teeNeedsContext = originalEvidence.teeInvolved === true
    && originalEvidence.componentRefMatch !== true
    && route.status !== 'MATCH';
  if (teeNeedsContext) hardConflicts.push('tee-without-identity-or-route-corroboration');

  return {
    candidateId: candidate.candidateId,
    sourceA: candidate.sourceA,
    sourceB: candidate.sourceB,
    documentA: candidate.documentA,
    documentB: candidate.documentB,
    distanceMm: candidate.distanceMm,
    originalEvidenceClass: candidate.evidenceClass,
    originalDisposition: candidate.observationDisposition,
    score,
    scoreParts,
    hardConflicts,
    routeContext: { sourceA: contextA, sourceB: contextB, compatibility: route },
    evidence: { ...originalEvidence },
  };
}

function incidentCandidates(scored) {
  const byNode = new Map();
  for (const candidate of scored) {
    for (const identity of [candidate.sourceA, candidate.sourceB]) {
      if (!byNode.has(identity)) byNode.set(identity, []);
      byNode.get(identity).push(candidate);
    }
  }
  for (const rows of byNode.values()) rows.sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));
  return byNode;
}

function competingEligible(candidate, eligibleByNode) {
  const seen = new Map();
  for (const identity of [candidate.sourceA, candidate.sourceB]) {
    for (const row of eligibleByNode.get(identity) || []) {
      if (row.candidateId !== candidate.candidateId) seen.set(row.candidateId, row);
    }
  }
  return [...seen.values()].sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));
}

function sharesEndpoint(a, b) {
  return a.sourceA === b.sourceA || a.sourceA === b.sourceB || a.sourceB === b.sourceA || a.sourceB === b.sourceB;
}

function evaluateCandidates(observation, splitNodes, options) {
  const nodeMap = new Map(splitNodes.map((node) => [node.sourceIdentity, node]));
  const scored = (observation.boundaryCandidates || []).map((candidate) => {
    const sourceA = nodeMap.get(candidate.sourceA);
    const sourceB = nodeMap.get(candidate.sourceB);
    if (!sourceA || !sourceB) {
      return {
        candidateId: candidate.candidateId,
        sourceA: candidate.sourceA,
        sourceB: candidate.sourceB,
        score: 0,
        scoreParts: [],
        hardConflicts: ['missing-source-node'],
        routeContext: null,
        evidence: { ...(candidate.evidence || {}) },
      };
    }
    return scoreCandidate(candidate, sourceA, sourceB, nodeMap, options);
  });

  const eligible = scored.filter((candidate) => !candidate.hardConflicts.length && candidate.score >= options.acceptanceScore);
  const eligibleByNode = incidentCandidates(eligible);
  const provisional = new Map();

  for (const candidate of scored) {
    if (candidate.hardConflicts.length) {
      provisional.set(candidate.candidateId, {
        ...candidate,
        state: 'REJECTED',
        reason: candidate.hardConflicts.join(', '),
      });
      continue;
    }
    if (candidate.score < options.acceptanceScore) {
      provisional.set(candidate.candidateId, {
        ...candidate,
        state: 'INSUFFICIENT_EVIDENCE',
        reason: `score ${candidate.score} < acceptance threshold ${options.acceptanceScore}`,
      });
      continue;
    }
    const competitors = competingEligible(candidate, eligibleByNode);
    if (!competitors.length) {
      provisional.set(candidate.candidateId, {
        ...candidate,
        state: 'ACCEPTED',
        reason: `uncontested eligible candidate score ${candidate.score}`,
      });
      continue;
    }
    const topCompetitor = competitors[0];
    const margin = candidate.score - topCompetitor.score;
    if (margin >= options.competitionMargin) {
      provisional.set(candidate.candidateId, {
        ...candidate,
        state: 'ACCEPTED',
        reason: `candidate score ${candidate.score} exceeds strongest competitor ${topCompetitor.score} by ${margin}`,
        strongestCompetitorId: topCompetitor.candidateId,
        competitionMargin: margin,
      });
    } else {
      provisional.set(candidate.candidateId, {
        ...candidate,
        state: 'AMBIGUOUS',
        reason: `eligible competition margin ${margin} < required ${options.competitionMargin}`,
        strongestCompetitorId: topCompetitor.candidateId,
        competitionMargin: margin,
      });
    }
  }

  // Enforce one accepted cross-document edge per source endpoint. If two accepted
  // edges still contend due to asymmetric competition, demote both to ambiguity.
  const acceptedByNode = new Map();
  for (const result of provisional.values()) {
    if (result.state !== 'ACCEPTED') continue;
    for (const identity of [result.sourceA, result.sourceB]) {
      if (!acceptedByNode.has(identity)) acceptedByNode.set(identity, []);
      acceptedByNode.get(identity).push(result);
    }
  }
  for (const [identity, rows] of acceptedByNode.entries()) {
    if (rows.length <= 1) continue;
    for (const row of rows) {
      provisional.set(row.candidateId, {
        ...provisional.get(row.candidateId),
        state: 'AMBIGUOUS',
        reason: `source endpoint ${identity} would own ${rows.length} accepted cross-document edges`,
      });
    }
  }

  // When an accepted candidate has a decisive score margin, eligible alternatives
  // sharing its endpoint are not still ambiguous: retain them as explicit rejected
  // alternatives with winner provenance.
  const acceptedWinners = [...provisional.values()].filter((row) => row.state === 'ACCEPTED');
  for (const winner of acceptedWinners) {
    for (const loser of [...provisional.values()]) {
      if (loser.candidateId === winner.candidateId || loser.state !== 'AMBIGUOUS' || !sharesEndpoint(winner, loser)) continue;
      const margin = winner.score - loser.score;
      if (margin < options.competitionMargin) continue;
      provisional.set(loser.candidateId, {
        ...loser,
        state: 'REJECTED',
        reason: `dominated by accepted candidate ${winner.candidateId} with score margin ${margin}`,
        acceptedCompetitorId: winner.candidateId,
        competitionMargin: -margin,
      });
    }
  }

  const evaluated = [...provisional.values()].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  return {
    evaluated,
    accepted: evaluated.filter((row) => row.state === 'ACCEPTED'),
    ambiguous: evaluated.filter((row) => row.state === 'AMBIGUOUS'),
    rejected: evaluated.filter((row) => row.state === 'REJECTED'),
    insufficient: evaluated.filter((row) => row.state === 'INSUFFICIENT_EVIDENCE'),
  };
}

class UnionFind {
  constructor(values) {
    this.parent = new Map(values.map((value) => [value, value]));
  }
  find(value) {
    if (!this.parent.has(value)) return null;
    let root = value;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    let current = value;
    while (this.parent.get(current) !== current) {
      const next = this.parent.get(current);
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === null || rb === null || ra === rb) return;
    const [low, high] = [ra, rb].sort();
    this.parent.set(high, low);
  }
}

function connectedComponents(vertices, sourceEdges, acceptedEdges) {
  const identities = vertices.map((node) => node.sourceIdentity);
  const uf = new UnionFind(identities);
  for (const edge of sourceEdges) uf.union(edge.fromSourceIdentity, edge.toSourceIdentity);
  for (const edge of acceptedEdges) uf.union(edge.sourceA, edge.sourceB);
  const groups = new Map();
  for (const identity of identities) {
    const root = uf.find(identity);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(identity);
  }
  return [...groups.entries()]
    .map(([componentId, sourceIdentities]) => ({
      componentId,
      vertexCount: sourceIdentities.length,
      sourceDocumentCount: new Set(sourceIdentities.map((identity) => text(identity).split('::')[0])).size,
      sourceIdentities: sourceIdentities.sort(),
    }))
    .sort((a, b) => a.componentId.localeCompare(b.componentId));
}

function fingerprint(value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildXmlCiiModeBComposite(observation, config = {}) {
  if (observation?.schema !== 'xml-cii-mode-b-observation/v1') {
    throw new Error(`Unsupported Mode B observation schema: ${text(observation?.schema) || 'missing'}`);
  }
  const options = {
    pointToleranceMm: finite(config.pointToleranceMm) ?? finite(observation?.options?.positionToleranceMm) ?? DEFAULTS.pointToleranceMm,
    acceptanceScore: finite(config.acceptanceScore) ?? DEFAULTS.acceptanceScore,
    competitionMargin: finite(config.competitionMargin) ?? DEFAULTS.competitionMargin,
    maxNeighborHops: finite(config.maxNeighborHops) ?? DEFAULTS.maxNeighborHops,
  };
  const vertices = (observation.nodes || [])
    .filter((node) => node.documentRole === 'split-source')
    .map((node) => ({ ...node }));
  const vertexIds = new Set(vertices.map((node) => node.sourceIdentity));
  const sourceEdges = (observation.branchSegments || [])
    .filter((edge) => vertexIds.has(edge.fromSourceIdentity) && vertexIds.has(edge.toSourceIdentity))
    .map((edge) => ({ ...edge, edgeType: 'SOURCE_ROUTE', authority: 'SOURCE_DOCUMENT' }));
  const decisions = evaluateCandidates(observation, vertices, options);
  const acceptedCrossDocumentEdges = decisions.accepted.map((row) => ({
    edgeId: `MODEB:${row.candidateId}`,
    edgeType: 'CROSS_DOCUMENT_JOIN',
    authority: 'MODEB_EVALUATED',
    sourceA: row.sourceA,
    sourceB: row.sourceB,
    score: row.score,
    reason: row.reason,
    candidateId: row.candidateId,
  }));
  const components = connectedComponents(vertices, sourceEdges, acceptedCrossDocumentEdges);

  const composite = {
    schema: 'xml-cii-mode-b-composite/v1',
    authority: 'COMPOSITE_TOPOLOGY_GRAPH',
    sourceObservationFingerprint: observation.fingerprint || '',
    options,
    vertices,
    sourceEdges,
    coincidentGroups: (observation.samePositionClusters || []).map((group) => ({ ...group })),
    candidateDecisions: decisions.evaluated,
    acceptedCrossDocumentEdges,
    ambiguousCandidates: decisions.ambiguous,
    rejectedCandidates: decisions.rejected,
    insufficientEvidenceCandidates: decisions.insufficient,
    connectedComponents: components,
    stats: {
      vertexCount: vertices.length,
      sourceEdgeCount: sourceEdges.length,
      observedCandidateCount: decisions.evaluated.length,
      acceptedCrossDocumentEdgeCount: acceptedCrossDocumentEdges.length,
      ambiguousCandidateCount: decisions.ambiguous.length,
      rejectedCandidateCount: decisions.rejected.length,
      insufficientEvidenceCandidateCount: decisions.insufficient.length,
      connectedComponentCount: components.length,
    },
    diagnostics: [
      {
        type: 'mode-b-composite-authority',
        message: 'MODEB-02 evaluates cross-document topology edges while preserving source vertices. Final/output Node Numbers are intentionally absent and remain MODEB-03 scope.',
      },
    ],
  };
  composite.fingerprint = fingerprint({ ...composite, fingerprint: undefined });
  return composite;
}
