/** Real served Chromium two-click workflow against a synthetic original XML Worker. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/test.html'){
   res.writeHead(200,{'content-type':'text/html'});
   res.end('<!doctype html><html><body><div id="preview"></div><div id="weight"></div></body></html>');
   return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep))throw Error('Invalid file path');
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':['.js','.mjs'].includes(path.extname(file))
   ?'text/javascript':'application/json'});res.end(bytes);
 }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/test.html');
 await page.evaluate(async()=>{
  const {installXml229P4PreviewBridge}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-preview-bridge.js');
  const {installXml229WorkerHeldWeightPanel}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
  const original='{"synthetic":"two-click-source-bound","components":[1]}';
  const blob=new Blob([original],{type:'application/json'});
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest(
    'SHA-256',await blob.arrayBuffer())),
    x=>x.toString(16).padStart(2,'0')).join('');
  const sourceId='P1-CHROMIUM-TWO-CLICK';
  const xml='<PipeStressExport><Pipe><Branch>'+
   '<Branchname>/SYNTHETIC-P1-300-VALVE/B1</Branchname>'+
   '<Node><NodeNumber>100</NodeNumber><ComponentType>GASK</ComponentType>'+
   '<ElementLengthMm>2</ElementLengthMm><Position>0 0 0</Position></Node>'+
   '<Node><NodeNumber>200</NodeNumber><ComponentType>RIGID</ComponentType>'+
   '<NodeName>88-VGT-25202</NodeName><BoreMm>200</BoreMm>'+
   '<ComponentRefNo>1006649732/119364</ComponentRefNo><Endpoint>2</Endpoint>'+
   '<ElementLengthMm>112</ElementLengthMm><Position>112 0 0</Position>'+
   '<Weight>0</Weight></Node></Branch></Pipe></PipeStressExport>';
  const master=[{Rating:'300',Bore:200,Length:112,'RF/RTJ KG':35,TypeDesc:'Gate Valve'}];
  const receipt={schema:'XML229.OriginalStagedSourceReceipt.v1',
   phase:'INDEX_COMMITTED',rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
   sha256:sha,sourceRevision:'o1:sha256:'+sha,
   generationId:'xml229-p1-test-generation-1',sourceRefId:'p1-worker-source',
   byteLength:blob.size,occurrenceCount:2,pageCount:1};
  const options={
   xmlText:xml,sourceId,
   masters:{weight:{datasetId:'P1-test-master',revision:'v1',
    rows:master,mapping:{weight:'RF/RTJ KG'}}},
   config:{weight:{masterRows:master},overrides:{}},overrides:{},
   selection:[{sourceId,selectionRef:'all'}],
   originalStagedBlob:blob,originalStagedSourceReceipt:receipt,
   requestId:'xml229-p1-two-click-chromium',isCurrent:()=>true,
  };
  const stateRef={current:{}};
  window.__stateRef=stateRef;window.__options=options;
  installXml229P4PreviewBridge(document.querySelector('#preview'),stateRef,
   {resolveInputs:async()=>options});
  installXml229WorkerHeldWeightPanel(document.querySelector('#weight'),stateRef,
   {resolveInputs:async()=>options});
 });
 await page.locator('[data-p4-preview-build]').click();
 await page.waitForFunction(()=>
  document.querySelector('[data-p4-preview-status]')?.textContent.includes(
   'Preview engineering facts VERIFIED')===true,null,{timeout:120000});
 await page.evaluate(async()=>{
  const {installXml229WorkerHeldWeightPanel}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
  installXml229WorkerHeldWeightPanel(document.querySelector('#weight'),
    window.__stateRef,{resolveInputs:async()=>window.__options});
 });
 await page.waitForFunction(()=>document.querySelectorAll('tr[data-p4-row]').length===2,
  null,{timeout:120000});
 const before=await page.evaluate(async()=>{
  const {getXml229CurrentWorkerHeldReview}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
  const session=getXml229CurrentWorkerHeldReview(window.__stateRef);
  const page=await session.readPage({offset:0,limit:25,filter:'blank-rigid',query:''});
  const proof=await session.readCompletion();
  return {counts:proof.counts,population:proof.verifiedPhysicalCount,
   rows:page.rows.map(r=>({nodeName:r.nodeName,componentType:r.componentType,
    rating:r.rating,bore:r.boreMm,length:r.lengthMm,
    proposals:r.proposals.map(p=>({kg:p.value,qualified:p.qualified,
      reasons:p.eligibilityReasons}))}))};
 });
 assert.equal(before.population,2);
 assert.equal(before.counts.match1,0);
 const eligible=before.rows.flatMap(r=>r.proposals).filter(p=>p.qualified===true);
 assert.equal(eligible.length,1,'Expected exact source family-qualified gate candidate: '+JSON.stringify(before));
 await page.locator('[data-p4-bulk-plan]').click();
 await page.waitForFunction(()=>/editable draft\(s\) prepared/.test(
  document.querySelector('[data-p4-weight-status]')?.textContent||''),
  null,{timeout:120000});
 const inputs=page.locator('tr[data-p4-row] [data-p4-proposal]');
 assert.equal(await inputs.first().inputValue(),'35');
 assert.equal(await page.locator('[data-p4-bulk-confirm]').isEnabled(),true);
 const still=await page.evaluate(async()=>{
  const {getXml229CurrentWorkerHeldReview}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
  const s=getXml229CurrentWorkerHeldReview(window.__stateRef);
  return (await s.readCompletion()).counts;
 });
 assert.equal(still.match1,0,'first click must never accept engineering weights');
 await inputs.first().fill('350');
 assert.equal(await page.locator('[data-p4-bulk-confirm]').isEnabled(),false,
  'changing the visible kg disarms the stale Worker plan');
 assert.match(await page.locator('[data-p4-weight-status]').textContent(),
  /Apply all suggestions again/);
 await inputs.first().fill('35');
 await page.locator('[data-p4-bulk-plan]').click();
 await page.waitForFunction(()=>document.querySelector(
  '[data-p4-bulk-confirm]')?.disabled===false,null,{timeout:120000});
 assert.equal(await inputs.first().inputValue(),'35');
 await page.locator('[data-p4-bulk-confirm]').click();
 await page.waitForFunction(()=>/Apply all Match-1 accepted 1/.test(
  document.querySelector('[data-p4-weight-status]')?.textContent||''),
  null,{timeout:120000});
 const after=await page.evaluate(async()=>{
  const {getXml229CurrentWorkerHeldReview}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
  const s=getXml229CurrentWorkerHeldReview(window.__stateRef);
  const p=await s.readCompletion();
  return {counts:p.counts,nativeRelease:p.ciiReleaseAuthorized};
 });
 assert.equal(after.counts.match1,1);
 assert.equal(after.counts.final,0);
 assert.equal(after.nativeRelease,false);
 assert.deepEqual(pageErrors,[]);
 console.log(JSON.stringify({schema:'XML229.P1.TwoClickChromium.v1',
  before,after,firstDraftKg:'35',manualEditInvalidatedPlan:true,
  passed:true,nativeCiiReleaseAuthorized:false}));
 await page.evaluate(async()=>{
  const {getXml229CurrentWorkerHeldReview}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
  getXml229CurrentWorkerHeldReview(window.__stateRef)?.cancel();
 });
}finally{
 await browser?.close();await new Promise(ok=>server.close(ok));
}
