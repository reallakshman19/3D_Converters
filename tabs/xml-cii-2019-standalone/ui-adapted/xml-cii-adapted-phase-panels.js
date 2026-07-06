import { validateSupportConfigJson } from '../xml-cii-workflow-api.js';
import { createElement, createPre, appendLabeledControl, createOption } from './xml-cii-adapted-dom.js';
import { getAdaptedWorkflowPhase } from './xml-cii-adapted-phase-registry.js';
import { renderInputXmlControls, renderSourceControls, renderSourceTextControl, renderStagedJsonControl } from './xml-cii-adapted-controls.js';
import { renderStandaloneImportMastersPanel } from './xml-cii-adapted-import-masters.js';

export function renderActivePhase(root, state) {
  const phase = getAdaptedWorkflowPhase(state.activePhaseId);
  const card = createElement('section', '', 'xml-cii-standalone-card xml-cii-phase-panel');
  card.dataset.activePhase = phase.id;
  card.append(createElement('h2', phase.label), createElement('p', phase.summary, 'xml-cii-phase-help'));
  renderPhaseBody(card, phase.id, state);
  root.appendChild(card);
}

export function renderPhaseBody(card, phaseId, state) {
  if (phaseId === 'regex') return renderXmlOptionsPanel(card, state);
  if (phaseId === 'import-masters') return renderImportPanel(card, state);
  if (phaseId === 'json-trace') return renderJsonTracePanel(card, state);
  if (phaseId === 'preview') return renderPreviewPanel(card, state);
  if (phaseId === 'diagnostics') return renderDiagnosticsPanel(card, state);
  if (phaseId === 'weight-match') return renderWeightMatchPanel(card);
  if (phaseId === 'run') return renderRunPanel(card, state);
  if (phaseId === 'support-mapper') return renderSupportMapperPanel(card, state);
  if (phaseId === 'config') return renderConfigPanel(card, state);
  return renderCustomInputPanel(card, state);
}

export function renderImportPanel(card, state) {
  renderSourceControls(card, state);
  renderSourceTextControl(card, state);
  renderStagedJsonControl(card, state);
  renderStandaloneImportMastersPanel(card, state);
}

export function renderJsonTracePanel(card, state) {
  renderSourceControls(card, state);
  renderStagedJsonControl(card, state);
  renderInputXmlControls(card, state);
}

export function renderCustomInputPanel(card, state) {
  renderSourceControls(card, state);
  renderSourceTextControl(card, state);
  renderInputXmlControls(card, state);
}

export function renderXmlOptionsPanel(card, state) {
  const coords = appendLabeledControl(card, 'coordsMode:', createElement('select'));
  coords.dataset.field = 'coords-mode';
  for (const mode of ['first', 'all', 'none']) coords.appendChild(createOption(mode, mode, state.options.coordsMode === mode));
  renderXmlToggle(card, 'kgToNewton:', 'kg-to-newton', state.options.kgToNewton);
  renderXmlToggle(card, 'useRestraintTypeBasedOnJson:', 'json-restraints', state.options.useRestraintTypeBasedOnJson);
  renderSplitControl(card, state);
}

export function renderXmlToggle(card, label, field, checked) {
  const control = appendLabeledControl(card, label, createElement('input'));
  control.type = 'checkbox';
  control.checked = !!checked;
  control.dataset.field = field;
}

export function renderSplitControl(card, state) {
  const split = appendLabeledControl(card, 'splitCondensedValveFlange:', createElement('select'));
  const value = state.options.splitCondensedValveFlange;
  const selected = value === true ? 'true' : value === false ? 'false' : 'null';
  split.dataset.field = 'split-condensed';
  split.append(createOption('null', 'config/default', selected === 'null'), createOption('true', 'force true', selected === 'true'), createOption('false', 'force false', selected === 'false'));
}

export function renderPreviewPanel(card, state) {
  card.appendChild(createPre(JSON.stringify({
    sourceKind: state.sourceKind,
    sourceFile: state.sourceFile?.name || null,
    stagedJsonFile: state.stagedJsonFile?.name || null,
    sourceTextBytes: String(state.sourceText || '').length,
    elementSideLoadBytes: String(state.elementSideLoadText || '').length,
    masterRowCounts: state.masterContext?.rowCounts || null,
    options: state.options,
  }, null, 2)));
}

export function renderDiagnosticsPanel(card, state) {
  const text = state.result?.diagnostics ? JSON.stringify(state.result.diagnostics, null, 2) : 'No diagnostics yet.';
  card.appendChild(createPre(text));
}

export function renderWeightMatchPanel(card) {
  card.appendChild(createElement('p', 'Weight match remains config-driven in the standalone path. Use 8 Config to provide weight/material/rating maps.', 'xml-cii-phase-help'));
}

export function renderSupportMapperPanel(card, state) {
  const validation = validateSupportConfigJson(state.supportConfigJson);
  card.appendChild(createPre(validation.ok ? state.supportConfigJson : 'Fix supportConfigJson in 8 Config.'));
}

export function renderConfigPanel(card, state) {
  const validation = validateSupportConfigJson(state.supportConfigJson);
  const config = appendLabeledControl(card, 'supportConfigJson:', createElement('textarea'));
  config.value = state.supportConfigJson;
  config.dataset.field = 'support-config';
  card.appendChild(createElement('div', validation.ok ? 'JSON valid.' : validation.error, validation.ok ? 'xml-cii-valid' : 'xml-cii-invalid'));
}

export function renderRunPanel(card, state) {
  const mode = appendLabeledControl(card, 'Output:', createElement('select'));
  mode.dataset.field = 'output-mode';
  mode.append(createOption('enriched-only', 'enriched-only', state.options.outputMode === 'enriched-only'), createOption('cii-only', 'cii-only', state.options.outputMode === 'cii-only'), createOption('both', 'both', state.options.outputMode === 'both'));
  appendRunButtons(card, state);
}

export function appendRunButtons(card, state) {
  const run = createElement('button', state.running ? 'Running…' : 'Run standalone workflow');
  run.dataset.action = 'run';
  run.disabled = isRunDisabled(state);
  const enriched = createElement('button', 'Download enriched');
  enriched.dataset.action = 'download-enriched';
  enriched.disabled = !state.result?.enrichedText;
  const cii = createElement('button', 'Download CII');
  cii.dataset.action = 'download-cii';
  cii.disabled = !state.result?.ciiText;
  card.append(run, enriched, cii, createElement('button', 'Clear/reset'));
  card.lastChild.dataset.action = 'clear';
}

export function isRunDisabled(state) {
  const hasSource = !!state.sourceFile || String(state.sourceText || '').trim().length > 0;
  return state.running || !hasSource || !validateSupportConfigJson(state.supportConfigJson).ok;
}
