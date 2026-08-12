import {
  assertVibrationTableExchangeShape,
} from '../exchange/schema.js';
import {
  parseVibrationTableExchangeCsv,
  parseVibrationTableExchangeXlsx,
} from '../exchange/parse.js';
import {
  parseVibrationEnrichmentCsv,
  parseVibrationOperatingCaseCsv,
} from '../tabular/index.js';
import { buildVibrationFacilityFitPreflight } from './fit-preflight.js';
import { runVibrationFacilityFitBenchmark } from './fit-workflow.js';

export const VIBRATION_FACILITY_FIT_TABULAR_WORKFLOW_SCHEMA = 'VibrationFacilityFitTabularWorkflow.v1';
export const VIBRATION_FACILITY_FIT_TABULAR_PREFLIGHT_SCHEMA = 'VibrationFacilityFitTabularPreflight.v1';

export const VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT = Object.freeze({
  PARSED_EXCHANGE: 'PARSED_EXCHANGE',
  XLSX: 'XLSX',
  CSV_ELEMENTS_ONLY: 'CSV_ELEMENTS_ONLY',
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function tabularWorkflowError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationFacilityFitTabularWorkflowError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function parseTopology(topology) {
  if (!topology || typeof topology !== 'object' || Array.isArray(topology)) {
    throw tabularWorkflowError(
      'FIT_FACILITY_TOPOLOGY_INPUT_REQUIRED',
      'topology must be an object containing format and data.',
    );
  }
  const sourceFileName = topology.sourceFileName === undefined || topology.sourceFileName === null
    ? undefined
    : String(topology.sourceFileName);
  if (topology.format === VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.PARSED_EXCHANGE) {
    return assertVibrationTableExchangeShape(topology.data);
  }
  if (topology.format === VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.XLSX) {
    return parseVibrationTableExchangeXlsx(topology.data, { sourceFileName });
  }
  if (topology.format === VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.CSV_ELEMENTS_ONLY) {
    return parseVibrationTableExchangeCsv(topology.data, { sourceFileName });
  }
  throw tabularWorkflowError(
    'FIT_FACILITY_TOPOLOGY_FORMAT_UNSUPPORTED',
    'Unsupported topology input format.',
    { format: topology.format ?? null },
  );
}

function parseOptionalCsv(value, parser) {
  if (value === undefined || value === null || value === '') return Object.freeze([]);
  return parser(value);
}

function importSummary(input, exchange, operatingCases, enrichment) {
  return {
    topologyFormat: input.topology.format,
    topologySourceFileName: exchange.sourceFileName ?? input.topology.sourceFileName ?? null,
    exchangeSchema: exchange.schema,
    exchangeIntegrityStatus: exchange.integrityStatus ?? null,
    operatingCaseCount: operatingCases.length,
    enrichmentCount: enrichment.length,
  };
}

export function parseVibrationFacilityFitTables(input = {}) {
  const exchange = parseTopology(input.topology);
  const operatingCases = parseOptionalCsv(input.operatingCaseCsv, parseVibrationOperatingCaseCsv);
  const enrichment = parseOptionalCsv(input.enrichmentCsv, parseVibrationEnrichmentCsv);
  return deepFreeze({
    exchange,
    operatingCases,
    enrichment,
    imports: importSummary(input, exchange, operatingCases, enrichment),
  });
}

export function buildVibrationFacilityFitPreflightFromTables(input = {}, options = {}) {
  const parsed = parseVibrationFacilityFitTables(input);
  const preflight = buildVibrationFacilityFitPreflight(parsed, options);
  return deepFreeze({
    schema: VIBRATION_FACILITY_FIT_TABULAR_PREFLIGHT_SCHEMA,
    authority: 'TABULAR_PREFLIGHT_ONLY',
    engineeringAuthority: 'NONE',
    screeningAuthorized: false,
    qualificationMode: 'benchmark',
    imports: parsed.imports,
    preflight,
  });
}

export function runVibrationFacilityFitBenchmarkFromTables(input = {}, options = {}) {
  const parsed = parseVibrationFacilityFitTables(input);
  const workflow = runVibrationFacilityFitBenchmark(parsed, options);

  return deepFreeze({
    schema: VIBRATION_FACILITY_FIT_TABULAR_WORKFLOW_SCHEMA,
    authority: 'TABULAR_WORKFLOW_ORCHESTRATION_ONLY',
    engineeringAuthority: 'NONE',
    screeningAuthorized: false,
    qualificationMode: 'benchmark',
    imports: parsed.imports,
    workflow,
  });
}
