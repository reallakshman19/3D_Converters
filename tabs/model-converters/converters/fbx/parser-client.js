let requestCounter = 0;

function defaultWorkerFactory() {
  return new Worker(new URL('./parser-worker.js', import.meta.url), { type: 'module' });
}

export function parseFbxInWorker(bytes, options = {}) {
  const worker = (options.workerFactory || defaultWorkerFactory)();
  const id = `fbx-parse-${++requestCounter}`;
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new Promise((resolve, reject) => {
    const abort = () => {
      worker.terminate();
      reject(new DOMException('FBX parsing cancelled.', 'AbortError'));
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'FBX parser worker failed.'));
    };
    worker.onmessage = (event) => {
      if (event.data?.id !== id) return;
      worker.terminate();
      options.signal?.removeEventListener('abort', abort);
      if (event.data.ok) resolve(event.data.graph);
      else reject(new Error(event.data.error || 'FBX parser worker rejected the input.'));
    };
    const copy = source.slice();
    worker.postMessage({ type: 'parse', id, bytes: copy.buffer }, [copy.buffer]);
  });
}
