import { VIBRATION_FACILITY_FIT_WORKFLOW_SCHEMA } from '../facility/fit-workflow.js';
import { VIBRATION_FACILITY_FIT_REGISTER_SCHEMA } from '../facility/fit-register.js';

export const VIBRATION_WORKSPACE_MODEL_SCHEMA = 'VibrationWorkspaceModel.v1';

const FILTER_KEYS = new Set([
  'lines',
  'caseIds',
  'statuses',
  'completenessStatuses',
  'referenceBands',
  'qualificationStates',
  'phaseEvidenceStrengths',
  'correlationEvidenceStrengths',
  'candidateForEngineeringReview',
]);
const SORT_FIELDS = new Set([
  'line',
  'caseId',
  'canonicalId',
  'status',
  'completenessStatus',
  'referenceBand',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function workspaceError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationWorkspaceModelError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function assertWorkflow(workflow) {
  if (workflow?.schema !== VIBRATION_FACILITY_FIT_WORKFLOW_SCHEMA) {
    throw workspaceError(
      'VIBRATION_WORKSPACE_WORKFLOW_SCHEMA_MISMATCH',
      `Workspace requires ${VIBRATION_FACILITY_FIT_WORKFLOW_SCHEMA}.`,
      { actual: workflow?.schema ?? null },
    );
  }
  if (workflow.register?.schema !== VIBRATION_FACILITY_FIT_REGISTER_SCHEMA
      || !Array.isArray(workflow.register.rows)) {
    throw workspaceError(
      'VIBRATION_WORKSPACE_REGISTER_INVALID',
      `Workspace requires ${VIBRATION_FACILITY_FIT_REGISTER_SCHEMA} rows.`,
    );
  }
  if (workflow.qualificationMode !== 'benchmark'
      || workflow.screeningAuthorized !== false
      || workflow.engineeringAuthority !== 'NONE') {
    throw workspaceError(
      'VIBRATION_WORKSPACE_AUTHORITY_VIOLATION',
      'Workspace accepts only the non-authorizing benchmark FIT workflow.',
      {
        qualificationMode: workflow.qualificationMode ?? null,
        screeningAuthorized: workflow.screeningAuthorized ?? null,
        engineeringAuthority: workflow.engineeringAuthority ?? null,
      },
    );
  }
  return workflow;
}

function normalizeStringList(value, field) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw workspaceError(
      'VIBRATION_WORKSPACE_FILTER_INVALID',
      `${field} must be an array of strings.`,
      { field },
    );
  }
  return new Set(value);
}

function normalizeFilters(filters = {}) {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw workspaceError('VIBRATION_WORKSPACE_FILTER_INVALID', 'Workspace filters must be an object.');
  }
  const unknown = Object.keys(filters).filter((key) => !FILTER_KEYS.has(key));
  if (unknown.length) {
    throw workspaceError(
      'VIBRATION_WORKSPACE_FILTER_UNSUPPORTED',
      `Unsupported workspace filters: ${unknown.join(', ')}.`,
      { unknown },
    );
  }
  if (filters.candidateForEngineeringReview !== undefined
      && typeof filters.candidateForEngineeringReview !== 'boolean') {
    throw workspaceError(
      'VIBRATION_WORKSPACE_FILTER_INVALID',
      'candidateForEngineeringReview must be boolean when supplied.',
    );
  }
  return {
    lines: normalizeStringList(filters.lines, 'lines'),
    caseIds: normalizeStringList(filters.caseIds, 'caseIds'),
    statuses: normalizeStringList(filters.statuses, 'statuses'),
    completenessStatuses: normalizeStringList(filters.completenessStatuses, 'completenessStatuses'),
    referenceBands: normalizeStringList(filters.referenceBands, 'referenceBands'),
    qualificationStates: normalizeStringList(filters.qualificationStates, 'qualificationStates'),
    phaseEvidenceStrengths: normalizeStringList(filters.phaseEvidenceStrengths, 'phaseEvidenceStrengths'),
    correlationEvidenceStrengths: normalizeStringList(filters.correlationEvidenceStrengths, 'correlationEvidenceStrengths'),
    candidateForEngineeringReview: filters.candidateForEngineeringReview,
  };
}

