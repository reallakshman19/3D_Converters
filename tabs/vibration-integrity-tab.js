import { parseVibrationTableExchangeXlsx } from '../converters/vibration/exchange/parse.js';
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
import { buildVibrationWorkspaceModel } from '../converters/vibration/workspace/model.js';
import {
  buildVibrationFitUiBenchmarkCase,
  VIBRATION_FIT_UI_BENCHMARK_CASES,
} from './vibration-integrity-benchmarks.js';
import {
  addVibrationIntegrityInputRow,
  createEmptyVibrationIntegrityInputTable,
  createTopologyInputTableFromExchange,
  deleteVibrationIntegrityInputRow,
  parseVibrationIntegrityInputCsv,
  serializeVibrationIntegrityInputTable,
  updateVibrationIntegrityInputCell,
} from './vibration-integrity-input-model.js';
import { renderVibrationIntegrityHtml } from './vibration-integrity-view.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-vibration-integrity-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-integrity.css?v=vibration-integrity-2';
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

function serializeOptionalTable(table) {
  return table.rows.length ? serializeVibrationIntegrityInputTable(table) : '';
}

function topologyExecutionInput(state) {
  const file = state.files.topology;
  const table = state.tables.topology;
  if (!table.rows.length) return null;
  if (file?.format === VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.XLSX && !table.dirty) {
    return { format: file.format, data: file.data, sourceFileName: file.name };
  }
  return {
    format: VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.CSV_ELEMENTS_ONLY,
    data: serializeVibrationIntegrityInputTable(table),
    sourceFileName: table.sourceName ?? file?.name ?? 'vibration-elements-working.csv',
  };
}

function tableInput(state) {
  return {
    topology: topologyExecutionInput(state),
    operatingCaseCsv: serializeOptionalTable(state.tables.operating),
    enrichmentCsv: serializeOptionalTable(state.tables.enrichment),
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
  if (format === VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.XLSX) {
    const data = await file.arrayBuffer();
    const exchange = parseVibrationTableExchangeXlsx(data, { sourceFileName: file.name });
    return {
      file: { name: file.name, format, data, kind: 'Complete five-sheet XLSX · editable Elements view' },
      table: createTopologyInputTableFromExchange(exchange, { sourceName: file.name }),
    };
  }
  const text = await file.text();
  return {
    file: { name: file.name, format, kind: 'Elements-only CSV · limited provenance' },
    table: parseVibrationIntegrityInputCsv('topology', text, { sourceName: file.name, sourceKind: format }),
  };
}

async function readCsvFile(file, kind) {
  const text = await file.text();
  const contract = kind === 'operating' ? 'VibrationOperatingCaseCsv.v1' : 'VibrationEnrichmentCsv.v1';
  return {
    file: { name: file.name, kind: contract },
    table: parseVibrationIntegrityInputCsv(kind, text, { sourceName: file.name, sourceKind: 'CSV' }),
  };
}

function initialState() {
  return {
    files: { topology: null, operating: null, enrichment: null },
    tables: {
      topology: createEmptyVibrationIntegrityInputTable('topology'),
      operating: createEmptyVibrationIntegrityInputTable('operating'),
      enrichment: createEmptyVibrationIntegrityInputTable('enrichment'),
    },
    benchmark: { selectedId: VIBRATION_FIT_UI_BENCHMARK_CASES[0]?.id ?? '', loaded: null },
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
      const loaded = target === 'topology'
        ? await readTopologyFile(file)
        : await readCsvFile(file, target);
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
      const loaded = buildVibrationFitUiBenchmarkCase(state.benchmark.selectedId);
      state.benchmark.loaded = loaded;
      state.tables = { ...loaded.tables };
      state.files = {
        topology: { name: `${loaded.id}.csv`, format: VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT.CSV_ELEMENTS_ONLY, kind: 'EI benchmark Elements working table' },
        operating: { name: `${loaded.id}-operating.csv`, kind: 'EI benchmark operating table' },
        enrichment: { name: `${loaded.id}-enrichment.csv`, kind: 'EI benchmark enrichment table' },
      };
      state.allowLimitedExchange = true;
      clearCalculatedState();
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  function checkReadiness() {
    if (!topologyExecutionInput(state)) return;
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
    if (!topologyExecutionInput(state)) return;
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
      downloadText(serializeVibrationFacilityFitRegisterCsv(state.envelope.workflow.register), 'vibration-fit-benchmark-register.csv');
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
    const addKind = event.target.closest('[data-vi-table-add]')?.dataset.viTableAdd;
    if (addKind) return applyTableMutation(addKind, addVibrationIntegrityInputRow(state.tables[addKind]));
    const deleteButton = event.target.closest('[data-vi-table-delete]');
    if (deleteButton) {
      const kind = deleteButton.dataset.viTableDelete;
      return applyTableMutation(kind, deleteVibrationIntegrityInputRow(state.tables[kind], Number(deleteButton.dataset.viEditRow)));
    }
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
    const cellKind = event.target.dataset.viTableCell;
    if (cellKind) {
      const table = updateVibrationIntegrityInputCell(
        state.tables[cellKind],
        Number(event.target.dataset.viEditRow),
        Number(event.target.dataset.viEditColumn),
        event.target.value,
      );
      return applyTableMutation(cellKind, table);
    }
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
