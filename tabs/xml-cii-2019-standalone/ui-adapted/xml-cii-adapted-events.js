import { runStandaloneRegexTester } from '../xml-cii-regex-tester.js';
import { runStandaloneResolverJsonTrace } from '../xml-cii-resolver-json-trace.js';
import { runStandaloneManualElementSideload } from '../xml-cii-manual-element-sideload.js';
import { buildStandalonePreviewDiagnosticsAudit } from '../xml-cii-preview-diagnostics-audit.js';
import { runStandaloneWeightMatch } from '../xml-cii-weight-match.js';
import { runStandaloneSupportTypeMapper } from '../xml-cii-support-type-mapper.js';
import { buildStandaloneOutputRunReadiness } from '../xml-cii-output-run-readiness.js';
import { readTextFile } from '../xml-cii-workflow-ui-adapter.js?v=20261001-weight-output-2';
import { downloadTextFile } from './xml-cii-adapted-dom.js';
import { applyPreviewDiagnosticsAuditReport, applyStandaloneManualElementSideloadResult, applyStandaloneOutputRunReadiness, applyStandaloneRegexTesterResult, applyStandaloneResolverJsonTraceResult, applyStandaloneSupportTypeMapperResult, applyStandaloneWeightMatchResult, clearWorkflowResult, patchResolverJsonTraceConfig, resetWorkflowState, updateManualElementSideloadConfig, updateRegexTesterConfig, updateResolverJsonTraceConfig, updateSupportTypeMapperConfig, updateSupportTypeMapperTestInput, updateWeightMatchOverrides, updateWorkflowOptions, updateWorkflowState } from './xml-cii-adapted-state.js?v=20261001-weight-output-2';
import { detectXmlCiiWorkflowSourceKind, maskedFileName } from '../xml-cii-workflow-source-detect.js';
import { bindImportMastersEvents, clearMasterContextFromUi, loadImportMastersFromUi } from './xml-cii-adapted-master-events.js?v=20261006-c05-5-5-persistence-retry-1';
import { runWorkflowFromUi } from './xml-cii-adapted-run-workflow.js?v=20261008-p0-mode-b-parity-1';
import { bindTraceTableEvents } from './xml-cii-adapted-table-trace-events.js?v=20261001-weight-output-2';
import { compareTraceResultsByComponentRef } from '../xml-cii-table-trace-source.js';
import {
  buildEvidenceTreeCsv,
  buildEvidenceTreeRows,
  buildMatchedFactsRows,
  buildMatchedFactsTsv,
  buildXmlNodeWiseTraceCsv,
  buildXmlNodeWiseTraceRows,
} from '../xml-cii-trace-export.js';
import { currentResolverTraceRevision } from './xml-cii-adapted-state.js';
import { ALL_SCOPE_ID } from './xml-cii-adapted-resolver-scope.js';
import { beginLatestOperation } from './xml-cii-adapted-latest-operation.js';
import { buildIndexedResolverPreview } from './xml-cii-adapted-lfj-indexed-preview.js';
import { createIndexedExportReceipt, verifyIndexedProductCsv } from './xml-cii-adapted-lfj-indexed-export.js';
import {beginIndexedBuild,cancelIndexedBuild,releaseIndexedBuild,isIndexedBuildCurrent} from './xml-cii-adapted-lfj-build-lifecycle.js';

export function bindAdaptedWorkflowEvents(container, stateRef, render) {
  bindPhaseEvents(container, stateRef, render);
  bindSourceEvents(container, stateRef, render);
  bindOptionEvents(container, stateRef, render);
  bindRegexEvents(container, stateRef, render);
  bindImportMastersEvents(container, stateRef, render);
  bindResolverEvents(container, stateRef, render);
  bindTraceTableEvents(container, stateRef, render);
  bindManualEvents(container, stateRef, render);
  bindWeightMatchEvents(container, stateRef, render);
  bindSupportMapperEvents(container, stateRef, render);
  bindActionEvents(container, stateRef, render);
  bindSubTabEvents(container, stateRef, render);
}

export function replaceState(stateRef, nextState, render) {
  if(currentResolverTraceRevision(stateRef.current)!==
     currentResolverTraceRevision(nextState)){
    cancelIndexedBuild(stateRef);
    beginLatestOperation(stateRef,'resolver-build');
  }
  stateRef.current=nextState;render();
}
export function patchState(stateRef, patch, render) { replaceState(stateRef, updateWorkflowState(stateRef.current, patch), render); }
export function patchOptions(stateRef, optionPatch) { stateRef.current = updateWorkflowOptions(stateRef.current, optionPatch); }

