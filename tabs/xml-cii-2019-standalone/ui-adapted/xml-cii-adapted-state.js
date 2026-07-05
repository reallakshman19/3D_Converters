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
