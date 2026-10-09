/** #1104 — real docs app user-journey characterization; not LFJ release.
 * Run after serving docs/: node lfj/acceptance/3d-converters/enrichment-browser-baseline.mjs
 * LFJ_I0_BROWSER_ACCEPTANCE=1 ... => intentionally RED on legacy foreground work.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const register=JSON.parse(readFileSync(join(root,'lfj/acceptance/3d-converters/fixture-register.json'),'utf8'));
const fixture=register.inputs.find(x=>x.id==='1885Sjson-small');
assert.ok(fixture);
const bytes=readFileSync(join(root,fixture.path));
assert.equal(bytes.length,fixture.bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.sha256);
const contract=JSON.parse(readFileSync(join(root,'Benchmarks/1885Sjson/fixture-contract-snapshot.json'),'utf8'));
const base=process.env.LFJ_I0_DOCS_URL||'http://127.0.0.1:4182';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true});
const errors=[];
page.on('pageerror',error=>errors.push(String(error.message||error)));
const stamp=async(label)=>page.evaluate(name=>{performance.mark(name);return performance.now()},label);
const checkOutput=async xml=>{
  return page.evaluate((arg)=>{
    const doc=new DOMParser().parseFromString(arg.xml,'application/xml');
    const parserErrors=doc.getElementsByTagName('parsererror');
    if(parserErrors.length)return {error:parserErrors[0].textContent.slice(0,300)};
    const nodes=Array.from(doc.getElementsByTagName('Node'));
    const actual={};
    for(const [ref,contract] of Object.entries(arg.contracts)){
      const found=nodes.filter(node=>node.getElementsByTagName('ComponentRefNo')[0]?.textContent===ref);
      actual[ref]={matches:found.length};
      if(found.length===1)for(const key of Object.keys(contract.xml)){
        const v=found[0].getElementsByTagName(key)[0]?.textContent??null;
        actual[ref][key]=v;
      }
    }
    return {nodeCount:nodes.length,branchCount:doc.getElementsByTagName('Branch').length,actual};
  },{xml,contracts:contract.targets});
};
try{
 await page.addInitScript(()=>{
  const obj={fileTextCalls:0,fileTextBytes:0,largeParseCalls:0,largeParseMaxChars:0,longTasks:[]};
  Object.defineProperty(window,'__LFJ_I0',{value:obj});
  const oldText=File.prototype.text;
  File.prototype.text=function(...args){
    if(this.name==='Sjson.json'){obj.fileTextCalls++;obj.fileTextBytes+=this.size;}
    return oldText.apply(this,args);
  };
  const oldParse=JSON.parse;
  JSON.parse=function(src,...rest){
    if(typeof src==='string'&&src.length>100000){obj.largeParseCalls++;obj.largeParseMaxChars=Math.max(obj.largeParseMaxChars,src.length);}
    return oldParse.call(this,src,...rest);
  };
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())obj.longTasks.push({startMs:e.startTime,durationMs:e.duration});}).observe({entryTypes:['longtask']});}catch{}
 });
 const response=await page.goto(base+'/tabs/stagedjson-to-enrichxml/index.html',{waitUntil:'load',timeout:30000});
 assert.equal(response.status(),200);
 await page.locator('#sj-dropzone input[type=file]').waitFor({state:'attached'}); // native upload input is intentionally display:none
 const t0=await stamp('T0-before-file');
 await page.locator('#sj-dropzone input[type=file]').setInputFiles(join(root,fixture.path));
 await page.getByText('Sjson.json  (loaded)').waitFor({timeout:30000});
 const t1=await stamp('T1-source-visible');
 await page.getByRole('button',{name:/Generate Enriched XML/}).click();
 const t2=await stamp('T2-generation-activated');
 await page.getByRole('button',{name:/Enriched XML/}).filter({hasText:'⬇'}).waitFor({timeout:90000});
 const t3=await stamp('T3-output-visible');
 const downloadXmlPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/⬇ Enriched XML/}).click();
 const downloadedXml=await downloadXmlPromise;
 const xml=readFileSync(await downloadedXml.path(),'utf8');
 const t4=await stamp('T4-xml-downloaded');
 assert.match(downloadedXml.suggestedFilename(),/_enriched\.xml$/);
 const parsed=await checkOutput(xml);
 assert.equal(parsed.error,undefined,'XML parser refused output: '+parsed.error);
 assert.ok(parsed.nodeCount>100,'Output must contain real, populated nodes');
 assert.ok(parsed.branchCount>=3,'Expected multiple real branches');
 for(const [ref,expected] of Object.entries(contract.targets)){
  const actual=parsed.actual[ref];
  assert.equal(actual.matches,1,'Source physical ref lost/duplicated: '+ref);
  for(const key of ['NodeNumber','ComponentType','Endpoint','OutsideDiameter','WallThickness','CorrosionAllowance','InsulationThickness','BendRadius']){
    const expectation=expected.xml[key.charAt(0).toLowerCase()+key.slice(1)];
    if(expectation!==undefined&&expectation!==null){
      assert.equal(actual[key],String(expectation),'Mismatched golden candidate for '+ref+'/'+key);
    }
  }
 }
 const dlAuditPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/Audit JSON/}).click();
 const downloadedAudit=await dlAuditPromise;
 const audit=JSON.parse(readFileSync(await downloadedAudit.path(),'utf8'));
 assert.ok(audit&&typeof audit==='object');
 const dlCsvPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/Trace CSV/}).click();
 const downloadedCsv=await dlCsvPromise;
 const csv=readFileSync(await downloadedCsv.path(),'utf8');
 assert.match(csv,/BRANCH,XML_NODE,TYPE,NAME/);
 assert.ok(csv.split('\n').length>100,'CSV must contain complete populated records');
 const t5=await stamp('T5-all-downloads-validated');
 const obs=await page.evaluate(()=>({...window.__LFJ_I0,marks:performance.getEntriesByType('mark').filter(e=>/^T[0-9]-/.test(e.name)).map(e=>({name:e.name,startTime:e.startTime}))}));
 assert.equal(errors.length,0,errors.join('\n'));
 assert.ok(obs.fileTextCalls>=1,'Legacy foreground file.text must reproduce until migrated');
 assert.ok(obs.largeParseCalls>=1,'Legacy foreground whole-source JSON.parse must reproduce until migrated');
 const receipt={
  schema:'LFJ.3D.LegacyBrowserE2EBaseline.v1',candidate:'LEGACY_NO_LFJ_ADOPTION',
  source:{path:fixture.path,bytes:fixture.bytes,sha256:fixture.sha256},
  runtime:{url:base+'/tabs/stagedjson-to-enrichxml/index.html',userAgent:await page.evaluate(()=>navigator.userAgent)},
  timesMs:{fileToSourceVisible:t1-t0,clickToResultVisible:t3-t2,sourceToXmlDownloaded:t4-t0,sourceToAllArtifactsValidated:t5-t0},
  corpus:{xmlNodes:parsed.nodeCount,xmlBranches:parsed.branchCount,independentTargetRefs:Object.keys(contract.targets).length,csvLines:csv.split('\n').length},
  outputs:{xmlSha256:createHash('sha256').update(xml).digest('hex'),auditSha256:createHash('sha256').update(JSON.stringify(audit)).digest('hex'),csvSha256:createHash('sha256').update(csv).digest('hex')},
  foreground:{fileTextCalls:obs.fileTextCalls,fileTextBytes:obs.fileTextBytes,largeParseCalls:obs.largeParseCalls,largeParseMaxChars:obs.largeParseMaxChars,longTaskCount:obs.longTasks.length,maxLongTaskMs:Math.max(0,...obs.longTasks.map(e=>e.durationMs))},
  validity:'SEMANTIC_CANDIDATE_NOT_INDEPENDENT_RELEASE_GOLDEN',errors,
 };
 if(process.env.LFJ_I0_RECEIPT_DIR){mkdirSync(process.env.LFJ_I0_RECEIPT_DIR,{recursive:true});writeFileSync(join(process.env.LFJ_I0_RECEIPT_DIR,'enrichment-browser-baseline.json'),JSON.stringify(receipt,null,2)+'\n');}
 console.log('LFJ_3D_BROWSER_BASELINE '+JSON.stringify(receipt));
 if(process.env.LFJ_I0_BROWSER_ACCEPTANCE==='1'){
  assert.equal(obs.fileTextCalls,0,'RED: original File.text still runs in browser main thread');
  assert.equal(obs.largeParseCalls,0,'RED: full source JSON.parse still runs in browser main thread');
 }
}finally{await page.close();await browser.close();}
