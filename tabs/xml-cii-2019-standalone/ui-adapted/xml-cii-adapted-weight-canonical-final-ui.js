/** XML229 W3-B3: guarded canonical Final controls within consolidated review.
 * The only persistence port is existing GC-PW CAS-backed individual Final.
 * No legacy issue.key, node label, staged draft, or DOM weight is committed.
 */
import {readVerifiedSharedWeightReconciliation} from '../../../converters/xml-cii2019-core/weight-facts-shared-reconciliation.js';
import {renderVerifiedWeightReconciliationPanel} from './xml-cii-adapted-weight-shared-reconciliation-view.js';
import {openVerifiedIndividualWeightReviewDialog} from './xml-cii-adapted-weight-individual-dialog.js';

export function prepareVerifiedCanonicalFinalControls({
  verifiedSharedWeightSnapshot:snapshot,
  currentVerifiedWeightBasisId:basisId,
  verifiedWeightSourceId:sourceId=null,
  verifiedWeightSession:session=null,
  onVerifiedFinalDecision,
}={}){
  if(!snapshot)return null;
  if(basisId!==snapshot.basisId)
    throw new Error('Current verified Final basis is missing or stale');
  if(session){
    if(session.basis?.basisId!==basisId)
      throw new Error('Verified Final source session is stale');
    if(JSON.stringify(readVerifiedSharedWeightReconciliation(session))!==JSON.stringify(snapshot))
      throw new Error('Verified Final snapshot changed; reopen source review');
  }
  let active=snapshot,offset=0,busy=false;
  const pageSize=100;
  const render=()=>renderVerifiedWeightReconciliationPanel(active,{
    stage:'Rigidmatch2',sourceId,expectedBasisId:basisId,
    visibleLimit:pageSize,offset,enableFinalIndividualReview:!!session,
  });
  const current=()=>{
    if(!session)throw new Error('Canonical Final decision requires completed GC-PW facts');
    const latest=readVerifiedSharedWeightReconciliation(session);
    if(JSON.stringify(latest)!==JSON.stringify(active))
      throw new Error('Physical source facts or accepted decisions changed; reopen review');
    return latest;
  };
  const attach=overlay=>{
    const status=overlay.querySelector('[data-mode-a-rigid-status]');
    const cancel=overlay.querySelector('[data-mode-a-rigid-cancel]');
    const notify=(message,bad=false)=>{
      if(status){status.textContent=message;status.style.color=bad?'#ef4444':'#10b981';}
    };
    const refresh=()=>{
      const node=overlay.querySelector('.xml-cii-gc-pw-reconciliation');
      if(node)node.outerHTML=render();
    };
    overlay.addEventListener('click',async event=>{
      const nav=event.target?.closest?.('[data-canonical-previous],[data-canonical-next]');
      if(nav){
        if(busy||nav.disabled)return;
        offset+=nav.hasAttribute('data-canonical-next')?pageSize:-pageSize;
        refresh();
        return;
      }
      const button=event.target?.closest?.('[data-canonical-final-review]');
      if(!button||!session||busy)return;
      busy=true;button.disabled=true;
      if(cancel)cancel.disabled=true;
      try{
        const latest=current();
        const chosen=latest.rows.find(x=>x.sourceId===button.dataset.sourceId
          &&x.occurrenceId===button.dataset.occurrenceId);
        if(!chosen)throw new Error('Final choice refers to an unselected original physical occurrence');
        const answer=await openVerifiedIndividualWeightReviewDialog({
          session,sourceId:chosen.sourceId,occurrenceId:chosen.occurrenceId,stage:'Rigidmatch2',
        });
        if(!answer.cancelled){
          active=readVerifiedSharedWeightReconciliation(session);
          notify('Canonical Final Match-2 decision frozen for the original physical component. CII Run is still separately gated; cancelling the batch does not undo this explicit decision.');
          onVerifiedFinalDecision?.(answer);
        }
      }catch(error){
        notify('Canonical Final review blocked: '+String(error?.message||error),true);
      }finally{
        busy=false;
        if(cancel)cancel.disabled=false;
        if(overlay.isConnected)refresh();
      }
    });
  };
  return Object.freeze({html:render(),attach,hasSession:!!session});
}
