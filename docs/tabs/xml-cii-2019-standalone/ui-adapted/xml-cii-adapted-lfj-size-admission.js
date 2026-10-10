/**
 * A3 indexed-source capability boundary. This is intentionally not a
 * performance/Owner acceptance result or a promise of 90 MiB support.
 * No source bytes are read while inspecting a File/Blob's admission class.
 */
export const LFJ_INDEXED_MAX_SOURCE_BYTES = 32 * 1024 * 1024;
export const LFJ_LARGE_CONTROL_BYTES = Object.freeze({
  thirtyMiB: 30 * 1024 * 1024,
  ninetyMiB: 90 * 1024 * 1024
});
const freeze = fields => Object.freeze(fields);
export function inspectIndexedSourceAdmission(blob) {
  if (!(blob instanceof Blob))
    return freeze({accepted:false,code:'LFJ_SOURCE_MISSING',
      sizeBytes:null,limitBytes:LFJ_INDEXED_MAX_SOURCE_BYTES,
      message:'Select the original JSON File for indexed Build.'});
  const sizeBytes=blob.size;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0)
    return freeze({accepted:false,code:'LFJ_SOURCE_EMPTY',
      sizeBytes,limitBytes:LFJ_INDEXED_MAX_SOURCE_BYTES,
      message:'The selected original JSON source is empty or has an invalid size.'});
  if (sizeBytes > LFJ_INDEXED_MAX_SOURCE_BYTES)
    return freeze({accepted:false,code:'LFJ_SOURCE_CAPACITY',
      sizeBytes,limitBytes:LFJ_INDEXED_MAX_SOURCE_BYTES,
      message:'This indexed product Build supports at most 32 MiB of original JSON. '
        +'The selected '+(sizeBytes/(1024*1024)).toFixed(2)
        +' MiB file is not admitted. Distinct 90 MiB processing requires '
        +'a separately qualified large-source architecture; do not use legacy '
        +'foreground JSON parsing as a workaround.'});
  return freeze({accepted:true,code:'LFJ_SOURCE_ADMITTED_SIZE_ONLY',
    sizeBytes,limitBytes:LFJ_INDEXED_MAX_SOURCE_BYTES,
    message:'Original JSON is within the 32 MiB indexed Build input bound. '
      +'This is size admission only, not semantic, performance or Owner acceptance.'});
}
export function requireIndexedSourceAdmission(blob) {
  const result=inspectIndexedSourceAdmission(blob);
  if (!result.accepted)
    throw Object.assign(new Error(result.message),{code:result.code,
      sizeBytes:result.sizeBytes,limitBytes:result.limitBytes});
  return result;
}
