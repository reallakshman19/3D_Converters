import { createAivAssessmentCsvTemplate } from '../converters/vibration/aiv/assessment-csv.js';
import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  updateAivAssumptionProfile,
} from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { createAivSourceCsvTemplate } from '../converters/vibration/aiv/source-csv.js';
import { createAivSourceAssessmentCsvTemplate } from '../converters/vibration/aiv/source-assessment-csv.js';
import {
  addAivInputRow,
  addAivRelationshipInputRow,
  deleteAivInputRow,
  findAivRelationshipInputRowIndex,
  parseAivInputCsv,
  updateAivInputCell,
} from './vibration-aiv-input-model.js';
import { buildLoadedAivD23Benchmark } from './vibration-aiv-benchmarks.js';
import { createAivCanvasInteractionController } from './vibration-aiv-canvas-controller.js';
import { createAivCanvasExportController } from './vibration-aiv-canvas-export-controller.js';
import { createAivExecutionActions } from './vibration-aiv-execution.js';
import { createAivFlareNetworkAuthoringController } from './vibration-aiv-flare-network-controller.js';
import { projectAivFlareNetworkIntoWorkspace } from './vibration-aiv-flare-network-state.js';
import { renderAivQualificationWorkspaceHtml } from './vibration-aiv-qualification-view.js';
import { createInitialAivQualificationState } from './vibration-aiv-state.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-aiv-qualification-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-aiv-qualification.css?v=aiv-qualification-10';
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

export function renderAivQualificationWorkspace(container) {
  ensureStylesheet();
  const state = createInitialAivQualificationState();
  const canvasController = createAivCanvasInteractionController(container, {
    onCreateRelationship: createCanvasRelationship,
    onDeleteRelationship: deleteCanvasRelationship,
  });
  const canvasExportController = createAivCanvasExportController(container, {
    getState: () => state,
    getLayout: () => canvasController.getLayout(),
  });
  const flareNetworkController = createAivFlareNetworkAuthoringController(container, {
    getNetwork: () => state.flareNetwork,
    onNetworkChange: applyFlareNetwork,
    onError: (error) => { state.error = String(error?.message || error); render(); },
  });
  const execution = createAivExecutionActions({ state, render, downloadText });

  function render() {
    if (state.destroyed) return;
    container.innerHTML = renderAivQualificationWorkspaceHtml(state);
    canvasController.sync();
    canvasExportController.sync();
  }

  function deactivateFlareNetworkGeneration() {
    state.flareNetworkActive = false;
    state.generatedInputSet = null;
  }

  function applyFlareNetwork(network) {
    try {
      const projected = projectAivFlareNetworkIntoWorkspace(network);
      state.flareNetwork = projected.flareNetwork;
      state.generatedInputSet = projected.generatedInputSet;
      state.tables = projected.tables;
      state.topology = projected.topology;
      state.topologyInput = projected.topologyInput;
      state.files = projected.files;
      state.flareNetworkActive = true;
      state.benchmark.loaded = null;
      execution.clearReadiness();
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  function markBenchmarkModified() {
    if (!state.benchmark.loaded || state.benchmark.loaded.modified) return;
    state.benchmark.loaded = Object.freeze({ ...state.benchmark.loaded, modified: true });
  }

  function loadBenchmark() {
    try {
      const loaded = buildLoadedAivD23Benchmark();
      deactivateFlareNetworkGeneration();
      state.benchmark.loaded = loaded.benchmark;
      state.tables = { ...loaded.tables };
      state.files = { ...loaded.files };
      state.assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE;
      state.assumptionProfileModified = false;
      state.topology = loaded.topology;
      state.topologyInput = {
        format: 'PARSED_EXCHANGE',
        data: loaded.topology,
        sourceFileName: loaded.topology.sourceFileName,
      };
      execution.clearReadiness();
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  async function loadFile(target, file) {
    execution.clearReadiness();
    deactivateFlareNetworkGeneration();
    state.error = null;
    try {
      if (target === 'topology') {
        state.files.topology = { name: file.name, kind: 'Complete five-sheet XLSX' };
        state.topology = null;
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
    if (state.flareNetworkActive) deactivateFlareNetworkGeneration();
    markBenchmarkModified();
    execution.clearReadiness();
    state.error = null;
    render();
  }

  function effectiveRelationshipTable() {
    return state.assumptionResolution?.tables?.relationships ?? state.tables.relationships;
  }

  function createCanvasRelationship(input) {
    try {
      if (findAivRelationshipInputRowIndex(effectiveRelationshipTable(), input) >= 0) {
        throw new Error('AIV_INPUT_RELATIONSHIP_DUPLICATE: Relationship already exists for the selected source, assessment and operating case.');
      }
      applyTableMutation('relationships', addAivRelationshipInputRow(state.tables.relationships, input));
      return true;
    } catch (error) {
      state.error = String(error?.message || error);
      render();
      return false;
    }
  }

  function deleteCanvasRelationship(input) {
    try {
      const rowIndex = findAivRelationshipInputRowIndex(effectiveRelationshipTable(), input);
      if (rowIndex < 0) throw new Error('AIV_INPUT_RELATIONSHIP_NOT_FOUND: Selected relationship no longer exists.');
      applyTableMutation('relationships', deleteAivInputRow(state.tables.relationships, rowIndex));
      return true;
    } catch (error) {
      state.error = String(error?.message || error);
      render();
      return false;
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

  function resetAssumptions() {
    state.assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE;
    state.assumptionProfileModified = false;
    execution.clearReadiness();
    state.error = null;
    render();
  }

  function onClick(event) {
    if (event.target.closest('[data-aiv-network-editor]')) return;
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
    if (action === 'check-readiness') execution.checkReadiness();
    if (action === 'run-screening') execution.runScreening();
    if (action === 'export-d23-validation') execution.exportValidatedBenchmark();
    if (action === 'export-screening-result') execution.exportScreeningResult();
    if (action === 'export-eit') execution.exportEit();
    if (action === 'reset-assumptions') resetAssumptions();
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
    if (event.target.closest('[data-aiv-network-editor]')) return;
    const assumptionPath = event.target.dataset.aivAssumption;
    if (assumptionPath) {
      try {
        state.assumptionProfile = updateAivAssumptionProfile(state.assumptionProfile, assumptionPath, event.target.value);
        state.assumptionProfileModified = true;
        execution.clearReadiness();
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
    flareNetworkController.destroy();
    canvasExportController.destroy();
    canvasController.destroy();
    container.removeEventListener('click', onClick);
    container.removeEventListener('change', onChange);
  };
}
