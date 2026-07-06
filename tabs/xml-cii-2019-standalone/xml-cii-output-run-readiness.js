import { detectXmlCiiWorkflowSourceKind } from './xml-cii-workflow-source-detect.js';

function text(value) { return String(value ?? '').trim(); }
function array(value) { return Array.isArray(value) ? value : []; }
function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function bytes(value) { return BufferSize(String(value ?? '')); }
function BufferSize(value) { return new TextEncoder().encode(value).length; }

function parseConfig(value) {
  try { return { ok: true, value: JSON.parse(text(value) || '{}') }; }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
}

function sourceText(input) { return text(input.sourceText || input.sourceFileText); }
function resolvedKind(input) { return input.sourceKind === 'auto' ? detectXmlCiiWorkflowSourceKind(sourceText(input)) : (input.sourceKind || 'xml'); }
function hasResult(input) { return !!input.result?.enrichedText || !!input.result?.ciiText || input.result?.ok === true; }

function row(id, label, ok, message, opts = {}) {
  return { id, label, status: ok ? 'ready' : (opts.status || 'missing'), severity: ok ? 'ok' : (opts.severity || 'warning'), blocking: !!opts.blocking && !ok, message, detail: opts.detail || '' };
}

function optionRows(input, kind) {
  const rows = [row('source-loaded', 'Source loaded', !!sourceText(input) || !!input.sourceFile, 'Source text or file is available.', { blocking: true, severity: 'error' })];
  rows.push(row('source-kind', 'Source kind resolved', ['xml', 'inputxml'].includes(kind), `Resolved source kind: ${kind}.`, { blocking: true, severity: 'error' }));
  rows.push(row('support-config-valid', 'Support config valid', parseConfig(input.supportConfigJson).ok, 'Support/config JSON is parseable.', { blocking: true, severity: 'error' }));
  rows.push(row('output-mode', 'Output mode selected', !!input.options?.outputMode, `Output mode: ${input.options?.outputMode || 'not selected'}.`, { blocking: true, severity: 'error' }));
  return rows;
}

function xmlRows(input) {
  return [
    row('regex', 'Regex status for XML mode', !!input.regexTesterResult, 'Regex tester result is available.'),
    row('resolver-json', 'Resolver / JSON Trace status for XML mode', !!input.resolverJsonTraceResult, 'Resolver / JSON Trace result is available.'),
    row('manual-restraints', 'Manual restraints status for XML mode', !!input.manualElementSideloadResult, 'Manual restraint review result is available.'),
  ];
}

function inputXmlRows(input) {
  const matched = Number(input.manualElementSideloadResult?.summary?.matchedRows || input.result?.diagnostics?.sideLoadMatched || 0);
  return [row('inputxml-side-load', 'InputXML side-load status', matched > 0 || !!text(input.elementSideLoadText), `InputXML side-load evidence rows: ${matched || 'not built yet'}.`)];
}

function commonRows(input) {
  return [
    row('import-masters', 'Import Masters status', !!input.masterContext, 'Master context is available.'),
    row('preview-audit', 'Preview / Diagnostics / Matched Audit status', !!input.previewDiagnosticsAuditReport, 'Preview diagnostics audit report is available.'),
    row('weight-match', 'Weight Match status', !!input.weightMatchResult, input.weightMatchStatus || 'Weight Match result is not available.'),
    row('support-mapper', 'Support Type Mapper status', !!input.supportTypeMapperResult, input.supportTypeMapperStatus || 'Support mapper result is not available.'),
    row('run-result', 'Run result available after run', hasResult(input), hasResult(input) ? 'Run result is available.' : 'No run result yet.', { status: 'pending' }),
  ];
}

export function buildOutputRunChecklist(input = {}) {
  const kind = resolvedKind(input);
  return [...optionRows(input, kind), ...commonRows(input), ...(kind === 'inputxml' ? inputXmlRows(input) : xmlRows(input))];
}

function artifact(kind, label, name, value, mime) {
  const available = text(value).length > 0;
  return { kind, label, available, filename: available ? name : '', bytes: available ? bytes(value) : 0, mime, downloadAction: available ? `download-${kind}` : '' };
}

