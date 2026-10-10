/**
 * #157 H02: original-JSON real Chromium/IDB/Worker branch-scope adversarial
 * controls. Never mutate tracked Firstpass fixtures or golden baselines.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1 as allGoldens}
  from './authentic-original-output-goldens.mjs';
const g=allGoldens.firstpass;
const hash=x=>createHash('sha256').update(x).digest('hex');
const xml=(await readFile(g.xmlPath)).toString('utf8');
const json=await readFile(g.jsonPath);
assert.equal(json.length,g.jsonBytes);
assert.equal(hash(json),g.jsonSha256);
assert.equal(Buffer.byteLength(xml),g.xmlBytes);
assert.equal(hash(xml),g.xmlSha256);
const labels=[...xml.matchAll(/<Branchname>([\s\S]*?)<\/Branchname>/g)];
assert.ok(labels.length>=2,'authentic fixture must show two branches');
const firstNode='<Node>';
const firstNumber='<NodeNumber>10</NodeNumber>';
const closing='</PipeStressExport>';
for(const anchor of [firstNode,firstNumber,closing])
  assert.ok(xml.includes(anchor),'required authentic anchor '+anchor);
const changed=(name,base,needle,replacement)=>{
  assert.ok(base.includes(needle),name+': missing mutation anchor');
  const result=base.replace(needle,replacement);
  assert.notEqual(result,xml,name+': mutation did not change XML');
  return [name,result];
};
const negatives=[
  changed('remove_second_branchname',xml,labels[1][0],''),
  changed('remove_first_branchname',xml,labels[0][0],''),
  changed('duplicate_first_branchname',xml,labels[0][0],labels[0][0]+labels[0][0]),
  changed('node_embedded_fake_branchname',xml,firstNumber,
    firstNumber+'<Branchname>FAKE</Branchname>'),
  changed('metadata_shadow_branchname',xml,firstNode,
    '<Metadata><Branchname>FAKE</Branchname></Metadata>'+firstNode),
  changed('sibling_unnamed_pipe',xml,closing,
    '<Pipe><Node><NodeNumber>999</NodeNumber><Position>1 2 3</Position></Node></Pipe>'+closing),
];
const oracle={
  originalBytes:g.jsonBytes,originalSha256:g.jsonSha256,
  sourceOccurrences:23754,sourceFacts:266,
  projectionSha256:'ab070c070e02645ed7bd08771abd7bb0fea136019f3a624a4a6ca4d91eaffb15',
  xmlNodes:g.xmlNodes,matchedXmlNodes:g.matchedXmlNodes,
  xmlRecordsSha256:g.ledgerSha256,
  nodeWiseCsvSha256:g.nodeWiseCsvSha256,
  evidenceTreeCsvSha256:g.evidenceTreeCsvSha256,
  nodeWiseCsvBytes:g.nodeWiseCsvBytes,
  evidenceTreeCsvBytes:g.evidenceTreeCsvBytes,
  statusCounts:g.statuses
};
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror',error=>console.error('BRANCH_PAGE_ERROR',error.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  await page.waitForFunction(()=>window.__b0XmlCsvReady);
  for(const [id,mutatedXml] of negatives){
    const answer=await page.evaluate(async input=>{
      try{
        const result=await window.runB0RealXmlCsv(input);
        return {code:'UNEXPECTED_CSV_SUCCESS',result};
      }catch(error){
        return {code:error?.code||'UNCLASSIFIED',message:String(error?.message||error)};
      }
    },{jsonUrl:'/'+g.jsonPath,xmlUrl:'/'+g.xmlPath,
      mode:'SOURCE_DERIVED_CONTROL',config:{},
      oracle:{...oracle,xmlBytes:Buffer.byteLength(mutatedXml),
        xmlSha256:hash(mutatedXml)},
      xmlTextOverride:mutatedXml});
    assert.equal(answer.code,'XML_SEMANTIC_DOCUMENT_INVALID',
      id+': real Worker did not reject branch leakage: '+JSON.stringify(answer));
    console.log('LFJ_H02_NATIVE_BRANCH_REJECT_PASS '+JSON.stringify({
      id,code:answer.code,originalJsonSha256:g.jsonSha256,
      alteredXmlSha256:hash(mutatedXml),successfulCsvResult:false,
      sourceOnly:true,engineeringReady:false,downloadAuthorized:false
    }));
  }
  console.log('LFJ_H02_NATIVE_ALL_BRANCH_NEGATIVES_PASS '+negatives.length);
}finally{await browser.close();}
