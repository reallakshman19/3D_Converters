import { VIBRATION_TABLE_EXCHANGE_SHEETS } from '../converters/vibration/exchange/schema.js';
import {
  VIBRATION_ENRICHMENT_CSV_HEADER,
} from '../converters/vibration/tabular/enrichment.js';
import {
  VIBRATION_OPERATING_CASE_CSV_HEADER,
} from '../converters/vibration/tabular/operating-cases.js';
import {
  assertExactVibrationCsvHeader,
  nonBlankVibrationCsvRows,
  parseStrictVibrationCsvRows,
  serializeVibrationCsvRows,
  vibrationTabularInputError,
} from '../converters/vibration/tabular/csv.js';

export const VIBRATION_INTEGRITY_INPUT_TABLE = Object.freeze({
  TOPOLOGY: 'topology',
  OPERATING: 'operating',
  ENRICHMENT: 'enrichment',
});

const TABLE_CONFIG = Object.freeze({
  topology: Object.freeze({
    header: VIBRATION_TABLE_EXCHANGE_SHEETS.Elements,
    contract: 'TopologyEditTableHumanExport.Elements',
  }),
  operating: Object.freeze({
    header: VIBRATION_OPERATING_CASE_CSV_HEADER,
    contract: 'VibrationOperatingCaseCsv.v1',
  }),
  enrichment: Object.freeze({
    header: VIBRATION_ENRICHMENT_CSV_HEADER,
    contract: 'VibrationEnrichmentCsv.v1',
  }),
});

function configFor(kind) {
  const config = TABLE_CONFIG[kind];
  if (!config) {
    throw vibrationTabularInputError(
      'VIBRATION_INPUT_TABLE_KIND_UNSUPPORTED',
      `Unsupported vibration input table ${kind}.`,
      { kind },
    );
  }
  return config;
}

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function normalizeRow(row, width, rowIndex) {
  if (!Array.isArray(row) || row.length !== width) {
    throw vibrationTabularInputError(
      'VIBRATION_INPUT_TABLE_COLUMN_COUNT_MISMATCH',
      'Editable input row does not match the table column count.',
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
    rows: Object.freeze(rows.map((row, index) => normalizeRow(row, config.header.length, index + 1))),
    sourceName: metadata.sourceName ?? null,
    sourceKind: metadata.sourceKind ?? 'WORKING_TABLE',
    originalCertifiedExchange: metadata.originalCertifiedExchange === true,
    dirty: metadata.dirty === true,
  });
}

export function createEmptyVibrationIntegrityInputTable(kind) {
  return tableState(kind, []);
}

export function parseVibrationIntegrityInputCsv(kind, csvText, metadata = {}) {
  const config = configFor(kind);
  const parsed = parseStrictVibrationCsvRows(csvText);
  assertExactVibrationCsvHeader(parsed, config.header, config.contract);
  const body = nonBlankVibrationCsvRows(parsed.slice(1));
  return tableState(kind, body, {
    ...metadata,
    sourceKind: metadata.sourceKind ?? 'CSV',
    dirty: false,
  });
}

function exchangeElementRow(element) {
  return [
    element.tag,
    element.type,
    element.line,
    element.connectFrom,
    element.connectTo,
    element.dnInMm,
    element.dnOutMm,
    element.lengthMm,
    element.schedule,
    element.material,
    element.pipingClass,
    element.pressureClass,
    element.catalogueAuthority,
    element.sourceStatus,
    element.canonicalId,
  ].map(text);
}

export function createTopologyInputTableFromExchange(exchange, metadata = {}) {
  if (!exchange || !Array.isArray(exchange.elements)) {
    throw vibrationTabularInputError(
      'VIBRATION_INPUT_TOPOLOGY_EXCHANGE_INVALID',
      'Parsed topology exchange with elements is required.',
    );
  }
  return tableState('topology', exchange.elements.map(exchangeElementRow), {
    sourceName: metadata.sourceName ?? exchange.sourceFileName ?? null,
    sourceKind: metadata.sourceKind ?? exchange.sourceFormat ?? 'PARSED_EXCHANGE',
    originalCertifiedExchange: exchange.completeExchange === true,
    dirty: false,
  });
}

export function createVibrationIntegrityInputTable(kind, rows, metadata = {}) {
  return tableState(kind, rows, metadata);
}

export function serializeVibrationIntegrityInputTable(table) {
  const config = configFor(table?.kind);
  const rows = [config.header, ...(table.rows ?? [])];
  return serializeVibrationCsvRows(rows);
}

export function updateVibrationIntegrityInputCell(table, rowIndex, columnIndex, value) {
  const config = configFor(table?.kind);
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= table.rows.length) {
    throw new RangeError(`Editable input row ${rowIndex} is out of range.`);
  }
  if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= config.header.length) {
    throw new RangeError(`Editable input column ${columnIndex} is out of range.`);
  }
  const rows = table.rows.map((row) => [...row]);
  rows[rowIndex][columnIndex] = text(value);
  return tableState(table.kind, rows, { ...table, dirty: true });
}

export function addVibrationIntegrityInputRow(table) {
  const config = configFor(table?.kind);
  const rows = table.rows.map((row) => [...row]);
  rows.push(Array(config.header.length).fill(''));
  return tableState(table.kind, rows, { ...table, dirty: true });
}

export function deleteVibrationIntegrityInputRow(table, rowIndex) {
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= table.rows.length) {
    throw new RangeError(`Editable input row ${rowIndex} is out of range.`);
  }
  const rows = table.rows.filter((_, index) => index !== rowIndex).map((row) => [...row]);
  return tableState(table.kind, rows, { ...table, dirty: true });
}
