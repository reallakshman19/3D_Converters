import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  FLANGE_MASTER_DATASET_UNRESOLVED,
  buildFlangeMasterStore,
} from '../converters/engineering-calculations/flange/master-dataset.js';
import { validateFlangeMasterStore } from '../converters/engineering-calculations/flange/master-store.js';
import {
  BOLT_MASTER_DATASET_UNRESOLVED,
  buildBoltMasterStore,
} from '../converters/engineering-calculations/bolts/master-dataset.js';
import { validateBoltMasterStore } from '../converters/engineering-calculations/bolts/master-store.js';
import { resolveGasketReactionDiameter } from '../converters/engineering-calculations/flange/ug44-input-resolution.js';
import {
  calculateShortFormTorque,
  calculateTargetPreload,
} from '../converters/engineering-calculations/bolts/short-form.js';

const flange = buildFlangeMasterStore();
const bolt = buildBoltMasterStore();

const rowFixture = JSON.parse(
  fs.readFileSync(new URL('./fixtures/flange-ug44-workbook-rows.json', import.meta.url), 'utf8'),
);
const oracleFixture = JSON.parse(
  fs.readFileSync(new URL('./fixtures/bolt-torque-workbook-oracles.json', import.meta.url), 'utf8'),
);
const manifest = new Map(
  fs.readFileSync(
    new URL('../docs/engineering-calculations/source-archive/bolted-joints-flanges/SHA256SUMS.txt', import.meta.url),
    'utf8',
  )
    .split('\n').filter(Boolean)
    .map((line) => { const [sha, name] = line.split('  '); return [name, sha]; }),
);

function allRecords(store) {
  return Object.values(store.collections).flat();
}

test('both datasets validate against their stores', () => {
  assert.deepEqual(validateFlangeMasterStore(flange), { ok: true, errors: [] });
  assert.deepEqual(validateBoltMasterStore(bolt), { ok: true, errors: [] });
});

test('neither store can be used for design authority', () => {
  for (const store of [flange, bolt]) {
    assert.equal(store.canUseForDesignAuthority, false);
    assert.equal(store.authorityCeiling, 'ENGINEERING_SANDBOX');
    assert.equal(store.interpolationPolicy, 'EXACT_MATCH_ONLY');
  }
});

test('no record claims an authority above the sandbox ceiling', () => {
  for (const record of [...allRecords(flange), ...allRecords(bolt)]) {
    assert.ok(
      ['NONE', 'TEST_ONLY', 'ENGINEERING_SANDBOX'].includes(record.useAuthority),
      `${record.recordId} declares ${record.useAuthority}`,
    );
    assert.notEqual(record.useAuthority, 'DESIGN_AUTHORITY');
  }
});

test('every source record is hash-pinned to a file in the custody manifest', () => {
  const sources = [...flange.collections.sources, ...bolt.collections.sources];
  assert.equal(sources.length, 3);

  for (const source of sources) {
    const name = source.path.split('/').pop();
    assert.ok(manifest.has(name), `${source.path} is not in the custody manifest`);
    assert.equal(manifest.get(name), source.sha256, `${source.path} hash drifted from the manifest`);
  }
});

test('every non-source record cites a source that exists in its store', () => {
  for (const store of [flange, bolt]) {
    const sourceIds = new Set(store.collections.sources.map((item) => item.sourceId));
    for (const [collection, rows] of Object.entries(store.collections)) {
      if (collection === 'sources') continue;
      for (const record of rows) {
        assert.ok(sourceIds.has(record.sourceId), `${record.recordId} cites unknown source ${record.sourceId}`);
      }
    }
  }
});

// --- the constraint that governs this dataset -------------------------------

test('gasket geometry records never store a reaction diameter', () => {
  const rows = flange.collections.gasketGeometries;
  assert.ok(rows.length > 0);

  for (const record of rows) {
    assert.equal(record.gasketReactionDiameterMm, undefined, `${record.recordId} stores a reaction diameter`);
    assert.equal(record.gasketReactionDiameterM, undefined, `${record.recordId} stores a reaction diameter`);
    assert.equal(record.reactionDiameterBasis, 'DERIVE_AT_USE');
    assert.ok(Number.isFinite(record.innerDiameterMm));
    assert.ok(Number.isFinite(record.outerDiameterMm));
  }
});

test('G derived from stored geometry reproduces every transcribed workbook row', () => {
  const byKey = new Map(flange.collections.gasketGeometries
    .map((record) => [`${record.nominalSizeIn}/${record.pressureClass}`, record]));

  for (const row of rowFixture.rows) {
    const record = byKey.get(`${row.nominalSizeIn}/${row.pressureClass}`);
    assert.ok(record, `no gasket record for ${row.nominalSizeIn}" class ${row.pressureClass}`);

    const derived = resolveGasketReactionDiameter({
      gasketInnerDiameter: record.innerDiameterMm / 1000,
      gasketOuterDiameter: record.outerDiameterMm / 1000,
    });
    assert.ok(
      Math.abs(derived.gasketReactionDiameterM - row.gasketReactionDiameterM) < 1e-12,
      `${row.nominalSizeIn}" class ${row.pressureClass}: derived G does not match the source row`,
    );
  }
});

