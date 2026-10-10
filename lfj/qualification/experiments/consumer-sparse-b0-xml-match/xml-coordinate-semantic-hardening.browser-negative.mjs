/**
 * #153 source-only exact-head native Chromium adversarial coordinate guard.
 * Reuse immutable 1885Sjson JSON and source/oracle identity. Verify real
 * Blob -> IndexedDB -> projection -> XML Worker rejects before CSV success.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1 as goldens}
  from './authentic-original-output-goldens.mjs';
const fixture=goldens.firstpass;
const hash=value=>createHash('sha256').update(value).digest('hex');
const xml=(await readFile(fixture.xmlPath)).toString('utf8');
const json=await readFile(fixture.jsonPath);
assert.equal(json.length,fixture.jsonBytes);
assert.equal(hash(json),fixture.jsonSha256);
assert.equal(Buffer.byteLength(xml),fixture.xmlBytes);
assert.equal(hash(xml),fixture.xmlSha256);
const anchor='<Position>421773.221 -1141354.000 1184.150</Position>';
assert.ok(xml.includes(anchor),'immutable authentic XML anchor missing');
const replace=content=>xml.replace(anchor,content);
const negatives=[
  ['explicit_four_numbers',replace('<Position>1 2 3 999</Position>')],
  ['explicit_two_numbers',replace('<Position>1 2</Position>')],
  ['descriptive_three_numbers',replace('<DTXR_POS>ELBOW 90 SCH 80 DN 50</DTXR_POS>')],
  ['repeated_coordinate_axis',replace('<Position>E=1 E=2 N=3 EL=4</Position>')],
  ['attribute_four_numbers','<R><PIPINGELEMENT NODE="10" POS="1 2 3 999"/></R>']
];
const oracle={
  originalBytes:fixture.jsonBytes,
  originalSha256:fixture.jsonSha256,
  sourceOccurrences:23754,
  sourceFacts:266,
  projectionSha256:'ab070c070e02645ed7bd08771abd7bb0fea136019f3a624a4a6ca4d91eaffb15',
  xmlNodes:fixture.xmlNodes,
  matchedXmlNodes:fixture.matchedXmlNodes,
  xmlRecordsSha256:fixture.ledgerSha256,
  nodeWiseCsvSha256:fixture.nodeWiseCsvSha256,
  evidenceTreeCsvSha256:fixture.evidenceTreeCsvSha256,
  nodeWiseCsvBytes:fixture.nodeWiseCsvBytes,
  evidenceTreeCsvBytes:fixture.evidenceTreeCsvBytes,
  statusCounts:fixture.statuses
};
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror',e=>console.error('COORDINATE_PAGE_ERROR',e.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  await page.waitForFunction(()=>window.__b0XmlCsvReady);
  for(const [id,mutatedXml] of negatives){
    assert.notEqual(mutatedXml,xml,id+': no mutation');
    const actual=await page.evaluate(async input=>{
      try{
        const result=await window.runB0RealXmlCsv(input);
        return {code:'UNEXPECTED_CSV_SUCCESS',result};
      }catch(error){
        return {code:error?.code||'UNCLASSIFIED',message:String(error?.message||error)};
      }
    },{
      jsonUrl:'/'+fixture.jsonPath,xmlUrl:'/'+fixture.xmlPath,
      mode:'SOURCE_DERIVED_CONTROL',config:{},
      oracle:{...oracle,xmlBytes:Buffer.byteLength(mutatedXml,'utf8'),
        xmlSha256:hash(mutatedXml)},xmlTextOverride:mutatedXml
    });
    assert.equal(actual.code,'XML_SEMANTIC_DOCUMENT_INVALID',
      id+': native Worker failed to reject ambiguous geometry: '+JSON.stringify(actual));
    console.log('LFJ_A153_NATIVE_COORDINATE_REJECT_PASS '+JSON.stringify({
      id,code:actual.code,originalJsonSha256:fixture.jsonSha256,
      mutatedXmlSha256:hash(mutatedXml),successfulCsvResult:false,
      sourceOnly:true,engineeringReady:false,downloadAuthorized:false
    }));
  }
  console.log('LFJ_A153_NATIVE_ALL_COORDINATE_NEGATIVES_PASS '+negatives.length);
}finally{await browser.close();}
