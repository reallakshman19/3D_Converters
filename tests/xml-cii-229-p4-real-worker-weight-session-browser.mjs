import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{
  const raw=new URL(req.url,'http://localhost').pathname;
  if(raw==='/test.html'){
   res.writeHead(200,{'content-type':'text/html'});
   res.end('<!doctype html><html><body><div id="result"></div></body></html>');
   return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(raw));
  if(!file.startsWith(root+path.sep))throw Error('path traversal');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':(['.js','.mjs'].includes(path.extname(file))?'text/javascript':'application/json')});
  res.end(data);
 }catch(e){res.writeHead(404);res.end(String(e))}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')pageErrors.push(m.text())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/test.html');
 const output=await page.evaluate(async()=>{
   const {openXml229AttestedWeightReview}=await import(
     '/docs/tabs/xml-cii-2019-standalone/integration/xml229-verified-weight-session-orchestrator.mjs');
   const {projectXmlCiiOccurrences}=await import(
     '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-xml-source.js');
   const src='ORIGINAL-P4';
   const xml=`<PipeStressExport><Pipe><Branch><Branchname>/ASIM-1836-8"-P8810021-31441C4-PP/B4</Branchname>
<Node><NodeNumber>280</NodeNumber><ComponentType>GASK</ComponentType><ElementLengthMm>2</ElementLengthMm><Position>0 0 0</Position></Node>
<Node><NodeNumber>300</NodeNumber><ComponentType>RIGID</ComponentType><Rigid>2</Rigid><BoreMm>200</BoreMm>
<ComponentRefNo>1006649732/119364</ComponentRefNo><Endpoint>2</Endpoint>
<ElementLengthMm>112</ElementLengthMm><Position>112 0 0</Position><Weight>0</Weight></Node>
<Node><NodeNumber>309</NodeNumber><ComponentType>VALV</ComponentType><BoreMm>200</BoreMm>
<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>2</Endpoint>
<ElementLengthMm>419</ElementLengthMm><Position>531 0 0</Position><Weight>0</Weight></Node>
<Node><NodeNumber>320</NodeNumber><ComponentType>INST</ComponentType>
<ComponentRefNo>1006649732/119369</ComponentRefNo><Endpoint>2</Endpoint>
<Position>650 0 0</Position><Weight>0</Weight></Node>
</Branch></Pipe></PipeStressExport>`;
   const original=projectXmlCiiOccurrences({xmlText:xml,sourceId:src});
   const physical=original.nodes.filter(row=>['RIGID','VALV','INST'].includes(row.componentType))
     .map(row=>({
       sourceId:src,branchOccurrenceIndex:row.branchOccurrenceIndex,
       nodeOrdinal:row.nodeOrdinal,
       componentSignature:JSON.stringify([row.componentType,row.componentRefNo,row.endpoint,'']),
     }));
   const weightRows=[{Rating:'300',Bore:200,Length:112,'RF/RTJ KG':35}];
   const masters={weight:{datasetId:'valve-master',revision:'v1',
      rows:weightRows,mapping:{weight:'RF/RTJ KG'}}};
   const config={weight:{masterRows:weightRows},overrides:{}};
   const options={
     sources:[{sourceId:src,mediaType:'application/xml',text:xml}],masters,
     selection:[{sourceId:src,selectionRef:'all'}],
     config,overrides:{},requestId:'original-p4-browser-engineering',
     independentSourceOccurrences:[...original.branches,...original.nodes],
     independentOriginalNodeOccurrences:original.nodes.map(row=>({
       sourceId:row.sourceId,branchOccurrenceIndex:row.branchOccurrenceIndex,nodeOrdinal:row.nodeOrdinal,
     })),
     independentPhysicalOccurrences:physical,
   };
   const bad=async changes=>{
      try{await openXml229AttestedWeightReview({...options,...changes});return 'UNEXPECTED_ACCEPT';}
      catch(e){return e.code||String(e.message);}
   };
   const refusedPartial=await bad({selection:[{sourceId:src,selectionRef:'branch-0'}]});
   const refusedStaged=await bad({stagedSource:'{"owner":"not-authorized"}'});
   const progress=[];
   const opened=await openXml229AttestedWeightReview({
     ...options,onProgress:stage=>progress.push(stage),
   });
   const {basisId,session,workerSummary,engineeringFacts}=opened;
   const facts=session.review.getFacts({basisId,subjectType:'physical-component',limit:100});
   const m=session.review.getDecisionState({basisId,scopeId:src,stage:'RigidMatch1'});
   const f=session.review.getDecisionState({basisId,scopeId:src,stage:'Rigidmatch2'});
   const outcome={basisId,facts:facts.totalCount,physical:workerSummary.counts.physical,
     originals:workerSummary.counts.original,workerReady:engineeringFacts.engineeringReady,
     match1:m.decisionRevision,final:f.decisionRevision,progress,
     refusedPartial,refusedStaged};
   opened.dispose();
   return outcome;
 });
 assert.match(output.basisId,/^[a-f0-9]{64}$/);
 assert.equal(output.workerReady,true);
 assert.equal(output.facts,3*7);
 assert.equal(output.physical,3);
 assert.equal(output.originals,5);
 assert.equal(output.match1,null);
 assert.equal(output.final,null);
 assert.equal(output.refusedPartial,'INDEPENDENT_FULL_XML_SCOPE_REQUIRED');
 assert.equal(output.refusedStaged,'STAGED_BLOB_BASIS_WORKER_REQUIRED');
 assert(output.progress.includes('real-engineering-preview'));
 assert(output.progress.includes('independent-source-and-physical-verification'));
 assert.deepEqual(pageErrors,[]);
 console.log(JSON.stringify({schema:'XML229_P4_WORKER_REAL_CHROMIUM_V1',ok:true,output,pageErrors},null,2));
}finally{
 await browser?.close();await new Promise(ok=>server.close(ok));
}
