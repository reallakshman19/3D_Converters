// Where each engineering value came from (UXML step 4, Owner 16 Nov "close step 4"; plan: values carry {src, rule}).
// For every process / class / material / wall / weight value that the supports stage's final XML holds and its input did
// not, the record names:
//   step  = the snapshot from which the value stays unchanged to the end (ENGINEERING_STEPS, in the stage's order);
//   src   = popup (a weight saved by today's Run popup), override, lineList, pipingClass, branchName, materialMap, staged
//           (DTXR evidence), auto (rating from class / regex), default, psi116 (taken from the model: OD, source wall,
//           transferred value), split (a node the branch pass created by a valve / flange split), or stage (no evidence found: counted as unexplained);
//   label = today's own source label for that field on the branch row it agrees with (process rows first, then preview
//           rows), or the rule that wrote it.
// Reads only snapshots and rows the stage already makes; changes nothing.
import { childText, childrenByName, elementKids, elementsByName, parsePlainXml, textContent } from '../supports/PlainDom.js';

export const ENGINEERING_STEPS = Object.freeze(['branchPass', 'parentLoop', 'preview', 'parentFinish', 'dtxr', 'process', 'boreFromOd',
  'sourceWall', 'transferKept', 'atta', 'mds']);
export const ENGINEERING_NODE_FIELDS = Object.freeze(['PipingClass', 'Rating', 'MaterialName', 'MaterialCode', 'WallThickness',
  'CorrosionAllowance', 'InsulationThickness', 'Weight', 'BoreMm', 'SIF']);
export const ENGINEERING_BRANCH_FIELDS = Object.freeze(['Pressure1', 'HydroPressure', 'Temperature1', 'Temperature2', 'Temperature3',
  'FluidDensity', 'MaterialNumber', 'InsulationThickness', 'PipelineReference', 'LineNo']);
// Branch row field and its source label, per XML tag.
const ROW = {
  Pressure1: ['p1', 'p1Source'], HydroPressure: ['hydroPressure', 'hydroPressureSource'], Temperature1: ['t1', 't1Source'],
  Temperature2: ['t2', 't2Source'], Temperature3: ['t3', 't3Source'], FluidDensity: ['density', 'densitySource'],
  InsulationThickness: ['insThk', 'insThkSource'], PipingClass: ['pipingClass', 'pipingClassSource'], Rating: ['rating', 'ratingSource'],
  MaterialName: ['material', 'materialSource'], MaterialCode: ['materialCode', 'materialSource'], MaterialNumber: ['materialCode', 'materialSource'],
  WallThickness: ['wallThickness', 'wallThicknessSource'], CorrosionAllowance: ['corrosion', null],
};

const num = (v) => { const n = Number(String(v ?? '').trim()); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null; };
const same = (a, b) => { const x = num(a), y = num(b); return x !== null && y !== null ? Math.abs(x - y) < 1e-9 : String(a ?? '').trim() === String(b ?? '').trim(); };

/** Today's source label -> src family. */
export function srcOfLabel(label) {
  const l = String(label || '').toLowerCase();
  if (!l || l === 'none' || /default|zero/.test(l)) return 'default';
  if (/override|manual/.test(l)) return 'override';
  if (/dtxr|staged/.test(l)) return 'staged';
  if (/line-?list/.test(l)) return 'lineList';
  if (/branch-name/.test(l)) return 'branchName';
  if (/material-map/.test(l)) return 'materialMap';
  if (/piping-class|class-master|class/.test(l)) return 'pipingClass';
  if (l === 'auto') return 'auto';
  return l;
}

const leavesOf = (el) => elementKids(el).filter((k) => !elementKids(k).length);
function branchFields(branch) {
  const out = {};
  for (const leaf of [...leavesOf(branch), ...['Pressure', 'Temperature'].flatMap((n) => childrenByName(branch, n).flatMap(leavesOf))]) {
    if (ENGINEERING_BRANCH_FIELDS.includes(leaf.__el) && out[leaf.__el] === undefined) out[leaf.__el] = textContent(leaf).trim();
  }
  return out;
}
const nodeFields = (node) => Object.fromEntries(ENGINEERING_NODE_FIELDS.map((t) => [t, childText(node, t)]).filter(([t]) => childrenByName(node, t).length));

