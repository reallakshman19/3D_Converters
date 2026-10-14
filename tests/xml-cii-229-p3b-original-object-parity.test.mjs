/** P3B.0 FEASIBILITY ONLY — existing parsing/index contracts, not Preview release.
 * Source facts are not engineering approval. Real Worker read/cancellation,
 * selected Owner/site/zone and full numerical Preview remain outside this test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildStagedDtxrIndex } from '../converters/xml-cii2019-core/dtxr-resolver.js';
import { buildStagedBranchWallEvidenceIndex } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js';
import { buildXmlCiiStagedGeometryIndex } from '../converters/xml-cii2019-core/staged-geometry-authority.js';

const stagedText = readFileSync(new URL('../Benchmarks/1885Sjson/Sjson.json', import.meta.url), 'utf8');
const originalXml = readFileSync(new URL('../Benchmarks/1885Sjson/FirstpassXML', import.meta.url), 'utf8');
const stagedObject = JSON.parse(stagedText);
const fixtureSha256 = '6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288';
const contentHash = text => createHash('sha256').update(text).digest('hex');

function summarizeRecord(item) {
  return {
    path: item?._path || item?.raw?._path || '',
    type: item?.type || '',
    owner: item?.owner || item?.branchName || '',
    dtxr: item?.dtxr || '',
    dtxrPs: item?.dtxrPs || '',
    cmpSupGap: item?.cmpSupGap || '',
    name: item?.attrs?.NAME || '',
    ref: item?.attrs?.REF || '',
    bore: item?.attrs?.ABORE || item?.attrs?.LBORE || '',
  };
}
function mapRecords(map) {
  return [...map.entries()].map(([key, value]) => [
    key, Array.isArray(value) ? value.map(summarizeRecord) : summarizeRecord(value),
  ]);
}
function compareDtxrIndices(textIndex, objectIndex) {
  assert.deepEqual(textIndex.items.map(summarizeRecord), objectIndex.items.map(summarizeRecord));
  assert.equal(textIndex.ownerItems.length, objectIndex.ownerItems.length);
  for (const key of [
    'byComponentRefNo', 'byPsTag', 'byPsBaseTag', 'byNodeNumber',
    'byNodeName', 'byCoordKey', 'byOwnerBranch',
  ]) assert.deepEqual(mapRecords(textIndex[key]), mapRecords(objectIndex[key]), key);
}

test('P3B.0 original Firstpass fixture is pinned and independently inspectable', () => {
  assert.equal(Buffer.byteLength(stagedText, 'utf8'), 733806);
  assert.equal(contentHash(stagedText), fixtureSha256);
  assert.equal(stagedObject.length, 13);
  assert.match(originalXml, /<ComponentRefNo>=1006649732\/51228<\/ComponentRefNo>/);
  const first = stagedObject[0].children[0];
  assert.equal(first.attributes.REF, '=1006649732/51228');
  assert.equal(first.attributes.DTXR, 'ELBOW 90 DEG LR BW Sch 80');
  assert.equal(first.attributes.ABORE, '150mm');
});

test('P3B.0 existing DTXR index has identical text-vs-object input semantics on original Firstpass', () => {
  const fromText = buildStagedDtxrIndex(stagedText, {});
  const fromObject = buildStagedDtxrIndex(stagedObject, {});
  assert.ok(fromText.items.length > 0, 'original source must produce actual DTXR evidence');
  compareDtxrIndices(fromText, fromObject);
  const matching = fromObject.byComponentRefNo.get('1006649732/51228') || [];
  assert.ok(matching.some(item => item.dtxr === 'ELBOW 90 DEG LR BW Sch 80'),
    'Firstpass JSON DTXR must be preserved under its existing normalized original ref');
});

test('P3B.0 existing wall evidence index has identical text-vs-object input semantics', () => {
  const fromText = buildStagedBranchWallEvidenceIndex(stagedText);
  const fromObject = buildStagedBranchWallEvidenceIndex(stagedObject);
  assert.ok(fromText.size > 0);
  assert.deepEqual([...fromText.entries()], [...fromObject.entries()]);
});

test('P3B.0 existing geometry index has identical text-vs-object input semantics', () => {
  const fromText = buildXmlCiiStagedGeometryIndex(stagedText);
  const fromObject = buildXmlCiiStagedGeometryIndex(stagedObject);
  assert.ok(fromText.count > 0);
  assert.equal(fromText.count, fromObject.count);
  assert.deepEqual([...fromText.byRef.entries()], [...fromObject.byRef.entries()]);
});

test('P3B.0 empty legacy staged text is not data equivalence evidence', () => {
  const empty = buildStagedDtxrIndex('', {});
  const actual = buildStagedDtxrIndex(stagedObject, {});
  assert.notEqual(empty.items.length, actual.items.length);
});
