import {
  AIV_ASSESSMENT_CSV_HEADER,
  AIV_ASSESSMENT_CSV_SCHEMA,
} from '../converters/vibration/aiv/assessment-csv.js';
import {
  AIV_SOURCE_CSV_HEADER,
  AIV_SOURCE_CSV_SCHEMA,
} from '../converters/vibration/aiv/source-csv.js';
import {
  AIV_SOURCE_ASSESSMENT_CSV_HEADER,
  AIV_SOURCE_ASSESSMENT_CSV_SCHEMA,
} from '../converters/vibration/aiv/source-assessment-csv.js';
import {
  assertExactVibrationCsvHeader,
  nonBlankVibrationCsvRows,
  parseStrictVibrationCsvRows,
  serializeVibrationCsvRows,
  vibrationTabularInputError,
} from '../converters/vibration/tabular/csv.js';

export const AIV_INPUT_TABLE_KIND = Object.freeze({
  SOURCES: 'sources',
  ASSESSMENTS: 'assessments',
  RELATIONSHIPS: 'relationships',
});

const TABLE_CONFIG = Object.freeze({
  sources: Object.freeze({ header: AIV_SOURCE_CSV_HEADER, contract: AIV_SOURCE_CSV_SCHEMA }),
  assessments: Object.freeze({ header: AIV_ASSESSMENT_CSV_HEADER, contract: AIV_ASSESSMENT_CSV_SCHEMA }),
  relationships: Object.freeze({
    header: AIV_SOURCE_ASSESSMENT_CSV_HEADER,
    contract: AIV_SOURCE_ASSESSMENT_CSV_SCHEMA,
  }),
});

function configFor(kind) {
  const config = TABLE_CONFIG[kind];
  if (!config) {
    throw vibrationTabularInputError(
      'AIV_INPUT_TABLE_KIND_UNSUPPORTED',
      `Unsupported AIV input table ${kind}.`,
      { kind },
    );
  }
  return config;
}

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function normalizedRow(row, width, rowIndex) {
  if (!Array.isArray(row) || row.length !== width) {
    throw vibrationTabularInputError(
      'AIV_INPUT_TABLE_COLUMN_COUNT_MISMATCH',
      'Editable AIV input row does not match the controlled table column count.',
      { row: rowIndex, expected: width, actual: Array.isArray(row) ? row.length : null },
    );
  }
  return Object.freeze(row.map(text));
}

function tableState(kind, rows, metadata = {}) {
  const config = configFor(kind);
  return Object.freeze({
    kind,
    contract: config.contract,
    header: Object.freeze([...config.header]),
    rows: Object.freeze(rows.map((row, index) => normalizedRow(row, config.header.length, index + 1))),
    sourceName: metadata.sourceName ?? null,
    sourceKind: metadata.sourceKind ?? 'WORKING_TABLE',
    benchmarkId: metadata.benchmarkId ?? null,
    dirty: metadata.dirty === true,
  });
}

function mutationState(table, rows) {
  return tableState(table.kind, rows, {
    ...table,
    sourceKind: table.benchmarkId ? 'BENCHMARK_EDITED_WORKING_COPY' : table.sourceKind,
    dirty: true,
  });
}

export function createEmptyAivInputTable(kind) {
  return tableState(kind, []);
}

export function createAivInputTable(kind, rows, metadata = {}) {
  return tableState(kind, rows, metadata);
}

export function parseAivInputCsv(kind, csvText, metadata = {}) {
  const config = configFor(kind);
  const parsed = parseStrictVibrationCsvRows(csvText);
  assertExactVibrationCsvHeader(parsed, config.header, config.contract);
  return tableState(kind, nonBlankVibrationCsvRows(parsed.slice(1)), {
    ...metadata,
    sourceKind: metadata.sourceKind ?? 'CSV',
    dirty: false,
  });
}

export function serializeAivInputTable(table) {
  const config = configFor(table?.kind);
  return serializeVibrationCsvRows([config.header, ...(table.rows ?? [])]);
}

export function updateAivInputCell(table, rowIndex, columnIndex, value) {
  const config = configFor(table?.kind);
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= table.rows.length) {
    throw new RangeError(`Editable AIV input row ${rowIndex} is out of range.`);
  }
  if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= config.header.length) {
    throw new RangeError(`Editable AIV input column ${columnIndex} is out of range.`);
  }
  const rows = table.rows.map((row) => [...row]);
  rows[rowIndex][columnIndex] = text(value);
  return mutationState(table, rows);
}

export function addAivInputRow(table) {
  const config = configFor(table?.kind);
  const rows = table.rows.map((row) => [...row]);
  rows.push(Array(config.header.length).fill(''));
  return mutationState(table, rows);
}

export function deleteAivInputRow(table, rowIndex) {
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= table.rows.length) {
    throw new RangeError(`Editable AIV input row ${rowIndex} is out of range.`);
  }
  return mutationState(table, table.rows.filter((_, index) => index !== rowIndex).map((row) => [...row]));
}
