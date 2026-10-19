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
  const original='{"synthetic":"two-click-source-bound","components":[1,2]}';
  const blob=new Blob([original],{type:'application/json'});
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest(
    'SHA-256',await blob.arrayBuffer())),
    x=>x.toString(16).padStart(2,'0')).join('');
  const sourceId='P1-CHROMIUM-TWO-CLICK';
  const xml='<PipeStressExport><Pipe><Branch>'+
   '<Branchname>/ASIM-1836-8"-P8810021-31441C4-PP/B4</Branchname>'+
   '<Node><NodeNumber>100</NodeNumber><ComponentType>GASK</ComponentType>'+
   '<ElementLengthMm>2</ElementLengthMm><Position>0 0 0</Position></Node>'+
   '<Node><NodeNumber>200</NodeNumber><ComponentType>RIGID</ComponentType>'+
   '<NodeName>88-VGT-25202</NodeName><BoreMm>200</BoreMm>'+
   '<ComponentRefNo>1006649732/119364</ComponentRefNo><Endpoint>2</Endpoint>'+
   '<ElementLengthMm>112</ElementLengthMm><Position>112 0 0</Position>'+
   '<Rigid>2</Rigid><Weight>35</Weight></Node></Branch></Pipe></PipeStressExport>';
  const master=[{Rating:'300',Bore:200,Length:112,'RF/RTJ KG':35,TypeDesc:'Gate Valve'}];
  const receipt={schema:'XML229.OriginalStagedSourceReceipt.v1',
   phase:'INDEX_COMMITTED',rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
   sha256:sha,sourceRevision:'o1:sha256:'+sha,
   generationId:'xml229-p1-test-generation-1',sourceRefId:'p1-worker-source',
   byteLength:blob.size,occurrenceCount:2,pageCount:1};
  // Synthetic manual Preview rating, source-bound by the XML branch Line Key.
  const overrides={rating:{P8810021:'300'},processData:{P8810021:{rating:'300'}}};
  const options={
   xmlText:xml,sourceId,
   masters:{weight:{datasetId:'P1-test-master',revision:'v1',
    rows:master,mapping:{weight:'RF/RTJ KG'}}},
   config:{weight:{masterRows:master},overrides},overrides,
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
 try{
  await page.waitForFunction(()=>
   document.querySelector('[data-p4-preview-status]')?.textContent.includes(
    'Preview engineering facts VERIFIED')===true,null,{timeout:45000});
 }catch(error){
  const snapshot=await page.evaluate(()=>({
   status:document.querySelector('[data-p4-preview-status]')?.textContent,
   buildDisabled:document.querySelector('[data-p4-preview-build]')?.disabled,
   weightStatus:document.querySelector('[data-p4-weight-status]')?.textContent,
  }));
  throw new Error('Synthetic Preview authority was not verified: '+
   JSON.stringify(snapshot)+' | '+String(error?.message||error));
 }
 await page.evaluate(async()=>{
  const {installXml229WorkerHeldWeightPanel}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
  installXml229WorkerHeldWeightPanel(document.querySelector('#weight'),
    window.__stateRef,{resolveInputs:async()=>window.__options});
 });
 // A source-positive mass need not be displayed in the UI's default
 // blank-weight filter; wait on the actual current source-bound Worker.
 await page.waitForFunction(async()=>{
   const {getXml229CurrentWorkerHeldReview}=await import(
     '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
   return !!getXml229CurrentWorkerHeldReview(window.__stateRef);
 },null,{timeout:30000});


 const result=await page.evaluate(async()=>{
   const {getXml229CurrentWorkerHeldReview}=await import(
     '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
   const session=getXml229CurrentWorkerHeldReview(window.__stateRef);
   if(!session)throw new Error('REAL_CURRENT_GC_PW_WORKER_MISSING');
   const completion=await session.readCompletion();
   const final=await session.readNativeFinalIntent();
   const original=window.__options.xmlText;
   const wrong=original.replace('<Weight>35</Weight>','<Weight>0</Weight>');
   if(wrong===original)throw new Error('SOURCE_35KG_REWRITE_CHALLENGE_INVALID');
   const prepared=await session.prepareEngineInputMasses({engineInputXmlText:wrong});
   const output={
     sourceCount:completion.counts?.source,
     finalEligible:final.eligibleForEngineBinding,
     finalPhysicalCount:final.physicalCount,
     rewriteKg:prepared.transfer?.matches?.[0]?.engineWeightKg,
     R2status:prepared.transfer?.status,
     actualXmlContains35:prepared.engineInputXmlText.includes('<Weight>35</Weight>'),
     nativeReleaseAuthorized:prepared.nativeCiiReleaseAuthorized,
   };
   session.cancel();
   return output;
 });
 assert.equal(result.sourceCount,1,JSON.stringify(result));
 assert.equal(result.finalEligible,true,JSON.stringify(result));
 assert.equal(result.finalPhysicalCount,1,JSON.stringify(result));
 assert.equal(result.rewriteKg,35,JSON.stringify(result));
 assert.equal(result.actualXmlContains35,true,JSON.stringify(result));
 assert.equal(result.R2status,'ENGINE_INPUT_MASS_TRANSFER_VERIFIED_ONLY');
 assert.equal(result.nativeReleaseAuthorized,false);
 assert.deepEqual(pageErrors,[]);
 console.log(JSON.stringify({schema:'XML229.RealWorkerR2Chromium.v1',
   sourceKg:35,originalPhysicalCount:1,fullWorkerR2:true,
   nativeCiiReleaseAuthorized:false}));
}finally{
 await browser?.close();await new Promise(ok=>server.close(ok));
}
