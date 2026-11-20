/**
 * End-to-end plan E2c step 3 (Owner 20 Nov 2026, "Yes, start step 3"): the changes step 10 recorded on the UXML
 * document, listed per recorded stage (sub-step) for the review page: nodes removed, supports added, removed and
 * rewritten (a new Type), the other support values set, node and branch values set (counted per field), and any other
 * change. Every recorded change is in exactly one of these, so `listed` equals the stage's own change count; a change
 * without a rule is counted in `noRule`.
 *
 * It reads only the document before the stage run and the recorded deltas (each op carries its rule; a removal its
 * `before` entity, an added support its `entity` and `parent`), so nothing is re-run.
 *
 *   changeList(docBefore, deltas) -> [{stage, rule, ops, listed, noRule, removedNodes:[{branch, node, name, ref}],
 *     supportsAdded:[{branch, node, type}], supportsRemoved:[{branch, node, type}],
 *     supportsRewritten:[{branch, node, was, now}], supportValuesSet, valuesSet:{field: count}, other}]
 *   unlistedStages(steps, list) -> [{stage, recorded, listed}]: recorded stages the list misses or miscounts
 */
const text = (e, k) => String(e?.values?.[k]?.text ?? '').trim();

/** uid -> where it is: {kind: 'pipeline'|'component'|'restraint', branch, node (component uid), type (restraint)}. */
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

/** A node's number and name now (a sub-step may renumber it). */
const nodeOf = (at, uid) => {
  const n = at.get(uid);
  return {branch: n?.branch ?? '', node: n?.number ?? text(n?.entity, 'NodeNumber'), name: n?.name ?? text(n?.entity, 'NodeName')};
};

function emptyStage(delta) {
  return {stage: delta.stage, rule: delta.rulesVersion, ops: delta.ops.length, listed: 0, noRule: 0, removedNodes: [],
    supportsAdded: [], supportsRemoved: [], supportsRewritten: [], supportValuesSet: 0, valuesSet: {}, other: 0};
}

function listRemove(at, op, out) {
  const was = at.get(op.uid);
  if (was?.kind === 'component') {
    const b = op.before || was.entity;
    out.removedNodes.push({branch: was.branch, node: text(b, 'NodeNumber'), name: text(b, 'NodeName'), ref: text(b, 'ComponentRefNo')});
  } else if (was?.kind === 'restraint') out.supportsRemoved.push({...nodeOf(at, was.node), type: was.type});
  else return false;
  at.delete(op.uid);
  return true;
}

function listAdd(at, op, out) {
  if (op.kind !== 'restraint' || !at.has(op.parent)) return false;
  const type = text(op.entity, 'Type');
  at.set(op.uid, {kind: 'restraint', branch: at.get(op.parent).branch, node: op.parent, type});
  out.supportsAdded.push({...nodeOf(at, op.parent), type});
  return true;
}

function listSet(at, op, out) {
  const where = at.get(op.uid), key = op.path?.startsWith('values.') ? op.path.slice(7) : null;
  if (!where) return false;
  if (where.kind === 'restraint') {
    if (key === 'Type') {
      const now = String(op.after?.text ?? '').trim();
      out.supportsRewritten.push({...nodeOf(at, where.node), was: where.type, now});
      where.type = now;
    } else out.supportValuesSet += 1;
    return true;
  }
  if (!key) return false;
  if (where.kind === 'component' && key === 'NodeNumber') where.number = String(op.after?.text ?? '').trim();
  if (where.kind === 'component' && key === 'NodeName') where.name = String(op.after?.text ?? '').trim();
  out.valuesSet[key] = (out.valuesSet[key] || 0) + 1;
  return true;
}

const LISTERS = {remove: listRemove, add: listAdd, set: listSet};

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

/** Recorded stages (the Run record's steps) that the change list misses or whose counts differ. */
export function unlistedStages(steps, list) {
  const byStage = new Map((list || []).map(s => [s.stage + '|' + s.rule, s]));
  return (steps || []).flatMap(s => {
    const got = byStage.get(s.stage + '|' + s.rule);
    return got && got.listed === s.ops && got.ops === s.ops ? [] : [{stage: s.stage, recorded: s.ops, listed: got?.listed ?? 0}];
  });
}