export function bindSubTabEvents(container, stateRef, render) {
  container.querySelectorAll('[data-sub-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      stateRef.current = updateWorkflowState(stateRef.current, { activeSubTabId: button.dataset.subTab });
      render();
    });
  });
  container.querySelectorAll('[data-json-trace-sub-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      stateRef.current = updateWorkflowState(stateRef.current, { jsonTraceActiveSubTabId: button.dataset.jsonTraceSubTab });
      render();
    });
  });
}

export function bindPhaseEvents(container, stateRef, render) { container.querySelectorAll('[data-phase]').forEach((button) => { button.addEventListener('click', () => patchState(stateRef, { activePhaseId: button.dataset.phase }, render)); }); }

export function bindSourceEvents(container, stateRef, render) {
  onChange(container, 'source-kind', (value) => {
    const nextState = updateWorkflowState(stateRef.current, { sourceKind: value, result: null });
    const detected = detectXmlCiiWorkflowSourceKind(nextState.sourceText, 'xml');
    const actual = value === 'auto' ? detected : value;
    if (actual === 'inputxml' && nextState.activePhaseId === 'json-trace') {
      nextState.activePhaseId = 'source';
    }
    replaceState(stateRef, nextState, render);
  });
  onChange(container, 'source-file', async (_, event) => {
    const file = event.target.files?.[0] || null;
    const isLatest = beginLatestOperation(stateRef, 'source-file');
    // Revoke the previous basis before FileReader yields to a newer upload.
    replaceState(stateRef, updateWorkflowState(stateRef.current, {
      sourceFile: file, sourceText: '', result: null,
      regexTesterResult: null, format1SelectedSample: '',
      format2SelectedSample: ''
    }), render);
    try {
      const text = file ? await readTextFile(file) : '';
      if (!isLatest() || stateRef.current.sourceFile !== file) return;
      if (file && !text) throw new Error('Selected XML file is empty or unreadable');
      const nextState = updateWorkflowState(stateRef.current, {
        sourceFile: file, sourceText: text, result: null
      });
      const detected = detectXmlCiiWorkflowSourceKind(text, 'xml');
      const actual = nextState.sourceKind === 'auto' ? detected : nextState.sourceKind;
      if (actual === 'inputxml' && nextState.activePhaseId === 'json-trace')
        nextState.activePhaseId = 'source';
      replaceState(stateRef, nextState, render);
    } catch (err) {
      if (!isLatest() || stateRef.current.sourceFile !== file) return;
      console.error('Error reading source file:', err);
      replaceState(stateRef, updateWorkflowState(stateRef.current, {
        sourceFile: null, sourceText: '', result: null,
        resolverJsonTraceWriteBackStatus: 'XML source read failed; select the file again.'
      }), render);
    }
  });
  onChange(container, 'staged-json-file', async (_, event) => {
    const file = event.target.files?.[0] || null;
    const isLatest = beginLatestOperation(stateRef, 'staged-json-file');
    replaceState(stateRef, updateWorkflowState(stateRef.current, {
      stagedJsonFile: file, stagedJsonText: '', result: null
    }), render);
    // Indexed preview passes the genuine Blob to a Worker: never read/parse
    // the original 10–30 MB JSON on the foreground UI thread.
    if (stateRef.current.resolverSourceMode === 'lfj-indexed-preview') return;
    try {
      const text = file ? await readTextFile(file) : '';
      if (!isLatest() || stateRef.current.stagedJsonFile !== file) return;
      if (file && !text) throw new Error('Selected JSON file is empty or unreadable');
      replaceState(stateRef, updateWorkflowState(stateRef.current, {
        stagedJsonFile: file, stagedJsonText: text, result: null
      }), render);
    } catch (err) {
      if (!isLatest() || stateRef.current.stagedJsonFile !== file) return;
      console.error('Error reading staged json file:', err);
      replaceState(stateRef, updateWorkflowState(stateRef.current, {
        stagedJsonFile: null, stagedJsonText: '', result: null,
        resolverJsonTraceWriteBackStatus: 'Staged JSON read failed; select the file again.'
      }), render);
    }
  });
  onChange(container, 'source-text', (value) => {
    beginLatestOperation(stateRef, 'source-file');
    const nextState = clearWorkflowResult(updateWorkflowState(stateRef.current, {
      sourceFile: null, sourceText: value,
      regexTesterResult: null,
      format1SelectedSample: '',
      format2SelectedSample: ''
    }));
    const detected = detectXmlCiiWorkflowSourceKind(value, 'xml');
    const actual = nextState.sourceKind === 'auto' ? detected : nextState.sourceKind;
    if (actual === 'inputxml' && nextState.activePhaseId === 'json-trace')
      nextState.activePhaseId = 'source';
    replaceState(stateRef, nextState, render);
  });
  onChange(container, 'element-side-load', (value) => { stateRef.current = clearWorkflowResult(updateWorkflowState(stateRef.current, { elementSideLoadText: value })); render(); });
  onChange(container, 'support-config', (value) => patchState(stateRef, { supportConfigJson: value, masterContext: null, result: null }, render));
}

