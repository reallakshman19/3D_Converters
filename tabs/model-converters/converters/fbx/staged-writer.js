const POSITION_EPSILON_MM = 1e-6;

function fail(message) {
  throw new Error(`BLOCKED_STAGEDJSON_CONTRACT ${message}`);
}

function pointObject(port) {
  return { x: port.positionMm[0], y: port.positionMm[1], z: port.positionMm[2] };
}

function portAttributes(port) {
  return {
    authority: port.authority,
    geometryObjectId: port.geometryObjectId,
    positionMm: pointObject(port),
    ...(port.vertexIndex === undefined ? {} : { vertexIndex: port.vertexIndex }),
    ...(port.controlPointIndex === undefined ? {} : { controlPointIndex: port.controlPointIndex }),
    connections: port.connections.map((item) => ({ ...item })),
  };
}

function adjacencyFor(entries, links) {
  const adjacency = new Map(entries.map((entry) => [entry.mappingEntryId, []]));
  for (const link of links) {
    const [left, right] = link.endpoints.map((value) => {
      const split = value.lastIndexOf(':');
      return { entryId: value.slice(0, split), port: value.slice(split + 1) };
    });
    adjacency.get(left.entryId).push({ localPort: left.port, targetId: right.entryId, targetPort: right.port });
    adjacency.get(right.entryId).push({ localPort: right.port, targetId: left.entryId, targetPort: left.port });
  }
  return adjacency;
}

function connectedComponents(entries, adjacency) {
  const remaining = new Set(entries.map((entry) => entry.mappingEntryId));
  const components = [];
  while (remaining.size) {
    const start = [...remaining].sort()[0];
    const stack = [start], ids = [];
    while (stack.length) {
      const id = stack.pop();
      if (!remaining.delete(id)) continue;
      ids.push(id);
      for (const edge of adjacency.get(id)) if (remaining.has(edge.targetId)) stack.push(edge.targetId);
    }
    components.push(ids.sort());
  }
  return components;
}

function pathOrder(componentIds, adjacency) {
  for (const id of componentIds) if (adjacency.get(id).length > 2) fail(`component ${id} is not a linear PIPE path.`);
  const endpoints = componentIds.filter((id) => adjacency.get(id).length < 2).sort();
  if (!endpoints.length && componentIds.length > 1) fail('cyclic PIPE connectivity is not representable as native branch order.');
  const ordered = [], visited = new Set();
  let current = endpoints[0] || componentIds[0], previous = null, incomingPort = null;
  while (current) {
    if (visited.has(current)) fail('cyclic PIPE connectivity is not representable as native branch order.');
    visited.add(current);
    const nextEdges = adjacency.get(current).filter((edge) => edge.targetId !== previous);
    if (nextEdges.length > 1) fail(`component ${current} has ambiguous branch order.`);
    const outgoing = nextEdges[0] || null;
    ordered.push({ entryId: current, incomingPort, outgoingPort: outgoing?.localPort || null });
    previous = current;
    current = outgoing?.targetId || null;
    incomingPort = outgoing?.targetPort || null;
  }
  if (visited.size !== componentIds.length) fail('PIPE connectivity traversal was incomplete.');
  return ordered;
}

function orientedPorts(step, ports) {
  if (!step.incomingPort && !step.outgoingPort) return { start: ports.A, end: ports.B };
  if (!step.incomingPort) return step.outgoingPort === 'A'
    ? { start: ports.B, end: ports.A } : { start: ports.A, end: ports.B };
  if (!step.outgoingPort) return step.incomingPort === 'A'
    ? { start: ports.A, end: ports.B } : { start: ports.B, end: ports.A };
  if (step.incomingPort === step.outgoingPort) fail(`component ${step.entryId} reuses one port for two links.`);
  return { start: ports[step.incomingPort], end: ports[step.outgoingPort] };
}

function assertCoincident(left, right, label) {
  const residual = Math.hypot(
    left.positionMm[0] - right.positionMm[0],
    left.positionMm[1] - right.positionMm[1],
    left.positionMm[2] - right.positionMm[2],
  );
  if (residual > POSITION_EPSILON_MM) fail(`${label} has ${residual} mm endpoint residual.`);
}

function componentNode(entry, ports, links) {
  return {
    type: 'PIPE', id: entry.logicalComponentId, name: entry.logicalComponentId,
    attributes: {
      REF: entry.logicalComponentId,
      APOS: pointObject(ports.start),
      LPOS: pointObject(ports.end),
      mappingEntryId: entry.mappingEntryId,
      logicalComponentId: entry.logicalComponentId,
      sourceModelObjectId: entry.sourceModelObjectId,
      sourceOccurrenceId: entry.sourceOccurrenceId,
      ports: { A: portAttributes(ports.A), B: portAttributes(ports.B) },
      explicitConnectivity: links
        .filter((link) => link.endpoints.some((value) => value.startsWith(`${entry.mappingEntryId}:`)))
        .map((link) => [...link.endpoints]),
    },
    children: [],
  };
}

function branchNode(index, ordered, entryById, resolvedByEntry, links) {
  const children = ordered.map((step) => {
    const raw = resolvedByEntry.get(step.entryId);
    const oriented = orientedPorts(step, raw);
    return componentNode(entryById.get(step.entryId), { ...raw, ...oriented }, links);
  });
  for (let position = 1; position < children.length; position += 1) {
    const left = resolvedByEntry.get(ordered[position - 1].entryId)[ordered[position - 1].outgoingPort];
    const right = resolvedByEntry.get(ordered[position].entryId)[ordered[position].incomingPort];
    assertCoincident(left, right, `${ordered[position - 1].entryId} -> ${ordered[position].entryId}`);
  }
  return {
    type: 'BRANCH', id: `FBX-BRANCH-${String(index + 1).padStart(4, '0')}`,
    name: `FBX Mapping Branch ${index + 1}`,
    attributes: {
      REF: `FBX-BRANCH-${String(index + 1).padStart(4, '0')}`,
      HPOS: children[0].attributes.APOS,
      TPOS: children.at(-1).attributes.LPOS,
      sourceFormat: 'FBX', mappingSchema: 'FbxStagedMapping.v1',
      connectivityAuthority: 'explicit-mapping-port-links',
    },
    children,
  };
}

export function writeNativeStagedJson(entries, resolvedByEntry, links) {
  const entryById = new Map(entries.map((entry) => [entry.mappingEntryId, entry]));
  const adjacency = adjacencyFor(entries, links);
  return connectedComponents(entries, adjacency).map((ids, index) => (
    branchNode(index, pathOrder(ids, adjacency), entryById, resolvedByEntry, links)
  ));
}
