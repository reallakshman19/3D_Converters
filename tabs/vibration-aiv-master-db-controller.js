import { parseVibrationTableExchangeXlsx } from '../converters/vibration/exchange/parse.js';
import { parseAivMasterDatabase } from '../converters/vibration/aiv/aiv-master-db.js';
import { resolveAivTablesFromMasterDb } from '../converters/vibration/aiv/aiv-master-db-resolver.js';
import {
  AIV_MASTER_DB_REFERENCE,
  calculateAivGitBlobSha1,
} from '../converters/vibration/aiv/aiv-master-db-reference.js';
import { createAivInputTable } from './vibration-aiv-input-model.js';

function error(code, message, details = {}) {
  const value = new Error(message);
  value.name = 'AivMasterDbUiError';
  value.code = code;
  value.details = Object.freeze({ ...details });
  return value;
}
function fileName(file) { return String(file?.name ?? '').trim(); }
function currentTopology(state) {
  if (state.topology?.elements) return state.topology;
  const input = state.topologyInput;
  if (input?.format === 'PARSED_EXCHANGE' || input?.format === 'FLARE_NETWORK') return input.data;
  if (input?.format === 'XLSX') {
    return parseVibrationTableExchangeXlsx(input.data, {
      sourceFileName: input.sourceFileName === undefined ? undefined : String(input.sourceFileName),
    });
  }
  return null;
}
function tableFromResolution(table) {
  return createAivInputTable(table.kind, table.rows, {
    sourceName: table.sourceName,
    sourceKind: table.sourceKind,
    benchmarkId: table.benchmarkId,
    dirty: table.dirty,
  });
}
function formatError(value) {
  return `${value?.code ? `${value.code}: ` : ''}${String(value?.message || value)}`;
}

async function verifiedTexts(fileList) {
  const expected = AIV_MASTER_DB_REFERENCE.files;
  const byName = new Map();
  for (const file of Array.from(fileList ?? [])) {
    const name = fileName(file);
    if (name in expected) {
      if (byName.has(name)) throw error('AIV_MASTER_FILE_DUPLICATE', `Duplicate AIV master file ${name}.`);
      byName.set(name, file);
    }
  }
  const missing = Object.keys(expected).filter((name) => !byName.has(name));
  if (missing.length) throw error('AIV_MASTER_PACKAGE_INCOMPLETE', `Select the complete seven-file AIV master package. Missing: ${missing.join(', ')}.`, { missing });
  const texts = {};
  const verification = {};
  for (const [name, expectedBlob] of Object.entries(expected)) {
    const bytes = new Uint8Array(await byName.get(name).arrayBuffer());
    const rawBlob = await calculateAivGitBlobSha1(bytes);
    const rawText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const canonicalText = rawText.replace(/\r\n/g, '\n');
    const canonicalBlob = rawBlob === expectedBlob ? rawBlob
      : await calculateAivGitBlobSha1(new TextEncoder().encode(canonicalText));
    if (canonicalBlob !== expectedBlob) {
      throw error('AIV_MASTER_GIT_BLOB_MISMATCH', `${name} does not match the approved pinned master blob.`, { name, expectedBlob, actualBlob: rawBlob });
    }
    texts[name] = rawBlob === expectedBlob ? rawText : canonicalText;
    verification[name] = Object.freeze({
      expectedBlob, actualBlob: canonicalBlob,
      status: rawBlob === expectedBlob ? 'MATCH' : 'MATCH_EOL_NORMALIZED',
    });
  }
  return { texts, verification };
}

function tableColumnIndex(table, column) {
  return table?.header?.indexOf(column) ?? -1;
}
function rebuildTable(table, rows) {
  return createAivInputTable(table.kind, rows, {
    sourceName: table.sourceName,
    sourceKind: table.sourceKind,
    benchmarkId: table.benchmarkId,
    dirty: table.dirty,
  });
}
function filteredResolution(resolution, predicate) {
  if (!resolution) return null;
  const resolutions = resolution.resolutions.filter((item) => !predicate(item));
  return Object.freeze({ ...resolution, resolutions: Object.freeze(resolutions), resolvedFieldCount: resolutions.length });
}
function shiftedAfterDelete(resolution, tableKind, rowIndex, deletedAssessmentId) {
  if (!resolution) return null;
  const resolutions = resolution.resolutions.flatMap((item) => {
    if (item.tableKind !== tableKind) return [item];
    if (item.rowIndex === rowIndex) return [];
    return [{ ...item, rowIndex: item.rowIndex > rowIndex ? item.rowIndex - 1 : item.rowIndex }];
  });
  const unresolved = (resolution.unresolved ?? []).flatMap((item) => {
    if (item.tableKind !== tableKind) return [item];
    if (item.rowIndex === rowIndex) return [];
    return [{ ...item, rowIndex: item.rowIndex > rowIndex ? item.rowIndex - 1 : item.rowIndex }];
  });
  const discovered = (resolution.discoveredAssessmentCanonicalIds ?? [])
    .filter((id) => id !== deletedAssessmentId);
  return Object.freeze({
    ...resolution,
    resolutions: Object.freeze(resolutions.map(Object.freeze)),
    unresolved: Object.freeze(unresolved.map(Object.freeze)),
    resolvedFieldCount: resolutions.length,
    discoveredAssessmentCanonicalIds: Object.freeze(discovered),
    discoveredAssessmentCandidateCount: discovered.length,
  });
}

