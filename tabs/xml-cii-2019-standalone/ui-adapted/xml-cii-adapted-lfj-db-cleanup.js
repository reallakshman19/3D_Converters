/**
 * A temporary indexed Worker generation is not cleaned up by merely calling
 * deleteDatabase(). Wait for BOTH real IDB request completion events and fail
 * closed on blocked/error/timeout. Each Build has unique source+fact names.
 */
const fail = (code,message) => Object.assign(new Error(message), {code});
export async function deleteIndexedBuildDatabases(names,{
  databaseFactory=typeof indexedDB==='undefined'?null:indexedDB,
  timeoutMs=15000
}={}){
  if(!Array.isArray(names)||names.length!==2||
     names.some(x=>typeof x!=='string'||!/^lfj-ui-preview-(source|projection)-[\da-f-]+$/.test(x))||
     names[0]===names[1])
    throw fail('LFJ_IDB_CLEANUP_INPUT','Two distinct indexed source/projection names required');
  if(!databaseFactory || typeof databaseFactory.deleteDatabase!=='function')
    return Object.freeze({verified:false,unavailable:true});
  const outcomes=await Promise.allSettled(names.map(name=>new Promise((resolve,reject)=>{
    let request,settled=false,blocked=false;
    const timer=setTimeout(()=>finish(fail(
      blocked?'LFJ_IDB_CLEANUP_BLOCKED':'LFJ_IDB_CLEANUP_TIMEOUT',
      'Temporary indexed database deletion did not complete: '+name)),timeoutMs);
    function finish(error){
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(error)reject(error);
      else resolve(name);
    }
    try{
      request=databaseFactory.deleteDatabase(name);
      request.onsuccess=()=>finish();
      request.onerror=()=>finish(fail('LFJ_IDB_CLEANUP_ERROR',
        'Temporary indexed database deletion failed: '+name));
      // Browsers may briefly report blocked while a terminated Worker releases
      // its connection. Do not claim failure until the bounded deadline; only
      // onsuccess is proof of completed deletion.
      request.onblocked=()=>{blocked=true;};
    }catch(error){
      finish(fail('LFJ_IDB_CLEANUP_ERROR',
        String(error?.message||error)));
    }
  })));
  const failures=outcomes.filter(x=>x.status==='rejected');
  if(failures.length)throw failures[0].reason;
  return Object.freeze({verified:true,deleted:names.length,names:[...names]});
}
