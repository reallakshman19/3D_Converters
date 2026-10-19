/**
 * Exact served-root + served-docs Chromium smoke for XML229 candidate gate.
 * Deliberately no synthetic Worker acceptance and no native CII release.
 * Proves real module graph loads and disabled original-json Run cannot bypass.
 */
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
  const location=new URL(req.url,'http://localhost').pathname;
  if(location==='/xml229-test.html'){
   res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
   res.end('<!doctype html><html><head><meta charset="utf-8"></head>'+
     '<body><section id="run"></section></body></html>');
   return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(location));
  if(!file.startsWith(root+path.sep))throw Error('Outside repository root');
  const bytes=await readFile(file);
  const extension=path.extname(file);
  const mime=['.js','.mjs'].includes(extension)?'text/javascript':
   extension==='.py'?'text/plain':'application/json';
  res.writeHead(200,{'content-type':mime});res.end(bytes);
 }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({acceptDownloads:true});
 const pageErrors=[],downloads=[];
 page.on('pageerror',error=>pageErrors.push(String(error)));
 page.on('download',download=>downloads.push(download.suggestedFilename()));
 await page.goto('http://127.0.0.1:'+server.address().port+'/xml229-test.html');
 const snapshots=[];
 for(const prefix of ['', 'docs/']){
  const status=await page.evaluate(async prefix=>{
   const script=new URL(prefix+'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',
      document.baseURI).href;
   const mod=await import(script);
   const el=document.querySelector('#run');
   const stateRef={current:{
     sourceKind:'xml',sourceName:'candidate.xml',
     sourceText:'<PipeStressExport><Pipe><Branch>'+
       '<Branchname>/SYNTHETIC/B1</Branchname>'+
       '<Node><NodeNumber>10</NodeNumber><ComponentType>BRAN</ComponentType>'+
       '<Position>0 0 0</Position></Node></Branch></Pipe></PipeStressExport>',
     supportConfigJson:'{}',options:{outputMode:'both'},
     xml229StagedSourceReceipt:{
       schema:'XML229.OriginalStagedSourceReceipt.v1',
       phase:'INDEX_COMMITTED',sha256:'a'.repeat(64),
     },
   }};
   mod.renderStandaloneOutputRunPanel(el,stateRef,()=>{});
   const candidate=el.querySelector('[data-action="xml229-native-candidate"]');
   const run=el.querySelector('[data-action="run"]');
   const held=el.textContent.includes('Original JSON')&&
    el.textContent.includes('HELD');
   const answer={
     modulePrefix:prefix||'root',candidatePresent:!!candidate,
     candidateDisabled:candidate?.disabled,runDisabled:run?.disabled,
     explicitNonreleasing:candidate?.textContent.includes('nonreleasing'),
     held,unapprovedDownloads:[],
   };
   candidate?.click();
   return answer;
  },prefix);
  snapshots.push(status);
  assert.equal(status.candidatePresent,true,JSON.stringify(status));
  assert.equal(status.candidateDisabled,true,JSON.stringify(status));
  assert.equal(status.runDisabled,true,JSON.stringify(status));
  assert.equal(status.explicitNonreleasing,true,JSON.stringify(status));
  assert.equal(status.held,true,JSON.stringify(status));
 }
 // Verify candidate Python runtime asset is actually served in both layouts.
 for(const prefix of ['','docs/']){
  const response=await page.request.get(
   'http://127.0.0.1:'+server.address().port+'/'+prefix+
   'converters/scripts/xml229_native_candidate_witness.py');
  assert.equal(response.status(),200,'candidate witness unavailable: '+prefix);
  assert((await response.text()).includes('XML229.NativeRetainedCandidateWitness.v1'));
 }
 assert.deepEqual(pageErrors,[],'browser page errors: '+pageErrors.join('; '));
 assert.deepEqual(downloads,[],'HELD candidate caused download');
 console.log(JSON.stringify({schema:'XML229.NativeCandidateServedSmoke.v1',
   snapshots,pageErrors:pageErrors.length,downloads:downloads.length,
   nativeReleaseAuthorized:false}));
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
