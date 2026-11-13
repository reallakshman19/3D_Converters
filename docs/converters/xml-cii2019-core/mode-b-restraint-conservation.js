import { isZeroInformationLimitRestraintElement } from './atta-default-restraint-closure.js?v=20260803-atta-default-rest-closure-1';

// X4: Compare the original PSI116 restraints to the combined XML. Positive
// IDs are shared within a source and translated only by the offset manifest.
// Nonpositive helper IDs are not unique; use their source-local occurrence.
const name = (node) => String(node?.localName || node?.nodeName || '').replace(/^.*:/, '');
const children = (node, tag) => [...(node?.childNodes || [])].filter((child) => child.nodeType === 1 && name(child) === tag);
const value = (node, tag) => children(node, tag)[0]?.textContent?.trim() ?? null;
const DIRECTIONS = ['DirectionCosineX', 'DirectionCosineY', 'DirectionCosineZ'];
const restraintSignatures = (node) => children(node, 'Restraint')
  .filter((restraint) => !isZeroInformationLimitRestraintElement(restraint)).map(signature);
// Run parity may fill a zero-information LIM placeholder (e.g. Stiffness),
// so it can reappear as a real LIM that duplicates one already present.
const placeholderCount = (node) => children(node, 'Restraint').filter(isZeroInformationLimitRestraintElement).length;
const DIRECTION_TOLERANCE = 1e-6;
const LIMIT_TYPES = new Set(['LIM', 'LIMIT', 'LINESTOP']);
const identityFields = ['ComponentRefNo', 'Endpoint', 'Position', 'ComponentType'];
const helperIdentity = (node, branch) => [value(branch, 'Branchname'), ...identityFields.map((field) => value(node, field))];

export function modeBRestraintRefusal(detail) {
  const code = 'MODE_B_RESTRAINT_NOT_CONSERVED';
  return Object.assign(new Error(`${code}: ${detail}`), { code });
}

function number(raw, field) {
  if (raw === null || raw === '') return 0;
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
    ...unitDirection(DIRECTIONS.map((field) => number(value(restraint, field), field)))];
}

// Scale first to avoid overflow/underflow when normalising finite cosines.
function unitDirection(direction) {
  const scale = Math.max(...direction.map(Math.abs));
  if (scale === 0) return [0, 0, 0];
  const scaled = direction.map((n) => n / scale);
  const length = Math.hypot(...scaled);
  return scaled.map((n) => n / length);
}

function sameSignature(a, b) {
  if (a[0] !== b[0] || a[1] !== b[1]) return false;
  const aZero = a.slice(2).every((n) => n === 0);
  const bZero = b.slice(2).every((n) => n === 0);
  return aZero === bZero && Math.hypot(...a.slice(2).map((n, i) => n - b[i + 2])) <= DIRECTION_TOLERANCE;
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
    const placeholders = placeholderCount(node);
    return [{ sourceNumber, pipeOrdinal, branchOrdinal, nodeOrdinal,
      ...(sourceNumber <= 0 ? { helperIdentity: helperIdentity(node, branch) } : {}), restraints,
      ...(placeholders ? { placeholders } : {}) }];
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
  if (manifest?.schema !== 'xml-node-offset-combine/v1' || manifest.restraintInventoryVersion !== 2
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
    return { source, numbers, index, actual: new Map(), placeholders: new Map() };
  });
  return { sources, owners };
}

function key(number, pipeOrdinal, branchOrdinal, nodeOrdinal, identity) {
  return number > 0 ? String(number) : `${number}@${pipeOrdinal}/${branchOrdinal}/${nodeOrdinal}:${JSON.stringify(identity)}`;
}

function addRestraints(inventory, nodeKey, restraints) {
  let entries = inventory.get(nodeKey);
  if (!entries) { entries = []; inventory.set(nodeKey, entries); }
  entries.push(...restraints);
}

