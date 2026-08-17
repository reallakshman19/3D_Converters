import { clearElement, createElement } from './xml-cii-adapted-dom.js?v=20260708-v8';
import { XML_CII_WORKFLOW_PHASES } from './xml-cii-adapted-phase-registry.js?v=20260708-v8';
import { createXmlCiiAdaptedWorkflowState } from './xml-cii-adapted-state.js?v=20260708-v8';
import { renderActivePhase } from './xml-cii-adapted-phase-panels-smart.js?v=20260802-smart-ui-v1';
import { renderOutputPanel } from './xml-cii-adapted-output-panel.js?v=20260708-v8';
import { bindAdaptedWorkflowEvents } from './xml-cii-adapted-events-smart.js?v=20260802-smart-ui-v1';
import { detectXmlCiiWorkflowSourceKind } from '../xml-cii-workflow-source-detect.js?v=20260708-v8';
import { syncMasterDraftDom } from './xml-cii-adapted-master-dom-sync.js?v=20260818-perf-c1';
import { perfCount } from './xml-cii-adapted-perf.js?v=20260818-perf-c1';

const MASTER_KEYS = Object.freeze(['lineList', 'pipingClass', 'materialMap', 'weight']);
const DRAFT_ONLY_TOP_LEVEL_KEYS = new Set(['masterContext', 'importMastersWriteBackStatus']);

let activeWorkflowState = createXmlCiiAdaptedWorkflowState();

export function createStateRef(initialState) {
  return { current: initialState || activeWorkflowState };
}

function sameTopLevelOutsideDraft(previous, next) {
  const keys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);
  for (const key of keys) {
    if (DRAFT_ONLY_TOP_LEVEL_KEYS.has(key)) continue;
    if (previous?.[key] !== next?.[key]) return false;
  }
  return true;
}

function sameMasterRows(previous, next) {
  for (const key of ['lineRows', 'pipingClassRows', 'materialMapRows', 'weightMasterRows']) {
    if (previous?.[key] !== next?.[key]) return false;
  }
  for (const key of MASTER_KEYS) {
    if (previous?.rawRows?.[key] !== next?.rawRows?.[key]) return false;
    if (Number(previous?.appliedMappingRevision?.[key] || 0) !== Number(next?.appliedMappingRevision?.[key] || 0)) return false;
  }
  return true;
}

function sameMasterAuthority(previous, next) {
  if (!previous || !next) return false;
  if (previous.config !== next.config) return false;
  if (!sameMasterRows(previous, next)) return false;
  for (const key of ['sourceMetadata', 'rowCounts', 'previewRows', 'sheetNames', 'activeSheet', 'workbookData', 'diagnostics', 'diagnosticsByMaster']) {
    if (previous?.[key] !== next?.[key]) return false;
  }
  return true;
}

function draftFingerprint(value) {
  if (!value) return '';
  return JSON.stringify({
    fieldMap: value.fieldMap || {},
    dirty: value.dirty === true,
    basisAppliedRevision: Number(value.basisAppliedRevision || 0),
  });
}

function changedDraftKeys(previous, next) {
  const previousDrafts = previous?.masterContext?.mappingDrafts || {};
  const nextDrafts = next?.masterContext?.mappingDrafts || {};
  return MASTER_KEYS.filter((key) => draftFingerprint(previousDrafts[key]) !== draftFingerprint(nextDrafts[key]));
}

export function classifyXmlCiiRenderScope(previous, next) {
  if (!previous || !next) return { kind: 'full', reason: 'initial-render' };
  if (!sameTopLevelOutsideDraft(previous, next)) return { kind: 'full', reason: 'top-level-authority-change' };
  if (!sameMasterAuthority(previous.masterContext, next.masterContext)) return { kind: 'full', reason: 'master-authority-change' };

  const changed = changedDraftKeys(previous, next);
  if (changed.length !== 1) return { kind: 'full', reason: changed.length ? 'multi-draft-change' : 'no-draft-change' };
  const masterKey = changed[0];
  if (next.activePhaseId !== 'source' || next.activeSubTabId !== masterKey) {
    return { kind: 'full', reason: 'draft-target-not-visible' };
  }
  return { kind: 'master-draft', masterKey };
}