/** Engineering fields of an XML: {branches: [{branch, fields}], nodes: [{branch, nodeIndex, NodeNumber, position, fields}]}. */
export function engineeringTable(xml) {
  const root = typeof xml === 'string' ? parsePlainXml(xml).root : xml;
  const branches = [], nodes = [];
  for (const b of elementsByName(root, 'Branch')) {
    const branch = childText(b, 'Branchname');
    branches.push({ branch, fields: branchFields(b) });
    childrenByName(b, 'Node').forEach((n, nodeIndex) => nodes.push({ branch, nodeIndex, NodeNumber: childText(n, 'NodeNumber'),
      NodeName: childText(n, 'NodeName'), ComponentType: childText(n, 'ComponentType'), position: childText(n, 'Position'), fields: nodeFields(n) }));
  }
  return { branches, nodes };
}

function rowsByBranch(rows) { const m = new Map(); for (const r of rows || []) if (!m.has(String(r.branchName))) m.set(String(r.branchName), r); return m; }

/** Evidence for a value written at `step`: today's label on the branch row it agrees with, else the writing rule. */
function evidence(step, tag, value, ctx, where) {
  if (where.created && step === 'branchPass') return { src: 'split', label: 'node-created-by-split' };
  if (step === 'boreFromOd' || (tag === 'BoreMm' && step === 'branchPass')) return { src: 'psi116', label: 'node-outside-diameter' };
  if (step === 'sourceWall') return { src: 'psi116', label: 'source-wall-kept' };
  if (step === 'transferKept') return { src: 'psi116', label: 'transfer-protected' };
  if (tag === 'SIF') return { src: 'default', label: `${step}/sif-zero` };
  if (tag === 'Weight') {
    if (ctx.manualRows.has(where.row)) return { src: 'popup', label: 'rigid-weight-manual-override' };
    const key = ctx.weightKeyOf(where);
    if (key && num(ctx.config?.overrides?.rigidWeight?.[key]) > 0) return { src: 'popup', label: 'rigid-weight-review', key };
    return { src: 'weightTable', label: 'weight-match' };
  }
  if (tag === 'PipelineReference' || tag === 'LineNo') return { src: 'branchName', label: 'line-key-from-branch-name' };
  if (tag === 'WallThickness' && step === 'process') {
    const bySize = ctx.wallBySize.get(`${where.branch}|${where.NodeNumber}`);
    if (bySize && same(bySize.value, value)) return { src: srcOfLabel(bySize.source), label: bySize.source, key: bySize.key };
  }
  const [field, labelKey] = ROW[tag] || [];
  for (const [rowsName, rows] of [['process', ctx.processRows], ['preview', ctx.previewRows]]) {
    const row = field && rows.get(String(where.branch));
    if (!row || !same(row[field], value)) continue;
    if (tag === 'CorrosionAllowance') {
      const overridden = num(ctx.config?.overrides?.corrosion?.[row.corrosionKey]) !== null;
      return { src: overridden ? 'override' : 'pipingClass', label: overridden ? 'corrosion-override' : 'piping-class-corrosion', key: row.corrosionKey, row: rowsName };
    }
    const label = row[labelKey];
    if (label) return { src: srcOfLabel(label), label, row: rowsName };
  }
  // Only the branch pass's own resolver explains it: its branch-derived entry names the class and rating it chose.
  const d = step === 'branchPass' && (tag === 'Rating' || tag === 'PipingClass') && ctx.derived.get(String(where.branch));
  if (d && same(tag === 'Rating' ? d.rating : d.pipingClass, value)) {
    return ctx.classMatched.has(String(where.branch)) ? { src: 'pipingClass', label: 'branch-derived/class-master-match' } : { src: 'auto', label: 'branch-derived' };
  }
  return { src: 'stage', label: `${step}/unexplained` };
}

/**
 * @param {{inputXml: string, snapshots: Record<string,string>, previewRows?: object[], processRows?: object[],
 *          processNodeRows?: object[], wallBySize?: object[], diagnostics?: object[], config?: object}} input
 *   diagnostics: the stage's; the branch pass's rigid-weight-manual-override (weights saved by today's Run popup),
 *   branch-derived and class-master-match entries are the evidence for values only the branch pass explains.
 *   snapshots: XML after each step in ENGINEERING_STEPS (same nodes from branchPass on).
 * @returns {{rows: object[], counts: object}} rows: one per changed value {scope, branch, NodeNumber?, field, value, step, src, label}.
 */
