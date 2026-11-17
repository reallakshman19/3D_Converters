// Ported from 3D_Converters v045/tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js
// (applyPreviewRunParity, lines 246-470): what today does to the parent-enrichment XML after the parent support loop.
// Kept: in-line element lengths for negative FLAN/VALV/RIGID/INST nodes, SIF=0 on DTXR_POS tees/olets, and the
// split-condensed renumbering (negative nodes -> positive numbers, Rigid=2 after Endpoint), which fixes node identity.
// Not here: today's preview process data (xmlCiiDryRunPreview rows: process block and node facts; engineering values).
import { childrenByName, createElement, elementsByName, firstChild, textContent } from '../PlainDom.js';

const RENUMBERABLE = new Set(['FLAN', 'VALV', 'RIGID', 'INST']);
const INLINE_LENGTH = new Set(['FLAN', 'VALV', 'RIGID', 'INST']);
const RIGID_MARKER = new Set(['FLAN', 'VALV', 'RIGID', 'INST']);
const SIF_ZERO_TYPES = new Set(['TEE', 'OLET', 'WELDOLET', 'SOCKOLET', 'THREDOLET', 'THREADOLET', 'ELBOLET', 'LATROLET', 'SWEEPOLET', 'NIPOLET']);

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());
const childText = (el, name) => text(textContent(firstChild(el, name)));
const truthy = (value) => value === true || (typeof value === 'number' ? value !== 0 : /^(1|true|yes|on)$/i.test(text(value)));

