import { validateSupportConfigJson } from '../xml-cii-workflow-api.js';
import { createElement, appendLabeledControl, createOption } from './xml-cii-adapted-dom.js';
import { getAdaptedWorkflowPhase } from './xml-cii-adapted-phase-registry.js';
import { renderInputXmlControls, renderSourceControls, renderSourceTextControl, renderStagedJsonControl } from './xml-cii-adapted-controls.js';
import { renderStandaloneSourceModePanel, renderDetectionSummary, renderValidityDiagnostics } from './xml-cii-adapted-source-mode.js';
import { renderStandaloneSourcePreviewPanel } from './xml-cii-adapted-source-preview.js';
import { renderStandaloneImportMastersPanel } from './xml-cii-adapted-import-masters.js';
import { renderStandaloneRegexTesterPanel } from './xml-cii-adapted-regex-tester.js';
import { renderStandaloneResolverJsonTracePanel } from './xml-cii-adapted-resolver-json-trace.js';
import { renderStandaloneInputXmlElementSideloadPanel, renderStandaloneManualElementSideloadPanel } from './xml-cii-adapted-manual-element-sideload.js';
import { renderStandaloneDiagnosticsReportPanel, renderStandaloneMatchedAuditPanel, renderStandalonePreviewReportPanel } from './xml-cii-adapted-preview-diagnostics-audit.js';
import { renderStandaloneWeightMatchPanel } from './xml-cii-adapted-weight-match.js';
import { renderStandaloneSupportTypeMapperPanel } from './xml-cii-adapted-support-type-mapper.js';
import { renderStandaloneOutputRunPanel } from './xml-cii-adapted-output-run.js';
import { summarizeWorkflowFile } from '../xml-cii-workflow-ui-adapter.js';

export function renderActivePhase(root, stateRef, render) {
  const state = stateRef.current;
  const phase = getAdaptedWorkflowPhase(state.activePhaseId);
  const card = createElement('section', '', 'xml-cii-standalone-card xml-cii-phase-panel');
  card.dataset.activePhase = phase.id;
  card.append(createElement('h2', phase.label), createElement('p', phase.summary, 'xml-cii-phase-help'));
  renderPhaseBody(card, phase.id, stateRef, render);
  root.appendChild(card);
}

export function renderPhaseBody(card, phaseId, stateRef, render) {
  const state = stateRef.current;
  if (phaseId === 'source') {
    const subTabId = state.activeSubTabId || 'loader';
    const container = createElement('div', '', 'xml-cii-sub-tabs-layout');
    
    const rail = createElement('nav', '', 'xml-cii-sub-nav-rail');
    rail.setAttribute('aria-label', 'Source & Masters sub-phases');
    
    const subPhases = [
      { id: 'loader', label: '📂 Source' },
      { id: 'linelist', label: '📊 Line List' },
      { id: 'pipingClass', label: '🪈 Piping Class' },
      { id: 'materialMap', label: '🗺️ Material Map' },
      { id: 'weight', label: '⚖️ Valve Weights' },
      { id: 'manualOverrides', label: '✏️ Manual Overrides' },
      { id: 'elementSideload', label: '🎛️ InputXML / Element Side-load' }
    ];
    
    for (const sub of subPhases) {
      const btn = createElement('button', sub.label, 'xml-cii-sub-phase-pill');
      btn.type = 'button';
      btn.dataset.subTab = sub.id;
      btn.classList.toggle('is-active', subTabId === sub.id);
      rail.appendChild(btn);
    }
    
    container.appendChild(rail);
    
    const subWorkspace = createElement('div', '', 'xml-cii-sub-workspace');
    
    if (subTabId === 'loader') {
      renderSourceControls(subWorkspace, state);
      renderDetectionSummary(subWorkspace, state);
      renderValidityDiagnostics(subWorkspace, state);
      renderStandaloneSourcePreviewPanel(subWorkspace, state);
    } else if (subTabId === 'linelist') {
      renderStandaloneImportMastersPanel(subWorkspace, state, 'lineList');
    } else if (subTabId === 'pipingClass') {
      renderStandaloneImportMastersPanel(subWorkspace, state, 'pipingClass');
    } else if (subTabId === 'materialMap') {
      renderStandaloneImportMastersPanel(subWorkspace, state, 'materialMap');
    } else if (subTabId === 'weight') {
      renderStandaloneImportMastersPanel(subWorkspace, state, 'weight');
    } else if (subTabId === 'manualOverrides') {
      renderStandaloneManualElementSideloadPanel(subWorkspace, state);
    } else if (subTabId === 'elementSideload') {
      renderStandaloneInputXmlElementSideloadPanel(subWorkspace, state);
    }
    
    container.appendChild(subWorkspace);
    card.appendChild(container);
    return;
  }
  if (phaseId === 'regex') return renderRegexPanel(card, stateRef, render);
  if (phaseId === 'json-trace') return renderJsonTracePanel(card, stateRef, render);
  if (phaseId === 'preview') return renderStandalonePreviewReportPanel(card, state);
  if (phaseId === 'diagnostics') return renderStandaloneDiagnosticsReportPanel(card, state);
  if (phaseId === 'matched-audit') return renderStandaloneMatchedAuditPanel(card, state);
  if (phaseId === 'weight-match') return renderStandaloneWeightMatchPanel(card, state);
  if (phaseId === 'support-mapper') return renderSupportMapperPanel(card, state);
  if (phaseId === 'config') return renderConfigPanel(card, state);
  if (phaseId === 'run') return renderRunPanel(card, state);
  
  renderStandaloneSourceModePanel(card, state);
}

