import {
  VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT,
} from '../converters/vibration/facility/fit-tables.js';
import {
  buildVibrationFacilityFitPreflightFromTables,
} from '../converters/vibration/facility/fit-preflight-tabular.js';
import { serializeVibrationFacilityFitRegisterCsv } from '../converters/vibration/facility/fit-register-export.js';
import {
  createVibrationEnrichmentCsvTemplate,
  createVibrationOperatingCaseCsvTemplate,
} from '../converters/vibration/tabular/templates.js';
import {
  buildVibrationWorkspaceModel,
} from '../converters/vibration/workspace/model.js';
import { renderVibrationIntegrityHtml } from './vibration-integrity-view.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-vibration-integrity-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-integrity.css?v=vibration-integrity-1';
  link.dataset.vibrationIntegrityStyle = 'true';
  document.head.appendChild(link);
}

function topologyFormat(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.endsWith('.xlsx')) return VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.XLSX;
  if (lower.endsWith('.csv')) return VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.CSV_ELEMENTS_ONLY;
  throw new Error('3D EDIT table export must be .xlsx or .csv.');
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

function tableInput(state) {
  return {
    topology: {
      format: state.files.topology.format,
      data: state.files.topology.data,
      sourceFileName: state.files.topology.name,
    },
    operatingCaseCsv: state.files.operating?.text ?? '',
    enrichmentCsv: state.files.enrichment?.text ?? '',
  };
}

function rebuildWorkspace(state) {
  if (!state.envelope?.workflow) {
    state.workspace = null;
    return;
  }
  state.workspace = buildVibrationWorkspaceModel(state.envelope.workflow, workspaceOptions(state));
  if (state.selectedRowKey && !state.workspace.selectedRowKey) state.selectedRowKey = null;
}

async function readTopologyFile(file) {
  const format = topologyFormat(file.name);
  const data = format === VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.XLSX
    ? await file.arrayBuffer()
    : await file.text();
  return {
    name: file.name,
    format,
    data,
    kind: format === VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.XLSX
      ? 'Complete five-sheet XLSX expected'
      : 'Elements-only CSV · limited provenance',
  };
}

async function readCsvFile(file, kind) {
  return { name: file.name, text: await file.text(), kind };
}

export function renderVibrationIntegrityTab(container) {
  ensureStylesheet();
  const state = {
    files: { topology: null, operating: null, enrichment: null },
    allowLimitedExchange: false,
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

  function render() {
    if (!state.destroyed) container.innerHTML = renderVibrationIntegrityHtml(state);
  }

  function clearCalculatedState() {
    state.preflight = null;
    state.envelope = null;
    state.workspace = null;
    state.selectedRowKey = null;
  }

  async function loadFile(target, file) {
    state.error = null;
    try {
      const loaded = target === 'topology'
        ? await readTopologyFile(file)
        : await readCsvFile(file, target === 'operating' ? 'VibrationOperatingCaseCsv.v1' : 'VibrationEnrichmentCsv.v1');
      if (state.destroyed) return;
      state.files[target] = loaded;
      clearCalculatedState();
    } catch (error) {
      if (state.destroyed) return;
      state.error = String(error?.message || error);
    }
    render();
  }

  function checkReadiness() {
    if (!state.files.topology) return;
    state.busy = true;
    state.busyAction = 'preflight';
    state.error = null;
    render();
    try {
      state.preflight = buildVibrationFacilityFitPreflightFromTables(tableInput(state), {
        allowLimitedExchange: state.allowLimitedExchange,
      });
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
    if (!state.files.topology) return;
    state.busy = true;
    state.busyAction = 'benchmark';
    state.error = null;
    render();
    try {
      const { runVibrationFacilityFitBenchmarkFromTables } = await import(
        '../converters/vibration/facility/fit-workflow-tabular.js'
      );
      if (state.destroyed) return;
      state.envelope = runVibrationFacilityFitBenchmarkFromTables(tableInput(state), {
        allowLimitedExchange: state.allowLimitedExchange,
      });
      state.selectedRowKey = null;
      state.detailTab = 'summary';
      rebuildWorkspace(state);
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
      const csv = serializeVibrationFacilityFitRegisterCsv(state.envelope.workflow.register);
      downloadText(csv, 'vibration-fit-benchmark-register.csv');
    } catch (error) {
      state.error = String(error?.message || error);
      render();
    }
  }

  function applyPresentationChange() {
    try {
      rebuildWorkspace(state);
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  function onClick(event) {
    const row = event.target.closest('[data-vi-row]');
    if (row) {
      state.selectedRowKey = row.dataset.viRow;
      state.detailTab = 'summary';
      applyPresentationChange();
      return;
    }
    const detail = event.target.closest('[data-vi-detail]');
    if (detail) {
      state.detailTab = detail.dataset.viDetail;
      render();
      return;
    }
    const action = event.target.closest('[data-vi-action]')?.dataset.viAction;
    if (action === 'preflight') checkReadiness();
    if (action === 'run') runBenchmark();
    if (action === 'export') exportRegister();
    if (action === 'operating-template') {
      downloadText(createVibrationOperatingCaseCsvTemplate(), 'vibration-operating-cases-v1.csv');
    }
    if (action === 'enrichment-template') {
      downloadText(createVibrationEnrichmentCsvTemplate(), 'vibration-enrichment-v1.csv');
    }
  }

  function onChange(event) {
    const fileTarget = event.target.dataset.viFile;
    if (fileTarget) {
      const file = event.target.files?.[0];
      if (file) loadFile(fileTarget, file);
      return;
    }
    if (event.target.matches('[data-vi-limited]')) {
      state.allowLimitedExchange = event.target.checked;
      clearCalculatedState();
      render();
      return;
    }
    const filter = event.target.dataset.viFilter;
    if (filter) {
      state.filters[filter] = event.target.value;
      applyPresentationChange();
      return;
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
