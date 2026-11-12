// X4: Compare the original PSI116 restraints to the combined XML. Positive
// IDs are shared within a source and translated only by the offset manifest.
// Nonpositive helper IDs are not unique; use their source-local occurrence.
const name = (node) => String(node?.localName || node?.nodeName || '').replace(/^.*:/, '');
const children = (node, tag) => [...(node?.childNodes || [])].filter((child) => child.nodeType === 1 && name(child) === tag);
const value = (node, tag) => children(node, tag)[0]?.textContent?.trim() ?? null;
const DIRECTIONS = ['DirectionCosineX', 'DirectionCosineY', 'DirectionCosineZ'];
const restraintSignatures = (node) => children(node, 'Restraint').map(signature);
const identityFields = ['ComponentRefNo', 'Endpoint', 'Position', 'ComponentType'];
const helperIdentity = (node, branch) => [value(branch, 'Branchname'), ...identityFields.map((field) => value(node, field))];

export function modeBRestraintRefusal(detail) {
  const code = 'MODE_B_RESTRAINT_NOT_CONSERVED';
  return Object.assign(new Error(`${code}: ${detail}`), { code });
}

function number(raw, field) {
  if (raw === null) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) || !Number.isFinite(Number(raw))) throw modeBRestraintRefusal(`invalid ${field}: ${raw}`);
  return Number(raw);
}

function nodeNumber(node) {
  const raw = value(node, 'NodeNumber');
  if (!/^-?\d+$/.test(raw || '') || !Number.isSafeInteger(Number(raw))) {
    throw modeBRestraintRefusal(`a restrained node has no valid NodeNumber: ${raw}`);
  }
  return Number(raw);
}

function signature(restraint) {
  const type = value(restraint, 'Type');
  if (!type) throw modeBRestraintRefusal('a restraint has no Type.');
  return [type.toUpperCase(), number(value(restraint, 'Gap'), 'Gap'),
    ...DIRECTIONS.map((field) => number(value(restraint, field), field))];
}

function nodesInPipe(pipe) {
  return children(pipe, 'Branch').flatMap((branch, branchOrdinal) => children(branch, 'Node')
    .map((node, nodeOrdinal) => ({ node, branch, branchOrdinal, nodeOrdinal })));
}

// Capture independently from the unmodified source document, never from the
// combined output (otherwise a lost restraint would become the baseline).
export function captureModeBSourceRestraints(root) {
  return children(root, 'Pipe').flatMap((pipe, pipeOrdinal) => nodesInPipe(pipe).flatMap(({ node, branch, branchOrdinal, nodeOrdinal }) => {
    const restraints = restraintSignatures(node);
    if (!restraints.length) return [];
    const sourceNumber = nodeNumber(node);
    return [{ sourceNumber, pipeOrdinal, branchOrdinal, nodeOrdinal,
      ...(sourceNumber <= 0 ? { helperIdentity: helperIdentity(node, branch) } : {}), restraints }];
  }));
}

function parseCombined(xmlText) {
  const document = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
  if (document.getElementsByTagName('parsererror').length || name(document.documentElement) !== 'PipeStressExport') {
    throw modeBRestraintRefusal('combined PSI116 XML is missing or invalid.');
  }
  return document.documentElement;
}

function manifestMaps(manifest) {
  if (manifest?.schema !== 'xml-node-offset-combine/v1' || manifest.restraintInventoryVersion !== 1
      || !Array.isArray(manifest.sourceOrder) || manifest.sourceOrder.length < 2
      || manifest.sourceOrder.length !== manifest.sourceCount) {
    throw modeBRestraintRefusal('pre-combination restraint inventory is missing; combine the sources again.');
  }
  const owners = new Map();
  const sources = manifest.sourceOrder.map((source, index) => {
    if (!Array.isArray(source?.numberMap) || !Array.isArray(source?.restraintInventory)
        || !Number.isSafeInteger(source.offset) || source.offset < 0
        || !Number.isSafeInteger(source.pipeCount) || source.pipeCount <= 0) {
      throw modeBRestraintRefusal(`source ${index + 1}: invalid restraint inventory or node map.`);
    }
    const numbers = new Map();
    for (const { sourceNumber, outputNumber } of source.numberMap) {
      if (!Number.isSafeInteger(sourceNumber) || sourceNumber <= 0 || !Number.isSafeInteger(outputNumber)
          || outputNumber !== sourceNumber + source.offset || numbers.has(sourceNumber) || owners.has(outputNumber)) {
        throw modeBRestraintRefusal(`source ${index + 1}: ambiguous or invalid node map.`);
      }
      numbers.set(sourceNumber, outputNumber);
      owners.set(outputNumber, index);
    }
    return { source, numbers, index, actual: new Map() };
  });
  return { sources, owners };
}

function key(number, pipeOrdinal, branchOrdinal, nodeOrdinal, identity) {
  return number > 0 ? String(number) : `${number}@${pipeOrdinal}/${branchOrdinal}/${nodeOrdinal}:${JSON.stringify(identity)}`;
}

function addRestraints(inventory, nodeKey, restraints) {
  let counts = inventory.get(nodeKey);
  if (!counts) { counts = new Map(); inventory.set(nodeKey, counts); }
  for (const restraint of restraints) {
    const token = JSON.stringify(restraint);
    counts.set(token, (counts.get(token) || 0) + 1);
  }
}

