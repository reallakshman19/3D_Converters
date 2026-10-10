/**
 * T06b — temporary ORIGINAL File scope discovery in a dedicated native Worker.
 * Original bytes are never parsed/materialized on the UI main thread. The
 * complete B0 catalog and each bounded direct-root byte slice are verified
 * through the same reader used by selected matching. Discovery is a UI hint,
 * not matching authority, export consent, or a durable release receipt.
 */
import {Sha256} from '../../../lfj/source/source-snapshot.mjs';
import {runPagedCompactResearch} from '../../../lfj/qualification/experiments/consumer-sparse-b0/compact-paged-research.mjs';
import {readVerifiedOriginalRootManifest} from '../../../lfj/consumers/3d-converters/verified-source-root-reader.mjs';
import {indexedGenerationNames} from './xml-cii-adapted-lfj-cold-recovery.js';
import {deleteIndexedBuildDatabases} from './xml-cii-adapted-lfj-db-cleanup.js';

const MAX_SCOPES=128,MAX_LABEL_LENGTH=256,CHUNK=1024*1024;
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
async function hashOriginal(blob){
  const hash=new Sha256();
  for(let pos=0;pos<blob.size;pos+=CHUNK){
    const end=Math.min(blob.size,pos+CHUNK);
    const part=new Uint8Array(await blob.slice(pos,end).arrayBuffer());
    if(part.byteLength!==end-pos)
      fail('SCOPE_SOURCE_DRIFT','original source byte census changed');
    hash.update(part);
  }
  return hash.hex();
}
export async function scanOriginalFileScopes(blob){
  if(!(blob instanceof Blob)||blob.size===0)
    fail('SCOPE_ORIGINAL_REQUIRED','original JSON Blob required');
  // Reuse the product's existing 32MiB original File admission.
  if(blob.size>32*1024*1024)
    fail('SCOPE_SOURCE_OVERSIZE','original File exceeds the indexed product capacity');
  const id=crypto.randomUUID();
  const [sourceDatabaseName,projectionDatabaseName]=indexedGenerationNames(id);
  let problem=null;
  try{
    const originalSha256=await hashOriginal(blob);
    const indexed=await runPagedCompactResearch({
      blob,expectedSha256:originalSha256,databaseName:sourceDatabaseName,
      generation:id,revision:'A3-SCOPE-DISCOVERY'
    });
    if(indexed.sourceSha256!==originalSha256||indexed.originalBytes!==blob.size)
      fail('SCOPE_SOURCE_NOT_COMMITTED','original source catalogue did not match Blob');
    // Placeholder XML/config digests are SCAN-ONLY; matching Worker must
    // independently reattest real XML and config before a selected Build.
    const census=await readVerifiedOriginalRootManifest({
      sourceDatabaseName,sourceGeneration:id,blob,
      expectedSha256:originalSha256,
      xmlSha256:'0'.repeat(64),configDigest:'0'.repeat(64),
      requestedScopeId:'__ALL__'
    });
    const scopes=new Map();
    for(const root of census.census){
      if(root.scopeId.length>MAX_LABEL_LENGTH)
        fail('SCOPE_LABEL_LIMIT','original source scope label is too large');
      if(!scopes.has(root.scopeId)){
        if(scopes.size>=MAX_SCOPES)
          fail('SCOPE_COUNT_LIMIT','too many original source zones for bounded picker');
        scopes.set(root.scopeId,{id:root.scopeId,
          label:root.scopeId==='__UNSCOPED__'?'Unscoped':root.scopeId,
          itemCount:0});
      }
      scopes.get(root.scopeId).itemCount++;
    }
    return {schema:'LFJ.A3.IndexedFileScopes.v1',
      originalSha256,originalBytes:blob.size,
      originalRootCount:census.originalRootCount,
      scopes:[...scopes.values()],sourceOnly:true,
      engineeringReady:false,downloadAuthorized:false};
  }catch(e){problem=e;throw e;}
  finally{
    try{await deleteIndexedBuildDatabases([
      sourceDatabaseName,projectionDatabaseName
    ]);}catch(cleanup){
      if(!problem)throw cleanup;
      problem.cleanupError=cleanup.code||'LFJ_SCOPE_CLEANUP';
    }
  }
}
if(typeof self!=='undefined'&&typeof self.addEventListener==='function')
  self.addEventListener('message',async({data})=>{
    try{
      if(data?.type!=='DISCOVER')fail('SCOPE_PROTOCOL','DISCOVER required');
      const result=await scanOriginalFileScopes(data.blob);
      self.postMessage({type:'DONE',result});
    }catch(error){
      self.postMessage({type:'ERROR',code:error?.code||'SCOPE_DISCOVERY_FAILED',
        message:String(error?.message||error)});
    }
  });