export function buildOutputArtifactRows(input = {}, manifest = {}) {
  const result = object(input.result);
  return [
    artifact('enriched', 'Enriched XML/InputXML', result.enrichedName || 'enriched-output.xml', result.enrichedText, 'application/xml;charset=utf-8'),
    artifact('cii', 'CII', result.ciiName || 'output.cii', result.ciiText, 'text/plain;charset=utf-8'),
    artifact('diagnostics', 'Diagnostics JSON', 'xml-cii-diagnostics.json', JSON.stringify(result.diagnostics || {}, null, 2), 'application/json;charset=utf-8'),
    artifact('manifest', 'Run Manifest JSON', 'xml-cii-run-manifest.json', JSON.stringify(manifest, null, 2), 'application/json;charset=utf-8'),
  ];
}

function countRows(value) { return Array.isArray(value) ? value.length : 0; }
function summaryCount(value, key) { return Number(value?.summary?.[key] || value?.[key] || 0); }

export function buildRunManifest(input = {}) {
  const kind = resolvedKind(input);
  const result = object(input.result);
  return {
    schema: 'xml-cii-2019-output-run-manifest/v1',
    sourceMode: kind,
    outputMode: input.options?.outputMode || 'enriched-only',
    sourceBytes: sourceText(input).length ? bytes(sourceText(input)) : Number(input.sourceFile?.size || 0),
    masterRowCounts: object(input.masterContext?.rowCounts),
    regex: { matched: summaryCount(input.regexTesterResult, 'matchedCount'), rejected: summaryCount(input.regexTesterResult, 'rejectedCount') },
    resolver: { matched: summaryCount(input.resolverJsonTraceResult, 'matchedFacts'), rejected: summaryCount(input.resolverJsonTraceResult, 'rejectedFacts') },
    manualOrSideLoad: { matched: summaryCount(input.manualElementSideloadResult, 'matchedRows'), rejected: summaryCount(input.manualElementSideloadResult, 'rejectedRows') },
    previewAudit: { matched: summaryCount(input.previewDiagnosticsAuditReport, 'matchedFacts'), rejected: summaryCount(input.previewDiagnosticsAuditReport, 'rejectedFacts') },
    weightMatch: { issues: countRows(input.weightMatchResult?.issueRows), finalized: countRows(input.weightMatchResult?.finalizedRows) },
    supportMapper: { previewRows: countRows(input.supportTypeMapperResult?.previewRows), diagnostics: countRows(input.supportTypeMapperResult?.diagnostics) },
    artifacts: { enriched: !!result.enrichedText, cii: !!result.ciiText, diagnostics: !!result.diagnostics, manifest: true },
  };
}

function logRows(input, checklistRows) {
  const fromResult = array(input.result?.logs).map((message) => ({ level: 'info', source: 'run', message: text(message) }));
  const fromChecklist = checklistRows.filter((item) => item.status !== 'ready').map((item) => ({ level: item.severity, source: 'readiness', message: `${item.label}: ${item.message}` }));
  return [...fromChecklist, ...fromResult];
}

function readinessDiagnostics(checklistRows) {
  return checklistRows.filter((item) => item.blocking || item.severity === 'warning').map((item) => ({ level: item.blocking ? 'error' : 'warning', source: 'output-run', type: item.id, message: item.message }));
}

export function buildStandaloneOutputRunReadiness(input = {}) {
  const checklistRows = buildOutputRunChecklist(input);
  const manifest = buildRunManifest(input);
  const artifactRows = buildOutputArtifactRows(input, manifest);
  const blockingCount = checklistRows.filter((item) => item.blocking).length;
  return {
    summary: { sourceMode: resolvedKind(input), blockingCount, checklistCount: checklistRows.length, artifactCount: artifactRows.filter((item) => item.available).length },
    checklistRows,
    artifactRows,
    logRows: logRows(input, checklistRows),
    manifest,
    diagnostics: readinessDiagnostics(checklistRows),
    raw: { resultOk: input.result?.ok === true, sourceKind: input.sourceKind || 'auto' },
  };
}
