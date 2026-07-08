import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadTopologyFunctions() {
  const sourcePath = resolve('converters/xml-cii2019-core/topology/xml-cii-topology-element-length.js');
  let source = readFileSync(sourcePath, 'utf8');
  source = source.replace(/export function collectXmlCiiTopologyElementLengthAssignments/, 'function collectXmlCiiTopologyElementLengthAssignments');
  source = source.replace(/export function applyXmlCiiTopologyElementLengths/, 'function applyXmlCiiTopologyElementLengths');
  source = source.replace(/export const XML_CII_TOPOLOGY_ELEMENT_LENGTH_SCHEMA[\s\S]*?;\s*$/, '');
  return Function(`${source}\nreturn { collectXmlCiiTopologyElementLengthAssignments, applyXmlCiiTopologyElementLengths };`)();
}

function baseNode({ number, endpoint = '2', type = 'PIPE', connection = '', position = '0 0 0', ref = '=REF/1' }) {
  return `<Node><NodeNumber>${number}</NodeNumber><NodeName/><Endpoint>${endpoint}</Endpoint><ComponentType>${type}</ComponentType><Weight>0</Weight><ComponentRefNo>${ref}</ComponentRefNo><ConnectionType>${connection}</ConnectionType><OutsideDiameter>100</OutsideDiameter><WallThickness>10</WallThickness><CorrosionAllowance>0</CorrosionAllowance><InsulationThickness>0</InsulationThickness><Position>${position}</Position><BendRadius>0</BendRadius><SIF>0</SIF></Node>`;
}

test('zero-span OLET branch junction is an anchor, not a disconnected topology skip', () => {
  const { collectXmlCiiTopologyElementLengthAssignments } = loadTopologyFunctions();
  const xml = `<PipeStressExport><Pipe><Branch><Branchname>/TEST/OLET</Branchname>
${baseNode({ number: 100, endpoint: '1', type: 'PIPE', position: '0 0 0', ref: '=PIPE/100' })}
${baseNode({ number: 110, endpoint: '2', type: 'BRAN', connection: 'OLET', position: '0 0 0', ref: '=OLET/110' })}
${baseNode({ number: 120, endpoint: '2', type: 'PIPE', position: '100 0 0', ref: '=PIPE/120' })}
</Branch></Pipe></PipeStressExport>`;

  const result = collectXmlCiiTopologyElementLengthAssignments(xml);
  const junctionSkip = result.skipped.find((row) => row.nodeNumber === '110');
  assert.equal(junctionSkip?.reason, 'branch-junction-shared-anchor-no-element-length');
  assert.equal(junctionSkip?.nodeRole, 'branch-junction-node');
  assert.equal(result.skipped.some((row) => row.nodeNumber === '110' && row.reason === 'zero-distance-or-invalid-topology-span'), false);
  assert.equal(result.assignments.some((row) => row.fromNodeNumber === '110' && row.nodeNumber === '120'), true);
});

test('zero-span TEE branch junction is an anchor, not a disconnected topology skip', () => {
  const { collectXmlCiiTopologyElementLengthAssignments } = loadTopologyFunctions();
  const xml = `<PipeStressExport><Pipe><Branch><Branchname>/TEST/TEE</Branchname>
${baseNode({ number: 200, endpoint: '1', type: 'PIPE', position: '0 0 0', ref: '=PIPE/200' })}
${baseNode({ number: 210, endpoint: '0', type: 'TEE', connection: '', position: '0 0 0', ref: '=TEE/210' })}
${baseNode({ number: 220, endpoint: '2', type: 'PIPE', position: '0 100 0', ref: '=PIPE/220' })}
</Branch></Pipe></PipeStressExport>`;

  const result = collectXmlCiiTopologyElementLengthAssignments(xml);
  const junctionSkip = result.skipped.find((row) => row.nodeNumber === '210');
  assert.equal(junctionSkip?.reason, 'branch-junction-shared-anchor-no-element-length');
  assert.equal(junctionSkip?.nodeRole, 'branch-junction-node');
  assert.equal(result.skipped.some((row) => row.nodeNumber === '210' && row.reason === 'zero-distance-or-invalid-topology-span'), false);
  assert.equal(result.assignments.some((row) => row.fromNodeNumber === '210' && row.nodeNumber === '220'), true);
});
