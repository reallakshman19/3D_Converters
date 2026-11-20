/**
 * End-to-end plan E2c step 1, the join (Owner 20 Nov 2026, "Yes, that join"; replaces 19 Nov "keep the node").
 *
 * Today's branch pass removes duplicate ATTA nodes at one point and keeps one (DATUM, else the one with a support,
 * else the first). When a node it removes holds a transfer lock, that node is joined into the node today keeps, before
 * the stage runs, and compared value by value:
 *   - a value the same on both: kept once (a lock on it moves to the kept node);
 *   - a value only on the removed node: moved onto the kept node (locked if it was);
 *   - a value that differs: the locked one wins and is listed; with no lock the kept node's value stays (as today);
 *     two different locks on one value are refused (UXML_JOIN_LOCKS_DIFFER);
 *   - supports joined by content (pairForJoin: a PSI116 Z counts as Y): identical ones kept once, the removed node's
 *     other supports moved onto the kept node; a supports lock moves with them;
 *   - identity (NodeNumber, NodeName, ComponentRefNo) is the kept node's; a lock on one is refused
 *     (UXML_JOIN_IDENTITY_LOCKED).
 * The removed node's locks are then released, so today's stage removes it as usual, and the kept node goes through
 * every sub-step. The join is one recorded stage (rule duplicate-join/1) plus a plain list of what was joined.
 *
 * Supports pair only by content: an identical one, else one of the same Type as today's stage writes it (its
 * xmlAxisToCiiAxis, default Z -> Y, ANCI -> +Y); any other support of the removed node is moved (PR 301 review B1).
 * Several locked nodes removed into one kept node are joined one after another, each into the node as already joined
 * (review B2); a write the kernel refuses is refused here too.
 *
 *   joinPlan(doc, branchPassXml, {tolerance}) -> [{branch, from, into}]   (uids; refused when no single kept node)
 *   joinDuplicates(doc, plan, {stageWins, xmlAxisToCiiAxis}) -> {uxml, deltas, joined:[{branch, from, into, moved, replaced, same}]}
 */
import {runStage, sha256Hex, LAYERS} from '../UxmlV2Kernel.js';
import {changesFromXml} from './SupportsAsChanges.js';
import {xmlPositionKey} from './parent/ParentMatching.js';
import {normalizeExistingXmlCiiRestraintType} from './core/support-mapping-entries.js';

export const DUPLICATE_JOIN_RULES = 'duplicate-join/1';
const IDENTITY = ['NodeNumber', 'NodeName', 'ComponentRefNo'];
const TODAY_AXIS = {Z: 'Y', ANCI: '+Y'}; // today's default xmlAxisToCiiAxis (EnrichmentConfig.js)
const txt = (e, k) => String(e?.values?.[k]?.text ?? '');
const hasLock = e => Object.values(e.values || {}).some(v => v?.lock) || (e.restraints || []).some(hasLock);

function refuse(code, details) {
  const error = new Error(`${code}: ${JSON.stringify(details)}`);
  error.code = code;
  error.details = details;
  throw error;
}
const plainValue = v => { const out = {...v}; delete out.rev; delete out.lock; return out; };
const plainLock = l => { const out = {...l}; delete out.rev; return out; };
const sameLock = (a, b) => JSON.stringify(plainLock(a)) === JSON.stringify(plainLock(b));

const supportText = r => Object.keys(r.values).sort().map(k => `${k}=${r.values[k].text}`).join(' ') + `|${r.frame || ''}`;
/**
 * Pair two nodes' supports for the join, by what they are: an identical one first, else the one of the same Type as
 * today's stage writes it (`asToday`). More than one candidate on either side is refused, never guessed; a support with
 * no candidate is not paired (it is moved), since two different supports on two nodes are both real (PR 301 review B1).
 */
