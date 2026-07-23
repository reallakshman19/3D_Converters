import { sha256Hex } from './sha256.js';

const REQUIRED_KEYS = Object.freeze([
  'schema', 'sourceSha256', 'upstreamRevision', 'wasmSha256',
]);
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const REVISION_PATTERN = /^[0-9a-f]{40}$/;

function fail(message) {
  throw new Error(`BLOCKED_PARSER_BINDING ${message}`);
}

function validateProvenance(provenance) {
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    fail('Repository parser provenance must be an object.');
  }
  for (const key of REQUIRED_KEYS) {
    if (typeof provenance[key] !== 'string' || !provenance[key]) {
      fail(`Repository parser provenance ${key} is required.`);
    }
  }
  if (!HASH_PATTERN.test(provenance.sourceSha256)) fail('Repository parser sourceSha256 is malformed.');
  if (!HASH_PATTERN.test(provenance.wasmSha256)) fail('Repository parser wasmSha256 is malformed.');
  if (!REVISION_PATTERN.test(provenance.upstreamRevision)) fail('Repository parser upstreamRevision is malformed.');
  return provenance;
}

export async function observeParserEvidence({ provenance, wasmBytes }) {
  const accepted = validateProvenance(provenance);
  const observedWasmSha256 = await sha256Hex(wasmBytes);
  if (observedWasmSha256 !== accepted.wasmSha256) {
    fail('Committed parser WASM does not match repository provenance.');
  }
  return Object.freeze({
    provenanceSchema: accepted.schema,
    upstreamRevision: accepted.upstreamRevision,
    sourceSha256: accepted.sourceSha256,
    wasmSha256: observedWasmSha256,
  });
}

async function fetchRequired(url, kind) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) fail(`Unable to load repository parser ${kind}: HTTP ${response.status}.`);
  return response;
}

export async function loadBrowserParserEvidence() {
  const base = new URL('../../../../third_party/ufbx/', import.meta.url);
  const [provenanceResponse, wasmResponse] = await Promise.all([
    fetchRequired(new URL('provenance.json', base), 'provenance'),
    fetchRequired(new URL('fbx_parser.wasm', base), 'WASM'),
  ]);
  return observeParserEvidence({
    provenance: await provenanceResponse.json(),
    wasmBytes: new Uint8Array(await wasmResponse.arrayBuffer()),
  });
}
