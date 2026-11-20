/**
 * End-to-end plan E2b (Owner 20 Nov 2026, "Yes, build E2b"): E2a's read-back (SupportsAsChanges.js) run under the
 * document's transfer locks, so step 10 can use one route for locked and unlocked files.
 *
 * Today's supports stage runs once, on the document's PSI116 WITHOUT the protection note (as LockedEngineering.js) and
 * with the document's branch and node ids on it (SupportsAsChanges.js tagIds; Owner 20 Nov, rebuilt on ids). Each
 * sub-step's output is read back by those ids as recorded changes, as in E2a, and under the locks:
 *   - a write to a locked value is dropped by the kernel and listed (as today: "the masters wanted 120, the
 *     transfer's 127 is kept");
 *   - on a node whose supports the transfer set (a supports lock on its NodeNumber), no change to its supports is
 *     taken; when today's final supports differ, that is one conflict, key 'Supports' (as today, Owner 18 Nov);
 *   - a locked node today removes as a duplicate is joined into the node today keeps (JoinDuplicates.js; Owner 20 Nov,
 *     "Yes, that join", replacing 19 Nov "keep the node"); a node still holding a lock is never removed (key 'Node').
 * Conflicts are what still differs between the final document and today's final output: each is listed once, with
 * the first sub-step that wanted it. Any other difference is a defect and refused (UXML_SUPPORTS_LOCKS_RESIDUAL).
 * Then the kept node of each duplicate group today thinned gets the removed nodes' names and AVEVA references joined
 * with "|" (JoinNames.js, Owner 20 Nov "Write | in output"): in xmlText and the document, never in engineXmlText,
 * the XML the CII engine gets, so the CII stays today's. `names: false` leaves them out (xmlText is engineXmlText).
 * A "|" already in an input name is read first as that node's join history (JoinNames.js readNameHistory; Owner 20 Nov,
 * "Read it as history"): today's code and the CII engine get the part before the first "|", the output the whole
 * history plus any new join. `nameHistory: false` (gate control only) leaves the "|" names in.
 *
 *   runSupportsUnderLocks(doc, runStageFull, options) -> {uxml, deltas, conflicts, joined, names, xmlText (with the note
 *     and the joined names), engineXmlText (with the note, plain names), stageXmlText}
 *   runStageFull(psi116Text) -> {xmlText, stages} (SupportsStage.js runSupportsStage's result)
 */
import {runStage, sha256Hex, LAYERS} from '../UxmlV2Kernel.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';
import {noteFromLocks, withTransferNote, withoutTransferNote} from '../transfer/TransferNote.js';
import {restraintsText} from '../transfer/LockedEngineering.js';
import {changesFromXml, readIds, tagIds, withoutIds, SUPPORTS_AS_CHANGES_RULES, SUPPORTS_STEPS} from './SupportsAsChanges.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {joinDuplicates, joinPlan} from './JoinDuplicates.js';
import {joinNames, joinNamesPlan, readNameHistory} from './JoinNames.js';
import {toFiniteNumber} from './config/EnrichmentConfig.js';

export const SUPPORTS_UNDER_LOCKS_RULES = 'supports-under-locks/1';
const txt = (e, k) => String(e?.values?.[k]?.text ?? '');
const val = (e, k) => String(e?.values?.[k]?.v ?? ''); // place names as today's wrapper writes them (its .v)

function refuse(code, details) {
  const error = new Error(`${code}: ${JSON.stringify(details)}`);
  error.code = code;
  error.details = details;
  throw error;
}

/** Every node of the document by uid, with its branch name, and the node owning each support. */
function nodesOf(doc) {
  const nodes = new Map(), owner = new Map();
  for (const p of doc.pipelines) for (const c of p.components) {
    nodes.set(c.uid, {c, branch: val(p, 'Branchname')});
    for (const r of c.restraints) owner.set(r.uid, c.uid);
  }
  return {nodes, owner};
}
const lockOf = c => Object.values(c.values || {}).find(v => v?.lock)?.lock
  ?? c.restraints.flatMap(r => Object.values(r.values || {})).find(v => v?.lock)?.lock ?? null;
