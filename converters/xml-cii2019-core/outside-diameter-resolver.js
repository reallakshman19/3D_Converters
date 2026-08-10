function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function localName(node) {
  return text(node?.localName || node?.nodeName).replace(/^.*:/, '');
}

function childrenByName(parent, name) {
  return [...(parent?.childNodes || [])].filter((node) => node.nodeType === 1 && localName(node) === name);
}

function firstChild(parent, name) {
  return childrenByName(parent, name)[0] || null;
}

function childText(parent, name) {
  return text(firstChild(parent, name)?.textContent);
}

function setChildText(document, parent, name, value) {
  let child = firstChild(parent, name);
  if (!child) {
    child = parent?.namespaceURI ? document.createElementNS(parent.namespaceURI, name) : document.createElement(name);
    parent.appendChild(child);
  }
  const before = text(child.textContent);
  const after = text(value);
  child.textContent = after;
  return before !== after;
}

function numeric(value) {
  const cleaned = text(value).replace(/,/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function validOutsideDiameter(value) {
  const number = numeric(value);
  return number !== null && number > 0 ? number : null;
}

function normalizeType(value) {
  return text(value).toUpperCase();
}

function normalizeRef(value) {
  return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
}

function sameDiameter(left, right) {
  const a = validOutsideDiameter(left), b = validOutsideDiameter(right);
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= Math.max(0.5, Math.max(Math.abs(a), Math.abs(b)) * 0.005);
}

const SIZE_CHANGE_TYPES = new Set(['REDU', 'REDUCER', 'REE']);
const PASS_THROUGH_TYPES = new Set(['FLAN', 'VALV', 'RIGID', 'INST']);

function isSizeChange(record) {
  return SIZE_CHANGE_TYPES.has(normalizeType(record?.componentType));
}

function branchName(branch) {
  return childText(branch, 'Branchname');
}

function nodeRecord(node, index, branch) {
  return {
    node,
    index,
    branchName: branchName(branch),
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName: childText(node, 'NodeName'),
    endpoint: childText(node, 'Endpoint'),
    componentType: childText(node, 'ComponentType'),
    componentRefNo: childText(node, 'ComponentRefNo'),
    outsideDiameter: childText(node, 'OutsideDiameter'),
    position: childText(node, 'Position'),
  };
}

function scanValidOutsideDiameter(records, startIndex, step, excludedIndices = null) {
  for (let cursor = startIndex + step; cursor >= 0 && cursor < records.length; cursor += step) {
    if (excludedIndices?.has(cursor)) continue;
    const row = records[cursor];
    if (isSizeChange(row)) return null;
    const value = validOutsideDiameter(row?.outsideDiameter);
    if (value !== null) return { value, source: row, direction: step < 0 ? 'previous-node' : 'next-node' };
  }
  return null;
}

function qualifiedNeighborOutsideDiameter(records, startIndex) {
  const current = records[startIndex];
  if (isSizeChange(current)) return { resolved: null, reason: 'size-change-component' };
  const previous = scanValidOutsideDiameter(records, startIndex, -1);
  const next = scanValidOutsideDiameter(records, startIndex, 1);
  if (previous && next && !sameDiameter(previous.value, next.value)) return { resolved: null, reason: 'neighbor-diameters-disagree', previous, next };
  return { resolved: previous || next, reason: previous || next ? '' : 'no-neighbor-outside-diameter', previous, next };
}

function uniqueDiameters(records, indices) {
  const values = [];
  for (const index of indices) {
    const value = validOutsideDiameter(records[index]?.outsideDiameter);
    if (value === null || values.some((existing) => sameDiameter(existing, value))) continue;
    values.push(value);
  }
  return values;
}

function passThroughGroups(records) {
  const groups = new Map();
  records.forEach((record, index) => {
    const ref = normalizeRef(record.componentRefNo);
    if (!ref || !PASS_THROUGH_TYPES.has(normalizeType(record.componentType))) return;
    if (!groups.has(ref)) groups.set(ref, []);
    groups.get(ref).push(index);
  });
  return groups;
}

export function resolveXmlCiiEffectiveOutsideDiameterRows(records) {
  const corrections = [];
  const unresolved = [];
  for (const [componentRefNo, indices] of passThroughGroups(records)) {
    const sourceDiameters = uniqueDiameters(records, indices);
    if (sourceDiameters.length <= 1) continue;
    const excluded = new Set(indices);
    const firstIndex = Math.min(...indices);
    const lastIndex = Math.max(...indices);
    const previous = scanValidOutsideDiameter(records, firstIndex, -1, excluded);
    const next = scanValidOutsideDiameter(records, lastIndex, 1, excluded);
    let effective = null;
    let method = '';
    if (previous && next && sameDiameter(previous.value, next.value)) {
      effective = previous.value;
      method = 'adjacent-flow-path-both-sides';
    } else if (previous && !next && sourceDiameters.some((value) => sameDiameter(value, previous.value))) {
      effective = previous.value;
      method = 'adjacent-flow-path-previous';
    } else if (next && !previous && sourceDiameters.some((value) => sameDiameter(value, next.value))) {
      effective = next.value;
      method = 'adjacent-flow-path-next';
    } else if (previous && next && !sameDiameter(previous.value, next.value)) {
      unresolved.push({ componentRefNo, indices: [...indices], sourceDiameters, previous: previous.value, next: next.value, reason: 'adjacent-flow-path-disagrees' });
      continue;
    } else {
      unresolved.push({ componentRefNo, indices: [...indices], sourceDiameters, previous: previous?.value ?? null, next: next?.value ?? null, reason: 'insufficient-flow-path-authority' });
      continue;
    }
    for (const index of indices) {
      const raw = validOutsideDiameter(records[index]?.outsideDiameter);
      if (raw === null || sameDiameter(raw, effective)) continue;
      corrections.push({ index, componentRefNo, sourceOutsideDiameter: raw, effectiveOutsideDiameter: effective, method, previousNodeNumber: previous?.source?.nodeNumber || '', nextNodeNumber: next?.source?.nodeNumber || '' });
    }
  }
  return { corrections, unresolved };
}

export function applyXmlCiiOutsideDiameterResolver(xmlText, options = {}) {
  const empty = {
    xmlText,
    appliedCount: 0,
    unresolvedCount: 0,
    appliedRows: [],
    diagnostics: [],
    stats: {
      outsideDiameterResolvedFromNeighbor: 0,
      endpointOutsideDiameterResolvedFromFlowPath: 0,
      endpointOutsideDiameterUnresolved: 0,
      outsideDiameterUnresolvedZeroOrMissing: 0,
    },
  };

  if (!text(xmlText) || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return empty;

  let document = null;
  try {
    document = new DOMParser().parseFromString(text(xmlText), 'application/xml');
    if (document.getElementsByTagName('parsererror').length) return empty;
  } catch {
    return empty;
  }

  const appliedRows = [];
  const diagnostics = [];
  let unresolvedCount = 0;
  let zeroMissingResolved = 0;
  let endpointResolved = 0;
  let endpointUnresolved = 0;

  for (const branch of [...document.getElementsByTagName('Branch')]) {
    const records = childrenByName(branch, 'Node').map((node, index) => nodeRecord(node, index, branch));

    records.forEach((record, index) => {
      const current = validOutsideDiameter(record.outsideDiameter);
      if (current !== null) return;

      const decision = qualifiedNeighborOutsideDiameter(records, index);
      const resolved = decision.resolved;
      if (!resolved) {
        unresolvedCount += 1;
        diagnostics.push({
          type: 'outside-diameter-unresolved',
          branchName: record.branchName,
          nodeNumber: record.nodeNumber,
          nodeName: record.nodeName,
          componentType: record.componentType,
          componentRefNo: record.componentRefNo,
          originalOutsideDiameter: record.outsideDiameter,
          reason: decision.reason,
          previousOutsideDiameter: decision.previous?.value ?? null,
          nextOutsideDiameter: decision.next?.value ?? null,
          message: `OutsideDiameter was zero/missing for node ${record.nodeNumber || '(blank)'} and was not resolved because ${decision.reason}.`,
        });
        return;
      }

      if (!setChildText(document, record.node, 'OutsideDiameter', String(resolved.value))) return;
      record.outsideDiameter = String(resolved.value);
      const row = {
        type: 'outside-diameter-resolved-from-qualified-neighbor',
        branchName: record.branchName,
        nodeNumber: record.nodeNumber,
        nodeName: record.nodeName,
        componentType: record.componentType,
        componentRefNo: record.componentRefNo,
        originalOutsideDiameter: '',
        outsideDiameter: resolved.value,
        sourceNodeNumber: resolved.source?.nodeNumber || '',
        sourceComponentType: resolved.source?.componentType || '',
        sourceComponentRefNo: resolved.source?.componentRefNo || '',
        method: resolved.direction,
        message: `OutsideDiameter ${resolved.value} injected from qualified ${resolved.direction} ${resolved.source?.nodeNumber || '(blank)'} for node ${record.nodeNumber || '(blank)'}.`,
      };
      zeroMissingResolved += 1;
      appliedRows.push(row);
      diagnostics.push(row);
    });

    const endpointAuthority = resolveXmlCiiEffectiveOutsideDiameterRows(records);
    for (const correction of endpointAuthority.corrections) {
      const record = records[correction.index];
      setChildText(document, record.node, 'SourceOutsideDiameter', String(correction.sourceOutsideDiameter));
      setChildText(document, record.node, 'EffectiveOutsideDiameter', String(correction.effectiveOutsideDiameter));
      setChildText(document, record.node, 'OutsideDiameter', String(correction.effectiveOutsideDiameter));
      record.outsideDiameter = String(correction.effectiveOutsideDiameter);
      const row = {
        type: 'endpoint-outside-diameter-resolved-from-flow-path',
        branchName: record.branchName,
        nodeNumber: record.nodeNumber,
        endpoint: record.endpoint,
        componentType: record.componentType,
        componentRefNo: record.componentRefNo,
        sourceOutsideDiameter: correction.sourceOutsideDiameter,
        effectiveOutsideDiameter: correction.effectiveOutsideDiameter,
        method: correction.method,
        previousNodeNumber: correction.previousNodeNumber,
        nextNodeNumber: correction.nextNodeNumber,
        message: `Raw endpoint OutsideDiameter ${correction.sourceOutsideDiameter} retained as SourceOutsideDiameter; effective CII flow-path OD is ${correction.effectiveOutsideDiameter}.`,
      };
      endpointResolved += 1;
      appliedRows.push(row);
      diagnostics.push(row);
    }
    for (const unresolved of endpointAuthority.unresolved) {
      endpointUnresolved += 1;
      diagnostics.push({
        type: 'endpoint-outside-diameter-review-required',
        branchName: branchName(branch),
        componentRefNo: unresolved.componentRefNo,
        sourceDiameters: unresolved.sourceDiameters,
        previousOutsideDiameter: unresolved.previous,
        nextOutsideDiameter: unresolved.next,
        reason: unresolved.reason,
        message: `Pass-through component ${unresolved.componentRefNo} has conflicting endpoint OutsideDiameter values but no unique adjacent flow-path authority; raw values were preserved for review.`,
      });
    }
  }

  const stats = {
    outsideDiameterResolvedFromNeighbor: zeroMissingResolved,
    endpointOutsideDiameterResolvedFromFlowPath: endpointResolved,
    endpointOutsideDiameterUnresolved: endpointUnresolved,
    outsideDiameterUnresolvedZeroOrMissing: unresolvedCount,
  };

  if (appliedRows.length || unresolvedCount || endpointUnresolved) {
    diagnostics.push({
      type: 'outside-diameter-resolver-summary',
      resolved: appliedRows.length,
      zeroMissingResolved,
      endpointResolved,
      endpointUnresolved,
      unresolved: unresolvedCount,
      message: `OutsideDiameter authority completed: ${zeroMissingResolved} zero/missing value(s) resolved, ${endpointResolved} endpoint discontinuity value(s) resolved from flow-path continuity, ${endpointUnresolved} endpoint group(s) require review, ${unresolvedCount} zero/missing value(s) unresolved.`,
    });
  }

  return {
    xmlText: new XMLSerializer().serializeToString(document),
    appliedCount: appliedRows.length,
    unresolvedCount: unresolvedCount + endpointUnresolved,
    appliedRows,
    diagnostics,
    stats,
  };
}
