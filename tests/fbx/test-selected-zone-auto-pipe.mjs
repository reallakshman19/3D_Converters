import assert from 'node:assert/strict';
import {
  BLOCKED_SELECTED_ZONE_AUTO_PIPE,
  STAGEDJSON_SELECTED_ZONE_PASS,
  runFbxSelectedZoneAutoPipe,
  selectFbxAutoPipeZone,
} from '../../tabs/model-converters/converters/fbx/zone-geometry/selected-zone-auto-pipe.js';

const matrix = () => [1,0,0,0,1,0,0,0,1,0,0,0];
const source = (id, name, subtype = 'Mesh') => ({
  sourceObjectId: id, displayName: `Model::${name}`,
  domSourceName: `Model::${name}`, domSubtype: subtype,
});
const occurrence = (id, model, parent, geometryObjectIds) => ({
  sourceOccurrenceId: id, sourceModelObjectId: model, parentOccurrenceId: parent,
  geometryObjectIds, geometryMatrixMm: matrix(),
});
function box(length, width, height) {
  return [
    [0,0,0], [length,0,0], [0,width,0], [length,width,0],
    [0,0,height], [length,0,height], [0,width,height], [length,width,height],
  ];
}
const graph = {
  schema: 'FbxSourceGraph.v2',
  sourceObjects: [
    source('1', 'Scene', 'Null'), source('2', 'Project', 'Null'),
    source('3', 'Piping Zone', 'Null'), source('4', 'Equipment Zone', 'Null'),
    source('5', 'PIPE-1001'), source('6', 'Equipment Body'),
  ],
  occurrences: [
    occurrence('occ:1', '1', null, []),
    occurrence('occ:2', '2', 'occ:1', []),
    occurrence('occ:3', '3', 'occ:2', []),
    occurrence('occ:4', '4', 'occ:2', []),
    occurrence('occ:5', '5', 'occ:3', ['10']),
    occurrence('occ:6', '6', 'occ:4', ['11']),
  ],
  geometries: [
    { geometryObjectId: '10', sourceObjectId: '5', kind: 'MESH',
      verticesMm: box(20, 2, 2), ownerOccurrenceIds: ['occ:5'] },
    { geometryObjectId: '11', sourceObjectId: '6', kind: 'MESH',
      verticesMm: box(4, 4, 4), ownerOccurrenceIds: ['occ:6'] },
  ],
};

{
  const selected = selectFbxAutoPipeZone(graph);
  assert.equal(selected.zoneId, 'occ:3');
  assert.equal(selected.label, 'Piping Zone');
  assert.equal(selected.selectedGeometryCount, 1);
  assert.equal(selected.pipeLikeGeometryCount, 1);
  assert.equal(selected.reason, 'ranked-source-graph');
  assert.equal(selected.candidateCount, 2);
}
{
  const selected = selectFbxAutoPipeZone(graph, { zoneId: 'occ:4' });
  assert.equal(selected.zoneId, 'occ:4');
  assert.equal(selected.reason, 'explicit-zone');
}
{
  assert.throws(() => selectFbxAutoPipeZone(graph, {
    zoneId: 'occ:3', maxSourcePoints: 1,
  }), /resource ceiling/);
}
{
  let calls = 0;
  const selection = selectFbxAutoPipeZone(graph);
  const result = await runFbxSelectedZoneAutoPipe({
    sourceGraph: graph, geometryBundle: {}, selection,
    analyse: async ({ zoneId, includeZonePackageInputs }) => {
      calls += 1;
      assert.equal(zoneId, selection.zoneId);
      assert.equal(includeZonePackageInputs, false);
      return { autoPipe: { status: 'STAGEDJSON_PASS', error: null,
        stagedJsonText: JSON.stringify([{ type: 'BRANCH', id: 'B-1', name: 'Branch',
          attributes: { REF: 'B-1' }, children: [{ type: 'PIPE', id: 'P-1',
            attributes: { REF: 'P-1' }, children: [] }] }]) },
      counts: { admittedPipes: 1 } };
    },
  });
  assert.equal(calls, 1, 'selected-zone mode must analyse exactly one zone');
  assert.equal(result.conversionStatus, STAGEDJSON_SELECTED_ZONE_PASS);
  assert.equal(result.counts.attemptedZones, 1);
  assert.equal(result.counts.passedZones, 1);
  const output = JSON.parse(result.stagedJsonText);
  assert.equal(output.length, 1);
  assert.equal(output[0].attributes.sourceZoneId, selection.zoneId);
}
{
  const selection = selectFbxAutoPipeZone(graph);
  const result = await runFbxSelectedZoneAutoPipe({
    sourceGraph: graph, geometryBundle: {}, selection,
    analyse: async () => ({ autoPipe: {
      status: 'BLOCKED_AUTO_PIPE_CLASSIFICATION', error: null,
    }, counts: { admittedPipes: 0 } }),
  });
  assert.equal(result.conversionStatus, BLOCKED_SELECTED_ZONE_AUTO_PIPE);
  assert.equal(result.counts.attemptedZones, 1);
  assert.equal(result.counts.blockedZones, 1);
  assert.equal(result.zoneReports.length, 1);
}
{
  assert.throws(() => selectFbxAutoPipeZone({
    schema: 'FbxSourceGraph.v2', sourceObjects: [], occurrences: [], geometries: [],
  }), /no mesh-bearing zone/);
}

console.log('test-selected-zone-auto-pipe: PASS');
