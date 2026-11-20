/**
 * UXML plan step 6: today's supports + engineering stage, run under the transfer's locks.
 *
 * The stage works on PSI116 text (uxml/v2/supports/SupportsStage.js). Here it gets the document's
 * PSI116 WITHOUT the protection note, so it does not protect anything itself. Its output is read
 * back and every changed value becomes a `set` op on the document; the kernel's runStage drops the
 * writes to locked values and lists each as a conflict ("the masters wanted 120, the transfer's 127
 * is kept"). The result is written as PSI116 with the note made from the locks.
 *
 * Scope of step 6: the stage may change values only. A stage output with other branches, nodes,
 * restraints or value tags is refused (UXML_ENGINEERING_STRUCTURE_CHANGED); that needs the stage as
 * a full UXML-document stage (a later plan step). Supports from CAESAR II, step 3 (Owner 18 Nov 2026):
 * on a node whose supports the transfer set (a supports lock on its NodeNumber), the stage's restraints
 * are not taken at all; when they differ from the transferred ones the attempt is listed as one conflict
 * (key 'Supports'), and the transferred supports are kept. On an Enriched XML (the transfer's target, Owner
 * 13 Nov: transfer is post-processing) the stage changes values only.
 */
import {runStage, sha256Hex, UxmlRefusal, LAYERS} from '../UxmlV2Kernel.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';
import {noteFromLocks, supportNoteKeys, withTransferNote, withoutTransferNote} from './TransferNote.js';

export const UXML_LOCKED_ENGINEERING_RULES = 'uxml-locked-engineering/1';
const fail = (code, details = {}) => { throw new UxmlRefusal(code, details); };
const sameKeys = (a, b) => Object.keys(a || {}).sort().join('|') === Object.keys(b || {}).sort().join('|');

/** One entity pair: same value tags, else refused; changed values -> set ops on the document's uid. */
function pairOps(mine, theirs, where, rule, ops) {
  if (!theirs || !sameKeys(mine.values, theirs.values)) fail('UXML_ENGINEERING_STRUCTURE_CHANGED', where);
  for (const [key, value] of Object.entries(mine.values || {})) {
    const next = theirs.values[key];
    if (next.text !== value.text) ops.push({op: 'set', uid: mine.uid, path: 'values.' + key, after: {v: next.v, text: next.text, src: 'stage', rule}});
  }
}

/** Restraints in plain words, for the conflict list: '+Y 2.000000E+12 gap 0 friction 0.3; GUI ...' or 'none'. */
export function restraintsText(restraints) {
  const t = (r, k) => String(r.values?.[k]?.text ?? r.values?.[k]?.v ?? '');
  return restraints.map(r => [t(r, 'Type'), t(r, 'Stiffness'), r.values?.Gap ? 'gap ' + t(r, 'Gap') : '', r.values?.Friction ? 'friction ' + t(r, 'Friction') : '']
    .filter(Boolean).join(' ')).join('; ') || 'none';
}
const sameRestraints = (a, b) => a.length === b.length && a.every((r, k) => sameKeys(r.values, b[k].values)
  && Object.entries(r.values || {}).every(([key, v]) => v.text === b[k].values[key].text));

/**
 * Value changes from the document to the stage output, matched by position (structure must not change).
 * `supportConflicts` collects the stage's attempts on nodes whose supports the transfer locked.
 */
export function valueChangeOps(doc, outDoc, rule = UXML_LOCKED_ENGINEERING_RULES, supportConflicts = []) {
  const ops = [];
  if (doc.pipelines.length !== outDoc.pipelines.length) fail('UXML_ENGINEERING_STRUCTURE_CHANGED', {branches: [doc.pipelines.length, outDoc.pipelines.length]});
  doc.pipelines.forEach((p, i) => {
    const q = outDoc.pipelines[i];
    const branch = String(p.values?.Branchname?.v ?? i);
    pairOps(p, q, {branch}, rule, ops);
    if (p.components.length !== q.components.length) fail('UXML_ENGINEERING_STRUCTURE_CHANGED', {branch, nodes: [p.components.length, q.components.length]});
    p.components.forEach((c, j) => {
      const d = q.components[j];
      const node = String(c.values?.NodeNumber?.v ?? j);
      pairOps(c, d, {branch, node}, rule, ops);
      const lock = c.values?.NodeNumber?.lock;
      if (lock?.supports) {
        if (!sameRestraints(c.restraints, d.restraints))
          supportConflicts.push({branch, node, key: 'Supports', kept: restraintsText(c.restraints), stageWanted: restraintsText(d.restraints), lock});
        return;
      }
      if (c.restraints.length !== d.restraints.length) fail('UXML_ENGINEERING_STRUCTURE_CHANGED', {branch, node, restraints: [c.restraints.length, d.restraints.length]});
      c.restraints.forEach((r, k) => pairOps(r, d.restraints[k], {branch, node, restraint: k}, rule, ops));
    });
  });
  return ops;
}

/** Where a uid sits, for the conflict list: {branch, node}. */
function placesOf(doc) {
  const out = new Map();
  for (const p of doc.pipelines) {
    const branch = String(p.values?.Branchname?.v ?? '');
    out.set(p.uid, {branch, node: null});
    for (const c of p.components) out.set(c.uid, {branch, node: String(c.values?.NodeNumber?.v ?? '')});
  }
  return out;
}

/**
 * Run `runText(psi116Text) -> psi116Text` (the supports + engineering stage) under the document's locks.
 * Returns {uxml, delta, conflicts:[{branch, node, key, kept, stageWanted, lock}], xmlText (with the note), stageXmlText}.
 */
export function runEngineeringUnderLocks(doc, runText, {stageId = 'engineering', rulesVersion = UXML_LOCKED_ENGINEERING_RULES} = {}) {
  // A document read from a protected file still holds the note in its custody text: cut it, so the
  // locks (not the stage's own note handling) keep the values and every attempt is listed.
  const input = withoutTransferNote(writePsi116FromUxmlV2(doc).text);
  const stageXmlText = runText(input);
  const outDoc = readPsi116V2(stageXmlText, {fileSha256: sha256Hex(stageXmlText)});
  const supportConflicts = [];
  const ops = valueChangeOps(doc, outDoc, rulesVersion, supportConflicts);
  const stage = {id: stageId, rulesVersion, reads: [...LAYERS], writes: [...LAYERS], run: () => ({ops: structuredClone(ops)})};
  const result = runStage(stage, doc);
  const wanted = new Map(ops.map(op => [op.uid + '|' + op.path.slice(7), op.after.text]));
  const places = placesOf(doc);
  const values = new Map(doc.pipelines.flatMap(p => [p, ...p.components]).map(e => [e.uid, e.values]));
  const conflicts = result.refusals.map(c => ({...places.get(c.uid), key: c.key,
    kept: values.get(c.uid)?.[c.key]?.text ?? null, stageWanted: wanted.get(c.uid + '|' + c.key) ?? null, lock: c.lock}))
    .concat(supportConflicts);
  const xmlText = withTransferNote(writePsi116FromUxmlV2(result.uxml).text, noteFromLocks(result.uxml));
  return {uxml: result.uxml, delta: result.delta, conflicts, xmlText, stageXmlText, supportsNotKeyed: supportNoteKeys(result.uxml).unkeyed};
}
