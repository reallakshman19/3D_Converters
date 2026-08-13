import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  VIBRATION_MASTER_EXPECTED_GIT_BLOB,
  VIBRATION_MASTER_EXPECTED_SIZE_BYTES,
} from './inventory-vibration-master-sources.mjs';

export const VIBRATION_MASTER_API_DISCOVERY_SCHEMA = 'VibrationMasterApiDiscovery.v1';
export const VIBRATION_MASTER_API_CONVERSION_SCHEMA = 'VibrationMasterApiConversion.v1';
export const VIBRATION_MASTER_API_DEFAULT_BASE_URL = 'http://127.0.0.1:8765';
export const VIBRATION_MASTER_API_SOURCE_PATH = '/Common/EI - AVIFF Guidelines 2nd Edition.pdf';

export const VIBRATION_MASTER_API_TARGETS = Object.freeze([
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.GEOMETRY_SCORES.v1', query: 'Flowchart T3-3', dataType: 'RULE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.LOCATION_SCORES.v1', query: 'Location Assessment Methodology', dataType: 'RULE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1', query: 'Table T3-1', dataType: 'TABLE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1', query: 'Table T3-2', dataType: 'TABLE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1', query: 'Table T3-3', dataType: 'TABLE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.FIGURE_T3_1.v1', query: 'Figure T3-1', dataType: 'CURVE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.FIGURE_T3_2.v1', query: 'Figure T3-2', dataType: 'CURVE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.FIGURE_T3_3.v1', query: 'Figure T3-3', dataType: 'CURVE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T3.SBC.FIGURE_T3_4.v1', query: 'Figure T3-4', dataType: 'CURVE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1', query: 'T2.8', dataType: 'TABLE_OR_EQUATION' }),
  Object.freeze({ masterId: 'EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1', query: 'T2.9', dataType: 'TABLE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T4.WALL_MODIFIER.v1', query: 'Table T4-1', dataType: 'TABLE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T4.GEOMETRY_TYPES.v1', query: 'Figure T4-1', dataType: 'RULE_SCHEMA' }),
  Object.freeze({ masterId: 'EI_AVIFF.T2.4.RECIP_PD_DECISION_FLOW.v1', query: 'Flowchart T2-2', dataType: 'RULE' }),
  Object.freeze({ masterId: 'EI_AVIFF.T2.5.ROTATING_STALL_DECISION_FLOW.v1', query: 'Flowchart T2-3', dataType: 'RULE' }),
  Object.freeze({ masterId: 'EI_AVIFF.APPENDIX_B.FLUID_PROPERTY_DEFAULTS.v1', query: 'SAMPLE PARAMETERS', dataType: 'TABLE_SECTION' }),
]);

function normalizedBaseUrl(value) {
  return String(value || VIBRATION_MASTER_API_DEFAULT_BASE_URL).replace(/\/+$/u, '');
}

export function buildSearchPayload(target, sourcePath = VIBRATION_MASTER_API_SOURCE_PATH) {
  return {
    sourcePath,
    query: target.query,
    options: {
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      ocr: 'auto',
      ocrLanguage: 'eng',
      ocrConfidenceMin: 0.70,
    },
  };
}

export function buildConvertPayload(selection, sourcePath = VIBRATION_MASTER_API_SOURCE_PATH) {
  return {
    sourcePath,
    pages: { start: selection.start, end: selection.end },
    options: {
      tableMode: selection.tableMode || 'records',
      ocr: 'auto',
      ocrLanguage: 'eng',
      images: 'skip',
      headers: 'metadata',
      footers: 'metadata',
      engineeringRegions: 'auto',
    },
  };
}

function assertSourceIdentity(source) {
  if (source?.logicalPath !== VIBRATION_MASTER_API_SOURCE_PATH) {
    throw new Error(`VIBRATION_MASTER_API_SOURCE_PATH_MISMATCH: ${source?.logicalPath ?? 'missing'}`);
  }
  if (source?.sizeBytes !== VIBRATION_MASTER_EXPECTED_SIZE_BYTES) {
    throw new Error(`VIBRATION_MASTER_API_SOURCE_SIZE_MISMATCH: ${source?.sizeBytes ?? 'missing'}`);
  }
  if (!/^sha256:[0-9a-f]{64}$/u.test(String(source?.sha256 || ''))) {
    throw new Error('VIBRATION_MASTER_API_SOURCE_SHA256_INVALID');
  }
}

