import { runXmlCii2019Workflow, validateSupportConfigJson } from '../xml-cii-workflow-api.js';
import { prepareStandaloneImportMasters } from '../xml-cii-master-context.js';
import { runStandaloneRegexTester } from '../xml-cii-regex-tester.js';
import { runStandaloneResolverJsonTrace } from '../xml-cii-resolver-json-trace.js';
import { runStandaloneManualElementSideload } from '../xml-cii-manual-element-sideload.js';
import { buildStandalonePreviewDiagnosticsAudit } from '../xml-cii-preview-diagnostics-audit.js';
import { runStandaloneWeightMatch } from '../xml-cii-weight-match.js';
import { runStandaloneSupportTypeMapper } from '../xml-cii-support-type-mapper.js';
import { buildStandaloneOutputRunReadiness } from '../xml-cii-output-run-readiness.js';
import { buildXmlCiiWorkflowJobFromUiState, readTextFile } from '../xml-cii-workflow-ui-adapter.js';
import { downloadTextFile } from './xml-cii-adapted-dom.js';
import { applyPreviewDiagnosticsAuditReport, applyStandaloneImportMastersContext, applyStandaloneManualElementSideloadResult, applyStandaloneOutputRunReadiness, applyStandaloneRegexTesterResult, applyStandaloneResolverJsonTraceResult, applyStandaloneSupportTypeMapperResult, applyStandaloneWeightMatchResult, clearWorkflowResult, resetWorkflowState, updateManualElementSideloadConfig, updateRegexTesterConfig, updateResolverJsonTraceConfig, updateSupportTypeMapperConfig, updateSupportTypeMapperTestInput, updateWeightMatchOverrides, updateWorkflowOptions, updateWorkflowState } from './xml-cii-adapted-state.js';

export function bindAdaptedWorkflowEvents(container, stateRef, render) {
  bindPhaseEvents(container, stateRef, render);
  bindSourceEvents(container, stateRef, render);
  bindOptionEvents(container, stateRef, render);
  bindRegexEvents(container, stateRef, render);
  bindResolverEvents(container, stateRef, render);
  bindManualEvents(container, stateRef, render);
  bindWeightMatchEvents(container, stateRef, render);
  bindSupportMapperEvents(container, stateRef, render);
  bindActionEvents(container, stateRef, render);
}

export function replaceState(stateRef, nextState, render) { stateRef.current = nextState; render(); }
export function patchState(stateRef, patch, render) { replaceState(stateRef, updateWorkflowState(stateRef.current, patch), render); }
export function patchOptions(stateRef, optionPatch) { stateRef.current = updateWorkflowOptions(stateRef.current, optionPatch); }

export function bindPhaseEvents(container, stateRef, render) { container.querySelectorAll('[data-phase]').forEach((button) => { button.addEventListener('click', () => patchState(stateRef, { activePhaseId: button.dataset.phase }, render)); }); }

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

export function bindRegexEvents(container, stateRef, render) { container.querySelectorAll('[data-field^="regex-"]').forEach((input) => input.addEventListener('change', () => { stateRef.current = updateRegexTesterConfig(stateRef.current, input.dataset.field, input.value); })); }
export function bindResolverEvents(container, stateRef, render) { onChange(container, 'resolver-json-config', (value) => { stateRef.current = updateResolverJsonTraceConfig(stateRef.current, value); }); }
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
  onClick(container, 'build-resolver-index', () => runResolverJsonTraceFromUi(stateRef, render, false));
  onClick(container, 'save-resolver-json-config', () => runResolverJsonTraceFromUi(stateRef, render, true));
  onClick(container, 'run-manual-element-sideload', () => runManualElementSideloadFromUi(stateRef, render, false));
  onClick(container, 'save-manual-element-sideload', () => runManualElementSideloadFromUi(stateRef, render, true));
  onClick(container, 'build-preview-audit', () => buildPreviewAuditFromUi(stateRef, render));
  onClick(container, 'build-weight-match', () => runWeightMatchFromUi(stateRef, render, false));
  onClick(container, 'finalize-weight-match', () => runWeightMatchFromUi(stateRef, render, true));
  onClick(container, 'build-support-mapper', () => runSupportMapperFromUi(stateRef, render, false));
  onClick(container, 'save-support-mapper', () => runSupportMapperFromUi(stateRef, render, true));
  onClick(container, 'refresh-output-run', () => refreshOutputRunFromUi(stateRef, render));
  onClick(container, 'load-import-masters', () => loadImportMastersFromUi(stateRef, render));
  onClick(container, 'run', () => runWorkflowFromUi(stateRef, render));
  for (const kind of ['enriched', 'cii', 'diagnostics', 'manifest']) onClick(container, `download-${kind}`, () => downloadArtifact(stateRef.current, kind));
  onClick(container, 'clear', () => replaceState(stateRef, resetWorkflowState(), render));
}

