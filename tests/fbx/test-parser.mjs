import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseFbxBytesNode } from '../../tabs/model-converters/converters/fbx/parser-node.js';
import { transformPoint } from '../../tabs/model-converters/converters/fbx/transform-policy.js';
import { fixtureBytes } from './helpers.mjs';

const bytes = await fixtureBytes();
const graph = await parseFbxBytesNode(bytes);
assert.equal(graph.schema, 'FbxSourceGraph.v1');
assert.equal(graph.file.version, 7400);
assert.equal(graph.file.ascii, false);
assert.equal(graph.globalSettings.unitMeters, 0.01);

const objectIds = new Set(graph.sourceObjects.map((item) => item.sourceObjectId));
for (const id of ['101', '102', '200', '201', '202']) assert.ok(objectIds.has(id), `missing source ID ${id}`);
const pipeModel = graph.sourceObjects.find((item) => item.sourceObjectId === '201');
const pipeGeometry = graph.sourceObjects.find((item) => item.sourceObjectId === '101');
assert.deepEqual(
  { class: pipeModel.class, subtype: pipeModel.subtype, sourceName: pipeModel.sourceName, ufbxType: pipeModel.ufbxType },
  { class: 'Model', subtype: 'Mesh', sourceName: 'Model::PipeOne', ufbxType: 'NODE' },
);
assert.deepEqual(
  { class: pipeGeometry.class, subtype: pipeGeometry.subtype, sourceName: pipeGeometry.sourceName, ufbxType: pipeGeometry.ufbxType },
  { class: 'Geometry', subtype: 'Mesh', sourceName: 'Geometry::PipeOne', ufbxType: 'MESH' },
);
assert.ok(!graph.sourceObjects.some((item) => item.ufbxType === 'OTHER'));

const occurrenceIds = new Set(graph.occurrences.map((item) => item.sourceOccurrenceId));
assert.ok(occurrenceIds.has('occ:201'));
assert.ok(occurrenceIds.has('occ:202'));
assert.notEqual('201', '101');
assert.notEqual('occ:201', 'PIPE-001');

const pipeOne = graph.occurrences.find((item) => item.sourceOccurrenceId === 'occ:201');
const pipeTwo = graph.occurrences.find((item) => item.sourceOccurrenceId === 'occ:202');
assert.equal(Math.round(pipeOne.geometryMatrixMm[9]), 300, 'parent transform composition');
assert.equal(Math.round(pipeTwo.geometryMatrixMm[9]), 400, 'unit conversion to mm');

const axisBytes = new Uint8Array(await readFile(new URL('../fixtures/fbx/axis-geometric.fbx', import.meta.url)));
const axisGraph = await parseFbxBytesNode(axisBytes);
const axisOccurrence = axisGraph.occurrences.find((item) => item.sourceOccurrenceId === 'occ:301');
const axisGeometry = axisGraph.geometries.find((item) => item.geometryObjectId === '103');
assert.equal(axisGraph.globalSettings.axes.up, 4, 'source Z-up axis is preserved');
assert.equal(axisOccurrence.hasGeometryTransform, true);
assert.equal(Math.round(axisOccurrence.worldMatrixSource[11]), 30, 'source parent composition');
assert.equal(Math.round(axisOccurrence.geometryMatrixSource[11]), 35, 'source geometric transform');
assert.equal(Math.round(axisOccurrence.worldMatrixMm[10]), 300, 'Z-up converts to Y-up millimetres');
assert.equal(Math.round(axisOccurrence.geometryMatrixMm[10]), 350, 'geometric transform converts to millimetres');
assert.deepEqual(transformPoint(axisOccurrence.geometryMatrixMm, axisGeometry.verticesMm[1]).map(Math.round), [0, 450, 0]);

await assert.rejects(() => parseFbxBytesNode(bytes.slice(0, 100)), /truncated|failed|rejected/i);
const malformed = bytes.slice();
malformed.fill(0, 0, 24);
await assert.rejects(() => parseFbxBytesNode(malformed), /format|failed|rejected/i);

const unsupported = bytes.slice();
new DataView(unsupported.buffer).setUint32(23, 8000, true);
await assert.rejects(() => parseFbxBytesNode(unsupported), /version|failed|unsupported/i);
console.log('test-parser: PASS');
