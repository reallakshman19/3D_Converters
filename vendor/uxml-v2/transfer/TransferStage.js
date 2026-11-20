/**
 * UXML plan step 6 (Owner 17 Nov 2026): the property transfer as a UXML change with locks.
 *
 * transferStage: a U2d transfer receipt (`u2.transfer-receipt` v1, XCU prototypes/u2d-cii-source)
 * applied to the UXML read from the receipt's own target file. Every receipt change becomes
 * `set` + `lock {by:'transfer', receipt, order, field}` on the matched value, so the stage's delta
 * is the receipt in UXML form and undo gives the target back. Owner D5 (13 Nov): "Transferred
 * values win" -- later stages cannot overwrite a locked value; the kernel lists the attempt.
 *
 * Material follows the branch (today's 3D_Converters rule, xml-cii-transfer-protection.js): a
 * transferred branch MaterialNumber also sets every node MaterialCode of that branch (the CII
 * writer reads node codes first) and clears a non-empty node MaterialName (it named the master's
 * material). These follow-up values are locked too, with `follows` naming the branch field.
 *
 * Supports from CAESAR II, step 3 (Owner 18 Nov 2026: "Yes, allow and lock"): each support change in
 * `receipt.supports.changes` carries the exact <Restraint> edits on its one node (keep / edit / remove /
 * add, with the texts the receipt saw). They are applied, every value of an edited or added restraint is
 * locked, and the node's NodeNumber gets a supports lock (`supports: true`): the supports stage run after
 * may not add, remove or edit any restraint on that node (LockedEngineering.js lists such an attempt as
 * stopped by a lock). The note names these nodes in its `supports` list (TransferNote.js), and
 * noteLockStage puts the supports lock back from it.
 *
 * noteLockStage: the same locks from a TOPOFIX-TRANSFER-PROTECT note (a file the transfer already
 * wrote), keyed as today: unique Branchname, unique NodeNumber inside the branch.
 */
import {sha256Hex, stageUid, UxmlRefusal} from '../UxmlV2Kernel.js';
import {parseLiteral} from '../UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';

export const UXML_TRANSFER_RULES = 'uxml-transfer/1';
const fail = (code, details = {}) => { throw new UxmlRefusal(code, details); };
const MATERIAL_FIELD = 'Branch/MaterialNumber';

/** Receipt field ('Branch/Temperature/Temperature1', 'Node/NodeName') -> {scope, key} of a UXML value. */
export function fieldKey(field) {
  const [scope, ...rest] = String(field || '').split('/');
  if (!['Branch', 'Node'].includes(scope) || !rest.length) fail('UXML_TRANSFER_FIELD_UNSUPPORTED', {field});
  return {scope, key: rest.join('.')};
}
const textOf = value => String(value?.v ?? '');
const valueOf = (text, rule) => ({v: parseLiteral(String(text)), text: String(text), src: 'transfer', rule});
// A value from CAESAR II names its CII elements and, where CAESAR II left an element's line number empty, the element it
// was written on (receipt change `cii`; Owner 19 Nov 2026: "populating each sentinel values back to UXML").
const setAndLock = (uid, key, text, lock, cii) => [
  {op: 'set', uid, path: 'values.' + key, after: {...valueOf(text, lock.follows ? 'material-follows-branch' : 'u2d:' + lock.field), ...(cii ? {cii} : {})}},
  {op: 'lock', uid, path: 'values.' + key, after: lock},
];
const lockOnly = (uid, key, lock) => [{op: 'lock', uid, path: 'values.' + key, after: lock}];

/** Node MaterialCode = branch material, non-empty node MaterialName cleared; all locked. */
function materialFollowOps(pipeline, materialText, lockBase) {
  const ops = [];
  const follows = {by: lockBase.by, receipt: lockBase.receipt, order: lockBase.order, follows: MATERIAL_FIELD};
  for (const comp of pipeline.components) {
    const code = comp.values?.MaterialCode;
    if (code) ops.push(...(textOf(code) === materialText ? lockOnly(comp.uid, 'MaterialCode', follows) : setAndLock(comp.uid, 'MaterialCode', materialText, follows)));
    const name = comp.values?.MaterialName;
    if (name && textOf(name) !== '') ops.push(...setAndLock(comp.uid, 'MaterialName', '', follows));
  }
  return ops;
}

