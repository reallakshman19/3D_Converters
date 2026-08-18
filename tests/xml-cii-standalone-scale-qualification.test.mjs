import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  XML_CII_VIRTUAL_WINDOW_ROWS,
  buildMatchingRowIndexes,
  rowForLogicalIndex,
  virtualRowWindow,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-virtual-rows.js';
import {
  buildIncrementalPreview,
  resetIncrementalPreviewRuntime,
  snapshotIncrementalPreviewRuntime,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-incremental.js';

const SCALES = [10_000, 50_000, 100_000];

for (const scale of SCALES) {
  test(`${scale.toLocaleString()} rows keep virtual DOM bounded and every search match addressable`, (t) => {
    const rows = Array.from({ length: scale }, (_, index) => ({ id: index, text: index % 97 === 0 ? `MATCH-${index}` : `ROW-${index}` }));
    const started = performance.now();
    const indexes = buildMatchingRowIndexes(rows, 'match', (row) => row.text.toLowerCase());
    const searchMs = performance.now() - started;
    const top = virtualRowWindow(indexes.length, 0);
    const middle = virtualRowWindow(indexes.length, Math.floor(indexes.length / 2) * 32);
    const end = virtualRowWindow(indexes.length, indexes.length * 32);
    for (const window of [top, middle, end]) assert.ok(window.domRowCount <= XML_CII_VIRTUAL_WINDOW_ROWS);
    const expectedMatches = Math.floor((scale - 1) / 97) + 1;
    assert.equal(indexes.length, expectedMatches);
    assert.equal(indexes[0], 0);
    assert.equal(indexes.at(-1), Math.floor((scale - 1) / 97) * 97);
    const final = rowForLogicalIndex(rows, indexes, indexes.length - 1);
    assert.equal(final.sourceIndex, indexes.at(-1));
    assert.equal(final.row, rows[indexes.at(-1)]);
    t.diagnostic(`search-index ${scale} rows: ${searchMs.toFixed(3)} ms; matches=${indexes.length}; DOM<=${XML_CII_VIRTUAL_WINDOW_ROWS}`);
  });

  test(`${scale.toLocaleString()} Preview rows preserve Weight-only reuse/recompute accounting`, (t) => {
    resetIncrementalPreviewRuntime();
    const branchRows = Array.from({ length: scale }, (_, id) => ({ id, branchName: `B${id}` }));
    const nodeRows = Array.from({ length: scale }, (_, id) => ({ id, weight: 1 }));
    let fullBuildCalls = 0;
    const fullBuild = () => { fullBuildCalls += 1; return { branchRows, nodeRows }; };
    const first = buildIncrementalPreview({ xmlText: '<R/>', stagedJsonText: '{}', config: { weight: { revision: 1 }, stable: true }, fullBuild, rerankWeight: (rows) => rows });
    const started = performance.now();
    const second = buildIncrementalPreview({
      xmlText: '<R/>', stagedJsonText: '{}', config: { weight: { revision: 2 }, stable: true }, fullBuild,
      rerankWeight: (rows) => rows.map((row) => ({ ...row, weight: 2 })),
    });
    const partialMs = performance.now() - started;
    const stats = snapshotIncrementalPreviewRuntime();
    assert.equal(first.mode, 'full');
    assert.equal(second.mode, 'weight-only');
    assert.equal(fullBuildCalls, 1);
    assert.equal(second.result.branchRows, branchRows);
    assert.equal(stats.fullBuilds, 1);
    assert.equal(stats.weightOnlyBuilds, 1);
    assert.equal(stats.branchRowsReused, scale);
    assert.equal(stats.nodeRowsRecomputed, scale);
    assert.equal(second.result.nodeRows.length, scale);
    t.diagnostic(`weight-only ${scale} branch + ${scale} node rows: ${partialMs.toFixed(3)} ms; fullBuildCalls=${fullBuildCalls}`);
  });
}
