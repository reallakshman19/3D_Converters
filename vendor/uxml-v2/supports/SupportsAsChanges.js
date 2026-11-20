/**
 * End-to-end plan E2, rebuilt on ids (Owner 20 Nov 2026: "something fundamentally wrong, just round and round forever";
 * "Support ID should be child of Node id"; "Yes, Build"): today's supports stage as recorded changes on the UXML
 * document, with nothing guessed.
 *
 * Today's supports code (SupportsStage.js) stays the oracle and keeps running on PSI116 text. Before it runs, each
 * <Branch> and <Node> element gets the document's uid as an attribute (tagIds); today's code carries it through every
 * sub-step (measured 20 Nov on all 7 models, step7/e2c/uid-probe*.log: same element, no id twice, output byte-equal to
 * today's once the ids are taken out). Each sub-step's output is read back by those ids:
 *   - a node is the node with its id: an input node whose id is gone is a `remove` op (today: duplicate ATTA nodes at a
 *     kept ATTA's point); an output node with no id, an id out of order or from another branch is refused.
 *   - a value that changed or is new is a `set` op; a new key carries `afterKey` (the key before it in today's output),
 *     so the writer puts it where today's text has it. A value today drops is a `set` to null.
 *   - a support is "node N, support k" (today's support mapper rebuilds a node's supports, so a support has no identity
 *     of its own): support k of the output is `set` ops on support k of the node, an extra one an `add`, a missing one a
 *     `remove`. When today rebuilds support k with its tags in another order, an unlocked support k is replaced (remove
 *     and add), so the writer gives today's bytes.
 *
 *   tagIds(doc, xmlText) -> xmlText with ids;  readIds(xmlText) -> {text (ids taken out), branches:[{uid, nodes:[uid]}]}
 *   changesFromXml(doc, xmlTextWithIds, rule) -> ops
 *   supportsAsChanges(doc, steps:[{id, xmlText (with ids)}]) -> {uxml, deltas, counts}   one runStage per sub-step
 *   engineXml(uxml) -> the XML the CII engine gets: written from the document, laid out as today's supports output.
 */
import {runStage, sha256Hex} from '../UxmlV2Kernel.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';
import {parsePlainXml, serializePlainXml} from './PlainDom.js';

export const SUPPORTS_AS_CHANGES_RULES = 'supports-as-changes/2';
/** Today's supports sub-steps, in order (SupportsStage.js `stages`). */
export const SUPPORTS_STEPS = ['branch-pass', '01-parent-enrichment', '02-dtxr-enrichment', '02b-process-parity', '03-atta-default', '04-mds-closure'];
const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
const ID = 'uxid';

const text = (entity, key) => String(entity?.values?.[key]?.text ?? '').trim();

function refuse(code, details) {
  const error = new Error(`${code}: ${JSON.stringify(details)}`);
  error.code = code;
  error.details = details;
  throw error;
}

/** Put ids on every <Branch> and <Node> start tag, in document order: branches [{uid, nodes:[uid]}]. */
export function placeIds(xmlText, branches) {
  if (/<(Branch|Node)\s/.test(xmlText)) refuse('UXML_SUPPORTS_IDS_NOT_PLACED', {why: 'a Branch or Node element already has attributes'});
  let b = -1, n = 0;
  const out = xmlText.replace(/<(Branch|Node)>/g, (m, tag) => {
    if (tag === 'Branch') { b += 1; n = 0; if (!branches[b]) refuse('UXML_SUPPORTS_IDS_NOT_PLACED', {branch: b}); return `<Branch ${ID}="${branches[b].uid}">`; }
    const uid = branches[b]?.nodes[n++];
    if (!uid) refuse('UXML_SUPPORTS_IDS_NOT_PLACED', {branch: b, node: n - 1});
    return `<Node ${ID}="${uid}">`;
  });
  if (b + 1 !== branches.length) refuse('UXML_SUPPORTS_IDS_NOT_PLACED', {branches: [branches.length, b + 1]});
  return out;
}
/** The document's branch and node uids on its PSI116 text (the text must be the document's, in its order). */
export function tagIds(doc, xmlText) {
  const branches = doc.pipelines.map(p => ({uid: p.uid, nodes: p.components.map(c => c.uid)}));
  const out = placeIds(xmlText, branches);
  const back = readIds(out).branches;
  if (back.some((b, i) => b.nodes.length !== branches[i].nodes.length)) refuse('UXML_SUPPORTS_IDS_NOT_PLACED', {why: 'node count differs from the document'});
  return out;
}

