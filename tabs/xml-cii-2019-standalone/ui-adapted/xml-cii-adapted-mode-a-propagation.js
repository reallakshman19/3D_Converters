import {
  buildModeAExecutionState,
  commonModeASupportConfig,
  composeModeASupportConfig,
  modeASourceWorkflowSnapshot,
  normalizeModeABatchState,
  syncActiveModeASource,
} from '../xml-cii-mode-a-batch.js?v=20260813-mode-a-full-propagation-1';
import { runStandaloneRegexTester } from '../xml-cii-regex-tester.js?v=20260813-mode-a-full-propagation-1';
import { runStandaloneResolverJsonTrace } from '../xml-cii-resolver-json-trace.js?v=20260813-mode-a-full-propagation-1';
import { buildStandalonePreviewDiagnosticsAudit } from '../xml-cii-preview-diagnostics-audit.js?v=20260813-mode-a-full-propagation-1';
import { replaceModeAState } from './xml-cii-adapted-mode-a-state.js?v=20260813-mode-a-full-propagation-1';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function rawRef(stateRef) {
  return stateRef?.modeABaseRef || stateRef;
}

function rawState(stateRef) {
  const ref = rawRef(stateRef);
  return syncActiveModeASource(normalizeModeABatchState(ref?.current || {}));
}

function selectedCount(source) {
  const ids = source?.branchSelection?.selectedBranchOccurrenceIds;
  if (Array.isArray(ids)) return ids.length;
  const names = source?.branchSelection?.selectedBranchNames;
  return Array.isArray(names) ? names.length : Number(source?.metrics?.branchCount || 0);
}

export function modeAEnabledSources(state = {}) {
  return (normalizeModeABatchState(state).sourceBatch?.sources || []).filter((source) => source.enabled !== false);
}

export function modeABatchTotals(state = {}) {
  const sources = modeAEnabledSources(state);
  return {
    sourceCount: sources.length,
    branchCount: sources.reduce((sum, source) => sum + Number(source.metrics?.branchCount || 0), 0),
    selectedBranchCount: sources.reduce((sum, source) => sum + selectedCount(source), 0),
    nodeCount: sources.reduce((sum, source) => sum + Number(source.metrics?.nodeCount || 0), 0),
  };
}

export function modeAExecutionRows(stateOrRef = {}) {
  const state = stateOrRef?.current !== undefined || stateOrRef?.modeABaseRef
    ? rawState(stateOrRef)
    : syncActiveModeASource(normalizeModeABatchState(stateOrRef));
  return modeAEnabledSources(state).map((source) => ({
    source,
    state: {
      ...buildModeAExecutionState(state, source),
      ...(source.workflow || {}),
      sourceBatch: null,
      modeASourceId: source.sourceId,
      modeAFileName: source.fileName,
      modeAAlias: source.alias,
    },
  }));
}

function annotateRow(row, source) {
  return {
    ...(row || {}),
    modeASourceId: source.sourceId,
    modeAFileName: source.fileName,
    modeAAlias: source.alias,
  };
}

function annotateRows(rows, source) {
  return (Array.isArray(rows) ? rows : []).map((row) => annotateRow(row, source));
}

function sumStats(results, key) {
  return results.reduce((sum, item) => sum + Number(item.result?.indexStats?.[key] || 0), 0);
}

function mergeIndex(results, key) {
  const out = {};
  for (const item of results) {
    const index = item.result?.[key] || {};
    for (const [name, rows] of Object.entries(index)) {
      if (!out[name]) out[name] = [];
      out[name].push(...annotateRows(rows, item.source));
    }
  }
  return out;
}

export function buildModeARegexAggregate(stateOrRef = {}) {
  const rows = modeAExecutionRows(stateOrRef);
  const results = rows.map(({ source, state }) => ({
    source,
    result: runStandaloneRegexTester({
      ...state,
      sourceText: state.sourceText,
      extractionConfig: state.regexTesterConfig,
    }),
  }));
  const first = results[0]?.result || {};
  return {
    ...first,
    branchSamples: results.flatMap((item) => annotateRows(item.result.branchSamples, item.source)),
    matchedRows: results.flatMap((item) => annotateRows(item.result.matchedRows, item.source)),
    rejectedRows: results.flatMap((item) => annotateRows(item.result.rejectedRows, item.source)),
    diagnostics: results.flatMap((item) => annotateRows(item.result.diagnostics, item.source)),
    batchSources: results.map((item) => ({
      sourceId: item.source.sourceId,
      fileName: item.source.fileName,
      branchSamples: item.result.branchSamples?.length || 0,
      matched: item.result.matchedRows?.length || 0,
      rejected: item.result.rejectedRows?.length || 0,
    })),
    modeABatch: true,
  };
}