function normalizeSort(sort = {}) {
  if (!sort || typeof sort !== 'object' || Array.isArray(sort)) {
    throw workspaceError('VIBRATION_WORKSPACE_SORT_INVALID', 'Workspace sort must be an object.');
  }
  const field = sort.field ?? 'line';
  const direction = sort.direction ?? 'asc';
  if (!SORT_FIELDS.has(field) || !['asc', 'desc'].includes(direction)) {
    throw workspaceError(
      'VIBRATION_WORKSPACE_SORT_INVALID',
      'Workspace sort field or direction is unsupported.',
      { field, direction, allowedFields: [...SORT_FIELDS] },
    );
  }
  return { field, direction };
}

function matches(row, filters) {
  const checks = [
    ['lines', row.line],
    ['caseIds', row.caseId],
    ['statuses', row.status],
    ['completenessStatuses', row.completenessStatus],
    ['referenceBands', row.referenceBand],
    ['qualificationStates', row.qualificationState],
    ['phaseEvidenceStrengths', row.phaseEvidenceStrength],
    ['correlationEvidenceStrengths', row.correlationEvidenceStrength],
  ];
  for (const [filter, value] of checks) {
    if (filters[filter] && !filters[filter].has(value)) return false;
  }
  if (filters.candidateForEngineeringReview !== undefined
      && Boolean(row.candidateForEngineeringReview) !== filters.candidateForEngineeringReview) return false;
  return true;
}

function textCompare(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function sortRows(rows, sort) {
  const direction = sort.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const primary = textCompare(a[sort.field], b[sort.field]);
    if (primary) return primary * direction;
    return (textCompare(a.line, b.line)
      || textCompare(a.caseId, b.caseId)
      || textCompare(a.canonicalId, b.canonicalId)) * direction;
  });
}

export function vibrationWorkspaceRowKey(row = {}) {
  return JSON.stringify([row.line ?? null, row.caseId ?? null, row.canonicalId ?? null]);
}

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = row[field];
    if (key === null || key === undefined || key === '') continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function summary(allRows, visibleRows) {
  return {
    totalRows: allRows.length,
    visibleRows: visibleRows.length,
    calculatedRows: allRows.filter((row) => row.completenessStatus === 'CALCULATED').length,
    incompleteRows: allRows.filter((row) => row.completenessStatus === 'DATA_INCOMPLETE').length,
    calculationFailedRows: allRows.filter((row) => row.completenessStatus === 'CALCULATION_FAILED').length,
    candidateForEngineeringReviewRows: allRows.filter((row) => row.candidateForEngineeringReview).length,
    byStatus: countBy(allRows, 'status'),
    byCompleteness: countBy(allRows, 'completenessStatus'),
    byReferenceBand: countBy(allRows, 'referenceBand'),
    byQualification: countBy(allRows, 'qualificationState'),
    byPhaseEvidence: countBy(allRows, 'phaseEvidenceStrength'),
    byCorrelationEvidence: countBy(allRows, 'correlationEvidenceStrength'),
  };
}

function exactIdentity(row, target) {
  return row?.canonicalId === target.canonicalId
    && row?.line === target.line
    && row?.caseId === target.caseId;
}

