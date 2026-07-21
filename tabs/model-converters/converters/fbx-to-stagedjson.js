import { convertFbxToStagedJson } from './fbx/conversion.js';
import { parseFbxInWorker } from './fbx/parser-client.js';

function findInput(context, role) {
  return context.inputFiles?.find((file) => file.role === role);
}

function parseMapping(file) {
  if (!file) return null;
  const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function run(context = {}) {
  const primary = findInput(context, 'primary');
  if (!primary?.bytes) throw new Error('FBX input is required.');
  const secondary = findInput(context, 'secondary');
  context.setStatus?.('Parsing binary FBX in isolated worker...', 'running');
  const result = await convertFbxToStagedJson({
    bytes: primary.bytes,
    inputName: primary.name,
    mapping: parseMapping(secondary),
    parse: (bytes) => parseFbxInWorker(bytes, { signal: context.signal }),
  });
  const state = result.conversionStatus === 'STAGEDJSON_PASS' ? 'ok' : 'warning';
  context.setStatus?.(result.conversionStatus, state);
  return result;
}
