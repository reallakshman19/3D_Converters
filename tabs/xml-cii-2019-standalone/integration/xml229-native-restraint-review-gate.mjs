/** Native Final cannot treat Preview quarantine as a source-approved restraint.
 * No configured profile, weight decision, or UI warning can waive this gate.
 */
export function assertNativeXml229RestraintReviewClear(review){
 if(review?.schema!=='XML229.PreviewRestraintReview.v1'||
    review.status!=='CLEAR'||
    !Array.isArray(review.warnings)||
    review.warnings.length>0||
    review.engineeringRestraintAcceptance==='HOLD'){
  throw Object.assign(new Error(
    'Unresolved source restraint classifications require engineering approval before native Final CII'),
    {code:'NATIVE_RESTRAINT_REVIEW_HOLD'});
 }
 return true;
}