export function createAivMasterDbController({ state, render, clearReadiness }) {
  function clearResolution({ clearDerivedValues = false } = {}) {
    const resolution = state.masterResolution;
    if (clearDerivedValues && resolution) {
      const discovered = new Set(resolution.discoveredAssessmentCanonicalIds ?? []);
      const next = {};
      for (const [kind, table] of Object.entries(state.tables)) {
        const rows = table.rows.map((row) => [...row]);
        for (const item of resolution.resolutions) {
          if (item.tableKind !== kind) continue;
          const columnIndex = tableColumnIndex(table, item.column);
          if (rows[item.rowIndex] && columnIndex >= 0) rows[item.rowIndex][columnIndex] = '';
        }
        if (kind === 'assessments' && discovered.size) {
          const idIndex = tableColumnIndex(table, 'Assessment Canonical ID');
          next[kind] = rebuildTable(table, rows.filter((row) => !discovered.has(String(row[idIndex] ?? '').trim())));
        } else next[kind] = rebuildTable(table, rows);
      }
      state.tables = next;
    }
    state.masterResolution = null;
  }

  async function loadFiles(fileList) {
    state.masterLoadState = 'LOADING';
    state.error = null;
    render();
    try {
      const { texts, verification } = await verifiedTexts(fileList);
      state.masterDb = parseAivMasterDatabase(texts, verification);
      state.masterLoadState = 'VERIFIED';
      clearReadiness();
    } catch (value) {
      state.masterDb = null;
      state.masterLoadState = 'ERROR';
      state.error = formatError(value);
    }
    render();
  }

  function apply() {
    try {
      if (!state.masterDb) throw error('AIV_MASTER_DB_NOT_LOADED', 'Load and verify the pinned AIV master package first.');
      clearResolution({ clearDerivedValues: true });
      const topology = currentTopology(state);
      if (!topology?.elements?.length) throw error('AIV_MASTER_TOPOLOGY_REQUIRED', 'Load/import topology before applying AIV master data.');
      const resolution = resolveAivTablesFromMasterDb({ tables: state.tables, topology, masterDb: state.masterDb });
      state.tables = {
        sources: tableFromResolution(resolution.tables.sources),
        assessments: tableFromResolution(resolution.tables.assessments),
        relationships: tableFromResolution(resolution.tables.relationships),
      };
      state.masterResolution = resolution;
      state.error = null;
      clearReadiness();
    } catch (value) {
      state.error = formatError(value);
    }
    render();
  }

  function prepareUserEdit(tableKind, rowIndex, columnIndex) {
    const table = state.tables?.[tableKind];
    const column = table?.header?.[columnIndex];
    if (!column || !state.masterResolution) return table;
    const invalidatesRow = (tableKind === 'sources' && column === 'Source Canonical ID')
      || (tableKind === 'assessments' && ['Assessment Canonical ID', 'Assessment Type'].includes(column));
    if (!invalidatesRow) {
      state.masterResolution = filteredResolution(state.masterResolution, (item) => (
        item.tableKind === tableKind && item.rowIndex === rowIndex && item.column === column
      ));
      return table;
    }
    const rows = table.rows.map((row) => [...row]);
    for (const item of state.masterResolution.resolutions) {
      if (item.tableKind !== tableKind || item.rowIndex !== rowIndex) continue;
      const index = tableColumnIndex(table, item.column);
      if (index >= 0 && index !== columnIndex) rows[rowIndex][index] = '';
    }
    state.masterResolution = filteredResolution(state.masterResolution, (item) => (
      item.tableKind === tableKind && item.rowIndex === rowIndex
    ));
    return rebuildTable(table, rows);
  }

  function noteRowDeleted(tableKind, rowIndex) {
    const table = state.tables?.[tableKind];
    const idIndex = tableKind === 'assessments' ? tableColumnIndex(table, 'Assessment Canonical ID') : -1;
    const deletedAssessmentId = idIndex >= 0 ? String(table.rows?.[rowIndex]?.[idIndex] ?? '').trim() : '';
    state.masterResolution = shiftedAfterDelete(state.masterResolution, tableKind, rowIndex, deletedAssessmentId);
  }

  return Object.freeze({ loadFiles, apply, clearResolution, prepareUserEdit, noteRowDeleted });
}
