import {
  calculateSbcType3MasterAssistedCandidate,
  createSbcType3MasterAssistedCurveTemplate,
} from '../converters/vibration/sbc/type3-master-assisted.js';
import {
  SBC_TYPE3_BLOCKERS,
  SBC_TYPE3_RECORD_KEY,
  calculateSbcType3FromUserEngineeringData,
} from '../converters/vibration/sbc/type3-user-data.js';
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

const CURVE_BLOCKERS = new Set([
  SBC_TYPE3_BLOCKERS.figureT31, SBC_TYPE3_BLOCKERS.figureT32,
  SBC_TYPE3_BLOCKERS.figureT33, SBC_TYPE3_BLOCKERS.figureT34,
]);

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
    sbcType3Busy: false,
    sbcType3PhysicalByScope: {},
    sbcType3MainlineByScope: {},
    sbcFacilityCandidateResults: {},
    sbcMasterAssistedScopes: {},
  };
}

export function renderVibrationIntegrityWithUserData(state) {
  if (state.workspaceTab === 'user-data') return userDataPage(state);
  return injectWorkspaceTabs(renderVibrationIntegrityHtml(state), workspaceTabs('screening'));
}

function invalidateScope(state, scopeId) {
  if (!scopeId || !state.sbcFacilityCandidateResults?.[scopeId]) return;
  const next = { ...state.sbcFacilityCandidateResults };
  delete next[scopeId];
  state.sbcFacilityCandidateResults = next;
  if (state.sbcType3ScopeId === scopeId) state.sbcType3Result = null;
}

function markMasterAssisted(state, scopeId) {
  state.sbcMasterAssistedScopes = { ...state.sbcMasterAssistedScopes, [scopeId]: true };
  invalidateScope(state, scopeId);
}

function markLegacy(state, scopeId) {
  const next = { ...state.sbcMasterAssistedScopes };
  delete next[scopeId];
  state.sbcMasterAssistedScopes = next;
  invalidateScope(state, scopeId);
}

function updateTable(state, table, render, affectedScope = state.sbcType3ScopeId) {
  state.userEngineeringData = table;
  invalidateScope(state, affectedScope);
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
    markLegacy(state, scopeId);
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
    markLegacy(state, scopeId);
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

function physicalForScope(state, scopeId) {
  const raw = state.sbcType3PhysicalByScope?.[scopeId] ?? {};
  const mass = String(raw.firstSpanHasUnsupportedMass ?? '').toUpperCase();
  return {
    ...raw,
    firstSpanHasUnsupportedMass: mass === 'TRUE' ? true : mass === 'FALSE' ? false : undefined,
  };
}

function removeCurveRows(table, scopeId) {
  let next = table;
  for (let index = next.rows.length - 1; index >= 0; index -= 1) {
    const row = next.rows[index];
    if (row.scopeId === scopeId && row.recordKey === SBC_TYPE3_RECORD_KEY
      && CURVE_BLOCKERS.has(row.blockerId)) {
      next = deleteVibrationUserEngineeringDataRow(next, index);
    }
  }
  return next;
}

async function generateMasterCurveRows(state, render) {
  let scopeId = null;
  try {
    scopeId = requireScope(state);
    markMasterAssisted(state, scopeId);
    state.sbcType3Busy = true;
    state.error = null;
    render();
    const seeds = await createSbcType3MasterAssistedCurveTemplate({
      scopeId, physical: physicalForScope(state, scopeId),
    });
    let table = removeCurveRows(state.userEngineeringData, scopeId);
    for (const seed of seeds) table = addVibrationUserEngineeringDataRow(table, seed);
    state.userEngineeringData = table;
    state.sbcType3Result = null;
  } catch (error) {
    state.error = String(error?.message || error);
  } finally {
    state.sbcType3Busy = false;
    render();
  }
}

async function evaluateMasterAssisted(state, render) {
  let scopeId = null;
  try {
    scopeId = requireScope(state);
    markMasterAssisted(state, scopeId);
    state.sbcType3Busy = true;
    state.error = null;
    render();
    const result = await calculateSbcType3MasterAssistedCandidate({
      scopeId,
      physical: physicalForScope(state, scopeId),
      mainlineLof: state.sbcType3MainlineByScope?.[scopeId] ?? null,
      userRows: vibrationUserEngineeringDataResolverRows(state.userEngineeringData),
    });
    state.sbcType3Result = result;
    state.sbcFacilityCandidateResults = {
      ...state.sbcFacilityCandidateResults, [scopeId]: result,
    };
  } catch (error) {
    state.sbcType3Result = null;
    state.error = String(error?.message || error);
  } finally {
    state.sbcType3Busy = false;
    render();
  }
}

function openFacilitySbcInputs(state, scopeId, render) {
  state.workspaceTab = 'user-data';
  state.sbcType3ScopeId = scopeId;
  state.sbcType3Result = state.sbcFacilityCandidateResults?.[scopeId] ?? null;
  markMasterAssisted(state, scopeId);
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
  if (event.target.closest('[data-vi-sbc-master-template]')) {
    void generateMasterCurveRows(state, render);
    return true;
  }
  if (event.target.closest('[data-vi-sbc-master-evaluate]')) {
    void evaluateMasterAssisted(state, render);
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
  const rowIndex = Number(deleteButton.dataset.viUserDataDelete);
  const affectedScope = state.userEngineeringData.rows[rowIndex]?.scopeId ?? state.sbcType3ScopeId;
  updateTable(state, deleteVibrationUserEngineeringDataRow(
    state.userEngineeringData, rowIndex,
  ), render, affectedScope);
  return true;
}

function updatePhysicalField(state, event, render) {
  const field = event.target.dataset.viSbcMasterPhysical;
  if (!field) return false;
  try {
    const scopeId = requireScope(state);
    const current = state.sbcType3PhysicalByScope?.[scopeId] ?? {};
    state.sbcType3PhysicalByScope = {
      ...state.sbcType3PhysicalByScope,
      [scopeId]: { ...current, [field]: event.target.value },
    };
    markMasterAssisted(state, scopeId);
    state.error = null;
  } catch (error) {
    state.error = String(error?.message || error);
  }
  render();
  return true;
}

export function handleVibrationUserDataChange(state, event, render) {
  if (updatePhysicalField(state, event, render)) return true;
  if (event.target.matches('[data-vi-sbc-master-mainline]')) {
    try {
      const scopeId = requireScope(state);
      state.sbcType3MainlineByScope = {
        ...state.sbcType3MainlineByScope, [scopeId]: event.target.value,
      };
      markMasterAssisted(state, scopeId);
      state.error = null;
    } catch (error) { state.error = String(error?.message || error); }
    render();
    return true;
  }
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
