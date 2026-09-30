import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLineListRow } from '../converters/xml-cii2019-core/linelist-mapping.js';
import { rankXmlCiiWeightIssues } from '../converters/xml-cii2019-core/weight-match-ranking-service.js';
import { createMasterDatasetService } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-service.js';
import { createMasterDatasetClient } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-client.js';
import { MASTER_DATASET_COMMAND, MASTER_DATASET_EVENT } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js';

test('APPLIED line-list mapping projects Key1/Key2/Line Seq into normalized worker rows', () => {
  const raw = { __EMPTY_0: '7', __EMPTY_1: '1', __EMPTY_2: '0310051', __EMPTY_21: '61440', __EMPTY_26: 'CS' };
  const map = { lineSeqNo: '__EMPTY_0', lineKey1: '__EMPTY_1', lineKey2: '__EMPTY_2', pipingClass: '__EMPTY_21', material: '__EMPTY_26' };
  const row = normalizeLineListRow(raw, map, 0);
  assert.equal(row.lineSeqNo, '7');
  assert.equal(row.lineKey1, '1');
  assert.equal(row.lineKey2, '0310051');
  assert.equal(row.pipingClass, '61440');
  assert.equal(row.material, 'CS');
  assert.ok(row.lineKey);
});

function fakeStore() {
  const data = new Map();
  return {
    async persistDataset(metadata, rows) { data.set(metadata.datasetId, { metadata, rows }); },
    async getMetadata(id) { return data.get(id)?.metadata || null; },
    async getRows(id) { return data.get(id)?.rows || []; },
    async removeDataset(id) { data.delete(id); },
  };
}

function service(store = fakeStore()) {
  return createMasterDatasetService({
    store,
    getXlsx: async () => { throw new Error('xlsx not expected'); },
    prepareDataset: (masterKey, rawRows, _config, currentMap, override) => ({
      rows: rawRows.map((row, index) => ({ ...row, _rowIndex: index + 1 })),
      fieldMap: override || currentMap || {},
      searchCorpus: rawRows.map((row) => Object.values(row).join(' ').toLowerCase()),
    }),
    buildSearchCorpus: (rows) => rows.map((row) => Object.values(row).join(' ').toLowerCase()),
    searchCorpusIndexes: (corpus, query) => corpus.map((value, index) => value.includes(query) ? index : -1).filter((index) => index >= 0),
  });
}

const masterRows = [
  { convertedBore: 254, ratingClass: '150', lengthMm: 300, valveWeight: 50, type: 'VALVE', typeDesc: 'GATE VALVE' },
  { convertedBore: 254, ratingClass: '150', lengthMm: 340, valveWeight: 58, type: 'VALVE', typeDesc: 'GATE VALVE' },
  { convertedBore: 254, ratingClass: '300', lengthMm: 300, valveWeight: 70, type: 'VALVE', typeDesc: 'GATE VALVE' },
];
const issue = { key: 'B1:N1', branchName: 'B1', nodeNumber: 'N1', componentType: 'VALVE', componentRefNo: 'VGT-1', nodeName: 'VGT-1', boreMm: 254, lengthMm: 300, rating: '150', dtxr: 'GATE VALVE' };

test('worker-resident Weight Match ranking equals shared pure ranking', async () => {
  const svc = service();
  const buffer = new TextEncoder().encode(JSON.stringify(masterRows)).buffer;
  const ready = await svc.handle({ type: MASTER_DATASET_COMMAND.OPEN_SOURCE, requestId: 'open-1', jobId: 'job-1', fileName: 'weights.json', masterKey: 'weight', config: {}, currentMap: {}, buffer });
  assert.equal(ready.type, MASTER_DATASET_EVENT.DATASET_READY);
  const datasetId = ready.metadata.datasetId;
  const config = { weight: { masterFingerprint: ready.metadata.masterFingerprint, masterRevision: 1 } };
  const expected = rankXmlCiiWeightIssues([issue], { ...config, weight: { ...config.weight, masterRows } }, { ratingMode: 'preview', snapshot: {} });
  const actual = await svc.handle({ type: MASTER_DATASET_COMMAND.RANK_WEIGHT_ISSUES, requestId: 'rank-1', datasetId, issues: [issue], config, ratingMode: 'preview', previewRatingSnapshot: {} });
  assert.equal(actual.type, MASTER_DATASET_EVENT.WEIGHT_MATCH_RESULT);
  assert.equal(actual.datasetId, datasetId);
  assert.equal(actual.issues.length, 1);
  assert.deepEqual(actual.issues[0].candidates, expected[0].candidates);
  assert.equal(actual.issues[0].rating, expected[0].rating);
});

