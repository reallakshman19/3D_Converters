import assert from 'node:assert/strict';
import test from 'node:test';

import { createAivFlareNetwork, moveAivFlareNetworkNodePresentation, resolveAivFlareNetworkPath } from '../converters/vibration/aiv/aiv-flare-network.js';
import {
  addAivFlareNetworkNode,
  addAivFlareNetworkSegment,
  deleteAivFlareNetworkNode,
  deleteAivFlareNetworkSegment,
  setAivFlareNetworkSegmentLength,
  updateAivFlareNetworkNode,
} from '../converters/vibration/aiv/aiv-flare-network-mutations.js';
import { generateAivInputTablesFromFlareNetwork } from '../converters/vibration/aiv/aiv-flare-network-table-generator.js';

function empty() {
  return createAivFlareNetwork({ networkId: 'DRAWN', revision: '1', nodes: [], segments: [] });
}

test('authoring mutations place nodes connect segment and generate relationship only after engineering length exists', () => {
  let graph = empty();
  graph = addAivFlareNetworkNode(graph, {
    canonicalId: 'SRC-1', kind: 'SOURCE', presentation: { x: 100, y: 100 },
    sourceInput: { caseId: 'CASE-1' },
  });
  graph = addAivFlareNetworkNode(graph, {
    canonicalId: 'A-1', kind: 'ASSESSMENT', presentation: { x: 500, y: 100 }, assessmentInput: {},
  });
  graph = addAivFlareNetworkSegment(graph, { segmentId: 'PIPE-1', fromNodeId: 'SRC-1', toNodeId: 'A-1' });

  let generated = generateAivInputTablesFromFlareNetwork(graph);
  assert.equal(generated.pathEvidence[0].status, 'UNRESOLVED_LENGTH');
  assert.equal(generated.tables.relationships.rows.length, 1);

  graph = setAivFlareNetworkSegmentLength(graph, 'PIPE-1', 12.4, 'm');
  generated = generateAivInputTablesFromFlareNetwork(graph);
  assert.equal(generated.pathEvidence[0].status, 'RESOLVED');
  assert.equal(generated.pathEvidence[0].physicalDistanceM, 12.4);
  const h = generated.tables.relationships.header;
  assert.equal(generated.tables.relationships.rows[0][h.indexOf('Physical Distance')], '12.4');
  assert.equal(generated.tables.relationships.rows[0][h.indexOf('Distance Source')], 'AIV_FLARE_NETWORK_PATH_SUM');
});

test('dragging presentation and editing node properties do not mutate segment engineering length', () => {
  let graph = createAivFlareNetwork({
    networkId: 'DRAWN', revision: '1',
    nodes: [
      { canonicalId: 'SRC-1', kind: 'SOURCE', presentation: { x: 10, y: 10 }, sourceInput: { caseId: 'CASE-1', sourceDeviceType: 'RELIEF_VALVE' } },
      { canonicalId: 'A-1', kind: 'ASSESSMENT', presentation: { x: 20, y: 20 }, assessmentInput: {} },
    ],
    segments: [{ segmentId: 'PIPE-1', fromNodeId: 'SRC-1', toNodeId: 'A-1', physicalLength: { value: 4.2, unit: 'm' } }],
  });
  graph = moveAivFlareNetworkNodePresentation(graph, 'A-1', 9000, -1200);
  graph = updateAivFlareNetworkNode(graph, 'SRC-1', { tag: 'PSV-101' });
  assert.equal(resolveAivFlareNetworkPath(graph, 'SRC-1', 'A-1').physicalDistanceM, 4.2);
  assert.equal(graph.nodes.find((item) => item.canonicalId === 'SRC-1').tag, 'PSV-101');
});

test('node deletion requires connected segments to be removed first', () => {
  let graph = createAivFlareNetwork({
    networkId: 'DRAWN', revision: '1',
    nodes: [
      { canonicalId: 'SRC-1', kind: 'SOURCE', sourceInput: { caseId: 'CASE-1' } },
      { canonicalId: 'A-1', kind: 'ASSESSMENT', assessmentInput: {} },
    ],
    segments: [{ segmentId: 'PIPE-1', fromNodeId: 'SRC-1', toNodeId: 'A-1', physicalLength: { value: 1, unit: 'm' } }],
  });
  assert.throws(() => deleteAivFlareNetworkNode(graph, 'A-1'), /connected segments/u);
  graph = deleteAivFlareNetworkSegment(graph, 'PIPE-1');
  graph = deleteAivFlareNetworkNode(graph, 'A-1');
  assert.equal(graph.nodes.some((item) => item.canonicalId === 'A-1'), false);
});
