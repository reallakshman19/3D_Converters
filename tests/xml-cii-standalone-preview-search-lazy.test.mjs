import assert from 'node:assert/strict';
import test from 'node:test';

import { createLazyPreviewSearchRows } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js';
import {
  resetXmlCiiPerfMetrics,
  snapshotXmlCiiPerfMetrics,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js';

function fixture(count = 10_000) {
  const rows = Array.from({ length: count }, (_, index) => ({
    lineKey1: `SVC${index % 5}`,
    lineKey2: `L-${index + 1}`,
    lineSeqNo: `L-${index + 1}`,
  }));
  return {
    master: { key: 'lineList', rows },
    state: {
      supportConfigJson: '{}',
      masterContext: {
        config: { linelist: { fieldMap: {} } },
        rawRows: { lineList: [] },
      },
    },
  };
}

test('creating lazy Preview search custody performs zero full-search builds', () => {
  const previousPerf = globalThis.__XML_CII_PERF__;
  globalThis.__XML_CII_PERF__ = true;
  resetXmlCiiPerfMetrics();
  try {
    const { master, state } = fixture();
    const lazy = createLazyPreviewSearchRows(master, state);

    assert.equal(lazy.isPrepared(), false);
    assert.equal(snapshotXmlCiiPerfMetrics().previewSearchBuildCount, 0);
    assert.equal(snapshotXmlCiiPerfMetrics().previewSearchRowsPrepared, 0);
  } finally {
    resetXmlCiiPerfMetrics();
    if (previousPerf === undefined) delete globalThis.__XML_CII_PERF__;
    else globalThis.__XML_CII_PERF__ = previousPerf;
  }
});

test('first search builds once and repeated searches reuse the same row corpus', () => {
  const previousPerf = globalThis.__XML_CII_PERF__;
  globalThis.__XML_CII_PERF__ = true;
  resetXmlCiiPerfMetrics();
  try {
    const { master, state } = fixture();
    const lazy = createLazyPreviewSearchRows(master, state);

    const first = lazy.rows();
    const second = lazy.rows();
    const third = lazy.rows();

    assert.equal(lazy.isPrepared(), true);
    assert.equal(first, second);
    assert.equal(second, third);
    assert.equal(first.length, 10_000);
    const metrics = snapshotXmlCiiPerfMetrics();
    assert.equal(metrics.previewSearchBuildCount, 1);
    assert.equal(metrics.previewSearchRowsPrepared, 10_000);
  } finally {
    resetXmlCiiPerfMetrics();
    if (previousPerf === undefined) delete globalThis.__XML_CII_PERF__;
    else globalThis.__XML_CII_PERF__ = previousPerf;
  }
});

test('lazy search does not replace the bounded authoritative default Preview rows', () => {
  const { master, state } = fixture(1_000);
  const previewRows = master.rows.slice(0, 150);
  const lazy = createLazyPreviewSearchRows(master, state);

  assert.equal(previewRows.length, 150);
  assert.equal(lazy.isPrepared(), false);
  assert.equal(previewRows[0].lineKey2, 'L-1');
  assert.equal(previewRows.at(-1).lineKey2, 'L-150');

  const searchRows = lazy.rows();
  assert.equal(searchRows.length, 1_000);
  assert.equal(previewRows.length, 150);
  assert.equal(previewRows.at(-1).lineKey2, 'L-150');
});
