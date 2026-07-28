import { convertFbxToStagedJson } from './fbx/conversion.js';
import { canonicalJson } from './fbx/canonical-json.js';
import { parseFbxInWorker } from './fbx/parser-client.js';
import { parseFbxGeometryBundleInWorker } from './fbx/geometry-transport.js';
import { runFbxWholeModelAutoPipe } from './fbx/zone-geometry/whole-model-auto-pipe.js';
import { loadBrowserParserEvidence } from './fbx/parser-provenance.js';

const SOURCE_GRAPH_JSON_PASS = 'SOURCE_GRAPH_JSON_PASS';
const STAGEDJSON_PASS = 'STAGEDJSON_PASS';
const STAGEDJSON_PARTIAL_PASS = 'STAGEDJSON_PARTIAL_PASS';
const OPTIONAL_MAPPING_ABSENT = 'OPTIONAL_MAPPING_ABSENT';
const STAGE_LABELS = Object.freeze({
  preflight: 'Checking FBX header...', 'loading-wasm': 'Loading FBX parser...',
  'copying-input': 'Copying FBX into parser memory...', 'parsing-fbx': 'Parsing FBX...',
  'decoding-result': 'Decoding parser result...', 'enforcing-source-policy': 'Enforcing FBX source policy...',
  'preparing-transfer': 'Preparing FBX source graph...',
});

