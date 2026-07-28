import { convertFbxToStagedJson } from './fbx/conversion.js';
import { canonicalJson } from './fbx/canonical-json.js';
import { parseFbxInWorker } from './fbx/parser-client.js';
import { parseFbxGeometryBundleInWorker } from './fbx/geometry-transport.js';
import { runFbxWholeModelAutoPipe } from './fbx/zone-geometry/whole-model-auto-pipe.js';
import { loadBrowserParserEvidence } from './fbx/parser-provenance.js';

const SOURCE_GRAPH_JSON_PASS = 'SOURCE_GRAPH_JSON_PASS';
const STAGEDJSON_PASS = 'STAGEDJSON_PASS';
const WHOLE_MODEL_AUTO_PIPE_PASS = 'WHOLE_MODEL_AUTO_PIPE_PASS';
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

function promotedReport(output, status, tags) {
  if (!/\.fbx-conversion-report\.json$/i.test(output.name || '')) return output;
  try {
    const report = JSON.parse(output.text);
    report.status = status;
    report.diagnostics = unique([
      ...(Array.isArray(report.diagnostics) ? report.diagnostics : []),
      ...tags,
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
  const tags = ['PARSE_PASS', OPTIONAL_MAPPING_ABSENT, SOURCE_GRAPH_JSON_PASS];
  return {
    ...result,
    ok: true,
    conversionStatus: SOURCE_GRAPH_JSON_PASS,
    outputs: [{ ...graph, name: outputName }, ...outputs.map((output) => promotedReport(output, SOURCE_GRAPH_JSON_PASS, tags))],
    logs: {
      stdout: unique([...tags, ...(logs.stdout || []), ...(logs.stderr || [])]),
      stderr: [],
    },
  };
}

function parsedSourceGraph(converted) {
  const outputs = Array.isArray(converted?.outputs) ? converted.outputs : [];
  const graphOutput = outputs.find((output) => /\.fbx-source-graph\.json$/i.test(output?.name || ''));
  if (!graphOutput) return null;
  try {
    return JSON.parse(graphOutput.text);
  } catch {
    return null;
  }
}

async function attemptWholeModelAutoPipe(context, primary, converted) {
  const sourceGraph = parsedSourceGraph(converted);
  if (!sourceGraph) return null;
  try {
    const geometryBundle = await parseFbxGeometryBundleInWorker(primary.bytes, {
      signal: context.signal, timeoutMs: context.options?.fbxWorkerTimeoutMs,
    });
    return await runFbxWholeModelAutoPipe({ sourceGraph, geometryBundle });
  } catch {
    return null;
  }
}

function promoteWholeModelAutoPipeOutput(result, inputName, autoPipe) {
  const outputs = Array.isArray(result?.outputs) ? result.outputs : [];
  const outputName = `${baseName(inputName)}.json`;
  const stagedOutput = { name: outputName, text: autoPipe.stagedJsonText };
  const tags = ['PARSE_PASS', OPTIONAL_MAPPING_ABSENT, WHOLE_MODEL_AUTO_PIPE_PASS, STAGEDJSON_PASS];
  const otherOutputs = outputs
    .filter((output) => output?.name !== outputName)
    .map((output) => promotedReport(output, STAGEDJSON_PASS, tags));
  const logs = result?.logs || {};
  const zoneSummary = `WHOLE_MODEL_AUTO_PIPE_ZONES_PASSED:${autoPipe.counts.passedZones}/${autoPipe.counts.totalZones}`;
  return {
    ...result,
    ok: true,
    conversionStatus: STAGEDJSON_PASS,
    outputs: [stagedOutput, ...otherOutputs],
    logs: {
      stdout: unique([...tags, zoneSummary, ...(logs.stdout || []), ...(logs.stderr || [])]),
      stderr: [],
    },
  };
}

async function noMappingResult(context, primary, converted) {
  context.setStatus?.('Attempting automatic whole-model PIPE classification...', 'running');
  const autoPipe = await attemptWholeModelAutoPipe(context, primary, converted);
  return autoPipe?.conversionStatus === STAGEDJSON_PASS
    ? promoteWholeModelAutoPipeOutput(converted, primary.name, autoPipe)
    : promoteNoMappingJsonOutput(converted, primary.name);
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
  const result = secondary ? converted : await noMappingResult(context, primary, converted);
  const state = [SOURCE_GRAPH_JSON_PASS, STAGEDJSON_PASS].includes(result.conversionStatus) ? 'ok' : 'warning';
  context.setStatus?.(result.conversionStatus, state);
  return result;
}
