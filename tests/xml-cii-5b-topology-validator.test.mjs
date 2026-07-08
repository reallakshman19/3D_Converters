import assert from 'node:assert/strict';
import test from 'node:test';

import { buildXmlCii5bTopologyReport } from '../converters/xml-cii2019-core/topology/xml-cii-5b-topology-validator.js';
import { buildXmlCiiTopologyDisconnectAudit } from '../converters/xml-cii2019-core/topology/xml-cii-topology-disconnect-audit.js';

function node({ number, type = 'PIPE', ref, endpoint = 1, position }) {
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

test('5B topology connects coincident component handoffs without disconnected rows', () => {
  const source = xml(`
<Branch>
  <Branchname>/B1</Branchname>
  ${node({ number: 10, type: 'RIGID', ref: '=A', endpoint: 1, position: '0 0 0' })}
  ${node({ number: 19, type: 'FLAN', ref: '=B', endpoint: 1, position: '0 0 0' })}
  ${node({ number: 20, type: 'PIPE', ref: '=C', endpoint: 1, position: '0 0 0' })}
  ${node({ number: 30, type: 'PIPE', ref: '=C', endpoint: 2, position: '100 0 0' })}
</Branch>`);

  const report = buildXmlCii5bTopologyReport(source, { continuityToleranceMm: 6 });
  assert.equal(report.summary.gapCount, 0);
  assert.equal(report.summary.routeOrphanCount, 0);
  assert.ok(report.summary.graphEdgeCount >= 2);

  const audit = buildXmlCiiTopologyDisconnectAudit(source, { continuityToleranceMm: 6 });
  assert.equal(audit.disconnectedRows.length, 0);
});

test('5B topology treats <=6mm helper gaps as minor continuity, not blocking', () => {
  const source = xml(`
<Branch>
  <Branchname>/B1</Branchname>
  ${node({ number: 10, type: 'PIPE', ref: '=A', endpoint: 1, position: '0 0 0' })}
  ${node({ number: 20, type: 'PIPE', ref: '=A', endpoint: 2, position: '100 0 0' })}
  ${node({ number: 21, type: 'GASK', ref: '=G', endpoint: 1, position: '103 0 0' })}
  ${node({ number: 22, type: 'GASK', ref: '=G', endpoint: 2, position: '104 0 0' })}
  ${node({ number: 30, type: 'PIPE', ref: '=B', endpoint: 1, position: '104 0 0' })}
  ${node({ number: 40, type: 'PIPE', ref: '=B', endpoint: 2, position: '200 0 0' })}
</Branch>`);

  const report = buildXmlCii5bTopologyReport(source, { continuityToleranceMm: 6 });
  assert.equal(report.summary.gapCount, 0);
  assert.ok(report.summary.minorGapCount >= 1);
  assert.equal(report.summary.blockingIssueCount, 0);
});

test('5B topology reports true isolated route components as orphans', () => {
  const source = xml(`
<Branch>
  <Branchname>/B1</Branchname>
  ${node({ number: 10, type: 'PIPE', ref: '=A', endpoint: 1, position: '0 0 0' })}
  ${node({ number: 20, type: 'PIPE', ref: '=A', endpoint: 2, position: '100 0 0' })}
  ${node({ number: 30, type: 'PIPE', ref: '=B', endpoint: 1, position: '100 0 0' })}
  ${node({ number: 40, type: 'PIPE', ref: '=B', endpoint: 2, position: '200 0 0' })}
  ${node({ number: 900, type: 'PIPE', ref: '=ORPHAN', endpoint: 1, position: '1000 0 0' })}
  ${node({ number: 910, type: 'PIPE', ref: '=ORPHAN', endpoint: 2, position: '1100 0 0' })}
</Branch>`);

  const report = buildXmlCii5bTopologyReport(source, { continuityToleranceMm: 6 });
  assert.equal(report.summary.routeOrphanCount, 1);
  assert.equal(report.routeOrphans[0].componentRefNo, '=ORPHAN');

  const audit = buildXmlCiiTopologyDisconnectAudit(source, { continuityToleranceMm: 6 });
  assert.ok(audit.disconnectedRows.some((row) => row.status === 'ORPHAN' && row.componentRefNo === '=ORPHAN'));
});
