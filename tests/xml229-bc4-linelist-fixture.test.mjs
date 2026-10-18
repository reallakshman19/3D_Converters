import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import xlsx from 'xlsx';
import {parseWorkbookSheet}
 from '../tabs/xml-cii-2019-standalone/workers/master-dataset-parser.js';
import {prepareNormalizedDataset}
 from '../tabs/xml-cii-2019-standalone/workers/master-dataset-normalize.js';
import {validateBc4Bytes} from '../scripts/xml229-install-bc4-fixture.mjs';
const input=new URL('./fixtures/xml229/BC4.xlsx',import.meta.url);
const manifestUrl=new URL('./fixtures/xml229/BC4.fixture.json',import.meta.url);
test('BC4 fixture manifest is explicitly unapproved and pinned to exact uploaded bytes',async()=>{
 const m=JSON.parse(await readFile(manifestUrl,'utf8'));
 assert.equal(m.schema,'XML229.BC4.LineListFixture.v1');
 assert.equal(m.sizeBytes,241036);
 assert.equal(m.physicalNonemptyRowsExcludingFirstRow,385);
 assert.equal(m.historicalContentDigestProven,false);
 assert.equal(m.historicalMappingDigestProven,false);
 assert.equal(m.nativeCiiReleaseAuthorized,false);
 assert.throws(()=>validateBc4Bytes(Buffer.from('forged')),{
  code:'BC4_FIXTURE_BYTES_NOT_MATCHED'});
});
test('BC4 original workbook parses to 385 original LineList rows',async()=>{
 assert.equal(existsSync(input),true,'BC4_BINARY_REQUIRED: apply the exact-byte Git patch and commit tests/fixtures/xml229/BC4.xlsx; a missing fixture is NOT a passing test');
 const bytes=readFileSync(input);
 validateBc4Bytes(bytes);
 const wb=xlsx.read(bytes,{type:'buffer',bookSheets:true});
 const m=JSON.parse(await readFile(manifestUrl,'utf8'));
 assert.deepEqual(wb.SheetNames,m.sheetNames);
 const ab=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const raw=parseWorkbookSheet(ab,'LineList',xlsx);
 assert.equal(raw.length,385);
 const p=prepareNormalizedDataset('lineList',raw,{},{});
 assert.equal(p.rows.length,385);
 assert.equal(p.fieldMap.lineKey1,'2');
 assert.equal(p.fieldMap.lineKey2,'3');
 assert.equal(p.fieldMap.pipingClass,'22');
});
