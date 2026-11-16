/** Shared source-bound restraint status between 4 Preview and O1 JSON Trace.
 * A quarantined Preview conflict is a FOR_REVIEW warning, NOT a failed Preview
 * and NEVER authorization for Final CII or replacement source classification.
 */
const EVENT='xml-cii-preview-failure';
let last=null,review=null;
const text=v=>String(v??'');
function emit(){
 try{globalThis.dispatchEvent?.(new CustomEvent(EVENT,{detail:{failure:last,review}}));}
 catch{/* no DOM */}
}
export function recordPreviewFailure(failure){
 last=failure?{
  code:text(failure.code),message:text(failure.message),
  at:new Date().toISOString(),
 }:null;
 emit();
}
export function lastPreviewFailure(){return last;}

export function recordPreviewRestraintReview(value){
 if(value==null){review=null;emit();return;}
 if(value?.schema!=='XML229.PreviewRestraintReview.v1'||
    !['CLEAR','FOR_REVIEW'].includes(value.status)||
    !Array.isArray(value.warnings)||
    (value.status==='FOR_REVIEW')!==(value.warnings.length>0)){
  // A malformed Worker review receipt must not downgrade an earlier hold.
  throw Object.assign(new Error('Invalid source-bound restraint review'),
    {code:'PREVIEW_RESTRAINT_REVIEW_INVALID'});
 }
 review={
  schema:value.schema,status:value.status,
  engineeringRestraintAcceptance:value.engineeringRestraintAcceptance,
  quarantinedXmlNodeCount:value.quarantinedXmlNodeCount,
  warnings:value.warnings.map(w=>({
   code:text(w.code),nodeNumber:text(w.nodeNumber),
   branchName:text(w.branchName),message:text(w.message),
   path:text(w.member?.path),memberName:text(w.member?.name),
   sourcePaths:Array.isArray(w.sourcePaths)?w.sourcePaths.map(text):[],
  })),
 };
 emit();
}
export function lastPreviewRestraintReview(){return review;}

function paintStatus(panel,failureValue=last,reviewValue=review){
 if(!panel)return;
 let blocked=panel.querySelector('[data-preview-blocker]');
 const failure=failureValue&&/^PREFINAL_RESTRAINT_/.test(failureValue.code)?failureValue:null;
 if(!failure)blocked?.remove();
 else{
  if(!blocked){
   blocked=document.createElement('p');blocked.dataset.previewBlocker='true';
   blocked.setAttribute('role','alert');
   blocked.style.cssText='color:#fecaca;background:#451a1a;border:1px solid #ef4444;padding:7px;border-radius:5px;';
   panel.append(blocked);
  }
  blocked.textContent='Preview blocked: '+failure.code+' — '+failure.message;
 }
 let warning=panel.querySelector('[data-preview-restraint-review]');
 if(reviewValue?.status!=='FOR_REVIEW'){warning?.remove();return;}
 if(!warning){
  warning=document.createElement('div');
  warning.dataset.previewRestraintReview='true';
  warning.setAttribute('role','status');
  warning.style.cssText='color:#fde68a;background:#422006;border:1px solid #d97706;padding:8px;border-radius:5px;';
  panel.append(warning);
 }
 const count=reviewValue.warnings.length;
 const first=reviewValue.warnings.slice(0,5).map(w=>
   (w.nodeNumber?'Node '+w.nodeNumber+': ':'')+
   (w.memberName||w.member?.name||w.path||w.member?.path||w.sourcePaths?.[0]||'source member')+' — '+w.code+
   (w.resolutionReason?' ('+w.resolutionReason+')':''));
 warning.textContent='For Review — '+count+' quarantined restraint source conflict(s), '+
   reviewValue.quarantinedXmlNodeCount+' XML node(s). Preview and independent Weight can continue; '+
   'engineering acceptance HOLD, approved Final CII blocked. '+
   first.join(' | ')+(count>5?' | +'+(count-5)+' more':'');
}
export function showPreviewBlocker(panel){
 if(!panel)return;
 paintStatus(panel);
 if(panel.dataset.previewBlockerListener!=='true'){
  panel.dataset.previewBlockerListener='true';
  globalThis.addEventListener?.(EVENT,()=>{
   if(panel.isConnected)paintStatus(panel);
  });
 }
}
export const showPreviewRestraintStatus=showPreviewBlocker;

export function showRestraintPolicySummary(panel,receipt){
 const p=receipt?.policySummary;
 if(!panel||!p)return;
 const status=document.createElement('p');
 status.dataset.restraintPolicySummary='true';
 status.setAttribute('role','status');
 const flags=p.precedence?Object.entries(p.precedence).map(([k,v])=>k+': '+v.primary+' → '+v.fallback).join(' | '):['type','gap','stiffness','friction','mappedCodes'].map(k=>k+': '+(p.flags?.[k]?'ON':'OFF')).join(' | ');
 const gaps=['REST','GUIDE','LINESTOP'].map(k=>k+' '+(p.savedGaps?.[k]??'not saved')).join(', ');
 const reasons=Object.entries(p.warningReasons||{}).map(([k,v])=>k+': '+v).join(' | ');
 status.textContent='Effective restraint precedence — '+flags+'. Saved gaps (mm): '+gaps+
   '. RESOLVED_BY_STEP7_POLICY: '+p.typeDecisionOccurrences+' type decisions / '+p.uniqueTypeDecisionMembers+
   ' distinct source members. Mapped-code decisions: '+(p.mappedCodeDecisionOccurrences||0)+'. '+(reasons?'Remaining review reasons: '+reasons+'. ':'')+
   'Config SHA-256: '+p.configSha256+'. Not engineering approval.';
 panel.append(status);
}
export function showIndependentRestraintStatus(panel,receipt){
 if(receipt?.status==='REVIEW_BLOCKED'||receipt?.status==='NOT_ASSESSED'||!receipt){
   const status=document.createElement('p');status.dataset.restraintReviewUnavailable='true';
   status.setAttribute('role','status');
   status.textContent=receipt?.status==='REVIEW_BLOCKED'
     ?'O1 restraint assessment blocked: '+receipt.code+' — '+receipt.message+'. Source trace is not engineering approval.'
     :'O1 restraint assessment not available for this selection. Source trace is not engineering approval.';
   panel.append(status);return;
 }
 paintStatus(panel,null,receipt);
 showRestraintPolicySummary(panel,receipt);
}
