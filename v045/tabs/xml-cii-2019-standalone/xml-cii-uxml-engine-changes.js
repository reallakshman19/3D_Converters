// End-to-end plan E3 (Owner 21 Nov 2026, "Yes, build E3"): what the CII engine's own prepare steps changed, recorded
// on the UXML document as two more recorded steps (engine:process-data, engine:bend-radius), so the Run record and
// XCU's review page (section 4) list them node by node with their rule, as they list the supports sub-steps.
// The engine (v045/converters/scripts, --input-uxml) lists its changes by UXML uid and field; this builds the kernel's
// recorded steps from that list on the document the engine read. Nothing here changes the CII.
import { runStage } from '../../../vendor/uxml-v2/UxmlV2Kernel.js';
import { parseLiteral } from '../../../vendor/uxml-v2/UxmlV2Psi116Reader.js';
import { changeList } from '../../../vendor/uxml-v2/supports/ChangeList.js';

export const ENGINE_RULES = Object.freeze(['engine:process-data', 'engine:bend-radius']);
export const ENGINE_CHANGES_RULES = 'xml-cii-engine-changes/1';
const LAYERS = ['topology', 'engineering', 'supports', 'names', 'other'];
const escapeText = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One kernel set op per engine row; a row the document cannot hold as a value (a support the engine added) is null. */
function opOf(row) {
  if (!row?.uid || !row.field || String(row.field).startsWith('Restraint+')) return null;
  const after = row.after == null ? null : { v: parseLiteral(String(row.after)), text: escapeText(row.after), src: 'stage', rule: row.rule };
  return { op: 'set', uid: row.uid, path: 'values.' + row.field, after, rule: row.rule };
}

/**
 * The engine's changes as recorded steps on `doc` (the document the engine read): {uxml, deltas, steps, list,
 * notRecorded, conflicts}. steps and list have the Run record's shapes (xml-cii-uxml-route.js changesRecord).
 */
export function engineChangeSteps(doc, rows) {
  let uxml = doc;
  const deltas = [], conflicts = [];
  let notRecorded = 0;
  for (const rule of ENGINE_RULES) {
    const ops = [];
    for (const row of (rows || []).filter((r) => r?.rule === rule)) {
      const op = opOf(row);
      if (op) ops.push(op); else notRecorded += 1;
    }
    // E4: a prepare step that changed nothing records no step (each recorded step costs a full document check).
    if (!ops.length) continue;
    const stage = { id: rule, rulesVersion: ENGINE_CHANGES_RULES, reads: ['topology'], writes: LAYERS, run: () => ({ ops: structuredClone(ops) }) };
    const step = runStage(stage, uxml);
    // A change to a value the transfer locked is not recorded (the kernel refuses it); the record counts it.
    conflicts.push(...(step.refusals || []).map((c) => ({ ...c, step: rule })));
    uxml = step.uxml;
    deltas.push(step.delta);
  }
  const steps = deltas.map((d) => ({ stage: d.stage, rule: d.rulesVersion, base: d.base, result: d.result, ops: d.ops.length }));
  let list = null, listError = null;
  try {
    list = changeList(doc, deltas);
  } catch (err) {
    listError = String(err?.message || err);
  }
  return { uxml, deltas, steps, list, listError, notRecorded, conflicts };
}

/** The Run record with the engine's recorded steps added (a new object; `record` is not changed). */
export function withEngineChanges(record, engine, recorded) {
  const changes = record?.changes;
  const add = recorded && changes?.made;
  return {
    ...record,
    engine: { readUxml: engine?.used === true, revision: engine?.revision || null, refusal: engine?.refusal || null,
      changes: (engine?.changes || []).length, notRecorded: recorded?.notRecorded || 0, lockedNotRecorded: recorded?.conflicts?.length || 0 },
    changes: add ? { ...changes, steps: [...changes.steps, ...recorded.steps],
      ...(Array.isArray(changes.list) && recorded.list ? { list: [...changes.list, ...recorded.list] } : {}) } : changes,
  };
}
