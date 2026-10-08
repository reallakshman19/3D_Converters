/** LFJ R07/U01: single-winner Worker admission/cancellation lifecycle.
 * Reuses R06 native Worker admission. No application/engineering interpretation
 * and no completed source/index/output authority is granted by READY.
 */
import {runRequiredWorkerJob,WorkerExecutionError} from '../execution/required-worker.mjs';

const valid=s=>typeof s==='string'&&s.trim().length>0&&s.length<=1024;
const fail=(code,msg)=>{throw new WorkerExecutionError(code,msg);};

export function createWorkerLifecycleSession({
 jobId,sourceRefId,sourceSha256,sourceRevision,byteLength,selectionDigest,
 createWorker,trustedWorkerCtor,
}={}){
 if(![jobId,sourceRefId,sourceSha256,sourceRevision,selectionDigest].every(valid)||
    !Number.isSafeInteger(byteLength)||byteLength<0)
   fail('INVALID_LIFECYCLE_JOB','source/job and selection basis must be explicit');
 const basis=Object.freeze({jobId,sourceRefId,sourceSha256,sourceRevision,byteLength,selectionDigest});
 const listeners=new Set();
 const trusted=trustedWorkerCtor??globalThis.Worker;
 let worker=null,starting=null,terminal=null,termination=null,state='NEW';
 function notify(event){
   for(const listener of [...listeners]) {
     try{listener(event);}
     catch { /* Observer cannot change terminal truth or Worker cleanup. */ }
   }
   listeners.clear();
 }
 function finish(kind,errorCode){
   if(terminal)return terminal;
   state=kind;
   terminal=Object.freeze({
     schema:'LFJ.WorkerLifecycle.v1',...basis,kind,terminal:true,
     ...(errorCode?{errorCode}:{}),
     complete:false,engineeringReady:false,
   });
   notify(terminal);
   return terminal;
 }
 async function stopWorker(){
   if(!worker)return;
   if(!termination){
     termination=Promise.resolve().then(()=>{
       // Only the trusted native platform method can terminate a genuine
       // Worker; a same-thread Worker-shaped object may spoof terminate().
       if(typeof trusted!=='function'||typeof trusted.prototype?.terminate!=='function')
         fail('INVALID_WORKER_PORT','native Worker termination unavailable');
       return trusted.prototype.terminate.call(worker);
     });
   }
   try{await termination;}catch { /* Preserve already selected terminal state. */ }
 }
 function start(){
   if(terminal)return Promise.resolve(terminal);
   if(starting)return starting;
   if(state!=='NEW')return Promise.resolve(Object.freeze({...basis,kind:'ADMITTED',terminal:false}));
   if(typeof trusted!=='function'||typeof createWorker!=='function'){
     return Promise.resolve(finish('FAILED','WORKER_UNAVAILABLE'));
   }
   try{worker=createWorker();}
   catch{ return Promise.resolve(finish('FAILED','WORKER_UNAVAILABLE')); }
   state='ADMITTING';
   starting=(async()=>{
     try{
       await runRequiredWorkerJob({
         ...basis,trustedWorkerCtor:trusted,createWorker:()=>worker,
       });
       if(terminal)return terminal; // e.g. cancel raced with READY
       state='ADMITTED';
       return Object.freeze({schema:'LFJ.WorkerLifecycle.v1',...basis,
         kind:'ADMITTED',terminal:false,complete:false,engineeringReady:false});
     }catch(error){
       if(terminal)return terminal;
       const result=finish('FAILED',error?.code||'WORKER_FAILED');
       await stopWorker();
       return result;
     }
   })();
   return starting;
 }
 async function cancel(){
   const result=finish('CANCELLED');
   await stopWorker();
   return result;
 }
 function subscribe(listener){
   if(typeof listener!=='function')fail('INVALID_LIFECYCLE_SINK','listener must be a function');
   if(terminal){listener(terminal);return ()=>{};}
   listeners.add(listener);
   return ()=>listeners.delete(listener);
 }
 function snapshot(){
   return terminal||Object.freeze({schema:'LFJ.WorkerLifecycle.v1',...basis,
     kind:state,terminal:false,complete:false,engineeringReady:false});
 }
 return Object.freeze({start,cancel,subscribe,snapshot,dispose:cancel});
}
