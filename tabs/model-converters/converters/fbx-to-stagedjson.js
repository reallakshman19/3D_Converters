import { convertFbxToStagedJson } from './fbx/conversion.js';
import { canonicalJson } from './fbx/canonical-json.js';
import { parseFbxInWorker } from './fbx/parser-client.js';
import { parseFbxGeometryBundleInWorker } from './fbx/geometry-transport.js';
import {
  BLOCKED_SELECTED_ZONE_AUTO_PIPE, SELECTED_ZONE_EVIDENCE_PASS,
  STAGEDJSON_SELECTED_ZONE_PASS, rankFbxAutoPipeZones, runFbxSelectedZoneAutoPipe,
} from './fbx/zone-geometry/selected-zone-auto-pipe.js?v=20260729-fbx2-direct-pipe-1';
import { loadBrowserParserEvidence } from './fbx/parser-provenance.js';

const SOURCE_GRAPH_JSON_PASS = 'SOURCE_GRAPH_JSON_PASS';
const STAGEDJSON_PASS = 'STAGEDJSON_PASS';
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
function slug(value) {
  return String(value || 'zone').trim().replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'zone';
}
function jsonOutput(name, value) {
  return { name, text: canonicalJson(value), mime: 'application/json;charset=utf-8' };
}
function promotedReport(output, status, tags) {
  if (!/\.fbx-conversion-report\.json$/i.test(output.name || '')) return output;
  try {
    const report = JSON.parse(output.text); report.status = status;
    report.diagnostics = unique([...(Array.isArray(report.diagnostics) ? report.diagnostics : []), ...tags]).sort();
    return { ...output, text: canonicalJson(report) };
  } catch { return output; }
}

export function formatFbxWorkerFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  const evidence = [];
  if (typeof error?.code === 'string' && error.code) evidence.push(`code=${error.code}`);
  if (typeof error?.stage === 'string' && error.stage) evidence.push(`stage=${error.stage}`);
  if (typeof error?.detail === 'string' && error.detail && error.detail !== message) {
    evidence.push(`detail=${error.detail}`);
  }
  return evidence.length ? `${message} [${evidence.join('; ')}]` : message;
}

async function parseFbxWithDetailedWorkerError(bytes, options) {
  try { return await parseFbxInWorker(bytes, options); }
  catch (error) {
    const enriched = new Error(formatFbxWorkerFailure(error));
    enriched.name = error?.name || 'FbxWorkerRuntimeError';
    enriched.cause = error;
    throw enriched;
  }
}

export function promoteNoMappingJsonOutput(result, inputName, evidence = {}) {
  const outputs = Array.isArray(result?.outputs) ? result.outputs : [];
  const graph = outputs.find((output) => /\.fbx-source-graph\.json$/i.test(output?.name || ''));
  if (!graph) return result;
  const outputName = `${baseName(inputName)}.json`;
  if (outputs.some((output) => output?.name === outputName)) return result;
  const logs = result?.logs || {};
  const tags = unique(['PARSE_PASS', OPTIONAL_MAPPING_ABSENT, SOURCE_GRAPH_JSON_PASS, ...(evidence.diagnostics || [])]);
  return { ...result, ok: true, blocked: false, conversionStatus: SOURCE_GRAPH_JSON_PASS,
    outputs: [{ ...graph, name: outputName }, ...outputs.map((output) => promotedReport(output, SOURCE_GRAPH_JSON_PASS, tags))],
    logs: { stdout: unique([...tags, ...(logs.stdout || [])]), stderr: unique([...(logs.stderr || []), ...(evidence.errors || [])]) } };
}