export function bindOptionEvents(container, stateRef, render) {
  onChange(container, 'inputxml-output-mode', (value) => patchOptions(stateRef, { inputXmlOutputMode: value }));
  onChange(container, 'point-properties-basis', (value) => patchOptions(stateRef, { pointPropertiesBasis: value }));
  onChange(container, 'inputxml-restraint-policy', (value) => patchOptions(stateRef, { inputXmlRestraintPolicy: value }));
  onChange(container, 'fill-sentinel', (_, event) => patchOptions(stateRef, { fillSentinelFromLineContext: !!event.target.checked }));
  onChange(container, 'pressure-aliases', (_, event) => patchOptions(stateRef, { normalizePressureCaseNames: !!event.target.checked }));
  onChange(container, 'coords-mode', (value) => patchOptions(stateRef, { coordsMode: value }));
  onChange(container, 'kg-to-newton', (_, event) => patchOptions(stateRef, { kgToNewton: !!event.target.checked }));
  onChange(container, 'json-restraints', (_, event) => patchOptions(stateRef, { useRestraintTypeBasedOnJson: !!event.target.checked }));
  onChange(container, 'split-condensed', (value) => patchOptions(stateRef, { splitCondensedValveFlange: parseTriState(value) }));
  onChange(container, 'output-mode', (value) => patchOptions(stateRef, { outputMode: value }));
}

export function bindRegexEvents(container, stateRef, render) {
  container.querySelectorAll('[data-field^="regex-"]').forEach((input) => {
    input.addEventListener('change', () => {
      stateRef.current = updateRegexTesterConfig(stateRef.current, input.dataset.field, input.value);
      const result = runStandaloneRegexTester({
        ...stateRef.current,
        sourceText: stateRef.current.sourceText,
        extractionConfig: stateRef.current.regexTesterConfig
      });
      stateRef.current = updateWorkflowState(stateRef.current, { regexTesterResult: result });
      render();
    });
  });
}

export function bindResolverEvents(container, stateRef, render) {
  const consent = container.querySelector('[data-field="lfj-indexed-export-consent"]');
  consent?.addEventListener('change', event => {
    const state = stateRef.current;
    const allowed = event.target.checked === true &&
      state.resolverSourceMode === 'lfj-indexed-preview' &&
      !state.resolverJsonTraceRunning &&
      state.lfjIndexedPreview &&
      state.lfjIndexedExportReceipt;
    stateRef.current = updateWorkflowState(state, {
      lfjIndexedExportOptIn: Boolean(allowed),
      resolverJsonTraceExportStatus: allowed
        ? 'Local CSV exports enabled; each click verifies original SHA and CSV bytes. Not downstream CII approval.'
        : 'Local indexed CSV exports disabled.'
    });
    render();
  });
  onChange(container, 'resolver-source-mode', value => {
    cancelIndexedBuild(stateRef);
    beginLatestOperation(stateRef,'resolver-build');
    stateRef.current = updateWorkflowState(stateRef.current, {
      lfjIndexedExportReceipt: null, lfjIndexedExportOptIn: false,
      resolverSourceMode: value === 'lfj-indexed-preview' ? value : 'legacy',
      stagedJsonText: value === 'lfj-indexed-preview' && stateRef.current.stagedJsonFile ? '' : stateRef.current.stagedJsonText,
      lfjIndexedPreview: null, lfjIndexedPreviewStatus: ''
    });
    render();
  });
  onChange(container, 'resolver-json-config', (value) => {
    const before=currentResolverTraceRevision(stateRef.current);
    stateRef.current=updateResolverJsonTraceConfig(stateRef.current,value);
    if(currentResolverTraceRevision(stateRef.current)!==before){
      cancelIndexedBuild(stateRef);
      beginLatestOperation(stateRef,'resolver-build');
    }
  });
  const useDelimiterInput = container.querySelector('[data-field="resolver-use-delimiter"]');
  if (useDelimiterInput) {
    useDelimiterInput.addEventListener('change', (event) => {
      cancelIndexedBuild(stateRef);
      beginLatestOperation(stateRef,'resolver-build');
      stateRef.current = patchResolverJsonTraceConfig(stateRef.current, { useDelimiter: !!event.target.checked });
      render();
    });
  }
  onChange(container, 'resolver-delimiter', (value) => {
    cancelIndexedBuild(stateRef);
      beginLatestOperation(stateRef,'resolver-build');
      stateRef.current = patchResolverJsonTraceConfig(stateRef.current, { delimiter: value || '|' });
    render();
  });
  onChange(container, 'resolver-join-mode', (value) => {
    cancelIndexedBuild(stateRef);
      beginLatestOperation(stateRef,'resolver-build');
      stateRef.current = patchResolverJsonTraceConfig(stateRef.current, { joinMode: value || 'unique' });
    render();
  });
  onChange(container, 'resolver-coordinate-tolerance', (value) => {
    const tol = parseFloat(value);
    if (Number.isFinite(tol) && tol >= 0) {
      cancelIndexedBuild(stateRef);
      beginLatestOperation(stateRef,'resolver-build');
      stateRef.current = patchResolverJsonTraceConfig(stateRef.current, { coordinateTolerance: tol });
      render();
    }
  });
}
export function bindManualEvents(container, stateRef, render) { for (const field of ['manual-policy', 'manual-tolerance', 'manual-restraints-text']) onChange(container, field, (value) => { stateRef.current = updateManualElementSideloadConfig(stateRef.current, field, value); }); }
export function bindWeightMatchEvents(container, stateRef, render) { onChange(container, 'weight-match-overrides', (value) => { stateRef.current = updateWeightMatchOverrides(stateRef.current, value); }); }

