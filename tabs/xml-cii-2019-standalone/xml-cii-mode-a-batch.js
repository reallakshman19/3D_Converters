import * as core from './xml-cii-mode-a-batch-core.js';
export * from './xml-cii-mode-a-batch-core.js';
const DUPLICATE_CODES = new Set(['DUPLICATE_NODE_WITHIN_BRANCH','DUPLICATE_BRANCH_NAME_WITHIN_FILE','DUPLICATE_BRANCH_ACROSS_FILES','DUPLICATE_NODE_ACROSS_FILES']);
export function buildModeAPreflight(batch = {}) {
  const report = core.buildModeAPreflight(batch);
  const blockingRows = (report.blockingRows || []).filter((row) => !DUPLICATE_CODES.has(row.code));
  const warnings = (report.warnings || []).filter((row) => !DUPLICATE_CODES.has(row.code));
  return { ...report, ready: blockingRows.length === 0, blockingRows, warnings, duplicateBranchesAcrossFiles: [], duplicateNodesAcrossFiles: [], duplicateValidation: 'disabled-mode-a' };
}
export function buildModeABatchManifest(batch = {}, resultRows = []) {
  const manifest = core.buildModeABatchManifest(batch, resultRows);
  return { ...manifest, duplicateBranchesAcrossFiles: [], duplicateNodesAcrossFiles: [], duplicateValidation: 'disabled-mode-a' };
}
