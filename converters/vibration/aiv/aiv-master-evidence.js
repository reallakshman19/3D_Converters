export const AIV_MASTER_EVIDENCE_SCHEMA = 'AivMasterEvidence.v1';

const IDENTITY_COLUMNS = Object.freeze({
  sources: Object.freeze(['Source Canonical ID', 'Operating Case']),
  assessments: Object.freeze(['Assessment Canonical ID']),
  relationships: Object.freeze(['Source Canonical ID', 'Assessment Canonical ID', 'Operating Case']),
});

function text(value) { return String(value ?? '').trim(); }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function tableValue(table, rowIndex, column) {
  const columnIndex = table?.header?.indexOf(column) ?? -1;
  return columnIndex < 0 ? '' : text(table?.rows?.[rowIndex]?.[columnIndex]);
}
function identity(tableKind, table, rowIndex) {
  const columns = IDENTITY_COLUMNS[tableKind] ?? [];
  const values = Object.fromEntries(columns.map((column) => [column, tableValue(table, rowIndex, column)]));
  if (!columns.length || columns.some((column) => !values[column])) return null;
  if (tableKind === 'sources') return {
    sourceCanonicalId: values['Source Canonical ID'],
    caseId: values['Operating Case'],
  };
  if (tableKind === 'assessments') return {
    assessmentCanonicalId: values['Assessment Canonical ID'],
  };
  return {
    sourceCanonicalId: values['Source Canonical ID'],
    assessmentCanonicalId: values['Assessment Canonical ID'],
    caseId: values['Operating Case'],
  };
}
function record(item, resolution) {
  const table = resolution?.tables?.[item.tableKind];
  const stableIdentity = identity(item.tableKind, table, item.rowIndex);
  if (!stableIdentity) return null;
  return {
    tableKind: item.tableKind,
    identity: stableIdentity,
    column: item.column,
    value: text(item.value),
    origin: item.origin ?? 'PINNED_MASTER',
    masterTable: item.masterTable ?? null,
    masterRecordId: item.masterRecordId ?? null,
    sourceDocumentId: item.sourceDocumentId ?? null,
    sourceCommit: item.sourceCommit ?? null,
  };
}
function compareRecords(left, right) {
  return left.tableKind.localeCompare(right.tableKind)
    || JSON.stringify(left.identity).localeCompare(JSON.stringify(right.identity))
    || left.column.localeCompare(right.column);
}

export function buildAivMasterEvidence(resolution) {
  if (!resolution) return null;
  const records = (resolution.resolutions ?? [])
    .map((item) => record(item, resolution))
    .filter(Boolean)
    .sort(compareRecords);
  return deepFreeze({
    schema: AIV_MASTER_EVIDENCE_SCHEMA,
    resolutionSchema: resolution.schema ?? null,
    resolvedFieldCount: records.length,
    records,
    unresolved: (resolution.unresolved ?? []).map((item) => ({ ...item })),
    policy: {
      explicitValuesOverrideMaster: resolution.policy?.explicitValuesOverrideMaster === true,
      masterOverridesAssumptions: resolution.policy?.masterOverridesAssumptions === true,
      screeningAuthorityConferred: false,
      designAuthority: false,
    },
  });
}

function matches(identityValue, expected) {
  return Object.entries(expected).every(([key, value]) => !value || text(identityValue?.[key]) === text(value));
}

export function selectAivMasterEvidence(evidence, expected = {}) {
  if (evidence?.schema !== AIV_MASTER_EVIDENCE_SCHEMA) return Object.freeze([]);
  return Object.freeze(evidence.records.filter((item) => matches(item.identity, expected)));
}
