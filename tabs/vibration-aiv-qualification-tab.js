import { createAivAssessmentCsvTemplate } from '../converters/vibration/aiv/assessment-csv.js';
import { createAivSourceCsvTemplate } from '../converters/vibration/aiv/source-csv.js';
import { createAivSourceAssessmentCsvTemplate } from '../converters/vibration/aiv/source-assessment-csv.js';
import {
  addAivInputRow,
  createEmptyAivInputTable,
  deleteAivInputRow,
  parseAivInputCsv,
  serializeAivInputTable,
  updateAivInputCell,
} from './vibration-aiv-input-model.js';
import { buildLoadedAivD23Benchmark } from './vibration-aiv-benchmarks.js';
import { renderAivQualificationWorkspaceHtml } from './vibration-aiv-qualification-view.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-aiv-qualification-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-aiv-qualification.css?v=aiv-qualification-4';
  link.dataset.aivQualificationStyle = 'true';
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

function initialState() {
  return {
    files: { topology: null, sources: null, assessments: null, relationships: null },
    topologyInput: null,
    tables: {
      sources: createEmptyAivInputTable('sources'),
      assessments: createEmptyAivInputTable('assessments'),
      relationships: createEmptyAivInputTable('relationships'),
    },
    benchmark: { loaded: null },
    readinessEnvelope: null,
    selectedRowKey: null,
    busy: false,
    error: null,
    destroyed: false,
  };
}

export function renderAivQualificationWorkspace(container) {
  ensureStylesheet();
  const state = initialState();

  function render() {
    if (!state.destroyed) container.innerHTML = renderAivQualificationWorkspaceHtml(state);
  }

  function clearReadiness() {
    state.readinessEnvelope = null;
    state.selectedRowKey = null;
  }

  function markBenchmarkModified() {
    if (!state.benchmark.loaded || state.benchmark.loaded.modified) return;
    state.benchmark.loaded = Object.freeze({ ...state.benchmark.loaded, modified: true });
  }

  function loadBenchmark() {
    try {
      const loaded = buildLoadedAivD23Benchmark();
      state.benchmark.loaded = loaded.benchmark;
      state.tables = loaded.tables;
      state.files = loaded.files;
      state.topologyInput = {
        format: 'PARSED_EXCHANGE',
        data: loaded.topology,
        sourceFileName: loaded.topology.sourceFileName,
      };
      clearReadiness();
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  async function loadFile(target, file) {
    clearReadiness();
    state.error = null;
    try {
      if (target === 'topology') {
        state.files.topology = { name: file.name, kind: 'Complete five-sheet XLSX' };
        state.topologyInput = {
          format: 'XLSX',
          data: await file.arrayBuffer(),
          sourceFileName: file.name,
        };
      } else {
        const text = await file.text();
        state.tables[target] = parseAivInputCsv(target, text, {
          sourceName: file.name,
          sourceKind: 'CSV',
        });
        state.files[target] = {
          name: file.name,
          kind: state.tables[target].contract,
        };
      }
      markBenchmarkModified();
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  function applyTableMutation(kind, table) {
    state.tables[kind] = table;
    markBenchmarkModified();
    clearReadiness();
    state.error = null;
    render();
  }

  function readinessInputAvailable() {
    return Boolean(
      state.topologyInput
      && state.tables.sources.rows.length
      && state.tables.assessments.rows.length
      && state.tables.relationships.rows.length,
    );
  }

  async function checkReadiness() {
    if (state.busy || !readinessInputAvailable()) return;
    state.busy = true;
    state.error = null;
    render();
    try {
      const { AIV_TOPOLOGY_INPUT_FORMAT, buildAivReadinessFromTables } = await import(
        '../converters/vibration/aiv/aiv-readiness-tables.js?v=aiv-readiness-3'
      );
      if (state.destroyed) return;
      const format = state.topologyInput.format === 'PARSED_EXCHANGE'
        ? AIV_TOPOLOGY_INPUT_FORMAT.PARSED_EXCHANGE
        : AIV_TOPOLOGY_INPUT_FORMAT.XLSX;
      state.readinessEnvelope = buildAivReadinessFromTables({
        topology: {
          format,
          data: state.topologyInput.data,
          sourceFileName: state.topologyInput.sourceFileName,
        },
        sourceCsv: serializeAivInputTable(state.tables.sources),
        assessmentCsv: serializeAivInputTable(state.tables.assessments),
        sourceAssessmentCsv: serializeAivInputTable(state.tables.relationships),
      });
      state.selectedRowKey = state.readinessEnvelope.readiness.rows[0]?.rowKey ?? null;
    } catch (error) {
      if (state.destroyed) return;
      state.readinessEnvelope = null;
      state.selectedRowKey = null;
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      render();
    }
  }

  function handleTableClick(event) {
    const addKind = event.target.closest('[data-aiv-table-add]')?.dataset.aivTableAdd;
    if (addKind) {
      applyTableMutation(addKind, addAivInputRow(state.tables[addKind]));
      return true;
    }
    const button = event.target.closest('[data-aiv-table-delete]');
    if (!button) return false;
    const kind = button.dataset.aivTableDelete;
    applyTableMutation(kind, deleteAivInputRow(state.tables[kind], Number(button.dataset.aivEditRow)));
    return true;
  }

  function onClick(event) {
    if (handleTableClick(event)) return;
    const row = event.target.closest('[data-aiv-row]');
    if (row) {
      state.selectedRowKey = row.dataset.aivRow;
      render();
      return;
    }
    const action = event.target.closest('[data-aiv-action]')?.dataset.aivAction;
    if (action === 'load-d23-benchmark') loadBenchmark();
    if (action === 'source-template') downloadText(createAivSourceCsvTemplate(), 'aiv-sources-v2.csv');
    if (action === 'assessment-template') downloadText(createAivAssessmentCsvTemplate(), 'aiv-assessments-v1.csv');
    if (action === 'relationship-template') downloadText(createAivSourceAssessmentCsvTemplate(), 'aiv-source-assessment-v1.csv');
    if (action === 'check-readiness') checkReadiness();
  }

  function handleTableChange(event) {
    const kind = event.target.dataset.aivTableCell;
    if (!kind) return false;
    applyTableMutation(kind, updateAivInputCell(
      state.tables[kind],
      Number(event.target.dataset.aivEditRow),
      Number(event.target.dataset.aivEditColumn),
      event.target.value,
    ));
    return true;
  }

  function onChange(event) {
    const target = event.target.dataset.aivFile;
    if (target) {
      const file = event.target.files?.[0];
      if (file) loadFile(target, file);
      return;
    }
    handleTableChange(event);
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
