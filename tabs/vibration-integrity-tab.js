import { buildVibrationFacilityFitPreflightFromTables } from '../converters/vibration/facility/fit-preflight-tabular.js';
import { serializeVibrationFacilityFitRegisterCsv } from '../converters/vibration/facility/fit-register-export.js';
import { createVibrationFitDataBlockerCsvTemplate } from '../converters/vibration/tabular/fit-data-blockers.js';
import { createVibrationEnrichmentCsvTemplate, createVibrationOperatingCaseCsvTemplate } from '../converters/vibration/tabular/templates.js';
import { buildVibrationWorkspaceModel } from '../converters/vibration/workspace/model.js';
import { appendVibrationIntegrityAuditEvent, createVibrationIntegrityAuditLog } from './vibration-integrity-audit-log.js';
import { addVibrationIntegrityInputRow, deleteVibrationIntegrityInputRow, revertVibrationIntegrityInputCell, revertVibrationIntegrityInputRow, revertVibrationIntegrityInputTable, updateVibrationIntegrityInputCell } from './vibration-integrity-input-model.js';
import { buildLoadedVibrationIntegrityBenchmark, buildVibrationIntegrityFacilityTableInput, captureVibrationIntegrityExecutionState, createVibrationIntegrityInputRuntimeState, readVibrationIntegrityInputFile } from './vibration-integrity-input-runtime.js';
import { downloadVibrationIntegrityText, ensureVibrationIntegrityStylesheet } from './vibration-integrity-dom.js';
import { VIBRATION_INTEGRITY_ACTION_IDS } from './vibration-integrity-product-contract.js';
import { transitionVibrationIntegrityResultState } from './vibration-integrity-result-state.js';
import { serializeVibrationIntegrityRunEvidence } from './vibration-integrity-run-evidence.js';
import { executeVibrationIntegrityRun, vibrationIntegrityCapturedInputDrifted, vibrationIntegrityRunInputDrifted } from './vibration-integrity-run-controller.js';
import { createVibrationUserDataUiState, handleVibrationUserDataChange, handleVibrationUserDataClick, renderVibrationIntegrityWithUserData } from './vibration-integrity-user-data-shell.js';
import { deriveVibrationIntegrityWorkflowState } from './vibration-integrity-workflow-state.js';

const TABLE_MUTATION_EVENTS = Object.freeze({
  'row-add': 'INPUT_ROW_ADDED',
  'row-delete': 'INPUT_ROW_DELETED',
  'table-revert': 'INPUT_REVERTED',
  'cell-revert': 'INPUT_REVERTED',
  'row-revert': 'INPUT_REVERTED',
  'cell-edit': 'INPUT_EDITED',
  'table-edit': 'INPUT_EDITED',
});

function workspaceOptions(state) {
  const filters = {};
  if (state.filters.line) filters.lines = [state.filters.line];
  if (state.filters.completeness) filters.completenessStatuses = [state.filters.completeness];
  if (state.filters.band) filters.referenceBands = [state.filters.band];
  if (state.filters.candidate === 'true') filters.candidateForEngineeringReview = true;
  if (state.filters.candidate === 'false') filters.candidateForEngineeringReview = false;
  return { filters, sort: { ...state.sort }, ...(state.selectedRowKey ? { selectedRowKey: state.selectedRowKey } : {}) };
}

function initialState() {
  return {
    ...createVibrationIntegrityInputRuntimeState(), ...createVibrationUserDataUiState(),
    preflight: null, envelope: null, workspace: null,
    resultState: 'UNRUN', runSnapshot: null, auditLog: createVibrationIntegrityAuditLog(), inputTab: 'engineering',
    filters: { line: '', completeness: '', band: '', candidate: '' },
    sort: { field: 'line', direction: 'asc' }, selectedRowKey: null, detailTab: 'summary',
    busy: false, busyAction: null, error: null, destroyed: false,
  };
}

function inputDriftError() {
  const error = new Error('Working inputs changed while FIT readiness was being evaluated. Run readiness again.');
  error.code = 'VIBRATION_PREFLIGHT_INPUT_DRIFT';
  return error;
}