export function bindSupportMapperEvents(container, stateRef, render) {
  onChange(container, 'support-mapper-test-input', (value) => { stateRef.current = updateSupportTypeMapperTestInput(stateRef.current, value); });
  container.querySelectorAll('[data-field^="support-mapper-aliases-"], [data-field^="support-mapper-cii-"]').forEach((input) => {
    input.addEventListener('change', () => { stateRef.current = updateSupportTypeMapperConfig(stateRef.current, input.dataset.field, input.value); });
  });
}

export function bindActionEvents(container, stateRef, render) {
  onClick(container, 'test-regex', () => testRegexFromUi(stateRef, render, false));
  onClick(container, 'save-regex-config', () => testRegexFromUi(stateRef, render, true));
  onClick(container, 'build-resolver-index', () => runResolverJsonTraceFromUi(container, stateRef, render, false));
  onClick(container, 'cancel-indexed-build', () => cancelIndexedBuildFromUi(stateRef,render));
  onClick(container, 'save-resolver-json-config', () => runResolverJsonTraceFromUi(container, stateRef, render, true));
  onClick(container, 'download-evidence-tree-csv', () => downloadResolverTraceCsvFromUi(stateRef, render, 'evidence-tree', container));
  onClick(container, 'download-node-wise-trace-csv', () => downloadResolverTraceCsvFromUi(stateRef, render, 'node-wise-trace', container));
  onClick(container, 'copy-matched-facts', () => copyMatchedFactsFromUi(stateRef, render));
  onClick(container, 'run-manual-element-sideload', () => runManualElementSideloadFromUi(container, stateRef, render, false));
  onClick(container, 'save-manual-element-sideload', () => runManualElementSideloadFromUi(container, stateRef, render, true));
  onClick(container, 'build-preview-audit', () => buildPreviewAuditFromUi(stateRef, render));
  onClick(container, 'build-weight-match', () => runWeightMatchFromUi(stateRef, render, false));
  onClick(container, 'finalize-weight-match', () => runWeightMatchFromUi(stateRef, render, true));
  onClick(container, 'build-support-mapper', () => runSupportMapperFromUi(stateRef, render, false));
  onClick(container, 'save-support-mapper', () => runSupportMapperFromUi(stateRef, render, true));
  onClick(container, 'refresh-output-run', () => refreshOutputRunFromUi(stateRef, render));
  onClick(container, 'load-import-masters', () => loadImportMastersFromUi(stateRef, render));
  onClick(container, 'clear-master-context', () => clearMasterContextFromUi(stateRef, render));
  onClick(container, 'run', () => runWorkflowFromUi(stateRef, render));
  for (const kind of ['enriched', 'cii', 'diagnostics', 'manifest']) onClick(container, `download-${kind}`, () => downloadArtifact(stateRef.current, kind));
  onClick(container, 'clear', () => {
    cancelIndexedBuild(stateRef);
    beginLatestOperation(stateRef,'resolver-build');
    replaceState(stateRef, resetWorkflowState(), render);
  });
}

