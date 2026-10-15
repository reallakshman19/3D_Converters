/**
 * XML229 R1-B actual native CII execution gate.
 *
 * An indexed original JSON is source-only evidence. A verified physical
 * GC-PW session plus reviewed Match-1/Final is not proof that native CII
 * output consumed that exact source/master/basis. Until the independent
 * native output gate is implemented, the only truthful decision is HOLD.
 *
 * This guard is called INSIDE all three Run execution entrypoints, not just
 * when the button is rendered. Never use the legacy cache/0 blockers.
 */
import {getXml229CurrentWorkerHeldReview}
 from './xml-cii-adapted-p4-verified-weight-panel.js';
import {hasSelectedXml229OriginalO1Receipt}
 from '../xml-cii-original-run-scope.js';

export const XML229_RUN_GATE_SCHEMA='XML229.P4.NativeRunGate.v1';
function scopeState(stateRef){
  const base=stateRef?.modeABaseRef||stateRef;
  const state=base?.current||stateRef?.current||stateRef||{};
  return state&&typeof state==='object'?state:{};
}
/** An active canonical session must be checked even when a stale O1 receipt
 * was cleared from state. Conversely, an O1 receipt with no session is HOLD.
 */
export function requiresXml229CanonicalRunGate(stateRef){
  const state=scopeState(stateRef);
  return Boolean(hasSelectedXml229OriginalO1Receipt(state)||
    getXml229CurrentWorkerHeldReview(stateRef)||
    (stateRef?.current!==state&&hasSelectedXml229OriginalO1Receipt(stateRef?.current)));
}
const deny=(code,message,detail=null)=>Object.freeze({
  schema:XML229_RUN_GATE_SCHEMA,applies:true,authorized:false,
  code,message,detail,
});
export async function checkXml229CanonicalRunGate(stateRef){
  if(!requiresXml229CanonicalRunGate(stateRef))
    return Object.freeze({schema:XML229_RUN_GATE_SCHEMA,applies:false,authorized:null,
      code:'NOT_SOURCE_BOUND_P4',message:'Existing legacy Run policy applies',detail:null});
  const review=getXml229CurrentWorkerHeldReview(stateRef);
  if(!review)return deny('ORIGINAL_SOURCE_REVIEW_MISSING',
    'CII Run HELD: original O1 JSON index is not a complete engineering/Final review. Build current verified Weight review.');
  let proof;
  try{proof=await review.readCompletion();}
  catch(error){return deny(error?.code||'STALE_SOURCE_OR_MASTER',
    'CII Run HELD: current source/Blob/master/selection or GC-PW review changed. Rebuild and review. '+String(error?.message||error));}
  if(proof?.schema!=='XML229.P4.RunAdvisory.v1'||
    proof?.basisId!==review.receipt?.basisId||
    proof?.sourceGenerationId!==review.receipt?.sourceGenerationId||
    proof?.originalJsonSha256!==review.receipt?.originalJsonSha256||
    proof?.engineeringFactsVerified!==true||
    proof?.verifiedPhysicalCount!==review.receipt?.physicalCount||
    !Number.isSafeInteger(proof?.verifiedFactCount)||
    !Number.isSafeInteger(proof?.counts?.unresolved))
    return deny('SOURCE_BOUND_COMPLETION_INVALID',
      'CII Run HELD: complete original physical source and stage evidence cannot be verified.');
  if(proof.counts.unresolved>0)return deny('UNRESOLVED_OR_PROPOSED_WEIGHT',
    'CII Run HELD: '+proof.counts.unresolved+' original physical component(s) still have unresolved or proposed-only weights. Match-1 and Final must be reviewed explicitly.',proof);
  if(proof.ciiReleaseAuthorized!==false)
    return deny('NATIVE_RELEASE_CONTRACT_INVALID',
      'CII Run HELD: a native output release claim lacks a verified source/output consumption transaction.',proof);
  return deny('NATIVE_CII_OUTPUT_NOT_ATTESTED',
    'CII Run HELD: full original physical facts and reviewed weights exist, but native CII has not independently consumed the same source/master/Final basis. No conversion or ZIP release is authorized.',proof);
}
