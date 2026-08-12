import * as XLSX from 'xlsx';
import {
  ADVANCED_ANALYSIS_EXPORT_AUTHORITY,
  ADVANCED_ANALYSIS_TOPOLOGY_EXPORT_SCHEMA,
  VIBRATION_TABLE_EXCHANGE_FORMAT,
  VIBRATION_TABLE_EXCHANGE_INTEGRITY,
  VIBRATION_TABLE_EXCHANGE_REQUIRED_METADATA,
  VIBRATION_TABLE_EXCHANGE_SCHEMA,
  VIBRATION_TABLE_EXCHANGE_SHEETS,
  deepFreezeVibrationExchange,
  vibrationTableExchangeError,
} from './schema.js';

const EXPECTED_SHEET_NAMES = Object.freeze(Object.keys(VIBRATION_TABLE_EXCHANGE_SHEETS));
const COMPLETE_ONLY_SHEETS = Object.freeze(EXPECTED_SHEET_NAMES.filter((name) => name !== 'Elements'));

function text(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function requiredText(value, field, details = {}) {
  const result = text(value);
  if (!result || !result.trim()) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_REQUIRED_VALUE',
      `${field} is required.`,
      details,
    );
  }
  return result;
}

function optionalNumber(value, field, details = {}) {
  if (value === undefined || value === null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_INVALID_NUMBER',
      `${field} must be numeric when present.`,
      { ...details, value },
    );
  }
  return number;
}

function rowsFromWorksheet(workbook, name) {
  const worksheet = workbook?.Sheets?.[name];
  if (!worksheet) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_MISSING_SHEET',
      `Required sheet ${name} is missing.`,
      { sheet: name },
    );
  }
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });
  return trimTrailingEmptyRows(rows);
}

function trimTrailingEmptyRows(rows) {
  const result = rows.map((row) => Array.isArray(row) ? row : []);
  while (result.length && result.at(-1).every((cell) => cell === '' || cell === null || cell === undefined)) {
    result.pop();
  }
  return result;
}

function assertHeader(sheetName, actualHeader) {
  const expected = VIBRATION_TABLE_EXCHANGE_SHEETS[sheetName];
  const actual = (actualHeader ?? []).map((value, index) => {
    const string = String(value ?? '');
    return index === 0 ? string.replace(/^\uFEFF/u, '') : string;
  });
  const same = actual.length === expected.length
    && expected.every((column, index) => actual[index] === column);
  if (!same) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_HEADER_MISMATCH',
      `Sheet ${sheetName} does not match the required column contract.`,
      { sheet: sheetName, expected: [...expected], actual },
    );
  }
}

function sheetBody(workbook, name) {
  const rows = rowsFromWorksheet(workbook, name);
  if (!rows.length) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_HEADER_MISMATCH',
      `Sheet ${name} is empty and has no header.`,
      { sheet: name },
    );
  }
  assertHeader(name, rows[0]);
  return rows.slice(1).filter((row) => row.some((cell) => cell !== '' && cell !== null && cell !== undefined));
}

function elementFromRow(row, rowIndex) {
  const details = { sheet: 'Elements', row: rowIndex + 2 };
  return {
    tag: text(row[0]),
    type: text(row[1]),
    line: text(row[2]),
    connectFrom: text(row[3]),
    connectTo: text(row[4]),
    dnInMm: optionalNumber(row[5], 'DN In (mm)', details),
    dnOutMm: optionalNumber(row[6], 'DN Out (mm)', details),
    lengthMm: optionalNumber(row[7], 'Length (mm)', details),
    schedule: text(row[8]),
    material: text(row[9]),
    pipingClass: text(row[10]),
    pressureClass: text(row[11]),
    catalogueAuthority: text(row[12]),
    sourceStatus: text(row[13]),
    canonicalId: requiredText(row[14], 'Canonical ID', details),
  };
}

function connectionFromRow(row, rowIndex) {
  const details = { sheet: 'Connections', row: rowIndex + 2 };
  return {
    canonicalId: requiredText(row[0], 'Canonical ID', details),
    elementType: text(row[1]),
    portRole: text(row[2]),
    portKey: text(row[3]),
    nodeId: requiredText(row[4], 'Node ID', details),
  };
}

