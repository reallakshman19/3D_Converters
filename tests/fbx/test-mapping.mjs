import assert from 'node:assert/strict';
import { normalizeStagedJson } from '../../contracts/stagedjson-contract.js';
import { convertFbxToStagedJson } from '../../tabs/model-converters/converters/fbx/conversion.js';
import { validateConnectivity } from '../../tabs/model-converters/converters/fbx/connectivity.js';
import { validateMappingManifest } from '../../tabs/model-converters/converters/fbx/mapping-validator.js';
import { resolveEntryPorts } from '../../tabs/model-converters/converters/fbx/port-resolver.js';
import { fixtureBytes, fixtureMapping, syntheticGraph } from './helpers.mjs';

const bytes = await fixtureBytes();
const mapping = await fixtureMapping();
const graph = syntheticGraph();
const accepted = validateMappingManifest(mapping, graph);
const meshPorts = resolveEntryPorts(accepted.entries[0], graph);
const nurbsGraph = structuredClone(graph);
nurbsGraph.geometries[1] = { geometryObjectId: '102', kind: 'NURBS_CURVE', controlPointsMm: [[100, 0, 0, 1], [200, 0, 0, 1]] };
const nurbsEntry = {
  ...accepted.entries[1],
  portA: { authority: 'nurbs-control-point', geometryObjectId: '102', controlPointIndex: 0, connections: [] },
  portB: { authority: 'nurbs-control-point', geometryObjectId: '102', controlPointIndex: 1, connections: [] },
};
assert.deepEqual(meshPorts.B.positionMm, [100, 0, 0]);
assert.deepEqual(resolveEntryPorts(nurbsEntry, nurbsGraph).B.positionMm, [200, 0, 0]);

const parse = async () => graph;
const success = await convertFbxToStagedJson({ bytes, inputName: 'two-pipes.fbx', mapping, parse });
assert.equal(success.conversionStatus, 'STAGEDJSON_PASS');
assert.equal(success.outputs.length, 4);
const stagedOutput = success.outputs.find((item) => item.name.endsWith('.staged.json'));
const normalized = normalizeStagedJson(stagedOutput.text);
assert.equal(normalized.branches[0].children.length, 2);
assert.doesNotMatch(stagedOutput.text, /diameter|wallThickness|temperature|pressure|material|nodeNumber/i);

const blocked = await convertFbxToStagedJson({ bytes, inputName: 'two-pipes.fbx', mapping: null, parse });
assert.equal(blocked.conversionStatus, 'BLOCKED_MAPPING');
assert.ok(!blocked.outputs.some((item) => item.name.endsWith('.staged.json')));

const incomplete = structuredClone(mapping);
incomplete.inScopeSourceObjectIds.push('999');
assert.throws(() => validateMappingManifest(incomplete, graph), /no disposition/);
const unresolvedGraph = structuredClone(graph);
unresolvedGraph.sourceObjects = unresolvedGraph.sourceObjects.filter((item) => item.sourceObjectId !== '202');
assert.throws(() => validateMappingManifest(mapping, unresolvedGraph), /resolves 0 times/);
const duplicateGraph = structuredClone(graph);
duplicateGraph.sourceObjects.push({ ...duplicateGraph.sourceObjects[0] });
assert.throws(() => validateMappingManifest(mapping, duplicateGraph), /resolves 2 times/);
const badIndex = structuredClone(mapping);
badIndex.entries[0].portA.vertexIndex = 99;
const badIndexAccepted = validateMappingManifest(badIndex, graph);
assert.throws(() => resolveEntryPorts(badIndexAccepted.entries[0], graph), /invalid mesh vertex/);

const nameOnly = structuredClone(mapping);
delete nameOnly.entries[0].portA.geometryObjectId;
nameOnly.entries[0].portA.coordinate = [0, 0, 0];
assert.throws(() => validateMappingManifest(nameOnly, graph), /geometryObjectId|coordinate/);

const disconnected = structuredClone(mapping);
disconnected.entries[0].portB.connections = [];
disconnected.entries[1].portA.connections = [];
const disconnectedAccepted = validateMappingManifest(disconnected, graph);
const resolved = new Map(disconnectedAccepted.entries.map((entry) => [entry.mappingEntryId, resolveEntryPorts(entry, graph)]));
assert.deepEqual(validateConnectivity(disconnectedAccepted.entries, resolved), [], 'no proximity-derived connectivity');

for (const mutation of ['self', 'dangling', 'asymmetric']) {
  const bad = structuredClone(mapping);
  if (mutation === 'self') bad.entries[0].portB.connections = [{ mappingEntryId: 'map-pipe-1', port: 'B' }];
  if (mutation === 'dangling') bad.entries[0].portB.connections = [{ mappingEntryId: 'missing', port: 'A' }];
  if (mutation === 'asymmetric') bad.entries[1].portA.connections = [];
  const valid = validateMappingManifest(bad, graph);
  const portMap = new Map(valid.entries.map((entry) => [entry.mappingEntryId, resolveEntryPorts(entry, graph)]));
  assert.throws(() => validateConnectivity(valid.entries, portMap), new RegExp(mutation));
}
console.log('test-mapping: PASS');
