import assert from 'node:assert/strict';
import {
  activateModeASource,
  buildModeABatchManifest,
  buildModeAExecutionState,
  buildModeAPreflight,
  createModeASourceEntry,
} from '../tabs/xml-cii-2019-standalone/xml-cii-mode-a-batch.js';

function xml(branchName, nodeNumbers) {
  return `<PipeStressExport><Branches><Branch><Branchname>${branchName}</Branchname>${nodeNumbers.map((number) => `<Node><NodeNumber>${number}</NodeNumber><NodeName>N${number}</NodeName><Position>${number} 0 0</Position></Node>`).join('')}</Branch></Branches></PipeStressExport>`;
}

const sourceA = createModeASourceEntry({ fileName: 'SYS-01.xml', sourceText: xml('/ASIM-SAME/B1', [100, 200]), supportConfigJson: '{"source":"A"}' });
const sourceB = createModeASourceEntry({ fileName: 'SYS-02.xml', sourceText: xml('/ASIM-SAME/B1', [100, 300]), supportConfigJson: '{"source":"B"}' });
const batch = { mode: 'separate-models', activeSourceId: sourceA.sourceId, sources: [sourceA, sourceB] };
const preflight = buildModeAPreflight(batch);
assert.equal(preflight.ready, true, 'cross-file duplicates must not block separate-model mode');
assert.equal(preflight.duplicateBranchesAcrossFiles.length, 1);
assert.equal(preflight.duplicateNodesAcrossFiles.length, 1);
assert.equal(preflight.blockingRows.length, 0);

const duplicateNodeSource = createModeASourceEntry({ fileName: 'BAD-NODE.xml', sourceText: xml('/ASIM-BAD/B1', [100, 100]) });
const duplicateNodePreflight = buildModeAPreflight({ mode: 'separate-models', activeSourceId: duplicateNodeSource.sourceId, sources: [duplicateNodeSource] });
assert.equal(duplicateNodePreflight.ready, false);
assert(duplicateNodePreflight.blockingRows.some((row) => row.code === 'DUPLICATE_NODE_WITHIN_BRANCH'));

const duplicateBranchXml = `<PipeStressExport><Branch><Branchname>/ASIM-DUP/B1</Branchname><Node><NodeNumber>1</NodeNumber></Node></Branch><Branch><Branchname>/ASIM-DUP/B1</Branchname><Node><NodeNumber>2</NodeNumber></Node></Branch></PipeStressExport>`;
const duplicateBranchSource = createModeASourceEntry({ fileName: 'BAD-BRANCH.xml', sourceText: duplicateBranchXml });
const duplicateBranchPreflight = buildModeAPreflight({ mode: 'separate-models', activeSourceId: duplicateBranchSource.sourceId, sources: [duplicateBranchSource] });
assert(duplicateBranchPreflight.blockingRows.some((row) => row.code === 'DUPLICATE_BRANCH_WITHIN_FILE'));

sourceA.branchSelection.selectedBranchNames = ['/ASIM-SAME/B1'];
const execution = buildModeAExecutionState({ supportConfigJson: '{}', masterContext: { rowCounts: {} } }, sourceA);
assert(execution.sourceText.includes('/ASIM-SAME/B1'));
assert.equal(execution.sourceBatch, null);
assert.equal(execution.sourceNameOverride, 'SYS-01.xml');

const state = {
  sourceBatch: batch,
  sourceFile: sourceA.sourceFile,
  sourceText: sourceA.sourceText,
  stagedJsonText: '',
  branchSelection: sourceA.branchSelection,
  supportConfigJson: sourceA.supportConfigJson,
  result: { ok: true, ciiName: 'SYS-01.cii' },
};
const activated = activateModeASource(state, sourceB.sourceId);
assert.equal(activated.sourceText, sourceB.sourceText);
assert.equal(activated.supportConfigJson, sourceB.supportConfigJson);
assert.equal(activated.sourceBatch.sources[0].workflow.result.ciiName, 'SYS-01.cii');

const manifest = buildModeABatchManifest(batch, [
  { sourceId: sourceA.sourceId, sourceDigest: sourceA.sourceDigest, fileName: sourceA.fileName, alias: sourceA.alias, status: 'SUCCEEDED', selectedBranchCount: 1, result: { ok: true, enrichedName: 'A.xml', ciiName: 'A.cii' } },
  { sourceId: sourceB.sourceId, sourceDigest: sourceB.sourceDigest, fileName: sourceB.fileName, alias: sourceB.alias, status: 'SUCCEEDED', selectedBranchCount: 1, result: { ok: true, enrichedName: 'B.xml', ciiName: 'B.cii' } },
]);
assert.equal(manifest.mode, 'separate-models');
assert.equal(manifest.sources.length, 2);
assert.equal(manifest.sources[0].ciiName, 'A.cii');

console.log('xml-cii Mode A batch tests: PASS');
