import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVibrationMasterRegistry,
  hashVibrationMasterContent,
  resolveVibrationMaster,
  sealVibrationMaster,
  transitionVibrationMasterPublication,
  withVibrationMaster,
} from '../converters/vibration/masters/index.js';

function fixture(overrides = {}) {
  return {
    schema: 'VibrationMaster.v1',
    masterId: 'TEST.VIBRATION.MASTER',
    methodId: 'TEST.METHOD',
    edition: 'test-edition',
    revision: '1',
    source: {
      repository: 'example/source',
      commit: '1111111111111111111111111111111111111111',
      path: 'controlled-source.pdf',
      gitBlobSha1: '2222222222222222222222222222222222222222',
      sizeBytes: 1234,
      locator: { sourceType: 'TABLE', identifier: 'Table X-1', printedPage: '10', pdfPage: 12 },
    },
    dataSchema: 'SyntheticMasterData.v1',
    data: { rows: [{ key: 'A', value: 1, unit: 'm' }] },
    applicability: { phase: ['SYNTHETIC'] },
    publicationState: 'CANDIDATE',
    ...overrides,
  };
}

function changedFixture(change) {
  const base = fixture();
  return change(base);
}

test('content hash is stable across object-key order', async () => {
  const left = fixture({ data: { meta: { b: 2, a: 1 }, rows: [{ unit: 'm', value: 1, key: 'A' }] } });
  const right = fixture({ data: { rows: [{ key: 'A', value: 1, unit: 'm' }], meta: { a: 1, b: 2 } } });
  assert.equal(await hashVibrationMasterContent(left), await hashVibrationMasterContent(right));
});

test('publication state does not change engineering content hash', async () => {
  const candidate = fixture({ publicationState: 'CANDIDATE' });
  const active = fixture({ publicationState: 'ACTIVE' });
  assert.equal(await hashVibrationMasterContent(candidate), await hashVibrationMasterContent(active));
});

test('data, unit and source-locator drift each change content hash', async () => {
  const base = await hashVibrationMasterContent(fixture());
  const value = await hashVibrationMasterContent(changedFixture((master) => ({ ...master, data: { rows: [{ key: 'A', value: 2, unit: 'm' }] } })));
  const unit = await hashVibrationMasterContent(changedFixture((master) => ({ ...master, data: { rows: [{ key: 'A', value: 1, unit: 'mm' }] } })));
  const locator = await hashVibrationMasterContent(changedFixture((master) => ({ ...master, source: { ...master.source, locator: { ...master.source.locator, identifier: 'Table X-2' } } })));
  assert.notEqual(base, value);
  assert.notEqual(base, unit);
  assert.notEqual(base, locator);
});

