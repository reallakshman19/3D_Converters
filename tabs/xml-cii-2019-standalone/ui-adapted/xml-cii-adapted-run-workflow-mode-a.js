import { runWorkflowFromUi as runSingleWorkflow } from './xml-cii-adapted-run-workflow-atta-default.js?v=20260804-mode-a-v1';
import {
  activateModeASource,
  buildModeABatchManifest,
  buildModeAExecutionState,
  buildModeAPreflight,
  normalizeModeABatchState,
  syncActiveModeASource,
} from '../xml-cii-mode-a-batch.js?v=20260804-mode-a-v1';
import { clearModeASourceCaches, replaceModeAState } from './xml-cii-adapted-mode-a-state.js?v=20260804-mode-a-v1';

function sourceManifest(source, result, scope) {
  return {
    schema: 'xml-cii-mode-a-source-manifest/v1',
    mode: 'separate-model',
    sourceId: source.sourceId,
    sourceDigest: source.sourceDigest,
    fileName: source.fileName,
    alias: source.alias,
    branchSelection: scope?.manifest || null,
    artifacts: {
      enrichedName: result?.enrichedName || '',
      ciiName: result?.ciiName || '',
      enriched: !!result?.enrichedText,
      cii: !!result?.ciiText,
      diagnostics: !!result?.diagnostics,
      enrichedEvidence: !!result?.enrichedEvidenceXml,
      engineInput: !!result?.diagnostics?.engineRequestXmlText,
      converterParseInput: !!result?.diagnostics?.converterParseXmlText,
    },
    ok: result?.ok === true,
    error: result?.error || null,
  };
}

function resultStatus(result, readiness) {
  if (result?.ok === true) return 'SUCCEEDED';
  if (result) return 'FAILED';
  if (readiness?.summary?.blockingCount > 0) return 'BLOCKED';
  return 'CANCELLED';
}

export async function runModeABatchFromUi(stateRef, render) {
  let state = syncActiveModeASource(normalizeModeABatchState(stateRef.current));
  if (state.batchRunning || state.running) return;
  const preflight = buildModeAPreflight(state.sourceBatch);
  if (!preflight.ready) {
    replaceModeAState(stateRef, {
      ...state,
      batchRunResult: {
        summary: { succeeded: 0, failed: 0, blocked: preflight.blockingRows.length },
        preflight,
        manifest: buildModeABatchManifest(state.sourceBatch, []),
        sources: [],
      },
      batchRunStatus: preflight.blockingRows.map((row) => row.message).join(' | '),
    });
    render();
    return;
  }

  replaceModeAState(stateRef, { ...state, batchRunning: true, batchRunStatus: 'Running separate models...', batchRunResult: null });
  render();
  state = syncActiveModeASatchState(normalizeModeABatchState(stateRef.current));
  const enabled = state.sourceBatch.sources.filter((source) => source.enabled !== false);
  const rows = [];
  let sharedState = state;

  for (let index = 0; index < enabled.length; index += 1) {
    const source = enabled[index];
    replaceModeAState(stateRef, {
      ...sharedState,
      batchRunning: true,
      batchRunStatus: `Processing ${index + 1}/${enabled.length}: ${source.fileName}`,
    });
    render();

    clearModeASourceCaches();
    const execution = buildModeAExecutionState(sharedState, source);
    const isolatedRef = { current: execution };
    await runSingleWorkflow(isolatedRef, () => {});
    const sourceState = isolatedRef.current;
    const result = sourceState.result || null;
    const status = resultStatus(result, sourceState.outputRunReadinessReport);
    const scope = sourceState.branchScope;
    const scopedSourceText = scope?.filteredSourceText || source.sourceText || '';
    const updatedSource = {
      ...source,
      supportConfigJson: sourceState.supportConfigJson || source.supportConfigJson,
      workflow: {
        ...(source.workflow || {}),
        outputRunReadinessReport: sourceState.outputRunReadinessReport || null,
        result,
      },
    };
    rows.push({
      sourceId: source.sourceId,
      sourceDigest: source.sourceDigest,
      fileName: source.fileName,
      alias: source.alias,
      sourceText: scopedSourceText,
      selectedBranchCount: scope?.selectedBranchNames?.length || 0,
      status,
      error: result?.error || (status === 'BLOCKED' ? 'Run readiness blocked.' : (status === 'CANCELLED' ? 'Review cancelled.' : '')),
      result,
      sourceManifest: sourceManifest(source, result, scope),
    });
    sharedState = {
      ...sharedState,
      sourceBatch: {
        ...sharedState.sourceBatch,
        sources: sharedState.sourceBatch.sources.map((item) => item.sourceId === source.sourceId ? updatedSource : item),
      },
    };
    if (status === 'CANCELLED') break;
  }

  const succeeded = rows.filter((row) => row.status === 'SUCCEEDED').length;
  const failed = rows.filter((row) => row.status === 'FAILED').length;
  const blocked = rows.filter((row) => row.status === 'BLOCKED').length;
  const cancelled = rows.filter((row) => row.status === 'CANCELLED').length;
  const manifest = buildModeABatchManifest(sharedState.sourceBatch, rows);
  const restoredActive = activateModeASource(sharedState, sharedState.sourceBatch.activeSourceId);
  const activeResult = rows.find((row) => row.sourceId === sharedState.sourceBatch.activeSourceId)?.result
    || restoredActive.result
    || null;
  replaceModeAState(stateRef, {
    ...restoredActive,
    result: activeResult,
    batchRunning: false,
    batchRunStatus: `${succeeded} succeeded · ${failed} failed · ${blocked} blocked · ${cancelled} cancelled`,
    batchRunResult: {
      summary: { succeeded, failed, blocked, cancelled, processed: rows.length },
      preflight,
      manifest,
      sources: rows,
    },
  });
  render();
}