/** The entity a receipt change names; refuses when the target does not hold the receipt's `before`. */
function targetOf(doc, change) {
  const {ref = {}, field} = change;
  const {scope, key} = fieldKey(field);
  const pipeline = doc.pipelines[ref.branchOrdinal];
  if (!pipeline || textOf(pipeline.values?.Branchname) !== String(ref.branchName))
    fail('UXML_TRANSFER_TARGET_MISMATCH', {field, branch: ref.branchName, branchOrdinal: ref.branchOrdinal});
  const entity = scope === 'Branch' ? pipeline : pipeline.components[ref.nodeOrdinal];
  if (!entity || (scope === 'Node' && textOf(entity.values?.NodeNumber) !== String(ref.nodeNumber)))
    fail('UXML_TRANSFER_TARGET_MISMATCH', {field, branch: ref.branchName, nodeNumber: ref.nodeNumber});
  const current = entity.values?.[key];
  if (!current) fail('UXML_TRANSFER_FIELD_MISSING', {field, branch: ref.branchName, nodeNumber: ref.nodeNumber});
  if (current.v !== parseLiteral(String(change.before ?? '')))
    fail('UXML_TRANSFER_BEFORE_MISMATCH', {field, branch: ref.branchName, nodeNumber: ref.nodeNumber, found: current.text, receipt: change.before});
  return {pipeline, entity, key};
}

export const SUPPORTS_FIELD = 'Node/Supports';
const COSINE = /^DirectionCosine[XYZ]$/;
const leafTexts = r => Object.fromEntries(Object.entries(r.values || {}).map(([k, v]) => [k, String(v?.text ?? v?.v ?? '')]));
const sameTexts = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b || {}).sort());

/** The node a support change names, holding exactly the restraints the receipt saw. */
function supportNodeOf(doc, change) {
  const {ref = {}} = change;
  const where = {branch: ref.branchName, nodeNumber: ref.nodeNumber, ciiNode: change.ciiNode};
  const pipeline = doc.pipelines[ref.branchOrdinal];
  const comp = pipeline && textOf(pipeline.values?.Branchname) === String(ref.branchName) ? pipeline.components[ref.nodeOrdinal] : null;
  if (!comp || textOf(comp.values?.NodeNumber) !== String(ref.nodeNumber)) fail('UXML_TRANSFER_TARGET_MISMATCH', {field: SUPPORTS_FIELD, ...where});
  if (!comp.values?.NodeNumber) fail('UXML_TRANSFER_FIELD_MISSING', {field: SUPPORTS_FIELD, ...where});
  if (comp.values.NodeNumber.lock) fail('UXML_TRANSFER_SUPPORT_NODE_LOCKED', where);
  if (comp.restraints.length !== change.restraintCount) fail('UXML_TRANSFER_BEFORE_MISMATCH', {field: SUPPORTS_FIELD, ...where, found: comp.restraints.length, receipt: change.restraintCount});
  for (const op of change.restraints || []) {
    if (op.op === 'add') continue;
    const r = comp.restraints[op.index];
    if (!r || !sameTexts(leafTexts(r), op.before)) fail('UXML_TRANSFER_BEFORE_MISMATCH', {field: SUPPORTS_FIELD, ...where, restraint: op.index});
  }
  return comp;
}

