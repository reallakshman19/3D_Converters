import { createAivAssessmentCsvTemplate } from '../converters/vibration/aiv/assessment-csv.js';
import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  resolveAivWorkingTablesWithAssumptions,
  updateAivAssumptionProfile,
} from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { buildAivBlockedResultSet } from '../converters/vibration/aiv/aiv-result-contracts.js';
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
import { buildAivD23ValidatedExportPackage } from './vibration-aiv-validation-records.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-aiv-qualification-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-aiv-qualification.css?v=aiv-qualification-8';
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
    assumptionProfile: AIV_DEFAULT_ASSUMPTION_PROFILE,
    assumptionProfileModified: false,
    assumptionResolution: null,
    readinessEnvelope: null,
    resultSet: null,
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
    state.resultSet = null;
    state.selectedRowKey = null;
    state.assumptionResolution = null;
  }

  function markBenchmarkModified() {
    if (!state.benchmark.loaded || state.benchmark.loaded.modified) return;
    state.benchmark.loaded = Object.freeze({ ...state.benchmark.loaded, modified: true });
  }

  function loadBenchmark() {
    try {
      const loaded = buildLoadedAivD23Benchmark();
      state.benchmark.loaded = loaded.benchmark;
      state.tables = { ...loaded.tables };
      state.files = { ...loaded.files };
      state.assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE;
      state.assumptionProfileModified = false;
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
        state.files[target] = { name: file.name, kind: state.tables[target].contract };
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

  function ensureAssumableRows(tables) {
    return {
      sources: tables.sources.rows.length ? tables.sources : addAivInputRow(tables.sources),
      assessments: tables.assessments.rows.length ? tables.assessments : addAivInputRow(tables.assessments),
      relationships: tables.relationships.rows.length ? tables.relationships : addAivInputRow(tables.relationships),
    };
  }

  function readinessInputAvailable() {
    return Boolean(state.topologyInput);
  }

  async function checkReadiness() {
    if (state.busy || !readinessInputAvailable()) return;
    state.busy = true;
    state.error = null;
    render();
    try {
      const { AIV_TOPOLOGY_INPUT_FORMAT, buildAivReadinessFromTables } = await import(
        '../converters/vibration/aiv/aiv-readiness-tables.js?v=aiv-readiness-4'
      );
      if (state.destroyed) return;
      const format = state.topologyInput.format === 'PARSED_EXCHANGE'
        ? AIV_TOPOLOGY_INPUT_FORMAT.PARSED_EXCHANGE
        : AIV_TOPOLOGY_INPUT_FORMAT.XLSX;
      const assumableTables = ensureAssumableRows(state.tables);
      state.assumptionResolution = resolveAivWorkingTablesWithAssumptions(
        assumableTables,
        state.assumptionProfile,
      );
      state.readinessEnvelope = buildAivReadinessFromTables({
        topology: {
          format,
          data: state.topologyInput.data,
          sourceFileName: state.topologyInput.sourceFileName,
        },
        sourceCsv: serializeAivInputTable(state.assumptionResolution.tables.sources),
        assessmentCsv: serializeAivInputTable(state.assumptionResolution.tables.assessments),
        sourceAssessmentCsv: serializeAivInputTable(state.assumptionResolution.tables.relationships),
      });
      state.readinessEnvelope = Object.freeze({
        ...state.readinessEnvelope,
        assumptionResolution: state.assumptionResolution,
      });
      state.resultSet = buildAivBlockedResultSet(state.readinessEnvelope);
      state.selectedRowKey = state.readinessEnvelope.readiness.rows[0]?.rowKey ?? null;
    } catch (error) {
      if (state.destroyed) return;
      state.readinessEnvelope = null;
      state.resultSet = null;
      state.selectedRowKey = null;
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      render();
    }
  }

  function validationModified() {
    return Boolean(state.benchmark.loaded?.modified || state.assumptionProfileModified);
  }

  function exportValidatedBenchmark() {
    if (!state.benchmark.loaded || validationModified()) {
      state.error = 'AIV_D23_VALIDATION_NOT_APPLICABLE: Reload the controlled EI D.2.3 benchmark/default assumptions before exporting its validated result package.';
      render();
      return;
    }
    const payload = buildAivD23ValidatedExportPackage({
      assumptionProfile: state.assumptionProfile,
      benchmarkModified: validationModified(),
    });
    downloadText(
      `${JSON.stringify(payload, null, 2)}\n`,
      'aiv-d23-validated-benchmark-package.json',
      'application/json;charset=utf-8',
    );
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
    if (action === 'export-d23-validation') exportValidatedBenchmark();
    if (action === 'reset-assumptions') {
      state.assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE;
      state.assumptionProfileModified = false;
      clearReadiness();
      state.error = null;
      render();
    }
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
    const assumptionPath = event.target.dataset.aivAssumption;
    if (assumptionPath) {
      try {
        state.assumptionProfile = updateAivAssumptionProfile(
          state.assumptionProfile,
          assumptionPath,
          event.target.value,
        );
        state.assumptionProfileModified = true;
        clearReadiness();
        state.error = null;
      } catch (error) {
        state.error = String(error?.message || error);
      }
      render();
      return;
    }
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
