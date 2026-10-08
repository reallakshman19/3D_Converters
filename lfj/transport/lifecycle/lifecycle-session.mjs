// R07/U01 first runnable RED baseline: admission follows R06's real native Worker.
// Cancellation/terminal arbitration intentionally remains challenged by RED tests.
import {runRequiredWorkerJob} from '../execution/required-worker.mjs';

export function createWorkerLifecycleSession({
 jobId,sourceRefId,sourceSha256,sourceRevision,byteLength,selectionDigest,
 createWorker,trustedWorkerCtor,
}={}){
 const listeners=new Set();
 const basis={jobId,sourceRefId,sourceSha256,sourceRevision,byteLength,selectionDigest};
 let worker;
 return Object.freeze({
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  async start(){
   worker=createWorker();
   await runRequiredWorkerJob({...basis,createWorker:()=>worker,trustedWorkerCtor});
   return Object.freeze({...basis,kind:'ADMITTED',terminal:false});
  },
  async cancel(){
   // RED: cancellation currently lacks terminal arbitration and native teardown.
   return Object.freeze({...basis,kind:'CANCELLED',terminal:true});
  },
 });
}
