import assert from 'node:assert/strict';
import { parseFbxBytesNode } from '../../tabs/model-converters/converters/fbx/parser-node.js';
import { fixtureBytes } from './helpers.mjs';

const bytes = await fixtureBytes();
const graph = await parseFbxBytesNode(bytes);
assert.equal(graph.schema, 'FbxSourceGraph.v1');
assert.equal(graph.file.version, 7400);
assert.equal(graph.file.ascii, false);
assert.equal(graph.globalSettings.unitMeters, 0.01);

const objectIds = new Set(graph.sourceObjects.map((item) => item.sourceObjectId));
for (const id of ['101', '102', '200', '201', '202']) assert.ok(objectIds.has(id), `missing source ID ${id}`);
const occurrenceIds = new Set(graph.occurrences.map((item) => item.sourceOccurrenceId));
assert.ok(occurrenceIds.has('occ:201'));
assert.ok(occurrenceIds.has('occ:202'));
assert.notEqual('201', '101');
assert.notEqual('occ:201', 'PIPE-001');

const pipeOne = graph.occurrences.find((item) => item.sourceOccurrenceId === 'occ:201');
const pipeTwo = graph.occurrences.find((item) => item.sourceOccurrenceId === 'occ:202');
assert.equal(Math.round(pipeOne.geometryMatrixMm[9]), 300, 'parent transform composition');
assert.equal(Math.round(pipeTwo.geometryMatrixMm[9]), 400, 'unit conversion to mm');

await assert.rejects(() => parseFbxBytesNode(bytes.slice(0, 100)), /truncated|failed|rejected/i);
const malformed = bytes.slice();
malformed.fill(0, 0, 24);
await assert.rejects(() => parseFbxBytesNode(malformed), /format|failed|rejected/i);

const unsupported = bytes.slice();
new DataView(unsupported.buffer).setUint32(23, 8000, true);
await assert.rejects(() => parseFbxBytesNode(unsupported), /version|failed|unsupported/i);
console.log('test-parser: PASS');