function sanitizeHit(hit) {
  return {
    id: hit.id,
    page: hit.page,
    itemId: hit.itemId,
    bbox: hit.bbox,
    bboxPrecision: hit.bboxPrecision,
    extraction: hit.extraction,
    confidence: hit.confidence ?? null,
  };
}

export function sanitizeSearchResult(target, result) {
  assertSourceIdentity(result.source);
  return {
    masterId: target.masterId,
    dataType: target.dataType,
    query: target.query,
    sourceSha256: result.source.sha256,
    pagesWithMatches: (result.summary?.pagesWithMatches || []).map((entry) => entry.page),
    hitCount: result.summary?.totalMatches ?? 0,
    hits: Array.isArray(result.matches) ? result.matches.map(sanitizeHit) : [],
    searchHash: result.searchHash ?? null,
    indexId: result.indexId ?? result.index?.indexId ?? null,
    cacheSource: result.index?.cacheSource ?? null,
    totalPdfPages: result.index?.totalPages ?? null,
    untrustedSearchTextOmitted: true,
  };
}

function assertConversionIdentity(result, selection) {
  assertSourceIdentity(result.source);
  const expectedBlob = VIBRATION_MASTER_EXPECTED_GIT_BLOB;
  if (result.evidence?.sourceGitBlobSha !== expectedBlob) {
    throw new Error(`VIBRATION_MASTER_API_GIT_BLOB_MISMATCH: ${result.evidence?.sourceGitBlobSha ?? 'missing'}`);
  }
  if (result.pageRange?.start !== selection.start || result.pageRange?.end !== selection.end) {
    throw new Error('VIBRATION_MASTER_API_PAGE_RANGE_MISMATCH');
  }
}

export function sanitizeConversionResult(selection, result) {
  assertConversionIdentity(result, selection);
  return {
    selectionId: selection.selectionId ?? null,
    masterId: selection.masterId,
    pageRange: result.pageRange,
    sourceSha256: result.source.sha256,
    sourceGitBlobSha: result.evidence.sourceGitBlobSha,
    requestHash: result.requestHash,
    markdownSha256: result.markdownSha256,
    converterOptionsHash: result.converterOptionsHash,
    tableRendering: result.evidence?.tableRendering || [],
    diagnostics: (result.diagnostics || []).map(({ code, severity, provenance }) => ({ code, severity, provenance })),
    rawReviewFilesRequired: true,
    figureDigitizationRequired: selection.dataType === 'CURVE',
    authority: { engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false },
  };
}