function captureScrollStates(container) {
  const scrollStates = [];
  container.querySelectorAll('.xml-cii-main-workspace, .model-converters-left, .xml-cii-standalone-output pre, .xml-cii-standalone-card pre').forEach((el, idx) => {
    const cls = '.' + Array.from(el.classList).join('.');
    scrollStates.push({ selector: cls, index: idx, top: el.scrollTop, left: el.scrollLeft });
  });
  return scrollStates;
}

function restoreScrollStates(container, scrollStates) {
  for (const pos of scrollStates) {
    try {
      const els = container.querySelectorAll(pos.selector);
      const el = els[pos.index] || els[0];
      if (el) {
        el.scrollTop = pos.top;
        el.scrollLeft = pos.left;
      }
    } catch {}
  }
}

export function renderXmlCiiAdaptedWorkflowShell(container, initialState) {
  const stateRef = createStateRef(initialState);
  let renderedState = null;
  const render = () => {
    const nextState = stateRef.current;
    activeWorkflowState = nextState;
    const scope = classifyXmlCiiRenderScope(renderedState, nextState);

    if (scope.kind === 'master-draft') {
      const synced = syncMasterDraftDom(container, nextState, nextState.masterContext?.config || {}, scope.masterKey);
      if (synced.updated) {
        perfCount('workspacePartialRenderCount');
        renderedState = nextState;
        return;
      }
    }

    const scrollStates = captureScrollStates(container);
    perfCount('workspaceFullRenderCount');
    renderAdaptedWorkflow(container, stateRef, render);
    renderedState = stateRef.current;
    restoreScrollStates(container, scrollStates);
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
  const loaded = !!(state.sourceText || state.sourceFile);
  return createBadge(`Source Mode: ${modeText}${autoText}`, loaded ? '#8be28b' : null, loaded ? '#2f855a' : 'rgba(120,180,255,.45)');
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
    for (const key of MASTER_KEYS) {
      if (Number(state.masterContext.rowCounts[key] || 0) > 0) loadedCount++;
    }
  }
  const border = loadedCount === 4 ? '#2f855a' : (loadedCount > 0 ? '#fbbf24' : '#7f1d1d');
  const color = loadedCount === 4 ? '#8be28b' : (loadedCount > 0 ? '#fde047' : '#ff9b9b');
  return createBadge(`Masters: ${loadedCount}/4 loaded`, color, border);
}

function createReadinessBadge(state) {
  const isLoaded = !!state.masterContext;
  const label = `Master Readiness: ${isLoaded ? 'Loaded' : 'Pending'}`;
  const color = isLoaded ? '#8be28b' : '#ff9b9b';
  const border = isLoaded ? '#2f855a' : '#7f1d1d';
  return createBadge(label, color, border);
}

function createDiagnosticsBadges(state) {
  let errors = 0;
  let warnings = 0;
  let anySource = false;
  const tally = (items) => {
    if (!Array.isArray(items)) return;
    anySource = true;
    for (const item of items) {
      const lvl = String(item?.level || '').toLowerCase();
      if (lvl.includes('err')) errors++;
      else if (lvl.includes('warn')) warnings++;
    }
  };
  tally(state.previewDiagnosticsAuditReport?.diagnostics);
  tally(state.outputRunReadinessReport?.diagnostics);
  if (state.result) {
    anySource = true;
    if (state.result.ok === false || state.result.error) errors++;
    const runWarnings = state.result.diagnostics?.warnings;
    if (Array.isArray(runWarnings)) warnings += runWarnings.length;
  }
  if (!anySource) return [createBadge('Diagnostics: not built', '#94a3b8', 'rgba(148,163,184,.45)')];
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
