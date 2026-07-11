/**
 * Functionality: orchestrates the parallel stagedJson enrichment workflow.
 * Parameters: stagedJson, explicit master rows, visible config, source name,
 * and evaluation time. Outputs: enriched stagedJson plus JSON/CSV audit while
 * preserving original attributes and coordinates. Fallback: none.
 */

import { collectStagedJsonBranchContexts, stagedJsonGeometrySnapshot } from './stagedjson-branch-context.js';
import { buildStagedJsonEnrichmentAudit, stagedJsonUnresolvedCsv } from './stagedjson-enrichment-audit.js';
import { normalizeVisibleStagedJsonConfig } from './stagedjson-enrichment-contract.js';
import { buildStagedJsonMasterContext, summarizeStagedJsonMasters } from './stagedjson-master-adapter.js';
import { resolveStagedJsonContext } from './stagedjson-resolver-adapter.js';

export function enrichStagedJson(input) {
  const stagedJson = parseStagedJson(input?.stagedJson);
  const config = normalizeVisibleStagedJsonConfig(input?.config);
  const masters = buildStagedJsonMasterContext(input?.masters || {}, config);
  const contexts = collectStagedJsonBranchContexts(stagedJson, config);
  const rows = contexts.map((context) => ({ context, enrichedAttributes: resolveStagedJsonContext(context, masters, config) }));
  const enrichedStagedJson = writeEnrichment(stagedJson, rows);
  const geometryChanged = JSON.stringify(stagedJsonGeometrySnapshot(stagedJson)) !== JSON.stringify(stagedJsonGeometrySnapshot(enrichedStagedJson));
  if (geometryChanged) throw new Error('stagedJson enrichment changed geometry coordinates; export blocked.');
  const audit = buildStagedJsonEnrichmentAudit({ rows, masterSummary: summarizeStagedJsonMasters(masters), geometryChanged, sourceFileName: input?.sourceFileName, evaluatedAt: input?.evaluatedAt });
  return {
    enrichedStagedJson,
    audit,
    unresolvedCsv: stagedJsonUnresolvedCsv(audit),
    previewRows: rows.map(previewRow),
    config,
  };
}

export function parseStagedJson(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : clone(value);
  if (!parsed || (typeof parsed !== 'object')) throw new TypeError('stagedJson input must be a JSON object or array.');
  return parsed;
}

function writeEnrichment(stagedJson, rows) {
  const output = clone(stagedJson);
  for (const row of rows) {
    const node = nodeAt(output, row.context.indexPath);
    if (!node) throw new Error(`Could not locate stagedJson node at ${row.context.indexPath.join('/')}.`);
    node.enrichedAttributes = clone(row.enrichedAttributes);
    node.diagnostics = mergeDiagnostics(node.diagnostics, row.enrichedAttributes.diagnostics);
  }
  return output;
}

function nodeAt(root, path) {
  let cursor = root;
  for (const part of path) cursor = cursor?.[part];
  return cursor || null;
}

function mergeDiagnostics(existing, enrichment) {
  const rows = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(enrichment) ? enrichment : [])];
  return [...new Map(rows.map((row) => [row?.id || JSON.stringify(row), clone(row)])).values()];
}

function previewRow(row) {
  return {
    nodeId: row.context.nodeId,
    path: row.context.hierarchyPath,
    type: row.context.type,
    lineNo: row.enrichedAttributes.lineNo,
    pipingClass: row.enrichedAttributes.pipingClass,
    status: row.enrichedAttributes.status,
    missing: [...row.enrichedAttributes.missing],
  };
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
