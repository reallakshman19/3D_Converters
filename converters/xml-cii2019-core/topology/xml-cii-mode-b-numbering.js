const DEFAULTS = Object.freeze({
  start: 10,
  step: 10,
});

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function integer(value) {
  const raw = text(value);
  if (!/^-?\d+$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? number : null;
}

function finiteCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : null;
}

function normalizedRef(value) {
  return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
}

function pointKey(point) {
  if (!point) return '~~~~~~~~';
  const parts = [point.x, point.y, point.z].map((value) => finiteCoordinate(value));
  if (parts.some((value) => value === null)) return '~~~~~~~~';
  return parts.map((value) => String(value).padStart(18, ' ')).join('|');
}

function semanticVertexKey(vertex) {
  return [
    pointKey(vertex?.point),
    normalizedRef(vertex?.componentRefNo || vertex?.normalizedComponentRefNo),
    text(vertex?.endpoint),
    text(vertex?.componentType).toUpperCase(),
    text(vertex?.connectionType).toUpperCase(),
    text(vertex?.branchName),
    text(vertex?.sourceNodeNumber),
    text(vertex?.sourceIdentity),
  ].join('::');
}

function validateComposite(composite) {
  if (composite?.schema !== 'xml-cii-mode-b-composite/v1') {
    throw new Error(`Unsupported Mode B composite schema: ${text(composite?.schema) || 'missing'}`);
  }
  const vertices = Array.isArray(composite.vertices) ? composite.vertices : [];
  const seen = new Set();
  for (const vertex of vertices) {
    const identity = text(vertex?.sourceIdentity);
    if (!identity) throw new Error('Mode B numbering requires every vertex to have sourceIdentity');
    if (seen.has(identity)) throw new Error(`Duplicate Mode B sourceIdentity: ${identity}`);
    seen.add(identity);
  }
  return { vertices, vertexIds: seen };
}

function validateOptions(config = {}) {
  const start = integer(config.start ?? DEFAULTS.start);
  const step = integer(config.step ?? DEFAULTS.step);
  if (!Number.isSafeInteger(start) || start <= 0) throw new Error('Mode B numbering start must be a positive safe integer');
  if (!Number.isSafeInteger(step) || step <= 0) throw new Error('Mode B numbering step must be a positive safe integer');
  return { start, step };
}

function normalizeEdges(composite, vertexIds) {
  const sourceEdges = (Array.isArray(composite.sourceEdges) ? composite.sourceEdges : []).map((edge, index) => {
    const from = text(edge?.fromSourceIdentity);
    const to = text(edge?.toSourceIdentity);
    if (!vertexIds.has(from) || !vertexIds.has(to)) {
      throw new Error(`Mode B source edge ${index} references missing vertex: ${from} -> ${to}`);
    }
    return {
      edgeId: text(edge?.edgeId) || text(edge?.segmentId) || `SOURCE:${from}=>${to}`,
      edgeType: 'SOURCE_ROUTE',
      from,
      to,
      authority: text(edge?.authority) || 'SOURCE_DOCUMENT',
    };
  });

  const acceptedEdges = (Array.isArray(composite.acceptedCrossDocumentEdges) ? composite.acceptedCrossDocumentEdges : []).map((edge, index) => {
    const a = text(edge?.sourceA);
    const b = text(edge?.sourceB);
    if (!vertexIds.has(a) || !vertexIds.has(b)) {
      throw new Error(`Mode B accepted edge ${index} references missing vertex: ${a} <=> ${b}`);
    }
    if (a === b) throw new Error(`Mode B accepted edge ${index} self-connects ${a}`);
    return {
      edgeId: text(edge?.edgeId) || `MODEB:${text(edge?.candidateId) || `${a}<=>${b}`}`,
      edgeType: 'CROSS_DOCUMENT_JOIN',
      a,
      b,
      candidateId: text(edge?.candidateId),
      authority: text(edge?.authority) || 'MODEB_EVALUATED',
    };
  });

  return { sourceEdges, acceptedEdges };
}

