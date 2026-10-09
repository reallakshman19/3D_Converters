/**
 * Independent original XML+complete original JSON golden for true 3D Converter
 * Resolver matching, Evidence Tree CSV and Node-wise Trace CSV.
 * Whole JSON.parse is TEST-ONLY on Node; browser workers never do this.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {runStandaloneResolverJsonTrace} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {buildStandaloneDtxrPositionGroups} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';
import {decorateJsonTraceMember} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js';
import {buildEvidenceTreeCsv,buildXmlNodeWiseTraceCsv} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-export.js';

const fixtures={
  SMALL:{json:'Benchmarks/1885Sjson/Sjson.json',
    xml:'Benchmarks/1885Sjson/ExpectedXML'},
  LARGE:{json:'Benchmarks/1885_NC/1885_NC.json',
    xml:'Benchmarks/1885_NC/1885_NC.topology.input.xml'}
};
const size=process.env.B0_SIZE||'SMALL',files=fixtures[size];
assert.ok(files,'SMALL or LARGE authentic input is required');
const original=await readFile(files.json),xml=await readFile(files.xml);
const full=JSON.parse(original.toString('utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
let sourceOccurrences=0;
const stack=[full];
while(stack.length){
  const value=stack.pop();sourceOccurrences++;
  if(value&&typeof value==='object'){
    const children=Array.isArray(value)?value:Object.values(value);
    for(let i=children.length-1;i>=0;i--)stack.push(children[i]);
  }
}
const config={};
const entries=buildStandaloneDtxrPositionGroups(full,6,config)
  .flatMap(group=>group.entries).sort((a,b)=>a.jsonSequence-b.jsonSequence);
const factKeys=['jsonNodeNo','jsonSequence','branchName','point','bore','type',
  'description','dtxrPs','labeled','name','componentRef','tags','cmpSupGap',
  'path','capturedFields','semanticFields'];
const normalized=m=>Object.fromEntries(factKeys
  .map(key=>[key,m[key]??(key==='point'?null:'')]));
const facts=entries.map(e=>normalized(decorateJsonTraceMember(e,config)));
const pageSHA=[];
for(let n=0;n<facts.length;n+=128)
  pageSHA.push(sha(JSON.stringify(facts.slice(n,n+128))));
const projectionSha256=sha(pageSHA.join('\n'));
// The test oracle intentionally invokes real application Resolver + CSV
// exporters, not the experimental adapter being qualified.
const legacy=runStandaloneResolverJsonTrace({
  sourceKind:'xml',sourceText:xml.toString('utf8'),
  stagedJsonText:full,jsonConfig:config
});
const records=legacy.traceResolutionLedger.records;
const nodeCsv=buildXmlNodeWiseTraceCsv(legacy);
const evidenceCsv=buildEvidenceTreeCsv(legacy);
const oracle={
  originalBytes:original.length,originalSha256:sha(original),
  sourceOccurrences,sourceFacts:facts.length,
  projectionSha256,xmlBytes:xml.length,xmlSha256:sha(xml),
  xmlNodes:records.length,
  matchedXmlNodes:records.filter(x=>x.status.startsWith('RESOLVED_')).length,
  xmlRecordsSha256:sha(JSON.stringify(records)),
  nodeWiseCsvSha256:sha(nodeCsv),evidenceTreeCsvSha256:sha(evidenceCsv),
  nodeWiseCsvBytes:Buffer.byteLength(nodeCsv,'utf8'),
  evidenceTreeCsvBytes:Buffer.byteLength(evidenceCsv,'utf8'),
  statusCounts:records.reduce((acc,r)=>
    (acc[r.status]=(acc[r.status]||0)+1,acc),{})
};
assert.ok(oracle.xmlNodes>0,'authentic XML must have real nodes');
assert.ok(oracle.sourceFacts>0,'real JSON must have projected facts');
console.log('B0_REAL_XML_CSV_LEGACY_ORACLE '+JSON.stringify({size,files,...oracle}));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(600000);
  page.on('pageerror',e=>console.error('B0_BROWSER_ERROR',e.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  await page.waitForFunction(()=>window.__b0XmlCsvReady);
  const result=await page.evaluate(input=>window.runB0RealXmlCsv(input),
    {jsonUrl:'/'+files.json,xmlUrl:'/'+files.xml,oracle,config});
  assert.equal(result.schema,'LFJ.B0.RealXmlCsvOriginalOracle.v1');
  assert.equal(result.matching.xmlRecordsSha256,oracle.xmlRecordsSha256);
  assert.equal(result.matching.nodeWiseCsvSha256,oracle.nodeWiseCsvSha256);
  assert.equal(result.matching.evidenceTreeCsvSha256,oracle.evidenceTreeCsvSha256);
  console.log('B0_REAL_XML_CSV_CHROMIUM_PASS '+JSON.stringify({size,...result}));
}finally{await browser.close();}