function indexPipe(pipe, source, owners, pipeOrdinal) {
  for (const { node, branch, branchOrdinal, nodeOrdinal } of nodesInPipe(pipe)) {
    const raw = value(node, 'NodeNumber');
    const owner = owners.get(Number(raw));
    if (owner !== undefined && owner !== source.index) {
      throw modeBRestraintRefusal('combined Pipe contains a mapped node from a different source.');
    }
    const restraints = restraintSignatures(node);
    const placeholders = placeholderCount(node);
    if (!restraints.length) {
      // Placeholder-only nodes keep their old leniency; only count them when
      // the number is valid and owned by this source.
      const n = /^-?\d+$/.test(raw || '') ? Number(raw) : NaN;
      if (placeholders && Number.isSafeInteger(n) && (n <= 0 || owner === source.index)) {
        source.placeholders.set(key(n, pipeOrdinal, branchOrdinal, nodeOrdinal, n <= 0 ? helperIdentity(node, branch) : null), placeholders);
      }
      continue;
    }
    const n = nodeNumber(node);
    // A restrained positive ID outside the exact source map cannot be
    // assigned by range or guessed from its position.
    if (n > 0 && owner !== source.index) {
      throw modeBRestraintRefusal(`source ${source.index + 1}: restrained node ${n} has no source node map entry.`);
    }
    const nodeKey = key(n, pipeOrdinal, branchOrdinal, nodeOrdinal, n <= 0 ? helperIdentity(node, branch) : null);
    addRestraints(source.actual, nodeKey, restraints);
    if (placeholders) source.placeholders.set(nodeKey, placeholders);
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

function expectedInventory({ source, numbers, index }, placeholderCounts = new Map()) {
  const expected = new Map();
  for (const row of source.restraintInventory) {
    const { sourceNumber, pipeOrdinal, branchOrdinal, nodeOrdinal, restraints, helperIdentity: identity, placeholders = 0 } = row || {};
    if (!Number.isSafeInteger(sourceNumber) || ![pipeOrdinal, branchOrdinal, nodeOrdinal].every((n) => Number.isSafeInteger(n) && n >= 0)
        || pipeOrdinal >= source.pipeCount || (sourceNumber <= 0 && (!Array.isArray(identity) || identity.length !== 5
          || !identity.every((v) => v === null || typeof v === 'string')))
        || !Array.isArray(restraints) || !restraints.length || !restraints.every((r) => Array.isArray(r) && r.length === 5
          && typeof r[0] === 'string' && r[0] && r.slice(1).every(Number.isFinite))
        || !Number.isSafeInteger(placeholders) || placeholders < 0) {
      throw modeBRestraintRefusal(`source ${index + 1}: invalid restraint inventory row.`);
    }
    const mapped = sourceNumber > 0 ? numbers.get(sourceNumber) : sourceNumber;
    if (mapped === undefined) throw modeBRestraintRefusal(`source ${index + 1}: node ${sourceNumber} is missing from the node map.`);
    const nodeKey = key(mapped, pipeOrdinal, branchOrdinal, nodeOrdinal, identity);
    addRestraints(expected, nodeKey, restraints);
    if (placeholders) placeholderCounts.set(nodeKey, (placeholderCounts.get(nodeKey) || 0) + placeholders);
  }
  return expected;
}

// Match occurrences one-to-one (not rounded signature buckets). Augmenting
// paths avoid a false loss when several directions overlap within tolerance.
function compareNode(expected, actual, label, allowAdditions, placeholderAllowance = 0) {
  const matched = new Array(actual.length).fill(-1);
  function match(i, seen) {
    for (let j = 0; j < actual.length; j += 1) {
      if (seen.has(j) || !sameSignature(expected[i], actual[j])) continue;
      seen.add(j);
      if (matched[j] === -1 || match(matched[j], seen)) { matched[j] = i; return true; }
    }
    return false;
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (!match(i, new Set())) {
      throw modeBRestraintRefusal(`${label}: missing restraint occurrence ${JSON.stringify(expected[i])}.`);
    }
  }
  for (let j = 0; j < actual.length; j += 1) {
    if (matched[j] !== -1) continue;
    const duplicate = expected.some((sig) => sameSignature(sig, actual[j]));
    // A filled placeholder may duplicate a real LIM; allow at most the number
    // of placeholders that node carried before Run, and only of a LIM type.
    if (allowAdditions && duplicate && placeholderAllowance > 0 && LIMIT_TYPES.has(actual[j][0])) {
      placeholderAllowance -= 1;
      continue;
    }
    if (!allowAdditions || duplicate) {
      throw modeBRestraintRefusal(`${label}: unexpected restraint occurrence ${JSON.stringify(actual[j])}.`);
    }
  }
}

function compareSource(entry, stage, expected, allowAdditions = false, placeholders = new Map()) {
  if (!expected) expected = expectedInventory(entry, placeholders);
  const nodes = new Set([...expected.keys(), ...entry.actual.keys()]);
  for (const nodeKey of nodes) {
    compareNode(expected.get(nodeKey) || [], entry.actual.get(nodeKey) || [],
      `${stage}: source ${entry.index + 1} (${entry.source.fileName}), combined node ${nodeKey}`, allowAdditions,
      placeholders.get(nodeKey) || 0);
  }
}

export function assertModeBRestraintsConserved(xmlText, manifest, stage = 'combined XML', { allowAdditions = false } = {}) {
  for (const source of indexCombined(xmlText, manifest)) compareSource(source, stage, undefined, allowAdditions);
}

// Also retain new restraints added during per-source Run enrichment. The
// original source inventory was already verified at the engine boundary.
export function assertModeBRunXmlRestraintsPreserved(before, after, manifest) {
  const expected = indexCombined(before, manifest);
  const actual = indexCombined(after, manifest);
  for (const source of actual) {
    compareSource(source, 'Run enriched XML', expected[source.index].actual, true, expected[source.index].placeholders);
  }
}

// The X1 closure has already isolated the source by the manifest-derived
// ranges. It copies by node occurrence, so verify that the exact node was
// retained and every closed restraint reached the combined node.
export function assertModeBClosedNodeRestraints(closed, combined, sourceId) {
  const restraints = restraintSignatures(closed);
  if (!restraints.length && !restraintSignatures(combined).length) return;
  const label = `source ${sourceId}, closure node ${value(closed, 'NodeNumber')}`;
  const n = nodeNumber(closed);
  if (n !== nodeNumber(combined) || (n <= 0 && JSON.stringify(helperIdentity(closed, closed.parentNode))
      !== JSON.stringify(helperIdentity(combined, combined.parentNode)))) {
    throw modeBRestraintRefusal(`${label}: closure node map drift.`);
  }
  compareNode(restraints, restraintSignatures(combined), label, false);
}