function addSet(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function buildSourceDegree(vertices, sourceEdges) {
  const incoming = new Map(vertices.map((vertex) => [vertex.sourceIdentity, 0]));
  const outgoing = new Map(vertices.map((vertex) => [vertex.sourceIdentity, 0]));
  for (const edge of sourceEdges) {
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
  }
  return { incoming, outgoing };
}

function orientAcceptedEdges(acceptedEdges, degrees, vertexById) {
  return acceptedEdges.map((edge) => {
    const aTail = (degrees.outgoing.get(edge.a) || 0) === 0;
    const bTail = (degrees.outgoing.get(edge.b) || 0) === 0;
    const aHead = (degrees.incoming.get(edge.a) || 0) === 0;
    const bHead = (degrees.incoming.get(edge.b) || 0) === 0;

    if (aTail && bHead && !(bTail && aHead)) {
      return { ...edge, from: edge.a, to: edge.b, orientation: 'TAIL_TO_HEAD' };
    }
    if (bTail && aHead && !(aTail && bHead)) {
      return { ...edge, from: edge.b, to: edge.a, orientation: 'TAIL_TO_HEAD' };
    }

    const aKey = semanticVertexKey(vertexById.get(edge.a));
    const bKey = semanticVertexKey(vertexById.get(edge.b));
    const [from, to] = aKey.localeCompare(bKey) <= 0 ? [edge.a, edge.b] : [edge.b, edge.a];
    return {
      ...edge,
      from,
      to,
      orientation: 'CANONICAL_FALLBACK',
      orientationReason: 'accepted topology retained; source-route tail/head direction was not unique',
    };
  });
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

function buildComponents(vertices, sourceEdges, acceptedEdges, vertexById) {
  const ids = vertices.map((vertex) => vertex.sourceIdentity);
  const uf = new UnionFind(ids);
  for (const edge of sourceEdges) uf.union(edge.from, edge.to);
  for (const edge of acceptedEdges) uf.union(edge.a, edge.b);

  const groups = new Map();
  for (const identity of ids) {
    const root = uf.find(identity);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(identity);
  }

  return [...groups.values()]
    .map((sourceIdentities) => {
      const ordered = [...sourceIdentities].sort((a, b) => semanticVertexKey(vertexById.get(a)).localeCompare(semanticVertexKey(vertexById.get(b))));
      return {
        sourceIdentities: ordered,
        componentKey: semanticVertexKey(vertexById.get(ordered[0])),
      };
    })
    .sort((a, b) => a.componentKey.localeCompare(b.componentKey));
}

function buildAdjacency(vertices, sourceEdges, orientedAcceptedEdges) {
  const directedOut = new Map(vertices.map((vertex) => [vertex.sourceIdentity, new Set()]));
  const directedIn = new Map(vertices.map((vertex) => [vertex.sourceIdentity, new Set()]));
  const undirected = new Map(vertices.map((vertex) => [vertex.sourceIdentity, new Set()]));

  for (const edge of sourceEdges) {
    addSet(directedOut, edge.from, edge.to);
    addSet(directedIn, edge.to, edge.from);
    addSet(undirected, edge.from, edge.to);
    addSet(undirected, edge.to, edge.from);
  }
  for (const edge of orientedAcceptedEdges) {
    addSet(directedOut, edge.from, edge.to);
    addSet(directedIn, edge.to, edge.from);
    addSet(undirected, edge.from, edge.to);
    addSet(undirected, edge.to, edge.from);
  }

  return { directedOut, directedIn, undirected };
}

function sortedIdentities(values, vertexById) {
  return [...values].sort((a, b) => semanticVertexKey(vertexById.get(a)).localeCompare(semanticVertexKey(vertexById.get(b))));
}

function traverseComponent(component, adjacency, vertexById) {
  const allowed = new Set(component.sourceIdentities);
  const unvisited = new Set(component.sourceIdentities);
  const traversal = [];

  const candidateRoots = component.sourceIdentities.filter((identity) => {
    const incoming = [...(adjacency.directedIn.get(identity) || [])].filter((candidate) => allowed.has(candidate));
    return incoming.length === 0;
  });

  const seedQueue = candidateRoots.length
    ? sortedIdentities(candidateRoots, vertexById)
    : [component.sourceIdentities[0]];

  function walk(seed) {
    if (!unvisited.has(seed)) return;
    const stack = [seed];
    while (stack.length) {
      const current = stack.pop();
      if (!unvisited.has(current)) continue;
      unvisited.delete(current);
      traversal.push(current);

      const preferred = sortedIdentities(
        [...(adjacency.directedOut.get(current) || [])].filter((identity) => allowed.has(identity) && unvisited.has(identity)),
        vertexById,
      );
      const fallback = sortedIdentities(
        [...(adjacency.undirected.get(current) || [])].filter((identity) => allowed.has(identity) && unvisited.has(identity) && !preferred.includes(identity)),
        vertexById,
      );
      const next = [...preferred, ...fallback];
      for (let index = next.length - 1; index >= 0; index -= 1) stack.push(next[index]);
    }
  }

  for (const seed of seedQueue) walk(seed);
  while (unvisited.size) walk(sortedIdentities(unvisited, vertexById)[0]);
  return traversal;
}

function fingerprint(value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildXmlCiiModeBNumbering(composite, config = {}) {
  const { vertices, vertexIds } = validateComposite(composite);
  const options = validateOptions(config);
  const vertexById = new Map(vertices.map((vertex) => [vertex.sourceIdentity, vertex]));
  const { sourceEdges, acceptedEdges } = normalizeEdges(composite, vertexIds);
  const sourceDegrees = buildSourceDegree(vertices, sourceEdges);
  const orientedAcceptedEdges = orientAcceptedEdges(acceptedEdges, sourceDegrees, vertexById);
  const components = buildComponents(vertices, sourceEdges, acceptedEdges, vertexById);
  const adjacency = buildAdjacency(vertices, sourceEdges, orientedAcceptedEdges);

  const traversal = [];
  components.forEach((component, componentIndex) => {
    const order = traverseComponent(component, adjacency, vertexById);
    order.forEach((sourceIdentity, componentTraversalIndex) => {
      traversal.push({
        sourceIdentity,
        componentOrdinal: componentIndex + 1,
        componentKey: component.componentKey,
        componentTraversalOrdinal: componentTraversalIndex + 1,
      });
    });
  });

  let nextPositive = options.start;
  const rows = traversal.map((entry, globalIndex) => {
    const vertex = vertexById.get(entry.sourceIdentity);
    const sourceNodeNumber = integer(vertex?.sourceNodeNumber);
    const isPositive = sourceNodeNumber !== null && sourceNodeNumber > 0;
    let outputNodeNumber = null;
    let numberingAuthority = 'SOURCE_UNNUMBERED_PRESERVED';
    let numberClass = 'UNNUMBERED_SOURCE';

    if (isPositive) {
      outputNodeNumber = nextPositive;
      if (!Number.isSafeInteger(outputNodeNumber)) throw new Error('Mode B numbering exceeded JavaScript safe integer range');
      nextPositive += options.step;
      numberClass = 'POSITIVE_ENGINEERING';
      numberingAuthority = 'MODEB_GRAPH_TRAVERSAL';
    } else if (sourceNodeNumber !== null) {
      outputNodeNumber = sourceNodeNumber;
      numberClass = 'NONPOSITIVE_SENTINEL';
      numberingAuthority = 'SOURCE_SENTINEL_PRESERVED';
    }

    return {
      sourceIdentity: entry.sourceIdentity,
      sourceDocumentId: text(vertex?.sourceDocumentId),
      branchId: text(vertex?.branchId),
      branchName: text(vertex?.branchName),
      sourceNodeNumber: text(vertex?.sourceNodeNumber),
      outputNodeNumber,
      numberClass,
      numberingAuthority,
      componentOrdinal: entry.componentOrdinal,
      componentKey: entry.componentKey,
      componentTraversalOrdinal: entry.componentTraversalOrdinal,
      globalTraversalOrdinal: globalIndex + 1,
      componentRefNo: text(vertex?.componentRefNo),
      endpoint: text(vertex?.endpoint),
      componentType: text(vertex?.componentType),
      position: text(vertex?.position),
    };
  });

  const positiveRows = rows.filter((row) => row.numberClass === 'POSITIVE_ENGINEERING');
  const positiveNumbers = positiveRows.map((row) => row.outputNodeNumber);
  if (new Set(positiveNumbers).size !== positiveNumbers.length) {
    throw new Error('Mode B numbering generated duplicate positive output NodeNumbers');
  }
  if (rows.length !== vertices.length || new Set(rows.map((row) => row.sourceIdentity)).size !== vertices.length) {
    throw new Error('Mode B numbering lost or duplicated source vertex custody');
  }

  const numbering = {
    schema: 'xml-cii-mode-b-numbering/v1',
    authority: 'POST_TOPOLOGY_NUMBERING',
    sourceCompositeFingerprint: text(composite.fingerprint),
    options,
    orientedAcceptedCrossDocumentEdges: orientedAcceptedEdges,
    components: components.map((component, index) => ({
      componentOrdinal: index + 1,
      componentKey: component.componentKey,
      vertexCount: component.sourceIdentities.length,
      sourceIdentities: [...component.sourceIdentities],
    })),
    rows,
    stats: {
      vertexCount: vertices.length,
      componentCount: components.length,
      positiveNumberedVertexCount: positiveRows.length,
      nonPositiveSentinelCount: rows.filter((row) => row.numberClass === 'NONPOSITIVE_SENTINEL').length,
      unnumberedSourceCount: rows.filter((row) => row.numberClass === 'UNNUMBERED_SOURCE').length,
      firstPositiveOutputNodeNumber: positiveRows[0]?.outputNodeNumber ?? null,
      lastPositiveOutputNodeNumber: positiveRows.at(-1)?.outputNodeNumber ?? null,
      acceptedCrossDocumentEdgeCount: acceptedEdges.length,
      canonicalFallbackOrientationCount: orientedAcceptedEdges.filter((edge) => edge.orientation === 'CANONICAL_FALLBACK').length,
    },
    diagnostics: [
      {
        type: 'mode-b-numbering-authority',
        message: 'Output NodeNumbers were assigned after topology evaluation. Candidate scores/states and accepted topology edges are read-only inputs to numbering.',
      },
      {
        type: 'mode-b-numbering-sentinel-policy',
        message: 'Positive engineering nodes receive a graph-derived unique namespace; non-positive source sentinel/helper NodeNumbers are preserved unchanged.',
      },
    ],
  };
  numbering.fingerprint = fingerprint({ ...numbering, fingerprint: undefined });
  return numbering;
}
