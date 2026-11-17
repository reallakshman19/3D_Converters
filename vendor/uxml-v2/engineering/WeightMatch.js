// Ported from 3D_Converters v045/converters/xml-cii2019-core/weight-match-model.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.
import { textContent } from '../supports/PlainDom.js';

export function toText(value) {
  return value === undefined || value === null ? '' : String(value);
}

export function parseNumericMm(value) {
  const match = toText(value).replace(/mm/gi, ' ').match(/-?\d+(?:\.\d+)?/);
  const numeric = match ? Number(match[0]) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

// PlainDom stand-ins for today's DOM helpers (a PlainElement is {__el, attrs, kids}).
export function xmlLocalName(node) {
  return toText(node?.__el).replace(/^.*:/, '');
}

export function xmlChildrenByName(parent, localName) {
  return (parent?.kids || []).filter((child) => child.__el && xmlLocalName(child) === localName);
}

export function xmlFirstChild(parent, localName) {
  return xmlChildrenByName(parent, localName)[0] || null;
}

export function xmlText(parent, localName) {
  return toText(textContent(xmlFirstChild(parent, localName))).trim();
}

export function normalizePoint(point) {
  if (point === undefined || point === null || point === '') return null;
  if (Array.isArray(point) && point.length >= 3) {
    const x = Number(point[0]);
    const y = Number(point[1]);
    const z = Number(point[2]);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  if (typeof point === 'object') {
    const x = Number(point.x ?? point.X);
    const y = Number(point.y ?? point.Y);
    const z = Number(point.z ?? point.Z);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  const text = toText(point).trim();
  const tokens = text.split(/\s+/g);
  const directional = { x: 0, y: 0, z: 0 };
  let parsedDirectional = false;
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const axis = tokens[i].toUpperCase();
    const value = parseNumericMm(tokens[i + 1]);
    if (!Number.isFinite(value)) continue;
    if (axis === 'E') { directional.x = value; parsedDirectional = true; }
    else if (axis === 'W') { directional.x = -value; parsedDirectional = true; }
    else if (axis === 'N') { directional.y = value; parsedDirectional = true; }
    else if (axis === 'S') { directional.y = -value; parsedDirectional = true; }
    else if (axis === 'U') { directional.z = value; parsedDirectional = true; }
    else if (axis === 'D') { directional.z = -value; parsedDirectional = true; }
  }
  if (parsedDirectional) return directional;
  const values = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

export function xmlCiiRigidWeightOverrideKey(branchName, nodeNumber) {
  return `${toText(branchName).trim()}::${toText(nodeNumber).trim()}`;
}

export function xmlCiiWeightReviewNodeFallbackId(node, nodeIdx) {
  const parts = [
    xmlText(node, 'ComponentRefNo'),
    xmlText(node, 'Endpoint'),
    xmlText(node, 'Position'),
    xmlText(node, 'ComponentType'),
  ].map((part) => toText(part).trim()).filter(Boolean);
  if (parts.length) return parts.join('|');
  return Number.isFinite(Number(nodeIdx)) ? `node-index-${Number(nodeIdx) + 1}` : '';
}

// VALV/INST nodes are never renumbered by the Python engine (only FLAN/RIGID
// are, see xml_to_cii2019_patched.py's RENUMBERABLE_NEGATIVE_TYPES), so their
// NodeNumber stays "-1" permanently — there is no future real number to
// reveal for them the way there is for a suppressed-but-renumbered FLAN/RIGID.
// Showing the raw ComponentRefNo|Endpoint|Position|ComponentType descriptor
// in the NODE column for these is unreadable and duplicates the ComponentRefNo
// column right next to it. The nearest branch-neighbor that already has a
// real positive NodeNumber is the practical "where does this attach" answer,
// so use that (marked with a leading "~" since it's an approximation, not
// this node's own number) instead of dumping the technical descriptor.

export function xmlCiiWeightReviewNodeOverrideKey(branchName, node, nodeIdx) {
  const nodeNumber = xmlText(node, 'NodeNumber');
  if (Number(nodeNumber) > 0) return xmlCiiRigidWeightOverrideKey(branchName, nodeNumber);
  const fallbackId = xmlCiiWeightReviewNodeFallbackId(node, nodeIdx);
  return fallbackId ? xmlCiiRigidWeightOverrideKey(branchName, fallbackId) : xmlCiiRigidWeightOverrideKey(branchName, nodeNumber);
}

export function isXmlCiiRigidNode(node) {
  return xmlText(node, 'ComponentType').toUpperCase() === 'RIGID' || Number(xmlText(node, 'Rigid')) === 2;
}

export function isXmlCiiWeightReviewNode(node, dtxr = '') {
  const compType = xmlText(node, 'ComponentType').toUpperCase();
  const nodeName = xmlText(node, 'NodeName').toUpperCase();
  const dtxrUpper = toText(dtxr).toUpperCase();
  const searchText = `${compType} ${nodeName} ${dtxrUpper}`;
  return isXmlCiiRigidNode(node) ||
         compType.startsWith('INST') ||
         compType.startsWith('FLAN') ||
         compType.startsWith('VALV') ||
         compType === 'VLV' ||
         /FLAN/.test(searchText) ||
         /VALV|\bVLV\b/.test(searchText) ||
         /\bINST\b|INSTRUMENT/.test(searchText);
}

export function xmlCiiNumberText(value) {
  const text = toText(value).replace(/,/g, '').trim();
  if (text === '') return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

export function xmlCiiRigidWeightOverrideKeysForNode(branchName, node, nodeIdx) {
  const nodeNumber = xmlText(node, 'NodeNumber');
  return [
    xmlCiiWeightReviewNodeOverrideKey(branchName, node, nodeIdx),
    xmlCiiRigidWeightOverrideKey(branchName, nodeNumber),
    nodeNumber,
  ].filter((key, index, keys) => toText(key).trim() && keys.indexOf(key) === index);
}

export function xmlCiiRigidWeightOverrideForNode(branchName, node, config, nodeIdx) {
  const overrides = config?.overrides?.rigidWeight || {};
  for (const key of xmlCiiRigidWeightOverrideKeysForNode(branchName, node, nodeIdx)) {
    const numeric = xmlCiiNumberText(overrides[key]);
    if (numeric !== null && numeric > 0) return numeric;
  }
  return null;
}

// Prefer the physical flange span over an incoming route edge that may include
// collapsed pipe/gasket nodes. Only opposite endpoints of the same ComponentRefNo
// can establish the span; ambiguous or missing evidence falls back to route length.

export function xmlCiiForwardElementLengths(nodes) {
  const out = new Array(nodes.length).fill(null);
  const mapPositionToCii = (positionText) => {
    const point = normalizePoint(positionText);
    return point ? [point.x, point.z, -point.y] : null;
  };
  for (let j = 0; j < nodes.length; j += 1) {
    const toNumber = Number(xmlText(nodes[j], 'NodeNumber'));
    if (!Number.isFinite(toNumber) || toNumber <= 0) continue;
    const toPosition = xmlText(nodes[j], 'Position');
    if (!toPosition) continue;
    let fromPosition = null;
    for (let i = j - 1; i >= 0; i -= 1) {
      const fromNumber = Number(xmlText(nodes[i], 'NodeNumber'));
      if (Number.isFinite(fromNumber) && fromNumber > 0) { fromPosition = xmlText(nodes[i], 'Position'); break; }
    }
    const from = mapPositionToCii(fromPosition);
    const to = mapPositionToCii(toPosition);
    if (!from || !to) continue;
    out[j] = Math.sqrt(((to[0] - from[0]) ** 2) + ((to[1] - from[1]) ** 2) + ((to[2] - from[2]) ** 2));
  }
  return out;
}

export const OD_TO_DN = [[10.3,6],[13.7,8],[17.1,10],[21.3,15],[26.7,20],[33.4,25],[42.2,32],[48.3,40],[60.3,50],[73.0,65],[88.9,80],[114.3,100],[141.3,125],[168.3,150],[219.1,200],[273.0,250],[273.1,250],[323.8,300],[323.9,300],[355.6,350],[406.4,400],[457.0,450],[457.2,450],[508.0,500],[609.6,600],[610.0,600],[711.0,700],[762.0,750]];

export function nominalDnFromOd(odNum) {
  if (odNum === null || !Number.isFinite(odNum)) return null;
  let best = null;
  for (const [od, dn] of OD_TO_DN) {
    const err = Math.abs(odNum - od);
    if (!best || err < best.err) best = { od, dn, err };
  }
  return best && best.err <= Math.max(1.5, Math.abs(best.od) * 0.006) ? best.dn : odNum;
}

/**
 * Authoritative *qualified* nominal-bore conversion for consumers that must
 * not display an unknown outside diameter as if it were DN. Weight Match
 * historically returns the OD itself when its mapping table has no match;
 * this stricter read-only API reports that case as unresolved.
 */

export function qualifiedXmlCiiNominalBoreFromOd(od) {
  const numeric = xmlCiiNumberText(od);
  if (numeric === null) return null;
  const mapped = nominalDnFromOd(numeric);
  return mapped !== null && mapped !== numeric ? mapped : null;
}
