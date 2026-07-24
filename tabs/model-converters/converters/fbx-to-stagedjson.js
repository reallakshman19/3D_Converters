import { convertFbxToStagedJson } from './fbx/conversion.js';
import { parseFbxInWorker } from './fbx/parser-client.js';
import { loadBrowserParserEvidence } from './fbx/parser-provenance.js';

function findInput(context, role) {
  return context.inputFiles?.find((file) => file.role === role);
}

function parseMapping(file) {
  if (!file) return { mapping: null, mappingError: null };
  try {
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
    return { mapping: JSON.parse(new TextDecoder().decode(bytes)), mappingError: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { mapping: null, mappingError: `Invalid mapping JSON: ${detail}` };
  }
}

// Always load parser evidence — needed for worklist generation (no manifest path)
// and for decision-set compilation (decision set path), not only for mapping packages.
async function loadParserEvidence() {
  try {
    return { parserEvidence: await loadBrowserParserEvidence() };
  } catch (error) {
    const parserEvidenceError = error instanceof Error ? error.message : String(error);
    return { parserEvidenceError };
  }
}

export async function run(context = {}) {
  const primary = findInput(context, 'primary');
  if (!primary?.bytes) throw new Error('FBX input is required.');
  const secondary = findInput(context, 'secondary');
  const mappingInput = parseMapping(secondary);
  const binding = await loadParserEvidence();
  context.setStatus?.('Parsing binary FBX in isolated worker...', 'running');
  const result = await convertFbxToStagedJson({
    bytes: primary.bytes,
    inputName: primary.name,
    ...mappingInput,
    ...binding,
    parse: (bytes) => parseFbxInWorker(bytes, { signal: context.signal }),
  });
  const state = result.conversionStatus === 'STAGEDJSON_PASS' ? 'ok' : 'warning';
  context.setStatus?.(result.conversionStatus, state);
  return result;
}
