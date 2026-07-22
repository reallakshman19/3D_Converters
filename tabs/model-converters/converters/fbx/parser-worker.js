import { deepFreeze } from './canonical-json.js';
import { parseFbxBytesWithWasm } from './parser-wasm.js';
import { enforceSourceGraphPolicy } from './source-graph.js';

async function handle(message, post) {
  if (message?.type !== 'parse') return;
  try {
    const graph = await parseFbxBytesWithWasm(new Uint8Array(message.bytes));
    post({ id: message.id, ok: true, graph: deepFreeze(enforceSourceGraphPolicy(graph)) });
  } catch (error) {
    post({ id: message.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event) => handle(event.data, (value) => self.postMessage(value));
} else {
  const { parentPort } = await import('node:worker_threads');
  parentPort.on('message', (value) => handle(value, (result) => parentPort.postMessage(result)));
}