function findInput(context, role) { return context.inputFiles?.find((file) => file.role === role); }
function parseMapping(file) {
  if (!file) return { mapping: null, mappingError: null };
  try {
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
    return { mapping: JSON.parse(new TextDecoder().decode(bytes)), mappingError: null };
  } catch (error) {
    return { mapping: null, mappingError: `Invalid mapping JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
}
function baseName(name) { return String(name || 'model.fbx').replace(/\.[^.]+$/, '') || 'model'; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function promotedReport(output, status, tags) {
  if (!/\.fbx-conversion-report\.json$/i.test(output.name || '')) return output;
  try {
    const report = JSON.parse(output.text); report.status = status;
    report.diagnostics = unique([...(Array.isArray(report.diagnostics) ? report.diagnostics : []), ...tags]).sort();
    return { ...output, text: canonicalJson(report) };
  } catch { return output; }
}

export function promoteNoMappingJsonOutput(result, inputName, evidence = {}) {
  const outputs = Array.isArray(result?.outputs) ? result.outputs : [];
  const graph = outputs.find((output) => /\.fbx-source-graph\.json$/i.test(output?.name || ''));
  if (!graph) return result;
  const outputName = `${baseName(inputName)}.json`;
  if (outputs.some((output) => output?.name === outputName)) return result;
  const logs = result?.logs || {};
  const tags = unique(['PARSE_PASS', OPTIONAL_MAPPING_ABSENT, SOURCE_GRAPH_JSON_PASS, ...(evidence.diagnostics || [])]);
  return { ...result, ok: true, conversionStatus: SOURCE_GRAPH_JSON_PASS,
    outputs: [{ ...graph, name: outputName }, ...outputs.map((output) => promotedReport(output, SOURCE_GRAPH_JSON_PASS, tags))],
    logs: { stdout: unique([...tags, ...(logs.stdout || [])]), stderr: unique([...(logs.stderr || []), ...(evidence.errors || [])]) } };
}

function parsedSourceGraph(converted) {
  const graphOutput = (converted?.outputs || []).find((output) => /\.fbx-source-graph\.json$/i.test(output?.name || ''));
  if (!graphOutput) return null;
  try { return JSON.parse(graphOutput.text); } catch { return null; }
}
function blockedAutoPipe(reason) {
  return { conversionStatus: 'BLOCKED_WHOLE_MODEL_AUTO_PIPE', stagedJsonText: null, zoneReports: [],
    duplicateIdentifiers: [], unresolvedCrefs: [], blockingReasons: [reason],
    counts: { totalZones: 0, passedZones: 0, blockedZones: 0, errorZones: 1, branches: 0 } };
}
async function attemptWholeModelAutoPipe(context, primary, converted) {
  const sourceGraph = parsedSourceGraph(converted);
  if (!sourceGraph) return blockedAutoPipe('WHOLE_MODEL_AUTO_PIPE_SOURCE_GRAPH_UNAVAILABLE');
  try {
    const geometryBundle = await parseFbxGeometryBundleInWorker(primary.bytes, {
      signal: context.signal, timeoutMs: context.options?.fbxWorkerTimeoutMs,
    });
    return await runFbxWholeModelAutoPipe({
      sourceGraph, geometryBundle, concurrency: context.options?.fbxWholeModelConcurrency,
    });
  } catch (error) {
    return blockedAutoPipe(`WHOLE_MODEL_AUTO_PIPE_RUNTIME_ERROR:${error?.message || String(error)}`);
  }
}
function autoPipeEvidence(autoPipe) {
  const counts = autoPipe?.counts || {};
  return {
    diagnostics: [
      `WHOLE_MODEL_AUTO_PIPE_STATUS:${autoPipe?.conversionStatus || 'UNKNOWN'}`,
      `WHOLE_MODEL_AUTO_PIPE_ZONES_PASSED:${counts.passedZones || 0}/${counts.totalZones || 0}`,
      `WHOLE_MODEL_AUTO_PIPE_ZONES_BLOCKED:${counts.blockedZones || 0}`,
      `WHOLE_MODEL_AUTO_PIPE_ZONES_ERROR:${counts.errorZones || 0}`,
      ...(autoPipe?.blockingReasons || []),
    ],
    errors: (autoPipe?.zoneReports || []).filter((report) => report.error)
      .map((report) => `WHOLE_MODEL_AUTO_PIPE_ZONE_ERROR:${report.zoneId}:${report.error}`),
  };
}
function promoteWholeModelAutoPipeOutput(result, inputName, autoPipe) {
  const outputs = Array.isArray(result?.outputs) ? result.outputs : [];
  const status = autoPipe.conversionStatus;
  const evidence = autoPipeEvidence(autoPipe);
  const tags = unique(['PARSE_PASS', OPTIONAL_MAPPING_ABSENT,
    status === STAGEDJSON_PARTIAL_PASS ? 'WHOLE_MODEL_AUTO_PIPE_PARTIAL' : 'WHOLE_MODEL_AUTO_PIPE_PASS',
    status, ...evidence.diagnostics]);
  const outputName = `${baseName(inputName)}.json`;
  return { ...result, ok: true, conversionStatus: status,
    outputs: [{ name: outputName, text: autoPipe.stagedJsonText },
      ...outputs.filter((output) => output?.name !== outputName).map((output) => promotedReport(output, status, tags))],
    logs: { stdout: unique([...tags, ...(result?.logs?.stdout || [])]),
      stderr: unique([...(result?.logs?.stderr || []), ...evidence.errors]) } };
}
async function noMappingResult(context, primary, converted) {
  context.setStatus?.('Attempting automatic whole-model PIPE classification...', 'running');
  const autoPipe = await attemptWholeModelAutoPipe(context, primary, converted);
  return [STAGEDJSON_PASS, STAGEDJSON_PARTIAL_PASS].includes(autoPipe.conversionStatus)
    ? promoteWholeModelAutoPipeOutput(converted, primary.name, autoPipe)
    : promoteNoMappingJsonOutput(converted, primary.name, autoPipeEvidence(autoPipe));
}
async function loadParserEvidence() {
  try { return { parserEvidence: await loadBrowserParserEvidence() }; }
  catch (error) { return { parserEvidenceError: error instanceof Error ? error.message : String(error) }; }
}
function workerOptions(context) {
  return { signal: context.signal, timeoutMs: context.options?.fbxWorkerTimeoutMs,
    onProgress: (stage) => context.setStatus?.(STAGE_LABELS[stage] || `FBX worker: ${stage}`, 'running') };
}

export async function run(context = {}) {
  const primary = findInput(context, 'primary');
  if (!primary?.bytes) throw new Error('FBX input is required.');
  const secondary = findInput(context, 'secondary');
  const converted = await convertFbxToStagedJson({
    bytes: primary.bytes, inputName: primary.name, ...parseMapping(secondary), ...(await loadParserEvidence()),
    parse: (bytes) => parseFbxInWorker(bytes, workerOptions(context)),
  });
  const result = secondary ? converted : await noMappingResult(context, primary, converted);
  context.setStatus?.(result.conversionStatus,
    [SOURCE_GRAPH_JSON_PASS, STAGEDJSON_PASS].includes(result.conversionStatus) ? 'ok' : 'warning');
  return result;
}
