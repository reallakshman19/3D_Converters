import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  resolveAivWorkingTablesWithAssumptions,
} from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { buildAivBlockedResultSet } from '../converters/vibration/aiv/aiv-result-contracts.js';
import { addAivInputRow, serializeAivInputTable } from './vibration-aiv-input-model.js';
import { isAivScreeningReady } from './vibration-aiv-screening-gate.js';
import { buildAivEngineeringScreeningRequest } from './vibration-aiv-screening-request.js';
import { currentAivInputRevision, isAivInputRevisionCurrent } from './vibration-aiv-state-revision.js';
import { buildAivD23ValidatedExportPackage } from './vibration-aiv-validation-records.js';

function ensureAssumableRows(state) {
  if (state.flareNetworkActive) return state.tables;
  return {
    sources: state.tables.sources.rows.length ? state.tables.sources : addAivInputRow(state.tables.sources),
    assessments: state.tables.assessments.rows.length ? state.tables.assessments : addAivInputRow(state.tables.assessments),
    relationships: state.tables.relationships.rows.length ? state.tables.relationships : addAivInputRow(state.tables.relationships),
  };
}

function topologyFormat(state, formats) {
  if (state.topologyInput.format === 'FLARE_NETWORK') return formats.FLARE_NETWORK;
  if (state.topologyInput.format === 'PARSED_EXCHANGE') return formats.PARSED_EXCHANGE;
  return formats.XLSX;
}

function screeningPackageInput(state) {
  return {
    result: state.screeningResult.evidence.domainResult,
    sources: state.readinessEnvelope.sources,
    assessments: state.readinessEnvelope.assessments,
    relationships: state.readinessEnvelope.sourceAssessments,
    topology: state.readinessEnvelope.exchange,
    assumptionProfile: state.assumptionProfile,
    assumptionResolution: state.assumptionResolution,
    masterResolution: state.masterResolution,
    flareNetwork: state.flareNetworkActive ? state.flareNetwork : null,
    generatedInputSet: state.flareNetworkActive ? state.generatedInputSet : null,
    eitImportEvidence: state.eitImport?.evidence ?? null,
  };
}

function buildReadiness(state, formats, builder) {
  const tables = ensureAssumableRows(state);
  const assumptionResolution = resolveAivWorkingTablesWithAssumptions(tables, state.assumptionProfile);
  const readinessEnvelope = builder({
    topology: {
      format: topologyFormat(state, formats),
      data: state.topologyInput.data,
      sourceFileName: state.topologyInput.sourceFileName,
    },
    sourceCsv: serializeAivInputTable(assumptionResolution.tables.sources),
    assessmentCsv: serializeAivInputTable(assumptionResolution.tables.assessments),
    sourceAssessmentCsv: serializeAivInputTable(assumptionResolution.tables.relationships),
  });
  return { assumptionResolution, readinessEnvelope };
}

function commitReadiness(state, prepared) {
  state.assumptionResolution = prepared.assumptionResolution;
  state.readinessEnvelope = Object.freeze({
    ...prepared.readinessEnvelope,
    assumptionResolution: state.assumptionResolution,
  });
  state.resultSet = buildAivBlockedResultSet(state.readinessEnvelope);
  state.selectedRowKey = state.readinessEnvelope.readiness.rows[0]?.rowKey ?? null;
}

export function createAivExecutionActions({ state, render, downloadText }) {
  function clearReadiness() {
    state.readinessEnvelope = null;
    state.resultSet = null;
    state.screeningResult = null;
    state.selectedRowKey = null;
    state.assumptionResolution = null;
    state.assumptionAcceptance = null;
  }

  async function checkReadiness() {
    if (state.busy || !state.topologyInput) return;
    const revision = currentAivInputRevision(state);
    state.busy = true;
    state.error = null;
    state.screeningResult = null;
    render();
    try {
      const module = await import('../converters/vibration/aiv/aiv-readiness-tables.js?v=aiv-readiness-7');
      if (state.destroyed || !isAivInputRevisionCurrent(state, revision)) return;
      commitReadiness(state, buildReadiness(state, module.AIV_TOPOLOGY_INPUT_FORMAT, module.buildAivReadinessFromTables));
    } catch (error) {
      if (state.destroyed || !isAivInputRevisionCurrent(state, revision)) return;
      clearReadiness();
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function runScreening() {
    if (state.busy || !isAivScreeningReady(state)) return;
    const revision = currentAivInputRevision(state);
    const request = buildAivEngineeringScreeningRequest({
      readinessEnvelope: state.readinessEnvelope,
      assumptionProfile: state.assumptionProfile,
    });
    state.busy = true;
    state.error = null;
    render();
    try {
      const { calculateEngineering } = await import('../converters/engineering-calculations/index.js?v=aiv-screening-3');
      if (state.destroyed || !isAivInputRevisionCurrent(state, revision)) return;
      const result = calculateEngineering(request);
      if (!result.ok) throw new Error(result.errors?.map((item) => `${item.code}: ${item.message}`).join('; ') || 'AIV screening calculation failed.');
      state.screeningResult = result;
    } catch (error) {
      if (!state.destroyed && isAivInputRevisionCurrent(state, revision)) {
        state.screeningResult = null;
        state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
      }
    } finally {
      state.busy = false;
      render();
    }
  }

  function exportValidatedBenchmark() {
    if (!state.benchmark.loaded || state.benchmark.loaded.modified || state.assumptionProfileModified) {
      state.error = 'AIV_D23_VALIDATION_NOT_APPLICABLE: Reload the controlled EI D.2.3 benchmark/default assumptions before exporting its validated result package.';
      render();
      return;
    }
    const payload = buildAivD23ValidatedExportPackage({
      assumptionProfile: state.assumptionProfile ?? AIV_DEFAULT_ASSUMPTION_PROFILE,
      benchmarkModified: false,
    });
    downloadText(`${JSON.stringify(payload, null, 2)}\n`, 'aiv-d23-validated-benchmark-package.json', 'application/json;charset=utf-8');
  }

  async function buildScreeningPackage() {
    if (!state.screeningResult?.ok || !state.readinessEnvelope) return null;
    const revision = currentAivInputRevision(state);
    const { buildAivScreeningExportPackage } = await import('../converters/vibration/aiv/aiv-screening-export.js?v=aiv-screening-export-3');
    if (!isAivInputRevisionCurrent(state, revision) || !state.screeningResult?.ok || !state.readinessEnvelope) return null;
    return buildAivScreeningExportPackage(screeningPackageInput(state));
  }

  async function exportScreeningResult() {
    const payload = await buildScreeningPackage();
    if (!payload) return;
    downloadText(`${JSON.stringify(payload, null, 2)}\n`, 'aiv-screening-result.json', 'application/json;charset=utf-8');
  }

  async function exportEit() {
    const screeningPackage = await buildScreeningPackage();
    if (!screeningPackage) return;
    try {
      const { serializeAivEitExport } = await import('../converters/vibration/aiv/aiv-eit-export.js?v=aiv-eit-export-3');
      const title = state.eitImport?.title || (state.flareNetworkActive
        ? (state.flareNetwork?.networkId || 'AIV Flare Network')
        : (state.topologyInput?.sourceFileName || 'AIV Screening Export'));
      downloadText(serializeAivEitExport({ screeningPackage, title }), 'aiv-screening-result.eit', 'application/json;charset=utf-8');
    } catch (error) {
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
      render();
    }
  }

  return Object.freeze({
    clearReadiness,
    checkReadiness,
    runScreening,
    exportValidatedBenchmark,
    exportScreeningResult,
    exportEit,
  });
}
