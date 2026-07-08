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
  const match = text(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function positiveNodeNumber(node) {
  const number = numeric(childText(node, 'NodeNumber'));
  return number !== null && number > 0 ? Math.round(number) : null;
}

function point(positionText) {
  const values = text(positionText).match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

function distance(leftText, rightText) {
  const left = point(leftText);
  const right = point(rightText);
  if (!left || !right) return null;
  const value = Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
  return Number.isFinite(value) ? value : null;
}

function branchNameForNode(node) {
  let current = node?.parentNode || null;
  while (current) {
    if (current.nodeType === 1 && localName(current) === 'Branch') return childText(current, 'Branchname');
    current = current.parentNode || null;
  }
  return '';
}

function buildNodeNumberPositionIndex(document) {
  const index = new Map();
  for (const node of [...document.getElementsByTagName('Node')]) {
    const nodeNumber = positiveNodeNumber(node);
    if (nodeNumber === null) continue;
    const position = childText(node, 'Position');
    if (!position) continue;
    const key = String(nodeNumber);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ node, position, branchName: branchNameForNode(node) });
  }
  return index;
}

function samePosition(left, right, toleranceMm) {
  const value = distance(left, right);
  return value !== null && value <= toleranceMm;
}

function isConnectorLike(node) {
  const connectionType = childText(node, 'ConnectionType').toUpperCase();
  const componentType = childText(node, 'ComponentType').toUpperCase();
  return connectionType === 'BRAN' || connectionType === 'OLET' || componentType === 'BRAN' || componentType === 'RIGID';
}

function hasSameNumberElsewhere(index, node, nodeNumber, position, toleranceMm) {
  const rows = index.get(String(nodeNumber)) || [];
  return rows.some((row) => row.node !== node && samePosition(position, row.position, toleranceMm));
}

function shouldPreserveShortDroppedNumber(index, node, nodeNumber, position, isLastPositiveInBranch, toleranceMm) {
  if (hasSameNumberElsewhere(index, node, nodeNumber, position, toleranceMm)) return true;
  return isLastPositiveInBranch && isConnectorLike(node);
}

export function applyXmlCiiShortDropContinuity(xmlText, options = {}) {
  const empty = {
    xmlText,
    appliedCount: 0,
    diagnostics: [],
    stats: { shortDropContinuityRenumbered: 0 },
  };
  if (!text(xmlText) || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return empty;

  let document = null;
  try {
    document = new DOMParser().parseFromString(text(xmlText), 'application/xml');
    if (document.getElementsByTagName('parsererror').length) return empty;
  } catch {
    return empty;
  }

  const thresholdMm = Math.max(0, Number(options?.config?.shortElementLengthDropThresholdMm ?? options.shortElementLengthDropThresholdMm ?? 6));
  const toleranceMm = Math.max(0.001, Number(options?.config?.shortDropContinuityToleranceMm ?? options.shortDropContinuityToleranceMm ?? 0.01));
  const index = buildNodeNumberPositionIndex(document);
  const diagnostics = [];
  let appliedCount = 0;

  for (const branch of [...document.getElementsByTagName('Branch')]) {
    const positiveNodes = childrenByName(branch, 'Node').filter((node) => positiveNodeNumber(node) !== null);
    if (positiveNodes.length < 2) continue;
    const kept = [positiveNodes[0]];
    for (let i = 1; i < positiveNodes.length; i += 1) {
      const node = positiveNodes[i];
      const previous = kept[kept.length - 1];
      const length = distance(childText(previous, 'Position'), childText(node, 'Position'));
      const nodeNumber = positiveNodeNumber(node);
      if (nodeNumber === null || length === null || length > thresholdMm) {
        kept.push(node);
        continue;
      }
      const previousNumber = positiveNodeNumber(previous);
      if (previousNumber === null || previousNumber === nodeNumber) continue;
      const isLastPositiveInBranch = i === positiveNodes.length - 1;
      const position = childText(node, 'Position');
      if (!shouldPreserveShortDroppedNumber(index, node, nodeNumber, position, isLastPositiveInBranch, toleranceMm)) continue;
      if (!setChildText(document, previous, 'NodeNumber', String(nodeNumber))) continue;
      appliedCount += 1;
      diagnostics.push({
        type: 'short-drop-continuity-renumbered',
        branchName: childText(branch, 'Branchname'),
        fromNodeNumber: previousNumber,
        toNodeNumber: nodeNumber,
        droppedNodeNumber: nodeNumber,
        droppedComponentType: childText(node, 'ComponentType'),
        droppedConnectionType: childText(node, 'ConnectionType'),
        lengthMm: length,
        thresholdMm,
        method: 'preserve-short-dropped-positive-node-number',
        message: `Preserved continuity across short dropped node ${nodeNumber} by renumbering previous kept node ${previousNumber} to ${nodeNumber}.`,
      });
    }
  }

  return {
    xmlText: appliedCount ? new XMLSerializer().serializeToString(document) : xmlText,
    appliedCount,
    diagnostics,
    stats: { shortDropContinuityRenumbered: appliedCount },
  };
}
