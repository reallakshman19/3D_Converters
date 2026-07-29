import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const files = {
  constants: 'tabs/model-converters/converters/fbx/solid-fitting-ports/constants.js',
  profile: 'tabs/model-converters/converters/fbx/solid-fitting-ports/profile.js',
  analysisTopology: 'tabs/model-converters/converters/fbx/solid-fitting-ports/analysis-topology.js',
  terminalCapBridge: 'tabs/model-converters/converters/fbx/solid-fitting-ports/terminal-cap-bridge.js',
  topologyProjection: 'tabs/model-converters/converters/fbx/solid-fitting-ports/topology-projection.js',
  capClustering: 'tabs/model-converters/converters/fbx/solid-fitting-ports/cap-clustering.js',
  candidateEvaluation: 'tabs/model-converters/converters/fbx/solid-fitting-ports/candidate-evaluation.js',
  disposition: 'tabs/model-converters/converters/fbx/solid-fitting-ports/port-topology-disposition.js',
  evidence: 'tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js',
  sidewallResidual: 'tabs/model-converters/converters/fbx/solid-fitting-ports/sidewall-residual.js',
  classifier: 'tabs/model-converters/converters/fbx/solid-fitting-ports/classifier.js',
  admissionGates: 'tabs/model-converters/converters/fbx/auto-pipe/pipe-admission-gates.js',
  classify: 'tabs/model-converters/converters/fbx/auto-pipe/classify.js',
  analyseZone: 'tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js',
  runAll: 'tests/fbx/run-all.mjs',
};

const text = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, path]) => [
  key, await readFile(new URL(path, root), 'utf8'),
])));

for (const key of Object.keys(files)) {
  const lines = text[key].split('\n');
  assert.ok(lines.length <= 300, `${files[key]} exceeds 300 lines (${lines.length})`);
  assert.doesNotMatch(text[key], /export\s+default|Math\.random|Date\.now|localeCompare|https?:\/\/(?:unpkg|cdn|jsdelivr)/i);
}

// Both inference routes share deterministic role and radius gates. Closed solids
// use a dedicated sidewall residual because cap-centre vertices are not sidewall evidence.
assert.match(text.classifier, /from '\.\.\/auto-pipe\/pipe-admission-gates\.js'/);
assert.match(text.classifier, /from '\.\/sidewall-residual\.js'/);
assert.doesNotMatch(text.classifier, /function\s+assignRoles|function\s+radiusMatches|function\s+cylinderResiduals/);
assert.match(text.sidewallResidual, /decodeExactPolygonTopology/);
assert.match(text.sidewallResidual, /transformPoint/);
assert.doesNotMatch(text.sidewallResidual, /Math\.random|Date\.now|localeCompare/);
assert.match(text.classify, /from '\.\/pipe-admission-gates\.js'/);
assert.doesNotMatch(text.classify, /function\s+assignRoles|function\s+cylinderResiduals/);

// Source topology remains immutable. Recovery is an evidenced analysis projection
// with a 2e-6 base weld and a separately gated 1e-4 detached-cap bridge.
assert.match(text.constants, /FbxSolidFittingPortEvidence\.v3/);
assert.match(text.profile, /FbxSolidFittingPortProfile\.v3/);
assert.match(text.evidence, /buildSolidFittingAnalysisTopology/);
assert.match(text.evidence, /bridgeDetachedTerminalCap/);
assert.match(text.analysisTopology, /POSITION_WELD_AND_FACE_DEDUP_V1/);
assert.match(text.analysisTopology, /duplicateFaceIds/);
assert.match(text.profile, /vertexMergeAbsoluteMm:\s*2e-6/);
assert.match(text.profile, /vertexMergeRelativeTolerance:\s*0/);
assert.match(text.profile, /terminalCapBridgeAbsoluteMm:\s*1e-4/);
assert.match(text.terminalCapBridge, /DETACHED_CAP_RING_BRIDGE_V1/);
assert.match(text.terminalCapBridge, /deriveBoundaryLoops/);
assert.match(text.terminalCapBridge, /fitBoundaryCircleLocal/);
assert.match(text.terminalCapBridge, /pairedVertexCount/);

// Open-boundary admission retains priority. Closed-solid fallback is limited to
// boundary absence or a shell mismatch demonstrably repaired by governed evidence.
assert.match(text.classify, /from '\.\.\/solid-fitting-ports\/classifier\.js'/);
assert.match(text.classify, /reason === 'BOUNDARY_COUNT'/);
assert.match(text.classify, /reason === 'SHELL_COUNT'/);
assert.match(text.classify, /repairedShellEvidence/);
assert.match(text.classify, /POSITION_WELD_AND_FACE_DEDUP_V1/);
assert.match(text.classify, /DETACHED_CAP_RING_BRIDGE_V1/);

// Selected-zone analysis builds closed-solid evidence alongside derived-port evidence.
assert.match(text.analyseZone, /from '\.\.\/solid-fitting-ports\/evidence\.js'/);
assert.match(text.analyseZone, /closedSolidPipeEvidence/);

// Cap circles reuse the deterministic circle-fit and world-transform primitives.
assert.match(text.candidateEvaluation, /from '\.\.\/zone-geometry\/circle-fit\.js'/);
assert.match(text.candidateEvaluation, /from '\.\.\/zone-geometry\/occurrence-transform\.js'/);
assert.doesNotMatch(text.candidateEvaluation, /rotateJacobi/);

const expectedOrder = [
  'test-auto-pipe-partial-zone.mjs',
  'test-solid-fitting-port-kernel.mjs', 'test-solid-fitting-welded-taya-profile.mjs',
  'test-solid-fitting-port-disposition.mjs', 'test-solid-fitting-port-negative.mjs',
  'test-solid-fitting-port-evidence-contract.mjs',
  'test-auto-pipe-router-priority.mjs', 'test-auto-pipe-closed-solid-router.mjs',
  'test-internal-pipe-mapping-cap-ring-contract.mjs',
  'test-solid-fitting-port-static-guards.mjs',
];
let previous = -1;
for (const name of expectedOrder) {
  const index = text.runAll.indexOf(`'${name}'`);
  assert.ok(index > previous, `${name} is missing or out of order`); previous = index;
}

console.log('test-solid-fitting-port-static-guards: PASS');
