import { clearElement, createElement } from './xml-cii-adapted-dom.js?v=20260707-v3';
import { XML_CII_WORKFLOW_PHASES } from './xml-cii-adapted-phase-registry.js?v=20260707-v3';
import { createXmlCiiAdaptedWorkflowState } from './xml-cii-adapted-state.js?v=20260707-v3';
import { renderActivePhase } from './xml-cii-adapted-phase-panels.js?v=20260707-v3';
import { renderOutputPanel } from './xml-cii-adapted-output-panel.js?v=20260707-v3';
import { bindAdaptedWorkflowEvents } from './xml-cii-adapted-events.js?v=20260707-v3';
import { detectXmlCiiWorkflowSourceKind } from '../xml-cii-workflow-source-detect.js?v=20260707-v3';

let activeWorkflowState = createXmlCiiAdaptedWorkflowState();

export function createStateRef(initialState) {
  return { current: initialState || activeWorkflowState };
}

export function renderXmlCiiAdaptedWorkflowShell(container, initialState) {
  const stateRef = createStateRef(initialState);
  const render = () => {
    activeWorkflowState = stateRef.current;
    renderAdaptedWorkflow(container, stateRef, render);
  };
  render();
  return () => clearElement(container);
}

export function renderAdaptedWorkflow(container, stateRef, render) {
  clearElement(container);
  const root = createElement('section', '', 'xml-cii-standalone-root xml-cii-adapted-workflow-shell');
  renderHeader(root, stateRef.current);
  
  const workspace = createElement('div', '', 'model-converters-root xml-cii-workspace-layout');
  
  const left = createElement('div', '', 'model-converters-left xml-cii-left-panel');
  renderPhaseRail(left, stateRef.current);
  workspace.appendChild(left);
  
  const main = createElement('div', '', 'xml-cii-main-workspace');
  if (main.style) {
    main.style.minWidth = '0';
    main.style.flex = '1';
  }
  renderActivePhase(main, stateRef, render);
  workspace.appendChild(main);
  
  root.appendChild(workspace);
  
  container.appendChild(root);
  bindAdaptedWorkflowEvents(container, stateRef, render);
}

function createBadge(label, color, borderColor) {
  const badge = createElement('span', label, 'xml-cii-standalone-badge');
  if (color) badge.style.color = color;
  if (borderColor) badge.style.borderColor = borderColor;
  return badge;
}

function createModeBadge(state) {
  const detectedKind = detectXmlCiiWorkflowSourceKind(state.sourceText, 'xml');
  const actualKind = state.sourceKind === 'auto' ? detectedKind : state.sourceKind;
  const modeText = actualKind === 'inputxml' ? 'InputXML' : 'XML';
  const autoText = state.sourceKind === 'auto' ? ' (Auto)' : '';
  return createBadge(`Source Mode: ${modeText}${autoText}`, null, 'rgba(120,180,255,.45)');
}

function createSourceBadge(state) {
  const len = state.sourceText ? state.sourceText.length : 0;
  const label = len ? `Source: Loaded (${(len / 1024).toFixed(1)} KB)` : 'Source: Not Loaded';
  const color = len ? '#8be28b' : '#ff9b9b';
  const border = len ? '#2f855a' : '#7f1d1d';
  return createBadge(label, color, border);
}

function createMastersBadge(state) {
  let loadedCount = 0;
  if (state.masterContext && state.masterContext.rowCounts) {
    for (const key of ['lineList', 'pipingClass', 'materialMap', 'weight']) {
      if (Number(state.masterContext.rowCounts[key] || 0) > 0) loadedCount++;
    }
  }
  const border = loadedCount === 4 ? '#2f855a' : (loadedCount > 0 ? '#fbbf24' : '#7f1d1d');
  return createBadge(`Masters: ${loadedCount}/4 loaded`, null, border);
}

function createReadinessBadge(state) {
  const isLoaded = !!state.masterContext;
  const label = `Master Readiness: ${isLoaded ? 'Loaded' : 'Pending'}`;
  const color = isLoaded ? '#8be28b' : '#ff9b9b';
  const border = isLoaded ? '#2f855a' : '#7f1d1d';
  return createBadge(label, color, border);
}

function createDiagnosticsBadges(state) {
  const report = state.previewDiagnosticsAuditReport;
  const diagnostics = Array.isArray(report?.diagnostics) ? report.diagnostics : [];
  let errors = 0;
  let warnings = 0;
  for (const item of diagnostics) {
    const lvl = String(item.level || '').toLowerCase();
    if (lvl.includes('err')) errors++;
    else if (lvl.includes('warn')) warnings++;
  }
  const errBadge = createBadge(`${errors} Errors`, errors ? '#fca5a5' : '#8be28b', errors ? '#ef4444' : '#2f855a');
  const warnBadge = createBadge(`${warnings} Warnings`, warnings ? '#fde047' : '#8be28b', warnings ? '#fbbf24' : '#2f855a');
  return [errBadge, warnBadge];
}

export function renderHeader(root, state) {
  const header = createElement('header', '', 'xml-cii-standalone-header');
  const title = createElement('div');
  title.append(
    createElement('h1', 'XML→CII 2019 Standalone'),
    createElement('p', 'Adapted from the XML→CII 2019 phase model; API-first, UI-configurable, and isolated from the Model Converters popup.'),
  );
  const statusRow = createElement('div', '', 'xml-cii-header-status-row');
  statusRow.style.display = 'flex';
  statusRow.style.gap = '8px';
  statusRow.style.alignItems = 'center';
  statusRow.style.flexWrap = 'wrap';
  statusRow.style.marginTop = '8px';
  statusRow.append(
    createModeBadge(state),
    createSourceBadge(state),
    createMastersBadge(state),
    createReadinessBadge(state),
    ...createDiagnosticsBadges(state)
  );
  title.appendChild(statusRow);
  header.append(title);
  root.appendChild(header);
}

export function renderPhaseRail(workspace, state) {
  const rail = createElement('nav', '', 'model-converters-workflow-phase-list xml-cii-nav-rail');
  rail.setAttribute('aria-label', 'XML CII workflow phases');
  for (const phase of XML_CII_WORKFLOW_PHASES) rail.appendChild(renderPhaseButton(phase, state));
  workspace.appendChild(rail);
}

export function renderPhaseButton(phase, state) {
  const button = createElement('button', '', 'model-converters-workflow-phase xml-cii-phase-pill');
  button.type = 'button';
  button.dataset.phase = phase.id;
  
  const detectedKind = detectXmlCiiWorkflowSourceKind(state.sourceText, 'xml');
  const actualKind = state.sourceKind === 'auto' ? detectedKind : state.sourceKind;
  
  if (phase.id === 'json-trace' && actualKind === 'inputxml') {
    button.disabled = true;
    button.title = 'JSON Trace resolver is only available for XML mode.';
    button.style.opacity = '0.45';
    button.style.cursor = 'not-allowed';
    button.style.pointerEvents = 'none';
  } else {
    button.classList.toggle('is-active', state.activePhaseId === phase.id);
  }
  
  button.append(
    createElement('span', phase.label, 'xml-cii-phase-label'),
    createElement('small', phase.summary, 'xml-cii-phase-summary'),
  );
  return button;
}
