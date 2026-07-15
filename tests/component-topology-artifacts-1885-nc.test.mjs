/**
 * Real 1885_NC native-engineering support-policy gate.
 * Non-restraint opening/penetration attachments remain traceable as deferred
 * records, while referenced stress supports project to their carrier edges.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildComponentTopologyArtifacts } from '../tabs/model-converters/converters/component-topology/topology-artifact-exporter.js';
import {
  SUPPORT_PROJECTION_TOLERANCE_MM,
  TOPOLOGY_TOLERANCE_MM,
} from '../tabs/model-converters/converters/component-topology/topology-values.js';

const fixturePath = fileURLToPath(new URL('../Benchmarks/1885_NC/1885_NC.json', import.meta.url));

if (!existsSync(fixturePath)) {
  console.log(`component topology 1885_NC SKIPPED: fixture not found at ${fixturePath}`);
} else {
  const sourceText = readFileSync(fixturePath, 'utf8');
  const built = await buildComponentTopologyArtifacts(sourceText, {
    sourceName: '1885_NC.json',
    jobName: '1885_NC',
    toleranceMm: TOPOLOGY_TOLERANCE_MM,
    supportProjectionToleranceMm: SUPPORT_PROJECTION_TOLERANCE_MM,
    enrichmentConfig: {},
  });

  assert.deepEqual(built.metrics.source, {
    branches: 278,
    childRecords: 4320,
    routeComponents: 2939,
    supports: 1381,
    componentCounts: {
      'ELBO/BEND': 351, PIPE: 880, OLET: 58, SUPPORT: 1381, FLANGE: 571,
      GASK: 599, VALVE: 203, INST: 77, REDUCER: 52, TEE: 148,
    },
  });
  assert.equal(built.metrics.canonical.zeroLengthEdges, 0);
  assert.equal(built.metrics.ledger.blockedRecords, 0);
  assert.equal(built.metrics.ledger.deferredSupports, 92);
  assert.equal(built.metrics.canonical.supports, 580);
  assert.equal(built.metrics.inputXml.restraints, 758);

  const penetration = built.traceLedger.records.find((row) => row.sourceRef === '=1006649732/53464');
  assert(penetration, 'floor-opening attachment must retain one ledger record');
  assert.equal(penetration.primaryDisposition, 'DEFER_SUPPORT');
  assert.equal(penetration.projectionCardinality, 'DEFERRED');
  assert.equal(penetration.lossClassification, 'DEFERRED_NON_RESTRAINT_ATTACHMENT');
  assert.equal(penetration.evidence.supportProjectionAuthority, 'NON_RESTRAINT_ATTACHMENT_DESCRIPTION');
  assert.deepEqual(penetration.canonicalNodeIds, []);
  assert.deepEqual(penetration.inputXmlElementIds, []);
  assert.deepEqual(penetration.inputXmlChildIds, []);

  const referenced = built.canonicalTopology.supports.find((support) => support.sourcePaths.includes('$[241].children[79]'));
  assert(referenced, 'PS02705.1 must project through its explicit carrier reference');
  assert.equal(referenced.connectionResidual, 200);
  assert.equal(referenced.sourcePosition.z, 807.15);
  assert.equal(referenced.attachmentPosition.z, 607.15);
  assert.equal(referenced.position.z, 607.15);
  assert.match(referenced.attachmentAuthority, /ATTACHED_COMPONENT_REF\/COMPRE:=1006649732\/54494/);

  console.log('component topology 1885_NC passed: deferred annotations and referenced supports are projected explicitly.');
}