export function renderRegexPanel(card, stateRef, render) {
  renderStandaloneRegexTesterPanel(card, stateRef.current, stateRef, render);
}

export function renderImportPanel(card, state) {
  renderStagedJsonControl(card, state);
  renderStandaloneImportMastersPanel(card, state);
}

export function renderJsonTracePanel(card, stateRef, render) {
  const state = stateRef.current;

  // File loaders row — rendered ONCE above all sub-tabs so event binding works correctly
  const fileRow = createElement('div');
  if (fileRow.style) Object.assign(fileRow.style, { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '14px', alignItems: 'flex-start' });

  // XML source file picker
  const srcGroup = createElement('label');
  if (srcGroup.style) Object.assign(srcGroup.style, { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: '#94a3b8' });
  srcGroup.appendChild(createElement('span', '📄 Source XML / PSI116 file:'));
  const srcInput = createElement('input');
  srcInput.type = 'file';
  srcInput.accept = '.xml,.XML,.inputxml';
  srcInput.dataset.field = 'source-file';
  srcGroup.appendChild(srcInput);
  const srcBadge = createElement('span', state.sourceText ? '✅ XML source: Loaded' : '⚠️ XML source: Not loaded', 'xml-cii-phase-help');
  if (srcBadge.style) srcBadge.style.color = state.sourceText ? '#8be28b' : '#fbbf24';
  srcGroup.appendChild(srcBadge);
  fileRow.appendChild(srcGroup);

  // Staged JSON file picker
  const jsonGroup = createElement('label');
  if (jsonGroup.style) Object.assign(jsonGroup.style, { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: '#94a3b8' });
  jsonGroup.appendChild(createElement('span', '📦 Staged JSON (ATTRIBUTE-AML_…):'));
  const jsonInput = createElement('input');
  jsonInput.type = 'file';
  jsonInput.accept = '.json,.JSON';
  jsonInput.dataset.field = 'staged-json-file';
  jsonGroup.appendChild(jsonInput);
  if (state.stagedJsonFile) jsonGroup.appendChild(createElement('div', summarizeWorkflowFile(state.stagedJsonFile), 'xml-cii-file-summary'));
  const jsonBadge = createElement('span', state.stagedJsonText ? '✅ Staged JSON: Loaded' : '⚠️ Staged JSON: Not loaded', 'xml-cii-phase-help');
  if (jsonBadge.style) jsonBadge.style.color = state.stagedJsonText ? '#8be28b' : '#fbbf24';
  jsonGroup.appendChild(jsonBadge);
  fileRow.appendChild(jsonGroup);

  card.appendChild(fileRow);
  renderStandaloneResolverJsonTracePanel(card, stateRef.current, stateRef, render);
}

