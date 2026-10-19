import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeXml229PublicBc4LineListRevision} from '../scripts/xml229-ef05-line-list-revision.mjs';
import {parseTextSource} from '../tabs/xml-cii-2019-standalone/workers/master-dataset-parser.js';
import {prepareNormalizedDataset} from '../tabs/xml-cii-2019-standalone/workers/master-dataset-normalize.js';
import {canonicalJson} from '../contracts/gc-pw-v1/contract.mjs';

const hash=rows=>createHash('sha256').update(canonicalJson(rows)).digest('hex');
const ab=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);

test('public BC4 changed-master upload is a deterministic valid 385-row JSON revision',async()=>{
  const originalBytes=await readFile(new URL('./fixtures/xml229/BC4.LineList.json',import.meta.url));
  const original=parseTextSource(ab(originalBytes),'BC4.LineList.json','lineList');
  const upload=await makeXml229PublicBc4LineListRevision();
  assert.equal(upload.mimeType,'application/json');
  assert.match(upload.name,/\.json$/);
  assert.deepEqual(Object.keys(JSON.parse(upload.buffer.toString('utf8'))),['rows']);
  const rows=parseTextSource(ab(upload.buffer),upload.name,'lineList');
  assert.equal(rows.length,385);
  assert.equal(original.length,rows.length);
  assert.equal(rows.filter((row,index)=>JSON.stringify(row)!==JSON.stringify(original[index])).length,1);
  assert.equal(original.find(row=>row['3']==='8010125')['22'],'13421');
  assert.equal(rows.find(row=>row['3']==='8010125')['22'],'31441C4');
  const [before,after]=[original,rows].map(v=>prepareNormalizedDataset('lineList',v,{},{}));
  assert.deepEqual(after.fieldMap,before.fieldMap,'normalization contract drift');
  assert.notEqual(hash(after.rows),hash(before.rows),'master source basis never changed');
  const repeat=await makeXml229PublicBc4LineListRevision();
  assert.deepEqual(repeat.buffer,upload.buffer,'test input must be deterministic');
  assert.equal(originalBytes.equals(await readFile(new URL('./fixtures/xml229/BC4.LineList.json',import.meta.url))),true);
});