/** Today's own coordinate tolerance, as its run used it (SupportsStage.js: config.coordinateTolerance, default 1), so
 * the join and the names group exactly as today did (PR 301 review B1). A caller's different value is refused. */
function todayTolerance(run, options) {
  const own = run.config ? toFiniteNumber(run.config.coordinateTolerance, 1) : null;
  if (own != null && options.tolerance != null && Number(options.tolerance) !== own) refuse('UXML_SUPPORTS_TOLERANCE_DIFFERS', {today: own, given: options.tolerance});
  return own ?? options.tolerance ?? 1;
}
const supportsLocked = c => !!c.values?.NodeNumber?.lock?.supports;

/**
 * Split one sub-step's ops into those taken and those held back by a lock: a removal of a locked node, and every
 * change to the supports of a supports-locked node. Held ops are returned as plain records of what was wanted.
 * `takeLockedSupports`, `removeLockedNodes`: the gate's wrong controls only.
 */
export function holdBackLocked(doc, ops, {takeLockedSupports = false, removeLockedNodes = false} = {}) {
  const {nodes, owner} = nodesOf(doc);
  const taken = [], held = [];
  for (const op of ops) {
    const node = nodes.get(op.uid);
    const host = nodes.get(op.op === 'add' ? op.parent : owner.get(op.uid));
    const support = host && op.op === 'remove' ? host.c.restraints.find(r => r.uid === op.uid) : null;
    if (op.op === 'remove' && node && lockOf(node.c) && !removeLockedNodes) held.push({kind: 'node', uid: op.uid, op});
    else if (host && supportsLocked(host.c) && !takeLockedSupports) held.push({kind: 'supports', uid: host.c.uid, op});
    else if (support && lockOf({values: support.values, restraints: []}) && !takeLockedSupports) held.push({kind: 'supports', uid: host.c.uid, op});
    else taken.push(op);
  }
  return {taken, held};
}

/** The conflict list from what still differs at the end: value locks, kept nodes, locked supports (today's order:
 * values first, in document order, then supports). Anything a lock does not explain is refused. */
function residualConflicts(doc, todayXml, firstStep, options) {
  const {nodes, owner} = nodesOf(doc);
  const {held, taken} = holdBackLocked(doc, changesFromXml(doc, todayXml, 'residual'), options);
  const ids = readIds(todayXml), out = readPsi116V2(ids.text, {fileSha256: sha256Hex(ids.text)});
  const todayNode = new Map(out.pipelines.flatMap((p, b) => p.components.map((d, j) => [ids.branches[b].nodes[j], d])));
  const values = [], others = [], seen = new Set();
  const place = uid => { const n = nodes.get(uid) || nodes.get(owner.get(uid)); return n ? {branch: n.branch, node: val(n.c, 'NodeNumber')} : {branch: val(doc.pipelines.find(p => p.uid === uid), 'Branchname'), node: null}; };
  const byUid = new Map([...doc.pipelines, ...[...nodes.values()].flatMap(n => [n.c, ...n.c.restraints])].map(e => [e.uid, e]));
  for (const op of taken) {
    const entity = byUid.get(op.uid);
    const key = op.path?.startsWith('values.') ? op.path.slice(7) : null;
    const current = key ? entity?.values?.[key] : null;
    if (op.op !== 'set' || !current?.lock) refuse('UXML_SUPPORTS_LOCKS_RESIDUAL', {op: op.op, uid: op.uid, path: op.path ?? null});
    values.push({...place(op.uid), key, kept: current.text, stageWanted: op.after?.text ?? null, lock: current.lock, step: firstStep.get(op.uid + '|' + key) ?? null});
  }
  for (const h of held) {
    if (seen.has(h.kind + h.uid)) continue;
    seen.add(h.kind + h.uid);
    const c = nodes.get(h.uid).c;
    if (h.kind === 'node') others.push({...place(h.uid), key: 'Node', kept: 'kept', stageWanted: 'removed', lock: lockOf(c), step: firstStep.get(h.uid + '|Node') ?? null});
    else {
      const want = todayNode.get(h.uid); // today's node by its carried id
      others.push({...place(h.uid), key: 'Supports', kept: restraintsText(c.restraints), stageWanted: want ? restraintsText(want.restraints) : 'none',
        lock: c.values.NodeNumber.lock ?? lockOf(c), step: firstStep.get(h.uid + '|Supports') ?? null});
    }
  }
  return values.concat(others);
}

