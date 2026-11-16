import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalPsOnly, literalSupportRoot, normalizePsStripSuffixes,
} from '../tabs/xml-cii-2019-standalone/xml-cii-resolver-match-policy.js';
import {
  buildStandaloneDtxrResolutionLedger,
} from '../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';

const LINE = '/ASIM-1840-3"-S8810389-91261M7-01/B1';
const POS = { x: 1032747.41, y: 1991704.95, z: 1100 };
const XML_POS = '1032747.41 1991704.95 101100';

function xml(name, pos = XML_POS) {
  return '<Root><Branchname>' + LINE + '</Branchname><Node>' +
    '<NodeNumber>140</NodeNumber><NodeName>' + name + '</NodeName>' +
    '<ComponentType>ANCI</ComponentType><ComponentRefNo>=1006649732/148859</ComponentRefNo>' +
    '<Position>' + pos + '</Position></Node></Root>';
}

function member(name, dtxr, gap = '', reference = 'SL-1840203 (REF)', pos = POS) {
  return { type: 'SUPPORT', name: 'SUPPORT ' + reference, attributes: {
    NAME: name, CMPSUPREFN: reference, POS: pos, DTXR: dtxr,
    MDSSUPPTYPE: dtxr === 'LINESTOP' ? 'ST501' : dtxr === 'GUIDE' ? 'GT500' : 'PIPE-REST',
    CMPSUPGAP: gap, NODETYPE: '14',
  } };
}

const bm3 = JSON.stringify([{ type: 'BRANCH', name: LINE, attributes: {},
  children: [
    member('/SL-1840203.2.1', 'REST', '0'),
    member('/SL-1840203.1.1', 'PIPE SHOE'),
    member('/SL-1840203.1.2', 'LINESTOP', 'GAP=35mm'),
    member('/SL-1840203.1.3', 'GUIDE', 'GAP=10mm'),
  ],
}]);

const config = (mode, extras = {}) => ({
  resolverJsonTrace: { matchMode: mode, coordinateTolerance: 6, ...extras },
  dtxrPositionOffset: { enabled: true, xOffset: 0, yOffset: 0, zOffset: 100000 },
});

test('POS grouping applies 100000mm datum to POS (not just POSI) before 6mm matching', () => {
  const result = buildStandaloneDtxrResolutionLedger(xml('/SL-1840203.2.1'), bm3, config('POS'));
  const row = result.records[0];
  assert.equal(row.status, 'RESOLVED_POS');
  assert.equal(row.positionDistanceMm, 0);
  assert.equal(row.positionMembers.length, 4);
  assert.equal(row.positionMembers[2].name, '/SL-1840203.1.2');
  assert.equal(row.positionMembers[2].cmpSupGap, 'GAP=35mm');
  assert.equal(row.matchedPosition.z, 101100);
});

test('POS grouping checks exact coordinate tolerance and ignores matching PS identity', () => {
  const src = JSON.stringify([{ type: 'BRANCH', name: LINE, children: [
    member('/PS998.1', 'REST', '0', 'PS998 (REF)', { x: POS.x + 6.01, y: POS.y, z: POS.z }),
  ] }]);
  const row = buildStandaloneDtxrResolutionLedger(xml('/PS998'), src, config('POS')).records[0];
  assert.equal(row.status, 'UNRESOLVED');
});

test('ROOT groups BM3 members by the explicit support root, with no PS parsing or spatial dependency', () => {
  const result = buildStandaloneDtxrResolutionLedger(xml('/SL-1840203.2.1', '0 0 0'), bm3, config('ROOT', {
    psFallback: { stripSuffixes: ['INVALID REGEX ['] },
  }));
  const row = result.records[0];
  assert.equal(row.status, 'RESOLVED_ROOT');
  assert.equal(row.positionMembers.length, 4);
  assert.equal(row.dtxrPsName, 'SL-1840203');
  assert.equal(row.positionDistanceMm, null);
});

test('PS mode strips configurable terminal suffixes; does not affect ROOT identity', () => {
  const psStage = JSON.stringify([{ type: 'BRANCH', name: LINE, children: [
    member('/PS1234.1.2', 'REST', '0', 'PS1234 (REF)'),
    member('/PS1234-1', 'GUIDE', 'GAP=5mm', 'PS1234 (REF)'),
  ] }]);
  const cfg = config('PS', { psFallback: { stripSuffixes: ['.1.2', '-1'] } });
  const result = buildStandaloneDtxrResolutionLedger(xml('/PS1234', '0 0 0'), psStage, cfg);
  assert.equal(result.records[0].status, 'RESOLVED_PS_FALLBACK');
  assert.equal(result.records[0].positionMembers.length, 2);
  assert.equal(canonicalPsOnly('/PS1234.1.2', ['.1.2']), 'PS1234');
  assert.equal(canonicalPsOnly('/PS1234-1', ['-1']), 'PS1234');
  assert.equal(canonicalPsOnly('/PS1234.1.3', ['.N']), 'PS1234');
  assert.equal(canonicalPsOnly('/SL-1840203.1.2', ['.N']), '');
  assert.equal(literalSupportRoot('/SL-1840203.1.2'), 'SL-1840203');
});

test('PS suffix rules reject accidental broad regex and never truncate by substring', () => {
  assert.deepEqual(normalizePsStripSuffixes('.1.2, .1, -1, _1'), ['.1.2', '.1', '-1', '_1']);
  assert.throws(() => normalizePsStripSuffixes(['.*']), /Invalid PS suffix/);
  assert.equal(canonicalPsOnly('/PS1234.1.3', ['.1.2']), '');
  assert.equal(canonicalPsOnly('/PS1234X.1.2', ['.1.2']), '');
});
