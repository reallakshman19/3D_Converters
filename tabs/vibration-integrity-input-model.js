import { convertEngineeringUnit } from '../converters/engineering-calculations/units.js';
import { VIBRATION_TABLE_EXCHANGE_SHEETS } from '../converters/vibration/exchange/schema.js';
import { VIBRATION_ENRICHMENT_CSV_HEADER } from '../converters/vibration/tabular/enrichment.js';
import { VIBRATION_OPERATING_CASE_CSV_HEADER } from '../converters/vibration/tabular/operating-cases.js';
import {
  assertExactVibrationCsvHeader,
  nonBlankVibrationCsvRows,
  parseStrictVibrationCsvRows,
  serializeVibrationCsvRows,
  vibrationTabularInputError,
} from '../converters/vibration/tabular/csv.js';
import {
  addVibrationWorkingRow,
  createVibrationWorkingRecords,
  deleteVibrationWorkingRow,
  replaceVisibleVibrationWorkingRows,
  revertVibrationWorkingCell,
  revertVibrationWorkingTable,
  updateVibrationWorkingCell,
  vibrationWorkingCellState,
  vibrationWorkingEditCount,
  vibrationWorkingRecordsDirty,
  visibleVibrationWorkingRowIds,
  visibleVibrationWorkingRows,
} from './vibration-integrity-working-state.js';

export const VIBRATION_INTEGRITY_INPUT_TABLE = Object.freeze({
  TOPOLOGY: 'topology', OPERATING: 'operating', ENRICHMENT: 'enrichment',
});
export const VIBRATION_LOCAL_TOPOLOGY_SOURCE_STATUS = 'LOCAL_EDITED_UNVERIFIED';

const TABLE_CONFIG = Object.freeze({
  topology: Object.freeze({ header: VIBRATION_TABLE_EXCHANGE_SHEETS.Elements, contract: 'TopologyEditTableHumanExport.Elements' }),
  operating: Object.freeze({ header: VIBRATION_OPERATING_CASE_CSV_HEADER, contract: 'VibrationOperatingCaseCsv.v1' }),
  enrichment: Object.freeze({ header: VIBRATION_ENRICHMENT_CSV_HEADER, contract: 'VibrationEnrichmentCsv.v1' }),
});

const OPERATING_QUANTITIES = Object.freeze([
  Object.freeze({ value: 4, unit: 5, quantity: 'mass_flow' }),
  Object.freeze({ value: 6, unit: 7, quantity: 'density' }),
  Object.freeze({ value: 8, unit: 9, quantity: 'pressure', reference: 10 }),
  Object.freeze({ value: 11, unit: 12, quantity: 'temperature' }),
  Object.freeze({ value: 13, unit: 14, quantity: 'dynamic_viscosity' }),
  Object.freeze({ value: 15, unit: 16, quantity: 'velocity' }),
]);

const ENRICHMENT_QUANTITIES = Object.freeze({
  OUTSIDE_DIAMETER: 'length', WALL_THICKNESS: 'length', INSIDE_DIAMETER: 'length',
  MAX_UNSUPPORTED_SPAN: 'length', NATURAL_FREQUENCY: 'frequency',
});

function configFor(kind) {
  const config = TABLE_CONFIG[kind];
  if (config) return config;
  throw vibrationTabularInputError('VIBRATION_INPUT_TABLE_KIND_UNSUPPORTED', `Unsupported vibration input table ${kind}.`, { kind });
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
  return row.map(text);
}

function ignoredDirtyColumns(kind, header) {
  return kind === 'topology' ? [header.indexOf('Source Status')].filter((index) => index >= 0) : [];
}

function tableState(kind, rows, metadata = {}) {
  const config = configFor(kind);
  const normalized = rows.map((row, index) => normalizeRow(row, config.header.length, index + 1));
  const records = metadata.records ?? createVibrationWorkingRecords(kind, normalized);
  const visibleRows = visibleVibrationWorkingRows(records);
  const ignoredColumns = ignoredDirtyColumns(kind, config.header);
  const sourceKind = metadata.sourceKind ?? 'WORKING_TABLE';
  return Object.freeze({
    kind, contract: config.contract, header: Object.freeze([...config.header]), records,
    rows: visibleRows, rowIds: visibleVibrationWorkingRowIds(records),
    sourceName: metadata.sourceName ?? null, sourceKind,
    baseSourceKind: metadata.baseSourceKind ?? sourceKind,
    originalCertifiedExchange: metadata.originalCertifiedExchange === true,
    authorityDowngraded: metadata.authorityDowngraded === true,
    dirty: vibrationWorkingRecordsDirty(records, { ignoredColumns }),
    editCount: vibrationWorkingEditCount(records, { ignoredColumns }),
    nextLocalRowSequence: metadata.nextLocalRowSequence ?? 1,
  });
}