async function postJson(baseUrl, path, payload, fetchImpl = fetch) {
  const response = await fetchImpl(`${normalizedBaseUrl(baseUrl)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    const code = result?.error?.code || `HTTP_${response.status}`;
    throw new Error(`VIBRATION_MASTER_API_REQUEST_FAILED: ${code}`);
  }
  return result;
}

export async function discoverVibrationMasterSources(options = {}) {
  const targets = options.targets || VIBRATION_MASTER_API_TARGETS;
  const records = [];
  for (const target of targets) {
    const result = await postJson(options.baseUrl, '/v1/search', buildSearchPayload(target), options.fetchImpl);
    records.push(sanitizeSearchResult(target, result));
  }
  const sourceHashes = new Set(records.map((record) => record.sourceSha256));
  if (sourceHashes.size !== 1) throw new Error('VIBRATION_MASTER_API_SOURCE_SHA256_DRIFT');
  return {
    schema: VIBRATION_MASTER_API_DISCOVERY_SCHEMA,
    source: {
      logicalPath: VIBRATION_MASTER_API_SOURCE_PATH,
      sizeBytes: VIBRATION_MASTER_EXPECTED_SIZE_BYTES,
      sha256: records[0]?.sourceSha256 ?? null,
      expectedGitBlobSha1: `sha1:${VIBRATION_MASTER_EXPECTED_GIT_BLOB}`,
    },
    targets: records,
    selectionAuthority: 'EXPLICIT_CALLER_PAGE_SELECTION_REQUIRED',
  };
}

function loadSelections(selectionPath) {
  const parsed = JSON.parse(readFileSync(resolve(selectionPath), 'utf8'));
  if (!Array.isArray(parsed.selections) || !parsed.selections.length) {
    throw new TypeError('VIBRATION_MASTER_API_SELECTIONS_REQUIRED');
  }
  return parsed.selections;
}

function targetById(masterId) {
  const target = VIBRATION_MASTER_API_TARGETS.find((entry) => entry.masterId === masterId);
  if (!target) throw new TypeError(`VIBRATION_MASTER_API_SELECTION_UNKNOWN_MASTER: ${masterId}`);
  return target;
}

function validateSelection(selection) {
  if (!Number.isInteger(selection.start) || !Number.isInteger(selection.end) || selection.start < 1 || selection.end < selection.start) {
    throw new TypeError(`VIBRATION_MASTER_API_SELECTION_INVALID_RANGE: ${selection.masterId}`);
  }
  if (selection.selectionId !== undefined && !/^[A-Za-z0-9._-]+$/u.test(selection.selectionId)) {
    throw new TypeError(`VIBRATION_MASTER_API_SELECTION_ID_INVALID: ${selection.selectionId}`);
  }
  return { ...selection, dataType: targetById(selection.masterId).dataType };
}

export async function convertVibrationMasterSelections(options = {}) {
  const selections = (options.selections || loadSelections(options.selectionPath)).map(validateSelection);
  const manifests = [];
  for (const selection of selections) {
    const result = await postJson(options.baseUrl, '/v1/convert', buildConvertPayload(selection), options.fetchImpl);
    const manifest = sanitizeConversionResult(selection, result);
    const reviewDir = resolve(options.reviewDir);
    mkdirSync(reviewDir, { recursive: true });
    const stem = (selection.selectionId || selection.masterId).replace(/[^A-Za-z0-9._-]+/gu, '_');
    writeFileSync(resolve(reviewDir, `${stem}.md`), result.markdown || '', 'utf8');
    writeFileSync(resolve(reviewDir, `${stem}.evidence.json`), `${JSON.stringify(result.evidence, null, 2)}\n`, 'utf8');
    manifests.push(manifest);
  }
  return { schema: VIBRATION_MASTER_API_CONVERSION_SCHEMA, conversions: manifests };
}

function writeJson(path, value) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArguments(argv) {
  const command = argv[0];
  const options = { baseUrl: VIBRATION_MASTER_API_DEFAULT_BASE_URL, out: null, selectionPath: null, reviewDir: null };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--api') options.baseUrl = argv[++index] ?? null;
    else if (arg === '--out') options.out = argv[++index] ?? null;
    else if (arg === '--selection') options.selectionPath = argv[++index] ?? null;
    else if (arg === '--review-dir') options.reviewDir = argv[++index] ?? null;
    else throw new TypeError(`Unknown option: ${arg}`);
  }
  if (!['discover', 'convert'].includes(command) || !options.out) {
    throw new TypeError('Usage: node scripts/fetch-vibration-master-sections-via-api.mjs <discover|convert> --out <json> [--api URL] [--selection file --review-dir dir]');
  }
  if (command === 'convert' && (!options.selectionPath || !options.reviewDir)) {
    throw new TypeError('convert requires --selection and --review-dir');
  }
  return { command, ...options };
}

export async function runVibrationMasterApiClient(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const result = args.command === 'discover'
    ? await discoverVibrationMasterSources(args)
    : await convertVibrationMasterSelections(args);
  writeJson(args.out, result);
  return result;
}

const invokedAsScript = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedAsScript) await runVibrationMasterApiClient();
