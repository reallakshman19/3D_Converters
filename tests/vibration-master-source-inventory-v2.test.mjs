import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildSbcVibrationMasterSourceInventory,
  serializeSbcVibrationMasterSourceInventory,
} from '../scripts/inventory-vibration-master-sources.mjs';
import {
  CONTROLLED_EI_SOURCE,
  VIBRATION_STAGE5C_TABLE_TARGETS,
  validateStage5cSelection,
} from '../scripts/vibration-stage5c-targets.mjs';

const INVENTORY_PATH = new URL('../ValidationRecords/VibrationMasters/source-inventory-v1.json', import.meta.url);

function targetIds(inventory, type) {
  return inventory.targets.filter((target) => target.dataType === type).map(({ masterId }) => masterId);
}

function assertNoRecoveredValue(target) {
  assert.equal(Object.hasOwn(target, 'data'), false);
  assert.equal(Object.hasOwn(target, 'value'), false);
  assert.equal(Object.hasOwn(target, 'points'), false);
  assert.deepEqual(target.sourceLocator, {
    status: 'REVIEW_REQUIRED', printedPage: null, pdfPage: null, locator: null,
  });
}

test('SBC source inventory pins the exact controlled EI Git object without claiming content extraction', () => {
  const inventory = buildSbcVibrationMasterSourceInventory();
  assert.equal(inventory.source.repository, CONTROLLED_EI_SOURCE.repository);
  assert.equal(inventory.source.commit, CONTROLLED_EI_SOURCE.commit);
  assert.equal(inventory.source.path, CONTROLLED_EI_SOURCE.path);
  assert.equal(inventory.source.gitBlobSha1, CONTROLLED_EI_SOURCE.gitBlobSha1);
  assert.equal(inventory.source.sizeBytes, CONTROLLED_EI_SOURCE.sizeBytes);
  assert.equal(inventory.source.gitObjectVerification.status, 'PASS');
  assert.equal(inventory.programState.documentEvidenceExecution, 'NOT_RUN');
  assert.equal(inventory.programState.sourceLocatorReconciliation, 'REVIEW_REQUIRED');
});

test('SBC inventory separates three table, two rule and four curve recovery targets', () => {
  const inventory = buildSbcVibrationMasterSourceInventory();
  assert.deepEqual(inventory.counts, { total: 9, byType: { TABLE: 3, RULE: 2, CURVE: 4 } });
  const registeredTables = VIBRATION_STAGE5C_TABLE_TARGETS
    .filter(({ masterId }) => masterId.startsWith('EI_AVIFF.T3.SBC.'))
    .map(({ masterId }) => masterId);
  assert.deepEqual(targetIds(inventory, 'TABLE'), registeredTables);
  assert.deepEqual(targetIds(inventory, 'RULE'), [
    'EI_AVIFF.T3.SBC.GEOMETRY_SCORES.v1',
    'EI_AVIFF.T3.SBC.LOCATION_SCORES.v1',
  ]);
  assert.deepEqual(targetIds(inventory, 'CURVE'), [1, 2, 3, 4].map((number) => (
    `EI_AVIFF.T3.SBC.FIGURE_T3_${number}.v1`
  )));
});

test('SBC inventory contains no guessed page, locator, engineering value or authority', () => {
  const inventory = buildSbcVibrationMasterSourceInventory();
  inventory.targets.forEach((target) => {
    assertNoRecoveredValue(target);
    assert.equal(target.sourceState, 'SOURCE_PINNED');
    assert.equal(target.execution.status, 'NOT_RUN');
    assert.equal(target.reconciliation.status, 'NOT_RUN');
    assert.equal(target.publicationState, 'BLOCKED');
    assert.deepEqual(target.authority, {
      engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false, masterValuesPublished: false,
    });
  });
});

test('rule and curve targets remain impossible to route through Stage 5C table extraction', () => {
  const inventory = buildSbcVibrationMasterSourceInventory();
  const nonTables = inventory.targets.filter((target) => target.dataType !== 'TABLE');
  for (const target of nonTables) {
    assert.throws(
      () => validateStage5cSelection({
        masterId: target.masterId,
        pages: [1],
        sourceLocator: { locator: 'test-only' },
      }),
      /VIBRATION_STAGE5C_(?:TARGET_REQUIRES_NON_TABLE_EVIDENCE|CURVE_TARGET_OUT_OF_SCOPE)/u,
    );
  }
});

test('committed SBC source inventory matches the deterministic builder', () => {
  const committed = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
  const built = buildSbcVibrationMasterSourceInventory();
  assert.deepEqual(committed, built);
  assert.deepEqual(JSON.parse(serializeSbcVibrationMasterSourceInventory()), built);
});