function parsedSourceGraph(converted) {
  const graphOutput = (converted?.outputs || []).find((output) => /\.fbx-source-graph\.json$/i.test(output?.name || ''));
  if (!graphOutput) return null;
  try { return JSON.parse(graphOutput.text); } catch { return null; }
}
function blockedSelectedZone(reason, candidates = []) {
  return { conversionStatus: BLOCKED_SELECTED_ZONE_AUTO_PIPE, stagedJsonText: null,
    selectedZone: null, candidateZones: candidates, zoneReports: [],
    duplicateIdentifiers: [], unresolvedCrefs: [], blockingReasons: [reason],
    counts: { totalZones: candidates[0]?.candidateCount || 0,
      eligibleZones: candidates[0]?.eligibleCandidateCount || 0,
      attemptedZones: 0, passedZones: 0, evidenceZones: 0, blockedZones: 0,
      errorZones: 1, branches: 0 } };
}
function selectedZoneOptions(context) {
  return {
    zoneId: context.options?.fbxSelectedZoneId,
    maxGeometries: context.options?.fbxSelectedZoneMaxGeometries,
    maxSourcePoints: context.options?.fbxSelectedZoneMaxSourcePoints,
    maxAttempts: context.options?.fbxSelectedZoneMaxAttempts ?? 1,
  };
}
function geometryWorkerOptions(context, candidate) {
  return { signal: context.signal, timeoutMs: context.options?.fbxWorkerTimeoutMs,
    onProgress: (stage) => context.setStatus?.(
      `${candidate.label}: ${STAGE_LABELS[stage] || `FBX geometry worker: ${stage}`}`, 'running') };
}
function attemptStatus(context, candidate, options) {
  const maximum = options.zoneId ? 1 : options.maxAttempts;
  context.setStatus?.(
    `Qualifying selected zone ${candidate.rank}/${maximum}: ${candidate.label}...`, 'running');
}
async function attemptSelectedZoneAutoPipe(context, primary, converted) {
  const sourceGraph = parsedSourceGraph(converted);
  if (!sourceGraph) return blockedSelectedZone('SELECTED_ZONE_SOURCE_GRAPH_UNAVAILABLE');
  let candidates = [];
  try {
    const options = selectedZoneOptions(context);
    context.setStatus?.('Classifying and ranking source-graph zones...', 'running');
    candidates = rankFbxAutoPipeZones(sourceGraph, options);
    context.setStatus?.(`Selected zone: ${candidates[0].label}. Loading exact topology...`, 'running');
    const geometryBundle = await parseFbxGeometryBundleInWorker(
      primary.bytes, geometryWorkerOptions(context, candidates[0]));
    return await runFbxSelectedZoneAutoPipe({ sourceGraph, geometryBundle,
      selections: candidates, options,
      onAttempt: (candidate) => attemptStatus(context, candidate, options) });
  } catch (error) {
    return blockedSelectedZone(
      `SELECTED_ZONE_AUTO_PIPE_RUNTIME_ERROR:${formatFbxWorkerFailure(error)}`, candidates);
  }
}
function ratioText(value) {
  return Number.isFinite(value) ? value.toFixed(6) : '0.000000';
}
function attemptTags(autoPipe) {
  return (autoPipe?.zoneReports || []).map((report) =>
    `SELECTED_ZONE_ATTEMPT:${report.rank || 0}:${report.zoneId || 'unknown'}:${report.status}`);
}
function selectedZoneEvidence(autoPipe) {
  const counts = autoPipe?.counts || {}, selection = autoPipe?.selectedZone;
  return {
    diagnostics: [
      `SELECTED_ZONE_STATUS:${autoPipe?.conversionStatus || 'UNKNOWN'}`,
      ...(selection ? [
        `SELECTED_ZONE_ID:${selection.zoneId}`,
        `SELECTED_ZONE_LABEL:${selection.label}`,
        `SELECTED_ZONE_POLICY:${selection.policy}`,
        `SELECTED_ZONE_REASON:${selection.reason}`,
        `SELECTED_ZONE_RANK:${selection.rank}`,
        `SELECTED_ZONE_GEOMETRIES:${selection.selectedGeometryCount}`,
        `SELECTED_ZONE_SOURCE_POINTS:${selection.sourcePointCount}`,
        `SELECTED_ZONE_PIPE_LIKE_RATIO:${ratioText(selection.pipeLikeRatio)}`,
      ] : []),
      `SELECTED_ZONE_CANDIDATES:${counts.eligibleZones || 0}/${counts.totalZones || 0}`,
      `SELECTED_ZONE_ATTEMPTED:${counts.attemptedZones || 0}`,
      ...attemptTags(autoPipe), ...(autoPipe?.blockingReasons || []),
    ],
    errors: (autoPipe?.zoneReports || []).filter((report) => report.error)
      .map((report) => `SELECTED_ZONE_ERROR:${report.zoneId || 'unselected'}:${report.error}`),
  };
}
function promoteSelectedZoneOutput(result, inputName, autoPipe) {
  const outputs = Array.isArray(result?.outputs) ? result.outputs : [];
  const status = autoPipe.conversionStatus, evidence = selectedZoneEvidence(autoPipe);
  const selection = autoPipe.selectedZone;
  const tags = unique(['PARSE_PASS', OPTIONAL_MAPPING_ABSENT,
    'SELECTED_ZONE_AUTO_PIPE_PASS', status, ...evidence.diagnostics]);
  const outputName = `${baseName(inputName)}.${slug(selection?.label || selection?.zoneId)}.selected-zone.json`;
  return { ...result, ok: true, blocked: false, conversionStatus: status,
    outputs: [{ name: outputName, text: autoPipe.stagedJsonText },
      ...outputs.filter((output) => output?.name !== outputName)
        .map((output) => promotedReport(output, status, tags))],
    logs: { stdout: unique([...tags, ...(result?.logs?.stdout || [])]),
      stderr: unique([...(result?.logs?.stderr || []), ...evidence.errors]) } };
}
function classificationReport(autoPipe) {
  const analysis = autoPipe.selectedZoneAnalysis;
  return { schema: 'FbxSelectedZoneClassificationReport.v1',
    status: autoPipe.conversionStatus, selectedZone: autoPipe.selectedZone,
    counts: autoPipe.counts, zoneCounts: analysis?.counts || null,
    autoPipeStatus: analysis?.autoPipeStatus || null,
    autoPipeCounts: analysis?.autoPipeCounts || null,
    classificationStatus: analysis?.classificationStatus || null,
    classificationDispositions: analysis?.classificationDispositions || [],
    blockingReasons: autoPipe.blockingReasons || [], zoneReports: autoPipe.zoneReports || [],
    zonePackageError: analysis?.zonePackageError || null };
}
function promoteSelectedZoneEvidenceOutput(result, inputName, autoPipe) {
  const selection = autoPipe.selectedZone, analysis = autoPipe.selectedZoneAnalysis;
  const prefix = `${baseName(inputName)}.${slug(selection.label || selection.zoneId)}`;
  const evidence = selectedZoneEvidence(autoPipe);
  const artifacts = [
    jsonOutput(`${prefix}.selected-zone-geometry-evidence.json`, analysis.zoneGeometryEvidence),
    jsonOutput(`${prefix}.selected-zone-derived-port-evidence.json`, analysis.derivedPortEvidence),
    jsonOutput(`${prefix}.selected-zone-classification-report.json`, classificationReport(autoPipe)),
    ...(analysis.zonePackageManifest ? [jsonOutput(
      `${prefix}.selected-zone-geometry-manifest.json`, analysis.zonePackageManifest)] : []),
  ];
  const tags = unique(['PARSE_PASS', OPTIONAL_MAPPING_ABSENT,
    SELECTED_ZONE_EVIDENCE_PASS, ...evidence.diagnostics]);
  return { ...result, ok: true, blocked: false,
    conversionStatus: SELECTED_ZONE_EVIDENCE_PASS,
    outputs: [...artifacts, ...(result.outputs || []).map((output) =>
      promotedReport(output, SELECTED_ZONE_EVIDENCE_PASS, tags))],
    logs: { stdout: unique([...tags, ...(result.logs?.stdout || [])]),
      stderr: unique([...(result.logs?.stderr || []), ...evidence.errors]) } };
}
async function noMappingResult(context, primary, converted) {
  const autoPipe = await attemptSelectedZoneAutoPipe(context, primary, converted);
  if (autoPipe.conversionStatus === STAGEDJSON_SELECTED_ZONE_PASS) {
    return promoteSelectedZoneOutput(converted, primary.name, autoPipe);
  }
  if (autoPipe.conversionStatus === SELECTED_ZONE_EVIDENCE_PASS) {
    return promoteSelectedZoneEvidenceOutput(converted, primary.name, autoPipe);
  }
  return promoteNoMappingJsonOutput(converted, primary.name, selectedZoneEvidence(autoPipe));
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
    parse: (bytes) => parseFbxWithDetailedWorkerError(bytes, workerOptions(context)),
  });
  const result = secondary ? converted : await noMappingResult(context, primary, converted);
  const terminalState = result.blocked ? 'bad'
    : [SOURCE_GRAPH_JSON_PASS, STAGEDJSON_PASS, STAGEDJSON_SELECTED_ZONE_PASS]
      .includes(result.conversionStatus) ? 'ok' : 'warning';
  context.setStatus?.(result.conversionStatus, terminalState);
  return result;
}
