/** T06b product picker API, no foreground original JSON read/parse. */
import {requireIndexedSourceAdmission} from './xml-cii-adapted-lfj-size-admission.js';
import {recoverAbandonedIndexedGenerations} from './xml-cii-adapted-lfj-cold-recovery.js';
const URL_WORKER=new URL('./xml-cii-adapted-lfj-scope-discovery.worker.mjs',import.meta.url);
const fail=(code,message)=>Object.assign(new Error(message),{code});
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const COUNT_MAX=128;
export function isIndexedFileScopeDiscovery(discovery,blob){
  const r=discovery?.result;
  if(!(blob instanceof Blob)||discovery?.blob!==blob ||
     r?.schema!=='LFJ.A3.IndexedFileScopes.v1'||
     r?.sourceOnly!==true||r?.engineeringReady!==false||
     r?.downloadAuthorized!==false||!hex(r.originalSha256)||
     r.originalBytes!==blob.size||
     !Number.isSafeInteger(r.originalRootCount)||r.originalRootCount<1||
     !Array.isArray(r.scopes)||r.scopes.length<1||r.scopes.length>COUNT_MAX)
    return false;
  let sum=0;
  const unique=new Set();
  for(const s of r.scopes){
    if(typeof s?.id!=='string'||!s.id||s.id.length>256||
       s.id==='__ALL__'||typeof s.label!=='string'||
       s.label.length>256||!Number.isSafeInteger(s.itemCount)||
       s.itemCount<1||unique.has(s.id))return false;
    unique.add(s.id);sum+=s.itemCount;
  }
  return sum===r.originalRootCount;
}
export async function discoverIndexedOriginalFileScopes({
  blob,signal,timeoutMs=180000,workerFactory,
  isCurrent=()=>true
}={}){
  requireIndexedSourceAdmission(blob);
  if(typeof isCurrent!=='function'||!isCurrent()||signal?.aborted)
    throw fail('SCOPE_DISCOVERY_STALE','original File selection changed');
  // Existing orphan cleanup + lock protects a killed discovery Worker from
  // leaving an unqualified generation for subsequent indexed Build.
  if(typeof window!=='undefined')
    await recoverAbandonedIndexedGenerations();
  if(!isCurrent()||signal?.aborted)
    throw fail('SCOPE_DISCOVERY_STALE','original File selection changed');
  if(typeof window==='undefined'&&!workerFactory)
    throw fail('SCOPE_DISCOVERY_WORKER_REQUIRED',
      'native browser Worker required for original source discovery');
  const create=workerFactory||((url,opts)=>new Worker(url,opts));
  return await new Promise((resolve,reject)=>{
    let worker,done=false,timer;
    function finish(error,value){
      if(done)return;
      done=true;clearTimeout(timer);
      signal?.removeEventListener('abort',abort);
      worker?.terminate();
      if(error)reject(error);else resolve(value);
    }
    function abort(){finish(fail('SCOPE_DISCOVERY_STALE',
      'original File discovery cancelled or superseded'));}
    try{
      worker=create(URL_WORKER,{type:'module'});
      worker.onerror=event=>finish(fail('SCOPE_DISCOVERY_WORKER',
        String(event?.message||'original source discovery Worker crashed')));
      worker.onmessage=({data})=>{
        if(data?.type==='ERROR')return finish(fail(
          data.code||'SCOPE_DISCOVERY_FAILED',String(data.message||'Worker rejected source')));
        if(data?.type!=='DONE'||!isCurrent()||signal?.aborted||
           !isIndexedFileScopeDiscovery({blob,result:data.result},blob))
          return finish(fail('SCOPE_DISCOVERY_PROOF',
            'original File scope discovery basis or source state invalid'));
        finish(null,Object.freeze({blob,result:data.result}));
      };
      timer=setTimeout(()=>finish(fail('SCOPE_DISCOVERY_TIMEOUT',
        'original File discovery exceeded time budget')),timeoutMs);
      signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted)return abort();
      worker.postMessage({type:'DISCOVER',blob});
    }catch(e){finish(fail('SCOPE_DISCOVERY_WORKER',String(e?.message||e)));}
  });
}
