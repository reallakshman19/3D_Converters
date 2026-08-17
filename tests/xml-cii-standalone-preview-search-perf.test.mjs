import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPreviewSearchRows,
  previewSearchFieldMap,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-preview-search.js';
import {
  resetXmlCiiPerfMetrics,
  snapshotXmlCiiPerfMetrics,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js';

function withParseCounter(fn) {
  const originalParse = JSON.parse;
  let calls = 0;
  JSON.parse = (...args) => {
    calls += 1;
    return originalParse(...args);
  };
  try {
    return fn(() => calls);
  } finally {
    JSON.parse = originalParse;
  }
}

function makeRawRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    SERVICE: `SVC${index % 7}`,
    'Line Number': `L-${String(index + 1).padStart(5, '0')}`,
    DESIGN_PRESSURE: String(1000 + index),
  }));
}

const FIELD_MAP = Object.freeze({
  lineKey1: 'SERVICE',
  lineKey2: 'Line Number',
  lineSeqNo: 'Line Number',
});

test('10,000-row fallback search build parses support config exactly once', () => {
  const previousPerf = globalThis.__XML_CII_PERF__;
  globalThis.__XML_CII_PERF__ = true;
  resetXmlCiiPerfMetrics();
  try {
    const rawRows = makeRawRows(10_000);
    const state = {
      supportConfigJson: JSON.stringify({ linelist: { fieldMap: FIELD_MAP } }),
      masterContext: { rawRows: { lineList: rawRows } },
    };
    const master = { key: 'lineList', rows: [] };

    withParseCounter((parseCalls) => {
      const rows = buildPreviewSearchRows(master, state);
      assert.equal(parseCalls(), 1);
      assert.equal(rows.length, 10_000);
      assert.equal(rows[0].lineKey1, 'SVC0');
      assert.equal(rows[0].lineKey2, 'L-00001');
      assert.equal(rows.at(-1).lineKey2, 'L-10000');
    });

    const metrics = snapshotXmlCiiPerfMetrics();
    assert.equal(metrics.previewSearchBuildCount, 1);
    assert.equal(metrics.previewSearchRowsPrepared, 10_000);
    assert.ok(metrics.previewSearchBuildMs >= 0);
  } finally {
    resetXmlCiiPerfMetrics();
    if (previousPerf === undefined) delete globalThis.__XML_CII_PERF__;
    else globalThis.__XML_CII_PERF__ = previousPerf;
  }
});

test('committed master config eliminates JSON.parse from preview-search mapping lookup', () => {
  const rawRows = makeRawRows(100);
  const state = {
    supportConfigJson: '{"linelist":{"fieldMap":{"lineKey1":"WRONG"}}}',
    masterContext: {
      config: { linelist: { fieldMap: FIELD_MAP } },
      rawRows: { lineList: rawRows },
    },
  };

  withParseCounter((parseCalls) => {
    assert.deepEqual(previewSearchFieldMap('lineList', state), FIELD_MAP);
    const rows = buildPreviewSearchRows({ key: 'lineList', rows: [] }, state);
    assert.equal(parseCalls(), 0);
    assert.equal(rows.length, 100);
    assert.equal(rows[1].lineKey1, 'SVC1');
    assert.equal(rows[1].lineKey2, 'L-00002');
  });
});

test('normalized master rows remain the preferred search authority over raw source rows', () => {
  const normalizedRows = [
    { lineKey1: 'APPLIED', lineKey2: 'N-001', lineSeqNo: 'N-001', marker: 'normalized' },
  ];
  const state = {
    supportConfigJson: '{}',
    masterContext: {
      config: { linelist: { fieldMap: FIELD_MAP } },
      rawRows: { lineList: [{ SERVICE: 'RAW', 'Line Number': 'R-001' }] },
    },
  };

  const rows = buildPreviewSearchRows({ key: 'lineList', rows: normalizedRows }, state);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lineKey1, 'APPLIED');
  assert.equal(rows[0].lineKey2, 'N-001');
  assert.equal(rows[0].marker, 'normalized');
});
