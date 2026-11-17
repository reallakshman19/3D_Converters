// Ported from 3D_Converters v045: converters/xml-cii2019-core/node-bore-od-authority.js (synchronizeXmlCiiNodeBoreWithOutsideDiameter),
// tabs/xml-cii-2019-standalone/xml-cii-source-wall.js (snapshotSourceWalls, restoreSourceWalls) and
// tabs/xml-cii-2019-standalone/xml-cii-transfer-protection.js (readTransferProtection, snapshotTransferProtection,
// restoreTransferProtection): the three steps today runs after its process parity, in this order. On PlainElements, no DOM.
// The parity-expectation helpers (expectSourceWalls, protectExpectedEntries) belong to today's evidence check: not here.
import { childText, childrenByName, createElement, elementsByName, firstChild, parsePlainXml, serializePlainXml, textContent } from '../PlainDom.js';
import { qualifiedXmlCiiNominalBoreFromOd } from '../../engineering/index.js';

const clean = (value) => String(value ?? '').trim();
function setLeafText(parent, name, content) {
  let element = firstChild(parent, name);
  if (!element) { element = createElement(name); parent.kids.push(element); }
  if (clean(textContent(element)) === content) return false;
  element.kids = content === '' ? [] : [{ __text: content }];
  return true;
}

// --- per-node nominal DN from the effective outside diameter -----------------------------------------------------------
const positive = (value) => {
  const s = clean(value);
  if (!/^(?:\+)?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) return null;
  const n = Number(s); return Number.isFinite(n) && n > 0 ? n : null;
};
/** Only BoreMm text changes: every node with a qualified OD carries its own DN; an unknown OD is diagnosed, not converted. */
export function synchronizeXmlCiiNodeBoreWithOutsideDiameter(xmlText) {
  const doc = parsePlainXml(clean(xmlText));
  const updated = [], unresolved = [], mixedBranches = [];
  elementsByName(doc.root, 'Branch').forEach((branch, branchOrdinal) => {
    const branchName = childText(branch, 'Branchname'), bores = new Set();
    childrenByName(branch, 'Node').forEach((node, nodeOrdinal) => {
      const nodeNumber = childText(node, 'NodeNumber'), oldRaw = childText(node, 'BoreMm');
      const od = positive(childText(node, 'OutsideDiameter') || childText(node, 'OuterDiameter') || childText(node, 'OD'));
      const dn = od === null ? null : qualifiedXmlCiiNominalBoreFromOd(od);
      if (dn === null) {
        if (od !== null) unresolved.push({ type: 'bore-unqualified-od', branchName, branchOrdinal, nodeOrdinal, nodeNumber, outsideDiameterMm: od, existingBoreMm: oldRaw || null,
          reason: 'Positive OD has no qualified standard OD-to-DN mapping; line name cannot establish nominal DN' });
        return;
      }
      bores.add(dn);
      if (setLeafText(node, 'BoreMm', Number(dn).toFixed(3))) updated.push({ type: 'node-bore-rederived-from-outside-diameter', branchName, branchOrdinal, nodeOrdinal, nodeNumber,
        componentRefNo: childText(node, 'ComponentRefNo'), outsideDiameterMm: od, previousBoreMm: oldRaw || null, revisedBoreMm: dn, authority: 'effective-node-outside-diameter' });
    });
    if (bores.size > 1) mixedBranches.push({ type: 'mixed-diameter-branch', branchName, branchOrdinal, nominalBoresMm: [...bores].sort((a, b) => a - b),
      reason: 'A reducer or size transition prevents using one branch-wide BoreMm' });
  });
  return { xmlText: updated.length ? serializePlainXml(doc) : xmlText, diagnostics: [...updated, ...unresolved, ...mixedBranches],
    stats: { nodeBoreRecomputedFromEffectiveOd: updated.length, nodeBoreUnresolvedOd: unresolved.length, mixedDiameterBranches: mixedBranches.length } };
}