function topologyMutationRecords(table, records) {
  if (table.kind !== 'topology') return records;
  const sourceStatusIndex = table.header.indexOf('Source Status');
  const rows = visibleVibrationWorkingRows(records).map((row) => {
    const next = [...row];
    const hasWorkingData = next.some((value, index) => index !== sourceStatusIndex && text(value).trim() !== '');
    next[sourceStatusIndex] = hasWorkingData ? VIBRATION_LOCAL_TOPOLOGY_SOURCE_STATUS : '';
    return next;
  });
  return replaceVisibleVibrationWorkingRows(records, rows);
}

function mutationState(table, records, metadata = {}) {
  const topology = table.kind === 'topology';
  const nextRecords = topologyMutationRecords(table, records);
  return tableState(table.kind, visibleVibrationWorkingRows(nextRecords), {
    ...table, ...metadata, records: nextRecords,
    sourceKind: topology ? 'LOCAL_ELEMENTS_OVERRIDE' : table.sourceKind,
    authorityDowngraded: topology ? true : table.authorityDowngraded,
  });
}

function pairForColumn(table, rowIndex, columnIndex) {
  if (table.kind === 'operating') {
    return OPERATING_QUANTITIES.find((pair) => pair.value === columnIndex || pair.unit === columnIndex) ?? null;
  }
  if (table.kind !== 'enrichment' || ![4, 6].includes(columnIndex)) return null;
  const row = table.rows[rowIndex];
  if (row?.[5] !== 'NUMBER') return null;
  const quantity = ENRICHMENT_QUANTITIES[row[3]];
  return quantity ? { value: 4, unit: 6, quantity } : null;
}

function pressureOptions(row, pair) {
  if (pair.quantity !== 'pressure') return {};
  const reference = String(row[pair.reference] ?? '').trim().toLowerCase();
  return ['absolute', 'gauge'].includes(reference) ? { pressureReference: reference } : {};
}

function convertedText(value) {
  return String(Number(value.toPrecision(15)));
}

function updateRecordsForCell(table, rowIndex, columnIndex, value) {
  const pair = pairForColumn(table, rowIndex, columnIndex);
  const row = table.rows[rowIndex];
  if (!pair && table.kind === 'enrichment' && columnIndex === 6 && row?.[5] === 'NUMBER') {
    const oldUnit = text(row[6]).trim();
    const nextUnit = text(value).trim();
    if (text(row[4]).trim() && oldUnit && nextUnit && oldUnit !== nextUnit) {
      throw vibrationTabularInputError(
        'VIBRATION_INPUT_UNIT_CONTEXT_UNRESOLVED',
        `Cannot convert unit for enrichment property ${row[3]} without a known engineering quantity.`,
        { property: row[3], fromUnit: oldUnit, toUnit: nextUnit },
      );
    }
  }
  if (!pair || columnIndex !== pair.unit) {
    return updateVibrationWorkingCell(table.records, rowIndex, columnIndex, value);
  }
  const fromUnit = text(row[pair.unit]).trim();
  const toUnit = text(value).trim();
  const rawValue = text(row[pair.value]).trim();
  let records = table.records;
  if (rawValue && fromUnit && toUnit && fromUnit !== toUnit) {
    const converted = convertEngineeringUnit(Number(rawValue), pair.quantity, fromUnit, toUnit, pressureOptions(row, pair));
    records = updateVibrationWorkingCell(records, rowIndex, pair.value, convertedText(converted));
  }
  return updateVibrationWorkingCell(records, rowIndex, pair.unit, value);
}

