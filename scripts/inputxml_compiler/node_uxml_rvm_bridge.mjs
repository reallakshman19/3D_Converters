#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import { adaptRvmRowsToUxml } from '../../rvm-pcf-extract/RvmRowsToUxmlAdapter.js';

const REQUEST_SCHEMA = 'InputXmlUxmlRvmBridgeRequest.v1';
const RESULT_SCHEMA = 'InputXmlUxmlRvmBridgeResult.v1';
const BRIDGE_IDENTITY = 'inputxml-uxml-rvm-exact-bridge/v1';
const MAX_REQUEST_BYTES = 24 * 1024 * 1024;
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

function compareCodePoints(left, right) {
  const a = Array.from(left, char => char.codePointAt(0));
  const b = Array.from(right, char => char.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort(compareCodePoints);
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}
function hashBytes(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function semanticHash(value, field) {
  const body = Object.create(null);
  for (const key of Object.keys(value)) if (key !== field) body[key] = value[key];
  return hashBytes(Buffer.from(stableStringify(body), 'utf8'));
}
function clean(value) { return String(value ?? '').trim(); }
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }

function canonicalDecimal(token) {
  const match = String(token).match(/^(-?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/u);
  if (!match) fail('UXML_RVM_INVALID_JSON', `Invalid number ${token}`);
  const sign = match[1]; const integer = match[2]; const fraction = match[3] ?? '';
  const exponent = Number(match[4] ?? 0); let digits = `${integer}${fraction}`;
  let point = integer.length + exponent;
  digits = digits.replace(/^0+/u, '') || '0';
  if (digits === '0') return '0';
  const removed = integer.length + fraction.length - digits.length;
  point -= removed;
  let result;
  if (point <= 0) result = `0.${'0'.repeat(-point)}${digits}`;
  else if (point >= digits.length) result = `${digits}${'0'.repeat(point - digits.length)}`;
  else result = `${digits.slice(0, point)}.${digits.slice(point)}`;
  result = result.replace(/(?:\.0+|(?<=\..*?)0+)$/u, '').replace(/\.$/u, '');
  return sign === '-' ? `-${result}` : result;
}
function exactNumber(token) {
  const value = Number(token);
  if (!Number.isFinite(value)) fail('UXML_RVM_NON_FINITE_JSON', `Non-finite JSON number ${token}`);
  if (!/[.eE]/u.test(token) && !Number.isSafeInteger(value)) {
    fail('UXML_RVM_UNSAFE_INTEGER', `JSON integer exceeds exact bridge range: ${token}`);
  }
  if (Math.abs(value) > MAX_SAFE_INTEGER && Number.isInteger(value)) {
    fail('UXML_RVM_UNSAFE_INTEGER', `JSON integer exceeds exact bridge range: ${token}`);
  }
  if (canonicalDecimal(token) !== canonicalDecimal(String(value))) {
    fail('UXML_RVM_PRECISION_LOSS', `JSON number cannot round-trip exactly through bridge: ${token}`);
  }
  return value;
}

function parseStrictJson(text) {
  let index = 0;
  const whitespace = () => { while (/\s/u.test(text[index] ?? '')) index += 1; };
  const string = () => {
    const start = index;
    if (text[index++] !== '"') fail('UXML_RVM_INVALID_JSON', 'Expected string');
    while (index < text.length) {
      const char = text[index++];
      if (char === '"') {
        let value;
        try { value = JSON.parse(text.slice(start, index)); }
        catch { fail('UXML_RVM_INVALID_JSON', 'Invalid JSON string'); }
        for (let i = 0; i < value.length; i += 1) {
          const code = value.charCodeAt(i);
          if (code >= 0xD800 && code <= 0xDBFF) {
            const next = value.charCodeAt(i + 1);
            if (!(next >= 0xDC00 && next <= 0xDFFF)) fail('UXML_RVM_UNPAIRED_SURROGATE', 'Unpaired high surrogate');
            i += 1;
          } else if (code >= 0xDC00 && code <= 0xDFFF) fail('UXML_RVM_UNPAIRED_SURROGATE', 'Unpaired low surrogate');
        }
        return value;
      }
      if (char === '\\') index += 1;
      else if (char.charCodeAt(0) < 0x20) fail('UXML_RVM_INVALID_JSON', 'Control character in string');
    }
    fail('UXML_RVM_INVALID_JSON', 'Unterminated string');
  };
  const number = () => {
    const match = text.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
    if (!match) fail('UXML_RVM_INVALID_JSON', 'Invalid number');
    index += match[0].length;
    return exactNumber(match[0]);
  };
  const value = () => {
    whitespace(); const char = text[index];
    if (char === '{') return object();
    if (char === '[') return array();
    if (char === '"') return string();
    if (char === '-' || /\d/u.test(char ?? '')) return number();
    for (const [token, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(token, index)) { index += token.length; return result; }
    }
    fail('UXML_RVM_INVALID_JSON', `Unexpected token at byte ${index}`);
  };
  const object = () => {
    index += 1; whitespace();
    const result = Object.create(null); const keys = new Set();
    if (text[index] === '}') { index += 1; return result; }
    while (true) {
      whitespace(); const key = string(); whitespace();
      if (keys.has(key)) fail('UXML_RVM_DUPLICATE_JSON_KEY', `Duplicate JSON key ${key}`);
      keys.add(key);
      if (text[index++] !== ':') fail('UXML_RVM_INVALID_JSON', 'Expected colon');
      const item = value();
      Object.defineProperty(result, key, { value: item, enumerable: true, writable: true, configurable: true });
      whitespace(); const separator = text[index++];
      if (separator === '}') return result;
      if (separator !== ',') fail('UXML_RVM_INVALID_JSON', 'Expected comma or object end');
    }
  };
  const array = () => {
    index += 1; whitespace(); const result = [];
    if (text[index] === ']') { index += 1; return result; }
    while (true) {
      result.push(value()); whitespace(); const separator = text[index++];
      if (separator === ']') return result;
      if (separator !== ',') fail('UXML_RVM_INVALID_JSON', 'Expected comma or array end');
    }
  };
  const result = value(); whitespace();
  if (index !== text.length) fail('UXML_RVM_TRAILING_JSON', 'Trailing JSON content');
  return result;
}

function requireRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) fail('UXML_RVM_BRIDGE_REQUEST_SHAPE', 'Request must be an object');
  if (request.schema !== REQUEST_SCHEMA) fail('UXML_RVM_BRIDGE_REQUEST_SCHEMA', `Expected ${REQUEST_SCHEMA}`);
  if (request.expectedBridgeIdentity !== BRIDGE_IDENTITY) fail('UXML_RVM_BRIDGE_IDENTITY', 'Unexpected bridge identity');
  if (request.requestHashSha256 !== semanticHash(request, 'requestHashSha256')) fail('UXML_RVM_BRIDGE_REQUEST_HASH', 'Request semantic hash mismatch');
  if (!['UXML_DOCUMENT', 'RVM_ROWS'].includes(request.sourceKind)) fail('UXML_RVM_INPUT_KIND', 'Unknown source kind');
  if (request.dialect !== 'uxml-rvm-intake' || request.adapter !== 'uxml-rvm-to-canonical') fail('UXML_RVM_PROFILE_IDENTITY', 'Profile identity mismatch');
}
function sourcePayload(request) {
  let source;
  try { source = Buffer.from(request.sourceBase64, 'base64'); }
  catch { fail('UXML_RVM_SOURCE_BASE64', 'Invalid source base64'); }
  if (source.toString('base64') !== request.sourceBase64) fail('UXML_RVM_SOURCE_BASE64', 'Non-canonical source base64');
  if (!Buffer.from(source.toString('utf8'), 'utf8').equals(source)) fail('UXML_RVM_INVALID_UTF8', 'Source bytes are not strict UTF-8');
  if (source.length !== request.sourceByteLength) fail('UXML_RVM_SOURCE_LENGTH', 'Source length mismatch');
  if (hashBytes(source) !== request.sourceByteHashSha256) fail('UXML_RVM_SOURCE_HASH', 'Source hash mismatch');
  const payload = parseStrictJson(source.toString('utf8'));
  if (request.sourceKind === 'RVM_ROWS') {
    const rows = Array.isArray(payload) ? payload : (payload.rows ?? payload.rvmRows);
    if (!Array.isArray(rows)) fail('UXML_RVM_ROW_SHAPE', 'RVM_ROWS requires a row array');
    return { payload, rows };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('UXML_RVM_UXML_SHAPE', 'UXML requires an object');
  const uxml = payload.uxml ?? payload;
  if (!uxml || uxml.schemaVersion !== 'uxml-topology-v1') fail('UXML_RVM_UXML_SCHEMA', 'Unregistered UXML schema');
  return { payload, rows: [], uxml };
}
function inventoryHash(uxml) {
  const names = ['sources', 'mappings', 'pipelines', 'components', 'anchors', 'ports', 'segments', 'supports', 'topologyHints', 'rayEvidence', 'lossContract'];
  const inventory = Object.create(null);
  for (const name of names) inventory[name] = uxml[name] ?? [];
  return hashBytes(Buffer.from(stableStringify(inventory), 'utf8'));
}
function run(request) {
  requireRequest(request);
  const parsed = sourcePayload(request);
  let uxml = parsed.uxml; let adapter = null; let rowIdentityByComponentId = Object.create(null);
  if (request.sourceKind === 'RVM_ROWS') {
    adapter = adaptRvmRowsToUxml(parsed.rows, { name: 'source-bytes', path: '', hash: request.sourceByteHashSha256 });
    uxml = adapter.uxml; rowIdentityByComponentId = adapter.rowIdentityByComponentId ?? Object.create(null);
  }
  const diagnosticMap = new Map();
  for (const item of [...(adapter?.diagnostics ?? []), ...(uxml.diagnostics ?? [])]) diagnosticMap.set(stableStringify(item), { ...item });
  const diagnostics = [...diagnosticMap.values()].sort((a, b) => compareCodePoints(stableStringify(a), stableStringify(b)));
  const result = {
    schema: RESULT_SCHEMA, bridgeImplementationIdentity: BRIDGE_IDENTITY,
    requestHashSha256: request.requestHashSha256,
    sourceByteHashSha256: request.sourceByteHashSha256,
    sourceByteLength: request.sourceByteLength, sourceKind: request.sourceKind,
    rows: parsed.rows, rowIdentityByComponentId, uxml,
    adapter: adapter ? { schema: adapter.schema, stats: adapter.stats } : null,
    diagnostics,
    adaptedUxmlHashSha256: hashBytes(Buffer.from(stableStringify(uxml), 'utf8')),
    sourceInventoryHashSha256: inventoryHash(uxml),
    componentHashSha256: hashBytes(Buffer.from(stableStringify(uxml.components ?? []), 'utf8')),
    anchorHashSha256: hashBytes(Buffer.from(stableStringify(uxml.anchors ?? []), 'utf8')),
    portHashSha256: hashBytes(Buffer.from(stableStringify(uxml.ports ?? []), 'utf8')),
    segmentHashSha256: hashBytes(Buffer.from(stableStringify(uxml.segments ?? []), 'utf8')),
    pipelineHashSha256: hashBytes(Buffer.from(stableStringify(uxml.pipelines ?? []), 'utf8')),
    diagnosticHashSha256: hashBytes(Buffer.from(stableStringify(diagnostics), 'utf8')),
  };
  result.resultHashSha256 = semanticHash(result, 'resultHashSha256');
  return result;
}

try {
  const input = fs.readFileSync(0);
  if (input.length > MAX_REQUEST_BYTES) fail('UXML_RVM_BRIDGE_REQUEST_LIMIT', 'Bridge request exceeds limit');
  process.stdout.write(stableStringify(run(parseStrictJson(input.toString('utf8')))));
} catch (error) {
  process.stdout.write(stableStringify({ ok: false, code: error.code ?? 'UXML_RVM_BRIDGE_FAILURE', error: error.message ?? String(error) }));
  process.exitCode = 2;
}
