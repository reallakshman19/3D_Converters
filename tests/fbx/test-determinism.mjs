import assert from 'node:assert/strict';
import { parseFbxBytesNode } from '../../tabs/model-converters/converters/fbx/parser-node.js';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { convertFbxToStagedJson } from '../../tabs/model-converters/converters/fbx/conversion.js';
import { fixtureBytes, fixtureMapping } from './helpers.mjs';

const bytes = await fixtureBytes();
const mapping = await fixtureMapping();
const graphA = await parseFbxBytesNode(bytes);
const graphB = await parseFbxBytesNode(bytes);
assert.equal(canonicalJson(graphA), canonicalJson(graphB), 'source graph bytes differ');
const first = await convertFbxToStagedJson({ bytes, inputName: 'two-pipes.fbx', mapping, parse: parseFbxBytesNode });
const second = await convertFbxToStagedJson({ bytes, inputName: 'two-pipes.fbx', mapping, parse: parseFbxBytesNode });
assert.deepEqual(first.outputs.map((item) => item.text), second.outputs.map((item) => item.text));
console.log('test-determinism: PASS');
