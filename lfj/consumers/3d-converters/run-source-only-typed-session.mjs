/**
 * #1104 A04-U05 — first-party, SOURCE-ONLY LFJ source-session runner.
 *
 * Unlike an isolated preflight, this is the real receiving application seam:
 * a single exclusive #1105 SourceSessionV1 -> #1104 receiver -> first-party
 * basis-CAS source generation -> unchanged R01/R02/A04 typed source candidate.
 *
 * Rights stay SOURCE_ONLY_PROJECTED_CANDIDATE with engineeringReady=false.
 * No Resolver/Enrichment button, XML/CSV output, CII/GC-PW authority, durable
 * store, or full-file foreground JSON.parse. Canonical DEPLOY H1 is separate.
 */
import {consumeSelectedSourceFacts} from './source-facts-receiver.mjs';
import {createSourceFactsGenerationStore} from './source-generation-store.mjs';
import {projectPublishedSourceCandidate} from './published-source-typed-candidate.mjs';

export class SourceOnlyRunError extends Error {
  constructor(code,detail){super(code+': '+detail);this.name='SourceOnlyRunError';this.code=code;}
}
const fail=(code,detail)=>{throw new SourceOnlyRunError(code,detail);};
const bounded=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;

/**
 * Takes EXCLUSIVE ownership of session. Never caches a second source/census
 * from a caller: the first-party receiver carries session.summary into the
 * app-owned atomically committed generation.
 *
 * @param {{session,expectedBasis,getCurrentBasis,signal?,
 *   maxFacts?,maxTotalBytes?,maxRows?,maxPageBytes?,maxScalarBytes?}} opts
 * @returns {Promise<{schema,sourceReceipt,publicationSerial,candidate,
 *   rightsBasis,engineeringReady}>}
 */
export async function runSourceOnlyTypedSession({
  session,expectedBasis,getCurrentBasis,signal,
  maxFacts=4096,maxTotalBytes=8388608,
  maxRows=64,maxPageBytes=65536,maxScalarBytes=65536
}={}){
  // Setup may fail before the receiver is invoked. In that case this runner
  // must still close the exclusive session; after receiver admission the
  // receiver owns close-on-all-paths, including cancellation and failed CAS.
  let receiverStarted=false;
  try{
    if(typeof session?.close!=='function'||
      typeof getCurrentBasis!=='function'||
      !bounded(maxFacts,1,4096)||
      !bounded(maxTotalBytes,1,8388608)||
      !bounded(maxRows,1,4096)||
      !bounded(maxPageBytes,256,1048576)||
      !bounded(maxScalarBytes,1,1048576))
      fail('SOURCE_RUN_CONFIG_INVALID',
        'exclusive session, live basis and bounded source-only budgets required');
    const store=createSourceFactsGenerationStore({
      getCurrentBasis,maxFacts,maxTotalBytes
    });
    receiverStarted=true;
    const sourceReceipt=await consumeSelectedSourceFacts({
      session,expectedBasis,getCurrentBasis,
      transaction:store.transaction,signal,
      maxRows,maxPageBytes,maxScalarBytes
    });
    const before=store.readPublished();
    if(!before||!Number.isSafeInteger(before.publicationSerial)||
      before.publicationSerial<1)
      fail('APP_SOURCE_GENERATION_REQUIRED',
        'first-party committed source-only generation required');
    const candidate=projectPublishedSourceCandidate({
      generationStore:store,maxRows:maxFacts,maxScalarBytes
    });
    const after=store.readPublished();
    if(!after||after.publicationSerial!==before.publicationSerial)
      fail('APP_SOURCE_GENERATION_STALE',
        'typed candidate crossed application publication boundary');
    if(candidate?.engineeringReady!==false||
      candidate.rightsBasis!=='SOURCE_ONLY_PROJECTED_CANDIDATE')
      fail('SOURCE_RIGHTS_INVALID','no source-only candidate may grant engineering rights');
    return Object.freeze({
      schema:'LFJ.3D.SourceOnlyTypedSessionResult.v1',
      sourceReceipt,publicationSerial:after.publicationSerial,candidate,
      rightsBasis:'SOURCE_ONLY_PROJECTED_CANDIDATE',engineeringReady:false
    });
  }catch(error){
    if(!receiverStarted&&typeof session?.close==='function'){
      try{await session.close();}catch(closeError){
        const failed=new SourceOnlyRunError('SOURCE_CLOSE_FAILED',
          'session admission failed and exclusive close failed');
        failed.cause=error;failed.closeCause=closeError;
        throw failed;
      }
    }
    throw error;
  }
}
