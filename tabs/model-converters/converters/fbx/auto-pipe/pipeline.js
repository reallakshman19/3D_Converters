import { canonicalJson } from '../canonical-json.js';
import { buildInternalPipeMapping } from './artifact.js';
import { classifySelectedPipes } from './classify.js';
import { executeInternalPipeMapping } from './executor.js';

function blocked(status, classifications, error = null) {
  return Object.freeze({
    status,
    classificationDispositions: classifications,
    internalPipeMapping: null,
    internalPipeMappingJson: null,
    stagedJson: null,
    stagedJsonText: null,
    error: error ? String(error?.message || error) : null,
  });
}

function failureStatus(error) {
  const text = String(error?.message || error || '');
  const statuses = [
    'BLOCKED_AUTO_PIPE_BINDING',
    'BLOCKED_AUTO_PIPE_SCOPE',
    'BLOCKED_AUTO_PIPE_CLASSIFICATION',
    'BLOCKED_AUTO_PIPE_ROLE_ASSIGNMENT',
    'BLOCKED_AUTO_PIPE_CONNECTIVITY',
    'BLOCKED_AUTO_PIPE_RESOURCE',
    'BLOCKED_AUTO_PIPE_CANCELLED',
  ];
  return statuses.find((status) => text.startsWith(status)) || 'BLOCKED_AUTO_PIPE_EXECUTION';
}

export async function runFbxAutoPipe(input) {
  const classifications = classifySelectedPipes(input);
  if (!classifications.length || classifications.some((item) => !item.admitted)) {
    return blocked('BLOCKED_AUTO_PIPE_CLASSIFICATION', classifications);
  }
  try {
    const internalPipeMapping = await buildInternalPipeMapping({
      zoneGeometryEvidence: input.zoneGeometryEvidence,
      derivedPortEvidence: input.derivedPortEvidence,
      classifications,
      classificationProfile: input.classificationProfile,
      connectivityProfile: input.connectivityProfile,
    });
    const execution = executeInternalPipeMapping(internalPipeMapping);
    return Object.freeze({
      status: 'STAGEDJSON_PASS',
      classificationStatus: 'PIPE_INFERENCE_PASS',
      connectivityStatus: 'PIPE_CONNECTIVITY_PASS',
      classificationDispositions: classifications,
      internalPipeMapping,
      internalPipeMappingJson: canonicalJson(internalPipeMapping),
      stagedJson: execution.stagedJson,
      stagedJsonText: canonicalJson(execution.stagedJson),
      counts: Object.freeze({
        admittedPipes: internalPipeMapping.entries.length,
        links: internalPipeMapping.links.length,
        branches: execution.stagedJson.length,
      }),
      error: null,
    });
  } catch (error) {
    return blocked(failureStatus(error), classifications, error);
  }
}
