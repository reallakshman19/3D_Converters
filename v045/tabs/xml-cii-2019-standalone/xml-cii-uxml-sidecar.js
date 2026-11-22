// End-to-end plan E4b step 3 (Owner 21 Nov 2026, "Yes, as suggested"; sidecar plan of 20 Nov): one optional sidecar per
// CII file, `<model>.cii.sidecar.json`, for what the CII cannot carry. Node id wise, only what changed (Owner 20 Nov):
// per CII node number the UXML node id(s) it was written from, each id's joined ids and name/reference history
// (NodeName.1..n, ComponentRefNo.1..n), each value a recorded step changed (before, after, the steps and rules that set
// it), its locks; the nodes removed (and the node a joined one went into); the lock conflicts. Made only when the CII
// engine read the document ("Engine reads UXML" on, Owner 21 Nov): it is built from the route's recorded steps (the
// chain from the source read), the engine's recorded steps and the engine's node map, so nothing is re-run and the CII
// is not touched.
export const SIDECAR_FORMAT = 'xml-cii-sidecar';
export const SIDECAR_VERSION = 1;

const textOf = (value) => (value == null ? null : String(value.text ?? ''));
const history = (value) => (value == null || value.text === '' ? [] : String(value.text).split('|'));

/** uid -> {kind, branch, entity, node (a support's node uid)} for every branch, node and support of `doc`. */
function indexInto(doc, at) {
  for (const p of doc?.pipelines || []) {
    const branch = textOf(p.values?.Branchname) ?? '';
    at.set(p.uid, { kind: 'branch', branch, entity: p });
    for (const c of p.components || []) {
      at.set(c.uid, { kind: 'node', branch, entity: c });
      for (const r of c.restraints || []) at.set(r.uid, { kind: 'support', branch, node: c.uid, entity: r });
    }
  }
  return at;
}

/** What the recorded steps did, per uid: value changes (first before, last after, every step), adds and removes. */
function walk(deltas) {
  const values = new Map(), added = new Map(), removed = new Map();
  for (const d of deltas) {
    for (const op of d.ops || []) {
      const by = { stage: d.stage, rule: op.rule || op.after?.rule || d.rulesVersion || null };
      if (op.op === 'set' && String(op.path || '').startsWith('values.')) {
        const field = op.path.slice(7);
        const m = values.get(op.uid) || new Map();
        values.set(op.uid, m);
        const seen = m.get(field) || { before: textOf(op.before), by: [] };
        seen.after = textOf(op.after);
        seen.by.push(by);
        m.set(field, seen);
      } else if (op.op === 'add' || op.op === 'split') {
        added.set(op.uid, { ...by, parent: op.parent, entity: op.entity });
      } else if (op.op === 'remove') {
        removed.set(op.uid, { ...by, parent: op.parent, entity: op.before });
      }
    }
  }
  return { values, added, removed };
}

const changedOf = (values, uid) => [...(values.get(uid) || [])]
  .filter(([, c]) => c.before !== c.after)
  .map(([field, c]) => ({ field, before: c.before, after: c.after, by: c.by }));
const locksOf = (entity) => Object.entries(entity?.values || {})
  .filter(([, v]) => v?.lock).map(([field, v]) => ({ field, lock: v.lock }));

/**
 * The sidecar of one CII: {format, version, model, cii, document, nodes, notInCii, removed, branches, conflicts}.
 *   chain: the route's {base (the source read), deltas} (xml-cii-uxml-route.js); engineDeltas: the CII engine's recorded
 *   steps (xml-cii-uxml-engine-changes.js); finalDoc: the document after them; nodeMap: the engine's
 *   {nodes: [{cii, ids}], notInCii: [{id, nodeNumber}]}; names: the route's "|" names ({node, from, ...}).
 */
const localName = (el) => String(el.localName || el.nodeName || '').replace(/^.*:/, '');
const kids = (el, tag) => [...(el?.childNodes || [])].filter((c) => c.nodeType === 1 && localName(c) === tag);
const leafText = (el, tag) => (kids(el, tag)[0]?.textContent ?? '').trim();

