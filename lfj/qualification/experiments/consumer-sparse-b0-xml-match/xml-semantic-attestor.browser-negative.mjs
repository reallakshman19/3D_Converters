/**
 * #140 author-side native Chromium negative replay.
 * Uses the existing browser source/index/projection/matching Worker harness,
 * but does not alter its protected original fixtures or golden results.
 * A syntactically valid XML shadow must reject before any CSV result escapes.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1 as allGoldens} from './authentic-original-output-goldens.mjs';
const g=allGoldens.firstpass,hash=b=>createHash('sha256').update(b).digest('hex');
const xml=(await readFile(g.xmlPath)).toString('utf8');
const json=await readFile(g.jsonPath);
assert.equal(json.length,g.jsonBytes);
assert.equal(hash(json),g.jsonSha256);
assert.equal(Buffer.byteLength(xml,'utf8'),g.xmlBytes);
assert.equal(hash(xml),g.xmlSha256);
const mutate=(name,before,after)=>{
  assert.ok(xml.includes(before),name+': original mutation anchor missing');
  const value=xml.replace(before,after);
  assert.notEqual(value,xml,name+': no mutation');
  return [name,value];
};
const wrong=[
  mutate('comment_number','<NodeNumber>10</NodeNumber>',
    '<!-- <NodeNumber>999</NodeNumber> --><NodeNumber>10</NodeNumber>'),
  mutate('comment_position','<Position>421773.221',
    '<!-- <Position>999 999 999</Position> --><Position>421773.221'),
  mutate('comment_branch','</Branchname>',
    '</Branchname><!-- <Branchname>FAKE</Branchname> -->'),
  mutate('cdata_number','<NodeNumber>10</NodeNumber>',
    '<![CDATA[<NodeNumber>777</NodeNumber>]]><NodeNumber>10</NodeNumber>'),
  mutate('pi_number','<NodeNumber>10</NodeNumber>',
    '<?shadow <NodeNumber>888</NodeNumber> ?><NodeNumber>10</NodeNumber>'),
  mutate('numeric_node_number','<NodeNumber>10</NodeNumber>',
    '<NodeNumber>&#49;0</NodeNumber>'),
  mutate('hex_numeric_node_number','<NodeNumber>10</NodeNumber>',
    '<NodeNumber>&#x31;0</NodeNumber>'),
  mutate('numeric_position','<Position>421773.221',
    '<Position>&#52;21773.221'),
  mutate('numeric_branch','<Branchname>/ASIM',
    '<Branchname>/&#65;SIM'),
  mutate('shadow_name','<NodeName></NodeName>',
    '<!-- <NodeName>FAKE</NodeName> --><NodeName></NodeName>'),
  mutate('shadow_componentref','<ComponentRefNo>=1006649732/51228',
    '<!-- <ComponentRefNo>FAKE</ComponentRefNo> --><ComponentRefNo>=1006649732/51228'),
  ['piping_numeric_attr',
    '<CAESARII><PIPINGMODEL><PIPINGELEMENT NODE="&#49;0" POS="1 2 3" BRANCH="TRUE"/></PIPINGMODEL></CAESARII>'],
  ['piping_hex_attr',
    '<CAESARII><PIPINGMODEL><PIPINGELEMENT NODE="&#x31;0" POS="1 2 3" BRANCH="TRUE"/></PIPINGMODEL></CAESARII>']
];
const oracle={
  originalBytes:g.jsonBytes,originalSha256:g.jsonSha256,
  sourceOccurrences:23754,sourceFacts:266,
  projectionSha256:'ab070c070e02645ed7bd08771abd7bb0fea136019f3a624a4a6ca4d91eaffb15',
  xmlNodes:g.xmlNodes,matchedXmlNodes:g.matchedXmlNodes,
  xmlRecordsSha256:g.ledgerSha256,nodeWiseCsvSha256:g.nodeWiseCsvSha256,
  evidenceTreeCsvSha256:g.evidenceTreeCsvSha256,
  nodeWiseCsvBytes:g.nodeWiseCsvBytes,evidenceTreeCsvBytes:g.evidenceTreeCsvBytes,
  statusCounts:g.statuses
};
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror',e=>console.error('BROWSER_PAGE_ERROR',e.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  await page.waitForFunction(()=>window.__b0XmlCsvReady);
  for(const [id,source] of wrong){
    const actual=await page.evaluate(async input=>{
      try{
        const result=await window.runB0RealXmlCsv(input);
        return {code:'UNEXPECTED_CSV_SUCCESS',result};
      }catch(error){
        return {code:error?.code||'UNCLASSIFIED',message:String(error?.message||error)};
      }
    },{jsonUrl:'/'+g.jsonPath,xmlUrl:'/'+g.xmlPath,
      mode:'SOURCE_DERIVED_CONTROL',config:{},
      oracle:{...oracle,xmlBytes:Buffer.byteLength(source,'utf8'),xmlSha256:hash(source)},
      xmlTextOverride:source});
    assert.equal(actual.code,'XML_SEMANTIC_MISMATCH',
      id+': native Worker did not reject semantics before CSV: '+JSON.stringify(actual));
    console.log('LFJ_A140_NATIVE_XML_NEGATIVE_PASS '+JSON.stringify({id,code:actual.code,
      originalInputSha256:g.jsonSha256,xmlSha256:hash(source),
      successfulCsvResult:false,sourceOnly:true}));
  }
  console.log('LFJ_A140_ALL_NATIVE_XML_NEGATIVES_PASS '+wrong.length);
}finally{await browser.close();}
