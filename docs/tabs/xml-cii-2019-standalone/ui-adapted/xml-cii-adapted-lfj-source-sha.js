/**
 * Source-only SHA-256 on a dedicated native Worker. Large original JSON
 * bytes must never be read as a full Blob ArrayBuffer on the UI thread.
 *
 * Node CLI unit tests without a browser use WebCrypto directly; browser
 * builds fail CLOSED if Worker support is absent, never silently fall back.
 */
import {requireIndexedSourceAdmission} from './xml-cii-adapted-lfj-size-admission.js';
import { Sha256 } from '../../../lfj/source/source-snapshot.mjs';
const WORKER_URL=new URL('./xml-cii-adapted-lfj-sha.worker.mjs',import.meta.url);
const fail=(code,message)=>Object.assign(new Error(message),{code});
const isHash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const CHUNK_BYTES=1024*1024;
export async function hashOriginalBlobOffThread(blob,{
  signal,timeoutMs=180000,workerFactory
}={}){
  requireIndexedSourceAdmission(blob);
  if(signal?.aborted)throw fail('LFJ_SHA_CANCELLED','Original source hashing cancelled');
  if(typeof window==='undefined' && !workerFactory){
    // Node regression environment only. Mirror bounded 1 MiB semantics
    // without loading the complete original Blob into a single ArrayBuffer.
    const incremental=new Sha256();
    for(let offset=0;offset<blob.size;offset+=CHUNK_BYTES){
      if(signal?.aborted)throw fail('LFJ_SHA_CANCELLED','Original source hashing cancelled');
      const end=Math.min(blob.size,offset+CHUNK_BYTES);
      const bytes=new Uint8Array(await blob.slice(offset,end).arrayBuffer());
      if(bytes.byteLength!==end-offset)
        throw fail('LFJ_SHA_SOURCE_DRIFT','Original source slice size drifted');
      incremental.update(bytes);
    }
    if(signal?.aborted)throw fail('LFJ_SHA_CANCELLED','Original source hashing cancelled');
    return incremental.hex();
  }
  const create=workerFactory || ((url,options)=>new Worker(url,options));
  return new Promise((resolve,reject)=>{
    let worker,done=false;
    let timer=null;
    const finish=(error,result)=>{
      if(done)return;
      done=true;clearTimeout(timer);
      signal?.removeEventListener('abort',onAbort);
      worker?.terminate();
      if(error)reject(error);
      else resolve(result);
    };
    const onAbort=()=>finish(fail('LFJ_SHA_CANCELLED',
      'Original source hashing cancelled'));
    try{
      worker=create(WORKER_URL,{type:'module'});
      worker.onmessage=({data})=>{
        if(data?.type==='ERROR')return finish(fail(
          data.code||'LFJ_SHA_WORKER_FAILED',
          String(data.message||'Source hashing failed')));
        if(data?.type!=='DONE'||!isHash(data.sha256)||
           data.sizeBytes!==blob.size ||
           data.bytesHashed!==blob.size ||
           data.chunkLimitBytes!==CHUNK_BYTES ||
           data.chunkReads!==Math.ceil(blob.size/CHUNK_BYTES) ||
           !Number.isSafeInteger(data.maxReadBytes) ||
           data.maxReadBytes!==Math.min(blob.size,CHUNK_BYTES))
          return finish(fail('LFJ_SHA_PROTOCOL',
            'Original source hash Worker returned invalid digest/chunk census'));
        finish(null,data.sha256);
      };
      worker.onerror=event=>finish(fail('LFJ_SHA_WORKER_FAILED',
        String(event?.message||'Native hash Worker failed')));
      timer=setTimeout(()=>finish(fail('LFJ_SHA_TIMEOUT',
        'Original source hashing timed out')),timeoutMs);
      signal?.addEventListener('abort',onAbort,{once:true});
      if(signal?.aborted)return onAbort();
      worker.postMessage({type:'HASH',blob});
    }catch(error){
      finish(fail('LFJ_SHA_WORKER_FAILED',String(error?.message||error)));
    }
  });
}
