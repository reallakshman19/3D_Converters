import assert from 'node:assert/strict';
import { analyseFbxZoneGeometry } from '../../tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js';
import { createZoneAnalysisController } from '../../tabs/model-converters/converters/fbx/zone-geometry/analysis-controller.js';
import { ZONE_GEOMETRY_STATUS } from '../../tabs/model-converters/converters/fbx/zone-geometry/constants.js';
import { buildFixture } from './test-zone-geometry-evidence.mjs';

async function assertRealWorkerDirectParity() {
  const { access } = await import('node:fs/promises');
  const wasmUrl = new URL('../../third_party/ufbx/fbx_parser.wasm', import.meta.url);
  try { await access(wasmUrl); } catch { return 'not-available-in-local-harness'; }
  const [{ parseFbxBytesNode, parseFbxGeometryBundleNode },
    { parseFbxGeometryBundleInWorker }, { handleFbxWorkerMessage },
    { listFbxSourceGraphPreviewZones }, { fixtureBytes }] = await Promise.all([
      import('../../tabs/model-converters/converters/fbx/parser-node.js'),
      import('../../tabs/model-converters/converters/fbx/geometry-transport.js'),
      import('../../tabs/model-converters/converters/fbx/parser-worker.js'),
      import('../../tabs/model-converters/fbx-source-graph-preview.js'),
      import('./helpers.mjs'),
    ]);
  const workerFactory = () => ({ onmessage: null, onerror: null, onmessageerror: null,
    terminate() {}, postMessage(job, transfer) {
      const workerJob = structuredClone(job, { transfer });
      queueMicrotask(() => { void handleFbxWorkerMessage(workerJob, (message, output = []) => {
        const delivered = structuredClone(message, { transfer: output });
        queueMicrotask(() => this.onmessage?.({ data: delivered }));
      }); });
    } });
  const bytes = await fixtureBytes(), before = bytes.slice();
  const graph = await parseFbxBytesNode(bytes);
  const directBundle = await parseFbxGeometryBundleNode(bytes);
  const workerBundle = await parseFbxGeometryBundleInWorker(bytes, { workerFactory, timeoutMs: 120000 });
  const zone = listFbxSourceGraphPreviewZones(graph).find((item) => item.zoneId !== 'preview-zone:unowned');
  assert.ok(zone, 'real fixture must expose a selected preview zone');
  const directResult = await analyseFbxZoneGeometry({ sourceGraph: graph, geometryBundle: directBundle, zoneId: zone.zoneId });
  const workerResult = await analyseFbxZoneGeometry({ sourceGraph: graph, geometryBundle: workerBundle, zoneId: zone.zoneId });
  assert.deepEqual(bytes, before);
  assert.equal(workerResult.zoneGeometryJson, directResult.zoneGeometryJson);
  assert.equal(workerResult.derivedPortJson, directResult.derivedPortJson);
  return 'pass';
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const fixture = await buildFixture();
const sourceBefore = [...fixture.sourceBytes];
const direct = await analyseFbxZoneGeometry({ sourceGraph: fixture.graph,
  geometryBundle: fixture.bundle, zoneId: 'occ:3' });
const parityController = createZoneAnalysisController({
  parseBundle: async (bytes, options) => { options.onProgress?.('preflight'); return fixture.bundle; },
  analyse: analyseFbxZoneGeometry,
});
const worker = await parityController.run({ bytes: fixture.sourceBytes,
  sourceGraph: fixture.graph, zoneId: 'occ:3' });
assert.equal(worker.zoneGeometryJson, direct.zoneGeometryJson);
assert.equal(worker.derivedPortJson, direct.derivedPortJson);
assert.deepEqual([...fixture.sourceBytes], sourceBefore);

let cancelledSignal = null;
const cancellationController = createZoneAnalysisController({
  parseBundle: (bytes, options) => new Promise((resolve, reject) => {
    cancelledSignal = options.signal;
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('cancelled'),
      { code: 'FBX_WORKER_ABORTED' })), { once: true });
  }),
  analyse: analyseFbxZoneGeometry,
});
const cancelledRun = cancellationController.run({ bytes: fixture.sourceBytes,
  sourceGraph: fixture.graph, zoneId: 'occ:3' });
cancellationController.invalidate('zone changed');
assert.equal((await cancelledRun).stale, true);
assert.equal(cancelledSignal.aborted, true);
assert.equal(cancellationController.snapshot().zoneGeometryJson, null);
assert.equal(cancellationController.snapshot().derivedPortJson, null);
assert.equal(cancellationController.snapshot().phase, 'cancelled');
assert.equal(cancellationController.snapshot().status, ZONE_GEOMETRY_STATUS.CANCELLED);

const timeoutController = createZoneAnalysisController({
  parseBundle: async () => { throw Object.assign(new Error('timed out'), { code: 'FBX_WORKER_TIMEOUT' }); },
  analyse: analyseFbxZoneGeometry,
});
await assert.rejects(() => timeoutController.run({ bytes: fixture.sourceBytes,
  sourceGraph: fixture.graph, zoneId: 'occ:3' }), (error) => error.code === ZONE_GEOMETRY_STATUS.RESOURCE);
assert.equal(timeoutController.snapshot().zoneGeometryJson, null);
assert.equal(timeoutController.snapshot().derivedPortJson, null);

const firstParse = deferred(), secondParse = deferred();
let calls = 0;
const staleController = createZoneAnalysisController({
  parseBundle: () => (++calls === 1 ? firstParse.promise : secondParse.promise),
  analyse: analyseFbxZoneGeometry,
});
const firstRun = staleController.run({ bytes: fixture.sourceBytes,
  sourceGraph: fixture.graph, zoneId: 'occ:3' });
const secondRun = staleController.run({ bytes: fixture.sourceBytes,
  sourceGraph: fixture.graph, zoneId: 'occ:3' });
secondParse.resolve(fixture.bundle);
const secondResult = await secondRun;
firstParse.resolve(fixture.bundle);
assert.equal((await firstRun).stale, true);
assert.equal(staleController.snapshot().zoneGeometryJson, secondResult.zoneGeometryJson);
assert.equal(staleController.snapshot().phase, 'complete');

const realParity = await assertRealWorkerDirectParity();
console.log(`test-zone-geometry-worker: PASS (real parity: ${realParity})`);
