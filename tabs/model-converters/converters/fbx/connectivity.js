function key(entryId, port) {
  return `${entryId}:${port}`;
}

function fail(message) {
  throw new Error(`BLOCKED_MAPPING ${message}`);
}

export function validateConnectivity(entries, resolvedByEntry) {
  const ports = new Map();
  for (const entry of entries) {
    ports.set(key(entry.mappingEntryId, 'A'), resolvedByEntry.get(entry.mappingEntryId).A);
    ports.set(key(entry.mappingEntryId, 'B'), resolvedByEntry.get(entry.mappingEntryId).B);
  }
  const ownership = new Set();
  const links = [];
  for (const [ownerKey, port] of ports) {
    for (const connection of port.connections) {
      const targetKey = key(connection.mappingEntryId, connection.port);
      if (targetKey === ownerKey) fail(`self-link ${ownerKey}.`);
      const target = ports.get(targetKey);
      if (!target) fail(`dangling link ${ownerKey} -> ${targetKey}.`);
      const symmetric = target.connections.some((item) => key(item.mappingEntryId, item.port) === ownerKey);
      if (!symmetric) fail(`asymmetric link ${ownerKey} -> ${targetKey}.`);
      const pair = [ownerKey, targetKey].sort();
      const pairKey = pair.join('|');
      if (!links.some((item) => item.pairKey === pairKey)) links.push({ pairKey, endpoints: pair });
      if (ownership.has(ownerKey)) fail(`duplicate port ownership ${ownerKey}.`);
      ownership.add(ownerKey);
    }
  }
  return links.sort((a, b) => a.pairKey.localeCompare(b.pairKey));
}
