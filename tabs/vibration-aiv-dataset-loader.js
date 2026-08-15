import { AIV_DEFAULT_ASSUMPTION_PROFILE } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { parseAivInputCsv } from './vibration-aiv-input-model.js';
import { buildLoadedAivD23Benchmark } from './vibration-aiv-benchmarks.js';
import { importAivEitFileIntoState } from './vibration-aiv-eit-import-controller.js';
import { projectAivFlareNetworkIntoWorkspace } from './vibration-aiv-flare-network-state.js';
import { isAivInputRevisionCurrent, touchAivInputRevision } from './vibration-aiv-state-revision.js';

function formatError(error) {
  return `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
}

export function createAivDatasetLoader({
  state,
  render,
  clearReadiness,
  clearMasterResolution,
  deactivateFlareNetworkGeneration,
  onDatasetLoaded = null,
}) {
  let loadToken = 0;

  function markBenchmarkModified() {
    if (!state.benchmark.loaded || state.benchmark.loaded.modified) return;
    state.benchmark.loaded = Object.freeze({ ...state.benchmark.loaded, modified: true });
  }

  function notifyLoaded() {
    if (typeof onDatasetLoaded === 'function') onDatasetLoaded();
  }

  function beginDatasetChange() {
    loadToken += 1;
    clearReadiness();
    return { token: loadToken, revision: touchAivInputRevision(state) };
  }

  function current(operation) {
    return operation.token === loadToken && isAivInputRevisionCurrent(state, operation.revision);
  }

  function applyFlareNetwork(network) {
    const operation = beginDatasetChange();
    try {
      const projected = projectAivFlareNetworkIntoWorkspace(network);
      if (!current(operation)) return;
      clearMasterResolution();
      state.flareNetwork = projected.flareNetwork;
      state.generatedInputSet = projected.generatedInputSet;
      state.tables = projected.tables;
      state.topology = projected.topology;
      state.topologyInput = projected.topologyInput;
      state.files = { eit: null, ...projected.files };
      state.eitImport = null;
      state.flareNetworkActive = true;
      state.benchmark.loaded = null;
      state.error = null;
      notifyLoaded();
    } catch (error) {
      if (current(operation)) state.error = formatError(error);
    }
    render();
  }

  function loadBenchmark() {
    const operation = beginDatasetChange();
    try {
      const loaded = buildLoadedAivD23Benchmark();
      if (!current(operation)) return;
      clearMasterResolution();
      deactivateFlareNetworkGeneration();
      state.eitImport = null;
      state.benchmark.loaded = loaded.benchmark;
      state.tables = { ...loaded.tables };
      state.files = { eit: null, ...loaded.files };
      state.assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE;
      state.assumptionProfileModified = false;
      state.topology = loaded.topology;
      state.topologyInput = {
        format: 'PARSED_EXCHANGE', data: loaded.topology,
        sourceFileName: loaded.topology.sourceFileName,
      };
      state.error = null;
      notifyLoaded();
    } catch (error) {
      if (current(operation)) state.error = formatError(error);
    }
    render();
  }

  async function loadTopology(file, operation) {
    const data = await file.arrayBuffer();
    if (!current(operation)) return false;
    state.eitImport = null;
    state.files.eit = null;
    state.files.topology = { name: file.name, kind: 'Complete five-sheet XLSX' };
    state.topology = null;
    state.topologyInput = { format: 'XLSX', data, sourceFileName: file.name };
    return true;
  }

  async function loadCsv(target, file, operation) {
    const text = await file.text();
    if (!current(operation)) return false;
    const table = parseAivInputCsv(target, text, { sourceName: file.name, sourceKind: 'CSV' });
    if (!current(operation)) return false;
    state.eitImport = null;
    state.files.eit = null;
    state.tables[target] = table;
    state.files[target] = { name: file.name, kind: table.contract };
    return true;
  }

  async function loadFile(target, file) {
    const operation = beginDatasetChange();
    clearMasterResolution();
    deactivateFlareNetworkGeneration();
    state.error = null;
    try {
      let committed;
      if (target === 'eit') committed = Boolean(await importAivEitFileIntoState(
        state, file, clearReadiness, () => current(operation),
      ));
      else if (target === 'topology') committed = await loadTopology(file, operation);
      else committed = await loadCsv(target, file, operation);
      if (!committed || !current(operation)) return;
      markBenchmarkModified();
      notifyLoaded();
    } catch (error) {
      if (current(operation)) state.error = formatError(error);
    }
    if (current(operation)) render();
  }

  return Object.freeze({ applyFlareNetwork, loadBenchmark, loadFile, markBenchmarkModified });
}
