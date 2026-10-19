/** Source-wide suggestion scan; drafts only, no GC-PW review writer. */
import {planXml229RigidWeightDrafts} from './xml229-p4-unqualified-drafts.mjs';
import {revealXml229PreparedWeightInput} from './xml229-p4-reveal-applied-weight.mjs';
const deny=(code,message)=>{const e=new Error(message||code);e.code=code;throw e;};
export async function applyXml229SourceWideSuggestionDrafts({
 session,drafts,minScorePercent,isCurrent,saveDrafts,showFirst,render,table,detail,say,
}={}){
 if(typeof session?.planQualifiedBlankFill!=='function'||!(drafts instanceof Map)||
    typeof isCurrent!=='function'||typeof saveDrafts!=='function'||
    typeof showFirst!=='function'||typeof render!=='function')
   deny('SUGGESTION_SOURCE_BOUND_WORKSPACE_REQUIRED');
 say('Preparing ≥'+minScorePercent+'% drafts across verified source...');
 const plan=await session.planQualifiedBlankFill({minScorePercent});
 if(!Number.isSafeInteger(plan?.qualified)||!Array.isArray(plan.qualifiedSuggestions)||
    plan.qualifiedSuggestions.length!==plan.qualified)
   deny('SUGGESTION_WORKER_PLAN_INCOMPLETE',
     'Worker qualified-count and source-proposal evidence do not match');
 const planned=await planXml229RigidWeightDrafts(session,{
  existingDrafts:drafts,minScorePercent,qualifiedSuggestions:plan.qualifiedSuggestions,
  isCurrent,
 });
 if(!isCurrent())deny('STALE_WEIGHT_AUTO_FILL_SOURCE');
 for(const [id,draft] of planned.drafts)
  if(!drafts.has(id))drafts.set(id,draft);
 saveDrafts();
 if(planned.firstPreparedIndex!==null)showFirst(planned.firstPreparedIndex);
 const visiblePopulated=await render();
 if(planned.counts.prepared>0&&!(visiblePopulated>0))
   deny('SUGGESTION_VISIBLE_INPUT_NOT_APPLIED',
     'No actual proposed kilograms were populated on the selected page');
 if(visiblePopulated>0&&!revealXml229PreparedWeightInput(table))
   deny('SUGGESTION_INPUT_OUTSIDE_VIEWPORT',
     'Applied kg could not be revealed horizontally');
 detail.hidden=true;detail.textContent='';
 const confirm=table.querySelector('[data-p4-bulk-confirm]');
 if(confirm){confirm.disabled=!plan.qualified;
  confirm.textContent='Apply all Match-1 ('+plan.qualified+')';}
 const c=planned.counts;
 say('Apply all suggestions ≥'+minScorePercent+'%: '+c.prepared+
   ' editable draft(s) prepared across the verified source. '+
   visiblePopulated+' actual kg input(s) populated on this page; first input revealed. '+
   c.workerQualified+' source-qualified candidate(s) reconciled ('+
   c.workerQualifiedPrepared+' newly filled, '+
   c.workerQualifiedAlreadyDrafted+' existing drafts kept, '+
   c.manualConflictsPreserved+' manual edit conflicts preserved); '+
   c.preparedUnqualified+' review-only drafts. '+
   c.withoutProposal+' no proposal, '+c.belowThreshold+
   ' below threshold. Applied Weight drafts are not accepted; governed CII remains HELD.');
 return {planned,visiblePopulated,reviewDecisionsAuthorized:false,nativeCiiReleaseAuthorized:false};
}