/**
 * End-to-end plan T1 (Owner 22 Nov 2026, "Yes, as suggested"): where each branch and node id of `finalDoc` is in the
 * Enriched XML written from it, as the transfer counts places (u2d_plan.read_target: the n-th Branch, its n-th Node).
 * Checked, never guessed: the branch and node counts and every NodeNumber and NodeName must be the document's.
 */
export function enrichedPlaces(xmlText, finalDoc) {
  const dom = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
  const root = dom.documentElement;
  if (!root || dom.getElementsByTagName('parsererror').length) return { ok: false, error: 'the Enriched XML does not parse' };
  const pipes = kids(root, 'Pipe');
  const branches = pipes.length ? pipes.flatMap((p) => kids(p, 'Branch')) : kids(root, 'Branch');
  const pipelines = finalDoc?.pipelines || [];
  if (branches.length !== pipelines.length) return { ok: false, error: `${branches.length} branch(es) in the XML, ${pipelines.length} in the document` };
  const nodes = new Map(), branchAt = [];
  for (let bi = 0; bi < branches.length; bi += 1) {
    const xmlNodes = kids(branches[bi], 'Node'), comps = pipelines[bi].components || [];
    if (xmlNodes.length !== comps.length) return { ok: false, error: `branch ${bi + 1}: ${xmlNodes.length} node(s) in the XML, ${comps.length} in the document` };
    for (let ni = 0; ni < comps.length; ni += 1) {
      for (const f of ['NodeNumber', 'NodeName']) {
        if (leafText(xmlNodes[ni], f) !== String(comps[ni].values?.[f]?.text ?? '').trim()) return { ok: false, error: `branch ${bi + 1} node ${ni + 1}: ${f} differs` };
      }
      nodes.set(comps[ni].uid, [bi, ni]);
    }
    branchAt.push({ id: pipelines[bi].uid, branch: textOf(pipelines[bi].values?.Branchname) ?? '', at: bi });
  }
  return { ok: true, nodes, branches: branchAt };
}

