/** A3 T06c. On-demand, native Worker-only original File scope list.
 * This source-only observation never grants selected matching, CSV or CII rights.
 */
import { requireIndexedSourceAdmission } from './xml-cii-adapted-lfj-size-admission.js';
import { hashOriginalBlobOffThread } from './xml-cii-adapted-lfj-source-sha.js';

const WORKER=new URL(
  '../../../lfj/consumers/3d-converters/original-scope-discovery.worker.mjs',
  import.meta.url);
const fail=(code,message)=>Object.assign(new Error(message),{code});
const hex=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const uuid=value=>/^[0-9a-f-]{36}$/.test(value||'');
const LIMIT_MS=180000;

function nativeWorkerJob(url,payload,{signal,timeoutMs,workerFactory}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(fail('SCOPE_DISCOVERY_CANCELLED','Discovery cancelled'));
    const create=workerFactory||((u,o)=>new Worker(u,o));
    let worker,settled=false,timer;
    const finish=(error,value)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      signal?.removeEventListener('abort',cancel);
      worker?.terminate();
      if(error)reject(error);else resolve(value);
    };
    const cancel=()=>finish(fail('SCOPE_DISCOVERY_CANCELLED','Discovery cancelled'));
    try{
      worker=create(url,{type:'module'});
      worker.onmessage=({data})=>{
        if(data?.type==='DONE')finish(null,data.result);
        else if(data?.type==='ERROR')
          finish(fail(data.code||'SCOPE_DISCOVERY_FAILED',
            data.message||'Original scope discovery failed'));
        else finish(fail('SCOPE_DISCOVERY_PROTOCOL','Unexpected discovery reply'));
      };
      worker.onerror=e=>finish(fail('SCOPE_DISCOVERY_WORKER',
        String(e?.message||'Discovery Worker error')));
      timer=setTimeout(()=>finish(fail('SCOPE_DISCOVERY_TIMEOUT',
        'Original scope discovery exceeded bounded time')),timeoutMs);
      signal?.addEventListener('abort',cancel,{once:true});
      worker.postMessage(payload);
    }catch(error){finish(error);}
  });
}

export function verifyIndexedOriginalScopeChoices(result,{
  originalSha256,originalBytes,sourceGeneration
}={}){
  if(result?.schema!=='LFJ.A3.OriginalScopeChoices.v1'||
     !hex(result.originalSha256)||
     result.originalSha256!==originalSha256||
     result.originalBytes!==originalBytes||
     !uuid(result.sourceGeneration)||
     result.sourceGeneration!==sourceGeneration||
     !Number.isSafeInteger(result.originalRootCount)||
     result.originalRootCount<1||
     !Array.isArray(result.choices)||result.choices.length<1||
     result.choices.length>128||
     result.sourceOnly!==true||result.engineeringReady!==false||
     result.downloadAuthorized!==false)
    throw fail('SCOPE_DISCOVERY_BASIS','Source-only scope census does not match original File');
  let count=0;
  const unique=new Set();
  for(const c of result.choices){
    if(typeof c?.id!=='string'||!c.id.trim()||c.id.length>256||
       c.id==='__ALL__'||unique.has(c.id)||
       !Number.isSafeInteger(c.rootCount)||c.rootCount<1)
      throw fail('SCOPE_DISCOVERY_CHOICE','Malformed or duplicate original owner choice');
    unique.add(c.id);
    count+=c.rootCount;
  }
  if(count!==result.originalRootCount)
    throw fail('SCOPE_DISCOVERY_CENSUS','Original owner counts do not cover all roots');
  return Object.freeze({
    schema:result.schema,originalSha256,originalBytes,
    sourceGeneration,originalRootCount:count,
    choices:Object.freeze(result.choices.map(c=>Object.freeze({
      id:c.id,rootCount:c.rootCount
    }))),
    sourceOnly:true,engineeringReady:false,downloadAuthorized:false
  });
}

async function deleteDiscoveryCatalog(name,{databaseFactory=globalThis.indexedDB,
  timeoutMs=15000}={}){
  if(!/^lfj-t06c-source-[0-9a-f-]{36}$/.test(name)||!databaseFactory)
    throw fail('SCOPE_DISCOVERY_CLEANUP_INPUT','Exact temporary database identity required');
  return new Promise((resolve,reject)=>{
    let settled=false,blocked=false;
    const timer=setTimeout(()=>finish(fail(
      blocked?'SCOPE_DISCOVERY_CLEANUP_BLOCKED':'SCOPE_DISCOVERY_CLEANUP_TIMEOUT',
      'Original scope temporary source catalogue not deleted')),timeoutMs);
    const finish=error=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(error)reject(error);else resolve(true);
    };
    try{
      const request=databaseFactory.deleteDatabase(name);
      request.onsuccess=()=>finish();
      request.onerror=()=>finish(fail('SCOPE_DISCOVERY_CLEANUP_ERROR',
        'Unable to delete temporary original source catalogue'));
      request.onblocked=()=>{blocked=true;};
    }catch(error){finish(fail('SCOPE_DISCOVERY_CLEANUP_ERROR',
      String(error?.message||error)));}
  });
}

export async function discoverIndexedOriginalScopes(blob,{
  signal,isCurrent=()=>true,workerFactory,timeoutMs=LIMIT_MS
}={}){
  requireIndexedSourceAdmission(blob);
  if(signal?.aborted||!isCurrent())
    throw fail('SCOPE_DISCOVERY_CANCELLED','Discovery cancelled before source SHA');
  if(!globalThis.crypto?.randomUUID)
    throw fail('SCOPE_DISCOVERY_UUID','Secure native UUID required');
  const token=crypto.randomUUID();
  const sourceDatabaseName='lfj-t06c-source-'+token;
  const sourceGeneration=token;
  let result,error;
  try{
    const originalSha256=await hashOriginalBlobOffThread(blob,{signal,timeoutMs});
    if(!isCurrent())throw fail('SCOPE_DISCOVERY_STALE','Original File changed during hashing');
    result=await nativeWorkerJob(WORKER,{
      type:'DISCOVER',blob,expectedSha256:originalSha256,
      sourceDatabaseName,sourceGeneration
    },{signal,timeoutMs,workerFactory});
    if(signal?.aborted||!isCurrent())
      throw fail('SCOPE_DISCOVERY_STALE','Original File changed during source discovery');
    result=verifyIndexedOriginalScopeChoices(result,{
      originalSha256,originalBytes:blob.size,sourceGeneration});
  }catch(e){error=e;}
  // Terminated Worker connections must be gone before a result escapes.
  try{await deleteDiscoveryCatalog(sourceDatabaseName);}
  catch(cleanupError){
    if(!error)error=cleanupError;
    else error.cleanupError=cleanupError.code||'SCOPE_DISCOVERY_CLEANUP_ERROR';
  }
  if(error)throw error;
  if(signal?.aborted||!isCurrent())
    throw fail('SCOPE_DISCOVERY_STALE','Original File changed during cleanup');
  return result;
}
