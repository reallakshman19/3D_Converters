import { runXmlCii2019Workflow, validateSupportConfigJson } from '../xml-cii-workflow-api.js';
import { prepareStandaloneImportMasters } from '../xml-cii-master-context.js';
import { runStandaloneRegexTester } from '../xml-cii-regex-tester.js';
import { runStandaloneResolverJsonTrace } from '../xml-cii-resolver-json-trace.js';
import { runStandaloneManualElementSideload } from '../xml-cii-manual-element-sideload.js';
import { buildStandalonePreviewDiagnosticsAudit } from '../xml-cii-preview-diagnostics-audit.js';
import { buildXmlCiiWorkflowJobFromUiState, readTextFile } from '../xml-cii-workflow-ui-adapter.js';
import { downloadTextFile } from './xml-cii-adapted-dom.js';
import { applyPreviewDiagnosticsAuditReport, applyStandaloneImportMastersContext, applyStandaloneManualElementSideloadResult, applyStandaloneRegexTesterResult, applyStandaloneResolverJsonTraceResult, clearWorkflowResult, resetWorkflowState, updateManualElementSideloadConfig, updateRegexTesterConfig, updateResolverJsonTraceConfig, updateWorkflowOptions, updateWorkflowState } from './xml-cii-adapted-state.js';

export function bindAdaptedWorkflowEvents(container, stateRef, render) {
  bindPhaseEvents(container, stateRef, render);
  bindSourceEvents(container, stateRef, render);
  bindOptionEvents(container, stateRef, render);
  bindRegexEvents(container, stateRef, render);
  bindResolverEvents(container, stateRef, render);
  bindManualEvents(container, stateRef, render);
  bindActionEvents(container, stateRef, render);
}

export function replaceState(stateRef, nextState, render) { stateRef.current = nextState; render(); }
export function patchState(stateRef, patch, render) { replaceState(stateRef, updateWorkflowState(stateRef.current, patch), render); }
export function patchOptions(stateRef, optionPatch) { stateRef.current = updateWorkflowOptions(stateRef.current, optionPatch); }

export function bindPhaseEvents(container, stateRef, render) {
  container.querySelectorAll('[data-phase]').forEach((button) => {
    button.addEventListener('click', () => patchState(stateRef, { activePhaseId: button.dataset.phase }, render));
  });
}

export function bindSourceEvents(container, stateRef, render) {
  onChange(container, 'source-kind', (value) => patchState(stateRef, { sourceKind: value, result: null }, render));
  onChange(container, 'source-file', (_, event) => patchState(stateRef, { sourceFile: event.target.files?.[0] || null, result: null }, render));
  onChange(container, 'staged-json-file', (_, event) => patchState(stateRef, { stagedJsonFile: event.target.files?.[0] || null, result: null }, render));
  onChange(container, 'source-text', (value) => { stateRef.current = clearWorkflowResult(updateWorkflowState(stateRef.current, { sourceText: value })); });
  onChange(container, 'element-side-load', (value) => { stateRef.current = clearWorkflowResult(updateWorkflowState(stateRef.current, { elementSideLoadText: value })); });
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
  container.querySelectorAll('[data-field^="regex-"]').forEach((input) => input.addEventListener('change', () => { stateRef.current = updateRegexTesterConfig(stateRef.current, input.dataset.field, input.value); }));
}

export function bindResolverEvents(container, stateRef, render) {
  onChange(container, 'resolver-json-config', (value) => { stateRef.current = updateResolverJsonTraceConfig(stateRef.current, value); });
}

export function bindManualEvents(container, stateRef, render) {
  for (const field of ['manual-policy', 'manual-tolerance', 'manual-restraints-text']) onChange(container, field, (value) => { stateRef.current = updateManualElementSideloadConfig(stateRef.current, field, value); });
}

export function bindActionEvents(container, stateRef, render) {
  onClick(container, 'test-regex', () => testRegexFromUi(stateRef, render, false));
  onClick(container, 'save-regex-config', () => testRegexFromUi(stateRef, render, true));
  onClick(container, 'build-resolver-index', () => runResolverJsonTraceFromUi(stateRef, render, false));
  onClick(container, 'save-resolver-json-config', () => runResolverJsonTraceFromUi(stateRef, render, true));
  onClick(container, 'run-manual-element-sideload', () => runManualElementSideloadFromUi(stateRef, render, false));
  onClick(container, 'save-manual-element-sideload', () => runManualElementSideloadFromUi(stateRef, render, true));
  onClick(container, 'build-preview-audit', () => buildPreviewAuditFromUi(stateRef, render));
  onClick(container, 'load-import-masters', () => loadImportMastersFromUi(stateRef, render));
  onClick(container, 'run', () => runWorkflowFromUi(stateRef, render));
  onClick(container, 'download-enriched', () => downloadArtifact(stateRef.current.result, 'enriched'));
  onClick(container, 'download-cii', () => downloadArtifact(stateRef.current.result, 'cii'));
  onClick(container, 'clear', () => replaceState(stateRef, resetWorkflowState(), render));
}