function numericValue(value) {
  const match = text(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

/** Today's setText / setTextAfter: '' writes nothing; a new child goes after `anchorName` when given. Returns changed. */
function setText(parent, name, value, anchorName) {
  const clean = text(value);
  if (clean === '') return false;
  let element = firstChild(parent, name);
  if (!element) {
    element = createElement(name);
    const anchor = anchorName ? firstChild(parent, anchorName) : null;
    const at = anchor ? parent.kids.indexOf(anchor) : -1;
    if (at >= 0) parent.kids.splice(at + 1, 0, element); else parent.kids.push(element);
  }
  const before = text(textContent(element));
  element.kids = [{ __text: clean }];
  return before !== clean;
}

function pointFromPosition(positionText) {
  const values = text(positionText).match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? [values[0], values[2], -values[1]] : null;
}

function distanceBetweenPositions(fromText, toText) {
  const from = pointFromPosition(fromText), to = pointFromPosition(toText);
  if (!from || !to) return null;
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  return Number.isFinite(length) ? length : null;
}

function previousPositiveNode(nodes, startIndex) {
  for (let i = startIndex; i >= 0; i -= 1) { const n = numericValue(childText(nodes[i], 'NodeNumber')); if (n !== null && n > 0) return nodes[i]; }
  return null;
}

function sameComponentRefMate(nodes, index) {
  const ref = childText(nodes[index], 'ComponentRefNo'), endpoint = childText(nodes[index], 'Endpoint');
  if (!ref) return null;
  const mate = (i) => childText(nodes[i], 'ComponentRefNo') === ref && childText(nodes[i], 'Endpoint') !== endpoint;
  for (let i = index + 1; i < nodes.length; i += 1) if (mate(i)) return nodes[i];
  for (let i = index - 1; i >= 0; i -= 1) if (mate(i)) return nodes[i];
  return null;
}

function annotateInlineElementLengths(root, stats, diagnostics) {
  let count = 0;
  for (const branch of elementsByName(root, 'Branch')) {
    const nodes = childrenByName(branch, 'Node');
    nodes.forEach((node, index) => {
      if (!INLINE_LENGTH.has(childText(node, 'ComponentType').toUpperCase())) return;
      const nodeNumber = numericValue(childText(node, 'NodeNumber'));
      if (nodeNumber === null || nodeNumber >= 0) return;
      const existing = numericValue(childText(node, 'ElementLengthMm'));
      if (existing !== null && existing > 0) return;
      const mate = sameComponentRefMate(nodes, index), previous = previousPositiveNode(nodes, index - 1);
      const length = mate ? distanceBetweenPositions(childText(node, 'Position'), childText(mate, 'Position'))
        : previous ? distanceBetweenPositions(childText(previous, 'Position'), childText(node, 'Position')) : null;
      if (length !== null && length > 0 && setText(node, 'ElementLengthMm', length.toFixed(3))) count += 1;
    });
  }
  stats.inlineElementLengthAnnotations = count;
  stats.instElementLengthAnnotations = count;
  if (count > 0) diagnostics.push({ type: 'element-length-inline-negative', componentTypes: [...INLINE_LENGTH], annotatedNodes: count });
}

function applyDtxrPosSifZero(root, stats, diagnostics) {
  let count = 0;
  for (const node of elementsByName(root, 'Node')) {
    const dtxrPos = childText(node, 'DTXR_POS') || childText(node, 'TEEDESC_POS');
    if (!dtxrPos) continue;
    const type = childText(node, 'ComponentType').toUpperCase();
    const descriptor = ['ComponentType', 'NodeName', 'ComponentRefNo', 'DTXR_POS', 'TEEDESC_POS'].map((n) => childText(node, n)).filter(Boolean).join(' ').toUpperCase();
    if (!SIF_ZERO_TYPES.has(type) && !/\bTEE\b/.test(descriptor) && !/OLET\b/.test(descriptor)) continue;
    if (setText(node, 'SIF', '0')) count += 1;
    diagnostics.push({ type: 'dtxr-pos-sif-zero', nodeNumber: childText(node, 'NodeNumber'), componentType: childText(node, 'ComponentType'), dtxrPos });
  }
  stats.dtxrPosSifZeroAnnotations = count;
}

function positiveFromOriginal(original, nodes, start, step) {
  for (let i = start; i >= 0 && i < nodes.length; i += step) { const o = original.get(nodes[i]); if (o !== null && o !== undefined && o > 0) return Math.round(o); }
  return null;
}

function allocateContiguousNumbers(nodes, start, end, original, used, fallback) {
  const count = end - start;
  const previous = positiveFromOriginal(original, nodes, start - 1, -1), next = positiveFromOriginal(original, nodes, end, 1);
  let first = next !== null && next - count > 0 ? next - count : null;
  if (first !== null && previous !== null && first <= previous) first = null;
  if (first === null && previous !== null) first = previous + 1;
  if (first !== null && next !== null && first + count > next) first = null;
  if (first !== null) {
    const candidates = Array.from({ length: count }, (_, k) => first + k);
    if (!candidates.some((c) => used.has(c))) return candidates;
  }
  const out = [];
  for (let k = 0; k < count; k += 1) { while (used.has(fallback.value)) fallback.value += 10; out.push(fallback.value); fallback.value += 10; }
  return out;
}

function renumberLengthBearingNegativeNodes(root) {
  const nodesByBranch = elementsByName(root, 'Branch').map((b) => childrenByName(b, 'Node'));
  const original = new Map(), used = new Set();
  for (const nodes of nodesByBranch) for (const node of nodes) {
    const n = numericValue(childText(node, 'NodeNumber'));
    original.set(node, n);
    if (n !== null && n > 0) used.add(Math.round(n));
  }
  const eligible = (node) => {
    const n = original.get(node), len = numericValue(childText(node, 'ElementLengthMm'));
    return n !== null && n !== undefined && n < 0 && RENUMBERABLE.has(childText(node, 'ComponentType').toUpperCase()) && len !== null && len > 0;
  };
  const fallback = { value: 10000 };
  const result = { renumberedNodes: 0, rigidMarkers: 0, condensedValveFlangeBlocks: 0 };
  for (const nodes of nodesByBranch) {
    let index = 0;
    while (index < nodes.length) {
      if (!eligible(nodes[index])) { index += 1; continue; }
      const start = index;
      while (index < nodes.length && eligible(nodes[index])) index += 1;
      const numbers = allocateContiguousNumbers(nodes, start, index, original, used, fallback);
      if (numbers.length > 1) result.condensedValveFlangeBlocks += 1;
      numbers.forEach((assigned, k) => {
        const node = nodes[start + k];
        setText(node, 'NodeNumber', assigned);
        if (RIGID_MARKER.has(childText(node, 'ComponentType').toUpperCase()) && setText(node, 'Rigid', '2', 'Endpoint')) result.rigidMarkers += 1;
        used.add(assigned);
        result.renumberedNodes += 1;
      });
    }
  }
  return result;
}

/** Today's finishing steps after the parent loop, in place on the PlainElement root. */
export function finishParentEnrichment(root, config, stats = {}, diagnostics = []) {
  annotateInlineElementLengths(root, stats, diagnostics);
  applyDtxrPosSifZero(root, stats, diagnostics);
  const enabled = truthy(config.splitCondensedValveFlange) || truthy(config.split_condensed_valve_flange);
  stats.condenseRigidXsd = truthy(config.condenseRigidXsd);
  stats.splitCondensedValveFlange = enabled;
  if (!enabled) return { stats, diagnostics };
  const r = renumberLengthBearingNegativeNodes(root);
  Object.assign(stats, { splitCondensedRigidNodes: r.renumberedNodes, instRigid2Annotations: r.rigidMarkers, resolvedRigidMarkers: r.rigidMarkers, condensedValveFlangeBlocks: r.condensedValveFlangeBlocks });
  diagnostics.push({ type: 'split-condensed-valve-flange-resolved', enabled: true, renumberedNodes: r.renumberedNodes, instRigid2Annotations: r.rigidMarkers, condensedValveFlangeBlocks: r.condensedValveFlangeBlocks });
  return { stats, diagnostics };
}
