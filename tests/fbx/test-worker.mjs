import assert from 'node:assert/strict';
import { parseFbxInWorker } from '../../tabs/model-converters/converters/fbx/parser-client.js';

let terminated = false;
const fakeWorker = {
  postMessage() {},
  terminate() { terminated = true; },
  onmessage: null,
  onerror: null,
};
const controller = new AbortController();
const pending = parseFbxInWorker(new Uint8Array([1]), {
  signal: controller.signal,
  workerFactory: () => fakeWorker,
});
controller.abort();
await assert.rejects(() => pending, /cancelled/i);
assert.equal(terminated, true);

const errorWorker = {
  postMessage(message) {
    queueMicrotask(() => this.onmessage({ data: { id: message.id, ok: false, error: 'parser-error-proof' } }));
  },
  terminate() {},
  onmessage: null,
  onerror: null,
};
await assert.rejects(() => parseFbxInWorker(new Uint8Array([1]), { workerFactory: () => errorWorker }), /parser-error-proof/);
console.log('test-worker: PASS');
