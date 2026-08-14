import { buildVibrationFacilityFitPreflightFromTables } from '../converters/vibration/facility/fit-preflight-tabular.js';
import { serializeVibrationFacilityFitRegisterCsv } from '../converters/vibration/facility/fit-register-export.js';
import { createVibrationEnrichmentCsvTemplate, createVibrationOperatingCaseCsvTemplate } from '../converters/vibration/tabular/templates.js';
import { buildVibrationWorkspaceModel } from '../converters/vibration/workspace/model.js';
import { addVibrationIntegrityInputRow, deleteVibrationIntegrityInputRow, revertVibrationIntegrityInputCell, revertVibrationIntegrityInputRow, revertVibrationIntegrityInputTable, updateVibrationIntegrityInputCell } from './vibration-integrity-input-model.js';
import { buildLoadedVibrationIntegrityBenchmark, buildVibrationIntegrityFacilityTableInput, captureVibrationIntegrityExecutionState, createVibrationIntegrityInputRuntimeState, readVibrationIntegrityInputFile } from './vibration-integrity-input-runtime.js';
import { downloadVibrationIntegrityText, ensureVibrationIntegrityStylesheet } from './vibration-integrity-dom.js';
import { serializeVibrationIntegrityRunEvidence } from './vibration-integrity-run-evidence.js';
import { executeVibrationIntegrityBenchmarkRun, vibrationIntegrityCapturedInputDrifted, vibrationIntegrityRunInputDrifted } from './vibration-integrity-run-controller.js';
import { renderVibrationIntegrityHtml } from './vibration-integrity-view.js';

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
    ...createVibrationIntegrityInputRuntimeState(), preflight: null, envelope: null, workspace: null,
    resultState: 'UNRUN', runSnapshot: null,
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
  function render() {
    if (!state.destroyed) container.innerHTML = renderVibrationIntegrityHtml(state);
  }
  function discardCalculatedState() {
    state.preflight = null; state.envelope = null; state.workspace = null; state.selectedRowKey = null;
    state.resultState = 'UNRUN'; state.runSnapshot = null;
  }
  function staleCalculatedState() {
    state.preflight = null;
    state.resultState = state.envelope?.workflow ? 'STALE_RESULT' : 'UNRUN';
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
  function applyTableMutation(kind, table) {
    state.tables[kind] = table;
    if (kind === 'topology') state.allowLimitedExchange = true;
    syncBenchmarkModified(); staleCalculatedState(); state.error = null; render();
  }
  async function loadFile(target, file) {
    state.error = null;
    try {
      const loaded = await readVibrationIntegrityInputFile(target, file);
      if (state.destroyed) return;
      state.files[target] = loaded.file; state.tables[target] = loaded.table;
      if (state.benchmark.loaded) state.benchmark.detachedFromSource = true;
      syncBenchmarkModified(); staleCalculatedState();
    } catch (error) {
      if (state.destroyed) return;
      state.error = String(error?.message || error);
    }
    render();
  }
  function loadBenchmark() {
    try {
      const benchmark = buildLoadedVibrationIntegrityBenchmark(state.benchmark.selectedId);
      state.benchmark.loaded = benchmark.loaded; state.benchmark.detachedFromSource = false;
      state.tables = benchmark.tables; state.files = benchmark.files;
      state.allowLimitedExchange = benchmark.allowLimitedExchange; discardCalculatedState(); state.error = null;
    } catch (error) { state.error = String(error?.message || error); }
    render();
  }
  async function checkReadiness() {
    if (!state.tables.topology.rows.length) return;
    state.busy = true; state.busyAction = 'preflight'; state.error = null; render();
    try {
      const captured = captureVibrationIntegrityExecutionState(state);
      const tableInput = await buildVibrationIntegrityFacilityTableInput(captured);
      const preflight = buildVibrationFacilityFitPreflightFromTables(tableInput, { allowLimitedExchange: captured.allowLimitedExchange });
      if (await vibrationIntegrityCapturedInputDrifted(captured, state)) throw inputDriftError();
      state.preflight = preflight;
    } catch (error) {
      state.preflight = null; state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally { state.busy = false; state.busyAction = null; render(); }
  }
  async function runBenchmark() {
    if (!state.tables.topology.rows.length) return;
    state.busy = true; state.busyAction = 'benchmark'; state.resultState = 'RUNNING'; state.error = null; render();
    try {
      const captured = captureVibrationIntegrityExecutionState(state);
      const { runVibrationFacilityFitBenchmarkFromTables } = await import('../converters/vibration/facility/fit-workflow-tabular.js');
      const executed = await executeVibrationIntegrityBenchmarkRun(captured, runVibrationFacilityFitBenchmarkFromTables);
      if (state.destroyed) return;
      state.envelope = executed.envelope;
      const drifted = await vibrationIntegrityRunInputDrifted(executed.runSnapshot, state);
      if (state.destroyed) return;
      state.runSnapshot = Object.freeze({ ...executed.runSnapshot, runId: `FIT-RUN-${new Date().toISOString()}` });
      state.resultState = drifted ? 'STALE_RESULT' : 'CURRENT_RESULT';
      state.selectedRowKey = null; state.detailTab = 'summary'; rebuildWorkspace();
    } catch (error) {
      if (state.destroyed) return;
      state.resultState = state.envelope?.workflow ? 'STALE_RESULT' : 'INVALID_INPUT';
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally { state.busy = false; state.busyAction = null; render(); }
  }
  function exportRegister() {
    if (state.resultState !== 'CURRENT_RESULT' || !state.envelope?.workflow?.register) return;
    try {
      downloadVibrationIntegrityText(serializeVibrationFacilityFitRegisterCsv(state.envelope.workflow.register), 'vibration-fit-benchmark-register.csv');
    } catch (error) { state.error = String(error?.message || error); render(); }
  }
  async function exportRunEvidence() {
    if (state.resultState !== 'CURRENT_RESULT') return;
    try {
      const payload = await serializeVibrationIntegrityRunEvidence(state);
      downloadVibrationIntegrityText(payload, 'vibration-fit-run-evidence.json', 'application/json;charset=utf-8');
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
    if (addKind) { applyTableMutation(addKind, addVibrationIntegrityInputRow(state.tables[addKind])); return true; }
    const revertTableKind = event.target.closest('[data-vi-table-revert]')?.dataset.viTableRevert;
    if (revertTableKind) { applyTableMutation(revertTableKind, revertVibrationIntegrityInputTable(state.tables[revertTableKind])); return true; }
    const revertCell = event.target.closest('[data-vi-cell-revert]');
    if (revertCell) {
      const kind = revertCell.dataset.viCellRevert;
      applyTableMutation(kind, revertVibrationIntegrityInputCell(state.tables[kind], Number(revertCell.dataset.viEditRow), Number(revertCell.dataset.viEditColumn)));
      return true;
    }
    const revertRow = event.target.closest('[data-vi-row-revert]');
    if (revertRow) {
      const kind = revertRow.dataset.viRowRevert;
      applyTableMutation(kind, revertVibrationIntegrityInputRow(state.tables[kind], Number(revertRow.dataset.viEditRow)));
      return true;
    }
    const button = event.target.closest('[data-vi-table-delete]');
    if (!button) return false;
    const kind = button.dataset.viTableDelete;
    applyTableMutation(kind, deleteVibrationIntegrityInputRow(state.tables[kind], Number(button.dataset.viEditRow)));
    return true;
  }
  function onClick(event) {
    if (handleTableClick(event)) return;
    const row = event.target.closest('[data-vi-row]');
    if (row) { state.selectedRowKey = row.dataset.viRow; state.detailTab = 'summary'; return applyPresentationChange(); }
    const detail = event.target.closest('[data-vi-detail]');
    if (detail) { state.detailTab = detail.dataset.viDetail; return render(); }
    const action = event.target.closest('[data-vi-action]')?.dataset.viAction;
    if (action === 'load-benchmark') loadBenchmark();
    if (action === 'preflight') checkReadiness();
    if (action === 'run') runBenchmark();
    if (action === 'export') exportRegister();
    if (action === 'export-evidence') exportRunEvidence();
    if (action === 'operating-template') downloadVibrationIntegrityText(createVibrationOperatingCaseCsvTemplate(), 'vibration-operating-cases-v1.csv');
    if (action === 'enrichment-template') downloadVibrationIntegrityText(createVibrationEnrichmentCsvTemplate(), 'vibration-enrichment-v1.csv');
  }
  function handleTableChange(event) {
    const kind = event.target.dataset.viTableCell;
    if (!kind) return false;
    const table = updateVibrationIntegrityInputCell(state.tables[kind], Number(event.target.dataset.viEditRow), Number(event.target.dataset.viEditColumn), event.target.value);
    applyTableMutation(kind, table); return true;
  }
  function onChange(event) {
    const fileTarget = event.target.dataset.viFile;
    if (fileTarget) { const file = event.target.files?.[0]; if (file) loadFile(fileTarget, file); return; }
    if (event.target.matches('[data-vi-benchmark-select]')) { state.benchmark.selectedId = event.target.value; return render(); }
    if (event.target.matches('[data-vi-limited]')) { state.allowLimitedExchange = event.target.checked; staleCalculatedState(); return render(); }
    if (handleTableChange(event)) return;
    const filter = event.target.dataset.viFilter;
    if (filter) { state.filters[filter] = event.target.value; return applyPresentationChange(); }
    const sort = event.target.dataset.viSort;
    if (sort) { state.sort[sort] = event.target.value; applyPresentationChange(); }
  }
  container.addEventListener('click', onClick); container.addEventListener('change', onChange); render();
  return () => {
    state.destroyed = true; container.removeEventListener('click', onClick); container.removeEventListener('change', onChange);
  };
}
