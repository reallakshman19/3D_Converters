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

const sessionByBase=new WeakMap();
const sessionLeases=new WeakMap();
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
 selectedScopeId:raw?.selectedScopeId??null,
 requestedOwnerZoneScopeId:raw?.requestedOwnerZoneScopeId??null,
 datasetRefs:JSON.stringify(raw?.masterContext?.datasetRefs||{}),
 mappingRevisions:JSON.stringify(raw?.masterContext?.appliedMappingRevision||{}),
 rowCounts:JSON.stringify(raw?.masterContext?.rowCounts||{}),
});
export function compareXml229P4LiveSourceSnapshot(basis,current,{
 verifyFullSelection=()=>false,
}={}){
 if(!basis||!current)return false;
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
 const previous=sessionByBase.get(key);
 if(previous&&lease&&lease===sessionLeases.get(key)){
   try{await previous.readCompletion();return previous;}
   catch{/* stale/cancelled prior session must not be reused */}
 }
 if(previous){sessionByBase.delete(key);sessionLeases.delete(key);previous.cancel();}
 const session=await openXml229WorkerHeldOriginalWeightReview({...inputs,onProgress});
 if(inputs.isCurrent?.()!==true){session.cancel();err('STALE_INPUT',
   'Original source or master changed during Worker verification');}
 sessionByBase.set(key,session);
 if(lease)sessionLeases.set(key,lease);
 return session;
}
export function getXml229CurrentWorkerHeldReview(stateRef){
 const key=stateRef?.modeABaseRef||stateRef;
 return key&&sessionByBase.get(key)||null;
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
   const lines=page.rows.map((row,i)=>{
     const alternatives=(row.proposals||[]).map(p=>p.value+' kg').join(' / ');
     const singleDirect=(row.proposals||[]).length>0&&
       row.proposals.every(p=>p.qualified&&p.value===row.proposals[0].value);
     const accepted=row.finalKg??row.match1Kg??row.sourceKg??null;
     return `<tr data-p4-row="${i}" data-p4-occurrence="${esc(row.occurrenceId)}">
       <td>${esc(row.sourceId)}</td>
       <td>${esc(row.branchOccurrenceIndex)}/${esc(row.nodeOrdinal)}</td>
       <td>${esc(labelKg(row.sourceKg))}</td>
       <td>${esc(labelKg(row.match1Kg))}</td>
       <td>${esc(labelKg(row.finalKg))}</td>
       <td title="${esc(alternatives)}">
         <input data-p4-proposal type="number" min="0" step="any"
           value="${singleDirect&&!accepted?esc(row.proposals[0].value):''}"
           placeholder="${esc(row.proposedKg??'—')}"
           style="width:85px;background:#374151;color:#d1d5db;opacity:.85;border:1px dashed #94a3b8;">
         <small>Draft only</small></td>
       <td><select data-p4-candidate><option value="">Manual or select candidate</option>
         ${(row.proposals||[]).map(p=>`<option value="${esc(p.proposalId)}">
          #${esc(p.ranking)} ${esc(p.value)} kg ${p.qualified?'exact':'review'}</option>`).join('')}
         </select><input data-p4-reason placeholder="Engineering reason" style="width:145px;">
         <button data-p4-accept-match1 type="button">Accept Match-1</button>
         <button data-p4-accept-final type="button">Review Final</button>
       </td>
     </tr>`;
   }).join('');
   table.innerHTML=`<p>${page.totalCount} original physical components.
     Showing ${offset+1}–${offset+page.rows.length}; values from same verified GC-PW source session.
     Missing weights require explicit review, not zero-fill.</p>
     <div style="max-height:320px;overflow:auto;"><table style="font-size:12px">
     <thead><tr><th>Source</th><th>Original branch/node</th><th>XML kg</th>
     <th>Match-1 kg</th><th>Final kg</th><th>Proposed kg</th><th>Review</th></tr></thead>
     <tbody>${lines}</tbody></table></div>
     <button data-p4-prev ${offset===0?'disabled':''}>Previous</button>
     <button data-p4-next ${offset+25>=page.totalCount?'disabled':''}>Next</button>
     <p style="color:#fbbf24">Run remains separately blocked until independent source-bound
       Preview/Weight completion and reviewed Final output gates are verified.</p>`;
   root.__p4VisibleRows=page.rows;
 };
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
   const prev=event.target.closest?.('[data-p4-prev]');
   const next=event.target.closest?.('[data-p4-next]');
   const isMatch=event.target.closest?.('[data-p4-accept-match1]');
   const isFinal=event.target.closest?.('[data-p4-accept-final]');
   if(!prev&&!next&&!isMatch&&!isFinal)return;
   busy=true;
   try{
     if(prev||next){
       offset+=next?25:-25;await render();return;
     }
     const tr=event.target.closest('tr[data-p4-row]');
     const row=root.__p4VisibleRows?.[Number(tr?.dataset.p4Row)];
     if(!row||row.occurrenceId!==tr.dataset.p4Occurrence)
       err('STALE_PHYSICAL_ROW','Original physical source row changed');
     const draft=tr.querySelector('[data-p4-proposal]');
     const selection=tr.querySelector('[data-p4-candidate]');
     const reason=String(tr.querySelector('[data-p4-reason]').value||'').trim();
     let view,choice;
     if(isFinal){
       view=row.finalView;
       choice={action:'final-override',value:Number(draft.value),unit:'kg',reason};
     }else{
       view=row.match1View;
       choice=selection.value
         ?{action:'accept-proposal',proposalId:selection.value,reason}
         :{action:'enter-manual',value:Number(draft.value),unit:'kg',reason};
     }
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
 return {cancel:()=>{active?.cancel();if(key)sessionByBase.delete(key);}};
}
