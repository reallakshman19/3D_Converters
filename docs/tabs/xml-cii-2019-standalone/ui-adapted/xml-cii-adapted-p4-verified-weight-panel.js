/**
 * XML229 P4-D opt-in, source-attested one-flow Weight Match-1 / Final review.
 * Does not replace legacy Weight(kg), native CII Run, or persist issue.key
 * weights. Large original staged JSON remains INSIDE its GC-PW Worker.
 */
import {openXml229WorkerHeldOriginalWeightReview}
 from '../integration/xml229-original-blob-gcpw-client.mjs';
import {resolveXml229CurrentPreviewBlob}
 from './xml-cii-adapted-lfj-o1-intake.js';
import {xmlCiiEnrichedConfigFromState}
 from './xml-cii-adapted-state.js';
import {materializeXmlCiiDatasetBackedConfig}
 from '../xml-cii-dataset-backed-config.js';
import {resolveXml229FourMasterCustody} from '../integration/xml229-four-master-custody.mjs';
import {digestCanonical,canonicalJson} from '../../../contracts/gc-pw-v1/contract.mjs';
import {xmlCiiBranchScopeFromState,xmlCiiSourceDigest}
 from '../xml-cii-branch-scope.js';
import {renderXml229WeightReviewPage,choiceForXml229WeightRow}
 from './xml229-p4-weight-review-presentation.mjs';
import {
 getXml229VerifiedEngineeringEntry,beginXml229VerifiedEngineeringBuild,
 publishXml229VerifiedEngineeringBuild,revokeXml229VerifiedEngineeringBasis,
} from '../integration/xml229-engineering-basis-authority.mjs';
const err=(code,detail)=>{const e=new Error(detail||code);e.code=code;throw e;};
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const labelKg=n=>typeof n==='number'&&Number.isFinite(n)&&n>0?n+' kg':'—';
/**
 * The Worker InputBasis is source bytes + committed original Blob generation +
 * effective config/master revisions + physical selection. UI-only revision
 * bookkeeping and a new File wrapper around the same XML are NOT changes to
 * the verified source/master basis. These were false-staling the live Weight
 * Review after ordinary phase navigation and background UI hydration.
 */
const ownerScope=value=>{
 const s=String(value??'').trim();
 return !s||s==='ALL'||s==='__ALL__'?'__ALL__':s;
};
const configEquivalent=(a,b)=>{
 if(a===b)return true;
 try{return canonicalJson(JSON.parse(a||'{}'))===canonicalJson(JSON.parse(b||'{}'));}
 catch{return false;}
};
export const captureXml229P4LiveSourceSnapshot=(raw,sourceId)=>({
 sourceId,
 sourceText:raw?.sourceText,
 supportConfigJson:raw?.supportConfigJson,
 scope:JSON.stringify(raw?.branchSelection||{}),
 jsonTraceScopeId:ownerScope(raw?.jsonTraceScopeId),
 selectedScopeId:ownerScope(raw?.selectedScopeId),
 requestedOwnerZoneScopeId:ownerScope(raw?.requestedOwnerZoneScopeId),
 datasetRefs:JSON.stringify(raw?.masterContext?.datasetRefs||{}),
 mappingRevisions:JSON.stringify(raw?.masterContext?.appliedMappingRevision||{}),
 rowCounts:JSON.stringify(raw?.masterContext?.rowCounts||{}),
});
export function compareXml229P4LiveSourceSnapshot(basis,current,{
 verifyFullSelection=()=>false,
}={}){
 if(!basis||!current)return false;
 const activeId=String(current?.modeASourceId||current?.sourceBatch?.activeSourceId||basis.sourceId);
 if(activeId!==basis.sourceId)return false;
 const latest=captureXml229P4LiveSourceSnapshot(current,basis.sourceId);
 // A normalized/expanded "all branches" representation has the same
 // physical identity. A genuine partial/stale selection still fails closed.
 if(basis.scope!==latest.scope){
   try{if(!verifyFullSelection(current))return false;}
   catch{return false;}
 }
 for(const key of Object.keys(basis)){
   if(key==='scope')continue;
   if(key==='supportConfigJson'){
     if(!configEquivalent(basis.supportConfigJson,latest.supportConfigJson))return false;
   }else if(!Object.is(basis[key],latest[key]))return false;
 }
 return true;
}

/** Engineering physical scope cannot silently normalize a stale selection to ALL.
 * A genuine 28/28 original-source selection passes; 28/41 and stale data HOLD.
 */