export function renderCustomInputPanel(card, state) {
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

export function renderSupportMapperPanel(card, state) {
  renderStandaloneSupportTypeMapperPanel(card, state);
}

export function renderConfigPanel(card, state) {
  const validation = validateSupportConfigJson(state.supportConfigJson);
  const statusDiv = createElement('div', validation.ok ? '✓ Configuration JSON is valid.' : `⚠ Invalid Configuration: ${validation.error}`);
  statusDiv.className = validation.ok ? 'xml-cii-valid' : 'xml-cii-invalid';
  statusDiv.style.marginBottom = '12px';
  statusDiv.style.padding = '8px';
  statusDiv.style.borderRadius = '4px';
  card.appendChild(statusDiv);

  let configObj = {};
  try { configObj = JSON.parse(state.supportConfigJson || '{}'); } catch {}
  renderConfigSummaries(card, configObj);

  const rawSec = createElement('details');
  rawSec.setAttribute('open', 'true');
  rawSec.appendChild(createElement('summary', 'Raw Config JSON Editor'));
  const config = appendLabeledControl(rawSec, 'supportConfigJson:', createElement('textarea'));
  config.value = state.supportConfigJson;
  config.dataset.field = 'support-config';
  card.appendChild(rawSec);
}

function renderConfigSummaries(card, configObj) {
  const llSec = createElement('details');
  llSec.appendChild(createElement('summary', 'Line List Settings'));
  const llList = createElement('ul');
  llList.append(
    createElement('li', `Branch Name Regex: ${configObj.linelist?.branchNameRegex || '(None)'}`),
    createElement('li', `Line No Group: ${configObj.linelist?.lineNoGroup || 1}`),
    createElement('li', `Token Delimiter: ${configObj.linelist?.tokenDelimiter || '-'}`),
    createElement('li', `Line Key Token Positions: ${configObj.linelist?.lineKeyTokenPositions || '(None)'}`)
  );
  llSec.appendChild(llList);

  const pcSec = createElement('details');
  pcSec.appendChild(createElement('summary', 'Piping Class Settings'));
  const pcList = createElement('ul');
  pcList.append(
    createElement('li', `Piping Class Regex: ${configObj.rating?.pipingClassRegex || '(None)'}`),
    createElement('li', `Piping Class Group: ${configObj.rating?.pipingClassGroup || 1}`),
    createElement('li', `Piping Class Token Index: ${configObj.rating?.pipingClassTokenIndex || '(None)'}`)
  );
  pcSec.appendChild(pcList);

  const mwSec = createElement('details');
  mwSec.appendChild(createElement('summary', 'Material & Weight Settings'));
  const mwList = createElement('ul');
  mwList.append(
    createElement('li', `Bore Regex: ${configObj.weight?.boreRegex || '(None)'}`),
    createElement('li', `Bore Group: ${configObj.weight?.boreGroup || 1}`),
    createElement('li', `Bore Token Index: ${configObj.weight?.boreTokenIndex || '(None)'}`),
    createElement('li', `Loaded Line List Rows: ${Array.isArray(configObj.linelist?.masterRows) ? configObj.linelist.masterRows.length : 0}`),
    createElement('li', `Loaded Piping Class Rows: ${Array.isArray(configObj.pipingClass?.masterRows) ? configObj.pipingClass.masterRows.length : 0}`),
    createElement('li', `Loaded Material Maps: ${Array.isArray(configObj.material?.mapRows) ? configObj.material.mapRows.length : 0}`),
    createElement('li', `Loaded Valves Weight Rows: ${Array.isArray(configObj.weight?.masterRows) ? configObj.weight.masterRows.length : 0}`)
  );
  mwSec.appendChild(mwList);

  card.append(llSec, pcSec, mwSec);
}

export function renderRunPanel(card, state) {
  renderStandaloneOutputRunPanel(card, state);
}
