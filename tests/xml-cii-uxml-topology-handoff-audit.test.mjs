import assert from 'node:assert/strict';
import test from 'node:test';

import { buildXmlCiiTopologyDisconnectAudit } from '../converters/xml-cii2019-core/topology/xml-cii-topology-disconnect-audit.js';
import { collectXmlCiiTopologyElementLengthAssignments } from '../converters/xml-cii2019-core/topology/xml-cii-topology-element-length.js';

function node({ number, type, ref, endpoint = 1, position }) {
  return `
<Node>
  <NodeNumber>${number}</NodeNumber>
  <NodeName></NodeName>
  <Endpoint>${endpoint}</Endpoint>
  <ComponentType>${type}</ComponentType>
  <ComponentRefNo>${ref}</ComponentRefNo>
  <Position>${position}</Position>
</Node>`;
}

function xml(body) {
  return `<PipeStressExport><Pipe>${body}</Pipe></PipeStressExport>`;
}

test('UXML topology treats branch-start BRAN as anchor, not disconnected', () => {
  const source = xml(`
<Branch>
  <Branchname>/BMOL-1000-PL-6&quot;-O1610002(PL-03)-01/B1</Branchname>
  ${node({ number: 10, type: 'BRAN', ref: '=67131094/9', position: '0 0 0' })}
  ${node({ number: 20, type: 'PIPE', ref: '=67131094/10', endpoint: 0, position: '100 0 0' })}
</Branch>`);

  const topology = collectXmlCiiTopologyElementLengthAssignments(source);
  assert.equal(topology.skipped.find((row) => row.nodeNumber === '10')?.reason, 'branch-start-route-anchor');

  const audit = buildXmlCiiTopologyDisconnectAudit(source);
  const row10 = audit.rows.find((row) => row.path === 'Path 1 - UXML topology' && row.nodeNumber === '10');
  assert.equal(row10?.status, 'ANCHOR');
  assert.equal(audit.disconnectedRows.some((row) => row.path === 'Path 1 - UXML topology' && row.nodeNumber === '10'), false);
});

test('UXML topology treats coincident RIGID/FLAN handoff as anchor, not disconnected', () => {
  const source = xml(`
<Branch>
  <Branchname>/BMOL-1000-18&quot;-P4510011-61440C1-01/B3</Branchname>
  ${node({ number: 480, type: 'RIGID', ref: '=67131086/388', position: '0 0 0' })}
  ${node({ number: 489, type: 'FLAN', ref: '=67131086/389', position: '0 0 0' })}
  ${node({ number: 500, type: 'PIPE', ref: '=67131086/390', endpoint: 0, position: '250 0 0' })}
</Branch>`);

  const topology = collectXmlCiiTopologyElementLengthAssignments(source);
  assert.equal(topology.skipped.find((row) => row.nodeNumber === '480')?.reason, 'branch-start-route-anchor');
  assert.equal(topology.skipped.find((row) => row.nodeNumber === '489')?.reason, 'coincident-route-handoff-anchor-no-element-length');
  assert.equal(topology.assignments.find((row) => row.nodeNumber === '500')?.fromNodeNumber, '489');

  const audit = buildXmlCiiTopologyDisconnectAudit(source);
  const row489 = audit.rows.find((row) => row.path === 'Path 1 - UXML topology' && row.nodeNumber === '489');
  assert.equal(row489?.status, 'ANCHOR');
  assert.equal(audit.disconnectedRows.some((row) => row.path === 'Path 1 - UXML topology' && row.nodeNumber === '489'), false);
});