export function assertXml229P4OriginalFullSelection({
 sourceText,branchSelection={},
}={}){
 if(typeof sourceText!=='string'||!sourceText.trim())
  err('ORIGINAL_XML_REQUIRED','Original XML is required for physical-source custody');
 const ids=branchSelection?.selectedBranchOccurrenceIds;
 const names=branchSelection?.selectedBranchNames;
 const explicitlySelected=Array.isArray(ids)||Array.isArray(names);
 const digest=xmlCiiSourceDigest(sourceText);
 if(explicitlySelected&&branchSelection?.sourceDigest!==digest)
  err('STALE_OR_UNBOUND_SELECTION',
   'Explicit branch selection is not bound to current original XML. Reselect before physical Weight review; no ALL fallback');
 const scope=xmlCiiBranchScopeFromState({
  sourceKind:'xml',sourceText,branchSelection,
 });
 if(!scope.applicable||scope.blocked||
    !Array.isArray(scope.sourceBranchOccurrences)||!scope.sourceBranchOccurrences.length||
    scope.selectedBranchOccurrences?.length!==scope.sourceBranchOccurrences.length||
    scope.excludedBranchOccurrences?.length!==0)
  err('PARTIAL_XML_SCOPE_HELD',
   'Selected '+(scope.selectedBranchOccurrences?.length??0)+' of '+
   (scope.sourceBranchOccurrences?.length??0)+
   ' original branch occurrences. A verified subset census is required; no ALL fallback');
 if(Array.isArray(ids)&&(new Set(ids).size!==ids.length||
    ids.length!==scope.sourceBranchOccurrences.length))
  err('ORIGINAL_BRANCH_OCCURRENCE_SET_DRIFT',
   'Duplicate or missing original selected branch occurrence ID');
 return scope;
}

/** Resolve a genuine existing O1 File Blob and all four current masters.
 * One complete original Mode A branch selection only; refuse uncertain joins.
 */
export async function resolveXml229P4ProductionInputs(stateRef){
 const baseRef=stateRef?.modeABaseRef||stateRef,raw=baseRef?.current;
 const view=stateRef?.current||raw;
 if(!raw?.sourceText||!raw?.xml229StagedSourceReceipt)
   err('ORIGINAL_O1_BLOB_REQUIRED','Load original XML + O1 indexed JSON first');
 const sourceId=String(view?.modeASourceId||raw?.modeASourceId||
   raw?.sourceBatch?.activeSourceId||'');
 if(raw.sourceBatch?.activeSourceId&&view?.modeASourceId&&
    raw.sourceBatch.activeSourceId!==view.modeASourceId)
   err('INACTIVE_MODE_A_SOURCE_NOT_ATTESTED',
     'Switch to this XML source in Source & Master before building its original-JSON engineering Preview; never borrow the active source Blob');
 if(!sourceId)err('ORIGINAL_SOURCE_ID_REQUIRED','Select one original XML source');
 const selection=assertXml229P4OriginalFullSelection({
  sourceText:raw.sourceText,branchSelection:raw.branchSelection||{},
 });
 const source=resolveXml229CurrentPreviewBlob(baseRef,raw.xml229StagedSourceReceipt);
 const before=captureXml229P4LiveSourceSnapshot(raw,sourceId);
 const context=view.masterContext||raw.masterContext||{};
 const config=await materializeXmlCiiDatasetBackedConfig(
   xmlCiiEnrichedConfigFromState(view),{...view,masterContext:context});
 const {masters,attestations}=await resolveXml229FourMasterCustody(config,context,{
   restoreFailures:raw.masterRestoreFailures||view.masterRestoreFailures||{},
 });
 const isCurrent=()=>{
   if(!source.isCurrent())return false;
   const current=baseRef.current;
   return compareXml229P4LiveSourceSnapshot(before,current,{
     verifyFullSelection:state=>{
       try{
         assertXml229P4OriginalFullSelection({
           sourceText:state.sourceText,branchSelection:state.branchSelection||{},
         });
         return true;
       }catch{return false;}
     },
   });
 };
 if(!isCurrent())
   err('STALE_ORIGINAL_MASTER_SOURCE','Original XML, stage, master or Owner selection changed during hydration');
 const inputLease=await digestCanonical({sourceId,xmlText:raw.sourceText,
   receiptSha:source.receipt.sha256,generationId:source.receipt.generationId,
   selectionRef:'all',config,attestations});
 if(!isCurrent())err('STALE_ORIGINAL_MASTER_SOURCE',
   'Original source/master changed during full content attestation');
 return {xmlText:raw.sourceText,sourceId,masters,
   selection:[{sourceId,selectionRef:'all'}],
   config,overrides:config.overrides||{},
   originalStagedBlob:source.blob,
   originalStagedSourceReceipt:source.receipt,
   requestId:'xml229-p4-'+source.generationId+'-'+sourceId,
   inputLease,isCurrent};
}
/** Reuse exactly one source-attested original Worker review across Preview
 * and Weight. Rebuild revokes the previous InputBasis and its decisions.
 */
