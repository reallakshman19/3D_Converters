/**
 * #1104 A05 — first-party File/Blob admission to actual LFJ Worker + IndexedDB.
 * Opens neutral R10/R09/R05 source session and invokes #1104's same-generation
 * source-only CAS→typed candidate runner. NOT YET WIRED to live app UI.
 * No fallback to File.text(), foreground JSON.parse() or in-memory indexes.
 */
import {openSourceSession} from '../../runtime/source-session.mjs';
import {openIndexedRecordStore} from '../../storage/browser/indexed-record-store.mjs';
import {openIndexedOccurrencePairStore,createPairedIndexStore}
  from '../../runtime/indexed-occurrence-pairs.mjs';
import {runSourceOnlyTypedSession} from './run-source-only-typed-session.mjs';

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
export async function runNativeSourceOnlyTypedFile({
  blob,revision,selection,expectedBasis,getCurrentBasis,
  databaseName,WorkerCtor=globalThis.Worker,
  indexedDB=globalThis.indexedDB,signal,
  pageEvents=128,maxRows=64,maxPageBytes=65536,maxScalarBytes=65536,
  maxFacts=4096,maxTotalBytes=8388608,
  nativePorts={}
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
  if(signal?.aborted)fail('NATIVE_CONSUMER_CANCELLED','source intake cancelled');
  let current;
  try{current=getCurrentBasis();}catch{
    fail('NATIVE_CONSUMER_BASIS_STALE','app source basis unavailable');
  }
  if(B.some(k=>current?.[k]!==expected[k]))
    fail('NATIVE_CONSUMER_BASIS_STALE',
      'source, selection or XML/master changed before Worker admission');

  const openRecord=nativePorts.openRecordStore??openIndexedRecordStore;
  const openPairs=nativePorts.openPairStore??openIndexedOccurrencePairStore;
  const pairIndex=nativePorts.createPairedIndexStore??createPairedIndexStore;
  const openSession=nativePorts.openSourceSession??openSourceSession;
  const consume=nativePorts.runTypedSession??runSourceOnlyTypedSession;
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
    selected=await openRecord({databaseName,namespace:'selected',
      generation:expected.jobId,basis,kind:'selection',
      selectionDigest:expected.selectionDigest,jobEpoch:expected.jobId,indexedDB});
    pairs=await openPairs({databaseName:databaseName+'-pairs',
      namespace:'source',generation:expected.jobId,basis,indexedDB});
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
    return await consume({
      session,expectedBasis:expected,getCurrentBasis,signal,
      maxFacts,maxTotalBytes,maxRows,maxPageBytes,maxScalarBytes
    });
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
