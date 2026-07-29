import { getConverterById } from './converter-registry.js?v=20260617-basic-glb-3';
import { run as runBaseFbxToStagedJson } from './converters/fbx-to-stagedjson.js?v=20260729-fbx2-direct-pipe-1';
import { canonicalJson } from './converters/fbx/canonical-json.js';
import { buildMappingWorklist } from './converters/fbx/mapping-worklist.js';
import { buildReviewBundle } from './converters/fbx/mapping-review-bundle.js';
import { parseFbxInWorker } from './converters/fbx/parser-client.js';
import { loadBrowserParserEvidence } from './converters/fbx/parser-provenance.js';
import { reviewShardCsv } from './converters/fbx/review-execution/review-csv.js';

export const FBX_CONVERT_OPERATION = 'Convert with approved mapping';
export const FBX_REVIEW_OPERATION = 'Create mapping review bundle';
const DEFAULT_REVIEW_SHARD_SIZE = 500;

function findInput(context, role) {
  return context.inputFiles?.find((file) => file.role === role);
}

function inputBytes(file) {
  if (file?.bytes instanceof Uint8Array) return file.bytes;
  if (file?.bytes instanceof ArrayBuffer) return new Uint8Array(file.bytes);
  if (ArrayBuffer.isView(file?.bytes)) {
    return new Uint8Array(file.bytes.buffer, file.bytes.byteOffset, file.bytes.byteLength);
  }
  throw new Error('FBX input is required.');
}

function baseName(name) {
  return String(name || 'model.fbx').replace(/\.[^.]+$/, '') || 'model';
}

function positiveInteger(value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('Review Items per Shard must be a positive integer.');
  }
  return parsed;
}

function jsonOutput(name, value) {
  return { name, text: canonicalJson(value), mime: 'application/json;charset=utf-8' };
}

function csvOutput(name, text) {
  return { name, text, mime: 'text/csv;charset=utf-8' };
}

function reviewDiagnostics() {
  return [
    'PARSE_PASS',
    'MAPPING_WORKLIST_PASS',
    'REVIEW_BUNDLE_PASS',
    'BROWSER_REFERENCE_EXECUTION',
    'BOUNDED_MEMORY_CLI_NOT_EXECUTED',
  ];
}

function reviewReport(worklist, bundle, shards) {
  return {
    schema: 'FbxBrowserReviewReport.v1',
    status: 'MAPPING_REVIEW_READY',
    executionStrategy: 'BROWSER_REFERENCE_IN_MEMORY',
    boundedMemory: false,
    worklistId: worklist.worklistId,
    bundleId: bundle.bundleId,
    workItemCount: worklist.workItems.length,
    shardCount: shards.length,
    diagnostics: reviewDiagnostics(),
  };
}

function appendShardOutputs(outputs, bundle, shards) {
  for (const shard of shards) {
    const metadata = bundle.shards.find((entry) => entry.shardId === shard.shardId);
    if (!metadata) throw new Error(`Review bundle lacks shard metadata for ${shard.shardId}.`);
    outputs.push(jsonOutput(metadata.fileName, shard));
    outputs.push(csvOutput(metadata.fileName.replace(/\.json$/i, '.csv'), reviewShardCsv(shard)));
  }
}

async function createBrowserReview(context) {
  const primary = findInput(context, 'primary');
  const bytes = inputBytes(primary);
  const stem = baseName(primary.name);
  const maxItems = positiveInteger(context.options?.reviewMaxItemsPerShard, DEFAULT_REVIEW_SHARD_SIZE);
  context.setStatus?.('Parsing FBX for mapping review...', 'running');
  const parserEvidence = await loadBrowserParserEvidence();
  const graph = await parseFbxInWorker(bytes, { signal: context.signal });
  context.setStatus?.('Building deterministic mapping review bundle...', 'running');
  const worklist = await buildMappingWorklist({ bytes, graph, parserEvidence });
  const { bundle, shards } = await buildReviewBundle(worklist, maxItems);
  const outputs = [
    jsonOutput(`${stem}.fbx-source-graph.json`, graph),
    jsonOutput(`${stem}.fbx-mapping-worklist.json`, worklist),
    jsonOutput('manifest.json', bundle),
    jsonOutput(`${stem}.fbx-browser-review-report.json`, reviewReport(worklist, bundle, shards)),
  ];
  appendShardOutputs(outputs, bundle, shards);
  context.setStatus?.('MAPPING_REVIEW_READY', 'ok');
  return {
    ok: true,
    conversionStatus: 'MAPPING_REVIEW_READY',
    outputs,
    logs: { stdout: reviewDiagnostics(), stderr: [] },
  };
}

export async function runFbxWithReviewUi(context = {}, baseRun = runBaseFbxToStagedJson) {
  const operation = context.options?.fbxOperation || FBX_CONVERT_OPERATION;
  if (operation === FBX_CONVERT_OPERATION) return baseRun(context);
  if (operation !== FBX_REVIEW_OPERATION) throw new Error(`Unsupported FBX operation: ${operation}`);
  try {
    return await createBrowserReview(context);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    context.setStatus?.('BLOCKED_MAPPING_REVIEW', 'error');
    throw new Error(`BLOCKED_MAPPING_REVIEW ${detail}`);
  }
}

function appendReviewOptions(converter) {
  const existing = Array.isArray(converter.options) ? converter.options : [];
  const retained = existing.filter((option) => !['fbxOperation', 'reviewMaxItemsPerShard'].includes(option.key));
  converter.options = [
    ...retained,
    {
      key: 'fbxOperation',
      label: 'FBX Workflow',
      type: 'select',
      options: [FBX_CONVERT_OPERATION, FBX_REVIEW_OPERATION],
    },
    {
      key: 'reviewMaxItemsPerShard',
      label: 'Review Items per Shard',
      type: 'number',
      step: '1',
    },
  ];
}

export function installFbxReviewUiAddon() {
  const converter = getConverterById('fbx_to_stagedjson');
  if (!converter || converter.__fbxReviewUiAddonInstalled) return false;
  converter.defaults = {
    ...(converter.defaults || {}),
    fbxOperation: FBX_CONVERT_OPERATION,
    reviewMaxItemsPerShard: DEFAULT_REVIEW_SHARD_SIZE,
  };
  appendReviewOptions(converter);
  converter.description = 'Convert FBX with an approved mapping package, or create a deterministic non-authoritative mapping review bundle in the browser. Bounded-memory review execution remains available through the Node CLI.';
  converter.run = (context = {}) => runFbxWithReviewUi(context, runBaseFbxToStagedJson);
  converter.__fbxReviewUiAddonInstalled = true;
  return true;
}
