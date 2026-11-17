// Where each support value came from (Owner 16 Nov, UXML plan: values carry {src, rule}).
// For every support value (DTXR_*, CMPSUPGAP*, ...) and every restraint in the stage's final XML:
//   step     = the sub-stage from which it stays unchanged to the end: input (already in the stage's input XML),
//              parent (01 parent support loop), dtxr (02), atta (03 ATTA default), mds (04 MDS closure);
//   evidence = today's own diagnostic for that node in that sub-step (staged JSON item, path, match key, authority);
//   src      = psi116 (input), staged (staged JSON evidence), supportMapper (configured default profile), or
//              stage (a sub-step changed it but wrote no diagnostic naming the node: counted as unexplained);
//              a restraint rewritten in place with no diagnostic keeps src psi116, rule <step>/input-restraint-rewritten.
// Reads only the sub-stage XMLs and diagnostics the stage already makes; changes nothing.
import { childText, childrenByName, elementKids, elementsByName, parsePlainXml, textContent } from './PlainDom.js';
import { SUPPORT_FIELD } from './SupportTable.js';

export const PROVENANCE_STEPS = Object.freeze([
  ['input', 'branch-pass'], ['parent', '01-parent-enrichment'], ['dtxr', '02-dtxr-enrichment'],
  ['atta', '03-atta-default'], ['mds', '04-mds-closure'],
]);
const MATERIALIZED = /restraints?-materialized$/;
// Diagnostic types that say a sub-step wrote support values / restraints on a node.
const EXPLAINS = {
  parent: { value: /^(dtxr-pos|dtxr-ps|support-match)$/, restraint: /^support-match$/ },
  dtxr: { value: /^standalone-dtxr-node-resolution$/, restraint: MATERIALIZED },
  atta: { value: null, restraint: MATERIALIZED },
  mds: { value: null, restraint: MATERIALIZED },
};
const applied = (d) => d.type === 'standalone-dtxr-node-resolution' ? /^RESOLVED/.test(d.status || '')
  : MATERIALIZED.test(d.type) || d.status === undefined || d.status === 'applied';

const leaves = (el) => elementKids(el).filter((k) => !elementKids(k).length);

/** Support table straight from PlainDom (same shape as supportTableOf; the gate checks they agree). */
export function plainSupportTable(xmlOrRoot) {
  const root = typeof xmlOrRoot === 'string' ? parsePlainXml(xmlOrRoot).root : xmlOrRoot;
  const rows = [];
  for (const branch of elementsByName(root, 'Branch')) {
    const branchName = childText(branch, 'Branchname');
    childrenByName(branch, 'Node').forEach((node, nodeIndex) => {
      const support = {};
      for (const leaf of leaves(node)) {
        if (!SUPPORT_FIELD.test(leaf.__el)) continue;
        const text = textContent(leaf).trim();
        support[leaf.__el] = support[leaf.__el] === undefined ? text : `${support[leaf.__el]} | ${text}`;
      }
      const restraints = childrenByName(node, 'Restraint').map((r) => Object.fromEntries(leaves(r).map((l) => [l.__el, textContent(l).trim()])));
      rows.push({ branch: branchName, nodeIndex, NodeNumber: childText(node, 'NodeNumber'), NodeName: childText(node, 'NodeName'),
        ComponentType: childText(node, 'ComponentType'), position: childText(node, 'Position'), support, restraints });
    });
  }
  return rows;
}

function evidenceOf(d) {
  const staged = d.stagedName || (d.positionMembers || []).map((m) => m.name).filter(Boolean).join(' | ') || undefined;
  const paths = d.sourcePaths || (d.sourcePath ? [d.sourcePath] : undefined);
  const e = { type: d.type, matchedBy: d.matchedBy || d.effectiveSource || d.authority, key: d.matchedKey ?? d.groupId, staged, paths,
    authority: d.authority, byOrder: d.byOrder };
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== ''));
}
const srcOf = (d) => (d.authority === 'component-default-rest' || /^atta-default/.test(d.type) ? 'supportMapper' : 'staged');

const pointOf = (text) => { const v = String(text || '').match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number); return v && v.length >= 3 ? v : null; };
const samePoint = (a, b) => { const p = pointOf(a), q = pointOf(b); return !!p && !!q && p.every((x, k) => Math.abs(x - q[k]) <= 0.01); };

/**
 * Index a sub-step's diagnostics by table row. A diagnostic names its node by number (as that sub-step saw it), and
 * sometimes branch, position, or index in branch; several nodes can share a number (-1). Still ambiguous: the k-th such
 * diagnostic goes to the k-th candidate row the sub-step changed, when the counts agree (evidence.byOrder = true).
 */
