/**
 * Read-only restoration of the SAME current original-source GC-PW Worker
 * Preview used by Weight Match and Output/Run. UI render state/localStorage
 * are never accepted as engineering authority.
 */
import {isXml229VerifiedCompletionForInput}
 from './xml229-verified-output-readiness.mjs';

const failure=(code,message)=>Object.assign(new Error(message),{code});

/** Call after navigating back to tab 4. No rebuild, decision, or native Run. */
export async function readXml229LivePreviewForCurrentInput({
 session,input,isCurrent=()=>true,
}={}){
 if(!session||typeof session.readCompletion!=='function'||
    typeof session.readPreviewResult!=='function')
   throw failure('VERIFIED_PREVIEW_SESSION_REQUIRED',
     'No live original-source Preview/Weight Worker is available');
 if(isCurrent()!==true)
   throw failure('STALE_PREVIEW_RESTORE','Original source changed before Preview restore');
 const proof=await session.readCompletion();
 if(isCurrent()!==true||
    !isXml229VerifiedCompletionForInput(input,session.receipt,proof))
   throw failure('UNVERIFIED_PREVIEW_RESTORE',
     'Current original source, full engineering facts or Worker basis cannot be verified');
 const result=await session.readPreviewResult();
 if(isCurrent()!==true||
    !isXml229VerifiedCompletionForInput(input,session.receipt,proof)||
    result?.sourceOccurrences?.branchCount!==result?.branchRows?.length||
    !Array.isArray(result?.nodeRows))
   throw failure('UNVERIFIED_PREVIEW_RESTORE',
     'Restored Preview rows must match the complete current verified source');
 return {result,proof,receipt:session.receipt};
}