export function engineeringProvenance({ inputXml, snapshots, previewRows = [], processRows = [], processNodeRows = [], wallBySize = [], diagnostics = [], config = {} }) {
  const tables = ENGINEERING_STEPS.map((s) => engineeringTable(snapshots[s]));
  const final = tables.at(-1);
  if (tables.some((t) => t.nodes.length !== final.nodes.length)) throw new Error('UXML_ENGINEERING_PROVENANCE_ROWS_DIFFER');
  const input = engineeringTable(inputXml);
  // Input node of a final node: same branch, position and component type (numbers change in the split renumbering), then
  // same branch and position. None: the branch pass created it (valve / flange split).
  const inputNode = new Map(), inputBranch = new Map(input.branches.map((b) => [b.branch, b]));
  for (const n of input.nodes) for (const k of [`${n.branch}|${n.position}|${n.ComponentType}`, `${n.branch}|${n.position}`]) if (!inputNode.has(k)) inputNode.set(k, n);
  // Weights the branch pass took from the Run popup: its diagnostics name the node as the branch pass numbered it.
  const manualRows = new Set();
  for (const d of diagnostics.filter((x) => x.type === 'rigid-weight-manual-override')) {
    const at = tables[0].nodes.findIndex((n, i) => !manualRows.has(i) && n.branch === d.branchName && n.NodeNumber === String(d.nodeNumber)
      && same(n.fields.Weight, d.weight));
    if (at >= 0) manualRows.add(at);
  }
  const nodeKeys = new Map(processNodeRows.map((r) => [`${r.branchName}|${r.nodeNumber}`, r.key]));
  const derived = new Map(diagnostics.filter((d) => d.type === 'branch-derived').map((d) => [String(d.branchName), d]));
  const classMatched = new Set(diagnostics.filter((d) => d.type === 'class-master-match').map((d) => String(d.branchName)));
  const ctx = { config, manualRows, derived, classMatched, previewRows: rowsByBranch(previewRows), processRows: rowsByBranch(processRows),
    wallBySize: new Map(wallBySize.map((w) => [`${w.branchName}|${w.nodeNumber}`, w])),
    weightKeyOf: (where) => nodeKeys.get(`${where.branch}|${where.NodeNumber}`) || `${where.branch}|${where.NodeNumber}` };
  const counts = { values: 0, unchanged: 0, unexplained: 0, bySrc: {}, byStep: {}, byField: {} };
  const rows = [];
  const record = (scope, where, tag, value, valueAt, before) => {
    if (before !== undefined && same(before, value)) { counts.unchanged += 1; return; }
    let k = tables.length - 1;
    while (k > 0 && same(valueAt(tables[k - 1]), value)) k -= 1;
    const step = ENGINEERING_STEPS[k];
    const e = evidence(step, tag, value, ctx, where);
    rows.push({ scope, branch: where.branch, ...(scope === 'node' ? { row: where.row, NodeNumber: where.NodeNumber, NodeName: where.NodeName,
      ComponentType: where.ComponentType } : {}), field: tag, value, step, ...e });
    counts.values += 1;
    counts.bySrc[e.src] = (counts.bySrc[e.src] || 0) + 1;
    counts.byStep[step] = (counts.byStep[step] || 0) + 1;
    counts.byField[tag] = (counts.byField[tag] || 0) + 1;
    if (e.src === 'stage') counts.unexplained += 1;
  };
  final.branches.forEach((b, i) => {
    for (const [tag, value] of Object.entries(b.fields)) record('branch', { branch: b.branch }, tag, value, (t) => t.branches[i]?.fields[tag], inputBranch.get(b.branch)?.fields[tag]);
  });
  final.nodes.forEach((n, i) => {
    const before = inputNode.get(`${n.branch}|${n.position}|${n.ComponentType}`) || inputNode.get(`${n.branch}|${n.position}`);
    for (const [tag, value] of Object.entries(n.fields)) {
      record('node', { ...n, row: i, created: !before }, tag, value, (t) => t.nodes[i].fields[tag], before ? (before.fields[tag] ?? null) : undefined);
    }
  });
  return { rows, counts };
}