export async function openXml229P4VerifiedSession(stateRef,{
  resolveInputs=()=>resolveXml229P4ProductionInputs(stateRef),
  onProgress=()=>{},
}={}){
 const key=stateRef?.modeABaseRef||stateRef;
 if(!key)err('STATE_REF_REQUIRED','Stable source reference required');
 const inputs=await resolveInputs();
 const lease=inputs.inputLease||null;
 const previous=getXml229VerifiedEngineeringEntry(key);
 if(previous&&lease&&lease===previous.lease){
   try{await previous.session.readCompletion();return previous.session;}
   catch{/* genuinely stale/cancelled prior session cannot be reused */}
 }
 // One source-bound authority per stable baseRef, independent of DOM
 // ownership. A newer build invalidates an in-flight predecessor (CAS).
 const ticket=beginXml229VerifiedEngineeringBuild(key);
 const session=await openXml229WorkerHeldOriginalWeightReview({...inputs,onProgress});
 if(inputs.isCurrent?.()!==true){session.cancel();err('STALE_INPUT',
   'Original source or master changed during Worker verification');}
 const verifiedLease=lease||session.receipt?.basisId;
 if(!publishXml229VerifiedEngineeringBuild(ticket,{lease:verifiedLease,session}))
   err('ENGINEERING_BASIS_SUPERSEDED',
     'A newer verified Preview replaced this engineering source review');
 return session;
}
export function getXml229CurrentWorkerHeldReview(stateRef){
 return getXml229VerifiedEngineeringEntry(stateRef)?.session||null;
}
/** The opt-in panel remains usable even if legacy Weight Match/UI is present.
 * A supplied resolveInputs in a Chromium fixture does not bypass Worker
 * full source+master and original-BLOB attestation checks.
 */
