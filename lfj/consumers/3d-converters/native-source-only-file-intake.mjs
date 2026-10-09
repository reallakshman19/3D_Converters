/**
 * #1104 A05 production-only native File/Blob → LFJ Worker/IndexedDB source
 * session → first-party source-only typed candidate admission.
 *
 * NO public dependency injection: the application's entrypoint pins native
 * browser Worker and IndexedDB, in-repository neutral stores and source
 * session, plus first-party same-generation source receiver. Any caller asking
 * to override these ports is rejected, not silently downgraded.
 *
 * This is NOT a live Resolver/Enrichment UI import and NOT engineering
 * authorization or large-input release acceptance.
 */
import {openSourceSession} from '../../runtime/source-session.mjs';
import {openIndexedRecordStore} from '../../storage/browser/indexed-record-store.mjs';
import {openIndexedOccurrencePairStore,createPairedIndexStore}
  from '../../runtime/indexed-occurrence-pairs.mjs';
import {runSourceOnlyTypedSession} from './run-source-only-typed-session.mjs';
import {
  NativeConsumerIntakeError,runNativeSourceOnlyFileIntakeCore
} from './native-source-only-file-intake-core.mjs';
export {NativeConsumerIntakeError};

/**
 * @param {object} options - Actual File/Blob, exact basis and live getter.
 * No WorkerCtor/indexedDB/nativePorts injection is exposed by this function.
 */
export async function runNativeSourceOnlyTypedFile(options={}){
  if(options===null||typeof options!=='object'||Array.isArray(options)||
     Object.hasOwn(options,'nativePorts')||
     Object.hasOwn(options,'WorkerCtor')||
     Object.hasOwn(options,'indexedDB'))
    throw new NativeConsumerIntakeError('NATIVE_CONSUMER_PORT_REQUIRED',
      'only pinned in-repository native source ports may be used by the app');
  return runNativeSourceOnlyFileIntakeCore(options,{
    WorkerCtor:globalThis.Worker,
    indexedDB:globalThis.indexedDB,
    openRecordStore:openIndexedRecordStore,
    openPairStore:openIndexedOccurrencePairStore,
    createPairedIndexStore,
    openSourceSession,
    runTypedSession:runSourceOnlyTypedSession
  });
}