function pairForJoin(have, want, asToday) {
  const pairs = [], freeIn = new Set(have.keys()), freeOut = new Set(want.keys());
  const take = (i, j) => { pairs.push([i, j]); freeIn.delete(i); freeOut.delete(j); };
  for (const j of [...freeOut]) {
    const i = [...freeIn].find(k => supportText(have[k]) === supportText(want[j]));
    if (i != null) take(i, j);
  }
  const fits = (i, j) => asToday(txt(have[i], 'Type')) === asToday(txt(want[j], 'Type'));
  const choice = [];
  for (const j of freeOut) {
    const ins = [...freeIn].filter(i => fits(i, j));
    if (!ins.length) continue;
    const rivals = [...freeOut].filter(k => fits(ins[0], k));
    if (ins.length > 1 || rivals.length > 1) refuse('UXML_SUPPORTS_SUPPORT_AMBIGUOUS', {type: txt(want[j], 'Type'), candidates: [ins.length, rivals.length]});
    choice.push([ins[0], j]);
  }
  for (const [i, j] of choice) take(i, j);
  return pairs.sort((a, b) => a[0] - b[0]);
}

/** Locked nodes today's branch pass removes (by their carried ids), each with the one ATTA node kept at that point. */
export function joinPlan(doc, branchPassXml, {tolerance = 1} = {}) {
  const removed = new Set(changesFromXml(doc, branchPassXml, 'branch-pass').filter(o => o.op === 'remove').map(o => o.uid));
  const plan = [];
  for (const p of doc.pipelines) for (const r of p.components) {
    if (!removed.has(r.uid) || !hasLock(r)) continue;
    // Today's grouping (BranchPass.js): ATTA in any case, positions by xmlPositionKey at the coordinate tolerance (review N3).
    const at = xmlPositionKey(txt(r, 'Position'), tolerance);
    const keepers = p.components.filter(c => !removed.has(c.uid) && txt(c, 'ComponentType').toUpperCase() === 'ATTA' && xmlPositionKey(txt(c, 'Position'), tolerance) === at);
    if (keepers.length !== 1) refuse(keepers.length ? 'UXML_JOIN_KEEPER_AMBIGUOUS' : 'UXML_JOIN_NO_KEEPER', {branch: txt(p, 'Branchname'), node: txt(r, 'NodeNumber')});
    plan.push({branch: txt(p, 'Branchname'), from: r.uid, into: keepers[0].uid});
  }
  return plan;
}

/** Ops joining entity `from`'s values into `into` (a node or a support), per the rules above. */
function joinValues(from, into, rec, {skipIdentity, stageWins}) {
  const ops = [], have = new Set(Object.keys(into.values || {}));
  let prev = null;
  for (const key of from.fieldOrder || Object.keys(from.values)) {
    const rv = from.values[key], kv = into.values?.[key];
    const isIdentity = skipIdentity && IDENTITY.includes(key);
    if (isIdentity && rv?.lock && !(key === 'NodeNumber' && rv.lock.supports)) refuse('UXML_JOIN_IDENTITY_LOCKED', {node: rec.fromNumber, key});
    if (isIdentity && rv?.lock?.supports) {
      // The transfer set the removed node's supports: the lock moves with them to the kept node (one supports lock each).
      if (kv?.lock && !kv.lock.supports) refuse('UXML_JOIN_IDENTITY_LOCKED', {node: rec.intoNumber, key}); // review N5
      if (kv?.lock && !sameLock(kv.lock, rv.lock)) refuse('UXML_JOIN_LOCKS_DIFFER', {node: rec.fromNumber, key: 'Supports'});
      if (!kv?.lock) {
        ops.push({op: 'lock', uid: into.uid, path: 'values.NodeNumber', after: plainLock(rv.lock), rule: DUPLICATE_JOIN_RULES});
        rec.moved.push({key: 'Supports lock', value: rv.text, locked: true});
      }
    }
    if (isIdentity || !rv) { if (have.has(key)) prev = key; continue; }
    const lock = rv.lock ? [{op: 'lock', uid: into.uid, path: 'values.' + key, after: plainLock(rv.lock), rule: DUPLICATE_JOIN_RULES}] : [];
    if (!kv) {
      ops.push({op: 'set', uid: into.uid, path: 'values.' + key, after: plainValue(rv), ...(prev ? {afterKey: prev} : {}), rule: DUPLICATE_JOIN_RULES}, ...lock);
      rec.moved.push({key, value: rv.text, locked: !!rv.lock});
      prev = key;
      continue;
    }
    prev = key;
    if (kv.text === rv.text) { rec.same += 1; if (rv.lock && !kv.lock) ops.push(...lock); continue; }
    if (!rv.lock || stageWins) continue;
    if (kv.lock) refuse('UXML_JOIN_LOCKS_DIFFER', {node: rec.fromNumber, key, locked: [kv.text, rv.text]});
    // A differing locked value replaces the kept node's; both are listed.
    ops.push({op: 'set', uid: into.uid, path: 'values.' + key, after: plainValue(rv), rule: DUPLICATE_JOIN_RULES}, ...lock);
    rec.replaced.push({key, kept: rv.text, was: kv.text});
  }
  return ops;
}

