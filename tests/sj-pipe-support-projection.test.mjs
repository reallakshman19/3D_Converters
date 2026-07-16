import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(repoRoot, 'tabs', 'stagedjson-to-enrichxml');
const tempRoot = mkdtempSync(join(tmpdir(), 'pipe-support-projection-'));
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');
for (const file of [
  'sj-pipe-support-projection.js',
  'sj-pipe-support-family.js',
  'sj-pipe-support-geometry.js',
  'sj-pipe-support-utils.js',
  'sj-point-resolver.js',
  'sj-restraint-resolver.js',
]) {
  copyFileSync(join(sourceRoot, file), join(tempRoot, file));
}
const projection = await import(pathToFileURL(join(tempRoot, 'sj-pipe-support-projection.js')).href);
const {
  buildPipeSupportProjectionBundle,
  deriveSupportFamilyIdentity,
} = projection;

test.after(() => rmSync(tempRoot, { recursive: true, force: true }));

const branchId = '/ASIM-1885-6"-S8810111-91261M7-HC-01/B2';

function support(name, pos, extra = {}, index = 10) {
  return {
    name: 'SUPPORT PS-12061',
    type: 'ATTA',
    sourceBranchName: branchId,
    path: [0, 'children', index],
    attributes: {
      NAME: name,
      OWNER: branchId,
      POS: pos,
      SUPPORT_TAG: 'PS-12061',
      CMPSUPREFN: 'PS-12061(REF)',
      ...extra,
    },
  };
}

test('family identity is derived from authoritative attributes.NAME forms', () => {
  assert.deepEqual(deriveSupportFamilyIdentity('/PS-12061/DATUM'), {
    familyId: '/PS-12061',
    familyIdBasis: 'DERIVED_FROM_ATTRIBUTES_NAME',
  });
  assert.deepEqual(deriveSupportFamilyIdentity('/PS-12061.2'), {
    familyId: '/PS-12061',
    familyIdBasis: 'DERIVED_FROM_ATTRIBUTES_NAME',
  });
});

test('groups DATUM, shoe, wear plate and SREF as siblings under one carrier family', () => {
  const carriers = [{
    carrierId: `PIPE AUTO ${branchId} 1`,
    carrierType: 'PIPE',
    sourceBranchId: branchId,
    sourceSequenceIndex: 1,
    centerline: {
      start: { x: 440517.219, y: -1159925, z: 1157.2 },
      end: { x: 437752.219, y: -1159925, z: 1157.2 },
      lengthMm: 2765,
    },
    traversal: {
      sourceStartField: 'APOS',
      traversalStartField: 'APOS',
      reversedForTraversal: false,
    },
  }];
  const pos = { x: 438667.219, y: -1159925, z: 1157.2 };
  const supportRecords = [
    support('/PS-12061/DATUM', pos, { CMPSUPTYPE: 'REST', REF: '=1006649732/51400' }, 2),
    support('/PS-12061.1', pos, { CMPSUPTYPE: 'SH-150', STEX: '/PS-12061.1', MDSCP3: 'SHOE' }, 3),
    support('/PS-12061.2', pos, { CMPSUPTYPE: 'W.PAD THK 6mm', DTXR: 'WEAR PLATE TYPE-421 PAD L 550mm' }, 4),
    support('/PS-12061/SREF', pos, { DTXR: 'PIPE SUPPORT TYPE-105' }, 5),
  ];

  const originalCenterline = structuredClone(carriers[0].centerline);
  const bundle = buildPipeSupportProjectionBundle({ branchId, carriers, supportRecords });

  assert.equal(bundle.schema, 'PipeSupportProjectionBundle.v1');
  assert.equal(bundle.carriers.length, 1);
  assert.deepEqual(carriers[0].centerline, originalCenterline, 'input carrier coordinates must not be mutated');
  assert.equal(bundle.carriers[0].supportFamilies.length, 1);

  const family = bundle.carriers[0].supportFamilies[0];
  assert.equal(family.familyId, '/PS-12061');
  assert.equal(family.familyIdBasis, 'DERIVED_FROM_ATTRIBUTES_NAME');
  assert.equal(family.carrierBinding.bindingStatus, 'RESOLVED');
  assert.deepEqual(family.carrierBinding.bindingBasis, ['SOURCE_OWNER', 'CENTERLINE_PROJECTION', 'SOURCE_SEQUENCE']);
  assert.equal(family.position.positionStatus, 'ON_CENTERLINE');
  assert.equal(family.position.carrierStationMm, 1850);
  assert.equal(family.position.carrierFraction, 0.669078);
  assert.deepEqual(family.members.map((member) => member.semanticRole), [
    'DATUM', 'PIPE_SHOE', 'WEAR_PLATE', 'STRUCTURAL_REFERENCE',
  ]);
  assert.deepEqual(family.members.map((member) => member.memberId), [
    '/PS-12061/DATUM', '/PS-12061.1', '/PS-12061.2', '/PS-12061/SREF',
  ]);
  assert.ok(family.members.every((member) => member.memberIdentitySource === 'attributes.NAME'));
  assert.ok(family.members.every((member) => member.physicalGeometryAvailable === false));
  assert.equal(family.resolvedFunction.supportKind, 'REST');
  assert.deepEqual(family.localFrame, {
    origin: { x: 438667.219, y: -1159925, z: 1157.2 },
    tangent: { x: -1, y: 0, z: 0 },
    lateral: { x: 0, y: -1, z: 0 },
    vertical: { x: 0, y: 0, z: 1 },
    handedness: 'RIGHT_HANDED',
    frameStatus: 'RESOLVED',
  });

  assert.equal(bundle.supportGlyphs.length, 1);
  assert.deepEqual(bundle.supportGlyphs[0], {
    familyId: '/PS-12061',
    carrierId: `PIPE AUTO ${branchId} 1`,
    carrierStationMm: 1850,
    centerlinePointGlobal: pos,
    offsetFromCenterline: { lateralMm: 0, verticalMm: 0 },
    fittingLocation: null,
    displayKind: 'REST',
    label: 'PS-12061',
    resolutionStatus: 'RESOLVED',
  });
});

