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
 await page.waitForFunction(()=>document.querySelectorAll('tr[data-p4-row]').length===1,
  null,{timeout:20000});

 // Independent Node-host deadline: even if Pyodide blocks the browser's
 // own event loop, the CI harness must terminate with a usable failure.
 const result=await Promise.race([page.evaluate(async()=>{
   const {getXml229CurrentWorkerHeldReview}=await import(
     '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js');
   const {runXml229NonreleasingNativeCandidate}=await import(
     '/docs/tabs/xml-cii-2019-standalone/integration/xml229-nonreleasing-native-candidate.mjs');
   const session=getXml229CurrentWorkerHeldReview(window.__stateRef);
   if(!session)throw new Error('Missing actual GC-PW Worker');
   const completion=await session.readCompletion();
   const final=await session.readNativeFinalIntent();
   const xml=window.__options.xmlText;
   const wrong=xml.replace('<Weight>35</Weight>','<Weight>0</Weight>');
   if(wrong===xml)throw new Error('Missing original mass write challenge');
   const prepared=await session.prepareEngineInputMasses({engineInputXmlText:wrong});
   if(!prepared.engineInputXmlText.includes('<Weight>35</Weight>'))
     throw new Error('Actual Worker did not restore original reviewed 35kg');
   if(prepared.transfer?.verifiedEnginePhysicalCount!==1)
     throw new Error('Wrong actual R2 original physical population');
   const job={
     sourceKind:'xml',sourceName:'xml229-real-worker-source.xml',
     sourceText:xml,
     stagedJsonText:await window.__options.originalStagedBlob.text(),
     supportConfigJson:JSON.stringify(window.__options.config),
     options:{outputMode:'cii-only',kgToNewton:true,
       splitCondensedValveFlange:false,useRestraintTypeBasedOnJson:false},
   };
   let candidate=null,failure=null;
   try{candidate=await runXml229NonreleasingNativeCandidate({
     job,session,assertCurrent:()=>{
       if(session.closed||getXml229CurrentWorkerHeldReview(window.__stateRef)!==session)
         throw new Error('STALE_CURRENT_WORKER');
     },
   });}
   catch(error){failure={code:error?.code||'UNKNOWN',message:String(error?.message||error).slice(0,200)};}
   session.cancel();
   return {
     completionCounts:completion.counts,
     reviewedFinalEligible:final.eligibleForEngineBinding,
     physicalCount:final.physicalCount,
     rewriteKg:prepared.transfer.matches[0].engineWeightKg,
     rewriteVerified:true,
     candidate,failure,
   };
 }),new Promise((_,reject)=>{
   const watchdog=setTimeout(()=>reject(new Error(
     'XML229_REAL_WORKER_NATIVE_CHROMIUM_DEADLINE_EXCEEDED')),180000);
   watchdog.unref();
 })]);
 assert.equal(result.reviewedFinalEligible,true,'Synthetic source Weight=35 must bind without inferred approval: '+JSON.stringify(result));
 assert.equal(result.completionCounts?.source,1,'The synthetic source mass should be exactly one source-authoritative positive kg');
 assert.equal(result.rewriteVerified,true);
 assert.equal(result.rewriteKg,35);
 assert(result.candidate,'Real Worker → parity → Pyodide candidate failed: '+JSON.stringify(result));
 assert.equal(result.candidate.actualNativeCiiProduced,true);
 assert.equal(result.candidate.originalPhysicalCount,1);
 assert.equal(result.candidate.nativeRigidObserved,1);
 assert.equal(result.candidate.unresolvedNativeOwners,0);
 assert.equal(result.candidate.nativeCiiReleaseAuthorized,false);
 assert.equal(result.candidate.ciiDownloadAuthorized,false);
 assert.deepEqual(pageErrors,[]);
 console.log(JSON.stringify({
   schema:'XML229.RealWorkerNativeCandidateChromium.v1',
   sourcePhysicals:result.physicalCount,
   verifiedRewriteKg:result.rewriteKg,
   nativeElements:result.candidate.nativeElements,
   nativeRigidObserved:result.candidate.nativeRigidObserved,
   nativeReleaseAuthorized:false,
   independentlyAcceptedFinal:false,
   originalSourceKind:'synthetic',
 }));
}finally{
 await browser?.close();await new Promise(ok=>server.close(ok));
}
