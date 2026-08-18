import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeSupportIdentity,
  readSourcePosition,
  sourceSupportIdentities,
} from '../converters/xml-cii2019-core/source-schema-adapter.js';
import {
  buildStagedSupportIndex,
  xmlCiiRestraintEntriesFromSupportMatch,
} from '../converters/xml-cii2019-core/support-mapping.js';
import {
  buildStagedDtxrIndex,
  buildStagedDtxrPositionIndex,
} from '../converters/xml-cii2019-core/dtxr-resolver-core.js';

const config = {
  coordinateTolerance: 1,
  useRestraintTypeBasedOnJson: true,
  sourceSchema: {
    fields: {
      objectName: ['OBJ_NAME'],
      objectType: ['OBJ_TYPE'],
      directLink: ['LINK_TO'],
      supportGroupRef: ['SUPPORT_GROUP'],
      parentRef: ['PARENT'],
      previousRef: ['PREVIOUS'],
      componentRef: ['REF_NO'],
      supportType: ['SUPPORT_CODE'],
      supportFunction: ['SUPPORT_FUNCTION'],
      supportGap: ['CLEARANCE'],
      dtxr: ['DESCRIPTION_TEXT'],
      position: ['XYZ'],
    },
    identity: {
      supportPrefixes: ['PS', 'SL'],
      allowOptionalHyphen: true,
      allowHierarchicalSuffix: true,
    },
  },
  coordinateAlignment: {
    mode: 'MANUAL',
    manualOffsetMm: { x: 0, y: 0, z: 100000 },
    applyToFields: ['XYZ'],
    matchToleranceMm: 6,
  },
};

const coordinate = { x: 854513.44, y: 3934222.04, z: 6100 };
const staged = JSON.stringify({
  name: 'SUPPORT SL-1847103 (REF)',
  type: 'BRANCH',
  attributes: { PARENT: '/ASIM/BRANCH' },
  children: [
    {
      name: 'REST',
      type: 'SUPPORT',
      attributes: {
        OBJ_NAME: '/SL-1847103.2.1',
        OBJ_TYPE: 'ANCI',
        SUPPORT_GROUP: 'SL-1847103 (REF)',
        LINK_TO: '/SL-1847103.1.1',
        SUPPORT_CODE: 'PIPE-REST',
        SUPPORT_FUNCTION: 'PIPE-REST',
        DESCRIPTION_TEXT: 'REST',
        REF_NO: '=1006649732/143989',
        XYZ: coordinate,
      },
    },
    {
      name: 'GUIDE',
      type: 'SUPPORT',
      attributes: {
        OBJ_NAME: '/SL-1847103.1.2',
        OBJ_TYPE: 'ANCI',
        SUPPORT_GROUP: 'SL-1847103 (REF)',
        LINK_TO: '/SL-1847103.1.1',
        SUPPORT_CODE: 'GT500',
        SUPPORT_FUNCTION: 'GT',
        DESCRIPTION_TEXT: 'GUIDE',
        CLEARANCE: 'GAP=10mm',
        XYZ: coordinate,
      },
    },
    {
      name: 'LINESTOP',
      type: 'SUPPORT',
      attributes: {
        OBJ_NAME: '/SL-1847103.1.3',
        OBJ_TYPE: 'ANCI',
        SUPPORT_GROUP: 'SL-1847103 (REF)',
        LINK_TO: '/SL-1847103.1.1',
        SUPPORT_CODE: 'ST501',
        SUPPORT_FUNCTION: 'ST',
        DESCRIPTION_TEXT: 'LINE STOP',
        CLEARANCE: 'GAP=35mm',
        XYZ: coordinate,
      },
    },
  ],
});

test('support identity grammar accepts SL, PS without hyphen, and arbitrary suffix depth', () => {
  assert.equal(normalizeSupportIdentity('/SL-1847103.2.1', config), 'SL-1847103.2.1');
  assert.equal(normalizeSupportIdentity('PS03568.2', config), 'PS-03568.2');
});

test('configured source position applies the manual Z offset only through the configured field', () => {
  const resolved = readSourcePosition({ attributes: { XYZ: coordinate } }, config);
  assert.deepEqual(resolved.rawPoint, coordinate);
  assert.deepEqual(resolved.point, { ...coordinate, z: 106100 });
  assert.equal(resolved.field, 'XYZ');
});

test('explicit support links/group identity expand a tag hit to the complete support assembly', () => {
  const diagnostics = [];
  const index = buildStagedSupportIndex(staged, config, diagnostics);
  assert.equal(index.count, 3);

  const byExactName = index.byTag.get('SL-1847103.2.1') || [];
  assert.equal(byExactName.length, 3);
  assert.deepEqual(new Set(byExactName.map((item) => item.primaryKind)), new Set(['REST', 'GUIDE', 'LINESTOP']));

  const coordKey = [854513.44, 3934222.04, 106100].map((value) => Math.round(value)).join('|');
  const byCoordinate = index.byCoord.get(coordKey) || [];
  assert.equal(byCoordinate.length, 3);

  const guide = byExactName.find((item) => item.primaryKind === 'GUIDE');
  const stop = byExactName.find((item) => item.primaryKind === 'LINESTOP');
  const guideEntry = xmlCiiRestraintEntriesFromSupportMatch(guide, null, config)[0];
  const stopEntry = xmlCiiRestraintEntriesFromSupportMatch(stop, null, config)[0];
  assert.equal(guideEntry.type, 'GUI');
  assert.equal(guideEntry.gap, '10');
  assert.equal(guideEntry.cmpSupGap, 'GAP=10mm');
  assert.equal(stopEntry.type, 'LIM');
  assert.equal(stopEntry.gap, '35');
  assert.equal(stopEntry.cmpSupGap, 'GAP=35mm');
});

test('DTXR indexes use the same field adapter and coordinate alignment', () => {
  const index = buildStagedDtxrIndex(staged, config);
  const relationHits = index.byPsTag.get('SL-1847103.2.1') || [];
  assert.equal(relationHits.length, 3);
  assert.ok(relationHits.some((item) => item.cmpSupGap === 'GAP=35mm'));

  const positionIndex = buildStagedDtxrPositionIndex(staged, config);
  assert.equal(positionIndex.count, 3);
  assert.ok(positionIndex.entries.every((entry) => entry.point.z === 106100));
  assert.ok(positionIndex.entries.some((entry) => entry.cmpSupGap === 'GAP=35mm'));
});

test('source support identities include explicit group and link evidence', () => {
  const value = {
    attributes: {
      OBJ_NAME: '/SL-1844032.1.3',
      SUPPORT_GROUP: 'SL-1844032 (REF)',
      LINK_TO: '/SL-1844032.1.1',
      PREVIOUS: 'PS01716.3',
    },
  };
  const identities = sourceSupportIdentities(value, config);
  assert.ok(identities.includes('SL-1844032.1.3'));
  assert.ok(identities.includes('SL-1844032'));
  assert.ok(identities.includes('SL-1844032.1.1'));
  assert.ok(identities.includes('PS-01716.3'));
});
