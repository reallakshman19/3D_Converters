/**
 * #1104 A06 — real Resolver browser File/Blob admission, source-only.
 *
 * Native R03 streams SHA-256 over Blob slices; the native Worker/IDB path
 * opens source + occurrence pairs and the #1104 app-owned CAS/typed consumer.
 * This MUST NOT be mistaken for Resolver trace/CSV or engineering authority.
 * A06 pilot caps are explicit; larger originals fail, never use text fallback.
 */
import {openBlobSourceSnapshot} from '../../source/source-snapshot.mjs';
import {runNativeSourceOnlyTypedFile} from './native-source-only-file-intake.mjs';

export class ResolverLfjAdmissionError extends Error{
  constructor(code,message){super(code+': '+message);this.code=code;this.name='ResolverLfjAdmissionError';}
}
const fail=(code,message)=>{throw new ResolverLfjAdmissionError(code,message);};
export const RESOLVER_LFJ_PILOT_MAX_BYTES=1048576;
const stable=value=>JSON.stringify(value??null);

function dependencySnapshot(state){
  // Existing Resolver XML/config/master state is domain authority.
  // No source-only module may reinterpret that context as an engineering fact.
  return {
    sourceText:String(state?.sourceText??''),
    supportConfigJson:String(state?.supportConfigJson??''),
    masterContext:stable(state?.masterContext),
    dependencyRevisions:stable(state?.dependencyRevisions),
    resolverJsonTraceConfig:stable(state?.resolverJsonTraceConfig),
    jsonTraceScopeId:String(state?.jsonTraceScopeId??''),
    branchSelection:stable(state?.branchSelection)
  };
}
function sameDeps(a,b){
  return Object.keys(a).every(k=>a[k]===b?.[k]);
}

/**
 * @param {Object} opts
 * @param {Blob} opts.file original uploaded staged JSON, never text
 * @param {Function} opts.getState LIVE application state getter
 * @param {string} opts.jobToken current A06 run token
 * @param {AbortSignal} opts.signal cancellation on repick/mode change
 */
export async function admitResolverLfjFile({file,getState,jobToken,signal}={}){
  if(typeof Blob==='undefined'||!(file instanceof Blob)||
    typeof getState!=='function'||
    typeof jobToken!=='string'||!jobToken.length||
    typeof globalThis.crypto?.randomUUID!=='function')
    fail('RESOLVER_LFJ_ADMISSION_REQUIRED','real source File, live app state, job and crypto required');
  if(file.size>RESOLVER_LFJ_PILOT_MAX_BYTES)
    fail('RESOLVER_LFJ_PILOT_OVERLIMIT',
      'A06 bounded source-only pilot cannot project full originals above 1 MiB');
  const initial=getState();
  if(initial?.stagedJsonFile!==file||initial.resolverLfjMode!=='LFJ'||
    initial.resolverLfjJobToken!==jobToken)
    fail('RESOLVER_LFJ_STALE','original file or LFJ selection changed before admission');
  const frozen=dependencySnapshot(initial);
  const live=()=>{
    if(signal?.aborted)fail('RESOLVER_LFJ_CANCELLED','source-only admission cancelled');
    const now=getState();
    if(now?.stagedJsonFile!==file||now.resolverLfjMode!=='LFJ'||
       now.resolverLfjJobToken!==jobToken||!sameDeps(frozen,dependencySnapshot(now)))
      fail('RESOLVER_LFJ_STALE','source, XML/config/masters or mode changed');
  };
  live();
  const revision='resolver-'+globalThis.crypto.randomUUID();
  // This SHA/Blob read is not Worker parsing and is not claimed as a
  // 10 MB responsiveness acceptance. No full-text materialization.
  const source=await openBlobSourceSnapshot(file,{revision,signal});
  let sourceBasis;
  try{
    live();
    sourceBasis={
      sourceRefId:'resolver-source:'+source.sha256,
      sourceSha256:source.sha256,
      sourceRevision:source.revision,
      selectionDigest:'ALL:'+source.sha256,
      jobId:'resolver-job-'+globalThis.crypto.randomUUID(),
      dependencyRevision:'resolver-dependencies:'+jobToken,
      byteLength:source.byteLength
    };
  }finally{source.close();}
  const basis=Object.freeze(sourceBasis);
  const getCurrentBasis=()=>{
    try{live();return {...basis};}
    catch{return {...basis,dependencyRevision:'LFJ_SUPERSEDED_DEPENDENCIES'};}
  };
  live();
  const result=await runNativeSourceOnlyTypedFile({
    blob:file,revision,
    selection:{mode:'ALL',includes:[],excludes:[]},
    expectedBasis:basis,getCurrentBasis,
    databaseName:'lfj-3d-resolver-a06',signal,
    maxFacts:4096,maxTotalBytes:8388608,
    maxRows:64,maxPageBytes:65536,maxScalarBytes:65536
  });
  live();
  if(result?.schema!=='LFJ.3D.SourceOnlyTypedSessionResult.v1'||
     result?.rightsBasis!=='SOURCE_ONLY_PROJECTED_CANDIDATE'||
     result?.engineeringReady!==false||
     result.candidate?.rightsBasis!=='SOURCE_ONLY_PROJECTED_CANDIDATE'||
     result.candidate?.engineeringReady!==false)
    fail('RESOLVER_LFJ_RIGHTS_INVALID','source indexing cannot authorize XML/CII trace/export');
  return Object.freeze({
    schema:'LFJ.3D.ResolverSourceAdmission.v1',
    sourceSha256:basis.sourceSha256,sourceRevision:basis.sourceRevision,
    sourceRefId:basis.sourceRefId,selectedCount:result.sourceReceipt.selectedCount,
    typedNodeCount:result.candidate.nodes.length,
    publicationSerial:result.publicationSerial,
    rightsBasis:'SOURCE_ONLY_PROJECTED_CANDIDATE',engineeringReady:false,
    exportAuthorized:false,traceAuthorized:false
  });
}
