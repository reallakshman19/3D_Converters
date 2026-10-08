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
