import {
  addSbcT3UserEngineeringDataRows,
  addVibrationUserEngineeringDataRow,
  createVibrationUserEngineeringDataTable,
  deleteVibrationUserEngineeringDataRow,
  updateVibrationUserEngineeringDataCell,
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
  </div>`;
}

export function createVibrationUserDataUiState() {
  return {
    workspaceTab: 'screening',
    userEngineeringData: createVibrationUserEngineeringDataTable(),
  };
}

export function renderVibrationIntegrityWithUserData(state) {
  if (state.workspaceTab === 'user-data') return userDataPage(state);
  return injectWorkspaceTabs(renderVibrationIntegrityHtml(state), workspaceTabs('screening'));
}

function updateTable(state, table, render) {
  state.userEngineeringData = table;
  state.error = null;
  render();
}

export function handleVibrationUserDataClick(state, event, render) {
  const tab = event.target.closest('[data-vi-workspace-tab]')?.dataset.viWorkspaceTab;
  if (tab) {
    state.workspaceTab = tab === 'user-data' ? 'user-data' : 'screening';
    render();
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