export async function testRegexFromUi(stateRef, render, save) {
  stateRef.current = updateWorkflowState(stateRef.current, { regexTesterRunning: true });
  render();
  const sourceText = await sourceTextFromState(stateRef.current);
  const result = runStandaloneRegexTester({ ...stateRef.current, sourceText, extractionConfig: stateRef.current.regexTesterConfig });
  stateRef.current = save ? applyStandaloneRegexTesterResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { regexTesterResult: result, regexTesterRunning: false });
  render();
}

export async function runResolverJsonTraceFromUi(stateRef, render, save) {
  stateRef.current = updateWorkflowState(stateRef.current, { resolverJsonTraceRunning: true });
  render();
  const sourceText = await sourceTextFromState(stateRef.current);
  const stagedJsonText = await stagedJsonTextFromState(stateRef.current);
  const result = runStandaloneResolverJsonTrace({ ...stateRef.current, sourceText, stagedJsonText, jsonConfig: stateRef.current.resolverJsonTraceConfig });
  stateRef.current = save ? applyStandaloneResolverJsonTraceResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { resolverJsonTraceResult: result, resolverJsonTraceRunning: false });
  render();
}

export async function runManualElementSideloadFromUi(stateRef, render, save) {
  stateRef.current = updateWorkflowState(stateRef.current, { manualElementSideloadRunning: true });
  render();
  const sourceText = await sourceTextFromState(stateRef.current);
  const result = runStandaloneManualElementSideload({ ...stateRef.current, sourceText, config: stateRef.current.manualElementSideloadConfig });
  stateRef.current = save ? applyStandaloneManualElementSideloadResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { manualElementSideloadResult: result, manualElementSideloadRunning: false });
  render();
}

export function buildPreviewAuditFromUi(stateRef, render) {
  stateRef.current = applyPreviewDiagnosticsAuditReport(stateRef.current, buildStandalonePreviewDiagnosticsAudit(stateRef.current));
  render();
}

export async function sourceTextFromState(state) { return await readTextFile(state.sourceFile) || String(state.sourceText || ''); }
export async function stagedJsonTextFromState(state) { return await readTextFile(state.stagedJsonFile) || String(state.stagedJsonText || ''); }

export async function loadImportMastersFromUi(stateRef, render) {
  if (stateRef.current.importMastersLoading) return;
  stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: true });
  render();
  try {
    const masterContext = await prepareStandaloneImportMasters({ supportConfigJson: stateRef.current.supportConfigJson });
    stateRef.current = applyStandaloneImportMastersContext(stateRef.current, masterContext);
  } catch (error) {
    stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: false, importMastersWriteBackStatus: error?.message || String(error) });
  }
  render();
}

export async function runWorkflowFromUi(stateRef, render) {
  if (stateRef.current.running || !validateSupportConfigJson(stateRef.current.supportConfigJson).ok) return;
  stateRef.current = updateWorkflowState(stateRef.current, { running: true, result: null });
  render();
  try {
    const result = await runXmlCii2019Workflow(await buildXmlCiiWorkflowJobFromUiState(stateRef.current));
    stateRef.current = updateWorkflowState(stateRef.current, { result });
  } finally {
    stateRef.current = updateWorkflowState(stateRef.current, { running: false });
    render();
  }
}

export function downloadArtifact(result, kind) {
  if (kind === 'cii' && result?.ciiText) return downloadTextFile(result.ciiName, result.ciiText);
  if (kind === 'enriched' && result?.enrichedText) return downloadTextFile(result.enrichedName, result.enrichedText, 'application/xml;charset=utf-8');
  return null;
}

export function parseTriState(value) { if (value === 'true') return true; if (value === 'false') return false; return null; }
export function onChange(container, field, handler) { container.querySelector(`[data-field="${field}"]`)?.addEventListener('change', (event) => handler(event.target.value, event)); }
export function onClick(container, action, handler) { container.querySelector(`[data-action="${action}"]`)?.addEventListener('click', handler); }
