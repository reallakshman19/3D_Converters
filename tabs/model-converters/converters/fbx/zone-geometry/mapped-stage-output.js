const STAGEDJSON_PASS = 'STAGEDJSON_PASS';
const STAGE_FILE_PATTERN = /\.staged\.json$/i;
const ENGINEERING_FILE_PATTERN = /\.FbxEngineeringAttributeLedger\.v1\.json$/i;

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

function outputByPattern(result, pattern) {
  if (result?.conversionStatus !== STAGEDJSON_PASS) return null;
  const outputs = Array.isArray(result.outputs) ? result.outputs : [];
  return outputs.find((output) => pattern.test(String(output?.name || ''))) || null;
}

function parseEngineeringOutput(output) {
  if (!output || typeof output.text !== 'string') return null;
  try {
    const parsed = JSON.parse(output.text);
    return parsed?.schema === 'FbxEngineeringAttributeLedger.v1'
      && parsed.status === 'PASS' ? structuredClone(parsed) : null;
  } catch {
    return null;
  }
}

export function extractMappedStagedBranches(result) {
  const output = outputByPattern(result, STAGE_FILE_PATTERN);
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

export function extractMappedEngineeringAttributeLedger(result) {
  const output = outputByPattern(result, ENGINEERING_FILE_PATTERN);
  if (!output) {
    return Object.freeze({
      status: result?.conversionStatus === STAGEDJSON_PASS
        ? 'ENGINEERING_ATTRIBUTE_LEDGER_MISSING' : 'ENGINEERING_ATTRIBUTE_LEDGER_NOT_AVAILABLE',
      outputName: null,
      ledger: null,
    });
  }
  const ledger = parseEngineeringOutput(output);
  if (!ledger) {
    return Object.freeze({
      status: 'ENGINEERING_ATTRIBUTE_LEDGER_INVALID',
      outputName: String(output.name || ''),
      ledger: null,
    });
  }
  return Object.freeze({
    status: 'ENGINEERING_ATTRIBUTE_LEDGER_AVAILABLE',
    outputName: String(output.name || ''),
    ledger: Object.freeze(ledger),
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
