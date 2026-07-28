import assert from 'node:assert/strict';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { fixture } from './test-support-fixtures.mjs';

const input = fixture();
const result = await runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications });
assert.equal(result.supportEvidence.hostAssociations.length, 1);
const host = result.supportEvidence.hostAssociations[0];
assert.equal(host.hostPipeOccurrenceId, 'occ:1');
assert.ok(host.contactRegions.length >= 1);
assert.ok(host.axialOverlapMm >= 10);
assert.equal(result.supportEvidence.admittedSupports[0].positionAuthority,
  'CONTACT_WITNESS_MEDOID');
console.log('PASS test-support-host-association');
