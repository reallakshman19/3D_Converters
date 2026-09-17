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
  return text(value).replace(/\s+/g, '').toUpperCase();
}

const EFFECTIVE_OD_COMPONENT_TYPES = new Set(['FLAN', 'VALV', 'RIGID']);

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
    effectiveOutsideDiameter: childText(node, 'EffectiveOutsideDiameter'),
    position: childText(node, 'Position'),
  };
}

function previousValidOutsideDiameter(records, startIndex) {
  for (let cursor = startIndex - 1; cursor >= 0; cursor -= 1) {
    const value = validOutsideDiameter(records[cursor]?.outsideDiameter);
    if (value !== null) return { value, source: records[cursor], direction: 'previous-node' };
  }
  return null;
}

function nextValidOutsideDiameter(records, startIndex) {
  for (let cursor = startIndex + 1; cursor < records.length; cursor += 1) {
    const value = validOutsideDiameter(records[cursor]?.outsideDiameter);
    if (value !== null) return { value, source: records[cursor], direction: 'next-node' };
  }
  return null;
}

function nearestOutsideDiameter(records, startIndex) {
  return previousValidOutsideDiameter(records, startIndex) || nextValidOutsideDiameter(records, startIndex);
}

function pairedComponentSibling(records, record) {
  const ref = normalizeRef(record.componentRefNo);
  const type = normalizeType(record.componentType);
  const endpoint = Number(record.endpoint);
  if (!ref || !EFFECTIVE_OD_COMPONENT_TYPES.has(type) || ![1, 2].includes(endpoint)) return null;

  const candidates = records.filter((candidate) => {
    if (candidate.index === record.index) return false;
    if (normalizeRef(candidate.componentRefNo) !== ref) return false;
    if (normalizeType(candidate.componentType) !== type) return false;
    const candidateEndpoint = Number(candidate.endpoint);
    return [1, 2].includes(candidateEndpoint) && candidateEndpoint !== endpoint;
  });
  return candidates.length === 1 ? candidates[0] : null;
}

function outwardConnectedOutsideDiameter(records, record, sibling) {
  const direction = sibling.index > record.index ? -1 : 1;
  const ownRef = normalizeRef(record.componentRefNo);
  for (let cursor = record.index + direction; cursor >= 0 && cursor < records.length; cursor += direction) {
    const candidate = records[cursor];
    if (normalizeRef(candidate.componentRefNo) === ownRef) continue;
    const value = validOutsideDiameter(candidate.outsideDiameter);
    if (value !== null) {
      return {
        value,
        source: candidate,
        direction: direction < 0 ? 'previous-connected-node' : 'next-connected-node',
      };
    }
  }
  return null;
}

function resolveEffectiveOutsideDiameter(document, records, record) {
  const sibling = pairedComponentSibling(records, record);
  if (!sibling) return null;
  const resolved = outwardConnectedOutsideDiameter(records, record, sibling);
  if (!resolved) return null;

  const changed = setChildText(document, record.node, 'EffectiveOutsideDiameter', String(resolved.value));
  if (!changed) return null;
  return {
    type: 'effective-outside-diameter-resolved-from-connectivity',
    branchName: record.branchName,
    nodeNumber: record.nodeNumber,
    nodeName: record.nodeName,
    componentType: record.componentType,
    componentRefNo: record.componentRefNo,
    endpoint: record.endpoint,
    sourceOutsideDiameter: validOutsideDiameter(record.outsideDiameter),
    effectiveOutsideDiameter: resolved.value,
    sourceNodeNumber: resolved.source?.nodeNumber || '',
    sourceComponentType: resolved.source?.componentType || '',
    sourceComponentRefNo: resolved.source?.componentRefNo || '',
    method: resolved.direction,
    message: `EffectiveOutsideDiameter ${resolved.value} resolved from ${resolved.direction} ${resolved.source?.nodeNumber || '(blank)'} for ${record.componentType || 'component'} endpoint node ${record.nodeNumber || '(blank)'}; raw OutsideDiameter was preserved.`,
  };
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
      outsideDiameterUnresolvedZeroOrMissing: 0,
      effectiveOutsideDiameterResolvedFromConnectivity: 0,
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

  const rawAppliedRows = [];
  const effectiveRows = [];
  const diagnostics = [];
  let unresolvedCount = 0;

  for (const branch of [...document.getElementsByTagName('Branch')]) {
    const records = childrenByName(branch, 'Node').map((node, index) => nodeRecord(node, index, branch));

    records.forEach((record, index) => {
      const current = validOutsideDiameter(record.outsideDiameter);
      if (current === null) {
        const resolved = nearestOutsideDiameter(records, index);
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
            reason: 'no-neighbor-outside-diameter',
            message: `OutsideDiameter was zero/missing for node ${record.nodeNumber || '(blank)'} and no previous/next branch node had a positive OutsideDiameter.`,
          });
        } else if (setChildText(document, record.node, 'OutsideDiameter', String(resolved.value))) {
          const row = {
            type: 'outside-diameter-resolved-from-neighbor',
            branchName: record.branchName,
            nodeNumber: record.nodeNumber,
            nodeName: record.nodeName,
            componentType: record.componentType,
            componentRefNo: record.componentRefNo,
            originalOutsideDiameter: record.outsideDiameter,
            outsideDiameter: resolved.value,
            sourceNodeNumber: resolved.source?.nodeNumber || '',
            sourceComponentType: resolved.source?.componentType || '',
            sourceComponentRefNo: resolved.source?.componentRefNo || '',
            method: resolved.direction,
            message: `OutsideDiameter ${resolved.value} injected from ${resolved.direction} ${resolved.source?.nodeNumber || '(blank)'} for node ${record.nodeNumber || '(blank)'}.`,
          };
          rawAppliedRows.push(row);
          diagnostics.push(row);
          record.outsideDiameter = String(resolved.value);
        }
      }
    });

    records.forEach((record) => {
      const row = resolveEffectiveOutsideDiameter(document, records, record);
      if (!row) return;
      effectiveRows.push(row);
      diagnostics.push(row);
    });
  }

  const appliedRows = [...rawAppliedRows, ...effectiveRows];
  const stats = {
    outsideDiameterResolvedFromNeighbor: rawAppliedRows.length,
    outsideDiameterUnresolvedZeroOrMissing: unresolvedCount,
    effectiveOutsideDiameterResolvedFromConnectivity: effectiveRows.length,
  };

  if (appliedRows.length || unresolvedCount) {
    diagnostics.push({
      type: 'outside-diameter-resolver-summary',
      resolved: rawAppliedRows.length,
      effectiveResolved: effectiveRows.length,
      unresolved: unresolvedCount,
      message: `OutsideDiameter resolver completed: ${rawAppliedRows.length} zero/missing value(s) resolved from previous/next node, ${effectiveRows.length} effective value(s) resolved from component connectivity, ${unresolvedCount} unresolved.`,
    });
  }

  return {
    xmlText: new XMLSerializer().serializeToString(document),
    appliedCount: appliedRows.length,
    unresolvedCount,
    appliedRows,
    diagnostics,
    stats,
  };
}