/** Ops joining removed node `r`'s supports into kept node `k`, and releasing every lock of `r`. */
function joinSupports(r, k, rec, options) {
  const axis = {...TODAY_AXIS, ...(options.xmlAxisToCiiAxis || {})};
  const asToday = t => normalizeExistingXmlCiiRestraintType(t, {xmlAxisToCiiAxis: axis});
  const ops = [], pairs = pairForJoin(r.restraints, k.restraints, asToday);
  const paired = new Set(pairs.map(([i]) => i));
  for (const [i, j] of pairs) ops.push(...joinValues(r.restraints[i], k.restraints[j], rec, options));
  let after = k.restraints.at(-1)?.uid ?? null;
  r.restraints.forEach((s, i) => {
    if (paired.has(i)) return;
    const uid = 'u:j' + sha256Hex(`${k.uid}|${s.uid}|join`).slice(0, 15);
    const values = Object.fromEntries(Object.entries(s.values).map(([key, v]) => [key, plainValue(v)]));
    ops.push({op: 'add', kind: 'restraint', uid, parent: k.uid, after, rule: DUPLICATE_JOIN_RULES,
      entity: {kind: 'restraint', fieldOrder: [...(s.fieldOrder || Object.keys(s.values))], values, ...(s.frame ? {frame: s.frame} : {}),
        lineage: {from: [s.uid], rule: DUPLICATE_JOIN_RULES}}});
    for (const [key, v] of Object.entries(s.values)) if (v?.lock) ops.push({op: 'lock', uid, path: 'values.' + key, after: plainLock(v.lock), rule: DUPLICATE_JOIN_RULES});
    rec.moved.push({key: 'Support', value: txt(s, 'Type'), locked: hasLock(s)});
    after = uid;
  });
  for (const e of [r, ...r.restraints]) for (const [key, v] of Object.entries(e.values || {}))
    if (v?.lock) ops.push({op: 'unlock', uid: e.uid, path: 'values.' + key, rule: DUPLICATE_JOIN_RULES});
  return ops;
}

/** Run the join, one recorded stage per removed node, each on the document as already joined. `stageWins` (gate
 * control only): a differing locked value is not taken. */
export function joinDuplicates(doc, plan, {stageWins = false, xmlAxisToCiiAxis = null} = {}) {
  let uxml = doc;
  const deltas = [], joined = [];
  for (const {branch, from, into} of plan) {
    const byUid = new Map(uxml.pipelines.flatMap(p => p.components).map(c => [c.uid, c]));
    const r = byUid.get(from), k = byUid.get(into);
    const rec = {branch, from: txt(r, 'NodeNumber'), into: txt(k, 'NodeNumber'), fromNumber: txt(r, 'NodeNumber'), intoNumber: txt(k, 'NodeNumber'), moved: [], replaced: [], same: 0};
    const options = {stageWins, xmlAxisToCiiAxis};
    const ops = [...joinValues(r, k, rec, {...options, skipIdentity: true}), ...joinSupports(r, k, rec, {...options, skipIdentity: false})];
    delete rec.fromNumber; delete rec.intoNumber;
    const stage = {id: 'supports:join', rulesVersion: DUPLICATE_JOIN_RULES, reads: [...LAYERS], writes: [...LAYERS], run: () => ({ops: structuredClone(ops)})};
    const step = runStage(stage, uxml);
    if (step.refusals?.length) refuse('UXML_JOIN_LOCKS_DIFFER', {node: rec.from, into: rec.into, refused: step.refusals.map(c => c.key)});
    uxml = step.uxml;
    deltas.push(step.delta);
    joined.push(rec);
  }
  return {uxml, deltas, joined};
}
