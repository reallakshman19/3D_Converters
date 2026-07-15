/**
 * Real 1885_NC component-topology integration gate.
 * Input: managed benchmark JSON. Output: assertions over canonical topology,
 * ledger cardinality, junction degree, and topology InputXML. Missing fixture skips.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildComponentTopologyArtifacts } from '../tabs/model-converters/converters/component-topology/topology-artifact-exporter.js';
import { TOPOLOGY_TOLERANCE_MM } from '../tabs/model-converters/converters/component-topology/topology-values.js';

const fixtureUrl = new URL('../Benchmarks/1885_NC/1885_NC.json', import.meta.url);
const fixturePath = fileURLToPath(fixtureUrl);

function recordsOfType(records, type) {
  return records.filter((record) => record.sourceType === type);
}

function inputXmlVectors(xmlText) {
  return [...xmlText.matchAll(/<PIPINGELEMENT\b([^>]*)>/g)].map((match) => {
    const attributes = Object.fromEntries([...match[1].matchAll(/([A-Z_]+)="([^"]*)"/g)].map((row) => [row[1], row[2]]));
    return {
      id: attributes.ID,
      sourceType: attributes.SOURCE_TYPE,
      length: Math.hypot(Number(attributes.DELTA_X), Number(attributes.DELTA_Y), Number(attributes.DELTA_Z)),
    };
  });
}

if (!existsSync(fixturePath)) {
  console.log(`component topology 1885_NC SKIPPED: fixture not found at ${fixturePath}`);
} else {
  const sourceText = readFileSync(fixturePath, 'utf8');
  const artifacts = await buildComponentTopologyArtifacts(sourceText, {
    sourceName: '1885_NC.json', jobName: '1885_NC', toleranceMm: TOPOLOGY_TOLERANCE_MM,
  });
  const { source, references, canonical, ledger, inputXml } = artifacts.metrics;
  assert.deepEqual(source, {
    branches: 278,
    childRecords: 4320,
    routeComponents: 2939,
    supports: 1381,
    componentCounts: {
      'ELBO/BEND': 351, PIPE: 880, OLET: 58, SUPPORT: 1381, FLANGE: 571,
      GASK: 599, VALVE: 203, INST: 77, REDUCER: 52, TEE: 148,
    },
  });
  assert.deepEqual(references, { cref: 203, resolvedCref: 203, hrefTref: 416, resolvedHrefTref: 391, externalReferences: 25 });
  assert.deepEqual(canonical, { nodes: 3409, edges: 3429, pointFeatures: 63, junctions: 206, boundaries: 28, zeroLengthEdges: 0 });
  assert.deepEqual(ledger, { records: 4598, routeRecords: 2939, blockedRecords: 0, deferredSupports: 1381 });
  assert.deepEqual(inputXml, { elements: 3429 });
  assert.equal(artifacts.buildIssues.filter((issue) => issue.blocking !== false).length, 0);
  assert.deepEqual(artifacts.buildIssues, [{
    code: 'SOURCE_CONNECTION_PRECISION_RESIDUAL',
    blocking: false,
    residualMm: 0.5019999998621643,
    toleranceMm: 0.5,
    acceptedSourcePrecisionMm: 1,
    leftPortId: 'entity-8f9d8dc5a2284ec919bf58647631a574',
    rightPortId: 'entity-0f9ac7536c28b606aa7526fee81dea36',
    authority: 'BRANCH_HEAD_ORDER',
    sourcePath: '$[113]',
  }]);

  const records = artifacts.traceLedger.records;
  assert.equal(new Set(records.map((record) => record.sourceEntityId)).size, 4598);
  assert.equal(new Set(records.map((record) => record.sourcePath)).size, 4598);
  assert.equal(recordsOfType(records, 'PIPE').length, 880);
  assert(recordsOfType(records, 'PIPE').every((record) => record.canonicalEdgeIds.length >= 1));
  assert(recordsOfType(records, 'VALV').every((record) => record.canonicalEdgeIds.length === 1));
  assert.equal(recordsOfType(records, 'FLAN').filter((record) => record.primaryDisposition === 'EMIT_POINT_FEATURE').length, 7);
  assert(recordsOfType(records, 'GASK').every((record) => record.canonicalEdgeIds.length === 1));
  assert.equal(recordsOfType(records, 'ELBO').filter((record) => record.primaryDisposition === 'EMIT_BEND_EDGE_SET').length, 328);
  assert.equal(recordsOfType(records, 'ELBO').filter((record) => record.primaryDisposition === 'EMIT_POINT_FEATURE').length, 23);
  assert(recordsOfType(records, 'TEE').every((record) => record.junctionIds.length === 1));
  assert(recordsOfType(records, 'OLET').every((record) => record.junctionIds.length === 1 && record.affectedEdgeIds.length === 2));
  assert.equal(recordsOfType(records, 'INST').filter((record) => record.primaryDisposition === 'EMIT_INLINE_COMPONENT_EDGE').length, 44);
  assert.equal(recordsOfType(records, 'INST').filter((record) => record.primaryDisposition === 'EMIT_POINT_FEATURE').length, 33);
  assert(recordsOfType(records, 'REDU').every((record) => record.canonicalEdgeIds.length === 1));
  assert(recordsOfType(records, 'SUPPORT').every((record) => record.primaryDisposition === 'DEFER_SUPPORT' && !record.inputXmlElementIds.length));

  const mergeRecords = records.filter((record) => record.projectionCardinality === 'MANY_TO_ONE');
  assert.equal(mergeRecords.length, 88, '44 PIPE/INST shared spans require two explicit ledger records each');
  assert.equal(new Set(mergeRecords.flatMap((record) => record.inputXmlElementIds)).size, 44);
  const degrees = new Map();
  for (const edge of artifacts.canonicalTopology.edges) for (const nodeId of [edge.fromNodeId, edge.toNodeId]) degrees.set(nodeId, (degrees.get(nodeId) ?? 0) + 1);
  assert(artifacts.canonicalTopology.junctions.every((junction) => degrees.get(junction.nodeId) === junction.expectedDegree));

  const vectors = inputXmlVectors(artifacts.topologyInputXml);
  assert.equal(vectors.length, 3429);
  assert(vectors.every((row) => row.id && row.length > TOPOLOGY_TOLERANCE_MM));
  assert.equal(vectors.filter((row) => row.sourceType === 'SUPPORT').length, 0);
  console.log(`component topology 1885_NC passed\n${JSON.stringify(artifacts.metrics, null, 2)}`);
}
