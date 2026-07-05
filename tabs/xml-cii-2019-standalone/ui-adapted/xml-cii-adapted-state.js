import { defaultXmlCii2019SupportConfigJson } from '../xml-cii-standalone-default-config.js';
import { normalizeAdaptedWorkflowPhaseId } from './xml-cii-adapted-phase-registry.js';

export function createDefaultWorkflowOptions() {
  return {
    coordsMode: 'first',
    kgToNewton: true,
    splitCondensedValveFlange: null,
    useRestraintTypeBasedOnJson: true,
    outputMode: 'enriched-only',
    inputXmlOutputMode: 'full-document',
    pointPropertiesBasis: 'auto',
    inputXmlRestraintPolicy: 'replace-with-dtxr-derived-restraints',
    fillSentinelFromLineContext: true,
    normalizePressureCaseNames: true,
    escapeXmlAttributes: true,
  };
}

export function createXmlCiiAdaptedWorkflowState() {
  return {
    activePhaseId: 'regex',
    sourceKind: 'auto',
    sourceFile: null,
    sourceText: '',
    stagedJsonFile: null,
    elementSideLoadText: '',
    supportConfigJson: defaultXmlCii2019SupportConfigJson(),
    masterContext: null,
    importMastersLoading: false,
    importMastersWriteBackStatus: '',
    options: createDefaultWorkflowOptions(),
    running: false,
    result: null,
  };
}

export function updateWorkflowState(state, patch = {}) {
  return {
    ...state,
    ...patch,
    activePhaseId: patch.activePhaseId
      ? normalizeAdaptedWorkflowPhaseId(patch.activePhaseId)
      : state.activePhaseId,
  };
}

export function updateWorkflowOptions(state, optionPatch = {}) {
  return {
    ...state,
    options: {
      ...state.options,
      ...optionPatch,
    },
  };
}

export function clearWorkflowResult(state) {
  return updateWorkflowState(state, { result: null });
}

export function resetWorkflowState() {
  return createXmlCiiAdaptedWorkflowState();
}

function totalMasterRows(masterContext) {
  const counts = masterContext?.rowCounts || {};
  return Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function applyStandaloneImportMastersContext(state, masterContext) {
  const supportConfigJson = masterContext?.supportConfigJson || state.supportConfigJson;
  return updateWorkflowState(state, {
    masterContext,
    supportConfigJson,
    importMastersLoading: false,
    importMastersWriteBackStatus: `Loaded ${totalMasterRows(masterContext)} master rows into standalone config.`,
    result: null,
  });
}
