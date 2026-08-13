import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  VIBRATION_MASTER_EXPECTED_GIT_BLOB,
  VIBRATION_MASTER_EXPECTED_SIZE_BYTES,
  VIBRATION_MASTER_SOURCE_INVENTORY_SCHEMA,
  assertExpectedVibrationMasterSource,
  buildVibrationMasterSourceInventory,
  gitBlobSha1Hex,
  runVibrationMasterSourceInventory,
  splitPdfTextPages,
} from '../scripts/inventory-vibration-master-sources.mjs';

const ROOT = new URL('../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, ROOT), 'utf8');

const makeTarget = (masterId, dataType, anchors, extra = {}) => ({
  masterId, dataType, locator: masterId, printedPageHint: null, anchors, mechanismId: 'fixture', ...extra,
});

const fixtureBuild = (pageTexts, targets) => {
  const bytes = Buffer.from('controlled-inventory-fixture', 'utf8');
  return buildVibrationMasterSourceInventory(bytes, {
    binary: 'pdftotext', version: 'pdftotext fixture',
    pages: pageTexts.map((text, index) => ({ pdfPageNumber: index + 1, text })),
  }, { expectedGitBlob: gitBlobSha1Hex(bytes), expectedSizeBytes: bytes.length, fileName: 'fixture.pdf', targets });
};

test('inventory source identity is pinned to issue 450 controlled EI PDF', () => {
  assert.equal(VIBRATION_MASTER_SOURCE_INVENTORY_SCHEMA, 'VibrationMasterSourceInventory.v1');
  assert.equal(VIBRATION_MASTER_EXPECTED_GIT_BLOB, '9d3eccc56429411e17c07a579bdebbd13cb0bdc5');
  assert.equal(VIBRATION_MASTER_EXPECTED_SIZE_BYTES, 10348594);
});

test('source identity fails closed on wrong blob and wrong size', () => {
  const bytes = Buffer.from('fixture', 'utf8');
  const blob = gitBlobSha1Hex(bytes);
  assert.deepEqual(assertExpectedVibrationMasterSource(bytes, { expectedGitBlob: blob, expectedSizeBytes: bytes.length }), {
    gitBlobSha1: blob, sizeBytes: bytes.length,
  });
  assert.throws(() => assertExpectedVibrationMasterSource(Buffer.from('wrong'), { expectedGitBlob: blob, expectedSizeBytes: bytes.length }), /SOURCE_MISMATCH/u);
  assert.throws(() => assertExpectedVibrationMasterSource(bytes, { expectedGitBlob: blob, expectedSizeBytes: bytes.length + 1 }), /SOURCE_SIZE_MISMATCH/u);
});

test('CLI verifies source bytes before launching pdftotext', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibration-master-inventory-'));
  const input = path.join(dir, 'wrong.pdf');
  const marker = path.join(dir, 'binary-was-called');
  const fakeBinary = path.join(dir, 'fake-pdftotext.sh');
  fs.writeFileSync(input, 'definitely-not-the-controlled-pdf');
  fs.writeFileSync(fakeBinary, `#!/bin/sh\ntouch "${marker}"\nexit 0\n`);
  fs.chmodSync(fakeBinary, 0o755);
  try {
    assert.throws(() => runVibrationMasterSourceInventory([input, '--pdftotext', fakeBinary]), /SOURCE_MISMATCH/u);
    assert.equal(fs.existsSync(marker), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PDF splitter preserves page identity and ignores a trailing form-feed page', () => {
  assert.deepEqual(splitPdfTextPages('a\fb\f\n').map(({ pdfPageNumber, text }) => ({ pdfPageNumber, text })), [
    { pdfPageNumber: 1, text: 'a' }, { pdfPageNumber: 2, text: 'b' },
  ]);
});

test('inventory resolves unique pages, fails ambiguous/missing targets closed, and marks curves for digitization', () => {
  const targets = [
    makeTarget('TABLE.ONE', 'TABLE', ['Table\\s+One', 'Unique\\s+row']),
    makeTarget('CURVE.ONE', 'CURVE', ['Figure\\s+One', 'Curve\\s+caption']),
    makeTarget('AMBIGUOUS.ONE', 'RULE', ['Repeated\\s+anchor']),
    makeTarget('MISSING.ONE', 'RULE', ['Never\\s+present']),
    makeTarget('EXTERNAL.ONE', 'METHOD', [], { fixedState: 'BLOCKED_SOURCE' }),
  ];
  const inventory = fixtureBuild([
    'Table One Unique row', 'Figure One Curve caption', 'Repeated anchor', 'Repeated anchor',
  ], targets);
  const byId = Object.fromEntries(inventory.targets.map((entry) => [entry.masterId, entry]));
  assert.equal(byId['TABLE.ONE'].sourceState, 'SOURCE_PINNED');
  assert.equal(byId['TABLE.ONE'].pdfPage, 1);
  assert.equal(byId['CURVE.ONE'].recoveryAction, 'FIGURE_DIGITIZATION_REQUIRED');
  assert.equal(byId['AMBIGUOUS.ONE'].sourceState, 'RECONCILIATION_REQUIRED');
  assert.equal(byId['MISSING.ONE'].sourceState, 'SOURCE_NOT_LOCATED');
  assert.equal(byId['EXTERNAL.ONE'].sourceState, 'BLOCKED_SOURCE');
  assert.deepEqual(inventory.summary.figureDigitizationRequired, [{ masterId: 'CURVE.ONE', pdfPage: 2 }]);
});

test('inventory publishes hashes and locators but no extracted source text or authority promotion', () => {
  const inventory = fixtureBuild(['Table One Unique row'], [makeTarget('TABLE.ONE', 'TABLE', ['Table\\s+One', 'Unique\\s+row'])]);
  assert.match(inventory.source.sha256, /^sha256:[0-9a-f]{64}$/u);
  assert.match(inventory.targets[0].pageTextSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(Object.hasOwn(inventory.targets[0], 'text'), false);
  assert.deepEqual(inventory.authority, {
    engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false,
  });
});

test('operator command and FIT/VIB release manifest include the inventory gate', async () => {
  const pkg = JSON.parse(source('package.json'));
  assert.equal(pkg.scripts['inventory:vibration-master-sources'], 'node scripts/inventory-vibration-master-sources.mjs');
  const release = await import('../scripts/verify-vibration-fit-release.mjs');
  assert(release.listVibrationFitReleaseTests().includes('tests/vibration-master-source-inventory.test.mjs'));
});
