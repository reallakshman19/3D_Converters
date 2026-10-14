/**
 * P4-B: browser Worker RPC for source-attested engineering FactRecords.
 * The main thread never parses staged JSON or recomputes XML Preview here.
 * A current external original source/physical census is REQUIRED by the
 * existing GC-PW bridge; the Worker may not issue its own expectation.
 */
const PROTOCOL='XML229.P4.EngineeringFactWorker.v1';
function failure(err){
 const error=new Error(err?.message||'Verified engineering Worker failed');
 error.code=err?.code||'ENGINEERING_WORKER_FAILED';error.retryable=false;
 return error;
}
export function createXml229EngineeringWorkerClient({
 workerFactory=()=>new Worker(new URL('./xml229-preview-engineering-worker.mjs',import.meta.url),
   {type:'module'}),
 xmlText,sourceId,live,expectedOriginalCount,maxPhysical=10000,
 originalStagedBlob=null,originalStagedSourceReceipt=null,
 onProgress=()=>{},
}={}){
 if(typeof workerFactory!=='function'||typeof xmlText!=='string'||
    !sourceId||!live||!Number.isSafeInteger(expectedOriginalCount)||
    expectedOriginalCount<1)
  throw failure({code:'ORIGINAL_WORKER_INPUT_REQUIRED',message:'Original XML, source ID, live source/master buffers and independent census required'});
 let worker=null,active=null,disposed=false,counter=0;
 const pending=new Map();
 const abort=error=>{
   disposed=true;try{worker?.terminate?.()}catch{}
   for(const {reject} of pending.values())reject(error);
   pending.clear();
   active?.reject(error);
 };
 const send=(body)=>{
   if(disposed||!worker)throw failure({code:'WORKER_CLOSED'});
   worker.postMessage({...body,protocol:PROTOCOL,requestId:active.requestId});
 };
 const handleMessage=({data:msg})=>{
   if(!active||msg?.protocol!==PROTOCOL||msg.requestId!==active.requestId||disposed)return;
   if(msg.state==='progress'){onProgress(msg.stage);return;}
   if(msg.state==='completed'){
     if(msg.info?.basisId!==active.basis.basisId||
       msg.info.engineeringReady!==true||
       msg.info.computationStage!=='engineering-verified'||
       msg.workerResult?.engineeringAcceptance!=='VERIFIED'||
       msg.workerResult?.fullFactPopulationAccepted!==true){
       abort(failure({code:'UNVERIFIED_WORKER_RESPONSE',message:'Worker cannot claim completed physical engineering evidence'}));
       return;
     }
     active.info=msg.info;active.summary=msg;
     active.resolve(msg.workerResult);
     return;
   }
   if(msg.state==='failed'||msg.state==='cancelled'){
     abort(failure(msg.error||{code:'CANCELLED',message:'Source Worker cancelled'}));return;
   }
   if(msg.state==='page'||msg.state==='page-failed'){
     const entry=pending.get(msg.rpcId);
     if(!entry)return;
     pending.delete(msg.rpcId);
     if(msg.state==='page-failed')entry.reject(failure(msg.error));
     else entry.resolve(msg.page);
   }
 };
 return Object.freeze({
   startJob({basis,requestId}={}){
     if(disposed||worker||!basis||basis.basisId?.length!==64||
       typeof requestId!=='string'||!requestId.trim())
       throw failure({code:'INVALID_WORKER_JOB',message:'Unique job/basis and one-shot Worker required'});
     worker=workerFactory();
     if(!worker||typeof worker.postMessage!=='function'||
       typeof worker.addEventListener!=='function')
       throw failure({code:'WORKER_REQUIRED',message:'Native isolated Worker required'});
     let resolve,reject;
     const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});
     active={basis,requestId,resolve,reject,promise,info:null,summary:null};
     worker.addEventListener('message',handleMessage);
     worker.addEventListener('error',e=>abort(failure({
       code:'ENGINEERING_WORKER_CRASH',message:String(e?.message||e),
     })));
     worker.addEventListener('messageerror',()=>abort(failure({code:'ENGINEERING_WORKER_SERIALIZATION_FAILED'})));
     send({kind:'start',basis,live,xmlText,sourceId,
       expectedOriginalCount,maxPhysical,
       originalStagedBlob,originalStagedSourceReceipt});
     return Object.freeze({basisId:basis.basisId,requestId,promise,
       cancel:()=>{if(disposed)return;try{send({kind:'cancel'});}catch{}
         abort(failure({code:'CANCELLED',message:'Preview Weight Worker cancelled'}));},
     });
   },
   async openFactModel({basis,requestId}={}){
     if(!active||disposed||basis?.basisId!==active.basis.basisId||
       requestId!==active.requestId||!active.info)
       throw failure({code:'WORKER_MODEL_NOT_READY',message:'No verified, current engineering FactRecord model'});
     const info=active.info;
     return Object.freeze({
       info,
       getFacts(query){
         if(disposed||query?.basisId!==info.basisId)
           return Promise.reject(failure({code:'STALE_ENGINEERING_BASIS',message:'Physical fact query source changed'}));
         const rpcId='page-'+(++counter);
         return new Promise((resolve,reject)=>{
           pending.set(rpcId,{resolve,reject});
           try{send({kind:'read',rpcId,query});}
           catch(error){pending.delete(rpcId);reject(error);}
         });
       },
     });
   },
   getSummary(){return active?.summary||null;},
   dispose(){if(!disposed)abort(failure({code:'DISPOSED',message:'Engineering Worker was disposed'}));},
 });
}