test('sealing normalizes Git blob SHA and freezes nested content', async () => {
  const sealed = await sealVibrationMaster(fixture());
  assert.match(sealed.contentHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(sealed.source.gitBlobSha1, `sha1:${'2'.repeat(40)}`);
  assert(Object.isFrozen(sealed.data.rows[0]));
  assert.throws(() => { sealed.data.rows[0].value = 99; }, TypeError);
});

test('provided content hash must match canonical content', async () => {
  await assert.rejects(
    sealVibrationMaster(fixture({ contentHash: `sha256:${'0'.repeat(64)}` })),
    /VIBRATION_MASTER_CONTENT_HASH_MISMATCH/u,
  );
});

test('non-finite engineering values are rejected rather than serialized as null', async () => {
  await assert.rejects(
    sealVibrationMaster(fixture({ data: { rows: [{ key: 'A', value: Number.NaN, unit: 'm' }] } })),
    /VIBRATION_MASTER_NONFINITE_NUMBER/u,
  );
});

test('registry resolves only the active revision and returns provenance', async () => {
  const registry = await buildVibrationMasterRegistry([
    fixture({ revision: '1', publicationState: 'ACTIVE' }),
    fixture({ revision: '2', publicationState: 'CANDIDATE' }),
  ]);
  const resolved = resolveVibrationMaster(registry, 'TEST.VIBRATION.MASTER');
  assert.equal(resolved.master.revision, '1');
  assert.equal(resolved.provenance.masterContentHash, resolved.master.contentHash);
  assert.equal(resolved.provenance.sourceLocator.identifier, 'Table X-1');
});

test('adding a candidate revision cannot mutate the active revision', async () => {
  const original = await buildVibrationMasterRegistry([fixture({ revision: '1', publicationState: 'ACTIVE' })]);
  const next = await withVibrationMaster(original, fixture({ revision: '2', publicationState: 'CANDIDATE', data: { rows: [{ key: 'A', value: 9, unit: 'm' }] } }));
  assert.equal(resolveVibrationMaster(original, 'TEST.VIBRATION.MASTER').master.revision, '1');
  assert.equal(resolveVibrationMaster(next, 'TEST.VIBRATION.MASTER').master.revision, '1');
  assert.equal(original.records.length, 1);
  assert.equal(next.records.length, 2);
});

test('unknown, candidate-only and retired-only masters fail with distinct codes', async () => {
  const candidate = await buildVibrationMasterRegistry([fixture()]);
  const retired = await buildVibrationMasterRegistry([fixture({ publicationState: 'RETIRED' })]);
  assert.throws(() => resolveVibrationMaster(candidate, 'UNKNOWN'), /VIBRATION_MASTER_KEY_UNKNOWN/u);
  assert.throws(() => resolveVibrationMaster(candidate, 'TEST.VIBRATION.MASTER'), /VIBRATION_MASTER_NOT_ACTIVE/u);
  assert.throws(() => resolveVibrationMaster(retired, 'TEST.VIBRATION.MASTER'), /VIBRATION_MASTER_RETIRED/u);
});

test('duplicate revision identity is rejected', async () => {
  await assert.rejects(
    buildVibrationMasterRegistry([fixture(), fixture()]),
    /VIBRATION_MASTER_REVISION_DUPLICATE/u,
  );
});

test('multiple active revisions for one master are rejected', async () => {
  await assert.rejects(
    buildVibrationMasterRegistry([
      fixture({ revision: '1', publicationState: 'ACTIVE' }),
      fixture({ revision: '2', publicationState: 'ACTIVE' }),
    ]),
    /VIBRATION_MASTER_ACTIVE_CONFLICT/u,
  );
});

test('source identity and locator are mandatory', async () => {
  await assert.rejects(
    sealVibrationMaster(fixture({ source: { ...fixture().source, locator: null } })),
    /VIBRATION_MASTER_SOURCE_LOCATOR_REQUIRED/u,
  );
});

test('publication transition is explicit, immutable and preserves content hash', async () => {
  const candidate = await buildVibrationMasterRegistry([fixture()]);
  const active = await transitionVibrationMasterPublication(candidate, 'TEST.VIBRATION.MASTER', '1', 'ACTIVE');
  assert.equal(candidate.records[0].publicationState, 'CANDIDATE');
  assert.equal(active.records[0].publicationState, 'ACTIVE');
  assert.equal(candidate.records[0].contentHash, active.records[0].contentHash);
  const retired = await transitionVibrationMasterPublication(active, 'TEST.VIBRATION.MASTER', '1', 'RETIRED');
  assert.throws(() => resolveVibrationMaster(retired, 'TEST.VIBRATION.MASTER'), /VIBRATION_MASTER_RETIRED/u);
});

test('publication transition cannot reactivate a retired master', async () => {
  const retired = await buildVibrationMasterRegistry([fixture({ publicationState: 'RETIRED' })]);
  await assert.rejects(
    transitionVibrationMasterPublication(retired, 'TEST.VIBRATION.MASTER', '1', 'ACTIVE'),
    /VIBRATION_MASTER_PUBLICATION_TRANSITION_INVALID/u,
  );
});

test('unknown contract fields are rejected instead of silently escaping the hash', async () => {
  await assert.rejects(
    sealVibrationMaster(fixture({ interpolation: 'LINEAR' })),
    /VIBRATION_MASTER_FIELD_UNKNOWN: interpolation/u,
  );
  await assert.rejects(
    sealVibrationMaster(fixture({ source: { ...fixture().source, undocumented: true } })),
    /VIBRATION_MASTER_SOURCE_FIELD_UNKNOWN: undocumented/u,
  );
});