export async function testRegexFromUi(stateRef, render, save) { stateRef.current = updateWorkflowState(stateRef.current, { regexTesterRunning: true }); render(); const sourceText = await sourceTextFromState(stateRef.current); const result = runStandaloneRegexTester({ ...stateRef.current, sourceText, extractionConfig: stateRef.current.regexTesterConfig }); stateRef.current = save ? applyStandaloneRegexTesterResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { regexTesterResult: result, regexTesterRunning: false }); render(); }
export function cancelIndexedBuildFromUi(stateRef,render){
  if(stateRef.current.resolverSourceMode!=='lfj-indexed-preview'||
     !stateRef.current.resolverJsonTraceRunning)return false;
  beginLatestOperation(stateRef,'resolver-build');
  cancelIndexedBuild(stateRef);
  stateRef.current=updateWorkflowState(stateRef.current,{
    resolverJsonTraceRunning:false,lfjIndexedPreview:null,
    lfjIndexedExportReceipt:null,lfjIndexedExportOptIn:false,
    lfjIndexedPreviewStatus:'Indexed Build cancelled by user.',
    resolverJsonTraceExportStatus:'Indexed Build cancelled; CSV downloads unavailable.',
    resolverJsonTraceWriteBackStatus:'Indexed Build cancelled.'
  });
  render();
  return true;
}
// The current indexed projection matches supported flat ALL source scope only.
// A previously selected hierarchy/branch must never be silently exported as ALL.
function unsupportedIndexedScope(state) {
  const scope = state?.jsonTraceScopeId;
  if (scope != null && scope !== '' && scope !== ALL_SCOPE_ID) return true;
  const branch = state?.branchSelection;
  if (branch == null || branch === '' || branch === ALL_SCOPE_ID) return false;
  if (Array.isArray(branch))
    return branch.some(id => id !== ALL_SCOPE_ID);
  return true;
}

