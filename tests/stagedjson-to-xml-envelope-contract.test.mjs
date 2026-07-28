import assert from 'node:assert/strict';
import { _buildXmlFromStagedJsonText } from '../tabs/model-converters/converters/stagedjson-to-xml.js';

const hierarchy = [{
  type: 'BRANCH',
  name: 'BRANCH-1',
  attributes: { NAME: 'BRANCH-1', HBOR: '100 mm' },
  children: [{
    type: 'PIPE',
    name: 'PIPE-1',
    attributes: {
      NAME: 'PIPE-1',
      APOS: { x: 0, y: 0, z: 0 },
      LPOS: { x: 1000, y: 0, z: 0 },
      ABORE: '100 mm',
      WTHK: '6 mm',
    },
  }],
}];

const options = { nodeStart: 10, nodeStep: 10 };
const bare = _buildXmlFromStagedJsonText(JSON.stringify(hierarchy), 'bare.json', options);
const envelope = _buildXmlFromStagedJsonText(JSON.stringify({
  schema: 'inputxml-managed-stage/v1',
  objects: hierarchy,
  provenance: { schema: 'StagedEditProvenance.v1' },
}), 'envelope.json', options);

assert.equal(bare.branchCount, 1);
assert.equal(envelope.branchCount, 1);
assert.equal(bare.nodeCount, 2);
assert.equal(envelope.nodeCount, 2);
assert.equal(envelope.stagedEnvelope.schema, 'inputxml-managed-stage/v1');
assert.equal(envelope.stagedEnvelope.provenance.schema, 'StagedEditProvenance.v1');
assert.equal(envelope.xmlText, bare.xmlText.replace('bare', 'envelope'));

console.log('stagedjson-to-xml envelope contract passed');
