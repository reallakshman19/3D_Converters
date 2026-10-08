/**
 * LFJ R07/U01 — one terminal cancellation for each isolated source job.
 * Only coordinates an existing R06 Worker admission; no inline parsing,
 * source indexing, engineering acceptance or export right is introduced.
 */
import {runRequiredWorkerJob} from '../execution/required-worker.mjs';

export class WorkerJobLifecycleError extends Error {
 constructor(code,detail,{cause}={}){
  super(code+': '+detail,{cause});
  this.name='WorkerJobLifecycleError';this.code=code;
 }
}
const error=(code,detail,options)=>new WorkerJobLifecycleError(code,detail,options);

/**
 * Trusted composition-root port, bound to one original source basis.
 * start() returns a RUNNING admission, never an accepted source manifest.
 * cancel() is idempotent and only returns terminal after native termination.
 * Future R07/U02 owns completion/rollback; R07/U03–04 own epoch/retry.
 */
export function createWorkerJobLifecycle({
 createWorker,trustedWorkerCtor,jobId,sourceRefId,sourceRevision,
 sourceSha256,byteLength,onTerminal=null,
}={}){
 let state='NEW',worker=null,terminal=null,starting=null,cancelling=null;
 const basis=Object.freeze({jobId,sourceRefId,sourceRevision,sourceSha256,byteLength});
 const ctor=trustedWorkerCtor??globalThis.Worker;
 const publish=(status)=>{
  if(terminal)return terminal;
  state=status;
  terminal=Object.freeze({
   schema:'LFJ.WorkerJobTerminal.v1',...basis,
   status,terminal:true,complete:false,engineeringReady:false,
  });
  // An observer cannot turn a terminal source lifecycle into valid facts.
  try{onTerminal?.(terminal);}catch{}
  return terminal;
 };
 const cancelError=()=>error('JOB_CANCELLED','source job already cancelled');
 const failError=(cause)=>error('JOB_FAILED','Worker admission failed',{cause});
 const start=()=>{
  if(state==='CANCELLING'||state==='CANCELLED')return Promise.reject(cancelError());
  if(terminal)return Promise.reject(failError());
  if(starting)return starting;
  state='ADMITTING';
  starting=(async()=>{
   try {
    const ready=await runRequiredWorkerJob({
     ...basis,trustedWorkerCtor,
     createWorker:()=>{
      worker=createWorker();
      return worker;
     },
    });
    if(state==='CANCELLING'||state==='CANCELLED'||terminal)throw cancelError();
    state='RUNNING';
    return Object.freeze({
     schema:'LFJ.WorkerJobAdmission.v1',kind:'READY',status:'RUNNING',
     ...basis,worker,complete:false,engineeringReady:false,
     workerReport:ready,
    });
   }catch(cause){
    if(state==='CANCELLING'||state==='CANCELLED'||terminal?.status==='CANCELLED')
     throw cancelError();
    publish('FAILED');
    throw failError(cause);
   }
  })();
  return starting;
 };
 const cancel=()=>{
  if(terminal)return Promise.resolve(terminal);
  if(cancelling)return cancelling;
  state='CANCELLING';
  cancelling=(async()=>{
   if(worker){
    try{
     if(typeof ctor?.prototype?.terminate!=='function')
      throw error('WORKER_UNAVAILABLE','trusted native termination port missing');
     await ctor.prototype.terminate.call(worker);
    }catch(cause){
     publish('FAILED');
     throw error('JOB_TERMINATION_FAILED',
      'isolated Worker could not be confirmed terminated',{cause});
    }
   }
   return publish('CANCELLED');
  })();
  return cancelling;
 };
 return Object.freeze({start,cancel,status:()=>state});
}
