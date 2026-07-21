function portAttributes(port) {
  return {
    authority: port.authority,
    geometryObjectId: port.geometryObjectId,
    positionMm: { x: port.positionMm[0], y: port.positionMm[1], z: port.positionMm[2] },
    ...(port.vertexIndex === undefined ? {} : { vertexIndex: port.vertexIndex }),
    ...(port.controlPointIndex === undefined ? {} : { controlPointIndex: port.controlPointIndex }),
    connections: port.connections.map((item) => ({ ...item })),
  };
}

export function writeNativeStagedJson(entries, resolvedByEntry, links) {
  const children = entries.map((entry) => {
    const ports = resolvedByEntry.get(entry.mappingEntryId);
    return {
      type: 'PIPE',
      id: entry.logicalComponentId,
      name: entry.logicalComponentId,
      attributes: {
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
  });
  return [{
    type: 'BRANCH',
    name: 'FBX Mapping Authority',
    attributes: { sourceFormat: 'FBX', mappingSchema: 'FbxStagedMapping.v1' },
    children,
  }];
}