export function buildModeAResolverAggregate(stateOrRef = {}) {
  const rows = modeAExecutionRows(stateOrRef);
  const results = rows
    .map(({ source }) => ({ source, result: source.workflow?.resolverJsonTraceResult || source.workflow?.resolverJsonTraceJsonResult || null }))
    .filter((item) => item.result);
  if (!results.length) return null;
  const first = results[0].result;
  const entries = results.flatMap((item) => annotateRows(item.result.positionIndex?.entries, item.source));
  const groups = results.flatMap((item) => annotateRows(item.result.positionIndex?.groups, item.source));
  const ledger = results.flatMap((item) => annotateRows(item.result.resolutionLedger, item.source));
  const traceRecords = results.flatMap((item) => annotateRows(item.result.traceResolutionLedger?.records, item.source));
  const traceGroups = results.flatMap((item) => annotateRows(item.result.traceResolutionLedger?.groups, item.source));
  const traceDiagnostics = results.flatMap((item) => annotateRows(item.result.traceResolutionLedger?.diagnostics, item.source));
  return {
    ...first,
    indexStats: {
      xmlNodeCount: sumStats(results, 'xmlNodeCount'),
      nodeKeyCount: sumStats(results, 'nodeKeyCount'),
      psKeyCount: sumStats(results, 'psKeyCount'),
      posKeyCount: sumStats(results, 'posKeyCount'),
    },
    nodes: results.flatMap((item) => annotateRows(item.result.nodes, item.source)),
    nodeIndex: mergeIndex(results, 'nodeIndex'),
    psIndex: mergeIndex(results, 'psIndex'),
    posIndex: mergeIndex(results, 'posIndex'),
    resolvedFacts: results.flatMap((item) => annotateRows(item.result.resolvedFacts, item.source)),
    matchedFacts: results.flatMap((item) => annotateRows(item.result.matchedFacts, item.source)),
    rejectedFacts: results.flatMap((item) => annotateRows(item.result.rejectedFacts, item.source)),
    diagnostics: results.flatMap((item) => annotateRows(item.result.diagnostics, item.source)),
    resolutionLedger: ledger,
    traceResolutionLedger: { records: traceRecords, ledger: traceRecords, groups: traceGroups, diagnostics: traceDiagnostics },
    positionIndex: { entries, groups, count: entries.length, byCoordKey: new Map(), byNodeKey: new Map(), byPsKey: new Map() },
    batchSources: results.map((item) => ({
      sourceId: item.source.sourceId,
      fileName: item.source.fileName,
      xmlNodes: item.result.indexStats?.xmlNodeCount || 0,
      matched: item.result.matchedFacts?.length || 0,
      rejected: item.result.rejectedFacts?.length || 0,
    })),
    modeABatch: true,
  };
}

function addSummary(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (typeof value === 'number' && Number.isFinite(value)) target[key] = Number(target[key] || 0) + value;
  }
}

export function buildModeADiagnosticsAggregate(stateOrRef = {}) {
  const rows = modeAExecutionRows(stateOrRef);
  const reports = rows.map(({ source, state }) => {
    const regexTesterResult = runStandaloneRegexTester({ ...state, extractionConfig: state.regexTesterConfig });
    const resolverJsonTraceResult = source.workflow?.resolverJsonTraceResult || null;
    const input = {
      ...state,
      regexTesterResult,
      resolverJsonTraceResult,
      resolverJsonTraceJsonResult: resolverJsonTraceResult,
      manualElementSideloadResult: source.workflow?.manualElementSideloadResult || null,
      result: source.workflow?.result || null,
    };
    return { source, report: buildStandalonePreviewDiagnosticsAudit(input) };
  });
  const summary = {};
  reports.forEach((item) => addSummary(summary, item.report.summary));
  return {
    summary,
    previewRows: reports.flatMap((item) => annotateRows(item.report.previewRows, item.source)),
    changedFields: reports.flatMap((item) => annotateRows(item.report.changedFields, item.source)),
    matchedFacts: reports.flatMap((item) => annotateRows(item.report.matchedFacts, item.source)),
    rejectedFacts: reports.flatMap((item) => annotateRows(item.report.rejectedFacts, item.source)),
    diagnostics: reports.flatMap((item) => annotateRows(item.report.diagnostics, item.source)),
    raw: { sources: reports.map((item) => ({ sourceId: item.source.sourceId, fileName: item.source.fileName, report: item.report })) },
    modeABatch: true,
  };
}

