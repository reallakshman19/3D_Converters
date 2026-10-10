/**
 * Native original-Blob SHA-256 in bounded 1 MiB slices.
 *
 * Reuses the LFJ source-custody incremental SHA implementation, not a new
 * cryptographic primitive. The entire source is never materialized as one
 * ArrayBuffer in this Worker, the UI, or the SHA message protocol.
 * Source/CSV semantics and the product 32 MiB admission limit are unchanged.
 */
import { Sha256 } from '../../../lfj/source/source-snapshot.mjs';
import { requireIndexedSourceAdmission } from './xml-cii-adapted-lfj-size-admission.js';

const CHUNK_BYTES = 1024 * 1024;
let started = false;
self.onmessage = async ({data}) => {
  if (started) {
    self.postMessage({type:'ERROR',code:'LFJ_SHA_BUSY',
      message:'One original Blob hash operation per Worker is permitted'});
    return;
  }
  started = true;
  try {
    if (data?.type !== 'HASH' || !(data.blob instanceof Blob))
      throw Object.assign(new Error('Original JSON Blob required'),{code:'LFJ_SHA_INPUT'});
    requireIndexedSourceAdmission(data.blob);
    const hasher = new Sha256();
    const declaredBytes = data.blob.size;
    let bytesHashed = 0, chunkReads = 0, maxReadBytes = 0;
    for (let offset = 0; offset < declaredBytes; offset += CHUNK_BYTES) {
      const end = Math.min(offset + CHUNK_BYTES,declaredBytes);
      const originalSlice = data.blob.slice(offset,end);
      if (originalSlice.size !== end - offset)
        throw Object.assign(new Error('Original Blob byte-range size changed'),{
          code:'LFJ_SHA_SOURCE_DRIFT'});
      const bytes = new Uint8Array(await originalSlice.arrayBuffer());
      if (bytes.byteLength !== end - offset)
        throw Object.assign(new Error('Original Blob read was truncated'),{
          code:'LFJ_SHA_SOURCE_DRIFT'});
      hasher.update(bytes);
      bytesHashed += bytes.byteLength;
      chunkReads++;
      maxReadBytes = Math.max(maxReadBytes,bytes.byteLength);
    }
    if (bytesHashed !== declaredBytes || chunkReads !==
        Math.ceil(declaredBytes / CHUNK_BYTES))
      throw Object.assign(new Error('Source hash did not cover all original bytes'),{
        code:'LFJ_SHA_CENSUS'});
    self.postMessage({
      type:'DONE',sha256:hasher.hex(),sizeBytes:declaredBytes,
      bytesHashed,chunkReads,maxReadBytes,
      chunkLimitBytes:CHUNK_BYTES
    });
  } catch(error) {
    self.postMessage({
      type:'ERROR',code:error?.code || 'LFJ_SHA_WORKER_FAILED',
      message:String(error?.message || error).slice(0,240)
    });
  }
};
