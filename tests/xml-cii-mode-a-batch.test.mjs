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

const repeatedBranchXml = `<PipeStressExport>
<Branch><Branchname>/ASIM-DUP/B1</Branchname><Node><NodeNumber>1</NodeNumber><NodeName>FIRST</NodeName><Position>0 0 0</Position></Node></Branch>
<Branch><Branchname>/ASIM-DUP/B1</Branchname><Node><NodeNumber>1</NodeNumber><NodeName>SECOND</NodeName><Position>100 0 0</Position></Node></Branch>
</PipeStressExport>`;
const repeatedBranchSource = createModeASourceEntry({ fileName: 'REPEATED-BRANCH.xml', sourceText: repeatedBranchXml });
const repeatedBranchPreflight = buildModeAPreflight({ mode: 'separate-models', activeSourceId: repeatedBranchSource.sourceId, sources: [repeatedBranchSource] });
assert.equal(repeatedBranchPreflight.ready, true, 'same Branchname text in separate Branch blocks must be occurrence-scoped, not blocked');
assert.equal(repeatedBranchSource.metrics.duplicateBranchNames.length, 1);
assert.equal(repeatedBranchSource.metrics.duplicateNodesWithinBranch.length, 0, 'same NodeNumber in separate branch occurrences is not an in-branch duplicate');
assert(repeatedBranchPreflight.warnings.some((row) => row.code === 'DUPLICATE_BRANCH_NAME_WITHIN_FILE'));
assert.equal(repeatedBranchSource.metrics.branchOccurrences.length, 2);
assert.equal(repeatedBranchSource.metrics.branchOccurrences[0].displayBranchName, '/ASIM-DUP/B1_1');
assert.equal(repeatedBranchSource.metrics.branchOccurrences[1].displayBranchName, '/ASIM-DUP/B1_2');
assert.notEqual(
  repeatedBranchSource.metrics.branchOccurrences[0].branchOccurrenceId,
  repeatedBranchSource.metrics.branchOccurrences[1].branchOccurrenceId,
);

const secondOccurrence = repeatedBranchSource.metrics.branchOccurrences[1];
repeatedBranchSource.branchSelection.selectionIdentity = 'occurrence';
repeatedBranchSource.branchSelection.selectedBranchOccurrenceIds = [secondOccurrence.branchOccurrenceId];
repeatedBranchSource.branchSelection.selectedBranchNames = [secondOccurrence.branchName];
const repeatedExecution = buildModeAExecutionState({ supportConfigJson: '{}', masterContext: { rowCounts: {} } }, repeatedBranchSource);
assert.equal(repeatedExecution.branchScope.selectedBranchOccurrenceIds.length, 1);
assert(repeatedExecution.sourceText.includes('SECOND'));
assert(!repeatedExecution.sourceText.includes('FIRST'));
assert(repeatedExecution.sourceText.includes('<Branchname>/ASIM-DUP/B1</Branchname>'), 'engineering Branchname must not be rewritten to the display alias');

sourceA.branchSelection.selectedBranchNames = ['/ASIM-SAME/B1'];
sourceA.branchSelection.selectedBranchOccurrenceIds = sourceA.metrics.branchOccurrences.map((row) => row.branchOccurrenceId);
const execution = buildModeAExecutionState({ supportConfigJson: '{}', masterContext: { rowCounts: {} } }, sourceA);
assert(execution.sourceText.includes('/ASIM-SAME/B1'));
assert.equal(execution.sourceBatch, null);
assert.equal(execution.sourceNameOverride, 'SYS-01.xml');

const emptySource = createModeASourceEntry({ fileName: 'SYS-0015.xml', sourceText: '' });
const mixedPreflight = buildModeAPreflight({ mode: 'separate-models', activeSourceId: sourceA.sourceId, sources: [sourceA, emptySource] });
assert(mixedPreflight.blockingRows.some((row) => row.sourceId === emptySource.sourceId && row.code === 'EMPTY_SOURCE'));
assert(!mixedPreflight.blockingRows.some((row) => row.sourceId === sourceA.sourceId));

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
