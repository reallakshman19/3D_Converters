import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexAttNativeHierarchy } from '../../tabs/model-converters/att-native-hierarchy-index.js';
import { projectAttNativeTree } from '../../tabs/model-converters/att-native-tree-projection.js';
import {
  parseExpectedAttSiteZoneManifest, compareAttExpectedCoverage, attCoverageCanConvert,
} from '../../tabs/model-converters/att-native-source-coverage.js';

const blocks = [
  ['SITE', '/ASIM-1835-CU-PL', '/*'],
  ['ZONE', '/ASIM-1835-CU-PL-S', '/ASIM-1835-CU-PL'],
  ['ZONE', '/ASIM-1835-CU-PL-W', '/ASIM-1835-CU-PL'],
  ['PIPE', '/ASIM-1885-PL-G8010051-02', '/ASIM-1835-CU-PL-S'],
  ['BRAN', '/ASIM-1885-PL-G8010051-02/B1', '/ASIM-1885-PL-G8010051-02'],
  ['SITE', '/ASIM-1836-CU-PL', '/*'],
  ['ZONE', '/ASIM-1836-CU-PL-S', '/ASIM-1836-CU-PL'],
  ['ZONE', '/ASIM-1836-CU-PL-W', '/ASIM-1836-CU-PL'],
];
function attText(entries) {
  return entries.flatMap(([type,name,owner]) => [
    'NEW ' + name,'NAME:= ' + name,'TYPE:= ' + type,'OWNER:= ' + owner,'END',
  ]).join('\n');
}
const index = await indexAttNativeHierarchy(attText(blocks));
const expectedText = [
  'SITE /ASIM-1885-CU-PL',
  'ZONE /ASIM-1885-CU-PL-S OWNER=/ASIM-1885-CU-PL',
  'ZONE /ASIM-1885-CU-PL-W OWNER=/ASIM-1885-CU-PL',
].join('\n');
const expected = parseExpectedAttSiteZoneManifest(expectedText);
assert.equal(expected.complete, false);
assert.equal(expected.nodes.length, 3);
const missing = compareAttExpectedCoverage(index, expected);
assert.equal(missing.status, 'MISMATCH');
assert.equal(missing.matched, 0);
assert.deepEqual(missing.missing.map(item=>item.name), [
  '/ASIM-1885-CU-PL','/ASIM-1885-CU-PL-S','/ASIM-1885-CU-PL-W',
]);
assert.equal(missing.unexpected.length, 0, 'subset comparison must not invent extra source errors');
assert.equal(index.byId.has('/ASIM-1885-CU-PL'), false, 'missing native SITE must never be synthesized');
const search = projectAttNativeTree(index,{search:'ASIM-1885'});
assert.ok(search.matchedTotal >= 1, 'other 1885-named PIPING objects exist');
assert.equal(search.rows.some(r=>r.type==='SITE'),false,'pipe text hit is not a SITE identity');
assert.equal(attCoverageCanConvert(expectedText,expectedText,missing), false);
assert.equal(attCoverageCanConvert(expectedText,'',null),false,'unverified pasted inventory blocks');
assert.equal(attCoverageCanConvert('', '', null),true,'ATT-only mode permits conversion with explicit unknown external coverage');

const goodText = 'SITE /ASIM-1835-CU-PL\nZONE /ASIM-1835-CU-PL-S OWNER=/ASIM-1835-CU-PL';
const good = compareAttExpectedCoverage(index,parseExpectedAttSiteZoneManifest(goodText));
assert.equal(good.status,'MATCH');
assert.equal(good.scope,'EXPECTED_SUBSET');
assert.equal(attCoverageCanConvert(goodText,goodText,good),true);
assert.equal(attCoverageCanConvert(goodText+'\nZONE /OTHER','',good),false);

const wrongType = compareAttExpectedCoverage(index,parseExpectedAttSiteZoneManifest('SITE /ASIM-1885-PL-G8010051-02'));
assert.equal(wrongType.typeMismatch.length,1);
assert.equal(wrongType.typeMismatch[0].actualType,'PIPE');

const wrongOwner = compareAttExpectedCoverage(index,parseExpectedAttSiteZoneManifest('ZONE /ASIM-1835-CU-PL-S OWNER=/ASIM-1885-CU-PL'));
assert.equal(wrongOwner.ownerMismatch.length,1);
assert.equal(wrongOwner.ownerMismatch[0].actualOwner,'/ASIM-1835-CU-PL');

const complete = compareAttExpectedCoverage(index,parseExpectedAttSiteZoneManifest(JSON.stringify({
 source:'Independent NWD inventory export',complete:true,
 nodes:[{type:'SITE',name:'/ASIM-1835-CU-PL',owner:'/*'}],
})));
assert.equal(complete.status,'MISMATCH');
assert.equal(complete.scope,'COMPLETE_REFERENCE');
assert.equal(complete.unexpected.length,5);

const duplicateSource=await indexAttNativeHierarchy(attText([
 ['SITE','/S','/*'],['SITE','/S','/*'],
]));
assert.equal(compareAttExpectedCoverage(duplicateSource,parseExpectedAttSiteZoneManifest('SITE /S')).ambiguous.length,1);
assert.throws(()=>parseExpectedAttSiteZoneManifest('SITE /S\nSITE /S'),/Duplicate/);
assert.throws(()=>parseExpectedAttSiteZoneManifest('PIPE /S'),/SITE or ZONE/);
assert.throws(()=>parseExpectedAttSiteZoneManifest('ZONE S'),/Expected/);
assert.throws(()=>parseExpectedAttSiteZoneManifest('{broken'),/JSON is invalid/);
assert.throws(()=>parseExpectedAttSiteZoneManifest(''),/at least one/);
assert.throws(()=>parseExpectedAttSiteZoneManifest({complete:'true',nodes:[{type:'SITE',name:'/S'}]}),/true or false/);

const popup = readFileSync(new URL('../../tabs/model-converters/att-native-scope-popup.js',import.meta.url),'utf8');
assert.match(popup,/data-expected-entries/);
assert.match(popup,/data-compare-expected/);
assert.match(popup,/data-clear-expected/);
assert.match(popup,/MISSING FROM ATT/);
assert.match(popup,/comparisonAllowsConversion/);
assert.match(popup,/disabled = blocked/);
assert.match(popup,/No matching record in this ATT file/);
assert.match(popup,/source-coverage\.js/);
assert.match(popup,/EXPECTED_INVENTORY_LOADING/);
assert.match(popup,/\.disabled = blocked/);
console.log('test-att-native-source-coverage: PASS source absent 1885, wrong owner/type, full-vs-partial, editable fail closed and no fabricated roots');