function sourceMappingFromRow(row, rowIndex) {
  const details = { sheet: 'Source Mapping', row: rowIndex + 2 };
  return {
    canonicalId: requiredText(row[0], 'Canonical ID', details),
    componentKey: text(row[1]),
    entityId: text(row[2]),
    sourceEntityId: text(row[3]),
    sourcePath: text(row[4]),
    sourceNodeKey: text(row[5]),
    jsonPointer: text(row[6]),
    sourceStatus: text(row[7]),
    sourceHash: text(row[8]),
  };
}

function sourceReference(value, details) {
  const raw = text(value);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_INVALID_SOURCE_REFERENCE',
      'Catalogue Evidence Source Reference must contain valid JSON when present.',
      { ...details, value: raw, cause: cause?.message ?? String(cause) },
    );
  }
}

function catalogueEvidenceFromRow(row, rowIndex) {
  const details = { sheet: 'Catalogue Evidence', row: rowIndex + 2 };
  return {
    canonicalId: requiredText(row[0], 'Canonical ID', details),
    authority: text(row[1]),
    catalogueId: text(row[2]),
    catalogueVersion: text(row[3]),
    catalogueHash: text(row[4]),
    sourceHash: text(row[5]),
    recordId: text(row[6]),
    recordHash: text(row[7]),
    sourceReference: sourceReference(row[8], details),
  };
}

function metadataFromRows(rows) {
  const metadata = {};
  rows.forEach((row, index) => {
    const details = { sheet: 'Export Metadata', row: index + 2 };
    const key = requiredText(row[0], 'Metadata Key', details);
    if (Object.hasOwn(metadata, key)) {
      throw vibrationTableExchangeError(
        'VIBRATION_TABLE_EXCHANGE_DUPLICATE_METADATA_KEY',
        `Export Metadata contains duplicate key ${key}.`,
        { ...details, key },
      );
    }
    metadata[key] = row[1] ?? '';
  });
  for (const key of VIBRATION_TABLE_EXCHANGE_REQUIRED_METADATA) {
    if (!Object.hasOwn(metadata, key)) {
      throw vibrationTableExchangeError(
        'VIBRATION_TABLE_EXCHANGE_MISSING_METADATA',
        `Export Metadata is missing required key ${key}.`,
        { key },
      );
    }
  }
  return metadata;
}

function assertMetadata(metadata, elementCount) {
  if (String(metadata.Schema) !== ADVANCED_ANALYSIS_TOPOLOGY_EXPORT_SCHEMA) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_SOURCE_SCHEMA_MISMATCH',
      `Expected source schema ${ADVANCED_ANALYSIS_TOPOLOGY_EXPORT_SCHEMA}.`,
      { actual: metadata.Schema },
    );
  }
  if (String(metadata.Authority) !== ADVANCED_ANALYSIS_EXPORT_AUTHORITY) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_AUTHORITY_MISMATCH',
      `Expected export authority ${ADVANCED_ANALYSIS_EXPORT_AUTHORITY}.`,
      { actual: metadata.Authority },
    );
  }
  requiredText(metadata['Canonical Hash'], 'Canonical Hash', { sheet: 'Export Metadata' });
  requiredText(metadata['Projection Hash'], 'Projection Hash', { sheet: 'Export Metadata' });
  if (String(metadata.Ordering) !== 'DETERMINISTIC_CANONICAL_ROW_ID') {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_ORDERING_MISMATCH',
      'Export ordering must be DETERMINISTIC_CANONICAL_ROW_ID.',
      { actual: metadata.Ordering },
    );
  }
  const rowCount = Number(metadata['Row Count']);
  if (!Number.isInteger(rowCount) || rowCount < 0 || rowCount !== elementCount) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_ROW_COUNT_MISMATCH',
      'Export Metadata Row Count must equal the parsed Elements row count.',
      { declared: metadata['Row Count'], parsed: elementCount },
    );
  }
}

function assertUniqueElementIds(elements) {
  const ids = new Set();
  for (const element of elements) {
    if (ids.has(element.canonicalId)) {
      throw vibrationTableExchangeError(
        'VIBRATION_TABLE_EXCHANGE_DUPLICATE_CANONICAL_ID',
        `Duplicate Elements Canonical ID ${element.canonicalId}.`,
        { canonicalId: element.canonicalId },
      );
    }
    ids.add(element.canonicalId);
  }
  return ids;
}

function assertReferencesExist(rows, ids, sheetName) {
  for (const row of rows) {
    if (!ids.has(row.canonicalId)) {
      throw vibrationTableExchangeError(
        'VIBRATION_TABLE_EXCHANGE_ORPHAN_REFERENCE',
        `${sheetName} references unknown Canonical ID ${row.canonicalId}.`,
        { sheet: sheetName, canonicalId: row.canonicalId },
      );
    }
  }
}