// --- coverage and declared gaps ---------------------------------------------

test('the flange dataset covers the full transcribed size and class matrix', () => {
  assert.equal(flange.collections.momentFactors.length, 84);
  assert.equal(flange.collections.gasketGeometries.length, 84);
  assert.equal(flange.collections.flangeRatings.length, 4);
  assert.equal(new Set(flange.collections.momentFactors.map((r) => r.nominalSizeIn)).size, 21);
  assert.deepEqual(
    flange.collections.flangeRatings.map((r) => r.pressureClass).sort((a, b) => a - b),
    [150, 300, 600, 900],
  );
});

test('moment factors match the transcribed rows exactly', () => {
  const byKey = new Map(flange.collections.momentFactors
    .map((record) => [`${record.nominalSizeIn}/${record.pressureClass}`, record.momentFactor]));
  for (const row of rowFixture.rows) {
    assert.equal(byKey.get(`${row.nominalSizeIn}/${row.pressureClass}`), row.momentFactor);
  }
});

test('pressure ratings carry no temperature or material group, and say so', () => {
  for (const record of flange.collections.flangeRatings) {
    assert.equal(record.temperatureC, null);
    assert.equal(record.materialGroup, null);
    assert.equal(record.standardEdition, null);
  }
  const unresolved = FLANGE_MASTER_DATASET_UNRESOLVED.join(' ');
  assert.match(unresolved, /temperature is not stated/u);
  assert.match(unresolved, /material group is not stated/u);
  assert.match(unresolved, /governing B16\.5 \/ B16\.47 edition is not stated/u);
});

// --- bolt materials ---------------------------------------------------------

test('reproducible bolt materials reproduce the source torque table', () => {
  const { nutFactorUsed, minFraction } = oracleFixture.oracles.shortFormBs3580.parameters;
  const row = oracleFixture.oracles.shortFormBs3580.rows.find((item) => item.nominalDiameterMm === 20);
  const thread = bolt.collections.threads.find((item) => item.designation === 'M20');

  for (const grade of oracleFixture.oracles.shortFormBs3580.reproducibleGrades) {
    const material = bolt.collections.materials.find((item) => item.grade === grade);
    assert.ok(material, `${grade} missing from the dataset`);
    assert.equal(material.reproducesSourceTable, true);

    const preload = calculateTargetPreload({
      tensileStressAreaM2: thread.tensileStressAreaM2,
      referenceStressPa: material.referenceStrengthPa,
      preloadFraction: minFraction,
    });
    const torque = calculateShortFormTorque({
      preloadN: preload.targetPreloadN,
      nominalDiameterM: thread.nominalDiameterM,
      nutFactor: nutFactorUsed,
    }).torqueNm;

    assert.ok(
      Math.abs(torque - row.grades[grade].minNm) / row.grades[grade].minNm < 1e-9,
      `${grade} does not reproduce the source Min cell`,
    );
  }
});

test('the unresolved Titanium grade is recorded but made unusable', () => {
  const titanium = bolt.collections.materials.find((item) => item.grade === 'Titanium');

  assert.ok(titanium, 'the gap should be visible, not omitted');
  assert.equal(titanium.useAuthority, 'NONE');
  assert.equal(titanium.recordState, 'SOURCE_PENDING');
  assert.equal(titanium.referenceStrengthMPa, null);
  assert.equal(titanium.referenceStrengthPa, undefined);
  assert.equal(titanium.statedReferenceStrengthMPa, 275);
  assert.equal(titanium.reproducesSourceTable, false);
  assert.match(titanium.unresolvedReason, /does not reproduce/u);
  assert.match(BOLT_MASTER_DATASET_UNRESOLVED.join(' '), /Titanium reference strength does not reproduce/u);
});

test('bolt threads and friction conditions match the source tables', () => {
  const metric = bolt.collections.threads.filter((item) => item.series === 'METRIC_COARSE');
  assert.equal(metric.length, oracleFixture.oracles.shortFormBs3580.rows.length);

  for (const row of oracleFixture.oracles.shortFormBs3580.rows) {
    const record = metric.find((item) => item.nominalDiameterMm === row.nominalDiameterMm);
    assert.ok(record, `M${row.nominalDiameterMm} missing`);
    assert.equal(record.tensileStressAreaMm2, row.tensileStressAreaMm2);
  }

  const factors = bolt.collections.frictionConditions.map((item) => item.nutFactor);
  assert.equal(factors.length, 7);
  assert.equal(Math.min(...factors), 0.12);
  assert.equal(Math.max(...factors), 0.3);
  for (const record of bolt.collections.frictionConditions) {
    assert.equal(record.measured, false);
    assert.match(record.note, /needs a measured nut factor/u);
  }
});

test('a record promoted to design authority is rejected by the store', () => {
  const tampered = buildFlangeMasterStore();
  tampered.collections.momentFactors[0].useAuthority = 'DESIGN_AUTHORITY';
  const validation = validateFlangeMasterStore(tampered);

  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => /exceeds the v1 authority ceiling/u.test(error)));
});
