import assert from 'node:assert/strict';
import { parseFbxBytesNode } from '../../tabs/model-converters/converters/fbx/parser-node.js';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { convertFbxToStagedJson } from '../../tabs/model-converters/converters/fbx/conversion.js';
import { enforceSourceGraphPolicy } from '../../tabs/model-converters/converters/fbx/source-graph.js';
import { fixtureBytes, fixtureMapping, syntheticGraph } from './helpers.mjs';

const bytes = await fixtureBytes();
const mapping = await fixtureMapping();
const graphA = await parseFbxBytesNode(bytes);
const graphB = await parseFbxBytesNode(bytes);
assert.equal(canonicalJson(graphA), canonicalJson(graphB), 'source graph bytes differ');
const first = await convertFbxToStagedJson({ bytes, inputName: 'two-pipes.fbx', mapping, parse: parseFbxBytesNode });
const second = await convertFbxToStagedJson({ bytes, inputName: 'two-pipes.fbx', mapping, parse: parseFbxBytesNode });
assert.deepEqual(first.outputs.map((item) => item.text), second.outputs.map((item) => item.text));

const unordered = syntheticGraph();
unordered.sourceObjects.reverse();
unordered.sourceObjects[0].customProperties = [{ name: 'z' }, { name: 'a' }];
unordered.occurrences.reverse();
unordered.geometries.reverse();
unordered.geometries[0].ownerOccurrenceIds = ['occ:202', 'occ:201'];
unordered.hierarchyEdges = [
  { parentOccurrenceId: 'occ:202', childOccurrenceId: 'occ:201' },
  { parentOccurrenceId: 'occ:201', childOccurrenceId: 'occ:202' },
];
unordered.connectionEdges = [
  { sourceObjectId: '202', destinationObjectId: '102', sourceProperty: 'z', destinationProperty: '' },
  { sourceObjectId: '201', destinationObjectId: '101', sourceProperty: 'a', destinationProperty: '' },
];
unordered.warnings = [{ type: 2, description: 'z' }, { type: 1, description: 'a' }];
const reversed = structuredClone(unordered);
for (const key of ['sourceObjects', 'occurrences', 'geometries', 'hierarchyEdges', 'connectionEdges', 'warnings']) {
  reversed[key].reverse();
}
reversed.sourceObjects.find((item) => item.customProperties)?.customProperties.reverse();
reversed.geometries.find((item) => item.ownerOccurrenceIds)?.ownerOccurrenceIds.reverse();
assert.equal(
  canonicalJson(enforceSourceGraphPolicy(unordered)),
  canonicalJson(enforceSourceGraphPolicy(reversed)),
  'canonical graph ordering depends on parser iteration order',
);
console.log('test-determinism: PASS');