test('station follows validated traversal start when source component is reversed', () => {
  const carriers = [{
    carrierId: 'PIPE-REVERSED',
    carrierType: 'PIPE',
    sourceBranchId: branchId,
    attributes: {
      APOS: { x: 0, y: 0, z: 0 },
      LPOS: { x: 1000, y: 0, z: 0 },
    },
    traversal: {
      sourceStartField: 'APOS',
      traversalStartField: 'LPOS',
      reversedForTraversal: true,
    },
  }];
  const supportRecords = [support('/PS-REV/DATUM', { x: 250, y: 0, z: 0 }, { SUPPORT_TAG: 'PS-REV' })];
  const bundle = buildPipeSupportProjectionBundle({ branchId, carriers, supportRecords });
  const family = bundle.carriers[0].supportFamilies[0];

  assert.deepEqual(bundle.carriers[0].centerline, {
    start: { x: 1000, y: 0, z: 0 },
    end: { x: 0, y: 0, z: 0 },
    lengthMm: 1000,
  });
  assert.equal(family.position.carrierStationMm, 750);
  assert.equal(family.position.carrierFraction, 0.75);
  assert.deepEqual(family.traversal, {
    sourceStartField: 'APOS',
    traversalStartField: 'LPOS',
    reversedForTraversal: true,
  });
});

test('out-of-tolerance family remains unresolved and produces no glyph', () => {
  const carriers = [{
    carrierId: 'PIPE-1',
    carrierType: 'PIPE',
    sourceBranchId: branchId,
    centerline: { start: { x: 0, y: 0, z: 0 }, end: { x: 1000, y: 0, z: 0 } },
  }];
  const supportRecords = [support('/PS-FAR/DATUM', { x: 500, y: 84, z: 0 }, { SUPPORT_TAG: 'PS-FAR' })];
  const bundle = buildPipeSupportProjectionBundle({
    branchId,
    carriers,
    supportRecords,
    projectionToleranceMm: 50,
  });

  assert.equal(bundle.carriers[0].supportFamilies.length, 0);
  assert.equal(bundle.supportGlyphs.length, 0);
  assert.equal(bundle.unresolvedSupportFamilies.length, 1);
  const family = bundle.unresolvedSupportFamilies[0];
  assert.equal(family.carrierBinding.bindingStatus, 'UNRESOLVED');
  assert.equal(family.carrierBinding.carrierId, 'PIPE-1');
  assert.equal(family.position.positionStatus, 'OUTSIDE_PROJECTION_TOLERANCE');
  assert.equal(family.position.offsetFromCenterline.radialDistanceMm, 84);
});

test('support at a fitting port uses component-port attachment format', () => {
  const carriers = [{
    carrierId: '=1006649732/51208',
    carrierType: 'ELBO',
    sourceBranchId: branchId,
    fittingGeometry: {
      componentCentre: { x: 100, y: 100, z: 0 },
      ports: [
        {
          portId: 'A',
          locationType: 'INLET_PORT',
          point: { x: 0, y: 100, z: 0 },
          tangent: { x: 1, y: 0, z: 0 },
        },
        {
          portId: 'B',
          locationType: 'OUTLET_PORT',
          point: { x: 100, y: 200, z: 0 },
          tangent: { x: 0, y: 1, z: 0 },
        },
      ],
    },
  }];
  const supportRecords = [support('/PS-ELBO/DATUM', { x: 100, y: 200, z: 0 }, { SUPPORT_TAG: 'PS-ELBO' })];
  const bundle = buildPipeSupportProjectionBundle({ branchId, carriers, supportRecords });
  const family = bundle.carriers[0].supportFamilies[0];

  assert.equal(family.position.positionStatus, 'ATTACHED_TO_COMPONENT_PORT');
  assert.deepEqual(family.position.fittingLocation, {
    locationType: 'OUTLET_PORT',
    nearestCenterlinePointGlobal: { x: 100, y: 200, z: 0 },
    portId: 'B',
  });
  assert.equal(family.position.carrierStationMm, null);
  assert.equal(family.localFrame.handedness, 'RIGHT_HANDED');
});

