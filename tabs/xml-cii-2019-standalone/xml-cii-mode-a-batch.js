import * as core from './xml-cii-mode-a-batch-core.js';
export * from './xml-cii-mode-a-batch-core.js';

const DUPLICATE_CODES = new Set([
  'DUPLICATE_NODE_WITHIN_BRANCH',
  'DUPLICATE_BRANCH_NAME_WITHIN_FILE',
  'DUPLICATE_BRANCH_ACROSS_FILES',
  'DUPLICATE_NODE_ACROSS_FILES',
]);

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function parseJson(value) {
  try { return object(JSON.parse(String(value || '{}'))); } catch { return {}; }
}

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return {}; }
}

export function composeModeASupportConfig(sharedJson = '{}', sourceJson = '{}') {
  const shared = clone(parseJson(sharedJson));
  const source = parseJson(sourceJson);

  if (source.overrides && typeof source.overrides === 'object') shared.overrides = clone(source.overrides);

  const branchLineKeyMap = source.linelist?.branchLineKeyMap;
  if (branchLineKeyMap && typeof branchLineKeyMap === 'object' && !Array.isArray(branchLineKeyMap)) {
    shared.linelist = { ...object(shared.linelist), branchLineKeyMap: clone(branchLineKeyMap) };
  }

  const finalizedMatches = source.weight?.finalizedMatches;
  if (Array.isArray(finalizedMatches)) {
    shared.weight = { ...object(shared.weight), finalizedMatches: clone(finalizedMatches) };
  }

  return JSON.stringify(shared, null, 2);
}

export function commonModeASupportConfig(sourceJson = '{}') {
  const config = clone(parseJson(sourceJson));
  delete config.overrides;
  if (config.linelist && typeof config.linelist === 'object') delete config.linelist.branchLineKeyMap;
  if (config.weight && typeof config.weight === 'object') delete config.weight.finalizedMatches;
  return JSON.stringify(config, null, 2);
}

export function buildModeAExecutionState(baseState = {}, source = {}) {
  const next = core.buildModeAExecutionState(baseState, source);
  return {
    ...next,
    supportConfigJson: composeModeASupportConfig(baseState.supportConfigJson || '{}', source.supportConfigJson || '{}'),
  };
}

export function buildModeAPreflight(batch = {}) {
  const report = core.buildModeAPreflight(batch);
  const blockingRows = (report.blockingRows || []).filter((row) => !DUPLICATE_CODES.has(row.code));
  const warnings = (report.warnings || []).filter((row) => !DUPLICATE_CODES.has(row.code));
  return {
    ...report,
    ready: blockingRows.length === 0,
    blockingRows,
    warnings,
    duplicateBranchesAcrossFiles: [],
    duplicateNodesAcrossFiles: [],
    duplicateValidation: 'disabled-mode-a',
  };
}

export function buildModeABatchManifest(batch = {}, resultRows = []) {
  const manifest = core.buildModeABatchManifest(batch, resultRows);
  return {
    ...manifest,
    duplicateBranchesAcrossFiles: [],
    duplicateNodesAcrossFiles: [],
    duplicateValidation: 'disabled-mode-a',
  };
}
