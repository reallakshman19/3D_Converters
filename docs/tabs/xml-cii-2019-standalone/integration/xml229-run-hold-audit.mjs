/**
 * XML229 Output/Run hold diagnosis — non-authorizing, aggregate-only.
 * All findings are derived from the CURRENT source and verified live Worker.
 * This does not grant native CII release, accept drafts or persist evidence.
 */
import {isXml229VerifiedCompletionForInput}
  from './xml229-verified-output-readiness.mjs';

export const XML229_RUN_HOLD_AUDIT_SCHEMA='XML229.RunHoldAudit.v1';
const whole=n=>Number.isSafeInteger(n)&&n>=0;
const safeCode=v=>typeof v==='string'&&/^[A-Z][A-Z0-9_]{2,79}$/.test(v)
  ?v:'UNCLASSIFIED_READ_FAILURE';
const count=v=>whole(v)?v:null;
const statuses=new Set(['NOT_REACHED','MISSING','STALE','FAILED','VERIFIED','HELD','NOT_ASSESSED']);
const stage=(name,status,reason,counts=null)=>Object.freeze({
  name,status:statuses.has(status)?status:'NOT_ASSESSED',reason,
  ...(counts?{counts}:{}),
});
const digestMatch=(a,b)=>typeof a==='string'&&a.length>0&&a===b;
function sourceSnapshot(input){
  const own=input?.xml229StagedSourceReceipt;
  const enabled=(input?.sourceBatch?.sources||[]).filter(s=>s?.enabled!==false);
  const receipts=enabled.map(s=>s.xml229StagedSourceReceipt||
    s.workflow?.xml229StagedSourceReceipt).filter(Boolean);
  const candidate=own||receipts[0]||null;
  let issue=null;
  if(enabled.length>1)issue='MULTISOURCE_RELEASE_UNSUPPORTED';
  else if(own&&receipts[0]&&
    (!digestMatch(own.sha256,receipts[0].sha256)||
     !digestMatch(own.generationId,receipts[0].generationId)))
    issue='SOURCE_RECEIPT_DRIFT';
  else if(candidate?.schema!=='XML229.OriginalStagedSourceReceipt.v1')
    issue='SOURCE_RECEIPT_UNVERIFIED';
  const expectedSourceId=enabled[0]?.sourceId||
    input?.modeASourceId||input?.sourceBatch?.activeSourceId||'';
  return {hasReceipt:!!candidate,receipt:candidate,
    selectedSources:enabled.length,expectedSourceId,issue};
}
function workerMismatch(input,sessionReceipt,proof){
  const source=sourceSnapshot(input);
  if(source.issue)return source.issue;
  if(!sessionReceipt)return 'WORKER_SESSION_NOT_ATTESTED';
  if(!proof)return 'WORKER_COMPLETION_NOT_READ';
  if(proof.schema!=='XML229.P4.RunAdvisory.v1')
    return 'WORKER_COMPLETION_SCHEMA_INVALID';
  if(!digestMatch(source.receipt?.sha256,proof.originalJsonSha256)||
     !digestMatch(source.receipt?.generationId,proof.sourceGenerationId)||
     !digestMatch(source.receipt?.sha256,sessionReceipt.originalJsonSha256)||
     !digestMatch(source.receipt?.generationId,sessionReceipt.sourceGenerationId))
    return 'SOURCE_GENERATION_DRIFT';
  if(!digestMatch(sessionReceipt.basisId,proof.basisId)||
     !digestMatch(sessionReceipt.sourceId,proof.sourceId)||
     (source.expectedSourceId&&source.expectedSourceId!==proof.sourceId))
    return 'WORKER_SCOPE_OR_BASIS_DRIFT';
  if(!whole(proof.verifiedPhysicalCount)||
     !whole(proof.verifiedFactCount)||
     proof.verifiedPhysicalCount!==sessionReceipt.physicalCount||
     proof.verifiedFactCount!==proof.verifiedPhysicalCount*7)
    return 'WORKER_FACT_CENSUS_DRIFT';
  const c=proof.counts||{};
  if(![c.source,c.match1,c.final,c.unresolved].every(whole)||
     c.source+c.match1+c.final+c.unresolved!==proof.verifiedPhysicalCount)
    return 'WORKER_MASS_CENSUS_DRIFT';
  if(proof.engineeringFactsVerified!==true||
     proof.previewStatus!=='FULL_SOURCE_FACTS_VERIFIED'||
     proof.ciiReleaseAuthorized!==false)
    return 'WORKER_ENGINEERING_ATTESTATION_INVALID';
  return 'WORKER_COMPLETION_UNVERIFIED';
}
function classify({hold,source,sessionState,proofValid,proof,readError,finalIntent,candidate}){
  if(!hold)return 'NO_GOVERNED_NATIVE_HOLD';
  if(source.issue)return source.issue;
  if(sessionState==='CLOSED')return 'WORKER_SESSION_CLOSED';
  if(sessionState==='MISSING')return 'LIVE_WORKER_SESSION_MISSING';
  if(readError)return 'WORKER_READ_FAILED';
  if(!proof)return 'WORKER_COMPLETION_NOT_READ';
  if(!proofValid)return 'WORKER_COMPLETION_REJECTED';
  const c=proof.counts;
  if(c.unresolved>0)return 'UNRESOLVED_PHYSICAL_MASS';
  if(c.match1>0)return 'MATCH1_NOT_FINAL';
  if(finalIntent?.eligibleForEngineBinding===false)
    return 'FINAL_INTENT_NOT_ELIGIBLE';
  if(finalIntent&&finalIntent.eligibleForEngineBinding!==true)
    return 'FINAL_INTENT_INVALID';
  if(candidate?.status==='FAILED')return 'NATIVE_CANDIDATE_FAILED';
  if(candidate?.status==='SUCCEEDED')return 'NATIVE_CANDIDATE_NONRELEASING';
  if(candidate?.status==='IN_PROGRESS')return 'NATIVE_CANDIDATE_IN_PROGRESS';
  if(!finalIntent)return 'FINAL_INTENT_NOT_OBSERVED';
  return 'INDEPENDENT_NATIVE_RELEASE_AUTHORITY_ABSENT';
}
/** Called on each render AND again from the explicit fresh-evidence download. */
export function buildXml229RunHoldAudit({
 input={},report=null,sessionState='UNKNOWN',
 sessionReceipt=null,completion=null,finalIntent=null,
 readError=null,candidate=null,flowTrace=null,
}={}){
 const source=sourceSnapshot(input);
 const hold=report?.checklistRows?.some(x=>
   x.id==='xml229-original-json-engineering-authority'&&x.blocking===true)===true;
 const valid=isXml229VerifiedCompletionForInput(input,sessionReceipt,completion);
 const code=classify({hold,source,sessionState,proofValid:valid,
   proof:completion,readError,finalIntent,candidate});
 const mass=valid?Object.freeze({
   physicalCount:count(completion.verifiedPhysicalCount),
   factCount:count(completion.verifiedFactCount),
   source:count(completion.counts.source),
   match1:count(completion.counts.match1),
   final:count(completion.counts.final),
   unresolved:count(completion.counts.unresolved),
 }):null;
 const evidence=[
   stage('original-json-index',
     source.issue?'STALE':source.hasReceipt?'VERIFIED':'MISSING',
     source.issue||'SOURCE_RECEIPT_PRESENT_NOT_ENGINEERING_APPROVAL'),
   stage('current-gc-pw-worker',
     sessionState==='CLOSED'?'STALE':sessionReceipt?'VERIFIED':'MISSING',
     sessionState==='CLOSED'?'WORKER_SESSION_CLOSED':
     sessionReceipt?'CURRENT_SESSION_RECEIPT_PRESENT':'NO_CURRENT_SESSION_RECEIPT'),
   stage('preview-facts-and-mass-census',
     valid?'VERIFIED':readError?'FAILED':completion?'STALE':'NOT_REACHED',
     valid?'SEVEN_FACTS_PER_PHYSICAL_AND_SOURCE_BASIS_MATCH':
     readError?safeCode(readError?.code):
     completion?workerMismatch(input,sessionReceipt,completion):
     'NO_VERIFIED_WORKER_COMPLETION',mass),
   stage('weight-final-readiness',
     !valid?'NOT_REACHED':mass.unresolved||mass.match1?'HELD':'VERIFIED',
     !valid?'WORKER_COMPLETION_NOT_VERIFIED':
     mass.unresolved?'UNRESOLVED_PHYSICAL_MASS':
     mass.match1?'MATCH1_NOT_FINAL':'ALL_PHYSICAL_MASSES_RESOLVED',mass),
   stage('native-final-intent',
     !finalIntent?'NOT_REACHED':
     finalIntent.eligibleForEngineBinding===true?'VERIFIED':'HELD',
     !finalIntent?'FINAL_INTENT_NOT_QUERIED':
     finalIntent.eligibleForEngineBinding===true?
     'SOURCE_BOUND_ENGINE_BINDING_ELIGIBLE_ONLY':'FINAL_INTENT_NOT_ELIGIBLE'),
   stage('worker-r2-and-native-candidate',
     candidate?.status==='SUCCEEDED'?'VERIFIED':
     candidate?.status==='FAILED'?'FAILED':
     candidate?.status==='IN_PROGRESS'?'NOT_ASSESSED':'NOT_REACHED',
     candidate?.status==='SUCCEEDED'?'NONRELEASING_CANDIDATE_PRODUCED_NOT_RELEASE':
     candidate?.status==='FAILED'?safeCode(candidate.code):
     candidate?.status==='IN_PROGRESS'?'CANDIDATE_EXECUTION_IN_PROGRESS':
     'NO_CURRENT_NATIVE_CANDIDATE_RECEIPT'),
   stage('independent-native-output-and-release',
     hold?'HELD':'NOT_ASSESSED',
     hold?'INDEPENDENT_NATIVE_AUTHORITY_NOT_ESTABLISHED':
     'NO_GOVERNED_NATIVE_HOLD'),
 ];
 const events=Array.isArray(flowTrace?.events)
   ?flowTrace.events.filter(e=>e&&whole(e.seq)&&typeof e.kind==='string')
     .slice(-256).map(e=>({
       seq:e.seq,elapsedMs:count(e.elapsedMs),kind:String(e.kind).slice(0,48),
       actor:String(e.actor||'').slice(0,32),
       ...(e.code?{code:safeCode(e.code)}:{}),
       ...(e.counts?{counts:Object.fromEntries(
         Object.entries(e.counts).filter(([k,v])=>
           ['physical','facts','sourceMass','match1','final','unresolved','qualifiedCandidates','branches'].includes(k)&&whole(v)))}:{}),
     })):[];
 const first=evidence.find(x=>x.status==='STALE'||x.status==='FAILED'||
    x.status==='MISSING'||x.status==='HELD'||x.status==='NOT_REACHED');
 return Object.freeze({
   schema:XML229_RUN_HOLD_AUDIT_SCHEMA,
   gateId:'xml229-original-json-engineering-authority',
   gateStatus:hold?'HELD':'NOT_APPLICABLE',
   diagnosisCode:code,
   firstUnverifiedBoundary:first?.name||null,
   evidence,
   source:{receiptPresent:source.hasReceipt,
     sourceReceiptPhase:source.receipt?.phase==='INDEX_COMMITTED'?
       'INDEX_COMMITTED':'OTHER_OR_UNKNOWN',
     selectedSourceCount:source.selectedSources,
     sourceMismatchCode:source.issue},
   worker:{sessionState,completionAccepted:valid,
     readFailureCode:readError?safeCode(readError.code):null},
   nativeCandidate:candidate?{
     status:candidate.status,
     ...(candidate.code?{failureCode:safeCode(candidate.code)}:{}),
     ...(whole(candidate.nativeRigidObserved)?{nativeRigidObserved:candidate.nativeRigidObserved}:{}),
     ...(whole(candidate.unresolvedNativeOwners)?{unresolvedNativeOwners:candidate.unresolvedNativeOwners}:{}),
   }:null,
   chronology:{available:!!flowTrace,
     observedEvents:count(flowTrace?.observedEvents)||events.length,
     totalEvents:count(flowTrace?.totalEvents)||events.length,
     droppedEvents:count(flowTrace?.droppedEvents)||0,
     events},
   authoritative:false,independentlyAccepted:false,
   nativeCiiReleaseAuthorized:false,ciiDownloadAuthorized:false,
 });
}
