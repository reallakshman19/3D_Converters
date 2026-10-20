/**
 * One-step Owner-directed Applied Weight acceptance.
 *
 * Selection is the Owner's engineering disposition, not an assertion that
 * a suggested master kg was independently measured. The verified original
 * Worker rechecks the physical, source basis, proposal and Final revision
 * via its existing CAS decision service. No separate Match-1/Final UI.
 * This does not attest that native CII consumed the selected weight.
 */
const deny=(code,message=code)=>{const e=new Error(message);e.code=code;throw e;};
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
export async function commitXml229SelectedAppliedWeight({
 session,row,value,proposalId='',origin='click',isCurrent=()=>true,
}={}){
 if(typeof session?.readIndividual!=='function'||typeof session?.review!=='function'||
    !row||typeof row.occurrenceId!=='string'||!row.occurrenceId||
    !['prefill','click','manual'].includes(origin)||typeof isCurrent!=='function')
  deny('APPLIED_WEIGHT_SOURCE_SESSION_REQUIRED');
 if(!positive(value))deny('APPLIED_WEIGHT_POSITIVE_KG_REQUIRED');
 if(!isCurrent())deny('APPLIED_WEIGHT_SOURCE_STALE');
 // The same current Worker owns BOTH the visual suggestion and the
 // authoritative, revision-bound Final read. No legacy cache may attest.
 const view=await session.readIndividual({
  occurrenceId:row.occurrenceId,stage:'Rigidmatch2',
 });
 if(!isCurrent()||view?.basisId!==session.receipt?.basisId||
    view.occurrenceId!==row.occurrenceId||
    view.stage!=='Rigidmatch2'||view.sourceId!==row.sourceId)
  deny('APPLIED_WEIGHT_SOURCE_DRIFT');
 let proposal=null;
 if(proposalId){
  proposal=view.proposals?.find(p=>p.proposalId===proposalId);
  if(!proposal||!positive(proposal.value)||proposal.value!==value||
     proposal.unit!=='kg')
   deny('APPLIED_WEIGHT_SOURCE_PROPOSAL_DRIFT');
 }
 if(view.stageDecision?.state==='accepted'&&view.stageDecision.value===value)
  return {accepted:true,unchanged:true,value,occurrenceId:row.occurrenceId};
 if(origin==='prefill'&&view.stageDecision)
  deny('APPLIED_WEIGHT_EXISTING_DISPOSITION','Automatic fill must not override a prior engineering decision');
 // This reason is audit data: the Owner's stated authority is the act of
 // selection. A 100% scorer is not a physical measurement or CII witness.
 const reason='Owner-designated Applied Weight selection ('+origin+
  '); '+(proposal
   ?'proposal='+proposalId+'; sourceQualified='+String(proposal.qualified===true)
   :'manual positive kg')+
  '; exact verified InputBasis; no independent native CII consumption asserted';
 const result=await session.review({view,choice:{
  action:'final-override',value,unit:'kg',reason,
 }});
 if(!isCurrent()||!result?.decisionRevision)
  deny('APPLIED_WEIGHT_FINAL_COMMIT_UNATTESTED');
 return {accepted:true,unchanged:false,value,occurrenceId:row.occurrenceId,
  decisionRevision:result.decisionRevision};
}
