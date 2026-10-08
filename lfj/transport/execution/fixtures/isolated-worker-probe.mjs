// Independent native Worker probe: no product handler or fake executor loop.
// The test never decides engineering source facts.
import {parentPort,threadId,isMainThread} from 'node:worker_threads';
if(!parentPort||isMainThread)throw new Error('Probe must execute inside worker_threads Worker');
parentPort.on('message',message=>{
  if(message?.schema==='LFJ.WorkerExecution.v1'&&message.kind==='START')
    parentPort.postMessage({
      schema:'LFJ.WorkerExecution.v1',kind:'READY',
      jobId:message.jobId,sourceRefId:message.sourceRefId,
      sourceSha256:message.sourceSha256,sourceRevision:message.sourceRevision,
      threadId,isMainThread,
    });
});
