import assert from 'node:assert/strict';
import { inventorySupportCandidates } from '../../tabs/model-converters/converters/fbx/support-analysis/candidate-inventory.js';
import { fixture, occurrence } from './test-support-fixtures.mjs';

const input = fixture({ extraOccurrences: [occurrence(3, 303, [])] });
const inventory = inventorySupportCandidates({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications });
assert.deepEqual(inventory.map((item) => item.inventoryDisposition),
  ['ADMITTED_PIPE_GEOMETRY', 'POSSIBLE_SUPPORT_CANDIDATE', 'CONTEXT_ONLY']);
assert.equal(inventory[1].selections[0].geometry.geometryObjectId, '20');
console.log('PASS test-support-candidate-inventory');
