/**
 * R10: worker-side original-byte R03/R04/R05 source facts only.
 *
 * Only invoked by a concrete native Worker entrypoint. A returned R05 summary
 * is NOT R07 SOURCE_INDEX_COMPLETE and cannot authorize query/store/export.
 */
import {openBlobSourceSnapshot} from '../source/source-snapshot.mjs';
import {streamJsonOccurrenceEvents} from '../index/source-occurrence-index.mjs';

export const SOURCE_WORKER_SCHEMA='LFJ.CrossRuntimeSourcePort.v1';

export async function scanSourceInsideWorker(message,{publishPage}={}) {
  if(message?.schema!==SOURCE_WORKER_SCHEMA||message.kind!=='SCAN'||
      typeof message.jobId!=='string'||!message.jobId||
      typeof message.sourceRefId!=='string'||!message.sourceRefId||
      typeof message.revision!=='string'||!message.revision||
      !(message.blob instanceof Blob)||
      typeof publishPage!=='function') {
    const error=new Error('invalid Worker source scan request');
    error.code='SOURCE_PORT_INVALID';
    throw error;
  }
  const limit=message.pageEvents??256;
  if(!Number.isSafeInteger(limit)||limit<1||limit>4096){
    const error=new Error('event page limit outside supported range');
    error.code='PAGE_LIMIT';throw error;
  }
  const source=await openBlobSourceSnapshot(message.blob,{
    revision:message.revision,expectedSha256:message.expectedSha256
  });
  try {
    const summary=await streamJsonOccurrenceEvents(source,{
      sourceRefId:message.sourceRefId,pageEvents:limit,
      onEventPage:async events=>{
        // Events are PROVISIONAL until separate R07 transaction commit.
        await publishPage(Object.freeze(events));
      }
    });
    return Object.freeze(summary);
  }finally{source.close();}
}


/**
 * One outstanding provisional event page maximum. Receiver ACK is an
 * application-store staging acknowledgment, NOT source-index commit.
 * Without ACK, scanning stalls and eventually fails closed.
 */
export function createSourcePageAckGate(post,{timeoutMs=5000}={}) {
  if(typeof post!=='function'||!Number.isSafeInteger(timeoutMs)||
      timeoutMs<100||timeoutMs>30000) {
    const error=new Error('invalid bounded page transport');
    error.code='PAGE_PORT_INVALID';throw error;
  }
  let pending=null,sequence=0;
  const reject=(code,detail)=>{
    const e=new Error(detail);e.code=code;return e;
  };
  return Object.freeze({
    async publish(rows,{jobId,sourceRefId}) {
      if(pending)throw reject('PAGE_BACKPRESSURE','prior source page has not been staged');
      const n=sequence++;
      return new Promise((resolve,rejectPromise)=>{
        const timer=setTimeout(()=>{
          pending=null;
          rejectPromise(reject('PAGE_ACK_TIMEOUT','source event page not acknowledged'));
        },timeoutMs);
        pending={n,jobId,sourceRefId,resolve,rejectPromise,timer};
        try {
          post({schema:SOURCE_WORKER_SCHEMA,kind:'PROVISIONAL_PAGE',
            jobId,sourceRefId,sequence:n,rows});
        }catch(e){
          clearTimeout(timer);pending=null;
          rejectPromise(reject('PAGE_POST_FAILED','native Worker could not post source page'));
        }
      });
    },
    receive(message) {
      if(message?.kind!=='PAGE_ACK')return false;
      const p=pending;
      if(!p)return true; // late ACK never resurrects a completed/failed page
      clearTimeout(p.timer);pending=null;
      if(message.schema!==SOURCE_WORKER_SCHEMA||
         message.jobId!==p.jobId||message.sourceRefId!==p.sourceRefId||
         message.sequence!==p.n){
        p.rejectPromise(reject('PAGE_ACK_MISMATCH','receiver ACK belongs to wrong source or page'));
      }else{
        p.resolve();
      }
      return true;
    }
  });
}
