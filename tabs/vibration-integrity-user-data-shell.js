import { calculateSbcType3FromUserEngineeringData } from '../converters/vibration/sbc/type3-user-data.js';
import {
  createMechanicalFacilityUiState,
  handleMechanicalFacilityChange,
  handleMechanicalFacilityClick,
} from './vibration-integrity-mechanical-controller.js';
import { renderMechanicalFacilityPanel } from './vibration-integrity-mechanical-view.js';
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
    ${tabButton('mechanical', 'Mechanical T2.3', active)}
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

function mechanicalPage(state) {
  return `<div class="vi-root">
    <header class="vi-header"><div><h2>Vibration Integrity</h2><p>Facility-scoped Mechanical Excitation assessment using the governed EI AVIFF T2.3 candidate master.</p></div><div class="vi-authority"><strong>CANDIDATE MASTER</strong><span>NOT SCREENING / DESIGN AUTHORITY</span></div></header>
    ${workspaceTabs('mechanical')}
    ${state.error ? `<div class="vi-banner bad"><strong>Unable to evaluate Mechanical T2.3 candidate.</strong><span>${esc(state.error)}</span></div>` : ''}
    ${renderMechanicalFacilityPanel(state)}
  </div>`;
}

export function createVibrationUserDataUiState() {
  return {
    ...createMechanicalFacilityUiState(),
    workspaceTab: 'screening',
    userEngineeringData: createVibrationUserEngineeringDataTable(),
    sbcType3ScopeId: '',
    sbcType3Result: null,
  };
}

export function renderVibrationIntegrityWithUserData(state) {
  if (state.workspaceTab === 'user-data') return userDataPage(state);
  if (state.workspaceTab === 'mechanical') return mechanicalPage(state);
  return injectWorkspaceTabs(renderVibrationIntegrityHtml(state), workspaceTabs('screening'));
}

function updateTable(state, table, render) {
  state.userEngineeringData = table;
  state.sbcType3Result = null;
  state.error = null;
  render();
}

function addType3Template(state, hasMass, render) {
  const scopeId = String(state.sbcType3ScopeId ?? '').trim();
  if (!scopeId) {
    state.error = 'Enter an SBC scope / assessment ID before adding Type-3 input rows.';
    render();
    return;
  }
  updateTable(state, addSbcType3UserEngineeringDataRows(
    state.userEngineeringData, scopeId, hasMass,
  ), render);
}

function evaluateType3(state, render) {
  try {
    state.sbcType3Result = calculateSbcType3FromUserEngineeringData({
      userRows: vibrationUserEngineeringDataResolverRows(state.userEngineeringData),
      scopeId: state.sbcType3ScopeId,
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
  state.sbcType3ScopeId = scopeId;
  state.sbcType3Result = null;
  state.error = null;
  render();
}

export function handleVibrationUserDataClick(state, event, render) {
  if (handleMechanicalFacilityClick(state, event, render)) return true;
  const facilityScope = event.target.closest('[data-vi-sbc-facility-scope]')?.dataset.viSbcFacilityScope;
  if (facilityScope) {
    openFacilitySbcInputs(state, facilityScope, render);
    return true;
  }
  const tab = event.target.closest('[data-vi-workspace-tab]')?.dataset.viWorkspaceTab;
  if (tab) {
    state.workspaceTab = ['user-data', 'mechanical'].includes(tab) ? tab : 'screening';
    render();
    return true;
  }
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
  updateTable(state, deleteVibrationUserEngineeringDataRow(
    state.userEngineeringData,
    Number(deleteButton.dataset.viUserDataDelete),
  ), render);
  return true;
}

export function handleVibrationUserDataChange(state, event, render) {
  if (handleMechanicalFacilityChange(state, event, render)) return true;
  if (event.target.matches('[data-vi-sbc-type3-scope]')) {
    state.sbcType3ScopeId = event.target.value;
    state.sbcType3Result = null;
    state.error = null;
    render();
    return true;
  }
  const columnKey = event.target.dataset.viUserDataCell;
  if (!columnKey) return false;
  updateTable(state, updateVibrationUserEngineeringDataCell(
    state.userEngineeringData,
    Number(event.target.dataset.viUserDataRow),
    columnKey,
    event.target.value,
  ), render);
  return true;
}
