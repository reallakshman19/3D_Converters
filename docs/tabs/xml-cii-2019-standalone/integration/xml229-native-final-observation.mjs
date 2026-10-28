/** Read-only observation of the current Worker Final intent.
 * This does not accept a Weight draft, trigger conversion, or authorize CII.
 */
const safeCode = value => typeof value==='string' &&
  /^[A-Z][A-Z0-9_]{2,79}$/.test(value) ? value : 'FINAL_INTENT_READ_FAILED';
const whole = n => Number.isSafeInteger(n) && n>=0;

export async function readXml229NativeFinalObservation(session, isCurrent=()=>true) {
  if (!session || session.closed || typeof session.readCompletion!=='function' ||
      !isCurrent()) return {stale:true,completion:null,finalIntent:null,
        finalIntentReadError:null};
  const completion=await session.readCompletion();
  if (!isCurrent() || session.closed) return {stale:true,completion:null,
    finalIntent:null,finalIntentReadError:null};
  const c=completion?.counts;
  // Read Final intent only for a complete, positive source-qualified census;
  // this is a diagnostic read, not a request to accept a Weight decision.
  const complete=completion?.schema==='XML229.P4.RunAdvisory.v1' &&
    whole(completion.verifiedPhysicalCount) && completion.verifiedPhysicalCount>0 &&
    c && [c.source,c.match1,c.final,c.unresolved].every(whole) &&
    c.source+c.match1+c.final+c.unresolved===completion.verifiedPhysicalCount &&
    c.unresolved===0 && c.match1===0;
  if (!complete) return {stale:false,completion,finalIntent:null,
    finalIntentReadError:null};
  try {
    if (typeof session.readNativeFinalIntent!=='function')
      return {stale:false,completion,finalIntent:null,
        finalIntentReadError:{code:'FINAL_INTENT_READ_UNAVAILABLE'}};
    const finalIntent=await session.readNativeFinalIntent();
    if (!isCurrent() || session.closed) return {stale:true,completion:null,
      finalIntent:null,finalIntentReadError:null};
    if (!finalIntent) return {stale:false,completion,finalIntent:null,
      finalIntentReadError:{code:'FINAL_INTENT_EMPTY_RESPONSE'}};
    return {stale:false,completion,finalIntent,finalIntentReadError:null};
  } catch (error) {
    if (!isCurrent() || session.closed) return {stale:true,completion:null,
      finalIntent:null,finalIntentReadError:null};
    return {stale:false,completion,finalIntent:null,
      finalIntentReadError:{code:safeCode(error?.code)}};
  }
}
