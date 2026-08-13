import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { VIBRATION_MASTER_EXPECTED_GIT_BLOB } from './inventory-vibration-master-sources.mjs';

export const VIBRATION_MASTER_TABLE_CANDIDATE_SCHEMA = 'VibrationMasterTableCandidates.v1';
export const VIBRATION_MASTER_TABLE_MASTER_IDS = Object.freeze([
  'EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1',
  'EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1',
  'EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1',
  'EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1',
  'EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1',
  'EI_AVIFF.T4.WALL_MODIFIER.v1',
  'EI_AVIFF.APPENDIX_B.FLUID_PROPERTY_DEFAULTS.v1',
]);

const AUTHORITY = Object.freeze({
  engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false,
});

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function selectionKey(selection) {
  return selection.selectionId || selection.masterId;
}

function reviewStem(selection) {
  return selectionKey(selection).replace(/[^A-Za-z0-9._-]+/gu, '_');
}

function normalizeSha(value) {
  return String(value || '').toLowerCase().replace(/^sha(?:1|256):/u, '');
}

function loadJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function loadSelections(path) {
  const value = loadJson(path);
  if (!Array.isArray(value.selections) || value.selections.length === 0) {
    throw new TypeError('VIBRATION_MASTER_TABLE_SELECTIONS_REQUIRED');
  }
  return value.selections.map(validateSelection);
}

function validateSelection(selection) {
  if (!VIBRATION_MASTER_TABLE_MASTER_IDS.includes(selection.masterId)) {
    throw new TypeError(`VIBRATION_MASTER_TABLE_MASTER_UNSUPPORTED: ${selection.masterId}`);
  }
  if (selection.selectionId !== undefined && !/^[A-Za-z0-9._-]+$/u.test(selection.selectionId)) {
    throw new TypeError(`VIBRATION_MASTER_TABLE_SELECTION_ID_INVALID: ${selection.selectionId}`);
  }
  if (!Number.isInteger(selection.start) || !Number.isInteger(selection.end) || selection.start < 1 || selection.end < selection.start) {
    throw new TypeError(`VIBRATION_MASTER_TABLE_SELECTION_RANGE_INVALID: ${selectionKey(selection)}`);
  }
  if (selection.tableBlockId !== undefined && typeof selection.tableBlockId !== 'string') {
    throw new TypeError(`VIBRATION_MASTER_TABLE_BLOCK_ID_INVALID: ${selectionKey(selection)}`);
  }
  return selection;
}

function conversionMap(manifest) {
  if (manifest?.schema !== 'VibrationMasterApiConversion.v1' || !Array.isArray(manifest.conversions)) {
    throw new TypeError('VIBRATION_MASTER_TABLE_CONVERSION_MANIFEST_INVALID');
  }
  const map = new Map();
  for (const conversion of manifest.conversions) {
    const key = conversion.selectionId || conversion.masterId;
    if (!key || map.has(key)) throw new Error(`VIBRATION_MASTER_TABLE_CONVERSION_KEY_INVALID: ${key || 'missing'}`);
    map.set(key, conversion);
  }
  return map;
}

function parseCell(line) {
  const match = /^- (C\d+(?:-C\d+)?(?: \(R\d+-R\d+\))?): (.*)$/u.exec(line);
  return match ? { coordinate: match[1], value: match[2] } : null;
}

export function parseRecordTables(markdown) {
  const tables = [];
  let table = null;
  let row = null;
  const finish = () => {
    if (table?.rows.length) tables.push(table);
    table = null;
    row = null;
  };
  for (const line of String(markdown || '').replace(/\r\n?/gu, '\n').split('\n')) {
    const rowMatch = /^\*\*Row (\d+)\*\*$/u.exec(line);
    if (rowMatch) {
      const number = Number(rowMatch[1]);
      if (number === 1 && table?.rows.length) finish();
      if (!table) table = { rows: [] };
      if (number !== table.rows.length + 1) throw new Error('VIBRATION_MASTER_TABLE_RECORD_ROW_SEQUENCE_INVALID');
      row = { row: number, cells: [] };
      table.rows.push(row);
      continue;
    }
    if (!row) continue;
    const cell = parseCell(line);
    if (cell) {
      row.cells.push(cell);
      continue;
    }
    if (line.trim() === '') continue;
    finish();
  }
  finish();
  return tables;
}

function tableBlocks(evidence) {
  return (evidence?.blocks || []).filter((block) => block.kind === 'table');
}

function decisionMap(evidence) {
  return new Map((evidence?.tableRendering || []).map((decision) => [decision.blockId, decision]));
}

function assertConversion(selection, conversion, markdown, evidence) {
  if (!conversion) throw new Error(`VIBRATION_MASTER_TABLE_CONVERSION_MISSING: ${selectionKey(selection)}`);
  if (conversion.masterId !== selection.masterId) throw new Error('VIBRATION_MASTER_TABLE_MASTER_ID_MISMATCH');
  if (normalizeSha(conversion.sourceGitBlobSha) !== VIBRATION_MASTER_EXPECTED_GIT_BLOB) {
    throw new Error('VIBRATION_MASTER_TABLE_GIT_BLOB_MISMATCH');
  }
  if (normalizeSha(evidence?.sourceGitBlobSha) !== VIBRATION_MASTER_EXPECTED_GIT_BLOB) {
    throw new Error('VIBRATION_MASTER_TABLE_EVIDENCE_GIT_BLOB_MISMATCH');
  }
  if (conversion.pageRange?.start !== selection.start || conversion.pageRange?.end !== selection.end) {
    throw new Error('VIBRATION_MASTER_TABLE_PAGE_RANGE_MISMATCH');
  }
  if (sha256(Buffer.from(markdown, 'utf8')) !== conversion.markdownSha256) {
    throw new Error('VIBRATION_MASTER_TABLE_MARKDOWN_HASH_MISMATCH');
  }
}

