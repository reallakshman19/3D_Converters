import assert from 'node:assert/strict';
import { derivePipeConnectivity } from '../../tabs/model-converters/converters/fbx/auto-pipe/connectivity.js';

const ports = [
  { componentId: 'P1', portId: 'L', centreMm: [10, 0, 0], normal: [1, 0, 0], radiusMm: 1 },
  { componentId: 'P2', portId: 'A', centreMm: [10, 0, 0], normal: [-1, 0, 0], radiusMm: 1 },
  { componentId: 'P1', portId: 'A', centreMm: [0, 0, 0], normal: [-1, 0, 0], radiusMm: 1 },
  { componentId: 'P2', portId: 'L', centreMm: [20, 0, 0], normal: [1, 0, 0], radiusMm: 1 },
];

assert.deepEqual(derivePipeConnectivity(ports), [{
  pairKey: 'P1:L|P2:A',
  endpoints: ['P1:L', 'P2:A'],
}]);
console.log('PASS test-auto-pipe-connectivity');