/**
 * Run today's supports stage on `doc` and read it back sub-step by sub-step under the document's locks. A locked node
 * today's branch pass removes is first joined into the node it keeps (JoinDuplicates.js, Owner 20 Nov), then the stage
 * runs again on the joined document. `noJoin` (gate control only): the locked node is kept instead, as in E2b.
 */
export function runSupportsUnderLocks(doc, runStageFull, options = {}) {
  if (!options.history) {
    const read = options.nameHistory === false ? {uxml: doc, delta: null, history: new Map()} : readNameHistory(doc);
    const again = runSupportsUnderLocks(read.uxml, runStageFull, {...options, history: read.history});
    return read.delta ? {...again, deltas: [read.delta, ...again.deltas]} : again;
  }
  const input = withoutTransferNote(writePsi116FromUxmlV2(doc).text);
  const tagged = runStageFull(tagIds(doc, input)); // today's stage, the document's ids carried through it
  const tolerance = todayTolerance(tagged, options);
  const today = {xmlText: withoutIds(tagged.xmlText), stages: Object.fromEntries(Object.entries(tagged.stages).map(([k, v]) => [k, withoutIds(v)]))};
  if (!options.noJoin && !options.joinedFrom) {
    const plan = joinPlan(doc, tagged.stages['branch-pass'], {tolerance});
    if (plan.length) {
      const join = joinDuplicates(doc, plan, {stageWins: !!options.joinStageWins, xmlAxisToCiiAxis: options.xmlAxisToCiiAxis});
      const again = runSupportsUnderLocks(join.uxml, runStageFull, {...options, joinedFrom: join});
      return {...again, deltas: [...join.deltas, ...again.deltas]};
    }
  }
  let uxml = doc;
  const deltas = [], firstStep = new Map();
  for (const id of SUPPORTS_STEPS) {
    const {taken, held} = holdBackLocked(uxml, changesFromXml(uxml, tagged.stages[id], id), options);
    for (const h of held) { const k = h.uid + '|' + (h.kind === 'node' ? 'Node' : 'Supports'); if (!firstStep.has(k)) firstStep.set(k, id); }
    const stage = {id: 'supports:' + id, rulesVersion: SUPPORTS_AS_CHANGES_RULES, reads: [...LAYERS], writes: [...LAYERS], run: () => ({ops: structuredClone(taken)})};
    const step = runStage(stage, uxml, {}, {}, {inputHashes: [sha256Hex(today.stages[id])]});
    for (const c of step.refusals) { const k = c.uid + '|' + c.key; if (!firstStep.has(k)) firstStep.set(k, id); }
    uxml = step.uxml;
    deltas.push(step.delta);
  }
  const conflicts = residualConflicts(uxml, tagged.xmlText, firstStep, options);
  const withNote = d => withTransferNote(writePsi116FromUxmlV2(d).text, noteFromLocks(d));
  const engineXmlText = withNote(uxml);
  let names = [];
  if (options.names !== false) {
    const step = joinNames(uxml, joinNamesPlan(doc, tagged.stages['branch-pass'], {tolerance, history: options.history}));
    uxml = step.uxml;
    names = step.names;
    if (step.delta) deltas.push(step.delta);
  }
  const xmlText = names.some(n => n.written.length) ? withNote(uxml) : engineXmlText;
  return {uxml, deltas, conflicts, joined: options.joinedFrom?.joined || [], names, xmlText, engineXmlText, stageXmlText: today.xmlText,
    rules: SUPPORTS_UNDER_LOCKS_RULES};
}