function mappedRecordTables(markdown, evidence) {
  const blocks = tableBlocks(evidence);
  const decisions = decisionMap(evidence);
  const recordBlocks = blocks.filter((block) => decisions.get(block.blockId)?.renderer === 'records');
  const parsed = parseRecordTables(markdown);
  if (parsed.length !== recordBlocks.length) throw new Error('VIBRATION_MASTER_TABLE_RECORD_BLOCK_COUNT_MISMATCH');
  return recordBlocks.map((block, index) => {
    const table = parsed[index];
    if (Array.isArray(block.rows) && block.rows.length !== table.rows.length) {
      throw new Error(`VIBRATION_MASTER_TABLE_ROW_COUNT_MISMATCH: ${block.blockId}`);
    }
    if (Array.isArray(block.rows)) {
      block.rows.forEach((cells, rowIndex) => {
        if (Array.isArray(cells) && cells.length !== table.rows[rowIndex].cells.length) {
          throw new Error(`VIBRATION_MASTER_TABLE_CELL_COUNT_MISMATCH: ${block.blockId}`);
        }
      });
    }
    return { block, decision: decisions.get(block.blockId), table };
  });
}

function blockedCandidate(selection, reason, extra = {}) {
  return {
    selectionId: selection.selectionId ?? null,
    masterId: selection.masterId,
    sourceState: 'RECONCILIATION_REQUIRED',
    recoveryAction: 'TABLE_RECONCILIATION_REQUIRED',
    reason,
    pageRange: { start: selection.start, end: selection.end },
    rows: [],
    ...extra,
    authority: AUTHORITY,
  };
}

function resolveCandidate(selection, conversion, markdown, evidence) {
  assertConversion(selection, conversion, markdown, evidence);
  const blocks = tableBlocks(evidence);
  const decisions = decisionMap(evidence);
  const mapped = mappedRecordTables(markdown, evidence);
  if (selection.tableBlockId) {
    const block = blocks.find((item) => item.blockId === selection.tableBlockId);
    if (!block) return blockedCandidate(selection, 'TABLE_BLOCK_NOT_FOUND');
    const decision = decisions.get(block.blockId);
    if (decision?.renderer !== 'records') {
      return blockedCandidate(selection, 'TABLE_RENDERER_NOT_RECORDS', { tableBlockId: block.blockId, renderer: decision?.renderer ?? null });
    }
  }
  const eligible = selection.tableBlockId ? mapped.filter((item) => item.block.blockId === selection.tableBlockId) : mapped;
  if (eligible.length === 0) return blockedCandidate(selection, 'NO_RECORD_TABLE_IN_SELECTED_RANGE');
  if (eligible.length > 1) {
    return blockedCandidate(selection, 'MULTIPLE_RECORD_TABLES_REQUIRE_TABLE_BLOCK_ID', {
      availableTableBlockIds: eligible.map((item) => item.block.blockId),
    });
  }
  const chosen = eligible[0];
  return {
    selectionId: selection.selectionId ?? null,
    masterId: selection.masterId,
    sourceState: 'TABLE_CANDIDATE_RECOVERED',
    recoveryAction: 'SEMANTIC_RECONCILIATION_REQUIRED',
    pageRange: conversion.pageRange,
    sourceSha256: conversion.sourceSha256,
    sourceGitBlobSha: conversion.sourceGitBlobSha,
    requestHash: conversion.requestHash,
    markdownSha256: conversion.markdownSha256,
    converterOptionsHash: conversion.converterOptionsHash,
    tableBlockId: chosen.block.blockId,
    sourcePage: chosen.block.provenance?.page ?? null,
    renderer: chosen.decision.renderer,
    classification: chosen.decision.classification ?? null,
    rowCount: chosen.table.rows.length,
    rows: chosen.table.rows,
    valuesPreservedAsSourceStrings: true,
    semanticNormalizationApplied: false,
    authority: AUTHORITY,
  };
}

export function reconcileVibrationMasterTables(options) {
  const selections = options.selections || loadSelections(options.selectionPath);
  const conversions = conversionMap(options.conversionManifest || loadJson(options.conversionPath));
  const candidates = selections.map((raw) => {
    const selection = validateSelection(raw);
    const stem = reviewStem(selection);
    const markdown = readFileSync(resolve(options.reviewDir, `${stem}.md`), 'utf8');
    const evidence = loadJson(resolve(options.reviewDir, `${stem}.evidence.json`));
    return resolveCandidate(selection, conversions.get(selectionKey(selection)), markdown, evidence);
  });
  return {
    schema: VIBRATION_MASTER_TABLE_CANDIDATE_SCHEMA,
    candidates,
    authority: AUTHORITY,
  };
}

function parseArguments(argv) {
  const options = { selectionPath: null, conversionPath: null, reviewDir: null, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--selection') options.selectionPath = argv[++index] ?? null;
    else if (arg === '--conversion') options.conversionPath = argv[++index] ?? null;
    else if (arg === '--review-dir') options.reviewDir = argv[++index] ?? null;
    else if (arg === '--out') options.out = argv[++index] ?? null;
    else throw new TypeError(`Unknown option: ${arg}`);
  }
  if (!options.selectionPath || !options.conversionPath || !options.reviewDir || !options.out) {
    throw new TypeError('Usage: node scripts/reconcile-vibration-master-tables.mjs --selection <json> --conversion <json> --review-dir <dir> --out <json>');
  }
  return options;
}

export function runVibrationMasterTableReconciliation(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const result = reconcileVibrationMasterTables(args);
  const output = resolve(args.out);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return result;
}

const invokedAsScript = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedAsScript) runVibrationMasterTableReconciliation();
