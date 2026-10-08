// Agent P P3-B2-B. An explicit DTXR Rating fetch is transactional; no
// inferred Rating becomes accepted if the SHA-bound Worker rebuild fails.
// Domain authority stays with the existing rating-fetch resolver.
import {applyPreviewDtxrRatingOverrides} from './xml-cii-adapted-preview-rating-fetch.js';

export class PreviewDtxrTransactionError extends Error {
  constructor(code,message) {super(message);this.name='PreviewDtxrTransactionError';this.code=code;}
}
function snapshotOverrides(config) {
  if(!config||typeof config!=='object'||Array.isArray(config))
    throw new PreviewDtxrTransactionError('CONFIG_REQUIRED','Mutable Preview config required');
  // Only the small override subtree is snapshotted, never 10k master rows.
  return JSON.stringify(config.overrides??{});
}
export async function runPreviewDtxrRatingTransaction({
  config,branchRows,persist,rebuild,apply=applyPreviewDtxrRatingOverrides,
}={}) {
  if(typeof persist!=='function'||typeof rebuild!=='function'||typeof apply!=='function')
    throw new PreviewDtxrTransactionError('TRANSACTION_PORT_REQUIRED',
      'Persist, Worker rebuild and DTXR resolver ports are required');
  const original=snapshotOverrides(config);
  let intended=null, attempted=false;
  try{
    attempted=true;
    const result=apply(config,branchRows);
    intended=snapshotOverrides(config);
    const changed=result?.applied>0||result?.cleared>0;
    if(!changed)return {...result,changed:false,committed:false};
    await persist(config);
    // Live renderer port is xmlCiiRebuildPreviewThroughWorker(), which fences
    // request/basis and rejects null/failed/cancelled Worker completion.
    const rendered=await rebuild({rollback:false});
    if(!rendered)throw new PreviewDtxrTransactionError('PREVIEW_REBUILD_INCOMPLETE',
      'DTXR Rating cannot be committed until Preview Worker completes');
    return {...result,changed:true,committed:true};
  }catch(error) {
    if(!attempted)throw error;
    // Before the first await there cannot be another UI event between apply()
    // and this catch; later, restore only when no concurrent override edit.
    const unchangedSinceAttempt=intended===null||snapshotOverrides(config)===intended;
    if(!unchangedSinceAttempt){
      error.concurrentEdit=true;
      throw error; // Never overwrite a later manual edit.
    }
    config.overrides=JSON.parse(original);
    error.ratingOverridesRestored=true;
    try{
      await persist(config);
      // If this also fails, the error reports rollbackError; never report
      // the original DTXR fetch as committed.
      await rebuild({rollback:true});
    }catch(rollbackError){error.rollbackError=rollbackError;}
    throw error;
  }
}
