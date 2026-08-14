import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  resolveAivWorkingTablesWithAssumptions,
} from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { buildAivBlockedResultSet } from '../converters/vibration/aiv/aiv-result-contracts.js';
import { addAivInputRow, serializeAivInputTable } from './vibration-aiv-input-model.js';
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

function screeningReady(state) {
  const counts = state.readinessEnvelope?.readiness?.counts;
  return Boolean(counts && counts.notReady === 0 && counts.methodGap === 0);
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
    flareNetwork: state.flareNetworkActive ? state.flareNetwork : null,
    generatedInputSet: state.flareNetworkActive ? state.generatedInputSet : null,
    eitImportEvidence: state.eitImport?.evidence ?? null,
  };
}

export function createAivExecutionActions({ state, render, downloadText }) {
  function clearReadiness() {
    state.readinessEnvelope = null;
    state.resultSet = null;
    state.screeningResult = null;
    state.selectedRowKey = null;
    state.assumptionResolution = null;
  }

  async function checkReadiness() {
    if (state.busy || !state.topologyInput) return;
    state.busy = true;
    state.error = null;
    state.screeningResult = null;
    render();
    try {
      const { AIV_TOPOLOGY_INPUT_FORMAT, buildAivReadinessFromTables } = await import(
        '../converters/vibration/aiv/aiv-readiness-tables.js?v=aiv-readiness-6'
      );
      if (state.destroyed) return;
      const tables = ensureAssumableRows(state);
      state.assumptionResolution = resolveAivWorkingTablesWithAssumptions(tables, state.assumptionProfile);
      state.readinessEnvelope = buildAivReadinessFromTables({
        topology: {
          format: topologyFormat(state, AIV_TOPOLOGY_INPUT_FORMAT),
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
      clearReadiness();
      state.error = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function runScreening() {
    if (state.busy || !screeningReady(state)) return;
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
        options: { qualificationMode: 'screening', includeEvidence: true },
      });
      if (!result.ok) {
        const message = result.errors?.map((item) => `${item.code}: ${item.message}`).join('; ')
          || 'AIV screening calculation failed.';
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
    const { buildAivScreeningExportPackage } = await import('../converters/vibration/aiv/aiv-screening-export.js?v=aiv-screening-export-2');
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
      const { serializeAivEitExport } = await import('../converters/vibration/aiv/aiv-eit-export.js?v=aiv-eit-export-2');
      const title = state.eitImport?.title || (state.flareNetworkActive
        ? (state.flareNetwork?.networkId || 'AIV Flare Network')
        : (state.topologyInput?.sourceFileName || 'AIV Screening Export'));
      const text = serializeAivEitExport({ screeningPackage, title });
      downloadText(text, 'aiv-screening-result.eit', 'application/json;charset=utf-8');
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
