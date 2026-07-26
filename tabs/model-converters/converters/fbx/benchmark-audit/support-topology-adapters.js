import { fail, requireArray, requireText } from './audit-utils.js';
import { occurrence, reconciliationInput, requireSchema, sorted, terminal } from './adapter-common.js';

export function adaptSupportBenchmarkReport(report) {
  const value = requireSchema(report, 'FbxSupportBenchmarkReport.v1', 'supportReport');
  const rows = requireArray(value.ledgerEntries, 'supportReport.ledgerEntries');
  const refs = uniqueRecordOccurrences(rows, 'reference');
  const actuals = uniqueRecordOccurrences(rows, 'actual');
  const terminals = rows.map(supportTerminal);
  if (value.coverage.invariantsPassed !== true) fail('BLOCKED_AUDIT_COVERAGE', 'support report coverage invariants did not pass.');
  if (!refs.length && !actuals.length && value.summary.status !== 'NOT_APPLICABLE') {
    fail('BLOCKED_AUDIT_COVERAGE', 'zero-support report must be NOT_APPLICABLE.');
  }
  return reconciliationInput('support', 'SUPPORT', 'FbxSupportBenchmarkReport.v1', refs, actuals, terminals);
}
function uniqueRecordOccurrences(rows, side) {
  const found = new Map();
  for (const row of rows) if (row[side]) {
    const record = row[side];
    requireText(record.sourceOccurrenceId, `${side}.sourceOccurrenceId`);
    requireText(record.branchOccurrenceId, `${side}.branchOccurrenceId`);
    found.set(record.sourceOccurrenceId, occurrence(record.sourceOccurrenceId, record.recordId || record.sourceOccurrenceId));
  }
  return sorted(found.keys()).map((id) => found.get(id));
}
function supportTerminal(row) {
  const refs = row.reference ? [row.reference.sourceOccurrenceId] : [];
  const actuals = row.actual ? [row.actual.sourceOccurrenceId] : [];
  return terminal(row.ledgerKey, row.matchState, refs, actuals);
}

export function adaptTopologyBenchmarkReport(report, populationKind) {
  const value = requireSchema(report, 'FbxTopologyBenchmarkReport.v1', 'topologyReport');
  const rows = topologyRows(value, populationKind);
  const refs = uniqueTopologyOccurrences(rows, 'referenceId');
  const actuals = uniqueTopologyOccurrences(rows, 'actualId');
  const terminals = rows.map((row) => terminal(row.recordId, row.state,
    row.referenceId ? [row.referenceId] : [], row.actualId ? [row.actualId] : []));
  return reconciliationInput(`topology:${populationKind}`, populationKind,
    'FbxTopologyBenchmarkReport.v1', refs, actuals, terminals);
}
function topologyRows(report, kind) {
  if (kind === 'TOPOLOGY_BRANCH') return report.branches.map(branchRow);
  if (kind === 'TOPOLOGY_RELATIONSHIP') return report.relationships.map(relationshipRow);
  if (kind === 'TOPOLOGY_JUNCTION') return report.junctions.map(junctionRow);
  if (kind === 'TOPOLOGY_BOUNDARY') return report.boundaries.map(boundaryRow);
  fail('BLOCKED_AUDIT_VOCABULARY', `unsupported topology population ${kind}.`);
}
function branchRow(row) {
  return { recordId: row.branchId, state: row.matchState,
    referenceId: row.referenceBranchId, actualId: row.actualBranchId };
}
function relationshipRow(row) {
  return { recordId: row.ledgerId, state: row.matchState,
    referenceId: row.reference?.relationshipId || null, actualId: row.actual?.relationshipId || null };
}
function junctionRow(row) {
  return { recordId: row.ledgerId, state: row.matchState,
    referenceId: row.referenceComponentId, actualId: row.actualComponentId };
}
function boundaryRow(row) {
  return { recordId: row.ledgerId, state: boundaryState(row.status),
    referenceId: row.referencePair?.relationshipId || null, actualId: row.actualPair?.relationshipId || null };
}
function boundaryState(status) {
  if (status === 'PASS') return 'EXACT_MATCH';
  if (status === 'BLOCKED') return 'BLOCKED_IDENTITY';
  return 'ZONE_BOUNDARY_MISMATCH';
}
function uniqueTopologyOccurrences(rows, field) {
  const ids = new Set(rows.map((row) => row[field]).filter(Boolean));
  return sorted(ids).map((id) => occurrence(id));
}