test('fresh worker service recovers a persisted Weight dataset by datasetId', async () => {
  const store = fakeStore();
  const opener = service(store);
  const buffer = new TextEncoder().encode(JSON.stringify(masterRows)).buffer;
  const ready = await opener.handle({ type: MASTER_DATASET_COMMAND.OPEN_SOURCE, requestId: 'open-persisted', jobId: 'job-persisted', fileName: 'weights.json', masterKey: 'weight', config: {}, currentMap: {}, buffer });
  const recovered = service(store);
  const result = await recovered.handle({
    type: MASTER_DATASET_COMMAND.RANK_WEIGHT_ISSUES,
    requestId: 'rank-persisted',
    datasetId: ready.metadata.datasetId,
    issues: [issue],
    config: { weight: { masterFingerprint: ready.metadata.masterFingerprint, masterRevision: 1 } },
    ratingMode: 'preview',
    previewRatingSnapshot: {},
  });
  assert.equal(result.type, MASTER_DATASET_EVENT.WEIGHT_MATCH_RESULT);
  assert.equal(result.datasetId, ready.metadata.datasetId);
  assert.equal(result.issues.length, 1);
});

test('Weight Match worker rejects a non-weight dataset', async () => {
  const svc = service();
  const buffer = new TextEncoder().encode(JSON.stringify([{ x: 1 }])).buffer;
  const ready = await svc.handle({ type: MASTER_DATASET_COMMAND.OPEN_SOURCE, requestId: 'open-line', jobId: 'job-line', fileName: 'lines.json', masterKey: 'lineList', config: {}, currentMap: {}, buffer });
  await assert.rejects(
      () => svc.handle({ type: MASTER_DATASET_COMMAND.RANK_WEIGHT_ISSUES, requestId: 'rank-line', datasetId: ready.metadata.datasetId, issues: [issue], config: {} }),
      /requires a weight dataset/i,
    );
});

