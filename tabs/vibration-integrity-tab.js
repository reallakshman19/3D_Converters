import {
  buildVibrationFacilityFitPreflightFromTables,
} from '../converters/vibration/facility/fit-preflight-tabular.js';
import { serializeVibrationFacilityFitRegisterCsv } from '../converters/vibration/facility/fit-register-export.js';
import {
  createVibrationEnrichmentCsvTemplate,
  createVibrationOperatingCaseCsvTemplate,
} from '../converters/vibration/tabular/templates.js';
import { buildVibrationWorkspaceModel } from '../converters/vibration/workspace/model.js';
import {
  addVibrationIntegrityInputRow,
  deleteVibrationIntegrityInputRow,
  updateVibrationIntegrityInputCell,
} from './vibration-integrity-input-model.js';
import {
  buildLoadedVibrationIntegrityBenchmark,
  buildVibrationIntegrityFacilityTableInput,
  createVibrationIntegrityInputRuntimeState,
  readVibrationIntegrityInputFile,
  vibrationIntegrityTopologyExecutionInput,
} from './vibration-integrity-input-runtime.js';
import { renderVibrationIntegrityHtml } from './vibration-integrity-view.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-vibration-integrity-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-integrity.css?v=vibration-integrity-2';
  link.dataset.vibrationIntegrityStyle = 'true';
  document.head.appendChild(link);
}