// --- source walls (Owner 14 Nov, GOLDEN-30 L: a wall the source XML states wins over the piping-class fill) ---------------
function wallKeys(branch) {
  const seen = new Map();
  return childrenByName(branch, 'Node').map((node) => {
    const ref = childText(node, 'ComponentRefNo');
    const base = ref ? `ref|${childText(node, 'ComponentType')}|${ref}|${childText(node, 'Endpoint')}` : `num|${childText(node, 'NodeNumber')}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return `${base}|${n}`;
  });
}
function namedBranches(root) {
  const branches = elementsByName(root, 'Branch').map((b) => [childText(b, 'Branchname'), b]);
  const counts = new Map();
  for (const [name] of branches) counts.set(name, (counts.get(name) || 0) + 1);
  return branches.filter(([name]) => name && counts.get(name) === 1);
}
/** Source walls > 0 keyed by branch and component; null when the source states none. */
export function snapshotSourceWalls(xmlText) {
  const walls = new Map();
  for (const [name, branch] of namedBranches(parsePlainXml(String(xmlText || '')).root)) {
    const keys = wallKeys(branch);
    childrenByName(branch, 'Node').forEach((node, i) => { const raw = childText(node, 'WallThickness'); if (Number(raw) > 0) walls.set(`${name}#${keys[i]}`, raw); });
  }
  return walls.size ? walls : null;
}
export function restoreSourceWalls(xmlText, walls) {
  const out = { xmlText, kept: [], diagnostics: [] };
  if (!walls) return out;
  const doc = parsePlainXml(String(xmlText || ''));
  for (const [name, branch] of namedBranches(doc.root)) {
    const keys = wallKeys(branch);
    childrenByName(branch, 'Node').forEach((node, nodeOrdinal) => {
      const want = walls.get(`${name}#${keys[nodeOrdinal]}`);
      if (want === undefined) return;
      const runValue = childText(node, 'WallThickness');
      if (firstChild(node, 'WallThickness') && runValue === want) return;
      setLeafText(node, 'WallThickness', want);
      out.kept.push({ branchName: name, nodeNumber: childText(node, 'NodeNumber'), nodeOrdinal, value: want, runValue });
    });
  }
  if (!out.kept.length) return out;
  out.xmlText = serializePlainXml(doc);
  out.diagnostics.push({ type: 'source-wall-kept', severity: 'info', count: out.kept.length,
    message: `${out.kept.length} node(s) keep the wall thickness stated in the source XML instead of the piping-class value.` });
  return out;
}

// --- transfer protection (Owner D5, 13 Nov: transferred values win) --------------------------------------------------------
const BRANCH_PATHS = new Set([...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`Temperature/Temperature${n}`, `Pressure/Pressure${n}`]),
  'Pressure/HydroPressure', 'FluidDensity', 'MaterialNumber', 'InsulationDensity']);
