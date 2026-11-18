// Support locks in step 10, step 2 (Owner 18 Nov 2026: "Support locks in step 10", "Yes, add step 2").
// The TOPOFIX-TRANSFER-PROTECT note can name nodes whose supports a transfer from CAESAR II set:
//   "supports": ["<Branchname>|<NodeNumber>", ...]   (uxml/v2/transfer/TransferNote.js writes it)
// The supports step restores protected values during process parity, but the ATTA-default and MDS-closure
// steps that follow add default supports again (measured 18 Nov: EF-05 node 90's removed support came back).
// So the stage copies the <Restraint> entries of each named node from its input and, as its very last step,
// puts exactly those back on that node: what the run added there is removed, what it removed comes back.
// Keyed as the note keys nodes today: a branch name used once and a NodeNumber used once in that branch.
// No note, or a note without `supports`: nothing changes (the text is returned as it came).
import { childText, childrenByName, elementsByName, parsePlainXml, serializePlainXml } from '../PlainDom.js';

const NOTE_RE = /<!--\s*TOPOFIX-TRANSFER-PROTECT\s*([\s\S]*?)-->/;
const clone = (el) => JSON.parse(JSON.stringify(el));

/** The note's `supports` keys in the XML text (comments are read from the text: PlainDom drops them); [] when none. */
export function transferSupportKeys(xmlText) {
  const found = NOTE_RE.exec(String(xmlText || ''));
  if (!found) return [];
  let note;
  try { note = JSON.parse(found[1]); } catch { return []; } // an unreadable note is reported by ProcessParityFinish
  return note?.v === 1 && Array.isArray(note.supports) ? note.supports.map(String) : [];
}

/** key -> the node element, for nodes keyable as the note keys them (unique branch name, unique NodeNumber). */
function keyedNodes(root) {
  const branches = elementsByName(root, 'Branch');
  const names = new Map();
  for (const b of branches) names.set(childText(b, 'Branchname'), (names.get(childText(b, 'Branchname')) || 0) + 1);
  const out = new Map();
  for (const b of branches) {
    const name = childText(b, 'Branchname');
    if (names.get(name) !== 1) continue;
    const nodes = childrenByName(b, 'Node');
    const numbers = nodes.map((n) => childText(n, 'NodeNumber'));
    nodes.forEach((n, i) => { if (numbers.indexOf(numbers[i]) === numbers.lastIndexOf(numbers[i])) out.set(`${name}|${numbers[i]}`, n); });
  }
  return out;
}

/** The input's restraints on every node the note names: {keys, restraints: Map key -> [Restraint element]} or null. */
export function snapshotTransferSupports(xmlText) {
  const keys = transferSupportKeys(xmlText);
  if (!keys.length) return null;
  const nodes = keyedNodes(parsePlainXml(String(xmlText)).root);
  const restraints = new Map();
  for (const key of keys) if (nodes.has(key)) restraints.set(key, childrenByName(nodes.get(key), 'Restraint').map(clone));
  return { keys, restraints };
}

const restraintText = (r) => ['Type', 'Stiffness', 'Gap', 'Friction'].map((k) => childText(r, k)).join(' ');
const sameRestraints = (a, b) => a.length === b.length && a.every((r, i) => JSON.stringify(r) === JSON.stringify(b[i]));

/** Put the snapshot's restraints back on their nodes in the stage's final XML. */
export function restoreTransferSupports(xmlText, snapshot) {
  const out = { xmlText, kept: [], diagnostics: [] };
  if (!snapshot) return out;
  const doc = parsePlainXml(String(xmlText));
  const nodes = keyedNodes(doc.root);
  for (const key of snapshot.keys) {
    const node = nodes.get(key);
    const want = snapshot.restraints.get(key);
    if (!node || !want) {
      out.diagnostics.push({ type: 'transfer-supports', severity: 'warning', code: 'TRANSFER_SUPPORTS_NODE_NOT_FOUND', key,
        message: `The transfer protection note names ${key}, but no single node there has that number; its supports were not protected.` });
      continue;
    }
    const run = childrenByName(node, 'Restraint');
    if (sameRestraints(run, want)) continue;
    node.kids = [...node.kids.filter((k) => k.__el !== 'Restraint'), ...want.map(clone)];
    out.kept.push({ key, runSupports: run.map(restraintText), kept: want.map(restraintText) });
  }
  if (!out.kept.length) return out;
  out.xmlText = serializePlainXml(doc);
  out.diagnostics.push({ type: 'transfer-supports', severity: 'info', count: out.kept.length,
    message: `${out.kept.length} node(s) keep the supports transferred from CAESAR II (the supports step wanted others).`,
    nodes: out.kept });
  return out;
}
