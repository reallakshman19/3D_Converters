import { convertFbxToStagedJson } from './fbx/conversion.js';
import { canonicalJson } from './fbx/canonical-json.js';
import { parseFbxInWorker } from './fbx/parser-client.js';
import { loadBrowserParserEvidence } from './fbx/parser-provenance.js';

const SOURCE_GRAPH_JSON_PASS = 'SOURCE_GRAPH_JSON_PASS';
const OPTIONAL_MAPPING_ABSENT = 'OPTIONAL_MAPPING_ABSENT';
const STAGE_LABELS = Object.freeze({
  preflight: 'Checking FBX header...',
  'loading-wasm': 'Loading FBX parser...',
  'copying-input': 'Copying FBX into parser memory...',
  'parsing-fbx': 'Parsing FBX...',
  'decoding-result': 'Decoding parser result...',
  'enforcing-source-policy': 'Enforcing FBX source policy...',
  'preparing-transfer': 'Preparing FBX source graph...',
});

function findInput(context, role) {
  return context.inputFiles?.find((file) => file.role === role);
}

function parseMapping(file) {
  if (!file) return { mapping: null, mappingError: null };
  try {
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
    return { mapping: JSON.parse(new TextDecoder().decode(bytes)), mappingError: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { mapping: null, mappingError: `Invalid mapping JSON: ${detail}` };
  }
}

function baseName(name) {
  return String(name || 'model.fbx').replace(/\.[^.]+$/, '') || 'model';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function promotedReport(output) {
  if (!/\.fbx-conversion-report\.json$/i.test(output.name || '')) return output;
  try {
    const report = JSON.parse(output.text);
    report.status = SOURCE_GRAPH_JSON_PASS;
    report.diagnostics = unique([
      ...(Array.isArray(report.diagnostics) ? report.diagnostics : []),
      'PARSE_PASS', OPTIONAL_MAPPING_ABSENT, SOURCE_GRAPH_JSON_PASS,
    ]).sort();
    return { ...output, text: canonicalJson(report) };
  } catch {
    return output;
  }
}

export function promoteNoMappingJsonOutput(result, inputName) {
  const outputs = Array.isArray(result?.outputs) ? result.outputs : [];
  const graph = outputs.find((output) => /\.fbx-source-graph\.json$/i.test(output?.name || ''));
  if (!graph) return result;
  const outputName = `${baseName(inputName)}.json`;
  if (outputs.some((output) => output?.name === outputName)) return result;
  const logs = result?.logs || {};
  return {
    ...result,
    ok: true,
    conversionStatus: SOURCE_GRAPH_JSON_PASS,
    outputs: [{ ...graph, name: outputName }, ...outputs.map(promotedReport)],
    logs: {
      stdout: unique([
        'PARSE_PASS', OPTIONAL_MAPPING_ABSENT, SOURCE_GRAPH_JSON_PASS,
        ...(logs.stdout || []), ...(logs.stderr || []),
      ]),
      stderr: [],
    },
  };
}

async function loadParserEvidence() {
  try {
    return { parserEvidence: await loadBrowserParserEvidence() };
  } catch (error) {
    const parserEvidenceError = error instanceof Error ? error.message : String(error);
    return { parserEvidenceError };
  }
}

function workerOptions(context) {
  return {
    signal: context.signal,
    timeoutMs: context.options?.fbxWorkerTimeoutMs,
    onProgress: (stage) => context.setStatus?.(STAGE_LABELS[stage] || `FBX worker: ${stage}`, 'running'),
  };
}

export async function run(context = {}) {
  const primary = findInput(context, 'primary');
  if (!primary?.bytes) throw new Error('FBX input is required.');
  const secondary = findInput(context, 'secondary');
  const mappingInput = parseMapping(secondary);
  const binding = await loadParserEvidence();
  context.setStatus?.('Parsing binary FBX in isolated worker...', 'running');
  const converted = await convertFbxToStagedJson({
    bytes: primary.bytes,
    inputName: primary.name,
    ...mappingInput,
    ...binding,
    parse: (bytes) => parseFbxInWorker(bytes, workerOptions(context)),
  });
  const result = secondary ? converted : promoteNoMappingJsonOutput(converted, primary.name);
  const state = [SOURCE_GRAPH_JSON_PASS, 'STAGEDJSON_PASS'].includes(result.conversionStatus) ? 'ok' : 'warning';
  context.setStatus?.(result.conversionStatus, state);
  return result;
}