function selectedDetail(workflow, selectedRow) {
  if (!selectedRow) return null;
  const operatingCase = workflow.dataset?.operatingCases?.find((row) => (
    row.line === selectedRow.line && row.caseId === selectedRow.caseId
  )) ?? null;
  const planItem = workflow.plan?.items?.find((row) => exactIdentity(row, selectedRow)) ?? null;
  const resultRow = workflow.result?.rows?.find((row) => exactIdentity(row, selectedRow)) ?? null;
  const enrichment = (workflow.dataset?.enrichment ?? []).filter((row) => (
    row.canonicalId === selectedRow.canonicalId
    && (row.caseId === undefined || row.caseId === selectedRow.caseId)
  ));

  return {
    rowKey: vibrationWorkspaceRowKey(selectedRow),
    summary: selectedRow,
    inputs: planItem?.request ? {
      values: planItem.request.inputs,
      units: planItem.request.inputUnits,
      qualificationMode: planItem.request.options?.qualificationMode ?? null,
    } : null,
    operatingCase,
    enrichment,
    evidenceQualification: resultRow?.centralResult ? {
      qualification: resultRow.centralResult.qualification ?? null,
      qualificationCoverage: resultRow.qualificationCoverage ?? null,
      screeningCandidate: resultRow.screeningCandidate ?? null,
      evidence: resultRow.centralResult.evidence ?? null,
    } : null,
    sourceTrace: resultRow?.sourceTrace ?? planItem?.sourceTrace ?? null,
    diagnostics: {
      missing: [...(selectedRow.missing ?? [])],
      invalid: [...(selectedRow.invalid ?? [])],
      errorCodes: [...(selectedRow.errorCodes ?? [])],
      centralErrors: resultRow?.errors ?? [],
    },
  };
}

export function buildVibrationWorkspaceModel(workflowInput = {}, options = {}) {
  const workflow = assertWorkflow(workflowInput);
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw workspaceError('VIBRATION_WORKSPACE_OPTIONS_INVALID', 'Workspace options must be an object.');
  }
  const unknownOptions = Object.keys(options).filter((key) => !['filters', 'sort', 'selectedRowKey'].includes(key));
  if (unknownOptions.length) {
    throw workspaceError(
      'VIBRATION_WORKSPACE_OPTION_UNSUPPORTED',
      `Unsupported workspace options: ${unknownOptions.join(', ')}.`,
      { unknown: unknownOptions },
    );
  }
  if (options.selectedRowKey !== undefined && typeof options.selectedRowKey !== 'string') {
    throw workspaceError('VIBRATION_WORKSPACE_SELECTION_INVALID', 'selectedRowKey must be a string when supplied.');
  }

  const filters = normalizeFilters(options.filters ?? {});
  const sort = normalizeSort(options.sort ?? {});
  const allRows = workflow.register.rows.map((row) => ({
    ...row,
    rowKey: vibrationWorkspaceRowKey(row),
  }));
  const visibleRows = sortRows(allRows.filter((row) => matches(row, filters)), sort);
  const selectedRow = options.selectedRowKey === undefined
    ? null
    : allRows.find((row) => row.rowKey === options.selectedRowKey) ?? null;

  return deepFreeze({
    schema: VIBRATION_WORKSPACE_MODEL_SCHEMA,
    authority: 'READ_MODEL_ONLY',
    engineeringAuthority: 'NONE',
    screeningAuthorized: false,
    qualificationMode: 'benchmark',
    sourceWorkflowSchema: workflow.schema,
    summary: summary(allRows, visibleRows),
    filters: {
      lines: filters.lines ? [...filters.lines] : null,
      caseIds: filters.caseIds ? [...filters.caseIds] : null,
      statuses: filters.statuses ? [...filters.statuses] : null,
      completenessStatuses: filters.completenessStatuses ? [...filters.completenessStatuses] : null,
      referenceBands: filters.referenceBands ? [...filters.referenceBands] : null,
      qualificationStates: filters.qualificationStates ? [...filters.qualificationStates] : null,
      phaseEvidenceStrengths: filters.phaseEvidenceStrengths ? [...filters.phaseEvidenceStrengths] : null,
      correlationEvidenceStrengths: filters.correlationEvidenceStrengths ? [...filters.correlationEvidenceStrengths] : null,
      candidateForEngineeringReview: filters.candidateForEngineeringReview ?? null,
    },
    sort,
    rows: visibleRows,
    selectedRowKey: selectedRow?.rowKey ?? null,
    detail: selectedDetail(workflow, selectedRow),
    warnings: deepFreeze([
      ...(selectedRow === null && options.selectedRowKey !== undefined ? [{
        code: 'WORKSPACE_SELECTION_NOT_FOUND',
        message: 'The selected row key does not exist in the source register.',
      }] : []),
      ...((workflow.register.warnings ?? []).map((warning) => ({ ...warning, source: 'REGISTER' }))),
    ]),
  });
}
