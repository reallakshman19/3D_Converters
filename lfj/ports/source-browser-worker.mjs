/** Actual browser Worker module. This file MUST run in WorkerGlobalScope. */
import {scanSourceInsideWorker,SOURCE_WORKER_SCHEMA} from './source-worker-port.mjs';
if(typeof WorkerGlobalScope==='undefined'||!(self instanceof WorkerGlobalScope))
  throw new Error('SOURCE_WORKER_REQUIRED');
let claimed=false;
self.addEventListener('message',async event=>{
  const message=event.data;
  if(claimed){
    self.postMessage({schema:SOURCE_WORKER_SCHEMA,kind:'FAILED',
      jobId:message?.jobId,code:'WORKER_BUSY'});
    return;
  }
  claimed=true;
  try{
    const summary=await scanSourceInsideWorker(message,{
      publishPage:async rows=>self.postMessage({
        schema:SOURCE_WORKER_SCHEMA,kind:'PROVISIONAL_PAGE',
        jobId:message.jobId,sourceRefId:message.sourceRefId,rows
      })
    });
    self.postMessage({schema:SOURCE_WORKER_SCHEMA,kind:'SCAN_DONE',
      jobId:message.jobId,sourceRefId:message.sourceRefId,
      summary,workerGlobal:true});
  }catch(error){
    self.postMessage({schema:SOURCE_WORKER_SCHEMA,kind:'FAILED',
      jobId:message?.jobId,sourceRefId:message?.sourceRefId,
      code:error?.code??'SOURCE_SCAN_FAILED'});
  }
});