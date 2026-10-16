/**
 * XML229 P4-D browser facade. One original staged JSON Blob stays in the
 * isolated engineering/GC-PW Worker for its whole lifetime. Only source-
 * canonical page/query and explicit CAS-reviewed actions enter/leave it.
 *
 * isCurrent() MUST re-check active original File/Blob generation, original
 * XML selection and master/config revision before every read or decision.
 * Fail closed if UI changed: no stale Weight/Final action or Run receipt.
 */
import {physicalOccurrenceId}
 from '../../../contracts/gc-pw-v1/occurrence-bridge.mjs';

const PROTOCOL='XML229.P4.WorkerHeldOriginalJsonGC-PW.v1';
const CENSUS='XML229.P4.OriginalWeightCensus.v1';
const err=(code,message)=>{
 const e=new Error(message||code);e.code=code;e.retryable=false;return e;
};
function independentCensus({xmlText,sourceId,config,requestId,workerFactory}){
 const worker=workerFactory();
 if(!worker||typeof worker.postMessage!=='function')
   return Promise.reject(err('INDEPENDENT_WORKER_REQUIRED','Native original census Worker required'));
 return new Promise((resolve,reject)=>{
   let done=false;
   const finish=(error,value)=>{
     if(done)return;done=true;worker.terminate();
     if(error)reject(error);else resolve(value);
   };
   worker.addEventListener('message',({data:m})=>{
     if(m?.protocol!==CENSUS||m.requestId!==requestId)return;
     if(m.state==='completed')finish(null,m);
     else if(m.state==='failed')finish(err(m.error?.code||'ORIGINAL_CENSUS_FAILED',
       m.error?.message));
   });
   worker.addEventListener('error',e=>finish(err('ORIGINAL_CENSUS_WORKER_CRASH',
     String(e?.message||e))));
   worker.postMessage({protocol:CENSUS,requestId,kind:'start',xmlText,sourceId,config});
 });
}
export async function openXml229WorkerHeldOriginalWeightReview({
 xmlText,sourceId,masters,selection,config,overrides={},
 originalStagedBlob,originalStagedSourceReceipt,requestId,maxPhysical=10000,
 isCurrent,onProgress=()=>{},
 censusWorkerFactory=()=>new Worker(new URL('./xml229-original-physical-census-worker.mjs',import.meta.url),
  {type:'module'}),
 weightWorkerFactory=()=>new Worker(new URL('./xml229-original-blob-gcpw-worker.mjs',import.meta.url),
  {type:'module'}),
}={}){
 if(typeof isCurrent!=='function')
   throw err('LIVE_SOURCE_REVISION_PORT_REQUIRED',
     'A real source/file/master/config staleness port is mandatory');
 if(!requestId||typeof requestId!=='string'||typeof xmlText!=='string'||
    !sourceId||!masters||!config||!Array.isArray(selection)||
    selection.length!==1||selection[0].sourceId!==sourceId||
    selection[0].selectionRef!=='all')
   throw err('ORIGINAL_SOURCE_SCOPE_REQUIRED',
     'Original XML, one full source selection, masters and config required');
 if(!isCurrent())throw err('STALE_INPUT','Original source changed before Worker start');
 const census=await independentCensus({xmlText,sourceId,config,requestId,
   workerFactory:censusWorkerFactory});
 if(!isCurrent())throw err('STALE_INPUT','Original source changed during census');
 const worker=weightWorkerFactory();
 if(!worker||typeof worker.postMessage!=='function'||
    typeof worker.addEventListener!=='function')
   throw err('ENGINEERING_WORKER_REQUIRED','Native original JSON source Worker required');
 let disposed=false,counter=0,ready=null,settle;
 const outstanding=new Map();
 const stop=error=>{
   if(disposed)return;disposed=true;ready=null;
   try{worker.terminate()}catch{}
   for(const {reject} of outstanding.values())reject(error);
   outstanding.clear();
   settle?.reject(error);
 };
 const send=payload=>{
   if(disposed)throw err('CANCELLED','Worker is closed');
   worker.postMessage({...payload,protocol:PROTOCOL,requestId});
 };
 const current=()=>{
   if(disposed)throw err('CANCELLED','Worker closed');
   if(!isCurrent()){
     const changed=err('STALE_INPUT','Source Blob, Owner selection or masters changed; rebuild and review');
     stop(changed);throw changed;
   }
 };
 const started=new Promise((resolve,reject)=>{settle={resolve,reject}});
 worker.addEventListener('message',({data:m})=>{
   if(m?.protocol!==PROTOCOL||m.requestId!==requestId||disposed)return;
   if(m.state==='progress'){onProgress(m.stage);return;}
   if(m.state==='ready'){
     if(!m.engineeringFactsVerified||m.weightEngineeringAccepted!==false||
        m.finalEngineeringAccepted!==false||
        m.originalJsonSha256!==originalStagedSourceReceipt?.sha256||
        m.sourceGenerationId!==originalStagedSourceReceipt?.generationId||
        m.sourceId!==sourceId||m.physicalCount!==census.counts.physical){
       stop(err('UNVERIFIED_WEIGHT_RESPONSE','Worker asserted wrong original source/fact population'));return;
     }
     ready=Object.freeze(m);settle.resolve(ready);settle=null;return;
   }
   if(m.state==='failed'||m.state==='cancelled'){
     stop(err(m.error?.code||'ENGINEERING_WORKER_FAILED',
       m.error?.message||'Original staged source Worker failed'));return;
   }
   if(m.state==='rpc-result'||m.state==='rpc-failed'){
     const request=outstanding.get(m.rpcId);
     if(!request)return;
     outstanding.delete(m.rpcId);
     if(m.state==='rpc-failed')request.reject(err(m.error?.code||'GC_PW_RPC_FAILED',m.error?.message));
     else request.resolve(m.value);
   }
 });
 worker.addEventListener('error',e=>stop(err('ENGINEERING_WORKER_CRASH',String(e?.message||e))));
 worker.addEventListener('messageerror',()=>stop(err('WORKER_SERIALIZATION_FAILED','Source review result cannot cross Worker')));
 try{
   send({kind:'start',xmlText,sourceId,masters,selection,config,overrides,
     originalStagedBlob,originalStagedSourceReceipt,
     independentSourceOccurrences:census.independentSourceOccurrences,
     independentPhysicalOccurrences:census.independentPhysicalOccurrences,
     expectedOriginalCount:census.counts.original,maxPhysical});
   await started;current();
 }catch(error){stop(error);throw error;}
 const rpc=(payload)=>{
   current();
   if(!ready)throw err('REVIEW_SESSION_NOT_READY','Original JSON Weight review not verified');
   const rpcId='source-review-'+(++counter);
   return new Promise((resolve,reject)=>{
     outstanding.set(rpcId,{resolve,reject});
     try{send({...payload,kind:payload.kind,rpcId,basisId:ready.basisId,
       sourceGenerationId:ready.sourceGenerationId});}
     catch(error){outstanding.delete(rpcId);reject(error);}
   }).then(value=>{current();return value;});
 };
 return Object.freeze({
   receipt:ready,
   // Read-only liveness; disposing a Worker must invalidate its registry
   // authority even when navigation leaves the original entry reachable.
   get closed(){return disposed;},
   originalPhysicalOccurrences:Object.freeze(census.independentPhysicalOccurrences.map(row=>({
     ...row,occurrenceId:physicalOccurrenceId(row),
   }))),
   async readCompletion(){
     return rpc({kind:'read',what:'completion',sourceId});
   },
   async readPreviewResult(){
     const result=await rpc({kind:'read',what:'preview',sourceId});
     if(result?.engineeringAcceptance!=='NOT_ASSESSED'||
       result?.fullFactPopulationAccepted!==false||
       result?.originalStagedSourceSha256!==originalStagedSourceReceipt.sha256||
       result?.originalStagedSourceGeneration!==originalStagedSourceReceipt.generationId||
       !Array.isArray(result?.branchRows)||!Array.isArray(result?.nodeRows)||
       result?.sourceOccurrences?.branches?.length!==result?.coverage?.sourceBranchCount)
       throw err('VERIFIED_PREVIEW_PRESENTATION_DRIFT',
         'Preview rows do not belong to current original engineering session');
     return result;
   },
   async readNativeFinalIntent(){
     return rpc({kind:'read',what:'native-final-intent',sourceId});
   },
   async attestEngineInput({engineInputXmlText}={}){
     return rpc({kind:'read',what:'attest-engine-input',sourceId,engineInputXmlText});
   },
   async readPage({offset=0,limit=25,filter='all',query=''}={}){
     return rpc({kind:'read',what:'page',sourceId,offset,limit,filter,query});
   },
   async planQualifiedBlankFill(){
     return rpc({kind:'read',what:'bulk-plan',sourceId});
   },
   async commitQualifiedBlankFill({planId}={}){
     if(typeof planId!=='string'||!planId)
       throw err('BULK_PLAN_REQUIRED','Review current source-bound Match-1 bulk plan first');
     return rpc({kind:'bulk-commit',sourceId,planId});
   },
   async readIndividual({occurrenceId,stage='RigidMatch1'}={}){
     return rpc({kind:'read',what:'individual',sourceId,occurrenceId,stage});
   },
   async readFacts({cursor=null,limit=100}={}){
     return rpc({kind:'read',what:'facts',sourceId,cursor,limit});
   },
   async readProposals({occurrenceIds,cursor=null,limit=100}={}){
     return rpc({kind:'read',what:'proposals',sourceId,occurrenceIds,cursor,limit});
   },
   async readDecisions({stage='RigidMatch1'}={}){
     return rpc({kind:'read',what:'decisions',sourceId,stage});
   },
   async readDecisionProvenance(){
     return rpc({kind:'read',what:'decision-provenance',sourceId});
   },
   async exportReviewBackup(){
     return rpc({kind:'read',what:'review-backup',sourceId});
   },
   async restoreReviewBackup({backup}={}){
     if(!backup||typeof backup!=='object'||Array.isArray(backup))
       throw err('REVIEW_BACKUP_REQUIRED','Explicit Owner-chosen review file required');
     return rpc({kind:'restore-review',sourceId,backup});
   },
   async review({view,choice}={}){
     if(!view||!choice)
       throw err('EXPLICIT_REVIEW_REQUIRED','A current original physical view and explicit engineering decision required');
     return rpc({kind:'decision',sourceId,occurrenceId:view.occurrenceId,stage:view.stage,view,choice});
   },
   cancel(){
     if(disposed)return;
     try{send({kind:'cancel'});}catch{}
     stop(err('CANCELLED','User cancelled original JSON Weight review'));
   },
 });
}