export function renderVibrationIntegrityTab(container) {
  ensureVibrationIntegrityStylesheet();
  const state = initialState();

  function workflowId() {
    return deriveVibrationIntegrityWorkflowState(state).state;
  }

  function recordAudit(eventType, details = {}, scopeId = null, workflowBefore = undefined) {
    const workflowAfter = workflowId();
    const before = workflowBefore === undefined ? workflowAfter : workflowBefore;
    state.auditLog = appendVibrationIntegrityAuditEvent(state.auditLog, {
      timestamp: new Date().toISOString(), eventType,
      workflowBefore: before, workflowAfter, scopeId, details,
    });
  }

  function render() {
    if (!state.destroyed) container.innerHTML = renderVibrationIntegrityWithUserData(state);
  }

  function discardCalculatedState() {
    state.preflight = null; state.envelope = null; state.workspace = null; state.selectedRowKey = null;
    state.resultState = transitionVibrationIntegrityResultState(state.resultState, 'RESET'); state.runSnapshot = null;
  }

  function invalidateCalculatedState(before, eventType, details = {}, scopeId = null) {
    const wasCurrent = state.resultState === 'CURRENT_RESULT';
    state.preflight = null;
    state.resultState = transitionVibrationIntegrityResultState(state.resultState, 'INPUT_CHANGED', {
      hasRetainedResult: Boolean(state.envelope?.workflow),
    });
    recordAudit(eventType, details, scopeId, before);
    if (wasCurrent && state.resultState === 'STALE_RESULT') {
      recordAudit('RESULT_STALE', { trigger: eventType }, scopeId, before);
    }
  }

  function syncBenchmarkModified() {
    const loaded = state.benchmark.loaded;
    if (!loaded) return;
    const modified = state.benchmark.detachedFromSource || Object.values(state.tables).some((table) => table.dirty);
    if (loaded.modified !== modified) state.benchmark.loaded = Object.freeze({ ...loaded, modified });
  }

  function rebuildWorkspace() {
    if (!state.envelope?.workflow) { state.workspace = null; return; }
    state.workspace = buildVibrationWorkspaceModel(state.envelope.workflow, workspaceOptions(state));
    if (state.selectedRowKey && !state.workspace.selectedRowKey) state.selectedRowKey = null;
  }

  function applyTableMutation(kind, table, mutation = 'table-edit') {
    const before = workflowId();
    state.tables[kind] = table;
    if (kind === 'topology') state.allowLimitedExchange = true;
    syncBenchmarkModified();
    invalidateCalculatedState(before, TABLE_MUTATION_EVENTS[mutation] ?? 'INPUT_EDITED', { table: kind, mutation });
    state.error = null; render();
  }

  async function loadFile(target, file) {
    const before = workflowId();
    state.error = null;
    try {
      const loaded = await readVibrationIntegrityInputFile(target, file);
      if (state.destroyed) return;
      state.files[target] = loaded.file; state.tables[target] = loaded.table;
      if (state.benchmark.loaded) state.benchmark.detachedFromSource = true;
      syncBenchmarkModified();
      invalidateCalculatedState(before, 'SOURCE_IMPORTED', {
        target, name: loaded.file?.name ?? file?.name ?? null,
        format: loaded.file?.format ?? loaded.file?.kind ?? null,
      });
    } catch (error) {
      if (state.destroyed) return;
      state.error = String(error?.message || error);
      recordAudit('SOURCE_IMPORT_FAILED', { target, error: state.error.slice(0, 500) }, null, before);
    }
    render();
  }

  function loadBenchmark() {
    const before = workflowId();
    try {
      const benchmark = buildLoadedVibrationIntegrityBenchmark(state.benchmark.selectedId);
      state.benchmark.loaded = benchmark.loaded; state.benchmark.detachedFromSource = false;
      state.tables = benchmark.tables; state.files = benchmark.files;
      state.allowLimitedExchange = benchmark.allowLimitedExchange; discardCalculatedState(); state.error = null;
      recordAudit('BENCHMARK_LOADED', { benchmarkId: benchmark.loaded?.id ?? state.benchmark.selectedId }, null, before);
    } catch (error) { state.error = String(error?.message || error); }
    render();
  }

  async function checkReadiness() {
    if (!state.tables.topology.rows.length) return;
    const before = workflowId();
    state.busy = true; state.busyAction = 'preflight'; state.error = null;
    recordAudit('READINESS_STARTED', {}, null, before); render();
    try {
      const captured = captureVibrationIntegrityExecutionState(state);
      const tableInput = await buildVibrationIntegrityFacilityTableInput(captured);
      const preflight = buildVibrationFacilityFitPreflightFromTables(tableInput, { allowLimitedExchange: captured.allowLimitedExchange });
      if (await vibrationIntegrityCapturedInputDrifted(captured, state)) throw inputDriftError();
      state.preflight = preflight;
      recordAudit('READINESS_COMPLETED', {
        ready: preflight?.preflight?.counts?.ready ?? 0,
        notReady: preflight?.preflight?.counts?.notReady ?? 0,
      }, null, before);
    } catch (error) {
      state.preflight = null; state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
      recordAudit('READINESS_FAILED', { error: state.error.slice(0, 500) }, null, before);
    } finally { state.busy = false; state.busyAction = null; render(); }
  }

  async function runScreening() {
    if (!state.tables.topology.rows.length) return;
    const before = workflowId();
    state.busy = true; state.busyAction = 'screening';
    state.resultState = transitionVibrationIntegrityResultState(state.resultState, 'RUN_STARTED'); state.error = null;
    recordAudit('FIT_RUN_STARTED', {}, null, before); render();
    try {
      const captured = captureVibrationIntegrityExecutionState(state);
      const { runVibrationFacilityFitScreeningFromTables } = await import('../converters/vibration/facility/fit-workflow-tabular.js');
      const executed = await executeVibrationIntegrityRun(captured, runVibrationFacilityFitScreeningFromTables);
      if (state.destroyed) return;
      state.envelope = executed.envelope;
      const drifted = await vibrationIntegrityRunInputDrifted(executed.runSnapshot, state);
      if (state.destroyed) return;
      state.runSnapshot = Object.freeze({ ...executed.runSnapshot, runId: `FIT-RUN-${new Date().toISOString()}` });
      state.resultState = transitionVibrationIntegrityResultState(state.resultState, 'RUN_SUCCEEDED', { drifted });
      state.selectedRowKey = null; state.detailTab = 'summary'; rebuildWorkspace();
      recordAudit('FIT_RUN_COMPLETED', {
        resultState: state.resultState,
        runId: state.runSnapshot.runId,
        registerRows: state.envelope?.workflow?.register?.rows?.length ?? 0,
      }, null, 'RUNNING');
      if (drifted) recordAudit('RESULT_STALE', { trigger: 'RUN_INPUT_DRIFT' }, null, 'RUNNING');
    } catch (error) {
      if (state.destroyed) return;
      state.resultState = transitionVibrationIntegrityResultState(state.resultState, 'RUN_FAILED', {
        hasRetainedResult: Boolean(state.envelope?.workflow),
      });
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
      recordAudit('FIT_RUN_FAILED', { error: state.error.slice(0, 500) }, null, 'RUNNING');
    } finally { state.busy = false; state.busyAction = null; render(); }
  }

  function exportRegister() {
    if (state.resultState !== 'CURRENT_RESULT' || !state.envelope?.workflow?.register) return;
    try {
      downloadVibrationIntegrityText(serializeVibrationFacilityFitRegisterCsv(state.envelope.workflow.register), 'vibration-fit-screening-register.csv');
      recordAudit('REGISTER_EXPORTED', { rows: state.envelope.workflow.register.rows?.length ?? 0 });
      render();
    } catch (error) { state.error = String(error?.message || error); render(); }
  }

  async function exportRunEvidence() {
    if (state.resultState !== 'CURRENT_RESULT') return;
    recordAudit('RUN_EVIDENCE_EXPORT_STARTED', { runId: state.runSnapshot?.runId ?? null });
    try {
      const payload = await serializeVibrationIntegrityRunEvidence(state);
      downloadVibrationIntegrityText(payload, 'vibration-fit-run-evidence.json', 'application/json;charset=utf-8');
      recordAudit('RUN_EVIDENCE_EXPORTED', { runId: state.runSnapshot?.runId ?? null });
      render();
    } catch (error) {
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`; render();
    }
  }

  function applyPresentationChange() {
    try { rebuildWorkspace(); state.error = null; } catch (error) { state.error = String(error?.message || error); }
    render();
  }

  function handleTableClick(event) {
    const addKind = event.target.closest('[data-vi-table-add]')?.dataset.viTableAdd;
    if (addKind) { applyTableMutation(addKind, addVibrationIntegrityInputRow(state.tables[addKind]), 'row-add'); return true; }
    const revertTableKind = event.target.closest('[data-vi-table-revert]')?.dataset.viTableRevert;
    if (revertTableKind) { applyTableMutation(revertTableKind, revertVibrationIntegrityInputTable(state.tables[revertTableKind]), 'table-revert'); return true; }
    const revertCell = event.target.closest('[data-vi-cell-revert]');
    if (revertCell) {
      const kind = revertCell.dataset.viCellRevert;
      applyTableMutation(kind, revertVibrationIntegrityInputCell(state.tables[kind], Number(revertCell.dataset.viEditRow), Number(revertCell.dataset.viEditColumn)), 'cell-revert');
      return true;
    }
    const revertRow = event.target.closest('[data-vi-row-revert]');
    if (revertRow) {
      const kind = revertRow.dataset.viRowRevert;
      applyTableMutation(kind, revertVibrationIntegrityInputRow(state.tables[kind], Number(revertRow.dataset.viEditRow)), 'row-revert');
      return true;
    }
    const button = event.target.closest('[data-vi-table-delete]');
    if (!button) return false;
    const kind = button.dataset.viTableDelete;
    applyTableMutation(kind, deleteVibrationIntegrityInputRow(state.tables[kind], Number(button.dataset.viEditRow)), 'row-delete');
    return true;
  }

  function recordHandledWorkspaceClick(event, before) {
    const tab = event.target.closest('[data-vi-workspace-tab]')?.dataset.viWorkspaceTab;
    if (tab) return recordAudit('WORKSPACE_TAB_OPENED', { tab }, null, before);
    const mechanicalScope = event.target.closest('[data-vi-mechanical-facility-scope]')?.dataset.viMechanicalFacilityScope;
    if (mechanicalScope) return recordAudit('MECHANICAL_INPUTS_OPENED', {}, mechanicalScope, before);
    const sbcScope = event.target.closest('[data-vi-sbc-facility-scope]')?.dataset.viSbcFacilityScope;
    if (sbcScope) return recordAudit('SBC_INPUTS_OPENED', {}, sbcScope, before);
    if (event.target.closest('[data-vi-mechanical-evaluate]')) {
      return recordAudit('MECHANICAL_EVALUATION_STARTED', {}, state.mechanicalFacilityScopeId || null, before);
    }
    if (event.target.closest('[data-vi-mechanical-clear]')) {
      return recordAudit('MECHANICAL_INPUTS_CLEARED', {}, state.mechanicalFacilityScopeId || null, before);
    }
    if (event.target.closest('[data-vi-sbc-type3-evaluate]')) {
      return recordAudit('SBC_TYPE3_EVALUATED', { status: state.sbcType3Result?.status ?? null }, state.sbcType3ScopeId || null, before);
    }
    if (event.target.closest('[data-vi-user-data-add], [data-vi-user-data-add-sbc], [data-vi-user-data-delete], [data-vi-sbc-type3-template]')) {
      return recordAudit('USER_DATA_CHANGED', { action: 'USER_DATA_MUTATION' }, state.sbcType3ScopeId || null, before);
    }
    return undefined;
  }

  function openSourceTarget(sourceTarget) {
    state.inputTab = 'source'; render();
    const target = container.ownerDocument?.getElementById(sourceTarget);
    if (!target) return;
    target.focus?.({ preventScroll: true });
    target.scrollIntoView?.({ block: 'center' });
  }

  function onClick(event) {
    const before = workflowId();
    if (handleVibrationUserDataClick(state, event, render)) { recordHandledWorkspaceClick(event, before); return; }
    if (handleTableClick(event)) return;
    const sourceTarget = event.target.closest('[data-vi-source-target]')?.dataset.viSourceTarget;
    if (sourceTarget) { event.preventDefault(); openSourceTarget(sourceTarget); return; }
    const inputTab = event.target.closest('[data-vi-input-tab]')?.dataset.viInputTab;
    if (inputTab) { state.inputTab = inputTab; return render(); }
    const row = event.target.closest('[data-vi-row]');
    if (row) { state.selectedRowKey = row.dataset.viRow; state.detailTab = 'summary'; return applyPresentationChange(); }
    const detail = event.target.closest('[data-vi-detail]');
    if (detail) { state.detailTab = detail.dataset.viDetail; return render(); }
    const action = event.target.closest('[data-vi-action]')?.dataset.viAction;
    if (action === VIBRATION_INTEGRITY_ACTION_IDS.loadBenchmark) loadBenchmark();
    if (action === VIBRATION_INTEGRITY_ACTION_IDS.preflight) checkReadiness();
    if (action === VIBRATION_INTEGRITY_ACTION_IDS.run) runScreening();
    if (action === VIBRATION_INTEGRITY_ACTION_IDS.exportRegister) exportRegister();
    if (action === VIBRATION_INTEGRITY_ACTION_IDS.exportEvidence) exportRunEvidence();
    if (action === 'operating-template') downloadVibrationIntegrityText(createVibrationOperatingCaseCsvTemplate(), 'vibration-operating-cases-v1.csv');
    if (action === 'enrichment-template') downloadVibrationIntegrityText(createVibrationEnrichmentCsvTemplate(), 'vibration-enrichment-v1.csv');
    if (action === 'data-blocker-template') downloadVibrationIntegrityText(createVibrationFitDataBlockerCsvTemplate(), 'vibration-fit-data-blockers-v1.csv');
  }

  function handleTableChange(event) {
    const kind = event.target.dataset.viTableCell;
    if (!kind) return false;
    const table = updateVibrationIntegrityInputCell(state.tables[kind], Number(event.target.dataset.viEditRow), Number(event.target.dataset.viEditColumn), event.target.value);
    applyTableMutation(kind, table, 'cell-edit'); return true;
  }

  function onChange(event) {
    const before = workflowId();
    if (handleVibrationUserDataChange(state, event, render)) {
      const scopeId = state.mechanicalFacilityScopeId || state.sbcType3ScopeId || null;
      if (event.target.matches('[data-vi-mechanical-not-applicable]') && event.target.checked) {
        recordAudit('MECHANICAL_NOT_APPLICABLE', {}, scopeId, before);
      } else if (event.target.matches('[data-vi-mechanical-source]')) {
        recordAudit('MECHANICAL_SOURCES_CHANGED', {}, scopeId, before);
      } else {
        recordAudit('USER_DATA_CHANGED', { field: event.target?.dataset?.viUserDataCell ?? null }, scopeId, before);
      }
      return;
    }
    const fileTarget = event.target.dataset.viFile;
    if (fileTarget) { const file = event.target.files?.[0]; if (file) loadFile(fileTarget, file); return; }
    if (event.target.matches('[data-vi-benchmark-select]')) { state.benchmark.selectedId = event.target.value; return render(); }
    if (event.target.matches('[data-vi-limited]')) {
      state.allowLimitedExchange = event.target.checked;
      invalidateCalculatedState(before, 'INPUT_EDITED', { source: 'limited-exchange-toggle', enabled: state.allowLimitedExchange });
      return render();
    }
    if (handleTableChange(event)) return;
    const filter = event.target.dataset.viFilter;
    if (filter) { state.filters[filter] = event.target.value; return applyPresentationChange(); }
    const sort = event.target.dataset.viSort;
    if (sort) { state.sort[sort] = event.target.value; applyPresentationChange(); }
  }

  recordAudit('WORKSPACE_OPENED', { product: 'Vibration Integrity' }, null, null);
  container.addEventListener('click', onClick); container.addEventListener('change', onChange); render();
  return () => {
    state.destroyed = true; container.removeEventListener('click', onClick); container.removeEventListener('change', onChange);
  };
}