function revertRecordsForCell(table, rowIndex, columnIndex) {
  const pair = pairForColumn(table, rowIndex, columnIndex);
  let records = revertVibrationWorkingCell(table.records, rowIndex, columnIndex);
  if (!pair) return records;
  if (pair.value !== columnIndex) records = revertVibrationWorkingCell(records, rowIndex, pair.value);
  if (pair.unit !== columnIndex) records = revertVibrationWorkingCell(records, rowIndex, pair.unit);
  return records;
}

export function createEmptyVibrationIntegrityInputTable(kind) {
  return tableState(kind, []);
}

export function parseVibrationIntegrityInputCsv(kind, csvText, metadata = {}) {
  const config = configFor(kind);
  const parsed = parseStrictVibrationCsvRows(csvText);
  assertExactVibrationCsvHeader(parsed, config.header, config.contract);
  const body = nonBlankVibrationCsvRows(parsed.slice(1));
  return tableState(kind, body, { ...metadata, sourceKind: metadata.sourceKind ?? 'CSV' });
}

function exchangeElementRow(element) {
  return [element.tag, element.type, element.line, element.connectFrom, element.connectTo, element.dnInMm,
    element.dnOutMm, element.lengthMm, element.schedule, element.material, element.pipingClass,
    element.pressureClass, element.catalogueAuthority, element.sourceStatus, element.canonicalId].map(text);
}

export function createTopologyInputTableFromExchange(exchange, metadata = {}) {
  if (!exchange || !Array.isArray(exchange.elements)) {
    throw vibrationTabularInputError('VIBRATION_INPUT_TOPOLOGY_EXCHANGE_INVALID', 'Parsed topology exchange with elements is required.');
  }
  return tableState('topology', exchange.elements.map(exchangeElementRow), {
    sourceName: metadata.sourceName ?? exchange.sourceFileName ?? null,
    sourceKind: metadata.sourceKind ?? exchange.sourceFormat ?? 'PARSED_EXCHANGE',
    originalCertifiedExchange: exchange.completeExchange === true,
  });
}

export function createVibrationIntegrityInputTable(kind, rows, metadata = {}) {
  return tableState(kind, rows, metadata);
}

export function serializeVibrationIntegrityInputTable(table) {
  const config = configFor(table?.kind);
  return serializeVibrationCsvRows([config.header, ...(table.rows ?? [])]);
}

function assertCell(table, rowIndex, columnIndex) {
  const config = configFor(table?.kind);
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= table.rows.length) {
    throw new RangeError(`Editable input row ${rowIndex} is out of range.`);
  }
  if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= config.header.length) {
    throw new RangeError(`Editable input column ${columnIndex} is out of range.`);
  }
}

export function updateVibrationIntegrityInputCell(table, rowIndex, columnIndex, value) {
  assertCell(table, rowIndex, columnIndex);
  return mutationState(table, updateRecordsForCell(table, rowIndex, columnIndex, value));
}

export function revertVibrationIntegrityInputCell(table, rowIndex, columnIndex) {
  assertCell(table, rowIndex, columnIndex);
  return mutationState(table, revertRecordsForCell(table, rowIndex, columnIndex));
}

export function revertVibrationIntegrityInputTable(table) {
  const records = revertVibrationWorkingTable(table.records);
  if (table.kind === 'topology' && table.authorityDowngraded) return mutationState(table, records);
  return tableState(table.kind, visibleVibrationWorkingRows(records), {
    ...table, records, sourceKind: table.baseSourceKind, authorityDowngraded: false,
  });
}

export function vibrationIntegrityInputCellState(table, rowIndex, columnIndex) {
  assertCell(table, rowIndex, columnIndex);
  return vibrationWorkingCellState(table.records, rowIndex, columnIndex);
}

export function addVibrationIntegrityInputRow(table) {
  const config = configFor(table?.kind);
  const added = addVibrationWorkingRow(table.records, table.kind, config.header.length, table.nextLocalRowSequence);
  return mutationState(table, added.records, { nextLocalRowSequence: added.nextSequence });
}

export function deleteVibrationIntegrityInputRow(table, rowIndex) {
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= table.rows.length) {
    throw new RangeError(`Editable input row ${rowIndex} is out of range.`);
  }
  return mutationState(table, deleteVibrationWorkingRow(table.records, rowIndex));
}