test('families on one carrier are ordered by station, not source record order', () => {
  const carriers = [{
    carrierId: 'PIPE-ORDER',
    carrierType: 'PIPE',
    sourceBranchId: branchId,
    centerline: { start: { x: 0, y: 0, z: 0 }, end: { x: 1000, y: 0, z: 0 } },
  }];
  const supportRecords = [
    support('/PS-LATE/DATUM', { x: 900, y: 0, z: 0 }, { SUPPORT_TAG: 'PS-LATE' }, 1),
    support('/PS-EARLY/DATUM', { x: 100, y: 0, z: 0 }, { SUPPORT_TAG: 'PS-EARLY' }, 2),
  ];
  const bundle = buildPipeSupportProjectionBundle({ branchId, carriers, supportRecords });
  assert.deepEqual(bundle.carriers[0].supportFamilies.map((family) => family.familyId), ['/PS-EARLY', '/PS-LATE']);
});

test('resolved family carries the compact supportGlyph beside full member evidence', () => {
  const carriers = [{
    carrierId: 'PIPE-GLYPH',
    carrierType: 'PIPE',
    sourceBranchId: branchId,
    centerline: { start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } },
  }];
  const bundle = buildPipeSupportProjectionBundle({
    branchId,
    carriers,
    supportRecords: [support('/PS-GLYPH/DATUM', { x: 25, y: 0, z: 0 }, { SUPPORT_TAG: 'PS-GLYPH' })],
  });
  const family = bundle.carriers[0].supportFamilies[0];
  assert.deepEqual(family.supportGlyph, bundle.supportGlyphs[0]);
  assert.equal(family.members.length, 1);
});

test('families from another source branch are excluded from the branch bundle', () => {
  const carriers = [{
    carrierId: 'PIPE-B2',
    carrierType: 'PIPE',
    sourceBranchId: branchId,
    centerline: { start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } },
  }];
  const foreign = support('/PS-FOREIGN/DATUM', { x: 50, y: 0, z: 0 }, { SUPPORT_TAG: 'PS-FOREIGN' });
  foreign.sourceBranchName = '/OTHER/B1';
  foreign.attributes.OWNER = '/OTHER/B1';
  const bundle = buildPipeSupportProjectionBundle({ branchId, carriers, supportRecords: [foreign] });
  assert.equal(bundle.carriers[0].supportFamilies.length, 0);
  assert.equal(bundle.unresolvedSupportFamilies.length, 0);
  assert.ok(bundle.diagnostics.some((row) => row.code === 'SUPPORT_FAMILY_EXCLUDED_FROM_BRANCH_BUNDLE'));
});

test('geometrically equivalent carriers remain ambiguous without sequence or explicit reference evidence', () => {
  const carriers = [
    {
      carrierId: 'PIPE-A',
      carrierType: 'PIPE',
      sourceBranchId: branchId,
      centerline: { start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } },
    },
    {
      carrierId: 'PIPE-B',
      carrierType: 'PIPE',
      sourceBranchId: branchId,
      centerline: { start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } },
    },
  ];
  const record = support('/PS-AMB/DATUM', { x: 50, y: 0, z: 0 }, { SUPPORT_TAG: 'PS-AMB' });
  delete record.path;
  const bundle = buildPipeSupportProjectionBundle({ branchId, carriers, supportRecords: [record] });
  assert.equal(bundle.supportGlyphs.length, 0);
  assert.equal(bundle.unresolvedSupportFamilies.length, 1);
  const family = bundle.unresolvedSupportFamilies[0];
  assert.equal(family.carrierBinding.bindingStatus, 'AMBIGUOUS');
  assert.equal(family.position.positionStatus, 'AMBIGUOUS_CARRIER');
  assert.deepEqual(family.carrierBinding.candidateCarrierIds, ['PIPE-A', 'PIPE-B']);
});

test('contract rejects non-millimetre coordinate units', () => {
  assert.throws(() => buildPipeSupportProjectionBundle({
    branchId,
    carriers: [],
    supportRecords: [],
    coordinateSystem: { units: 'm' },
  }), /must use millimetres/);
});
