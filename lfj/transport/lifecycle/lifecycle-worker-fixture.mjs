// R07/U01 actual WorkerThreads cancellation oracle, never an inline executor.
import {parentPort,workerData,isMainThread} from 'node:worker_threads';
if(isMainThread) throw Error('fixture must execute in a native Worker');
const mode=workerData?.mode;
parentPort.on('message',message=>{
 if(message?.schema!=='LFJ.WorkerExecution.v1')return;
 if(message.kind==='START'){
  if(mode==='no-ready')return;
  if(mode==='late-ready'){
   setTimeout(()=>parentPort.postMessage({...message,kind:'READY'}),250);return;
  }
  parentPort.postMessage({...message,kind:'READY'});return;
 }
 if(message.kind==='SOURCE_PAGE'&&mode==='ack-without-consume'){
  parentPort.postMessage({...message,kind:'SOURCE_ACK',
   receivedBytes:message.bytes.byteLength});
 }
});
