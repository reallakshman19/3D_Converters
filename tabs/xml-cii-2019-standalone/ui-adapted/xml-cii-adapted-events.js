import { runXmlCii2019Workflow, validateSupportConfigJson } from '../xml-cii-workflow-api.js';
import { buildXmlCiiWorkflowJobFromUiState } from '../xml-cii-workflow-ui-adapter.js';
import { downloadTextFile } from './xml-cii-adapted-dom.js';
import { clearWorkflowResult, resetWorkflowState, updateWorkflowOptions, updateWorkflowState } from './xml-cii-adapted-state.js';

export function bindAdaptedWorkflowEvents(container, stateRef, render) {
  bindPhaseEvents(container, stateRef, render);
  bindSourceEvents(container, stateRef, render);
  bindOptionEvents(container, stateRef, render);
  bindActionEvents(container, stateRef, render);
}

export function replaceState(stateRef, nextState, render) {
  stateRef.current = nextState;
  render();
}

export function patchState(stateRef, patch, render) {
  replaceState(stateRef, updateWorkflowState(stateRef.current, patch), render);
}

export function patchOptions(stateRef, optionPatch) {
  stateRef.current = updateWorkflowOptions(stateRef.current, optionPatch);
}

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
  onChange(container, 'support-config', (value) => patchState(stateRef, { supportConfigJson: value, result: null }, render));
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

export function bindActionEvents(container, stateRef, render) {
  onClick(container, 'run', () => runWorkflowFromUi(stateRef, render));
  onClick(container, 'download-enriched', () => downloadArtifact(stateRef.current.result, 'enriched'));
  onClick(container, 'download-cii', () => downloadArtifact(stateRef.current.result, 'cii'));
  onClick(container, 'clear', () => replaceState(stateRef, resetWorkflowState(), render));
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

export function parseTriState(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

export function onChange(container, field, handler) {
  container.querySelector(`[data-field="${field}"]`)?.addEventListener('change', (event) => handler(event.target.value, event));
}

export function onClick(container, action, handler) {
  container.querySelector(`[data-action="${action}"]`)?.addEventListener('click', handler);
}