class FakeWorker {
  constructor(mode = 'reply') {
    this.mode = mode;
    this.listeners = new Map();
    this.terminated = false;
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  terminate() { this.terminated = true; }
  postMessage(message) {
    if (this.mode === 'drop') return;
    if (this.mode === 'messageerror') {
      queueMicrotask(() => this.listeners.get('messageerror')?.({}));
      return;
    }
    queueMicrotask(() => this.listeners.get('message')?.({ data: {
      type: MASTER_DATASET_EVENT.WEIGHT_MATCH_RESULT,
      requestId: message.requestId,
      datasetId: message.datasetId,
      issues: message.issues,
    } }));
  }
}

async function exerciseWorkerRecovery(firstMode) {
  const workers = [];
  const client = createMasterDatasetClient({
    weightRequestTimeoutMs: 20,
    workerFactory: () => {
      const worker = new FakeWorker(workers.length ? 'reply' : firstMode);
      workers.push(worker);
      return worker;
    },
  });
  const result = await client.rankWeightIssues('dataset-1', [issue], {}, { ratingMode: 'preview' });
  client.dispose();
  return { result, workers };
}

test('Weight Match retries once on a fresh worker when a ranking reply is lost', async () => {
  const { result, workers } = await exerciseWorkerRecovery('drop');
  assert.equal(workers.length, 2);
  assert.equal(workers[0].terminated, true);
  assert.equal(result.datasetId, 'dataset-1');
  assert.deepEqual(result.issues, [issue]);
});

test('Weight Match retries once after worker message transport failure', async () => {
  const { result, workers } = await exerciseWorkerRecovery('messageerror');
  assert.equal(workers.length, 2);
  assert.equal(workers[0].terminated, true);
  assert.equal(result.datasetId, 'dataset-1');
});

test('mapping drafts explicitly remind the user to Apply mapping', async () => {
  const source = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js', import.meta.url), 'utf8');
  assert.match(source, /Mapping changed — click Apply mapping to use this selection in Preview/);
  assert.match(source, /refreshMappingCustodyDom\(container, stateRef, select\.dataset\.masterKey\)/);
});

test('Weight Match reports bounded stages instead of an indefinite generic computing state', async () => {
  const renderer = await readFile(new URL('../tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js', import.meta.url), 'utf8');
  assert.match(renderer, /Reading Weight Match inputs/);
  assert.match(renderer, /Preparing Weight Match geometry/);
  assert.match(renderer, /Ranking \$\{issueRows\.length\} component\(s\)/);
  assert.match(renderer, /withWeightStageTimeout/);
});

test('standalone module cache chain advances to Weight liveness revision', async () => {
  const token = '20260930-issue781-weight-liveness-1';
  const checks = [
    ['index.html', 'main-rhbg-fitguard.js'],
    ['main-rhbg-fitguard.js', 'core/app.js'],
    ['core/app.js', 'app-standalone-runtime.js'],
    ['core/app-standalone-runtime.js', 'xml-cii-2019-standalone-tab.js'],
    ['tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js', 'master-dataset-client.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js', 'master-dataset-import-coordinator.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js', 'xml-cii-adapted-master-dataset-runtime.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js', 'weight-match-renderer.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js', 'xml-cii-adapted-weight-match-v2.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js', 'xml-cii-adapted-master-mapping-events.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js', 'xml-cii-adapted-master-events.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js', 'xml-cii-adapted-events.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js', 'xml-cii-adapted-events-smart.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js', 'xml-cii-adapted-events-mode-a.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js', 'xml-cii-adapted-events-mode-a-cii-zip.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js', 'xml-cii-adapted-phase-panels-mode-a.js'],
    ['tabs/xml-cii-2019-standalone-tab.js', 'xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js'],
  ];
  for (const [file, dependency] of checks) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(source, new RegExp(`${dependency.replaceAll('.', '\\.') }\\?v=${token}`), file);
  }
});

test('standalone dataset-backed Weight Build has no all-master materializer dependency', async () => {
  const source = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /materializeXmlCiiDatasetBackedConfig/);
  assert.match(source, /rankMasterDatasetWeightIssues/);
  assert.match(source, /delete out\.weight\.masterRows/);
  const renderer = await readFile(new URL('../tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js', import.meta.url), 'utf8');
  assert.match(renderer, /workerBackedWeight/);
  assert.match(renderer, /await rankWeightIssues\(issueRows/);
  assert.match(renderer, /Weight worker returned a mismatched dataset result/);
});

test('source/docs mirrors are exact for changed runtime modules', async () => {
  const paths = [
    'index.html',
    'main-rhbg-fitguard.js',
    'core/app.js',
    'core/app-standalone-runtime.js',
    'converters/xml-cii2019-core/linelist-mapping.js',
    'converters/xml-cii2019-core/weight-match-ranking-service.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-service.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-client.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-worker.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js',
    'tabs/xml-cii-2019-standalone-tab.js',
    'tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js',
  ];
  for (const path of paths) {
    const [source, docs] = await Promise.all([readFile(new URL(`../${path}`, import.meta.url), 'utf8'), readFile(new URL(`../docs/${path}`, import.meta.url), 'utf8')]);
    assert.equal(docs, source, path);
  }
});
