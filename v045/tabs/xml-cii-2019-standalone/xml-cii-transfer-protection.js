// Owner D5, 13 Nov 2026: "Transferred values win" over the line list, the masters and the
// converter defaults. The transfer tool (U2d) writes one XML comment that lists the values it
// moved:
//   <!--TOPOFIX-TRANSFER-PROTECT {"v":1,"branches":{"<Branchname>":["Temperature/Temperature1",
//        "FluidDensity","MaterialNumber"]},"nodes":{"<Branchname>|<NodeNumber>":["WallThickness"]}}-->
// Step 10 refills process and material values from the masters several times. This module reads
// the source values of the listed fields before the run and puts them back after the last refill,
// and makes the run's parity check expect them. A protected branch MaterialNumber also sets every
// node MaterialCode of that branch (the CII writer reads node codes first) and clears the node
// MaterialName, which named the master's material, not the transferred one.

export const TRANSFER_PROTECT_MARK = 'TOPOFIX-TRANSFER-PROTECT';

const BRANCH_PATHS = new Set([
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`Temperature/Temperature${n}`, `Pressure/Pressure${n}`]),
  'Pressure/HydroPressure', 'FluidDensity', 'MaterialNumber', 'InsulationDensity',
]);
const NODE_FIELDS = new Set(['NodeName', 'Weight', 'WallThickness', 'CorrosionAllowance', 'InsulationThickness', 'OutsideDiameter']);

const kids = (el, name) => [...(el?.childNodes || [])].filter((c) => c.nodeType === 1 && (c.localName || c.nodeName) === name);
const first = (el, name) => kids(el, name)[0] || null;
const textOf = (el) => (el ? String(el.textContent ?? '') : null);

function leafAt(owner, path) {
  let el = owner;
  for (const part of path.split('/')) el = first(el, part);
  return el;
}

function setLeaf(document, owner, path, value) {
  const parts = path.split('/');
  let el = owner;
  for (const part of parts) {
    let next = first(el, part);
    if (!next) {
      next = el.namespaceURI ? document.createElementNS(el.namespaceURI, part) : document.createElement(part);
      el.appendChild(next);
    }
    el = next;
  }
  el.textContent = value;
}

const NOTE_RE = /<!--\s*TOPOFIX-TRANSFER-PROTECT\s*([\s\S]*?)-->/;

/** The protection list in the XML text, or null when there is none. Read from the text, not the
 * DOM: the Node/Worker XML DOM of this app drops comments. */
export function readTransferProtection(xmlText) {
  const found = NOTE_RE.exec(String(xmlText || ''));
  if (!found) return null;
  let parsed;
  try { parsed = JSON.parse(found[1]); } catch { return { error: 'TRANSFER_PROTECT_UNREADABLE', note: found[0] }; }
  if (!parsed || parsed.v !== 1) return { error: 'TRANSFER_PROTECT_VERSION', note: found[0] };
  const keep = (obj, allowed) => new Map(Object.entries(obj || {})
    .map(([k, list]) => [k, (Array.isArray(list) ? list : []).filter((x) => allowed.has(x))])
    .filter(([, list]) => list.length));
  return { branches: keep(parsed.branches, BRANCH_PATHS), nodes: keep(parsed.nodes, NODE_FIELDS), note: found[0] };
}

/** Carry the note into the run's output, so converting that output again keeps the protection. */
function withNote(xmlText, note) {
  const textOut = String(xmlText || '');
  if (!note || NOTE_RE.test(textOut)) return textOut;
  const decl = /^\s*<\?xml[^>]*\?>\r?\n?/.exec(textOut);
  const at = decl ? decl[0].length : 0;
  return `${textOut.slice(0, at)}${note}\n${textOut.slice(at)}`;
}

function branchesOf(document) {
  return [...document.getElementsByTagName('Branch')].map((b) => [textOf(first(b, 'Branchname'))?.trim() || '', b]);
}

/** Copy the source's note into an output another step wrote (the engine's enriched XML is an
 * ElementTree rewrite that drops comments), so converting that output again stays protected. */
export function carryTransferNote(sourceText, outputText) {
  const found = NOTE_RE.exec(String(sourceText || ''));
  return found ? withNote(outputText, found[0]) : outputText;
}

