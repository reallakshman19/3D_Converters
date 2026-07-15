/**
 * Real 1885_NC native-engineering rejection gate.
 * Input: the repository benchmark. Output: proof that a support located metres
 * away from its owning route is rejected instead of fabricating a pipe segment.
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
  await assert.rejects(
    buildComponentTopologyArtifacts(sourceText, {
      sourceName: '1885_NC.json',
      jobName: '1885_NC',
      toleranceMm: TOPOLOGY_TOLERANCE_MM,
      supportProjectionToleranceMm: SUPPORT_PROJECTION_TOLERANCE_MM,
      enrichmentConfig: {},
    }),
    /Support .* is [\d.]+ mm from its owning branch; limit is 50 mm/,
  );
  console.log('component topology 1885_NC passed: off-route support was rejected explicitly.');
}
