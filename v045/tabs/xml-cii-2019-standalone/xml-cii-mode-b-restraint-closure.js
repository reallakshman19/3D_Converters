// Mode B (RCA-01, Owner 12 Nov): a combined XML holds several independent
// sources, each with its own staged JSON. Staged support evidence is matched
// by position and name, so one source's JSON must only ever see that
// source's pipes: two sources can share coordinates (a copy is the extreme
// case). Each source is closed on its own sub-document, and only the
// restraints the closure appended are copied back, node for node.
import { assertModeBClosedNodeRestraints } from '../../../converters/xml-cii2019-core/mode-b-restraint-conservation.js?v=20261113-x4-1';
import { isZeroInformationLimitRestraintElement } from '../../converters/xml-cii2019-core/atta-default-restraint-closure.js?v=20260803-atta-default-rest-closure-1';
import { closeGovernedMdsPositionRestraintsXml } from './xml-cii-mds-restraint-closure.js';

const text = (value) => (value === undefined || value === null ? '' : String(value));
const localName = (node) => text(node?.localName || node?.nodeName).replace(/^.*:/, '');
const elementChildren = (node) => [...(node?.childNodes || [])].filter((child) => child.nodeType === 1);
const byName = (node, name) => elementChildren(node).filter((child) => localName(child) === name);
function descendants(node, name, out = []) {
  for (const child of elementChildren(node)) {
    if (localName(child) === name) out.push(child);
    descendants(child, name, out);
  }
  return out;
}

function refuse(code, message) {
  return Object.assign(new Error(`${code}: ${message}`), { code });
}

function parse(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw refuse('MODE_B_XML_INVALID', 'combined XML does not parse.');
  return document;
}

// The node order the closure walks: every Branch, then its direct Node children.
function closureNodes(container) {
  return descendants(container, 'Branch').flatMap((branch) => byName(branch, 'Node'));
}

function ownerOf(pipe, sources) {
  const owners = new Set();
  for (const node of descendants(pipe, 'NodeNumber')) {
    const number = Number(text(node.textContent).trim());
    if (!Number.isSafeInteger(number) || number <= 0) continue;
    const source = sources.find((entry) => number >= entry.minNode && number <= entry.maxNode);
    owners.add(source ? source.sourceId : '');
  }
  if (owners.size !== 1 || owners.has('')) {
    throw refuse('MODE_B_SOURCE_OWNERSHIP_UNRESOLVED', 'a Pipe has node numbers outside one Mode B source range.');
  }
  return [...owners][0];
}

function mergeStats(base, extra) {
  for (const [key, value] of Object.entries(extra || {})) {
    if (typeof value === 'number' && Number.isFinite(value)) base[key] = Number(base[key] || 0) + value;
  }
  return base;
}

export function closeModeBSourceRestraintsXml(xmlText, sources, config = {}, close = closeGovernedMdsPositionRestraintsXml) {
  const source = text(xmlText);
  const stats = { mdsPositionNodesChanged: 0, mdsRestRestraintsAdded: 0, mdsGuideRestraintsAdded: 0, mdsLineStopRestraintsAdded: 0 };
  const diagnostics = [];
  const document = parse(source);
  const root = document.documentElement;
  const pipes = byName(root, 'Pipe');
  const owners = pipes.map((pipe) => ownerOf(pipe, sources));
  let changed = false;
  for (const entry of sources) {
    const owned = pipes.filter((_, index) => owners[index] === entry.sourceId);
    if (!owned.length) continue;
    if (!text(entry.stagedJsonText).trim()) {
      diagnostics.push({ type: 'mode-b-source-restraint-closure-skipped', sourceId: entry.sourceId, reason: 'no staged JSON for this source' });
      continue;
    }
    // Sub-document: the same root and header, only this source's pipes.
    const sub = parse(source);
    const subPipes = byName(sub.documentElement, 'Pipe');
    subPipes.forEach((pipe, index) => { if (owners[index] !== entry.sourceId) pipe.parentNode.removeChild(pipe); });
    const result = close(new XMLSerializer().serializeToString(sub), entry.stagedJsonText, config);
    for (const item of result?.diagnostics || []) diagnostics.push({ ...item, sourceId: entry.sourceId });
    if (!result?.changed) continue;
    const closedNodes = closureNodes(parse(result.xmlText).documentElement);
    const combinedNodes = owned.flatMap((pipe) => closureNodes(pipe));
    if (closedNodes.length !== combinedNodes.length) {
      throw refuse('MODE_B_SOURCE_NODE_MAP_DRIFT', `source ${entry.sourceId}: closure changed the node count.`);
    }
    combinedNodes.forEach((node, index) => {
      const original = byName(node, 'Restraint');
      const closed = byName(closedNodes[index], 'Restraint');
      const placeholders = original.filter(isZeroInformationLimitRestraintElement);
      const closedPlaceholders = closed.filter(isZeroInformationLimitRestraintElement);
      for (const placeholder of placeholders.slice(closedPlaceholders.length)) node.removeChild(placeholder);
      const before = original.length - placeholders.length;
      const added = [...closed.filter((r) => !isZeroInformationLimitRestraintElement(r)).slice(before),
        ...closedPlaceholders.slice(placeholders.length)];
      for (const restraint of added) {
        node.appendChild(typeof document.importNode === 'function'
          ? document.importNode(restraint, true) : restraint.cloneNode(true));
      }
    });
    combinedNodes.forEach((node, index) => assertModeBClosedNodeRestraints(closedNodes[index], node, entry.sourceId));
    mergeStats(stats, result.stats);
    changed = true;
  }
  return { xmlText: changed ? new XMLSerializer().serializeToString(document) : source, changed, stats, diagnostics };
}