export function prepareModeAAggregatePhaseState(stateRef, phaseId) {
  const writeRef = rawRef(stateRef);
  const current = rawState(stateRef);
  let patch = null;
  if (phaseId === 'regex') patch = { regexTesterResult: buildModeARegexAggregate(current) };
  else if (phaseId === 'json-trace') {
    const resolver = buildModeAResolverAggregate(current);
    if (resolver) patch = { resolverJsonTraceResult: resolver, resolverJsonTraceJsonResult: resolver };
  } else if (phaseId === 'diagnostics') patch = { previewDiagnosticsAuditReport: buildModeADiagnosticsAggregate(current) };
  if (!patch) return current;
  const next = { ...current, ...patch };
  replaceModeAState(writeRef, next);
  return next;
}

export function createModeASourceProcessingRef(stateRef, sourceId) {
  const writeRef = rawRef(stateRef);
  return {
    modeABaseRef: writeRef,
    get current() {
      const current = rawState(writeRef);
      const source = current.sourceBatch?.sources?.find((row) => row.sourceId === sourceId);
      if (!source) return current;
      return {
        ...buildModeAExecutionState(current, source),
        ...(source.workflow || {}),
        sourceBatch: null,
        modeASourceId: source.sourceId,
        modeAFileName: source.fileName,
        modeAAlias: source.alias,
      };
    },
    set current(next) {
      const current = rawState(writeRef);
      const before = this.current;
      const sources = (current.sourceBatch?.sources || []).map((source) => source.sourceId !== sourceId ? source : {
        ...source,
        supportConfigJson: next?.supportConfigJson || source.supportConfigJson,
        workflow: modeASourceWorkflowSnapshot(next || {}),
      });
      let sharedSupportConfigJson = current.supportConfigJson;
      if (text(next?.supportConfigJson) && next.supportConfigJson !== before.supportConfigJson) {
        sharedSupportConfigJson = composeModeASupportConfig(
          commonModeASupportConfig(next.supportConfigJson),
          current.supportConfigJson,
        );
      }
      replaceModeAState(writeRef, {
        ...current,
        supportConfigJson: sharedSupportConfigJson,
        masterContext: next?.masterContext || current.masterContext,
        regexTesterConfig: next?.regexTesterConfig || current.regexTesterConfig,
        resolverJsonTraceConfig: next?.resolverJsonTraceConfig || current.resolverJsonTraceConfig,
        manualElementSideloadConfig: next?.manualElementSideloadConfig || current.manualElementSideloadConfig,
        supportTypeMapperConfig: next?.supportTypeMapperConfig || current.supportTypeMapperConfig,
        weightMatchOverridesJson: next?.weightMatchOverridesJson ?? current.weightMatchOverridesJson,
        options: next?.options || current.options,
        sourceBatch: { ...current.sourceBatch, sources },
      });
    },
  };
}

export function runModeAResolverBatch(stateRef, { save = false } = {}) {
  const writeRef = rawRef(stateRef);
  const current = rawState(stateRef);
  const perSource = new Map();
  for (const { source, state } of modeAExecutionRows(current)) {
    const result = runStandaloneResolverJsonTrace({
      ...state,
      sourceText: state.sourceText,
      stagedJsonText: state.stagedJsonText,
      jsonConfig: current.resolverJsonTraceConfig,
    });
    perSource.set(source.sourceId, result);
  }
  const sources = (current.sourceBatch?.sources || []).map((source) => {
    const result = perSource.get(source.sourceId);
    return result ? {
      ...source,
      workflow: {
        ...(source.workflow || {}),
        resolverJsonTraceResult: result,
        resolverJsonTraceJsonResult: result,
      },
    } : source;
  });
  const intermediate = { ...current, sourceBatch: { ...current.sourceBatch, sources } };
  const aggregate = buildModeAResolverAggregate(intermediate);
  let supportConfigJson = current.supportConfigJson;
  if (save) {
    const first = [...perSource.values()][0];
    if (first?.supportConfigJson) {
      supportConfigJson = composeModeASupportConfig(
        commonModeASupportConfig(first.supportConfigJson),
        current.supportConfigJson,
      );
    }
  }
  const next = {
    ...intermediate,
    supportConfigJson,
    resolverJsonTraceResult: aggregate,
    resolverJsonTraceJsonResult: aggregate,
    resolverJsonTraceRunning: false,
    resolverJsonTraceWriteBackStatus: aggregate
      ? `Resolver index built across ${modeAEnabledSources(intermediate).length} XML files: ${aggregate.resolvedFacts.length} facts processed.`
      : 'Resolver index produced no batch facts.',
  };
  replaceModeAState(writeRef, next);
  return next;
}
