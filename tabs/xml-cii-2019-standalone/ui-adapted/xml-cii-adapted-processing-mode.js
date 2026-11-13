import { modeBSupportConfigBlock, modeBStagedSourcesFromManifest } from '../../../converters/xml-cii2019-core/xml-node-offset-combine.js?v=20261113-x5a-2';
import { commonModeASupportConfig } from '../xml-cii-mode-a-batch.js?v=20260930-issue781-branch-scope-1';
import { clearModeASourceCaches, replaceModeAState } from './xml-cii-adapted-mode-a-state.js?v=20261001-weight-output-2';

export function xmlCiiProcessingMode(state = {}) {
  return ['single', 'mode-a', 'mode-b'].includes(state.xmlProcessingMode) ? state.xmlProcessingMode : 'single';
}

export function selectXmlCiiProcessingMode(stateRef, mode, render) {
  const rawRef = stateRef.modeABaseRef || stateRef;
  // Mode B fields describe one combined Single document only.
  const combined = mode === 'single' ? {} : { modeBManifest: null, modeBStagedSources: null };
  replaceModeAState(rawRef, { ...rawRef.current, ...combined, xmlProcessingMode: mode,
    activePhaseId: 'source', activeSubTabId: 'loader' });
  render();
}

// A combined document is a new Single source. Node-specific overrides and
// staged geometry from its constituent files cannot describe that new source.
// A Mode B combined XML keeps its node-offset manifest: the converter needs the
// source ranges so independent sources are never joined (RCA-02/RCA-03).
export function singleXmlCiiSourceState(state, sourceFile, sourceText, sourceKind = 'auto', { modeBManifest = null, modeBStagedTexts = [] } = {}) {
  const config = JSON.parse(commonModeASupportConfig(state.supportConfigJson || '{}'));
  if (modeBManifest) config.modeB = modeBSupportConfigBlock(modeBManifest);
  const configJson = JSON.stringify(config, null, 2);
  return { ...state, xmlProcessingMode: 'single', sourceFile, sourceText, sourceKind,
    supportConfigJson: configJson, modeBManifest: modeBManifest || null,
    modeBStagedSources: modeBManifest ? modeBStagedSourcesFromManifest(modeBManifest, modeBStagedTexts) : null,
    masterContext: state.masterContext ? { ...state.masterContext, config } : null,
    sourceBatch: null, branchScope: null, branchSelection: {}, stagedJsonFile: null, stagedJsonText: '',
    elementSideLoadText: '', regexTesterResult: null, resolverJsonTraceResult: null,
    resolverJsonTraceJsonResult: null, resolverJsonTraceTableResult: null,
    manualElementSideloadResult: null, previewDiagnosticsAuditReport: null,
    weightMatchResult: null, weightMatchOverridesJson: '{}', supportTypeMapperResult: null,
    outputRunReadinessReport: null, result: null, batchRunResult: null, batchRunStatus: '',
    format1SelectedSample: '', format2SelectedSample: '', activePhaseId: 'source', activeSubTabId: 'loader' };
}

export function loadXmlCiiSingleSource(stateRef, sourceFile, sourceText, render, sourceKind = 'auto', options = {}) {
  const rawRef = stateRef.modeABaseRef || stateRef;
  clearModeASourceCaches();
  replaceModeAState(rawRef, singleXmlCiiSourceState(rawRef.current, sourceFile, sourceText, sourceKind, options));
  render();
}
