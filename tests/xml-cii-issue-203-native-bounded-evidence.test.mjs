import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  buildRegexBoundedEvidencePlan,
  resolveRegexBoundedDatasetEvidence,
} from '../tabs/xml-cii-2019-standalone/xml-cii-regex-bounded-evidence.js';

const authority = Object.freeze({
  datasetId: 'real:pc:revision7',
  datasetRevision: 7,
  masterKey: 'pipingClass',
  rowCount: 10000,
});

test('P08 source branch query plan retains real indexed class token without full-row materialization', () => {
  const plan = buildRegexBoundedEvidencePlan({
    branchSamples: [{ branchName: '/LINE12345-CL1234M1' }],
    queryLimit: 8,
  });
  assert.equal(plan.schema, 'regex-bounded-evidence-plan/v1');
  assert.ok(plan.pipingClassQueries.includes('CL1234M1'));
  assert.ok(plan.pipingClassQueries.length <= 8);
  assert.ok(plan.lineListQueries.length <= 8);
  assert.equal(plan.queryOverflow.pipingClass, false);
});

test('P08 positive indexed evidence deduplicates invalid indices and preserves exact dataset ref', async () => {
  const calls = [];
  const result = await resolveRegexBoundedDatasetEvidence({
    masterKey: 'pipingClass',
    datasetRef: authority,
    queries: ['CL1234M1', 'CL1234M1'],
    maxIndexesPerQuery: 8,
    maxTotalIndexes: 8,
    async search(key, id, query) {
      calls.push({ type: 'search', key, id, query });
      return { indexes: [-1, 1, 1, Number.NaN, 2.5, 3] };
    },
    async getRowsByIndexes(key, id, indexes, ref) {
      calls.push({ type: 'indexes', key, id, indexes, ref });
      return { rows: [{ Class: 'CL1234M1' }, { Class: 'CL1234M1' }] };
    },
  });
  assert.equal(result.rowIndexCount, 2);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].Class, 'CL1234M1');
  assert.deepEqual(calls.map((call) => call.type), ['search', 'indexes']);
  assert.equal(calls[0].query, 'CL1234M1');
  assert.deepEqual(calls[1].indexes, [1, 3]);
  assert.deepEqual(calls[1].ref, authority);
  assert.equal(result.totalIndexOverflow, false);
  assert.equal(result.matchedQueryCount, 1);
});

test('P08 global cap stops search before unbounded native indexed reads', async () => {
  const queries = [];
  const fetched = [];
  const result = await resolveRegexBoundedDatasetEvidence({
    masterKey: 'pipingClass',
    datasetRef: authority,
    queries: ['CL1234', 'CL5678', 'CL9999'],
    maxIndexesPerQuery: 2,
    maxTotalIndexes: 3,
    async search(_key, _id, query) {
      queries.push(query);
      return { indexes: query === 'CL1234' ? [0, 1] : query === 'CL5678' ? [2, 3] : [4, 5] };
    },
    async getRowsByIndexes(_key, _id, indexes) {
      fetched.push(indexes);
      return { rows: indexes.map((index) => ({ index })) };
    },
  });
  assert.equal(result.totalIndexOverflow, true);
  assert.equal(result.rowIndexCount, 3);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(queries, ['CL1234', 'CL5678']);
  assert.deepEqual(fetched, [[0, 1, 2]]);
});

test('P08 zero-queries means zero Worker calls and no retained rows', async () => {
  let calls = 0;
  const result = await resolveRegexBoundedDatasetEvidence({
    masterKey: 'pipingClass',
    datasetRef: authority,
    queries: [],
    async search() { calls += 1; throw Error('MUST_NOT_SEARCH_EMPTY'); },
    async getRowsByIndexes() { calls += 1; throw Error('MUST_NOT_GET_ROWS_EMPTY'); },
  });
  assert.equal(calls, 0);
  assert.equal(result.rowIndexCount, 0);
  assert.deepEqual(result.rows, []);
});

test('P08 missing IndexedDB search or indexed-reader provider fails closed', async () => {
  await assert.rejects(
    () => resolveRegexBoundedDatasetEvidence({
      masterKey: 'pipingClass', datasetRef: authority, queries: ['CL1234'],
      async search() { return { indexes: [0] }; },
    }),
    /requires search and indexed-row providers/,
  );
  await assert.rejects(
    () => resolveRegexBoundedDatasetEvidence({
      masterKey: 'pipingClass', datasetRef: authority, queries: ['CL1234'],
      async getRowsByIndexes() { return { rows: [] }; },
    }),
    /requires search and indexed-row providers/,
  );
});

test('P08 failed indexed read propagates without a fabricated positive result', async () => {
  let readAttempts = 0;
  await assert.rejects(
    () => resolveRegexBoundedDatasetEvidence({
      masterKey: 'pipingClass',
      datasetRef: authority,
      queries: ['CL1234'],
      async search() { return { indexes: [0] }; },
      async getRowsByIndexes() {
        readAttempts += 1;
        throw Error('IndexedDB-read-failed-for-CL1234');
      },
    }),
    /IndexedDB-read-failed-for-CL1234/,
  );
  assert.equal(readAttempts, 1);
});

test('P08 bounded evidence module source/docs mirror is byte-identical', async () => {
  const path = 'tabs/xml-cii-2019-standalone/xml-cii-regex-bounded-evidence.js';
  const [source, docs] = await Promise.all([
    fs.readFile(new URL('../' + path, import.meta.url), 'utf8'),
    fs.readFile(new URL('../docs/' + path, import.meta.url), 'utf8'),
  ]);
  assert.equal(source, docs);
});