/** The ids in a text, in order, and the text with them taken out. A node with no id has uid null. */
export function readIds(xmlText) {
  const branches = [];
  for (const m of xmlText.matchAll(/<(Branch|Node)(?: uxid="([^"]*)")?>/g)) {
    if (m[1] === 'Branch') branches.push({uid: m[2] ?? null, nodes: []});
    else if (branches.length) branches.at(-1).nodes.push(m[2] ?? null);
  }
  return {text: xmlText.replace(/<(Branch|Node) uxid="[^"]*">/g, '<$1>'), branches};
}
export const withoutIds = xmlText => readIds(xmlText).text;

const plain = (value, rule) => {
  const out = {...value, src: 'stage', rule};
  delete out.rev;
  return out;
};

/** Set ops turning entity `from`'s values into `to`'s: changed and new keys (new ones placed after the key before them). */
function valueOps(from, to, rule) {
  const ops = [], order = to.fieldOrder || Object.keys(to.values);
  order.forEach((key, k) => {
    const want = to.values[key], have = from.values?.[key];
    if (!want || (have && have.text === want.text)) return;
    const op = {op: 'set', uid: from.uid, path: 'values.' + key, after: plain(want, rule), rule};
    if (!have && k > 0) op.afterKey = order[k - 1];
    ops.push(op);
  });
  for (const key of Object.keys(from.values || {})) {
    if (!Object.hasOwn(to.values, key)) ops.push({op: 'set', uid: from.uid, path: 'values.' + key, after: null, rule});
  }
  if (to.frame !== from.frame && (to.frame || from.frame)) ops.push({op: 'set', uid: from.uid, path: 'frame', after: to.frame ?? null, rule});
  return ops;
}

const hasLock = e => Object.values(e.values || {}).some(v => v?.lock);
const keysOf = e => e.fieldOrder || Object.keys(e.values);
/** The keys both have come in the same order in each. */
function sameOrder(a, b) {
  const inA = new Set(keysOf(a)), inB = new Set(keysOf(b));
  return keysOf(a).filter(k => inB.has(k)).join('|') === keysOf(b).filter(k => inA.has(k)).join('|');
}
function addOp(c, r, k, after, rule) {
  const uid = 'u:s' + sha256Hex(`${c.uid}|${rule}|support|${k}`).slice(0, 15);
  const values = Object.fromEntries(Object.entries(r.values).map(([key, v]) => [key, plain(v, rule)]));
  return {op: 'add', kind: 'restraint', uid, parent: c.uid, after, rule,
    entity: {kind: 'restraint', fieldOrder: [...keysOf(r)], values, ...(r.frame ? {frame: r.frame} : {}), lineage: {from: [c.uid], rule}}};
}

/** Ops for one node's supports, "node N, support k": support k set to today's support k, extras added after the last,
 * missing ones removed. A support today rebuilt with its tags in another order is replaced, unless it holds a lock. */
function supportOps(c, d, rule) {
  const ops = [], have = c.restraints, want = d.restraints, n = Math.min(have.length, want.length);
  let after = null;
  for (let k = 0; k < n; k += 1) {
    if (sameOrder(have[k], want[k]) || hasLock(have[k])) { ops.push(...valueOps(have[k], want[k], rule)); after = have[k].uid; continue; }
    const add = addOp(c, want[k], k, after, rule);
    ops.push({op: 'remove', uid: have[k].uid, rule}, add);
    after = add.uid;
  }
  for (let k = n; k < have.length; k += 1) ops.push({op: 'remove', uid: have[k].uid, rule});
  for (let k = n; k < want.length; k += 1) { const add = addOp(c, want[k], k, after, rule); ops.push(add); after = add.uid; }
  return ops;
}

/** Ops that turn `doc` into the PSI116 text `xmlText` (one sub-step's output, with ids), every op naming `rule`. */
export function changesFromXml(doc, xmlText, rule) {
  const {text: plainText, branches} = readIds(xmlText);
  if (!branches.length || branches.some(b => !b.uid)) refuse('UXML_SUPPORTS_IDS_MISSING', {rule});
  const out = readPsi116V2(plainText, {fileSha256: sha256Hex(plainText)});
  if (out.pipelines.length !== branches.length || out.pipelines.some((q, b) => q.components.length !== branches[b].nodes.length))
    refuse('UXML_SUPPORTS_IDS_NOT_READ', {rule});
  if (branches.length !== doc.pipelines.length || branches.some((b, i) => b.uid !== doc.pipelines[i].uid))
    refuse('UXML_SUPPORTS_BRANCHES_CHANGED', {rule, branches: [doc.pipelines.length, branches.length]});
  const ops = [];
  doc.pipelines.forEach((p, b) => {
    const q = out.pipelines[b], ids = branches[b].nodes, branch = text(p, 'Branchname');
    ops.push(...valueOps(p, q, rule));
    const at = new Map(p.components.map((c, i) => [c.uid, i]));
    let last = -1;
    ids.forEach((uid, j) => {
      if (!uid) refuse('UXML_SUPPORTS_NODE_ADDED', {rule, branch, node: text(q.components[j], 'NodeNumber')});
      const i = at.get(uid);
      if (i == null) refuse('UXML_SUPPORTS_NODE_MOVED', {rule, branch, uid});
      if (i <= last) refuse('UXML_SUPPORTS_NODE_ORDER', {rule, branch, uid});
      last = i;
    });
    const kept = new Set(ids);
    for (const c of p.components) if (!kept.has(c.uid)) ops.push({op: 'remove', uid: c.uid, rule});
    ids.forEach((uid, j) => {
      const c = p.components[at.get(uid)], d = q.components[j];
      ops.push(...valueOps(c, d, rule), ...supportOps(c, d, rule));
    });
  });
  return ops;
}

/** Plain counts of one sub-step's ops, by what they change (the review page and the gate read these). */
export function countChanges(doc, ops) {
  const kinds = new Map();
  for (const p of doc.pipelines) {
    kinds.set(p.uid, 'branch');
    for (const c of p.components) { kinds.set(c.uid, 'node'); for (const r of c.restraints) kinds.set(r.uid, 'support'); }
  }
  const m = {nodesRemoved: 0, supportsAdded: 0, supportsRemoved: 0, supportsChanged: 0, nodeValues: 0, branchValues: 0, nodesNumbered: 0};
  const changedSupports = new Set();
  for (const o of ops) {
    const kind = kinds.get(o.uid);
    if (o.op === 'add') m.supportsAdded += 1;
    else if (o.op === 'remove') m[kind === 'support' ? 'supportsRemoved' : 'nodesRemoved'] += 1;
    else if (kind === 'support') changedSupports.add(o.uid);
    else if (kind === 'branch') m.branchValues += 1;
    else { m.nodeValues += 1; if (o.path === 'values.NodeNumber') m.nodesNumbered += 1; }
  }
  m.supportsChanged = changedSupports.size;
  return m;
}

/** Run each sub-step's read-back as one recorded stage on the document, in order. */
export function supportsAsChanges(doc, steps) {
  let uxml = doc;
  const deltas = [], counts = {};
  for (const {id, xmlText} of steps) {
    const ops = changesFromXml(uxml, xmlText, id);
    const stage = {id: 'supports:' + id, rulesVersion: SUPPORTS_AS_CHANGES_RULES, reads: ['topology'], writes: LAYERS,
      run: () => ({ops, diagnostics: []})};
    const step = runStage(stage, uxml, {}, {}, {inputHashes: [sha256Hex(withoutIds(xmlText))]});
    counts[id] = countChanges(uxml, ops);
    uxml = step.uxml;
    deltas.push(step.delta);
  }
  return {uxml, deltas, counts};
}

/** The XML the CII engine gets: the document written, then laid out as today's supports stage lays out its output. */
export const engineXml = uxml => serializePlainXml(parsePlainXml(writePsi116FromUxmlV2(uxml).text));
