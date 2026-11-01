/** Presentation text only. Execution history does not grant release authority. */
const code=v=>typeof v==='string'&&/^[A-Z][A-Z0-9_]{2,79}$/.test(v)
  ?v:'NATIVE_CANDIDATE_FAILED';
export function xml229RunHoldPlainMeaning(audit){
 const diagnosis=audit?.diagnosisCode||'';
 const weights=audit?.evidence?.find(x=>x.name==='weight-final-readiness');
 const mass=weights?.status==='VERIFIED'
   ?'The current Worker reports a complete accepted Source/Final mass census. '
   :'Weight/Final evidence is not fully verified for this snapshot. ';
 const candidate=audit?.nativeCandidate;
 const format=diagnosis==='BRANCH_FORMAT_IDENTITY_UNRESOLVED'
   ?' Separately, configured branch formats remain unmatched or conflicting; see Branch format diagnosis.':'';
 if(candidate?.status==='FAILED')
   return mass+'A native conversion candidate executed and FAILED ('+
     code(candidate.failureCode)+').'+format+
     ' Independent native CII release remains HELD.';
 if(candidate?.status==='IN_PROGRESS')
   return mass+'A native conversion candidate is IN PROGRESS.'+format+
     ' Execution has not established independent CII release authority.';
 if(candidate?.status==='SUCCEEDED')
   return mass+'A native conversion candidate completed, but is not an independently authorized release.'+
     format+' CII download remains HELD.';
 if(diagnosis==='BRANCH_FORMAT_IDENTITY_UNRESOLVED')
   return mass+'Configured branch formats are unmatched or conflicting. No current native candidate attempt is recorded; see Branch format diagnosis. Independent CII release remains HELD.';
 if(diagnosis==='FINAL_INTENT_NOT_OBSERVED')
   return mass+'Native Final intent has not been read for this display; it is not a missing-weight verdict.';
 if(diagnosis==='FINAL_INTENT_READ_FAILED')
   return mass+'The Worker Final-intent read failed; the audit keeps Weight evidence separate and native Run remains unverified.';
 if(diagnosis==='INDEPENDENT_NATIVE_RELEASE_AUTHORITY_ABSENT')
   return mass+'Final intent is eligible. Actual native CII output and independent mass reconciliation are still required.';
 if(diagnosis==='FINAL_INTENT_SOURCE_OR_BASIS_DRIFT'||diagnosis==='FINAL_INTENT_POPULATION_DRIFT')
   return mass+'The returned Final intent contradicts the current source, Worker basis or mass census; rebuild on one source revision.';
 if(diagnosis==='FINAL_INTENT_INVALID')
   return mass+'The returned Final-intent receipt is malformed; do not use it to run or release CII.';
 if(diagnosis==='FINAL_INTENT_NOT_ELIGIBLE')
   return mass+'The current Worker has not authorized this Final mass population for native binding; inspect the accepted review decisions.';
 return mass+'Inspect the first unverified stage. Diagnostic evidence alone cannot authorize native CII.';
}
