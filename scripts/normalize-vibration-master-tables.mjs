import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { VIBRATION_MASTER_EXPECTED_GIT_BLOB } from './inventory-vibration-master-sources.mjs';

export const VIBRATION_MASTER_TABLE_MAPPING_SCHEMA = 'VibrationMasterTableSemanticMapping.v1';
export const VIBRATION_MASTER_TABLE_NORMALIZED_SCHEMA = 'VibrationMasterTableNormalizedCandidates.v1';
const CANDIDATE_SCHEMA = 'VibrationMasterTableCandidates.v1';
const APPENDIX_B_ID = 'EI_AVIFF.APPENDIX_B.FLUID_PROPERTY_DEFAULTS.v1';
const TYPES = Object.freeze(['string', 'decimal', 'enum']);
const AUTHORITY = Object.freeze({ engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false });
const DECIMAL = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))$/u;
const COORDINATE = /^C\d+$/u;

const loadJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const keyOf = (value) => value.selectionId || value.masterId;
const cleanSha = (value) => String(value || '').toLowerCase().replace(/^sha(?:1|256):/u, '');
const sameRange = (a, b) => a?.start === b?.start && a?.end === b?.end;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function hashMapping(mapping) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonical(mapping))).digest('hex')}`;
}

function assertAuthority(authority) {
  const valid = authority?.engineeringAuthority === 'NONE'
    && authority?.screeningAuthority === 'NOT_AUTHORIZED'
    && authority?.designAuthority === false;
  if (!valid) throw new Error('VIBRATION_MASTER_TABLE_AUTHORITY_MISMATCH');
}

function assertCandidate(candidate) {
  if (candidate?.sourceState !== 'TABLE_CANDIDATE_RECOVERED') throw new Error(`VIBRATION_MASTER_TABLE_CANDIDATE_NOT_RECOVERED: ${keyOf(candidate || {})}`);
  if (cleanSha(candidate.sourceGitBlobSha) !== VIBRATION_MASTER_EXPECTED_GIT_BLOB) throw new Error('VIBRATION_MASTER_TABLE_NORMALIZE_GIT_BLOB_MISMATCH');
  const valid = candidate.recoveryAction === 'SEMANTIC_RECONCILIATION_REQUIRED'
    && candidate.renderer === 'records' && candidate.tableBlockId
    && Array.isArray(candidate.rows) && candidate.rows.length > 0
    && candidate.valuesPreservedAsSourceStrings === true
    && candidate.semanticNormalizationApplied === false;
  if (!valid) throw new Error('VIBRATION_MASTER_TABLE_CANDIDATE_STRUCTURE_INVALID');
  assertAuthority(candidate.authority);
}

function validateField(field, names, coordinates) {
  if (!COORDINATE.test(String(field?.coordinate || ''))) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_COORDINATE_INVALID');
  if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(String(field?.field || ''))) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_FIELD_INVALID');
  if (!TYPES.includes(field.valueType)) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_TYPE_INVALID');
  if (names.has(field.field) || coordinates.has(field.coordinate)) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_FIELD_DUPLICATE');
  if (!Object.hasOwn(field, 'unit')) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_UNIT_REQUIRED');
  if (field.unit !== null && (typeof field.unit !== 'string' || !field.unit.trim())) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_UNIT_INVALID');
  if (field.valueType === 'enum') {
    const values = field.allowedValues;
    if (!Array.isArray(values) || values.length === 0) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_ENUM_VALUES_REQUIRED');
    if (values.some((value) => typeof value !== 'string') || new Set(values).size !== values.length) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_ENUM_VALUES_INVALID');
  }
  names.add(field.field); coordinates.add(field.coordinate);
}

function validateRowRule(rule) {
  if (!Number.isInteger(rule?.row) || rule.row < 1) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_ROW_INVALID');
  if (!['header', 'data', 'ignore'].includes(rule.disposition)) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_ROW_DISPOSITION_INVALID');
  if (rule.expectedCells !== undefined && !Array.isArray(rule.expectedCells)) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_EXPECTATIONS_INVALID');
  if (rule.disposition === 'header' && (!Array.isArray(rule.expectedCells) || !rule.expectedCells.length)) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_HEADER_EXPECTATIONS_REQUIRED');
  for (const item of rule.expectedCells || []) {
    if (!COORDINATE.test(String(item?.coordinate || '')) || typeof item.equals !== 'string') throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_EXPECTATION_INVALID');
  }
}

function validateMapping(mapping) {
  if (mapping?.reviewStatus !== 'REVIEWED') throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_NOT_REVIEWED');
  if (!mapping.masterId || !mapping.tableBlockId || !mapping.markdownSha256) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_IDENTITY_REQUIRED');
  if (cleanSha(mapping.sourceGitBlobSha) !== VIBRATION_MASTER_EXPECTED_GIT_BLOB) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_GIT_BLOB_MISMATCH');
  if (!Array.isArray(mapping.fields) || !mapping.fields.length) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_FIELDS_REQUIRED');
  if (!Array.isArray(mapping.rowRules) || !mapping.rowRules.length) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_ROWS_REQUIRED');
  const names = new Set(); const coordinates = new Set();
  mapping.fields.forEach((field) => validateField(field, names, coordinates));
  mapping.rowRules.forEach(validateRowRule);
  if (new Set(mapping.rowRules.map(({ row }) => row)).size !== mapping.rowRules.length) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_ROW_DUPLICATE');
  return mapping;
}

function mappingMap(document) {
  if (document?.schema !== VIBRATION_MASTER_TABLE_MAPPING_SCHEMA || !Array.isArray(document.mappings)) throw new TypeError('VIBRATION_MASTER_TABLE_MAPPING_DOCUMENT_INVALID');
  const map = new Map();
  for (const raw of document.mappings) {
    const mapping = validateMapping(raw); const key = keyOf(mapping);
    if (map.has(key)) throw new TypeError(`VIBRATION_MASTER_TABLE_MAPPING_DUPLICATE: ${key}`);
    map.set(key, mapping);
  }
  return map;
}

function assertBinding(candidate, mapping) {
  if (mapping.masterId !== candidate.masterId || (mapping.selectionId ?? null) !== (candidate.selectionId ?? null)) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_CANDIDATE_ID_MISMATCH');
  if (mapping.tableBlockId !== candidate.tableBlockId || mapping.markdownSha256 !== candidate.markdownSha256) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_SOURCE_BINDING_MISMATCH');
  if (!sameRange(mapping.pageRange, candidate.pageRange)) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_PAGE_RANGE_MISMATCH');
  if (cleanSha(mapping.sourceGitBlobSha) !== cleanSha(candidate.sourceGitBlobSha)) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_SOURCE_BLOB_MISMATCH');
}

const cellsOf = (row) => new Map((row.cells || []).map(({ coordinate, value }) => [coordinate, value]));

function assertLiterals(row, rule) {
  const cells = cellsOf(row);
  for (const item of rule.expectedCells || []) {
    if (!cells.has(item.coordinate) || cells.get(item.coordinate) !== item.equals) throw new Error(`VIBRATION_MASTER_TABLE_MAPPING_LITERAL_MISMATCH: R${row.row}:${item.coordinate}`);
  }
}

function typed(raw, field) {
  if (typeof raw !== 'string') throw new Error('VIBRATION_MASTER_TABLE_SOURCE_VALUE_NOT_STRING');
  if (field.valueType === 'string') return raw;
  if (field.valueType === 'enum') {
    if (!field.allowedValues.includes(raw)) throw new Error(`VIBRATION_MASTER_TABLE_ENUM_VALUE_REJECTED: ${field.field}`);
    return raw;
  }
  if (!DECIMAL.test(raw)) throw new Error(`VIBRATION_MASTER_TABLE_DECIMAL_INVALID: ${field.field}`);
  const value = Number(raw); if (!Number.isFinite(value)) throw new Error(`VIBRATION_MASTER_TABLE_DECIMAL_NONFINITE: ${field.field}`);
  return value;
}

function normalizeRow(row, fields) {
  const cells = cellsOf(row); const values = {};
  for (const field of fields) {
    if (!cells.has(field.coordinate)) throw new Error(`VIBRATION_MASTER_TABLE_SOURCE_CELL_MISSING: R${row.row}:${field.coordinate}`);
    const raw = cells.get(field.coordinate);
    values[field.field] = { value: typed(raw, field), rawSource: raw, valueType: field.valueType, unit: field.unit };
  }
  return { sourceRow: row.row, values };
}

function normalizeRows(candidate, mapping) {
  const rules = new Map(mapping.rowRules.map((rule) => [rule.row, rule]));
  if (rules.size !== candidate.rows.length) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_ROW_COVERAGE_MISMATCH');
  const rows = [];
  for (const row of candidate.rows) {
    const rule = rules.get(row.row); if (!rule) throw new Error(`VIBRATION_MASTER_TABLE_MAPPING_ROW_RULE_MISSING: ${row.row}`);
    assertLiterals(row, rule); if (rule.disposition === 'data') rows.push(normalizeRow(row, mapping.fields));
  }
  if (!rows.length) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_NO_DATA_ROWS');
  return rows;
}

function normalizeCandidate(candidate, mapping) {
  assertCandidate(candidate); assertBinding(candidate, mapping);
  return {
    selectionId: candidate.selectionId ?? null, masterId: candidate.masterId,
    sourceState: 'TABLE_MASTER_CANDIDATE_NORMALIZED', recoveryAction: 'QUALIFICATION_REQUIRED',
    libraryRole: candidate.masterId === APPENDIX_B_ID ? 'OPTIONAL_ASSUMPTION_LIBRARY' : 'ENGINEERING_TABLE_CANDIDATE',
    pageRange: candidate.pageRange, sourceGitBlobSha: candidate.sourceGitBlobSha,
    sourceSha256: candidate.sourceSha256 ?? null, markdownSha256: candidate.markdownSha256,
    tableBlockId: candidate.tableBlockId, sourcePage: candidate.sourcePage ?? null,
    mappingHash: hashMapping(mapping),
    fields: mapping.fields.map(({ coordinate, field, valueType, unit }) => ({ coordinate, field, valueType, unit })),
    rows: normalizeRows(candidate, mapping), rawSourceStringsPreserved: true,
    semanticNormalizationApplied: true, qualificationStatus: 'NOT_QUALIFIED', authority: AUTHORITY,
  };
}

export function normalizeVibrationMasterTables(options) {
  const document = options.candidatesDocument || loadJson(options.candidatesPath);
  if (document?.schema !== CANDIDATE_SCHEMA || !Array.isArray(document.candidates)) throw new TypeError('VIBRATION_MASTER_TABLE_CANDIDATES_DOCUMENT_INVALID');
  assertAuthority(document.authority);
  const mappings = mappingMap(options.mappingDocument || loadJson(options.mappingPath));
  const candidates = document.candidates.map((candidate) => {
    const mapping = mappings.get(keyOf(candidate));
    if (!mapping) throw new Error(`VIBRATION_MASTER_TABLE_MAPPING_MISSING: ${keyOf(candidate)}`);
    return normalizeCandidate(candidate, mapping);
  });
  if (mappings.size !== candidates.length) throw new Error('VIBRATION_MASTER_TABLE_MAPPING_UNUSED');
  return { schema: VIBRATION_MASTER_TABLE_NORMALIZED_SCHEMA, candidates, authority: AUTHORITY };
}

function parseArguments(argv) {
  const options = { candidatesPath: null, mappingPath: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--candidates') options.candidatesPath = argv[++i] ?? null;
    else if (argv[i] === '--mapping') options.mappingPath = argv[++i] ?? null;
    else if (argv[i] === '--out') options.out = argv[++i] ?? null;
    else throw new TypeError(`Unknown option: ${argv[i]}`);
  }
  if (!options.candidatesPath || !options.mappingPath || !options.out) throw new TypeError('Usage: node scripts/normalize-vibration-master-tables.mjs --candidates <json> --mapping <json> --out <json>');
  return options;
}

export function runVibrationMasterTableNormalization(argv = process.argv.slice(2)) {
  const args = parseArguments(argv); const result = normalizeVibrationMasterTables(args);
  const output = resolve(args.out); mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8'); return result;
}

const invoked = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invoked) runVibrationMasterTableNormalization();