function assertExactlyOnePerElement(rows, ids, sheetName) {
  const counts = new Map([...ids].map((id) => [id, 0]));
  for (const row of rows) counts.set(row.canonicalId, (counts.get(row.canonicalId) ?? 0) + 1);
  for (const [canonicalId, count] of counts) {
    if (count !== 1) {
      throw vibrationTableExchangeError(
        'VIBRATION_TABLE_EXCHANGE_CUSTODY_COVERAGE_MISMATCH',
        `${sheetName} must contain exactly one row for each Elements Canonical ID.`,
        { sheet: sheetName, canonicalId, count },
      );
    }
  }
}

function declaredExportHash(workbook) {
  const comments = text(workbook?.Props?.Comments);
  if (!comments) return null;
  const match = /^Export authority\s+(.+)$/u.exec(comments.trim());
  return match?.[1] ?? null;
}

function authorityFromMetadata(metadata, workbook) {
  return {
    canonicalHash: String(metadata['Canonical Hash']),
    projectionHash: String(metadata['Projection Hash']),
    sourceHash: text(metadata['Source Hash']),
    datasetId: text(metadata['Dataset ID']),
    datasetVersion: text(metadata['Dataset Version']),
    journalHash: text(metadata['Journal Hash']),
    activeLedgerHash: text(metadata['Active Ledger Hash']),
    sessionVersion: metadata['Session Version'] === '' || metadata['Session Version'] === undefined
      ? null
      : metadata['Session Version'],
    sourceAuthority: String(metadata.Authority),
    sourceExportHash: declaredExportHash(workbook),
  };
}

function xlsxWarnings(workbook, extraSheetNames) {
  const warnings = [{
    code: 'UPSTREAM_EXPORT_HASH_DECLARED_NOT_REVERIFIED',
    message: 'The workbook declares the upstream export hash, but this importer does not reconstruct Advanced_Analysis semanticHash material in v1.',
  }];
  if (!declaredExportHash(workbook)) {
    warnings.push({
      code: 'UPSTREAM_EXPORT_HASH_NOT_PRESENT',
      message: 'Workbook properties do not contain the expected declared upstream export hash.',
    });
  }
  if (extraSheetNames.length) {
    warnings.push({
      code: 'UNRECOGNIZED_EXTRA_SHEETS',
      message: 'Workbook contains sheets outside the v1 exchange contract; they were ignored.',
      details: { sheetNames: extraSheetNames },
    });
  }
  return warnings;
}

export function parseVibrationTableExchangeWorkbook(workbook, options = {}) {
  if (!workbook || typeof workbook !== 'object' || !Array.isArray(workbook.SheetNames)) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_INVALID_WORKBOOK',
      'A SheetJS workbook object is required.',
    );
  }
  const missing = EXPECTED_SHEET_NAMES.filter((name) => !workbook.SheetNames.includes(name));
  if (missing.length) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_MISSING_SHEET',
      `Workbook is missing required sheets: ${missing.join(', ')}.`,
      { missing },
    );
  }
  const extra = workbook.SheetNames.filter((name) => !EXPECTED_SHEET_NAMES.includes(name));

  const elementRows = sheetBody(workbook, 'Elements');
  const connectionRows = sheetBody(workbook, 'Connections');
  const sourceRows = sheetBody(workbook, 'Source Mapping');
  const catalogueRows = sheetBody(workbook, 'Catalogue Evidence');
  const metadataRows = sheetBody(workbook, 'Export Metadata');

  const elements = elementRows.map(elementFromRow);
  const connections = connectionRows.map(connectionFromRow);
  const sourceMapping = sourceRows.map(sourceMappingFromRow);
  const catalogueEvidence = catalogueRows.map(catalogueEvidenceFromRow);
  const metadata = metadataFromRows(metadataRows);

  assertMetadata(metadata, elements.length);
  const elementIds = assertUniqueElementIds(elements);
  assertReferencesExist(connections, elementIds, 'Connections');
  assertReferencesExist(sourceMapping, elementIds, 'Source Mapping');
  assertReferencesExist(catalogueEvidence, elementIds, 'Catalogue Evidence');
  assertExactlyOnePerElement(sourceMapping, elementIds, 'Source Mapping');
  assertExactlyOnePerElement(catalogueEvidence, elementIds, 'Catalogue Evidence');

  const result = {
    schema: VIBRATION_TABLE_EXCHANGE_SCHEMA,
    sourceSchema: ADVANCED_ANALYSIS_TOPOLOGY_EXPORT_SCHEMA,
    sourceFormat: VIBRATION_TABLE_EXCHANGE_FORMAT.XLSX,
    sourceSystem: 'Advanced_Analysis.3D_EDIT',
    completeExchange: true,
    integrityStatus: VIBRATION_TABLE_EXCHANGE_INTEGRITY.DECLARED_NOT_REVERIFIED,
    authority: authorityFromMetadata(metadata, workbook),
    elements,
    connections,
    sourceMapping,
    catalogueEvidence,
    metadata,
    warnings: xlsxWarnings(workbook, extra),
    sourceFileName: text(options.sourceFileName),
  };
  return assertVibrationTableExchange(deepFreezeVibrationExchange(result), options);
}