export async function runResolverJsonTraceFromUi(container, stateRef, render, save) {
  cancelIndexedBuild(stateRef);
  const isLatest = beginLatestOperation(stateRef, 'resolver-build');
  // A new Build must not leave the previous CSVs authorized or on screen.
  stateRef.current = updateWorkflowState(stateRef.current, {
    resolverJsonTraceRunning: true, resolverJsonTraceExportStatus: '',
    resolverJsonTraceResult: null, resolverJsonTraceJsonResult: null,
    resolverJsonTraceAcceptedRevision: null, lfjIndexedPreview: null,
    lfjIndexedPreviewStatus: '', lfjIndexedExportReceipt: null,
    lfjIndexedExportOptIn: false
  });
  render();
  let requestedRevision = null;
  const rejectChanged = () => {
    if (!isLatest()) return null;
    stateRef.current = updateWorkflowState(stateRef.current, {
      resolverJsonTraceRunning: false,
      resolverJsonTraceExportStatus: 'Resolver inputs changed during Build; rerun before export.'
    });
    render();
    return null;
  };
  try {
    // The indexed path is opt-in and PREVIEW-ONLY until a distinct product
    // acceptance contract authorizes both CSV exports. Never treat the
    // research handoff's downloadAuthorized:false as a product permission.
    if (stateRef.current.resolverSourceMode === 'lfj-indexed-preview') {
      if (save) throw new Error('Indexed preview cannot write engineering config');
      if (unsupportedIndexedScope(stateRef.current))
        throw new Error('Indexed LFJ Build supports All scopes only; selected hierarchy or branch is not implemented. Select All scopes and rebuild.');
      const indexedConfigText = container.querySelector('[data-field="resolver-json-config"]');
      if (indexedConfigText) {
        try { JSON.parse(String(indexedConfigText.value || '{}')); }
        catch { throw new Error('Resolver configuration JSON is invalid'); }
        stateRef.current = updateResolverJsonTraceConfig(
          stateRef.current, indexedConfigText.value);
      }
      const requested = currentResolverTraceRevision(stateRef.current);
      requestedRevision = requested;
      const input = stateRef.current;
      if (!(input.stagedJsonFile instanceof Blob))
        throw new Error('Select the original JSON file for indexed preview');
      const xmlText = await sourceTextFromState(input);
      if (!isLatest()) return null;
      if (currentResolverTraceRevision(stateRef.current) !== requested)
        return rejectChanged();
      const isCurrent = () => isLatest() &&
        currentResolverTraceRevision(stateRef.current) === requested;
      const controller=beginIndexedBuild(stateRef);
      let preview;
      try{
        preview=await buildIndexedResolverPreview({
          blob:input.stagedJsonFile,xmlText,
          config:input.resolverJsonTraceConfig||{},
          isCurrent:()=>isCurrent()&&isIndexedBuildCurrent(stateRef,controller),
          signal:controller.signal
        });
      }finally{
        releaseIndexedBuild(stateRef,controller);
      }
      if (!isCurrent()) return rejectChanged();
      const receipt = createIndexedExportReceipt({
        preview, config: input.resolverJsonTraceConfig || {},
        revision: requested, sourceFile: input.stagedJsonFile,
        selectedScopeId: input.jsonTraceScopeId || ALL_SCOPE_ID
      });
      stateRef.current = updateWorkflowState(stateRef.current, {
        lfjIndexedExportReceipt: receipt, lfjIndexedExportOptIn: false,
        lfjIndexedPreview: preview, lfjIndexedPreviewStatus:
          'Indexed Build complete. Enable locally verified CSV downloads; downstream engineering approval remains separate.',
        resolverJsonTraceRunning: false,
        resolverJsonTraceExportStatus:
          'Indexed Build source-verified. Local CSV downloads require explicit opt-in.',
        resolverJsonTraceWriteBackStatus:
          `Indexed preview: ${preview.xmlNodes} XML nodes, ${preview.matchedXmlNodes} matched.`
      });
      render();
      return preview;
    }
    const tx = container.querySelector('[data-field="resolver-json-config"]');
    if (tx) {
      try { JSON.parse(String(tx.value || '{}')); }
      catch { throw new Error('Resolver configuration JSON is invalid'); }
      stateRef.current = updateResolverJsonTraceConfig(stateRef.current, tx.value);
    }
    requestedRevision = currentResolverTraceRevision(stateRef.current);
    const sourceText = await sourceTextFromState(stateRef.current);
    const stagedJsonText = await stagedJsonTextFromState(stateRef.current);
    if (!isLatest()) return null;
    if (currentResolverTraceRevision(stateRef.current) !== requestedRevision)
      return rejectChanged();
    if (!sourceText.trim() || !stagedJsonText.trim())
      throw new Error('XML source and staged JSON are both required');
    const result = runStandaloneResolverJsonTrace({
      ...stateRef.current, sourceText, stagedJsonText,
      jsonConfig: stateRef.current.resolverJsonTraceConfig
    });
    if (!isLatest()) return null;
    if (currentResolverTraceRevision(stateRef.current) !== requestedRevision)
      return rejectChanged();
    if (!result || !Array.isArray(result.traceResolutionLedger?.records))
      throw new Error('Resolver returned no complete trace ledger');
    const benchmark = stateRef.current.resolverJsonTraceTableResult
      ? compareTraceResultsByComponentRef(result, stateRef.current.resolverJsonTraceTableResult)
      : stateRef.current.jsonTraceTableBenchmark;
    stateRef.current = save
      ? updateWorkflowState(applyStandaloneResolverJsonTraceResult(stateRef.current, result), {
          jsonTraceTableBenchmark: benchmark, resolverJsonTraceExportStatus: ''
        })
      : updateWorkflowState(stateRef.current, {
          resolverJsonTraceResult: result, resolverJsonTraceJsonResult: result,
          resolverJsonTraceAcceptedRevision: requestedRevision,
          jsonTraceTableBenchmark: benchmark, resolverJsonTraceRunning: false,
          resolverJsonTraceExportStatus: '',
          resolverJsonTraceWriteBackStatus:
            `Resolver index built: ${result.resolvedFacts.length} facts processed.`
        });
    render();
    return result;
  } catch (error) {
    if (!isLatest()) return null;
    if (requestedRevision !== null &&
        currentResolverTraceRevision(stateRef.current) !== requestedRevision)
      return rejectChanged();
    const message = String(error?.message || 'Unknown error')
      .replace(/\s+/g, ' ').slice(0, 240);
    stateRef.current = updateWorkflowState(stateRef.current, {
      resolverJsonTraceRunning: false,
      lfjIndexedPreview: null, lfjIndexedExportReceipt: null,
      lfjIndexedExportOptIn: false,
      lfjIndexedPreviewStatus: `Indexed Build failed: ${message}`,
      resolverJsonTraceResult: null, resolverJsonTraceJsonResult: null,
      resolverJsonTraceAcceptedRevision: null,
      resolverJsonTraceExportStatus: `Resolver Build failed: ${message}`,
      resolverJsonTraceWriteBackStatus: `Resolver Build failed: ${message}`
    });
    render();
    return null;
  }
}
export async function runManualElementSideloadFromUi(container, stateRef, render, save) {
  stateRef.current = updateWorkflowState(stateRef.current, { manualElementSideloadRunning: true });
  render();
  const tx = container.querySelector('[data-field="manual-restraints-text"]');
  if (tx) stateRef.current = updateManualElementSideloadConfig(stateRef.current, 'manual-restraints-text', tx.value);
  const pol = container.querySelector('[data-field="manual-policy"]');
  if (pol) stateRef.current = updateManualElementSideloadConfig(stateRef.current, 'manual-policy', pol.value);
  const tol = container.querySelector('[data-field="manual-tolerance"]');
  if (tol) stateRef.current = updateManualElementSideloadConfig(stateRef.current, 'manual-tolerance', tol.value);
  const sourceText = await sourceTextFromState(stateRef.current);
  const result = runStandaloneManualElementSideload({ ...stateRef.current, sourceText, config: stateRef.current.manualElementSideloadConfig });
  stateRef.current = save ? applyStandaloneManualElementSideloadResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { manualElementSideloadResult: result, manualElementSideloadRunning: false });
  render();
}
export function buildPreviewAuditFromUi(stateRef, render) { stateRef.current = applyPreviewDiagnosticsAuditReport(stateRef.current, buildStandalonePreviewDiagnosticsAudit(stateRef.current)); render(); }
export function runWeightMatchFromUi(stateRef, render, finalize) { stateRef.current = updateWorkflowState(stateRef.current, { weightMatchRunning: true }); render(); const result = runStandaloneWeightMatch({ ...stateRef.current, weightMatchOverridesJson: stateRef.current.weightMatchOverridesJson }); stateRef.current = applyStandaloneWeightMatchResult(stateRef.current, result, finalize); render(); }
export function runSupportMapperFromUi(stateRef, render, save) { stateRef.current = updateWorkflowState(stateRef.current, { supportTypeMapperRunning: true }); render(); const result = runStandaloneSupportTypeMapper({ ...stateRef.current, mapperRows: stateRef.current.supportTypeMapperConfig, testInput: stateRef.current.supportTypeMapperTestInput }); stateRef.current = applyStandaloneSupportTypeMapperResult(stateRef.current, result, save); render(); }
export function refreshOutputRunFromUi(stateRef, render) { stateRef.current = applyStandaloneOutputRunReadiness(stateRef.current, buildStandaloneOutputRunReadiness(stateRef.current)); render(); }