const NODE_FIELDS = new Set(['NodeName', 'Weight', 'WallThickness', 'CorrosionAllowance', 'InsulationThickness', 'OutsideDiameter']);
const NOTE_RE = /<!--\s*TOPOFIX-TRANSFER-PROTECT\s*([\s\S]*?)-->/;
const leafAt = (owner, path) => path.split('/').reduce((el, part) => firstChild(el, part), owner);
const leafText = (el) => (el ? textContent(el) : null);
function setLeaf(owner, path, value) {
  const parts = path.split('/');
  const parent = parts.slice(0, -1).reduce((el, part) => { let next = firstChild(el, part); if (!next) { next = createElement(part); el.kids.push(next); } return next; }, owner);
  setLeafText(parent, parts.at(-1), value);
}
/** The protection list in the XML text (comments are read from the text: PlainDom drops them), or null. */
export function readTransferProtection(xmlText) {
  const found = NOTE_RE.exec(String(xmlText || ''));
  if (!found) return null;
  let parsed;
  try { parsed = JSON.parse(found[1]); } catch { return { error: 'TRANSFER_PROTECT_UNREADABLE', note: found[0] }; }
  if (!parsed || parsed.v !== 1) return { error: 'TRANSFER_PROTECT_VERSION', note: found[0] };
  const keep = (obj, allowed) => new Map(Object.entries(obj || {}).map(([k, list]) => [k, (Array.isArray(list) ? list : []).filter((x) => allowed.has(x))]).filter(([, list]) => list.length));
  return { branches: keep(parsed.branches, BRANCH_PATHS), nodes: keep(parsed.nodes, NODE_FIELDS), note: found[0] };
}
function withNote(xmlText, note) {
  const textOut = String(xmlText || '');
  if (!note || NOTE_RE.test(textOut)) return textOut;
  const decl = /^\s*<\?xml[^>]*\?>\r?\n?/.exec(textOut);
  const at = decl ? decl[0].length : 0;
  return `${textOut.slice(0, at)}${note}\n${textOut.slice(at)}`;
}
const branchesOf = (root) => elementsByName(root, 'Branch').map((b) => [childText(b, 'Branchname'), b]);
export function snapshotTransferProtection(xmlText) {
  const protection = readTransferProtection(xmlText);
  if (!protection) return null;
  if (protection.error) return { error: protection.error, note: protection.note, values: [] };
  let root;
  try { root = parsePlainXml(String(xmlText || '')).root; } catch { return { error: 'TRANSFER_PROTECT_UNPARSED', note: protection.note, values: [] }; }
  const values = [], counts = new Map();
  for (const [name] of branchesOf(root)) counts.set(name, (counts.get(name) || 0) + 1);
  for (const [name, branch] of branchesOf(root)) {
    if (counts.get(name) !== 1) continue;
    for (const path of protection.branches.get(name) || []) { const v = leafText(leafAt(branch, path)); if (v !== null && v.trim() !== '') values.push({ scope: 'branch', branchName: name, path, value: v.trim() }); }
    const nodes = childrenByName(branch, 'Node'), numbers = nodes.map((node) => childText(node, 'NodeNumber'));
    nodes.forEach((node, i) => {
      const nodeNumber = numbers[i];
      if (numbers.indexOf(nodeNumber) !== numbers.lastIndexOf(nodeNumber)) return;
      for (const field of protection.nodes.get(`${name}|${nodeNumber}`) || []) { const v = leafText(firstChild(node, field)); if (v !== null) values.push({ scope: 'node', branchName: name, nodeNumber, path: field, value: v.trim() }); }
    });
  }
  return { values, note: protection.note };
}
export function restoreTransferProtection(xmlText, snapshot) {
  const out = { xmlText: snapshot ? withNote(xmlText, snapshot.note) : xmlText, restored: 0, diagnostics: [] };
  if (!snapshot) return out;
  const warn = (code) => out.diagnostics.push({ type: 'transfer-protection', severity: 'warning', code, message: 'The transfer protection note in this XML could not be applied; master values were used.' });
  if (snapshot.error) { warn(snapshot.error); return out; }
  if (!snapshot.values.length) return out;
  let doc;
  try { doc = parsePlainXml(String(xmlText || '')); } catch { warn('TRANSFER_PROTECT_UNPARSED'); return out; }
  const byName = new Map(branchesOf(doc.root)), changed = [];
  let namesCleared = 0;
  for (const v of snapshot.values) {
    const branch = byName.get(v.branchName);
    const owner = !branch ? null : v.scope === 'branch' ? branch : childrenByName(branch, 'Node').find((n) => childText(n, 'NodeNumber') === v.nodeNumber);
    if (!owner) continue;
    const before = leafText(leafAt(owner, v.path));
    if (before !== v.value) { setLeaf(owner, v.path, v.value); changed.push({ ...v, runValue: before }); }
    if (v.scope !== 'branch' || v.path !== 'MaterialNumber') continue;
    for (const node of childrenByName(branch, 'Node')) {
      const code = firstChild(node, 'MaterialCode');
      if (code && textContent(code) !== v.value) { changed.push({ scope: 'node', branchName: v.branchName, nodeNumber: childText(node, 'NodeNumber'), path: 'MaterialCode', value: v.value, runValue: textContent(code) }); setLeafText(node, 'MaterialCode', v.value); }
      const name = firstChild(node, 'MaterialName');
      if (name && textContent(name) !== '') { setLeafText(node, 'MaterialName', ''); namesCleared += 1; }
    }
  }
  if (!changed.length && !namesCleared) return out;
  out.restored = changed.length;
  out.xmlText = withNote(serializePlainXml(doc), snapshot.note);
  out.diagnostics.push({ type: 'transfer-protection', severity: 'info', count: changed.length, message: `${changed.length} transferred value(s) kept over the master values (Owner D5).`,
    values: changed.map(({ scope, branchName, nodeNumber, path, value, runValue }) => ({ scope, branchName, nodeNumber, path, value, masterValue: runValue })) });
  return out;
}
