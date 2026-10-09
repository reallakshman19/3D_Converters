/**
 * #1104 A05: non-public native intake mechanics. This testable core has
 * capability injection solely for focused deterministic qualification.
 * Real app consumers MUST import native-source-only-file-intake.mjs, whose
 * public entrypoint pins Worker/IDB/source session to browser globals and
 * exact in-repo native implementation without runtime-provided overrides.
 */
export class NativeConsumerIntakeError extends Error {
  constructor(code,detail){
    super(code+': '+detail);
    this.name='NativeConsumerIntakeError';this.code=code;
  }
}
const fail=(code,detail)=>{throw new NativeConsumerIntakeError(code,detail);};
const present=x=>typeof x==='string'&&x.length>0&&x.length<=1024;
const natural=x=>Number.isSafeInteger(x)&&x>=0;
const B=['sourceRefId','sourceSha256','sourceRevision','selectionDigest',
  'jobId','dependencyRevision','byteLength'];
function validated(expectedBasis,blob){
  if(!expectedBasis||B.some(k=>k==='byteLength'
    ?!natural(expectedBasis[k]):!present(expectedBasis[k]))||
    expectedBasis.byteLength!==blob?.size)
    fail('NATIVE_CONSUMER_BASIS_INVALID',
      'exact File/Blob SHA/source/selection/job/XML-master basis required');
  return Object.freeze(Object.fromEntries(B.map(k=>[k,expectedBasis[k]])));
}
async function abortClose(port){
  if(!port)return;
  try{await port.abort?.();}catch{}
  try{await port.close?.();}catch{}
}

/**
 * The five native factories are pinned imports by default. Injected ports
 * are ONLY a deterministic unit testing seam, not deployed acceptance.
 */
export async function runNativeSourceOnlyFileIntakeCore({
  blob,revision,selection,expectedBasis,getCurrentBasis,
  databaseName,signal,
  pageEvents=128,maxRows=64,maxPageBytes=65536,maxScalarBytes=65536,
  maxFacts=4096,maxTotalBytes=8388608
}={}, {
  WorkerCtor,indexedDB,openRecordStore,openPairStore,
  createPairedIndexStore,openSourceSession,runTypedSession
}={}){
  if(!blob||typeof blob.slice!=='function'||!natural(blob.size)||
    !present(revision)||!present(databaseName)||
    typeof getCurrentBasis!=='function'||
    typeof WorkerCtor!=='function'||typeof indexedDB?.open!=='function'||
    !selection||typeof selection!=='object'||
    !Number.isSafeInteger(pageEvents)||pageEvents<1||pageEvents>4096)
    fail('NATIVE_CONSUMER_PORT_REQUIRED',
      'actual File/Blob, Worker, IndexedDB, selection and app basis required');
  const expected=validated(expectedBasis,blob);
  if(revision!==expected.sourceRevision)
    fail('NATIVE_CONSUMER_BASIS_INVALID',
      'requested R03 revision must equal sourceRevision bound to original File/Blob');
  if(signal?.aborted)fail('NATIVE_CONSUMER_CANCELLED','source intake cancelled');
  function attest(){
    if(signal?.aborted)fail('NATIVE_CONSUMER_CANCELLED','source intake cancelled');
    let current;
    try{current=getCurrentBasis();}catch{
      fail('NATIVE_CONSUMER_BASIS_STALE','app source basis unavailable');
    }
    if(B.some(k=>current?.[k]!==expected[k]))
      fail('NATIVE_CONSUMER_BASIS_STALE',
        'source, selection or XML/master changed before Worker admission');
  }
  attest();

  const openRecord=openRecordStore;
  const openPairs=openPairStore;
  const pairIndex=createPairedIndexStore;
  const openSession=openSourceSession;
  const consume=runTypedSession;
  for(const fn of [openRecord,openPairs,pairIndex,openSession,consume])
    if(typeof fn!=='function')
      fail('NATIVE_CONSUMER_PORT_REQUIRED','all source ports must be callable');
  const basis=Object.freeze({
    sourceRefId:expected.sourceRefId,sourceSha256:expected.sourceSha256,
    sourceRevision:expected.sourceRevision
  });
  let source=null,selected=null,pairs=null,session=null,failed=false;
  try{
    source=await openRecord({databaseName,namespace:'source',
      generation:expected.jobId,basis,kind:'source',indexedDB});
    attest();
    selected=await openRecord({databaseName,namespace:'selected',
      generation:expected.jobId,basis,kind:'selection',
      selectionDigest:expected.selectionDigest,jobEpoch:expected.jobId,indexedDB});
    attest();
    pairs=await openPairs({databaseName:databaseName+'-pairs',
      namespace:'source',generation:expected.jobId,basis,indexedDB});
    attest();
    const createWorker=()=>new WorkerCtor(
      new URL('../../ports/source-browser-worker.mjs',import.meta.url),
      {type:'module'}
    );
    session=await openSession({
      blob,revision,sourceRefId:expected.sourceRefId,
      expectedSha256:expected.sourceSha256,
      jobId:expected.jobId,selectionDigest:expected.selectionDigest,selection,
      indexStore:pairIndex({indexStore:source,pairPort:pairs}),
      selectedStore:selected,trustedWorkerCtor:WorkerCtor,createWorker,
      getCurrentBasis,signal,pageEvents
    });
    attest();
    const result=await consume({
      session,expectedBasis:expected,getCurrentBasis,signal,
      maxFacts,maxTotalBytes,maxRows,maxPageBytes,maxScalarBytes
    });
    if(result?.schema!=='LFJ.3D.SourceOnlyTypedSessionResult.v1'||
      result.engineeringReady!==false||
      result.rightsBasis!=='SOURCE_ONLY_PROJECTED_CANDIDATE'||
      result.candidate?.engineeringReady!==false||
      result.candidate?.rightsBasis!=='SOURCE_ONLY_PROJECTED_CANDIDATE')
      fail('NATIVE_CONSUMER_RIGHTS_INVALID',
        'native File/Blob intake cannot return engineering/export authority');
    // The real consumer closes the exclusive session itself; repeat close is
    // idempotent on SourceSessionV1. An injected unit port must close here too.
    await session.close();
    attest();
    return result;
  }catch(error){
    failed=true;
    if(session)try{await session.close();}catch{}
    throw error;
  }finally{
    // Closing connections is not deleting durable IndexedDB data.
    // The neutral store owns rollback of an incomplete generation.
    if(failed){
      await abortClose(pairs);await abortClose(selected);await abortClose(source);
    }else{
      for(const port of [pairs,selected,source]){
        try{await port?.close?.();}catch{}
      }
    }
  }
}
