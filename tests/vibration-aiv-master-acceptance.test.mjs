import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aivMasterAcceptanceRequired,
  createAivMasterAcceptance,
  isAivMasterAcceptanceCurrent,
} from '../tabs/vibration-aiv-master-acceptance.js';
import { isAivScreeningReady } from '../tabs/vibration-aiv-screening-gate.js';

function resolution(value = 'WELDED_TEE') {
  return {
    schema: 'AivMasterResolution.v1',
    tables: {
      sources: { kind: 'sources', header: ['Source Canonical ID', 'Operating Case'], rows: [['SRC-1', 'CASE-1']] },
      assessments: { kind: 'assessments', header: ['Assessment Canonical ID', 'Assessment Type'], rows: [['ASSMT-1', value]] },
      relationships: { kind: 'relationships', header: ['Source Canonical ID', 'Assessment Canonical ID', 'Operating Case'], rows: [['SRC-1', 'ASSMT-1', 'CASE-1']] },
    },
    resolutions: [{
      tableKind: 'assessments', rowIndex: 0, column: 'Assessment Type', value,
      origin: 'PINNED_MASTER', masterTable: 'components', masterRecordId: 'CMP-TEE',
      sourceDocumentId: 'DOC-AIV-MAP', sourceCommit: 'MASTER-COMMIT',
    }],
    unresolved: [],
    policy: { explicitValuesOverrideMaster: true, masterOverridesAssumptions: true, screeningAuthorityConferred: false },
  };
}

function screeningState(masterResolution, masterAcceptance) {
  return {
    readinessEnvelope: { readiness: { counts: { readyForQualification: 1, notReady: 0, methodGap: 0 } } },
    assumptionResolution: { assumptionCount: 0, assumptions: [] },
    assumptionAcceptance: null,
    masterResolution,
    masterAcceptance,
  };
}

test('master-derived reference fields require explicit acceptance before screening', () => {
  const value = resolution();
  assert.equal(aivMasterAcceptanceRequired(value), true);
  assert.equal(isAivMasterAcceptanceCurrent(value, null), false);
  assert.equal(isAivScreeningReady(screeningState(value, null)), false);

  const acceptance = createAivMasterAcceptance(value);
  assert.equal(acceptance.reviewDisposition, 'USER_REVIEWED_REFERENCE_INPUT');
  assert.equal(acceptance.masterEngineeringQualification, 'NOT_ESTABLISHED_BY_ADAPTER');
  assert.equal(acceptance.screeningAuthorityConferredByMaster, false);
  assert.equal(isAivMasterAcceptanceCurrent(value, acceptance), true);
  assert.equal(isAivScreeningReady(screeningState(value, acceptance)), true);
});

test('changing the exact master-derived field set invalidates prior acceptance', () => {
  const first = resolution('WELDED_TEE');
  const acceptance = createAivMasterAcceptance(first);
  const changed = resolution('WELDOLET');
  assert.equal(isAivMasterAcceptanceCurrent(changed, acceptance), false);
  assert.equal(isAivScreeningReady(screeningState(changed, acceptance)), false);
});

test('no master-derived fields means no master review gate', () => {
  const empty = { ...resolution(), resolutions: [] };
  assert.equal(aivMasterAcceptanceRequired(empty), false);
  assert.equal(createAivMasterAcceptance(empty), null);
  assert.equal(isAivMasterAcceptanceCurrent(empty, null), true);
  assert.equal(isAivScreeningReady(screeningState(empty, null)), true);
});
