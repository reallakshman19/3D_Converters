import assert from 'node:assert/strict';
import { derivePipeConnectivity } from '../../tabs/model-converters/converters/fbx/auto-pipe/connectivity.js';

const ports = [
  { componentId: 'P2', portId: 'A', centreMm: [10, 0, 0], normal: [-1, 0, 0], radiusMm: 1 },
  { componentId: 'P1', portId: 'L', centreMm: [10, 0, 0], normal: [1, 0, 0], radiusMm: 1 },
];
assert.deepEqual(derivePipeConnectivity(ports), derivePipeConnectivity([...ports].reverse()));
console.log('PASS test-auto-pipe-determinism');
