/** Dedicated native Worker for original JSON Blob hashing, not matching. */
self.onmessage=async event=>{
  const input=event.data;
  if(input?.type!=='HASH' || !(input.blob instanceof Blob)){
    self.postMessage({type:'ERROR',code:'LFJ_SHA_INPUT',
      message:'Original JSON Blob required'});return;
  }
  try{
    // WebCrypto digest needs a complete ArrayBuffer, but only INSIDE this
    // short-lived Worker; no 30 MiB foreground arrayBuffer is created.
    const bytes=await input.blob.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const sha256=[...new Uint8Array(digest)]
      .map(n=>n.toString(16).padStart(2,'0')).join('');
    self.postMessage({type:'DONE',sha256,sizeBytes:input.blob.size});
  }catch(error){
    self.postMessage({type:'ERROR',code:'LFJ_SHA_WORKER_FAILED',
      message:String(error?.message||error).slice(0,240)});
  }
};
