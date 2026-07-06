import { defaultXmlCii2019SupportConfigJson } from '../xml-cii-standalone-default-config.js';
import { createDefaultRegexTesterConfig } from '../xml-cii-regex-tester.js';
import { createDefaultResolverJsonTraceConfig } from '../xml-cii-resolver-json-trace.js';
import { createDefaultManualElementSideloadConfig } from '../xml-cii-manual-element-sideload.js';
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
    regexTesterConfig: createDefaultRegexTesterConfig(),
    regexTesterResult: null,
    regexTesterRunning: false,
    regexTesterWriteBackStatus: '',
    resolverJsonTraceConfig: createDefaultResolverJsonTraceConfig(),
    resolverJsonTraceResult: null,
    resolverJsonTraceRunning: false,
    resolverJsonTraceWriteBackStatus: '',
    manualElementSideloadConfig: createDefaultManualElementSideloadConfig(),
    manualElementSideloadResult: null,
    manualElementSideloadRunning: false,
    manualElementSideloadWriteBackStatus: '',
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
  return { ...state, options: { ...state.options, ...optionPatch } };
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
  return updateWorkflowState(state, {
    masterContext,
    supportConfigJson: masterContext?.supportConfigJson || state.supportConfigJson,
    importMastersLoading: false,
    importMastersWriteBackStatus: `Loaded ${totalMasterRows(masterContext)} master rows into standalone config.`,
    result: null,
  });
}

function nestedRuleKey(field) {
  return {
    'regex-line-key-regex': ['lineKey', 'regex'],
    'regex-line-key-group': ['lineKey', 'group'],
    'regex-line-key-token': ['lineKey', 'tokenPosition'],
    'regex-piping-class-regex': ['pipingClass', 'regex'],
    'regex-piping-class-group': ['pipingClass', 'group'],
    'regex-piping-class-token': ['pipingClass', 'tokenPosition'],
    'regex-rating-regex': ['rating', 'regex'],
    'regex-rating-group': ['rating', 'group'],
    'regex-rating-token': ['rating', 'tokenPosition'],
    'regex-bore-regex': ['bore', 'regex'],
    'regex-bore-group': ['bore', 'group'],
    'regex-bore-token': ['bore', 'tokenPosition'],
  }[field] || null;
}

function numericRuleValue(key, value) {
  return ['group', 'tokenPosition'].includes(key) ? Number(value || 0) : value;
}

export function updateRegexTesterConfig(state, field, value) {
  if (field === 'regex-token-delimiter') return updateWorkflowState(state, { regexTesterConfig: { ...state.regexTesterConfig, tokenDelimiter: value } });
  const path = nestedRuleKey(field);
  if (!path) return state;
  const [ruleName, key] = path;
  const rule = { ...(state.regexTesterConfig?.[ruleName] || {}) };
  rule[key] = numericRuleValue(key, value);
  return updateWorkflowState(state, { regexTesterConfig: { ...state.regexTesterConfig, [ruleName]: rule } });
}

export function applyStandaloneRegexTesterResult(state, regexTesterResult) {
  return updateWorkflowState(state, {
    regexTesterResult,
    regexTesterRunning: false,
    regexTesterWriteBackStatus: 'Regex rules saved into standalone config.',
    supportConfigJson: regexTesterResult?.supportConfigJson || state.supportConfigJson,
    result: null,
  });
}

export function updateResolverJsonTraceConfig(state, value) {
  try {
    return updateWorkflowState(state, { resolverJsonTraceConfig: JSON.parse(String(value || '{}')) });
  } catch {
    return updateWorkflowState(state, { resolverJsonTraceWriteBackStatus: 'Resolver config JSON is invalid.' });
  }
}

export function applyStandaloneResolverJsonTraceResult(state, resolverJsonTraceResult) {
  return updateWorkflowState(state, {
    resolverJsonTraceResult,
    resolverJsonTraceRunning: false,
    resolverJsonTraceWriteBackStatus: 'Resolver config saved into standalone config.',
    supportConfigJson: resolverJsonTraceResult?.supportConfigJson || state.supportConfigJson,
    result: null,
  });
}

export function updateManualElementSideloadConfig(state, field, value) {
  const cfg = { ...state.manualElementSideloadConfig };
  if (field === 'manual-policy') cfg.policy = value;
  if (field === 'manual-tolerance') cfg.tolerance = Number(value || 0);
  if (field === 'manual-restraints-text') cfg.manualText = value;
  return updateWorkflowState(state, { manualElementSideloadConfig: cfg });
}

export function applyStandaloneManualElementSideloadResult(state, manualElementSideloadResult) {
  return updateWorkflowState(state, {
    manualElementSideloadResult,
    manualElementSideloadRunning: false,
    manualElementSideloadWriteBackStatus: 'Manual / side-load options saved into standalone config.',
    supportConfigJson: manualElementSideloadResult?.supportConfigJson || state.supportConfigJson,
    result: null,
  });
}
