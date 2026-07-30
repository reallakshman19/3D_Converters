const STAGEDJSON_PASS = 'STAGEDJSON_PASS';
const STAGE_FILE_PATTERN = /\.staged\.json$/i;

function cloneBranches(value) {
  return value.map((branch) => structuredClone(branch));
}

function validBranch(branch) {
  return branch && typeof branch === 'object' && !Array.isArray(branch)
    && Array.isArray(branch.children);
}

function parseStageOutput(output) {
  if (!output || typeof output.text !== 'string') return null;
  try {
    const parsed = JSON.parse(output.text);
    return Array.isArray(parsed) && parsed.every(validBranch) ? cloneBranches(parsed) : null;
  } catch {
    return null;
  }
}

function mappedStageOutput(result) {
  if (result?.conversionStatus !== STAGEDJSON_PASS) return null;
  const outputs = Array.isArray(result.outputs) ? result.outputs : [];
  return outputs.find((output) => STAGE_FILE_PATTERN.test(String(output?.name || ''))) || null;
}

export function extractMappedStagedBranches(result) {
  const output = mappedStageOutput(result);
  if (!output) {
    return Object.freeze({
      status: result?.conversionStatus === STAGEDJSON_PASS
        ? 'MAPPED_STAGE_OUTPUT_MISSING' : 'MAPPED_STAGE_NOT_AVAILABLE',
      outputName: null,
      stagedBranches: null,
    });
  }
  const stagedBranches = parseStageOutput(output);
  if (!stagedBranches) {
    return Object.freeze({
      status: 'MAPPED_STAGE_OUTPUT_INVALID',
      outputName: String(output.name || ''),
      stagedBranches: null,
    });
  }
  return Object.freeze({
    status: 'MAPPED_STAGE_AVAILABLE',
    outputName: String(output.name || ''),
    stagedBranches: Object.freeze(stagedBranches),
  });
}

export function mappedStageStatusText(status) {
  if (status === 'MAPPED_STAGE_AVAILABLE') {
    return 'Approved mapped StagedJSON is available for selected-zone component evidence review.';
  }
  if (status === 'MAPPED_STAGE_OUTPUT_INVALID') {
    return 'Mapped StagedJSON output is invalid; selected-zone component review is blocked.';
  }
  if (status === 'MAPPED_STAGE_OUTPUT_MISSING') {
    return 'The mapping run passed but did not publish StagedJSON; selected-zone component review is blocked.';
  }
  return 'Run FBX conversion with an approved mapping package to enable selected-zone component review.';
}
