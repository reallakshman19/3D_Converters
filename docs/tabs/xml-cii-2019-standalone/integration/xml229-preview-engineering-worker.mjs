/**
 * XML229 P4-B: isolated original XML engineering-fact Worker. Delivers
 * bounded canonical FactRecord pages. No DOM main-thread fallback, no
 * scoring acceptance, no legacy row cache and no automatic weight writes.
 *
 * Large original staged JSON Blob is intentionally HELD until a separate
 * Worker-held basis/custody service exists; never decode a 100 MiB JSON
 * source in the main browser to satisfy this protocol.
 */
import {installWeightBasisXmlDom} from '../workers/weight-basis-xml-dom.js';
import {xmlCiiDryRunPreview}
  from '../ui-adapted/xml-cii-adapted-preview-dryrun.js';
import {projectXmlCiiOccurrences}
  from '../ui-adapted/xml-cii-adapted-preview-facts-xml-source.js';
import {openXml229EngineeringFactModel}
  from './xml229-preview-engineering-fact-producer.mjs';

installWeightBasisXmlDom(globalThis);
const PROTOCOL='XML229.P4.EngineeringFactWorker.v1';
const refuse=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
let used=false,ready=null,cancelled=false,activeId='';
const send=(id,message)=>postMessage({protocol:PROTOCOL,requestId:id,...message});
self.addEventListener('message',async({data:req})=>{
 if(req?.protocol!==PROTOCOL||typeof req.requestId!=='string'||!req.requestId)
   return;
 if(req.kind==='cancel'&&req.requestId===activeId){
   cancelled=true;ready=null;
   send(req.requestId,{state:'cancelled'});self.close();return;
 }
 if(req.kind==='read'){
   if(!ready||req.requestId!==activeId||cancelled){
     send(req.requestId,{state:'page-failed',rpcId:req.rpcId,
       error:{code:'ENGINEERING_MODEL_NOT_READY',message:'No current verified engineering model'}});return;
   }
   try{
     const page=await ready.model.getFacts(req.query);
     if(cancelled)return;
     send(req.requestId,{state:'page',rpcId:req.rpcId,page});
   }catch(e){
     send(req.requestId,{state:'page-failed',rpcId:req.rpcId,
       error:{code:e?.code||'ENGINEERING_PAGE_FAILED',message:String(e?.message||e)}});
   }
   return;
 }
 if(req.kind!=='start')return;
 if(used){
   send(req.requestId,{state:'failed',error:{code:'ONE_SHOT_WORKER',message:'Engineering Fact Worker is one-shot'}});return;
 }
 used=true;activeId=req.requestId;
 try{
   const {basis,live,xmlText,sourceId,expectedOriginalCount}=req;
   if(!basis||!live||typeof xmlText!=='string'||!xmlText.trim()||
      typeof sourceId!=='string'||!Number.isSafeInteger(expectedOriginalCount)||
      expectedOriginalCount<1)
     refuse('INVALID_START_ENVELOPE','Original source and independent census required');
   if(req.originalStagedBlob!=null||req.originalStagedSourceReceipt!=null)
     refuse('ORIGINAL_BLOB_WORKER_BASIS_PENDING',
       'Original large JSON cannot be promoted until its Worker-held staged source basis is implemented');
   if(live.stagedSource!=null&&String(live.stagedSource).length>2*1024*1024)
     refuse('STAGED_SOURCE_UI_COPY_FORBIDDEN','Use Worker-held Blob source for large JSON; no UI text copy');
   send(req.requestId,{state:'progress',stage:'original-source-parse'});
   const original=projectXmlCiiOccurrences({xmlText,mode:'A',sourceId});
   if(original.branchCount+original.nodeCount!==expectedOriginalCount)
     refuse('INDEPENDENT_CENSUS_MISMATCH','Caller original population mismatches Worker XML');
   if(expectedOriginalCount>250000)
     refuse('BOUNDED_ORIGINAL_CENSUS','P4 physical-fact Worker refuses oversized original census until streaming is qualified');
   if(cancelled)return;
   send(req.requestId,{state:'progress',stage:'real-engineering-preview'});
   const computed=xmlCiiDryRunPreview(xmlText,live.config||{},live.stagedSource||'');
   if(cancelled)return;
   const result={...computed,sourceOccurrences:original,
     engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false};
   send(req.requestId,{state:'progress',stage:'independent-source-and-physical-verification'});
   const verified=await openXml229EngineeringFactModel({
     basis,live,xmlText,sourceId,previewResult:result,
     expectedOriginalCount,maxPhysical:req.maxPhysical??10000,
   });
   if(cancelled)return;
   ready=verified;
   send(req.requestId,{state:'completed',
     info:verified.model.info,
     originalOccurrences:verified.sourceOccurrenceCensus,
     physicalOccurrences:verified.physicalOccurrences,
     originalNodeOccurrences:verified.originalOccurrences,
     workerResult:verified.workerResult,
     counts:{
       original:verified.workerOriginalCount,
       originalNodes:verified.expectedOriginalCount,
       model:verified.expectedModelOccurrenceCount,
       physical:verified.physicalOccurrences.length,
       physicalFacts:verified.expectedPhysicalFactCount,
     },
   });
 }catch(error){
   if(cancelled)return;
   send(req.requestId,{state:'failed',
     error:{code:error?.code||'ENGINEERING_FACT_WORKER_FAILED',
       message:String(error?.message||error)}});
 }
});
