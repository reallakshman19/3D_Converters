// Genuine Node Worker fixture; one native thread per independently-owned R07 job.
import {parentPort,workerData} from 'node:worker_threads';
parentPort.on('message',message=>{
 if(message?.schema!=='LFJ.WorkerExecution.v1'||message.kind!=='START')return;
 if(workerData?.mode==='exit'){process.exit(13);return;}
 const ready=()=>{
   parentPort.postMessage({...message,kind:'READY',
     isMainThread:false});
 };
 if(workerData?.mode==='delayed')setTimeout(ready,400);
 else ready();
});
