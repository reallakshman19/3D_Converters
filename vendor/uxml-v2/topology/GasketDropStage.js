/**
 * Step 10's gasket drop as a UXML stage (Owner 19 Nov 2026, end-to-end plan step E1).
 *
 * Today 3D_Converters step 10 removes every <Node> whose ComponentType is GASK from the XML text before the
 * supports and engineering work (dropGasketNodesFromXmlText in enrichment-run-parity.js; Owner 16 Nov: "it is fine,
 * intended anyway"). Here the same rule removes the same nodes from the UXML document, so each removal is recorded
 * in the delta: the removed node with all its values, its branch, the node before it, the stage and the rule.
 *
 *   gasketDropStage: settings {drop} (default true; false = step 10's options turned the drop off) -> remove ops.
 *   step10Document(xmlText, {drop, fileSha256}) -> {source, result, delta, xmlText, removed}: read the source into
 *     UXML, run the stage, and write the XML the next stage starts from.
 */
import {runStage, sha256Hex} from '../UxmlV2Kernel.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';

export const GASKET_DROP_RULE = 'gasket-drop';
const isGasket = comp => String(comp?.values?.ComponentType?.v ?? '').trim().toUpperCase() === 'GASK';

/** Remove ops for every GASK node, in document order. */
function gasketOps(doc) {
  const ops = [];
  for (const p of doc.pipelines || []) {
    for (const comp of p.components || []) {
      if (isGasket(comp)) ops.push({op: 'remove', uid: comp.uid, rule: GASKET_DROP_RULE});
    }
  }
  return ops;
}

export const gasketDropStage = Object.freeze({
  id: 'gasket-drop', rulesVersion: 'gasket-drop/1', reads: ['topology'], writes: ['topology'],
  run: (doc, inputs, {drop = true} = {}) => {
    if (!drop) return {ops: [], diagnostics: []};
    const ops = gasketOps(doc);
    const diagnostics = ops.length ? [{type: 'gasket-node-dropped', stage: 'uxml-gasket-drop', count: ops.length,
      message: 'GASK nodes were removed from the UXML document before the supports and engineering stage.'}] : [];
    return {ops, diagnostics};
  },
});

/** One removal as a plain row: branch name, node number and name, uid (branchNames: pipeline uid -> Branchname). */
const removedRow = (op, branchNames) => ({uid: op.uid, branchName: branchNames.get(op.parent) ?? null,
  NodeNumber: op.before?.values?.NodeNumber?.v ?? null, NodeName: op.before?.values?.NodeName?.v ?? null});

const branchNames = doc => new Map(doc.pipelines.map(p => [p.uid, p.values?.Branchname?.v ?? null]));

/** Step 10's start in UXML: read the source, drop the gaskets, write the XML the supports stage reads. */
export function step10Document(xmlText, {drop = true, fileSha256 = sha256Hex(String(xmlText))} = {}) {
  const source = readPsi116V2(String(xmlText), {fileSha256});
  const step = runStage(gasketDropStage, source, {}, {drop}, {inputHashes: [fileSha256]});
  const written = writePsi116FromUxmlV2(step.uxml);
  const names = branchNames(source);
  return {source, result: step.uxml, delta: step.delta, diagnostics: step.diagnostics, xmlText: written.text,
    removed: step.delta.ops.filter(op => op.op === 'remove').map(op => removedRow(op, names))};
}

/** What step 10's Run record keeps of the document (review page section 4 reads it): revisions and removals. */
export const documentRecord = out => ({schema: out.result.schemaVersion, stage: gasketDropStage.id, rule: GASKET_DROP_RULE,
  sourceRevision: out.source.revision.id, revision: out.result.revision.id, removed: out.removed});