function traceResult(state) {
  return state?.resolverJsonTraceResult || state?.resolverJsonTraceJsonResult || null;
}

async function downloadIndexedVerifiedCsv(stateRef, render, kind, container) {
  const initial = stateRef.current;
  const revision = currentResolverTraceRevision(initial);
  const isLatest = beginLatestOperation(stateRef, 'indexed-csv-' + kind);
  const isCurrent = () => isLatest() &&
    stateRef.current.resolverSourceMode === 'lfj-indexed-preview' &&
    stateRef.current.lfjIndexedPreview === initial.lfjIndexedPreview &&
    stateRef.current.lfjIndexedExportReceipt === initial.lfjIndexedExportReceipt &&
    stateRef.current.lfjIndexedExportOptIn === true &&
    stateRef.current.stagedJsonFile === initial.stagedJsonFile &&
    (stateRef.current.jsonTraceScopeId || ALL_SCOPE_ID) ===
      (initial.jsonTraceScopeId || ALL_SCOPE_ID) &&
    stateRef.current.sourceText === initial.sourceText &&
    !stateRef.current.resolverJsonTraceRunning &&
    currentResolverTraceRevision(stateRef.current) === revision;
  try {
    const input = container?.querySelector?.('[data-field="resolver-json-config"]');
    if (input) {
      let parsed;
      try { parsed = JSON.parse(String(input.value || '{}')); }
      catch { throw new Error('Unsaved Resolver configuration JSON is invalid'); }
      if (JSON.stringify(parsed) !== JSON.stringify(initial.resolverJsonTraceConfig))
        throw new Error('Resolver configuration edited since Build; rebuild before CSV');
    }
    const result = await verifyIndexedProductCsv({
      receipt: initial.lfjIndexedExportReceipt,
      preview: initial.lfjIndexedPreview,
      kind, sourceFile: initial.stagedJsonFile,
      xmlText: initial.sourceText, config: initial.resolverJsonTraceConfig,
      revision, optIn: initial.lfjIndexedExportOptIn, isCurrent,
      selectedScopeId: initial.jsonTraceScopeId || ALL_SCOPE_ID
    });
    if (!isCurrent()) return null;
    downloadTextFile(result.fileName, result.content, 'text/csv;charset=utf-8');
    stateRef.current = updateWorkflowState(stateRef.current, {
      resolverJsonTraceExportStatus:
        `Locally verified ${result.rowCount} rows (${result.bytes} bytes, SHA-256 ${result.sha256}); downstream CII approval not granted.`
    });
    render();
    return result;
  } catch (error) {
    if (!isLatest() || currentResolverTraceRevision(stateRef.current) !== revision)
      return null;
    stateRef.current = updateWorkflowState(stateRef.current, {
      resolverJsonTraceExportStatus: 'Indexed CSV download blocked: ' +
        String(error?.message || error).replace(/\s+/g, ' ').slice(0, 230)
    });
    render();
    return null;
  }
}

