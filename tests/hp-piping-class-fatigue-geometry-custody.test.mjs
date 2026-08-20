import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HP_PIPING_CLASS_NPS4_BROWNFIELD_REFERENCE_ID,
  HP_PIPING_CLASS_NPS4_REFERENCE_ID,
  createHpPipingClassReferenceProject,
} from '../tabs/hp-piping-class-reference-samples.js';
import { applyHpPipingClassKdBulkInput } from '../tabs/hp-piping-class-kd-bulk-input.js';
import { createHpPipingClassExternalResultShell } from '../tabs/hp-piping-class-workbench-state.js';

const BULK = [
  'cycle_id,location_id,user_salt_mpa,seq_mpa,permissible_cycles',
  'C1,BORE_INNER_SURFACE,,70,10000',
].join('\n');

function blankEvidenceProject(referenceId) {
  const project = createHpPipingClassReferenceProject(referenceId);
  project.fatigueEvidence[0].externalResults = [];
  return project;
}

test('new KD review row snapshots baseline EOL OD and wall', () => {
  const project = blankEvidenceProject(HP_PIPING_CLASS_NPS4_REFERENCE_ID);
  const row = createHpPipingClassExternalResultShell(project, 0);
  assert.deepEqual(row.analysisGeometry, {
    outsideDiameterMm: 114.3,
    effectiveWallMm: 8.80375,
  });
});

test('new brownfield KD review row snapshots projected EOL wall', () => {
  const project = blankEvidenceProject(HP_PIPING_CLASS_NPS4_BROWNFIELD_REFERENCE_ID);
  const row = createHpPipingClassExternalResultShell(project, 0);
  assert.deepEqual(row.analysisGeometry, {
    outsideDiameterMm: 114.3,
    effectiveWallMm: 8.7,
  });
});

test('five-column bulk input stamps current analysis geometry on every replaced row', () => {
  const project = blankEvidenceProject(HP_PIPING_CLASS_NPS4_BROWNFIELD_REFERENCE_ID);
  const applied = applyHpPipingClassKdBulkInput(project, 0, BULK);
  assert.equal(applied.ok, true, JSON.stringify(applied));
  assert.equal(applied.applied, true);
  assert.deepEqual(applied.analysisGeometry, {
    outsideDiameterMm: 114.3,
    effectiveWallMm: 8.7,
  });
  assert.deepEqual(project.fatigueEvidence[0].externalResults[0].analysisGeometry, applied.analysisGeometry);
});

test('changing wall state does not silently rewrite existing external analysis geometry', () => {
  const project = createHpPipingClassReferenceProject(HP_PIPING_CLASS_NPS4_REFERENCE_ID);
  assert.equal(project.fatigueEvidence[0].externalResults[0].analysisGeometry.effectiveWallMm, 8.80375);
  project.products[0].wallState = {
    fatigueWallBasis: 'PROJECTED_END_OF_LIFE',
    measuredCurrentWallMm: 10.2,
    futureInternalLossMm: 1.2,
    futureExternalLossMm: 0.3,
  };
  assert.equal(project.fatigueEvidence[0].externalResults[0].analysisGeometry.effectiveWallMm, 8.80375);
});