function indexPipe(pipe, source, owners, pipeOrdinal) {
  for (const { node, branch, branchOrdinal, nodeOrdinal } of nodesInPipe(pipe)) {
    const raw = value(node, 'NodeNumber');
    const owner = owners.get(Number(raw));
    if (owner !== undefined && owner !== source.index) {
      throw modeBRestraintRefusal('combined Pipe contains a mapped node from a different source.');
    }
    const restraints = restraintSignatures(node);
    if (!restraints.length) continue;
    const n = nodeNumber(node);
    // A restrained positive ID outside the exact source map cannot be
    // assigned by range or guessed from its position.
    if (n > 0 && owner !== source.index) {
      throw modeBRestraintRefusal(`source ${source.index + 1}: restrained node ${n} has no source node map entry.`);
    }
    addRestraints(source.actual, key(n, pipeOrdinal, branchOrdinal, nodeOrdinal,
      n <= 0 ? helperIdentity(node, branch) : null), restraints);
  }
}

function indexCombined(xmlText, manifest) {
  const { sources, owners } = manifestMaps(manifest);
  const pipes = children(parseCombined(xmlText), 'Pipe');
  const expectedPipes = sources.reduce((sum, entry) => sum + entry.source.pipeCount, 0);
  if (pipes.length !== expectedPipes) throw modeBRestraintRefusal('combined Pipe count changed; source restraint ownership cannot be verified.');
  // The combiner emits all pipes in manifest source order. Positive IDs
  // cross-check that order. Negative-only pipes rely on the preserved order
  // and the helper occurrence identity, not the shared negative number.
  let next = 0;
  for (const source of sources) {
    for (let i = 0; i < source.source.pipeCount; i += 1) indexPipe(pipes[next++], source, owners, i);
  }
  return sources;
}

function expectedInventory({ source, numbers, index }) {
  const expected = new Map();
  for (const row of source.restraintInventory) {
    const { sourceNumber, pipeOrdinal, branchOrdinal, nodeOrdinal, restraints, helperIdentity: identity } = row || {};
    if (!Number.isSafeInteger(sourceNumber) || ![pipeOrdinal, branchOrdinal, nodeOrdinal].every((n) => Number.isSafeInteger(n) && n >= 0)
        || pipeOrdinal >= source.pipeCount || (sourceNumber <= 0 && (!Array.isArray(identity) || identity.length !== 5
          || !identity.every((v) => v === null || typeof v === 'string')))
        || !Array.isArray(restraints) || !restraints.length || !restraints.every((r) => Array.isArray(r) && r.length === 5
          && typeof r[0] === 'string' && r[0] && r.slice(1).every((n) => n === null || Number.isFinite(n)))) {
      throw modeBRestraintRefusal(`source ${index + 1}: invalid restraint inventory row.`);
    }
    const mapped = sourceNumber > 0 ? numbers.get(sourceNumber) : sourceNumber;
    if (mapped === undefined) throw modeBRestraintRefusal(`source ${index + 1}: node ${sourceNumber} is missing from the node map.`);
    addRestraints(expected, key(mapped, pipeOrdinal, branchOrdinal, nodeOrdinal, identity), restraints);
  }
  return expected;
}

function compareSource(entry, stage, expected = expectedInventory(entry)) {
  for (const [nodeKey, counts] of expected) {
    const actual = entry.actual.get(nodeKey);
    for (const [signature, count] of counts) {
      const found = actual?.get(signature) || 0;
      if (found < count) {
        throw modeBRestraintRefusal(`${stage}: source ${entry.index + 1} (${entry.source.fileName}), combined node ${nodeKey}: expected ${count} restraint(s) ${signature}, found ${found}.`);
      }
    }
  }
}

export function assertModeBRestraintsConserved(xmlText, manifest, stage = 'combined XML') {
  for (const source of indexCombined(xmlText, manifest)) compareSource(source, stage);
}

// Also retain new restraints added during per-source Run enrichment. The
// original source inventory was already verified at the engine boundary.
export function assertModeBRunXmlRestraintsPreserved(before, after, manifest) {
  const expected = indexCombined(before, manifest);
  const actual = indexCombined(after, manifest);
  for (const source of actual) compareSource(source, 'Run enriched XML', expected[source.index].actual);
}

// The X1 closure has already isolated the source by the manifest-derived
// ranges. It copies by node occurrence, so verify that the exact node was
// retained and every closed restraint reached the combined node.
export function assertModeBClosedNodeRestraints(closed, combined, sourceId) {
  const restraints = restraintSignatures(closed);
  if (!restraints.length) return;
  const label = `source ${sourceId}, closure node ${value(closed, 'NodeNumber')}`;
  const n = nodeNumber(closed);
  if (n !== nodeNumber(combined) || (n <= 0 && JSON.stringify(helperIdentity(closed, closed.parentNode))
      !== JSON.stringify(helperIdentity(combined, combined.parentNode)))) {
    throw modeBRestraintRefusal(`${label}: closure node map drift.`);
  }
  const expected = new Map();
  const actual = new Map();
  addRestraints(expected, label, restraints);
  addRestraints(actual, label, restraintSignatures(combined));
  for (const [sig, count] of expected.get(label)) {
    if ((actual.get(label).get(sig) || 0) < count) throw modeBRestraintRefusal(`${label}: closed restraint ${sig} was not copied back.`);
  }
}
