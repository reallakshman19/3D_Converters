/** LFJ R07/U01: single-winner Worker admission/cancellation lifecycle.
 * Reuses R06 native Worker admission. No application/engineering interpretation
 * and no completed source/index/output authority is granted by READY.
 */
import {runRequiredWorkerJob,WorkerExecutionError} from '../execution/required-worker.mjs';

const valid=s=>typeof s==='string'&&s.trim().length>0&&s.length<=1024;
const fail=(code,msg)=>{throw new WorkerExecutionError(code,msg);};

export function createWorkerLifecycleSession({
 jobId,sourceRefId,sourceSha256,sourceRevision,byteLength,selectionDigest,
 dependencyRevision,getCurrentBasis,createWorker,trustedWorkerCtor,
}={}){
 if(![jobId,sourceRefId,sourceSha256,sourceRevision,selectionDigest].every(valid)||
    !Number.isSafeInteger(byteLength)||byteLength<0||
    (dependencyRevision!==undefined&&!valid(dependencyRevision))||
    (getCurrentBasis!==undefined&&typeof getCurrentBasis!=='function'))
   fail('INVALID_LIFECYCLE_JOB','source/job and selection basis must be explicit');
 const basis=Object.freeze({jobId,sourceRefId,sourceSha256,sourceRevision,byteLength,
   selectionDigest,...(dependencyRevision===undefined?{}:{dependencyRevision})});
 // LFJ never infers XML/configuration semantics. The adapter supplies one
 // opaque effective dependency revision, plus the current source/selection.
 // Existing callers may omit getCurrentBasis but then MUST explicitly call
 // supersede() on edits; READY is not an accepted result or index commit.
 const REVISION_FIELDS=Object.freeze(['sourceRefId','sourceSha256','sourceRevision',
   'byteLength','selectionDigest','dependencyRevision']);
 const sameBasis=candidate=>candidate!==null&&typeof candidate==='object'&&
   REVISION_FIELDS.every(key=>candidate[key]===basis[key]);
 const isCurrent=()=>{
   if(!getCurrentBasis)return true;
   try{return sameBasis(getCurrentBasis());}catch{return false;}
 };
 const listeners=new Set();
 const trusted=trustedWorkerCtor??globalThis.Worker;
 let worker=null,starting=null,terminal=null,termination=null,state='NEW';
 let releaseWorkerWatch=()=>{};
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
   releaseWorkerWatch();
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
 // No provisional page/result is accepted from a stale source session.
 // A stale Worker is torn down; callbacks and late READY can never restore it.
 function markStale(){
   const result=finish('STALE','SOURCE_STALE');
   void stopWorker();
   return result;
 }
 // R06 observes START->READY only; R07 must continue watching the
 // actual Worker AFTER READY. A provisional page is never a commit.
 function watchWorker(){
   const onFailure=()=>{
     if(terminal)return;
     finish('FAILED','WORKER_FAILED');
     void stopWorker();
   };
   const browser=typeof worker?.addEventListener==='function'&&
     typeof worker?.removeEventListener==='function';
   const node=typeof worker?.on==='function'&&typeof worker?.off==='function';
   if(browser){
     worker.addEventListener('error',onFailure);
     worker.addEventListener('messageerror',onFailure);
     releaseWorkerWatch=()=>{
       worker.removeEventListener('error',onFailure);
       worker.removeEventListener('messageerror',onFailure);
     };
   }else if(node){
     worker.on('error',onFailure);
     worker.on('exit',onFailure);
     releaseWorkerWatch=()=>{
       worker.off('error',onFailure);
       worker.off('exit',onFailure);
     };
   }
 }
 function start(){
   if(terminal)return Promise.resolve(terminal);
   if(!isCurrent())return Promise.resolve(markStale());
   if(starting)return starting;
   if(state!=='NEW')return Promise.resolve(Object.freeze({...basis,kind:'ADMITTED',terminal:false}));
   if(typeof trusted!=='function'||typeof createWorker!=='function'){
     return Promise.resolve(finish('FAILED','WORKER_UNAVAILABLE'));
   }
   try{worker=createWorker();watchWorker();}
   catch{return Promise.resolve(finish('FAILED','WORKER_UNAVAILABLE'));}
   state='ADMITTING';
   starting=(async()=>{
     try{
       await runRequiredWorkerJob({
         ...basis,trustedWorkerCtor:trusted,createWorker:()=>worker,
       });
       if(terminal)return terminal; // e.g. cancel raced with READY
       // Admission can take hundreds of milliseconds; recheck the original
       // source, selection and caller-owned XML/config dependency at READY.
       if(!isCurrent()){
         const stale=markStale();
         await stopWorker();
         return stale;
       }
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
   if(!terminal&&!isCurrent())markStale();
   const result=terminal||finish('CANCELLED');
   await stopWorker();
   return result;
 }
 function subscribe(listener){
   if(typeof listener!=='function')fail('INVALID_LIFECYCLE_SINK','listener must be a function');
   if(!terminal&&!isCurrent())markStale();
   if(terminal){listener(terminal);return ()=>{};}
   listeners.add(listener);
   return ()=>listeners.delete(listener);
 }
 function snapshot(){
   if(!terminal&&!isCurrent())markStale();
   return terminal||Object.freeze({schema:'LFJ.WorkerLifecycle.v1',...basis,
     kind:state,terminal:false,complete:false,engineeringReady:false});
 }
 // Explicit app-input replacement is the trusted fallback when the caller
 // cannot expose a getCurrentBasis() closure. It settles native termination
 // before returning the stale terminal, including while READY is pending.
 async function supersede(nextBasis){
   if(terminal)return terminal;
   if(!sameBasis(nextBasis)||!isCurrent()){
     const result=markStale();
     await stopWorker();
     return result;
   }
   return snapshot();
 }
 return Object.freeze({start,cancel,subscribe,snapshot,supersede,dispose:cancel});
}