export async function testRegexFromUi(stateRef, render, save) { stateRef.current = updateWorkflowState(stateRef.current, { regexTesterRunning: true }); render(); const sourceText = await sourceTextFromState(stateRef.current); const result = runStandaloneRegexTester({ ...stateRef.current, sourceText, extractionConfig: stateRef.current.regexTesterConfig }); stateRef.current = save ? applyStandaloneRegexTesterResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { regexTesterResult: result, regexTesterRunning: false }); render(); }
export async function runResolverJsonTraceFromUi(stateRef, render, save) { stateRef.current = updateWorkflowState(stateRef.current, { resolverJsonTraceRunning: true }); render(); const sourceText = await sourceTextFromState(stateRef.current); const stagedJsonText = await stagedJsonTextFromState(stateRef.current); const result = runStandaloneResolverJsonTrace({ ...stateRef.current, sourceText, stagedJsonText, jsonConfig: stateRef.current.resolverJsonTraceConfig }); stateRef.current = save ? applyStandaloneResolverJsonTraceResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { resolverJsonTraceResult: result, resolverJsonTraceRunning: false }); render(); }
export async function runManualElementSideloadFromUi(stateRef, render, save) { stateRef.current = updateWorkflowState(stateRef.current, { manualElementSideloadRunning: true }); render(); const sourceText = await sourceTextFromState(stateRef.current); const result = runStandaloneManualElementSideload({ ...stateRef.current, sourceText, config: stateRef.current.manualElementSideloadConfig }); stateRef.current = save ? applyStandaloneManualElementSideloadResult(stateRef.current, result) : updateWorkflowState(stateRef.current, { manualElementSideloadResult: result, manualElementSideloadRunning: false }); render(); }
export function buildPreviewAuditFromUi(stateRef, render) { stateRef.current = applyPreviewDiagnosticsAuditReport(stateRef.current, buildStandalonePreviewDiagnosticsAudit(stateRef.current)); render(); }
export function runWeightMatchFromUi(stateRef, render, finalize) { stateRef.current = updateWorkflowState(stateRef.current, { weightMatchRunning: true }); render(); const result = runStandaloneWeightMatch({ ...stateRef.current, weightMatchOverridesJson: stateRef.current.weightMatchOverridesJson }); stateRef.current = applyStandaloneWeightMatchResult(stateRef.current, result, finalize); render(); }
export function runSupportMapperFromUi(stateRef, render, save) { stateRef.current = updateWorkflowState(stateRef.current, { supportTypeMapperRunning: true }); render(); const result = runStandaloneSupportTypeMapper({ ...stateRef.current, mapperRows: stateRef.current.supportTypeMapperConfig, testInput: stateRef.current.supportTypeMapperTestInput }); stateRef.current = applyStandaloneSupportTypeMapperResult(stateRef.current, result, save); render(); }
export function refreshOutputRunFromUi(stateRef, render) { stateRef.current = applyStandaloneOutputRunReadiness(stateRef.current, buildStandaloneOutputRunReadiness(stateRef.current)); render(); }

export async function sourceTextFromState(state) { return await readTextFile(state.sourceFile) || String(state.sourceText || ''); }
export async function stagedJsonTextFromState(state) { return await readTextFile(state.stagedJsonFile) || String(state.stagedJsonText || ''); }

export async function loadImportMastersFromUi(stateRef, render) {
  if (stateRef.current.importMastersLoading) return;
  stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: true }); render();
  try { const masterContext = await prepareStandaloneImportMasters({ supportConfigJson: stateRef.current.supportConfigJson }); stateRef.current = applyStandaloneImportMastersContext(stateRef.current, masterContext); }
  catch (error) { stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: false, importMastersWriteBackStatus: error?.message || String(error) }); }
  render();
}

export async function runWorkflowFromUi(stateRef, render) {
  if (stateRef.current.running || !validateSupportConfigJson(stateRef.current.supportConfigJson).ok) return;
  const readiness = buildStandaloneOutputRunReadiness(stateRef.current);
  if (readiness.summary.blockingCount > 0) { stateRef.current = applyStandaloneOutputRunReadiness(stateRef.current, readiness); render(); return; }
  stateRef.current = updateWorkflowState(stateRef.current, { running: true, result: null }); render();
  try { const result = await runXmlCii2019Workflow(await buildXmlCiiWorkflowJobFromUiState(stateRef.current)); stateRef.current = updateWorkflowState(stateRef.current, { result }); }
  finally { stateRef.current = applyStandaloneOutputRunReadiness(updateWorkflowState(stateRef.current, { running: false }), buildStandaloneOutputRunReadiness(stateRef.current)); render(); }
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
  return downloadTextFile(artifact.name || `xml-cii-${kind}.txt`, artifact.text, artifact.mime);
}

export function parseTriState(value) { if (value === 'true') return true; if (value === 'false') return false; return null; }
export function onChange(container, field, handler) { container.querySelector(`[data-field="${field}"]`)?.addEventListener('change', (event) => handler(event.target.value, event)); }
export function onClick(container, action, handler) { container.querySelector(`[data-action="${action}"]`)?.addEventListener('click', handler); }