export function installXml229WorkerHeldWeightPanel(container,stateRef,{
 resolveInputs=()=>resolveXml229P4ProductionInputs(stateRef),
 existingWorkflow=false,
}={}){
 if(!container)throw new Error('Weight review container required');
 container.innerHTML=`<section data-p4-weight-root
  style="border:1px solid #64748b;border-radius:8px;padding:12px;margin:12px 0;">
  <strong>${existingWorkflow?'Weight Match — verified original physical facts':'Original-source Weight review (GC-PW)'}</strong>
  <p style="font-size:12px;color:#94a3b8;">Independent original XML census + full staged JSON Blob verification in separate Workers.
  Proposed weights are editable evidence only. Match-1 and Final are distinct explicit
  decisions. Native CII Run is NOT authorized by this panel.</p>
  ${existingWorkflow?'':'<button type="button" data-p4-weight-build>Build verified original-source Weight review</button>'}
  <span role="status" data-p4-weight-status style="margin-left:8px;"></span>
  <div data-p4-weight-table></div></section>`;
 const root=container.querySelector('[data-p4-weight-root]');
 const status=root.querySelector('[data-p4-weight-status]');
 const table=root.querySelector('[data-p4-weight-table]');
 const build=root.querySelector('[data-p4-weight-build]');
 const key=stateRef?.modeABaseRef||stateRef;
 let active=getXml229CurrentWorkerHeldReview(stateRef),offset=0,busy=false;
 const say=(message,bad=false)=>{
   status.textContent=message;status.style.color=bad?'#f87171':'#10b981';
 };
 const render=async()=>{
   if(!active)return;
   const page=await active.readPage({offset,limit:25});
   table.innerHTML=renderXml229WeightReviewPage(page,offset);
   root.__p4VisibleRows=page.rows;
 };
 const applyPageFilter=()=>{
   const term=String(root.querySelector('[data-p4-filter]')?.value||'').toLowerCase().trim();
   const stageFilter=String(root.querySelector('[data-p4-filter-stage]')?.value||'all').toLowerCase().trim();
   const unresolved=root.querySelector('[data-p4-filter-unresolved]')?.checked===true||stageFilter==='unresolved';
   let visible=0;
   for(const tr of table.querySelectorAll('tr[data-p4-row]')){
     const row=root.__p4VisibleRows?.[Number(tr.dataset.p4Row)];
     const searchable=[
       row?.sourceId,row?.occurrenceId,row?.branchOccurrenceIndex,row?.nodeOrdinal,
       row?.branchName,row?.nodeNumber,row?.componentType,row?.componentRefNo,
       row?.componentRefEndpoint,row?.dtxr,row?.rating,row?.lengthMm,row?.boreMm,
     ].map(x=>String(x||'')).join(' ').toLowerCase();
     const stageMatch=stageFilter==='all'||tr.dataset.p4Stage===stageFilter;
     const match=(!term||searchable.includes(term))&&
       (!unresolved||tr.dataset.p4Stage==='unresolved')&&stageMatch;
     tr.hidden=!match;
     if(match)visible++;
   }
   const label=root.querySelector('[data-p4-filter-count]');
   if(label)label.textContent=visible+' matching on this Worker page';
 };
 root.addEventListener('input',event=>{
   if(event.target.closest?.('[data-p4-filter]'))applyPageFilter();
 });
 root.addEventListener('change',event=>{
   if(event.target.closest?.('[data-p4-filter-unresolved]')||event.target.closest?.('[data-p4-filter-stage]'))applyPageFilter();
 });
 build?.addEventListener('click',async()=>{
   if(busy)return;busy=true;build.disabled=true;
   const prev=active;
   try{
     prev?.cancel();active=null;
     say('Checking original source/master custody and starting isolated Workers…');
     active=await openXml229P4VerifiedSession(stateRef,{
       resolveInputs,onProgress:stage=>say('GC-PW Worker: '+stage),
     });
     offset=0;await render();
     say('Verified original physical facts ready; weights NOT auto-accepted.');
   }catch(error){
     say('Weight verification held: '+String(error?.message||error)+
       (error?.code?' ['+error.code+']':''),true);
   }finally{busy=false;build.disabled=false;}
 });
 root.addEventListener('click',async event=>{
   if(busy||!active)return;
   const isBulk=event.target.closest?.('[data-p4-bulk-match1]');
   const prev=event.target.closest?.('[data-p4-prev]');
   const next=event.target.closest?.('[data-p4-next]');
   const candidateChip=event.target.closest?.('[data-p4-pick]');
   const isMatch=event.target.closest?.('[data-p4-accept-match1]');
   const isFinal=event.target.closest?.('[data-p4-accept-final]');
   if(!isBulk&&!prev&&!next&&!candidateChip&&!isMatch&&!isFinal)return;
   busy=true;
   try{
     if(isBulk){
       say('Applying audited bulk Match-1 review for verified qualified candidates…');
       const res=await active.bulkReviewMatch1({
         reason:'Bulk accepted verified qualified exact suggestions',
       });
       await render();
       say(`Bulk accepted ${res.acceptedCount} qualified candidate(s) as Match-1. Final Match-2 remains an explicit individual review.`);
       return;
     }
     if(prev||next){
       offset+=next?25:-25;await render();return;
     }
     const tr=event.target.closest('tr[data-p4-row]');
     const row=root.__p4VisibleRows?.[Number(tr?.dataset.p4Row)];
     if(!row||row.occurrenceId!==tr.dataset.p4Occurrence)
       err('STALE_PHYSICAL_ROW','Original physical source row changed');
     const draft=tr.querySelector('[data-p4-proposal]');
     const selection=tr.querySelector('[data-p4-candidate]');
     if(candidateChip){
       const proposalId=candidateChip.getAttribute('data-p4-pick')||'';
       const candidate=(row.proposals||[]).find(p=>p.proposalId===proposalId);
       if(!candidate)err('STALE_PHYSICAL_PROPOSAL','Candidate no longer belongs to this occurrence');
       selection.value=proposalId;
       draft.value=String(candidate.value);
       say('Source candidate selected as DRAFT only; explicit engineering acceptance is required.');
       return;
     }
     const reason=String(tr.querySelector('[data-p4-reason]').value||'').trim();
     const {view,choice}=choiceForXml229WeightRow(row,{
       stage:isFinal?'final':'match1',proposalId:selection.value,
       value:draft.value,reason,
     });
     await active.review({view,choice});
     await render();
     say(isFinal?'Final Match-2 explicitly accepted for original physical source':
       'Match-1 explicitly accepted; Final remains a separate review.');
   }catch(error){
     say('Review not accepted: '+String(error?.message||error)+
       (error?.code?' ['+error.code+']':''),true);
   }finally{busy=false;}
 });
 if(existingWorkflow&&!active)
   say('Build 4 Preview using the existing Build Preview button before reviewing weights. No separate Weight Build is required.',true);
 if(active)void render().then(()=>say('Existing verified Preview facts and Weight review loaded.'))
   .catch(error=>say('Existing source review is stale: '+String(error?.message||error),true));
 // Removing the rendered panel is not authority to destroy its Worker.
 // Explicit cancellation/rebuild remains a deliberate ownership transition.
 return {dispose:()=>{},cancel:()=>revokeXml229VerifiedEngineeringBasis(key,{expectedSession:active})};
}