export function parseVibrationTableExchangeXlsx(bytes, options = {}) {
  if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes)) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_INVALID_XLSX_BYTES',
      'XLSX input must be an ArrayBuffer or typed-array view.',
    );
  }
  let workbook;
  try {
    workbook = XLSX.read(bytes, { type: 'array', raw: true, cellDates: false });
  } catch (cause) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_XLSX_PARSE_FAILED',
      'Unable to parse the XLSX input.',
      { cause: cause?.message ?? String(cause) },
    );
  }
  return parseVibrationTableExchangeWorkbook(workbook, options);
}

function parseCsvRows(csvText) {
  const input = String(csvText ?? '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_CSV_PARSE_FAILED',
      'CSV input ends inside a quoted field.',
    );
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return trimTrailingEmptyRows(rows);
}

export function parseVibrationTableExchangeCsv(csvText, options = {}) {
  const rows = parseCsvRows(csvText);
  if (!rows.length) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_HEADER_MISMATCH',
      'CSV input is empty.',
    );
  }
  assertHeader('Elements', rows[0]);
  const elements = rows.slice(1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map(elementFromRow);
  assertUniqueElementIds(elements);

  const result = deepFreezeVibrationExchange({
    schema: VIBRATION_TABLE_EXCHANGE_SCHEMA,
    sourceSchema: null,
    sourceFormat: VIBRATION_TABLE_EXCHANGE_FORMAT.CSV_ELEMENTS_ONLY,
    sourceSystem: 'Advanced_Analysis.3D_EDIT',
    completeExchange: false,
    integrityStatus: VIBRATION_TABLE_EXCHANGE_INTEGRITY.LIMITED_ELEMENTS_ONLY,
    authority: {
      canonicalHash: null,
      projectionHash: null,
      sourceHash: null,
      datasetId: null,
      datasetVersion: null,
      journalHash: null,
      activeLedgerHash: null,
      sessionVersion: null,
      sourceAuthority: null,
      sourceExportHash: null,
    },
    elements,
    connections: [],
    sourceMapping: [],
    catalogueEvidence: [],
    metadata: {},
    warnings: [
      {
        code: 'LIMITED_ELEMENTS_ONLY',
        message: 'Current 3D EDIT CSV contains only the Elements sheet and is not a complete certified machine exchange.',
      },
      ...COMPLETE_ONLY_SHEETS.map((sheet) => ({
        code: 'MISSING_EXCHANGE_SHEET',
        message: `CSV source does not contain ${sheet}.`,
        details: { sheet },
      })),
    ],
    sourceFileName: text(options.sourceFileName),
  });
  return assertVibrationTableExchange(result, options);
}

export function assertVibrationTableExchange(value, options = {}) {
  if (value?.schema !== VIBRATION_TABLE_EXCHANGE_SCHEMA) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_SCHEMA_MISMATCH',
      `Exchange must use ${VIBRATION_TABLE_EXCHANGE_SCHEMA}.`,
      { actual: value?.schema ?? null },
    );
  }
  if (!Array.isArray(value.elements)) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_INVALID',
      'Exchange elements must be an array.',
    );
  }
  if (options.requireCompleteExchange === true && value.completeExchange !== true) {
    throw vibrationTableExchangeError(
      'VIBRATION_TABLE_EXCHANGE_INCOMPLETE',
      'A complete multi-sheet vibration exchange is required for this operation.',
      { sourceFormat: value.sourceFormat, integrityStatus: value.integrityStatus },
    );
  }
  return value;
}