export function buildCiiSidecar({ model, cii = {}, chain, engineDeltas = [], finalDoc, nodeMap, names = [], conflicts = [], notRecorded = 0, enriched = null, createdAt = new Date().toISOString() }) {
  if (!chain?.base || !finalDoc || !Array.isArray(nodeMap?.nodes)) throw new Error('CII_SIDECAR_INPUT: the document chain, final document and node map are needed');
  const deltas = [...(chain.deltas || []), ...engineDeltas];
  const at = indexInto(finalDoc, indexInto(chain.base, new Map()));
  const { values, added, removed } = walk(deltas);
  const joinedFrom = new Map(names.map((n) => [n.node, n.from || []]));
  const joinedInto = new Map(names.flatMap((n) => (n.from || []).map((f) => [f, n.node])));
  const supportsOf = (uid) => {
    const now = at.get(uid)?.entity?.restraints || [];
    const out = now.map((r, k) => ({ support: k + 1, id: r.uid, type: textOf(r.values?.Type), changed: changedOf(values, r.uid),
      ...(added.has(r.uid) ? { added: { stage: added.get(r.uid).stage, rule: added.get(r.uid).rule } } : {}) }))
      .filter((s) => s.changed.length || s.added);
    for (const [id, r] of removed) {
      if (r.parent === uid && r.entity?.kind !== 'component') out.push({ id, type: textOf(r.entity?.values?.Type), removed: { stage: r.stage, rule: r.rule } });
    }
    return out.map((s) => (s.changed?.length === 0 ? (({ changed, ...rest }) => rest)(s) : s));
  };
  // T1: places in the Enriched XML delivered with this CII ({sha256, xmlText}); none when it was not written from the document.
  const places = enriched?.xmlText ? enrichedPlaces(enriched.xmlText, finalDoc) : null;
  const node = (id) => {
    const e = at.get(id)?.entity;
    const out = { id, branch: at.get(id)?.branch ?? '', NodeName: history(e?.values?.NodeName), ComponentRefNo: history(e?.values?.ComponentRefNo) };
    if (joinedFrom.get(id)?.length) out.joined = joinedFrom.get(id);
    const changed = changedOf(values, id), locks = locksOf(e), supports = supportsOf(id);
    if (changed.length) out.changed = changed;
    if (locks.length) out.locks = locks;
    if (supports.length) out.supports = supports;
    if (added.has(id)) out.added = { stage: added.get(id).stage, rule: added.get(id).rule };
    if (places?.ok && places.nodes.has(id)) out.at = places.nodes.get(id);
    return out;
  };
  // A removed node's supports went with it (E4b review B2: EF-05's type Z supports on joined-away duplicates): those it
  // held when removed, and any removed on their own from it.
  const removedSupportsOf = (id, r) => {
    const out = new Map();
    for (const s of r.entity?.restraints || []) out.set(s.uid, { id: s.uid, type: textOf(s.values?.Type), removed: { stage: r.stage, rule: r.rule } });
    for (const [sid, s] of removed) {
      if (s.parent === id && s.entity?.kind !== 'component') out.set(sid, { id: sid, type: textOf(s.entity?.values?.Type), removed: { stage: s.stage, rule: s.rule } });
    }
    return [...out.values()];
  };
  const last = deltas.at(-1);
  return {
    format: SIDECAR_FORMAT, version: SIDECAR_VERSION, model: String(model || 'model'), createdAt,
    cii: { name: cii.name || null, sha256: cii.sha256 || null },
    document: {
      source: chain.base.revision?.id || null, sourceSha256: chain.base.revision?.inputs?.[0]?.sha256 || null,
      revision: finalDoc.revision?.id || last?.result || null,
      steps: deltas.map((d) => ({ stage: d.stage, rule: d.rulesVersion, base: d.base, result: d.result, ops: (d.ops || []).length })),
      // Engine changes the document could not record (an added support row): counted here, not listed (E4b review N5).
      notRecorded: Number(notRecorded) || 0,
    },
    nodes: nodeMap.nodes.map((n) => ({ cii: n.cii, ids: n.ids.map(node) })),
    notInCii: (nodeMap.notInCii || []).map((n) => ({ ...node(n.id), nodeNumber: n.nodeNumber })),
    removed: [...removed].filter(([, r]) => r.entity?.kind === 'component').map(([id, r]) => ({ id, branch: at.get(r.parent)?.branch ?? '',
      NodeName: history(r.entity?.values?.NodeName), ComponentRefNo: history(r.entity?.values?.ComponentRefNo), stage: r.stage, rule: r.rule,
      ...(joinedInto.has(id) ? { joinedInto: joinedInto.get(id) } : {}),
      ...((s) => (s.length ? { supports: s } : {}))(removedSupportsOf(id, r)) })),
    branches: (finalDoc.pipelines || []).map((p) => ({ id: p.uid, branch: textOf(p.values?.Branchname) ?? '', changed: changedOf(values, p.uid) }))
      .filter((b) => b.changed.length),
    conflicts,
    // T1: the CII's elements in order with the node ids their ends were written from (the engine's), and the Enriched
    // XML the places are in. The transfer by node id refuses another Enriched XML.
    elements: (nodeMap.elements || []).map((e) => ({ from: e.from, to: e.to, fromId: e.fromId, toId: e.toId })),
    enriched: !enriched ? null : places?.ok ? { sha256: enriched.sha256 || null, branches: places.branches }
      : { sha256: enriched.sha256 || null, error: places?.error || 'no Enriched XML text' },
  };
}

/** `<model>.cii.sidecar.json` beside `<model>.cii`. */
export const sidecarFileName = (ciiName) => `${String(ciiName || 'model.cii').replace(/\.cii$/i, '')}.cii.sidecar.json`;
