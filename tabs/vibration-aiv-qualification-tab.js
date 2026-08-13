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
  addAivRelationshipInputRow,
  createEmptyAivInputTable,
  deleteAivInputRow,
  findAivRelationshipInputRowIndex,
  parseAivInputCsv,
  serializeAivInputTable,
  updateAivInputCell,
} from './vibration-aiv-input-model.js';
import { buildLoadedAivD23Benchmark } from './vibration-aiv-benchmarks.js';
import { createAivCanvasInteractionController } from './vibration-aiv-canvas-controller.js';
import { createAivCanvasExportController } from './vibration-aiv-canvas-export-controller.js';
import { createAivFlareNetworkAuthoringController } from './vibration-aiv-flare-network-controller.js';
import {
  createEmptyAivFlareNetworkWorkspace,
  projectAivFlareNetworkIntoWorkspace,
} from './vibration-aiv-flare-network-state.js';
import { renderAivQualificationWorkspaceHtml } from './vibration-aiv-qualification-view.js';
import { buildAivD23ValidatedExportPackage } from './vibration-aiv-validation-records.js';

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

function initialState() {
  return {
    files: { topology: null, sources: null, assessments: null, relationships: null },
    topologyInput: null,
    topology: null,
    tables: {
      sources: createEmptyAivInputTable('sources'),
      assessments: createEmptyAivInputTable('assessments'),
      relationships: createEmptyAivInputTable('relationships'),
    },
    flareNetwork: createEmptyAivFlareNetworkWorkspace(),
    flareNetworkActive: false,
    generatedInputSet: null,
    benchmark: { loaded: null },
    assumptionProfile: AIV_DEFAULT_ASSUMPTION_PROFILE,
    assumptionProfileModified: false,
    assumptionResolution: null,
    readinessEnvelope: null,
    resultSet: null,
    screeningResult: null,
    selectedRowKey: null,
    busy: false,
    error: null,
    destroyed: false,
  };
}

export function renderAivQualificationWorkspace(container) {
  ensureStylesheet();
  const state = initialState();
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

  function render() {
    if (state.destroyed) return;
    container.innerHTML = renderAivQualificationWorkspaceHtml(state);
    canvasController.sync();
    canvasExportController.sync();
  }

  function clearReadiness() {
    state.readinessEnvelope = null;
    state.resultSet = null;
    state.screeningResult = null;
    state.selectedRowKey = null;
    state.assumptionResolution = null;
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
      clearReadiness();
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
      clearReadiness();
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    }
    render();
  }

  async function loadFile(target, file) {
    clearReadiness();
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
    clearReadiness();
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

  function screeningReady() {
    const counts = state.readinessEnvelope?.readiness?.counts;
    return Boolean(counts && counts.notReady === 0 && counts.methodGap === 0);
  }

  function topologyFormat(AIV_TOPOLOGY_INPUT_FORMAT) {
    if (state.topologyInput.format === 'FLARE_NETWORK') return AIV_TOPOLOGY_INPUT_FORMAT.FLARE_NETWORK;
    if (state.topologyInput.format === 'PARSED_EXCHANGE') return AIV_TOPOLOGY_INPUT_FORMAT.PARSED_EXCHANGE;
    return AIV_TOPOLOGY_INPUT_FORMAT.XLSX;
  }

  async function checkReadiness() {
    if (state.busy || !readinessInputAvailable()) return;
    state.busy = true;
    state.error = null;
    state.screeningResult = null;
    render();
    try {
      const { AIV_TOPOLOGY_INPUT_FORMAT, buildAivReadinessFromTables } = await import(
        '../converters/vibration/aiv/aiv-readiness-tables.js?v=aiv-readiness-6'
      );
      if (state.destroyed) return;
      const assumableTables = ensureAssumableRows(state.tables);
      state.assumptionResolution = resolveAivWorkingTablesWithAssumptions(
        assumableTables,
        state.assumptionProfile,
      );
      state.readinessEnvelope = buildAivReadinessFromTables({
        topology: {
          format: topologyFormat(AIV_TOPOLOGY_INPUT_FORMAT),
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
      state.screeningResult = null;
      state.selectedRowKey = null;
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function runScreening() {
    if (state.busy || !screeningReady()) return;
    state.busy = true;
    state.error = null;
    render();
    try {
      const { calculateEngineering } = await import('../converters/engineering-calculations/index.js?v=aiv-screening-1');
      if (state.destroyed) return;
      const envelope = state.readinessEnvelope;
      const result = calculateEngineering({
        calculationId: 'VIB.AIV.ACOUSTIC',
        inputs: {
          sources: envelope.sources,
          assessments: envelope.assessments,
          relationships: envelope.sourceAssessments,
          topology: envelope.exchange,
          assumptionProfile: state.assumptionProfile,
        },
        options: {
          qualificationMode: 'screening',
          includeEvidence: true,
        },
      });
      if (!result.ok) {
        const message = result.errors?.map((item) => `${item.code}: ${item.message}`).join('; ') || 'AIV screening calculation failed.';
        throw new Error(message);
      }
      state.screeningResult = result;
    } catch (error) {
      if (!state.destroyed) {
        state.screeningResult = null;
        state.error = String(error?.message || error);
      }
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
    downloadText(`${JSON.stringify(payload, null, 2)}\n`, 'aiv-d23-validated-benchmark-package.json', 'application/json;charset=utf-8');
  }

  async function exportScreeningResult() {
    if (!state.screeningResult?.ok || !state.readinessEnvelope) return;
    const { buildAivScreeningExportPackage } = await import('../converters/vibration/aiv/aiv-screening-export.js?v=aiv-screening-export-1');
    const payload = buildAivScreeningExportPackage({
      result: state.screeningResult.evidence.domainResult,
      sources: state.readinessEnvelope.sources,
      assessments: state.readinessEnvelope.assessments,
      relationships: state.readinessEnvelope.sourceAssessments,
      topology: state.readinessEnvelope.exchange,
      assumptionProfile: state.assumptionProfile,
      assumptionResolution: state.assumptionResolution,
    });
    downloadText(`${JSON.stringify(payload, null, 2)}\n`, 'aiv-screening-result.json', 'application/json;charset=utf-8');
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
    if (action === 'check-readiness') checkReadiness();
    if (action === 'run-screening') runScreening();
    if (action === 'export-d23-validation') exportValidatedBenchmark();
    if (action === 'export-screening-result') exportScreeningResult();
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
    if (event.target.closest('[data-aiv-network-editor]')) return;
    const assumptionPath = event.target.dataset.aivAssumption;
    if (assumptionPath) {
      try {
        state.assumptionProfile = updateAivAssumptionProfile(state.assumptionProfile, assumptionPath, event.target.value);
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
    flareNetworkController.destroy();
    canvasExportController.destroy();
    canvasController.destroy();
    container.removeEventListener('click', onClick);
    container.removeEventListener('change', onChange);
  };
}
