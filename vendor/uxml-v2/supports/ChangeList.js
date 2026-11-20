/**
 * End-to-end plan E2c step 3 (Owner 20 Nov 2026, "Yes, start step 3"): the changes step 10 recorded on the UXML
 * document, listed per recorded stage (sub-step) for the review page: nodes removed and added, supports added, removed
 * and rewritten (a new Type), the other support values set, node and branch values set (counted per field), locks set
 * or cleared (counted per field; a locked duplicate's join moves them), and any other change. Every recorded change is
 * in exactly one of these, so `listed` equals the stage's own change count; `other` counts the changes of a kind the
 * page has no list for (the page says so when it is not 0); a change without a rule is counted in `noRule`.
 *
 * It reads only the document before the stage run and the recorded deltas (each op carries its rule; a removal its
 * `before` entity, an added node or support its `entity` and `parent`), so nothing is re-run.
 *
 *   changeList(docBefore, deltas) -> [{stage, rule, ops, listed, noRule, removedNodes:[{branch, node, name, ref}],
 *     nodesAdded:[{branch, node, name, ref}], supportsAdded:[{branch, node, name, type}],
 *     supportsRemoved:[{branch, node, name, type}], supportsRewritten:[{branch, node, name, was, now}],
 *     supportValuesSet, valuesSet:{field: count}, locksSet:{field: count}, other}]
 *   unlistedStages(steps, list) -> [{stage, recorded, listed, extra?}]: recorded stages the list misses or miscounts,
 *     matched in order (one stage, such as a join, may be recorded more than once), and list entries no stage recorded.
 */
const text = (e, k) => String(e?.values?.[k]?.text ?? '').trim();
const keyOf = path => (String(path || '').startsWith('values.') ? path.slice(7) : String(path || ''));

/** uid -> where it is: {kind: 'pipeline'|'component'|'restraint', branch, entity (component), node, type (restraint)}. */
function indexOf(doc) {
  const at = new Map();
  for (const p of doc.pipelines) {
    const branch = text(p, 'Branchname');
    at.set(p.uid, {kind: 'pipeline', branch});
    for (const c of p.components) {
      at.set(c.uid, {kind: 'component', branch, entity: c});
      for (const r of c.restraints) at.set(r.uid, {kind: 'restraint', branch, node: c.uid, type: text(r, 'Type')});
    }
  }
  return at;
}

/** A node's number and name now (a sub-step may renumber it; a removed node keeps its last number and name). */
const nodeOf = (at, uid) => {
  const n = at.get(uid);
  return {branch: n?.branch ?? '', node: n?.number ?? text(n?.entity, 'NodeNumber'), name: n?.name ?? text(n?.entity, 'NodeName')};
};
const nodeRow = (branch, e) => ({branch, node: text(e, 'NodeNumber'), name: text(e, 'NodeName'), ref: text(e, 'ComponentRefNo')});

function emptyStage(delta) {
  return {stage: delta.stage, rule: delta.rulesVersion, ops: delta.ops.length, listed: 0, noRule: 0, removedNodes: [],
    nodesAdded: [], supportsAdded: [], supportsRemoved: [], supportsRewritten: [], supportValuesSet: 0, valuesSet: {},
    locksSet: {}, other: 0};
}

function listRemove(at, op, out) {
  const was = at.get(op.uid);
  if (was?.kind === 'component' && !was.removed) {
    out.removedNodes.push(nodeRow(was.branch, op.before || was.entity));
    was.removed = true; // kept, so a support removed after its node still names it
  } else if (was?.kind === 'restraint') {
    out.supportsRemoved.push({...nodeOf(at, was.node), type: was.type});
    at.delete(op.uid);
  } else return false;
  return true;
}

function listAdd(at, op, out) {
  const parent = at.get(op.parent);
  if (op.kind === 'restraint' && parent?.kind === 'component') {
    const type = text(op.entity, 'Type');
    at.set(op.uid, {kind: 'restraint', branch: parent.branch, node: op.parent, type});
    out.supportsAdded.push({...nodeOf(at, op.parent), type});
    return true;
  }
  if (op.kind === 'component' && parent?.kind === 'pipeline') {
    at.set(op.uid, {kind: 'component', branch: parent.branch, entity: op.entity});
    out.nodesAdded.push(nodeRow(parent.branch, op.entity));
    return true;
  }
  return false;
}

function listSet(at, op, out) {
  const where = at.get(op.uid), key = keyOf(op.path);
  if (!where || !key) return false;
  if (where.kind === 'restraint') {
    if (key === 'Type') {
      const now = String(op.after?.text ?? '').trim();
      out.supportsRewritten.push({...nodeOf(at, where.node), was: where.type, now});
      where.type = now;
    } else out.supportValuesSet += 1;
    return true;
  }
  if (where.kind === 'component' && key === 'NodeNumber') where.number = String(op.after?.text ?? '').trim();
  if (where.kind === 'component' && key === 'NodeName') where.name = String(op.after?.text ?? '').trim();
  out.valuesSet[key] = (out.valuesSet[key] || 0) + 1;
  return true;
}

function listLock(at, op, out) {
  const key = keyOf(op.path);
  if (!at.has(op.uid) || !key) return false;
  out.locksSet[key] = (out.locksSet[key] || 0) + 1;
  return true;
}

const LISTERS = {remove: listRemove, add: listAdd, set: listSet, lock: listLock, unlock: listLock};

export function changeList(docBefore, deltas) {
  const at = indexOf(docBefore);
  return (deltas || []).map(delta => {
    const out = emptyStage(delta);
    for (const op of delta.ops) {
      if (!op.rule) out.noRule += 1;
      if (!LISTERS[op.op]?.(at, op, out)) out.other += 1;
      out.listed += 1;
    }
    return out;
  });
}

/** Recorded stages (the Run record's steps, in order) the change list misses or miscounts, and list entries no
 *  recorded stage has. Matched in order, so a stage recorded twice (two joins) is matched twice. */
export function unlistedStages(steps, list) {
  const rest = [...(list || [])], out = [];
  for (const s of steps || []) {
    const i = rest.findIndex(g => g.stage === s.stage && g.rule === s.rule);
    const got = i < 0 ? null : rest.splice(i, 1)[0];
    if (!got || got.listed !== s.ops || got.ops !== s.ops) out.push({stage: s.stage, recorded: s.ops, listed: got?.listed ?? 0});
  }
  for (const g of rest) out.push({stage: g.stage, recorded: 0, listed: g.listed, extra: true});
  return out;
}