export function downloadResolverTraceCsvFromUi(stateRef, render, kind, container = null) {
  if (stateRef.current.resolverSourceMode === 'lfj-indexed-preview')
    return downloadIndexedVerifiedCsv(stateRef, render, kind, container);
  const state=stateRef.current;
  if(state.resolverSourceMode === 'lfj-indexed-preview'||
     state.resolverJsonTraceRunning||
     state.resolverJsonTraceAcceptedRevision===null||
     state.resolverJsonTraceAcceptedRevision===undefined||
     state.resolverJsonTraceAcceptedRevision!==currentResolverTraceRevision(state)){
    stateRef.current=updateWorkflowState(state,{
      resolverJsonTraceExportStatus:'Trace CSV export blocked: Build the current source and config first.'
    });
    render();
    return null;
  }
  const result = traceResult(stateRef.current);
  const isEvidence = kind === 'evidence-tree';
  const rowCount = isEvidence ? buildEvidenceTreeRows(result).length : buildXmlNodeWiseTraceRows(result).length;
  if (!rowCount) {
    stateRef.current = updateWorkflowState(stateRef.current, { resolverJsonTraceExportStatus: 'No trace rows are available for export.' });
    render();
    return null;
  }
  const content = isEvidence ? buildEvidenceTreeCsv(result) : buildXmlNodeWiseTraceCsv(result);
  const fileName = isEvidence ? 'xml-cii-evidence-tree.csv' : 'xml-cii-node-wise-trace.csv';
  downloadTextFile(fileName, content, 'text/csv;charset=utf-8');
  stateRef.current = updateWorkflowState(stateRef.current, { resolverJsonTraceExportStatus: `Downloaded ${rowCount} ${isEvidence ? 'evidence' : 'node-trace'} row(s) as CSV.` });
  render();
  return { fileName, rowCount, content };
}

async function writeClipboardText(value) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  if (typeof document === 'undefined' || !document.body) throw new Error('Clipboard API is unavailable.');
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  if (textarea.style) Object.assign(textarea.style, { position: 'fixed', left: '-9999px', top: '0' });
  document.body.appendChild(textarea);
  textarea.select?.();
  const copied = document.execCommand?.('copy') === true;
  textarea.remove?.();
  if (!copied) throw new Error('Clipboard copy was rejected by the browser.');
  return true;
}

export async function copyMatchedFactsFromUi(stateRef, render) {
  const result = traceResult(stateRef.current);
  const matchedRows = buildMatchedFactsRows(result);
  if (!matchedRows.length) {
    stateRef.current = updateWorkflowState(stateRef.current, { resolverJsonTraceExportStatus: 'No matched facts are available to copy.' });
    render();
    return false;
  }
  try {
    await writeClipboardText(buildMatchedFactsTsv(result));
    stateRef.current = updateWorkflowState(stateRef.current, { resolverJsonTraceExportStatus: `Copied ${matchedRows.length} matched fact row(s) with headers.` });
    render();
    return true;
  } catch (error) {
    stateRef.current = updateWorkflowState(stateRef.current, { resolverJsonTraceExportStatus: `Copy failed: ${error?.message || 'Clipboard unavailable.'}` });
    render();
    return false;
  }
}

export async function sourceTextFromState(state) {
  if (state.sourceText) return state.sourceText;
  if (state.sourceFile) {
    try { return await readTextFile(state.sourceFile) || ''; } catch { return ''; }
  }
  return '';
}
export async function stagedJsonTextFromState(state) {
  if (state.stagedJsonText) return state.stagedJsonText;
  if (state.stagedJsonFile) {
    try { return await readTextFile(state.stagedJsonFile) || ''; } catch { return ''; }
  }
  return '';
}

function artifactText(state, kind) {
  const report = state.outputRunReadinessReport || buildStandaloneOutputRunReadiness(state);
  if (kind === 'enriched') return { name: state.result?.enrichedName, text: state.result?.enrichedText, mime: 'application/xml;charset=utf-8' };
  if (kind === 'cii') return { name: state.result?.ciiName, text: state.result?.ciiText, mime: 'text/plain;charset=utf-8' };
  if (kind === 'diagnostics') return { name: 'xml-cii-diagnostics.json', text: JSON.stringify(state.result?.diagnostics || {}, null, 2), mime: 'application/json;charset=utf-8' };
  return { name: 'xml-cii-run-manifest.json', text: JSON.stringify(report.manifest || {}, null, 2), mime: 'application/json;charset=utf-8' };
}

export function downloadArtifact(state, kind) {
  const artifact = artifactText(state, kind);
  if (!artifact.text) return null;
  return downloadTextFile(maskedFileName(artifact.name || `xml-cii-${kind}.txt`), artifact.text, artifact.mime);
}

export function parseTriState(value) { if (value === 'true') return true; if (value === 'false') return false; return null; }
export function onChange(container, field, handler) { container.querySelector(`[data-field="${field}"]`)?.addEventListener('change', (event) => handler(event.target.value, event)); }
export function onClick(container, action, handler) { container.querySelector(`[data-action="${action}"]`)?.addEventListener('click', handler); }