/** Source values of the protected fields. Fields absent in the source are not protected. */
export function snapshotTransferProtection(xmlText) {
  const protection = readTransferProtection(xmlText);
  if (!protection) return null;
  if (protection.error) return { error: protection.error, note: protection.note, values: [] };
  if (typeof DOMParser === 'undefined') return { error: 'TRANSFER_PROTECT_NO_DOM', note: protection.note, values: [] };
  const document = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return { error: 'TRANSFER_PROTECT_UNPARSED', note: protection.note, values: [] };
  const values = [];
  const counts = new Map();
  for (const [name] of branchesOf(document)) counts.set(name, (counts.get(name) || 0) + 1);
  for (const [name, branch] of branchesOf(document)) {
    if (counts.get(name) !== 1) continue; // a shared branch name cannot be keyed safely
    for (const path of protection.branches.get(name) || []) {
      const v = textOf(leafAt(branch, path));
      if (v !== null && v.trim() !== '') values.push({ scope: 'branch', branchName: name, path, value: v.trim() });
    }
    const numbers = kids(branch, 'Node').map((node) => textOf(first(node, 'NodeNumber'))?.trim() || '');
    for (const [i, node] of kids(branch, 'Node').entries()) {
      const nodeNumber = numbers[i];
      if (numbers.indexOf(nodeNumber) !== numbers.lastIndexOf(nodeNumber)) continue; // repeated number: not keyable
      for (const field of protection.nodes.get(`${name}|${nodeNumber}`) || []) {
        const v = textOf(first(node, field));
        if (v !== null) values.push({ scope: 'node', branchName: name, nodeNumber, path: field, value: v.trim() });
      }
    }
  }
  return { values, note: protection.note };
}

/** Put the protected values back into the run's final XML. */
export function restoreTransferProtection(xmlText, snapshot) {
  const out = { xmlText: snapshot ? withNote(xmlText, snapshot.note) : xmlText, restored: 0, diagnostics: [] };
  if (!snapshot) return out;
  const warn = (code) => out.diagnostics.push({ type: 'transfer-protection', severity: 'warning', code,
    message: 'The transfer protection note in this XML could not be applied; master values were used.' });
  if (snapshot.error) { warn(snapshot.error); return out; }
  if (!snapshot.values.length) return out;
  const document = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) { warn('TRANSFER_PROTECT_UNPARSED'); return out; }
  const byName = new Map(branchesOf(document));
  const changed = [];
  let namesCleared = 0;
  for (const v of snapshot.values) {
    const branch = byName.get(v.branchName);
    if (!branch) continue;
    const owner = v.scope === 'branch' ? branch
      : kids(branch, 'Node').find((n) => (textOf(first(n, 'NodeNumber'))?.trim() || '') === v.nodeNumber);
    if (!owner) continue;
    const before = textOf(leafAt(owner, v.path));
    if (before !== v.value) {
      setLeaf(document, owner, v.path, v.value);
      changed.push({ ...v, runValue: before });
    }
    if (v.scope === 'branch' && v.path === 'MaterialNumber') {
      for (const node of kids(branch, 'Node')) {
        const code = first(node, 'MaterialCode');
        if (code && textOf(code) !== v.value) {
          changed.push({ scope: 'node', branchName: v.branchName, nodeNumber: textOf(first(node, 'NodeNumber'))?.trim() || '', path: 'MaterialCode', value: v.value, runValue: textOf(code) });
          setLeaf(document, node, 'MaterialCode', v.value);
        }
        const name = first(node, 'MaterialName');
        if (name && textOf(name) !== '') { setLeaf(document, node, 'MaterialName', ''); namesCleared += 1; }
      }
    }
  }
  if (!changed.length && !namesCleared) return out;
  out.restored = changed.length;
  out.xmlText = withNote(new XMLSerializer().serializeToString(document), snapshot.note);
  out.diagnostics.push({ type: 'transfer-protection', severity: 'info', count: changed.length,
    message: `${changed.length} transferred value(s) kept over the master values (Owner D5).`,
    values: changed.map(({ scope, branchName, nodeNumber, path, value, runValue }) => ({ scope, branchName, nodeNumber, path, value, masterValue: runValue })) });
  return out;
}

/** Make the run's parity expectations agree with the protected values. */
export function protectExpectedEntries(entries, snapshot) {
  if (!snapshot?.values?.length || !Array.isArray(entries)) return entries;
  const key = (scope, b, n, p) => `${scope}|${b}|${n ?? ''}|${p}`;
  const want = new Map(snapshot.values.map((v) => [key(v.scope, v.branchName, v.nodeNumber, v.path), v.value]));
  const material = new Map(snapshot.values.filter((v) => v.scope === 'branch' && v.path === 'MaterialNumber').map((v) => [v.branchName, v.value]));
  return entries.map((e) => {
    const path = Array.isArray(e.path) ? e.path.join('/') : String(e.path || '');
    const k = key(e.scope, e.branchName, e.scope === 'node' ? String(e.nodeNumber ?? '') : undefined, path);
    if (want.has(k)) return { ...e, expected: want.get(k), source: 'transfer-protection' };
    if (e.scope === 'node' && material.has(e.branchName)) {
      if (path === 'MaterialCode') return { ...e, expected: material.get(e.branchName), source: 'transfer-protection' };
      if (path === 'MaterialName') return { ...e, expected: '', source: 'transfer-protection' };
    }
    return e;
  });
}
