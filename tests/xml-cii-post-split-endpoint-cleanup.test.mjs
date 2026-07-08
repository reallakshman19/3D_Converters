import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadCleanupFunction() {
  const sourcePath = resolve('converters/xml-cii2019-core/post-split-element-length-cleanup.js');
  let source = readFileSync(sourcePath, 'utf8');
  source = source.replace(/import \{ cleanXmlCiiNodeBlocks \} from '\.\/xml-cii-node-block-cleanup\.js';/, `
function cleanXmlCiiNodeBlocks(xmlText, options = {}) {
  const threshold = Number(options.shortElementLengthDropThresholdMm ?? 6);
  let dropped = 0;
  const out = String(xmlText || '').replace(/<Node\\b[\\s\\S]*?<\\/Node>/gi, (block) => {
    const m = block.match(/<ElementLengthMm[^>]*>([\\s\\S]*?)<\\/ElementLengthMm>/i);
    const length = m ? Number(String(m[1]).trim()) : NaN;
    if (Number.isFinite(length) && length <= threshold) { dropped += 1; return ''; }
    return block;
  });
  return { xmlText: out, stats: { gasketNodesDropped: 0, shortElementLengthNodesDropped: dropped, shortElementLengthNodesDroppedByType: {} }, diagnostics: [] };
}`);
  source = source.replace(/import \{[\s\S]*?\} from '\.\/topology\/xml-cii-topology-element-length\.js';/, `
function applyXmlCiiTopologyElementLengths(xmlText) { return { xmlText, changed: 0, assignments: [], skipped: [], diagnostics: [] }; }
function collectXmlCiiTopologyElementLengthAssignments() { return { assignments: [], skipped: [], diagnostics: [] }; }`);
  source = source.replace(/export function applyXmlCiiPostSplitElementLengthCleanup/, 'function applyXmlCiiPostSplitElementLengthCleanup');
  return Function(`${source}\nreturn { applyXmlCiiPostSplitElementLengthCleanup };`)().applyXmlCiiPostSplitElementLengthCleanup;
}

function nodeBlock(xml, nodeNumber) {
  const re = new RegExp(`<Node\\b(?=[\\s\\S]*?<NodeNumber>${nodeNumber}<\\/NodeNumber>)[\\s\\S]*?<\\/Node>`, 'i');
  return String(xml || '').match(re)?.[0] || '';
}

function tag(block, name) {
  return String(block || '').match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1]?.trim() || '';
}

test('post-split cleanup normalizes split-created endpoint only after short nodes are dropped', () => {
  const applyXmlCiiPostSplitElementLengthCleanup = loadCleanupFunction();
  const xml = `<?xml version="1.0"?><PipeStressExport><Pipe><Branch><Branchname>/TEST/B1</Branchname>
<Node><NodeNumber>460</NodeNumber><NodeName/><Endpoint>1</Endpoint><Rigid>1</Rigid><ComponentType>FLAN</ComponentType><Weight>31.795</Weight><ComponentRefNo>=67130408/808</ComponentRefNo><ConnectionType/><Position>0 0 0</Position><ElementLengthMm>122.250</ElementLengthMm></Node>
<Node><NodeNumber>468</NodeNumber><NodeName/><Endpoint>2</Endpoint><Rigid>2</Rigid><ComponentType>FLAN</ComponentType><Weight>31.795</Weight><ComponentRefNo>=67130408/808</ComponentRefNo><ConnectionType/><Position>1 0 0</Position><ElementLengthMm>3.000</ElementLengthMm></Node>
<Node><NodeNumber>469</NodeNumber><NodeName/><Endpoint>2</Endpoint><Rigid>2</Rigid><ComponentType>FLAN</ComponentType><Weight>31.795</Weight><ComponentRefNo>=67130408/808</ComponentRefNo><ConnectionType/><Position>80 0 0</Position><ElementLengthMm>80.000</ElementLengthMm></Node>
<Node><NodeNumber>470</NodeNumber><NodeName/><Endpoint>2</Endpoint><Rigid>2</Rigid><ComponentType>RIGID</ComponentType><Weight>0</Weight><ComponentRefNo>=67130408/807</ComponentRefNo><ConnectionType>BRAN</ConnectionType><Position>80 0 0</Position><ElementLengthMm>202.250</ElementLengthMm></Node>
<Node><NodeNumber>471</NodeNumber><NodeName/><Endpoint>2</Endpoint><Rigid>2</Rigid><ComponentType>VALV</ComponentType><Weight>12</Weight><ComponentRefNo>=67130408/999</ComponentRefNo><ConnectionType/><Position>160 0 0</Position><ElementLengthMm>80.000</ElementLengthMm></Node>
</Branch></Pipe></PipeStressExport>`;

  const result = applyXmlCiiPostSplitElementLengthCleanup(xml, { topologyElementLengthMode: 'off', stage: 'test-final-stage' });
  assert.equal(nodeBlock(result.xmlText, '468'), '', 'short split-created node must be dropped before endpoint normalization');
  assert.equal(tag(nodeBlock(result.xmlText, '469'), 'Endpoint'), '1', 'split-created FLAN node should be endpoint 1 after cleanup');
  assert.equal(tag(nodeBlock(result.xmlText, '471'), 'Endpoint'), '1', 'split-created VALV node should be endpoint 1 after cleanup');
  assert.equal(tag(nodeBlock(result.xmlText, '470'), 'Endpoint'), '2', 'branch connector node with ConnectionType=BRAN must not be rewritten');
  assert.equal(result.stats.shortElementLengthNodesDropped, 1);
  assert.equal(result.stats.splitCreatedEndpointNormalized, 2);
  assert.equal(result.diagnostics.filter((row) => row.type === 'split-created-endpoint-normalized').length, 2);
});