/** One support change -> kernel ops: restraint edits, removes and adds, each value locked, plus the node's supports lock. */
function supportOps(doc, change, lock) {
  const comp = supportNodeOf(doc, change);
  const ops = [];
  const rule = 'u2d:' + SUPPORTS_FIELD;
  const value = text => ({v: parseLiteral(String(text)), text: String(text), src: 'transfer', rule});
  let last = comp.restraints.at(-1)?.uid ?? null;
  (change.restraints || []).forEach((op, k) => {
    if (op.op === 'keep') return;
    if (op.op === 'remove') { ops.push({op: 'remove', uid: comp.restraints[op.index].uid}); return; }
    if (op.op === 'edit') {
      const r = comp.restraints[op.index];
      for (const tag of new Set([...Object.keys(op.before), ...Object.keys(op.after)])) {
        if (op.before[tag] === op.after[tag]) continue;
        ops.push({op: 'set', uid: r.uid, path: 'values.' + tag, after: op.after[tag] === undefined ? null : value(op.after[tag])});
      }
      const frame = Object.keys(op.after).some(t => COSINE.test(t)) ? (r.frame ?? 'CII_XYZ') : null;
      if ((r.frame ?? null) !== frame) ops.push({op: 'set', uid: r.uid, path: 'frame', after: frame});
      for (const tag of Object.keys(op.after)) ops.push({op: 'lock', uid: r.uid, path: 'values.' + tag, after: lock});
      return;
    }
    const keys = Object.keys(op.after);
    const uid = stageUid(doc.revision.id, 'transfer', rule, [comp.uid], k);
    ops.push({op: 'add', uid, parent: comp.uid, after: last, kind: 'restraint', entity: {
      kind: 'restraint', sourceKey: comp.sourceKey + ':T' + k,
      lineage: {op: 'add', from: [comp.uid], stage: 'transfer', rule},
      fieldOrder: keys, values: Object.fromEntries(keys.map(t => [t, value(op.after[t])])),
      ...(keys.some(t => COSINE.test(t)) ? {frame: 'CII_XYZ'} : {}),
    }});
    for (const tag of keys) ops.push({op: 'lock', uid, path: 'values.' + tag, after: lock});
    last = uid;
  });
  ops.push({op: 'lock', uid: comp.uid, path: 'values.NodeNumber', after: lock});
  return ops;
}

/** Checks the receipt is a successful U2d receipt for exactly this document's source file. */
function checkReceipt(doc, receipt) {
  if (receipt?.format !== 'u2.transfer-receipt' || receipt.version !== 1 || receipt.ok !== true)
    fail('UXML_TRANSFER_RECEIPT_UNSUPPORTED', {format: receipt?.format ?? null, version: receipt?.version ?? null});
  // Group 2 (Owner 19 Nov): a document a stage changed (a pipe broken in CAESAR II got its new node) is named by the
  // XML written from it, which the transfer ran on; never by its source file, whose node order may differ.
  const sha = doc.revision?.seq ? sha256Hex(writePsi116FromUxmlV2(doc).text) : doc.sources?.[0]?.sha256;
  if (String(receipt.base?.sha256 || '').toLowerCase() !== sha)
    fail('UXML_TRANSFER_BASE_MISMATCH', {receipt: receipt.base?.sha256 ?? null, document: sha ?? null});
}

/** Stage inputs {receipt, receiptSha256}; settings {materialFollows (default true)}. */
export const transferStage = Object.freeze({
  id: 'transfer', rulesVersion: UXML_TRANSFER_RULES, reads: ['names', 'engineering', 'supports'], writes: ['names', 'engineering', 'supports'],
  run(doc, {receipt, receiptSha256} = {}, {materialFollows = true} = {}) {
    checkReceipt(doc, receipt);
    const ops = [];
    (receipt.changes || []).forEach((change, order) => {
      const {pipeline, entity, key} = targetOf(doc, change);
      const lock = {by: 'transfer', receipt: receiptSha256 || sha256Hex(JSON.stringify(receipt)), order, field: change.field};
      ops.push(...setAndLock(entity.uid, key, change.after, lock, change.cii));
      if (materialFollows && change.field === MATERIAL_FIELD) ops.push(...materialFollowOps(pipeline, String(change.after), lock));
    });
    const receiptId = receiptSha256 || sha256Hex(JSON.stringify(receipt));
    const base = (receipt.changes || []).length;
    (receipt.supports?.changes || []).forEach((change, k) => {
      ops.push(...supportOps(doc, change, {by: 'transfer', receipt: receiptId, order: base + k, field: SUPPORTS_FIELD, supports: true, ciiNode: change.ciiNode}));
    });
    const diagnostics = (receipt.refused || []).map(r => ({code: r.code, ciiNode: r.ciiNode ?? null, detail: r.detail ?? ''}));
    return {ops, diagnostics};
  },
});

