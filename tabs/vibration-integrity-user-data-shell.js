import { calculateSbcType3FromUserEngineeringData } from '../converters/vibration/sbc/type3-user-data.js';
import {
  createSbcMasterAssistedUiState,
  handleSbcMasterAssistedChange,
  handleSbcMasterAssistedClick,
  invalidateSbcMasterAssistedScope,
  openSbcMasterAssistedScope,
  setSbcMasterAssistedMode,
} from './vibration-integrity-sbc-master-assisted-controller.js';
import { renderSbcType3UserInputPanel } from './vibration-integrity-sbc-type3-view.js';
import {
  addSbcT3UserEngineeringDataRows,
  addSbcType3UserEngineeringDataRows,
  addVibrationUserEngineeringDataRow,
  createVibrationUserEngineeringDataTable,
  deleteVibrationUserEngineeringDataRow,
  updateVibrationUserEngineeringDataCell,
  vibrationUserEngineeringDataResolverRows,
} from './vibration-integrity-user-data-model.js';
import { renderVibrationUserEngineeringData } from './vibration-integrity-user-data-view.js';
import { renderVibrationIntegrityHtml } from './vibration-integrity-view.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function tabButton(id, label, active) {
  return `<button type="button" class="vi-detail-tab${active === id ? ' is-active' : ''}" data-vi-workspace-tab="${id}">${label}</button>`;
}

function workspaceTabs(active) {
  return `<nav class="vi-detail-tabs" aria-label="Vibration Integrity workspace tabs">
    ${tabButton('screening', 'Screening workspace', active)}
    ${tabButton('user-data', 'User Engineering Data', active)}
  </nav>`;
}

function injectWorkspaceTabs(html, tabs) {
  const marker = '</header>';
  const index = html.indexOf(marker);
  if (index < 0) return `${tabs}${html}`;
  const insertion = index + marker.length;
  return `${html.slice(0, insertion)}${tabs}${html.slice(insertion)}`;
}

function userDataPage(state) {
  return `<div class="vi-root">
    <header class="vi-header"><div><h2>Vibration Integrity</h2><p>Project-specific engineering data for vibration mechanisms when governed master data is unavailable.</p></div><div class="vi-authority"><strong>PROJECT INPUT</strong><span>NOT MASTER / SCREENING / DESIGN AUTHORITY</span></div></header>
    ${workspaceTabs('user-data')}
    ${state.error ? `<div class="vi-banner bad"><strong>Unable to update user engineering data.</strong><span>${esc(state.error)}</span></div>` : ''}
    ${renderVibrationUserEngineeringData(state)}
    ${renderSbcType3UserInputPanel(state)}
  </div>`;
}

export function createVibrationUserDataUiState() {
  return {
    workspaceTab: 'screening',
    userEngineeringData: createVibrationUserEngineeringDataTable(),
    sbcType3ScopeId: '',
    sbcType3Result: null,
    ...createSbcMasterAssistedUiState(),
  };
}

export function renderVibrationIntegrityWithUserData(state) {
  if (state.workspaceTab === 'user-data') return userDataPage(state);
  return injectWorkspaceTabs(renderVibrationIntegrityHtml(state), workspaceTabs('screening'));
}

function updateTable(state, table, render, affectedScope = state.sbcType3ScopeId) {
  state.userEngineeringData = table;
  invalidateSbcMasterAssistedScope(state, affectedScope);
  state.sbcType3Result = null;
  state.error = null;
  render();
}

function requireScope(state) {
  const scopeId = String(state.sbcType3ScopeId ?? '').trim();
  if (!scopeId) throw new Error('Enter an SBC scope / assessment ID first.');
  return scopeId;
}

function addType3Template(state, hasMass, render) {
  try {
    const scopeId = requireScope(state);
    setSbcMasterAssistedMode(state, scopeId, false);
    updateTable(state, addSbcType3UserEngineeringDataRows(
      state.userEngineeringData, scopeId, hasMass,
    ), render, scopeId);
  } catch (error) {
    state.error = String(error?.message || error);
    render();
  }
}

function evaluateType3(state, render) {
  try {
    const scopeId = requireScope(state);
    setSbcMasterAssistedMode(state, scopeId, false);
    state.sbcType3Result = calculateSbcType3FromUserEngineeringData({
      userRows: vibrationUserEngineeringDataResolverRows(state.userEngineeringData),
      scopeId,
    });
    state.error = null;
  } catch (error) {
    state.sbcType3Result = null;
    state.error = String(error?.message || error);
  }
  render();
}

function openFacilitySbcInputs(state, scopeId, render) {
  state.workspaceTab = 'user-data';
  openSbcMasterAssistedScope(state, scopeId);
  state.error = null;
  render();
}

export function handleVibrationUserDataClick(state, event, render) {
  const facilityScope = event.target.closest('[data-vi-sbc-facility-scope]')?.dataset.viSbcFacilityScope;
  if (facilityScope) {
    openFacilitySbcInputs(state, facilityScope, render);
    return true;
  }
  const tab = event.target.closest('[data-vi-workspace-tab]')?.dataset.viWorkspaceTab;
  if (tab) {
    state.workspaceTab = tab === 'user-data' ? 'user-data' : 'screening';
    render();
    return true;
  }
  if (handleSbcMasterAssistedClick(state, event, render)) return true;
  const type3Template = event.target.closest('[data-vi-sbc-type3-template]')?.dataset.viSbcType3Template;
  if (type3Template) {
    addType3Template(state, type3Template === 'mass', render);
    return true;
  }
  if (event.target.closest('[data-vi-sbc-type3-evaluate]')) {
    evaluateType3(state, render);
    return true;
  }
  if (event.target.closest('[data-vi-user-data-add-sbc]')) {
    updateTable(state, addSbcT3UserEngineeringDataRows(state.userEngineeringData), render);
    return true;
  }
  if (event.target.closest('[data-vi-user-data-add]')) {
    updateTable(state, addVibrationUserEngineeringDataRow(state.userEngineeringData), render);
    return true;
  }
  const deleteButton = event.target.closest('[data-vi-user-data-delete]');
  if (!deleteButton) return false;
  const rowIndex = Number(deleteButton.dataset.viUserDataDelete);
  const affectedScope = state.userEngineeringData.rows[rowIndex]?.scopeId ?? state.sbcType3ScopeId;
  updateTable(state, deleteVibrationUserEngineeringDataRow(
    state.userEngineeringData, rowIndex,
  ), render, affectedScope);
  return true;
}

export function handleVibrationUserDataChange(state, event, render) {
  if (handleSbcMasterAssistedChange(state, event, render)) return true;
  if (event.target.matches('[data-vi-sbc-type3-scope]')) {
    const scopeId = event.target.value;
    state.sbcType3ScopeId = scopeId;
    state.sbcType3Result = state.sbcFacilityCandidateResults?.[scopeId] ?? null;
    state.error = null;
    render();
    return true;
  }
  const columnKey = event.target.dataset.viUserDataCell;
  if (!columnKey) return false;
  const rowIndex = Number(event.target.dataset.viUserDataRow);
  const affectedScope = state.userEngineeringData.rows[rowIndex]?.scopeId ?? state.sbcType3ScopeId;
  updateTable(state, updateVibrationUserEngineeringDataCell(
    state.userEngineeringData, rowIndex, columnKey, event.target.value,
  ), render, affectedScope);
  return true;
}