function diagnosticsByRow(diagnostics, numbers, table, changed) {
  const rowsOf = new Map();
  numbers.forEach((n, i) => { if (!rowsOf.has(n)) rowsOf.set(n, []); rowsOf.get(n).push(i); });
  const byRow = new Map(), pending = new Map();
  const put = (i, d) => { if (!byRow.has(i)) byRow.set(i, []); byRow.get(i).push(d); };
  for (const d of diagnostics) {
    if (d.nodeNumber === undefined || !applied(d)) continue;
    const branch = d.xmlBranch || d.branchName;
    let rows = (rowsOf.get(String(d.nodeNumber).trim()) || []).filter((i) => !branch || table[i].branch === branch);
    const at = d.position || d.xmlPosition;
    if (rows.length > 1 && at) rows = rows.filter((i) => samePoint(table[i].position, at));
    // xmlIndex (DTXR node resolution) counts the branch's nodes from 1.
    if (rows.length > 1 && Number.isInteger(d.xmlIndex)) rows = rows.filter((i) => table[i].nodeIndex === d.xmlIndex - 1);
    if (rows.length === 1) put(rows[0], d);
    else if (rows.length > 1) {
      const key = `${d.type}|${rows.join(',')}`;
      if (!pending.has(key)) pending.set(key, { rows: rows.filter((i) => changed.has(i)), list: [] });
      pending.get(key).list.push(d);
    }
  }
  for (const { rows, list } of pending.values()) if (rows.length === list.length) list.forEach((d, k) => put(rows[k], { ...d, byOrder: true }));
  return byRow;
}

function record(step, kind, byStepRow, row) {
  if (step === 'input') return { step, src: 'psi116', rule: 'input' };
  const pattern = EXPLAINS[step][kind];
  const d = pattern && (byStepRow[step].get(row) || []).find((x) => pattern.test(x.type));
  return d ? { step, src: srcOf(d), rule: `${step}/${d.type}`, evidence: evidenceOf(d) } : { step, src: 'stage', rule: `${step}/unexplained` };
}

/**
 * @param {{stages: Record<string,string>, diagnosticsByStep: Record<string, object[]>, parentNumbers: string[]}} input
 *   stages: the stage's sub-stage XMLs; diagnosticsByStep: {parent, dtxr, atta, mds}; parentNumbers: NodeNumber of every
 *   node (document order) as the parent loop left them, before the split renumbering.
 * @returns {{rows: object[], counts: object}}
 */
export function supportProvenance({ stages, diagnosticsByStep, parentNumbers }) {
  const tables = PROVENANCE_STEPS.map(([, name]) => plainSupportTable(stages[name]));
  const final = tables.at(-1);
  if (tables.some((t) => t.length !== final.length)) throw new Error('UXML_SUPPORTS_PROVENANCE_ROWS_DIFFER');
  const later = final.map((r) => r.NodeNumber);
  const same = (x, y) => JSON.stringify([x.support, x.restraints]) === JSON.stringify([y.support, y.restraints]);
  const byStepRow = Object.fromEntries(['parent', 'dtxr', 'atta', 'mds'].map((s, k) => {
    const changed = new Set(final.map((_, i) => i).filter((i) => !same(tables[k][i], tables[k + 1][i])));
    return [s, diagnosticsByRow(diagnosticsByStep[s] || [], s === 'parent' ? parentNumbers : later, final, changed)];
  }));
  const firstStable = (has) => { let k = tables.length - 1; while (k > 0 && has(tables[k - 1])) k -= 1; return PROVENANCE_STEPS[k][0]; };
  const counts = { values: 0, restraints: 0, unexplained: 0, bySrc: {}, byStep: {} };
  const tally = (rec) => {
    counts.bySrc[rec.src] = (counts.bySrc[rec.src] || 0) + 1;
    counts.byStep[rec.step] = (counts.byStep[rec.step] || 0) + 1;
    if (rec.src === 'stage') counts.unexplained += 1;
    return rec;
  };
  const rows = [];
  final.forEach((row, i) => {
    const values = {};
    for (const [tag, text] of Object.entries(row.support)) {
      const step = firstStable((t) => t[i].support[tag] === text);
      values[tag] = tally(record(step, 'value', byStepRow, i));
      counts.values += 1;
    }
    const seen = new Map();
    const restraints = row.restraints.map((fields, j) => {
      const key = JSON.stringify(fields), nth = seen.get(key) || 0;
      seen.set(key, nth + 1);
      const step = firstStable((t) => t[i].restraints.filter((r) => JSON.stringify(r) === key).length > nth);
      counts.restraints += 1;
      let rec = record(step, 'restraint', byStepRow, i);
      // No diagnostic, but the sub-step rewrote a restraint the node already had in the same place (e.g. today's frame
      // rule turns XML Z into CAESAR Y with cosines, writing no diagnostic): the value is the input's, reshaped.
      const before = tables[PROVENANCE_STEPS.findIndex(([s]) => s === step) - 1]?.[i].restraints;
      if (rec.src === 'stage' && before?.length === row.restraints.length && JSON.stringify(before[j]) !== key) {
        rec = { step, src: 'psi116', rule: `${step}/input-restraint-rewritten`, evidence: { from: before[j] } };
        counts.rewritten = (counts.rewritten || 0) + 1;
      }
      return { type: fields.Type ?? fields.RestraintType ?? '', ...tally(rec) };
    });
    if (restraints.length || Object.keys(values).length) {
      rows.push({ row: i, branch: row.branch, NodeNumber: row.NodeNumber, NodeName: row.NodeName, ComponentType: row.ComponentType, values, restraints });
    }
  });
  return { rows, counts };
}
