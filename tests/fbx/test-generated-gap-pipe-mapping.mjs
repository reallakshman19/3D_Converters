import assert from 'node:assert/strict';
import {
  executeMapping,
  successCounts,
} from '../../tabs/model-converters/converters/fbx/conversion-core.js';

const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const direction = (vector) => ({ authority: 'world-vector', vector });

function entry(id, model, geometry, start, end, peer, connected = true) {
  const connection = connected ? [{ mappingEntryId: peer, portId: `${peer}-A` }] : [];
  return {
    mappingEntryId: id,
    logicalComponentId: id.toUpperCase(),
    sourceModelObjectId: model,
    sourceOccurrenceId: `occ:${model}`,
    sourceGeometryObjectIds: [geometry],
    componentType: 'PIPE',
    scopeDisposition: 'promote',
    ports: {
      A: {
        portId: `${id}-A`, role: 'A', authority: 'mesh-vertex',
        geometryObjectId: geometry, vertexIndex: 0,
        direction: direction([-1, 0, 0]), connections: [],
      },
      L: {
        portId: `${id}-L`, role: 'L', authority: 'mesh-vertex',
        geometryObjectId: geometry, vertexIndex: 1,
        direction: direction([1, 0, 0]), connections: connection,
      },
    },
    engineering: {},
    verticesMm: [[start, 0, 0], [end, 0, 0]],
  };
}

function fixture(rightStart = 110) {
  const left = entry('p1', '1', '10', 0, 10, 'p2');
  const right = entry('p2', '2', '20', rightStart, rightStart + 10, 'p1', false);
  right.ports.A.connections = [{ mappingEntryId: 'p1', portId: 'p1-L' }];
  const specs = [left, right];
  return {
    mapping: {
      schema: 'FbxStagedMapping.v2',
      inScopeSourceObjectIds: ['1', '2'],
      entries: specs.map(({ verticesMm, ...item }) => item),
      exclusions: [],
    },
    graph: {
      schema: 'FbxSourceGraph.v2',
      sourceObjects: specs.flatMap((item) => [
        { sourceObjectId: item.sourceModelObjectId, ufbxElementType: 'NODE' },
        { sourceObjectId: item.sourceGeometryObjectIds[0], ufbxElementType: 'MESH' },
      ]),
      occurrences: specs.map((item) => ({
        sourceOccurrenceId: item.sourceOccurrenceId,
        sourceModelObjectId: item.sourceModelObjectId,
        geometryObjectIds: [...item.sourceGeometryObjectIds],
        inheritMode: 0,
        geometryMatrixMm: identity,
      })),
      geometries: specs.map((item) => ({
        geometryObjectId: item.sourceGeometryObjectIds[0],
        kind: 'MESH', verticesMm: item.verticesMm,
        ownerOccurrenceIds: [item.sourceOccurrenceId],
      })),
    },
  };
}

const gap = fixture();
const execution = executeMapping(gap.mapping, gap.graph, gap.graph);
assert.equal(execution.entries.length, 3);
assert.equal(execution.links.length, 2);
assert.equal(execution.gapPipeEvidence.counts.generatedPipeCount, 1);
const children = execution.staged.flatMap((branch) => branch.children);
assert.deepEqual(children.map((child) => child.attributes.REF), [
  'P1', 'FBX-GAP-PIPE-0001', 'P2',
]);
const generated = children[1];
assert.equal(generated.type, 'PIPE');
assert.equal(generated.attributes.sourceOccurrenceId, null);
assert.equal(generated.attributes.mappingEngineering.generationProvenance.generated, true);
assert.equal(generated.attributes.mappingEngineering.generationProvenance.generationMethod,
  'EXPLICIT_LINK_STRAIGHT_GAP_V1');
assert.deepEqual(generated.attributes.mappingEngineering.generationProvenance.sourceOccurrenceIds,
  ['occ:1', 'occ:2']);
assert.deepEqual(successCounts(execution), {
  promotedComponents: 2,
  promotedByFamily: {
    PIPE: 2, ELBOW: 0, TEE: 0, REDUCER: 0, BRANCH_FITTING: 0,
    FLANGE: 0, GASKET: 0, VALVE: 0, INSTRUMENT: 0,
  },
  releasedComponents: 3,
  releasedByFamily: {
    PIPE: 3, ELBOW: 0, TEE: 0, REDUCER: 0, BRANCH_FITTING: 0,
    FLANGE: 0, GASKET: 0, VALVE: 0, INSTRUMENT: 0,
  },
  generatedGapPipes: 1,
  explicitConnections: 2,
  branches: 1,
});

const coincidentFixture = fixture(10);
const coincident = executeMapping(
  coincidentFixture.mapping, coincidentFixture.graph, coincidentFixture.graph);
assert.equal(coincident.entries.length, 2);
assert.equal(coincident.links.length, 1);
assert.equal(coincident.gapPipeEvidence.counts.generatedPipeCount, 0);
assert.equal(Object.hasOwn(successCounts(coincident), 'generatedGapPipes'), false);
assert.equal(coincident.staged.flatMap((branch) => branch.children).length, 2);

console.log('PASS test-generated-gap-pipe-mapping');