/** Entities a note names, keyed like today's step 10 (shared names / numbers are skipped). */
function noteTargets(doc, note) {
  const byName = new Map();
  for (const p of doc.pipelines) {
    const name = textOf(p.values?.Branchname);
    byName.set(name, byName.has(name) ? null : p);
  }
  const out = [];
  for (const [name, paths] of Object.entries(note.branches || {})) {
    const p = byName.get(name);
    if (p) for (const path of paths) out.push({pipeline: p, entity: p, field: 'Branch/' + path});
  }
  for (const [nameNumber, fields] of Object.entries(note.nodes || {})) {
    const cut = nameNumber.lastIndexOf('|');
    const p = byName.get(nameNumber.slice(0, cut));
    const hits = p ? p.components.filter(c => textOf(c.values?.NodeNumber) === nameNumber.slice(cut + 1)) : [];
    if (hits.length === 1) for (const f of fields) out.push({pipeline: p, entity: hits[0], field: 'Node/' + f});
  }
  return out;
}

/** Components the note's `supports` list names, keyed like today's step 10 (shared names / numbers are skipped). */
function supportNoteTargets(doc, note) {
  const byName = new Map();
  for (const p of doc.pipelines) {
    const name = textOf(p.values?.Branchname);
    byName.set(name, byName.has(name) ? null : p);
  }
  const out = [];
  for (const nameNumber of Array.isArray(note.supports) ? note.supports : []) {
    const cut = String(nameNumber).lastIndexOf('|');
    const p = byName.get(String(nameNumber).slice(0, cut));
    const hits = p ? p.components.filter(c => String(c.values?.NodeNumber?.text ?? textOf(c.values?.NodeNumber)) === String(nameNumber).slice(cut + 1)) : [];
    if (hits.length === 1 && !out.includes(hits[0])) out.push(hits[0]);
  }
  return out;
}

/** Stage inputs {note (parsed v1 note), noteSha256}: locks what the note lists, material follows. */
export const noteLockStage = Object.freeze({
  id: 'transfer-note', rulesVersion: UXML_TRANSFER_RULES, reads: ['names', 'engineering'], writes: ['names', 'engineering'],
  run(doc, {note, noteSha256} = {}) {
    if (note?.v !== 1) fail('UXML_TRANSFER_NOTE_VERSION', {found: note?.v ?? null});
    const ops = [];
    const targets = noteTargets(doc, note);
    targets.forEach(({pipeline, entity, field}, order) => {
      const {key} = fieldKey(field);
      if (!entity.values?.[key]) return; // today: a field absent in the file is not protected
      const lock = {by: 'transfer', receipt: noteSha256 || '', order, field};
      ops.push(...lockOnly(entity.uid, key, lock));
      if (field === MATERIAL_FIELD) ops.push(...materialFollowOps(pipeline, textOf(entity.values[key]), lock));
    });
    // Support locks in step 10, step 1: the note's `supports` nodes get the supports lock again (keyed as `nodes`).
    supportNoteTargets(doc, note).forEach((comp, k) => {
      if (comp.values?.NodeNumber?.lock) return; // a NodeNumber already locked keeps its lock
      ops.push(...lockOnly(comp.uid, 'NodeNumber', {by: 'transfer', receipt: noteSha256 || '', order: targets.length + k, field: SUPPORTS_FIELD, supports: true}));
    });
    return {ops, diagnostics: []};
  },
});