function downloadText(text, fileName, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function workspaceOptions(state) {
  const filters = {};
  if (state.filters.line) filters.lines = [state.filters.line];
  if (state.filters.completeness) filters.completenessStatuses = [state.filters.completeness];
  if (state.filters.band) filters.referenceBands = [state.filters.band];
  if (state.filters.candidate === 'true') filters.candidateForEngineeringReview = true;
  if (state.filters.candidate === 'false') filters.candidateForEngineeringReview = false;
  return {
    filters,
    sort: { ...state.sort },
    ...(state.selectedRowKey ? { selectedRowKey: state.selectedRowKey } : {}),
  };
}

function initialState() {
  return {
    ...createVibrationIntegrityInputRuntimeState(),
    preflight: null,
    envelope: null,
    workspace: null,
    filters: { line: '', completeness: '', band: '', candidate: '' },
    sort: { field: 'line', direction: 'asc' },
    selectedRowKey: null,
    detailTab: 'summary',
    busy: false,
    busyAction: null,
    error: null,
    destroyed: false,
  };
}

export function renderVibrationIntegrityTab(container) {
  ensureStylesheet();
  const state = initialState();

  function render() {
    if (!state.destroyed) container.innerHTML = renderVibrationIntegrityHtml(state);
  }

  function clearCalculatedState() {
    state.preflight = null;
    state.envelope = null;
    state.workspace = null;
    state.selectedRowKey = null;
  }

  function markBenchmarkModified() {
    if (!state.benchmark.loaded || state.benchmark.loaded.modified) return;
    state.benchmark.loaded = Object.freeze({ ...state.benchmark.loaded, modified: true });
  }

  function rebuildWorkspace() {
    if (!state.envelope?.workflow) {
      state.workspace = null;
      return;
    }
    state.workspace = buildVibrationWorkspaceModel(state.envelope.workflow, workspaceOptions(state));
    if (state.selectedRowKey && !state.workspace.selectedRowKey) state.selectedRowKey = null;
  }

  function applyTableMutation(kind, table) {
    state.tables[kind] = table;
    if (kind === 'topology') state.allowLimitedExchange = true;
    markBenchmarkModified();
    clearCalculatedState();
    state.error = null;
    render();
  }

  async function loadFile(target, file) {
    state.error = null;
    try {
      const loaded = await readVibrationIntegrityInputFile(target, file);
      if (state.destroyed) return;
      state.files[target] = loaded.file;
      state.tables[target] = loaded.table;
      markBenchmarkModified();
      clearCalculatedState();
    } catch (error) {
      if (state.destroyed) return;
      state.error = String(error?.message || error);
    }
    render();
  }

  function loadBenchmark() {
    try {
      const benchmark = buildLoadedVibrationIntegrityBenchmark(state.benchmark.selectedId);
      state.benchmark.loaded = benchmark.loaded;
      state.tables = benchmark.tables;
      state.files = benchmark.files;
      state.allowLimitedExchange = benchmark.allowLimitedExchange;
      clearCalculatedState();
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  function checkReadiness() {
    if (!vibrationIntegrityTopologyExecutionInput(state)) return;
    state.busy = true;
    state.busyAction = 'preflight';
    state.error = null;
    render();
    try {
      state.preflight = buildVibrationFacilityFitPreflightFromTables(
        buildVibrationIntegrityFacilityTableInput(state),
        { allowLimitedExchange: state.allowLimitedExchange },
      );
    } catch (error) {
      state.preflight = null;
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      state.busyAction = null;
      render();
    }
  }

  async function runBenchmark() {
    if (!vibrationIntegrityTopologyExecutionInput(state)) return;
    state.busy = true;
    state.busyAction = 'benchmark';
    state.error = null;
    render();
    try {
      const { runVibrationFacilityFitBenchmarkFromTables } = await import(
        '../converters/vibration/facility/fit-workflow-tabular.js'
      );
      if (state.destroyed) return;
      state.envelope = runVibrationFacilityFitBenchmarkFromTables(
        buildVibrationIntegrityFacilityTableInput(state),
        { allowLimitedExchange: state.allowLimitedExchange },
      );
      state.selectedRowKey = null;
      state.detailTab = 'summary';
      rebuildWorkspace();
    } catch (error) {
      if (state.destroyed) return;
      state.envelope = null;
      state.workspace = null;
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      state.busyAction = null;
      render();
    }
  }

  function exportRegister() {
    if (!state.envelope?.workflow?.register) return;
    try {
      downloadText(serializeVibrationFacilityFitRegisterCsv(state.envelope.workflow.register), 'vibration-fit-benchmark-register.csv');
    } catch (error) {
      state.error = String(error?.message || error);
      render();
    }
  }

  function applyPresentationChange() {
    try {
      rebuildWorkspace();
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  function handleTableClick(event) {
    const addKind = event.target.closest('[data-vi-table-add]')?.dataset.viTableAdd;
    if (addKind) {
      applyTableMutation(addKind, addVibrationIntegrityInputRow(state.tables[addKind]));
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
    if (row) {
      state.selectedRowKey = row.dataset.viRow;
      state.detailTab = 'summary';
      return applyPresentationChange();
    }
    const detail = event.target.closest('[data-vi-detail]');
    if (detail) {
      state.detailTab = detail.dataset.viDetail;
      return render();
    }
    const action = event.target.closest('[data-vi-action]')?.dataset.viAction;
    if (action === 'load-benchmark') loadBenchmark();
    if (action === 'preflight') checkReadiness();
    if (action === 'run') runBenchmark();
    if (action === 'export') exportRegister();
    if (action === 'operating-template') downloadText(createVibrationOperatingCaseCsvTemplate(), 'vibration-operating-cases-v1.csv');
    if (action === 'enrichment-template') downloadText(createVibrationEnrichmentCsvTemplate(), 'vibration-enrichment-v1.csv');
  }

  function handleTableChange(event) {
    const kind = event.target.dataset.viTableCell;
    if (!kind) return false;
    const table = updateVibrationIntegrityInputCell(
      state.tables[kind],
      Number(event.target.dataset.viEditRow),
      Number(event.target.dataset.viEditColumn),
      event.target.value,
    );
    applyTableMutation(kind, table);
    return true;
  }

  function onChange(event) {
    const fileTarget = event.target.dataset.viFile;
    if (fileTarget) {
      const file = event.target.files?.[0];
      if (file) loadFile(fileTarget, file);
      return;
    }
    if (event.target.matches('[data-vi-benchmark-select]')) {
      state.benchmark.selectedId = event.target.value;
      return render();
    }
    if (event.target.matches('[data-vi-limited]')) {
      state.allowLimitedExchange = event.target.checked;
      clearCalculatedState();
      return render();
    }
    if (handleTableChange(event)) return;
    const filter = event.target.dataset.viFilter;
    if (filter) {
      state.filters[filter] = event.target.value;
      return applyPresentationChange();
    }
    const sort = event.target.dataset.viSort;
    if (sort) {
      state.sort[sort] = event.target.value;
      applyPresentationChange();
    }
  }

  container.addEventListener('click', onClick);
  container.addEventListener('change', onChange);
  render();

  return () => {
    state.destroyed = true;
    container.removeEventListener('click', onClick);
    container.removeEventListener('change', onChange);
  };
}
