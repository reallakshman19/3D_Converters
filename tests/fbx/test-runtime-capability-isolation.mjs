import assert from 'node:assert/strict';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { convertFbxToStagedJson } from '../../tabs/model-converters/converters/fbx/conversion.js';
import { buildFbxFeatureReport } from '../../tabs/model-converters/converters/fbx/feature-report.js';
import { observeSource } from '../../tabs/model-converters/converters/fbx/mapping-package.js';
import { parseFbxBytesNode } from '../../tabs/model-converters/converters/fbx/parser-node.js';
import { benchmarkFbxRuntime } from '../../tabs/model-converters/converters/fbx/runtime-benchmark.js';
import { sha256Hex } from '../../tabs/model-converters/converters/fbx/sha256.js';
import { promoteNoMappingJsonOutput } from '../../tabs/model-converters/converters/fbx-to-stagedjson.js';
import { fixtureBytes } from './helpers.mjs';
import { repositoryParserEvidence, twoPipePackage } from './mapping-package-helpers.mjs';

const FORBIDDEN = new Set([
  'runtimeEnvironment','runConfiguration','runs','aggregate','durationMs','timestamp','timestamps',
  'workerMode','inputByteLength','progressStages','stageTimingsMs','workerCreated','workerTerminated',
  'terminalCode','hardwareConcurrency','crossOriginIsolated','userAgent','runtimeVersion','platform','architecture',
]);
function assertIsolated(value, path = '$') {
  if (Array.isArray(value)) { value.forEach((item,index)=>assertIsolated(item,`${path}[${index}]`)); return; }
  if (!value || typeof value !== 'object') return;
  for (const [key,child] of Object.entries(value)) {
    assert.ok(!FORBIDDEN.has(key), `${path}.${key} is runtime-only`); assertIsolated(child,`${path}.${key}`);
  }
}
function outputArtifacts(prefix, result) {
  return Object.fromEntries(result.outputs.map((output)=>[`${prefix}/${output.name}`,output.text]));
}
async function semanticArtifacts(bytes, parserIdentity, packageValue) {
  const graph = await parseFbxBytesNode(bytes);
  const sourceIdentity = await observeSource(bytes);
  const featureReport = buildFbxFeatureReport({ graph, sourceIdentity, parserIdentity });
  const base = { bytes, inputName:'two-pipes.fbx', parserEvidence:parserIdentity, parserEvidenceError:null, mappingError:null, parse:async()=>graph };
  const noMapping = await convertFbxToStagedJson({ ...base, mapping:null });
  const promoted = promoteNoMappingJsonOutput(noMapping,'two-pipes.fbx');
  const packaged = await convertFbxToStagedJson({ ...base, mapping:packageValue });
  return { 'source/FbxSourceGraph.v2.json':canonicalJson(graph), 'source/FbxFeatureReport.v1.json':canonicalJson(featureReport),
    ...outputArtifacts('no-mapping',noMapping), ...outputArtifacts('promoted',promoted), ...outputArtifacts('package',packaged) };
}
async function artifactDigests(artifacts) {
  return Object.fromEntries(await Promise.all(Object.entries(artifacts).sort().map(async([name,bytes])=>[name,await sha256Hex(bytes)])));
}

const bytes = await fixtureBytes();
const parserIdentity = await repositoryParserEvidence();
const packageValue = (await twoPipePackage()).packageValue;
const before = await semanticArtifacts(bytes,parserIdentity,packageValue);
for (const [name,text] of Object.entries(before)) {
  assert.doesNotMatch(text,/FbxRuntimeBenchmark\.v1/,`${name} contains benchmark schema`);
  assertIsolated(JSON.parse(text));
}
const baselineDigests = await artifactDigests(before);
let clock = 0;
const environment = { runtimeKind:'node', runtimeVersion:{status:'available',value:'test'}, platform:{status:'available',value:'test'},
  architecture:{status:'available',value:'test'}, userAgent:{status:'unavailable',reason:'TEST_UNAVAILABLE'},
  hardwareConcurrency:{status:'unavailable',reason:'TEST_UNAVAILABLE'}, crossOriginIsolated:{status:'unavailable',reason:'TEST_UNAVAILABLE'} };
const benchmark = await benchmarkFbxRuntime({ sourceBytes:bytes, parserDigest:parserIdentity.wasmSha256, runtimeEnvironment:environment,
  runConfiguration:{operation:'PARSE_SOURCE_GRAPH',warmupRuns:0,measuredRuns:2,timeoutMs:null}, now:()=>clock++,
  execute:async()=>({semanticArtifacts:await semanticArtifacts(bytes,parserIdentity,packageValue)}) });
assert.deepEqual(benchmark.semanticArtifactDigests,baselineDigests);
const after = await semanticArtifacts(bytes,parserIdentity,packageValue);
assert.deepEqual(await artifactDigests(after),baselineDigests);
assert.notEqual(benchmark.schema,'FbxFeatureReport.v1');
assert.equal(benchmark.schema,'FbxRuntimeBenchmark.v1');
console.log('test-runtime-capability-isolation: PASS');
