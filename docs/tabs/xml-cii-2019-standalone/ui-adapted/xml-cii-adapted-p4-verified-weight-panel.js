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
import {xmlCiiBranchScopeFromState}
 from '../xml-cii-branch-scope.js';

const sessionByBase=new WeakMap();
const err=(code,detail)=>{const e=new Error(detail||code);e.code=code;throw e;};
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const labelKg=n=>typeof n==='number'&&Number.isFinite(n)&&n>0?n+' kg':'—';
const snapshotOf=(raw,sourceId)=>({
 sourceId,sourceText:raw?.sourceText,sourceFile:raw?.sourceFile,
 supportConfigJson:raw?.supportConfigJson,
 scope:JSON.stringify(raw?.branchSelection||{}),
 jsonTraceScopeId:raw?.jsonTraceScopeId,
 datasetRefs:JSON.stringify(raw?.masterContext?.datasetRefs||{}),
 mappingRevisions:JSON.stringify(raw?.masterContext?.appliedMappingRevision||{}),
 dependencyRevisions:JSON.stringify(raw?.dependencyRevisions||{}),
});
const unchanged=(a,b)=>Object.keys(a).every(k=>Object.is(a[k],b[k]));

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
 if(!sourceId)err('ORIGINAL_SOURCE_ID_REQUIRED','Select one original XML source');
 const selection=xmlCiiBranchScopeFromState({
   sourceKind:'xml',sourceText:raw.sourceText,
   branchSelection:raw.branchSelection||{},
 });
 if(!selection?.applicable||selection.blocked||
    selection.selectedBranchOccurrences?.length!==selection.sourceBranchOccurrences?.length)
   err('PARTIAL_XML_SCOPE_HELD',
     'P4 requires full original XML branch scope; partial 28-vs-41 selection cannot alias ALL');
 const source=resolveXml229CurrentPreviewBlob(baseRef,raw.xml229StagedSourceReceipt);
 const before=snapshotOf(raw,sourceId);
 const context=view.masterContext||raw.masterContext||{};
 const config=await materializeXmlCiiDatasetBackedConfig(
   xmlCiiEnrichedConfigFromState(view),{...view,masterContext:context});
 const definitions=[
  ['lineList','linelist','masterRows'],
  ['pipingClass','pipingClass','masterRows'],
  ['materialMap','material','mapRows'],
  ['weight','weight','masterRows'],
 ];
 const masters={};
 for(const [kind,section,property] of definitions){
   const ref=context.datasetRefs?.[kind];
   const rows=config?.[section]?.[property];
   if(!ref?.datasetId||!Array.isArray(rows)||!rows.length||
      rows.length!==Number(ref.rowCount))
     err('FOUR_MASTER_CUSTODY_INCOMPLETE',
       'Expected source-attested '+kind+' master rows; reimport current original master');
   masters[kind]={
     datasetId:ref.datasetId,
     revision:context.appliedMappingRevision?.[kind]??ref.datasetRevision??'1',
     rows,mapping:config[section]?.fieldMap||ref.fieldMap||null,
   };
 }
 const isCurrent=()=>{
   if(!source.isCurrent())return false;
   const current=baseRef.current;
   if(!unchanged(before,snapshotOf(current,sourceId)))return false;
   const c=current?.masterContext;
   return c?.datasetRefs===context.datasetRefs||
     JSON.stringify(c?.datasetRefs||{})===before.datasetRefs;
 };
 if(!isCurrent())
   err('STALE_ORIGINAL_MASTER_SOURCE','Original XML, stage, master or Owner selection changed during hydration');
 return {xmlText:raw.sourceText,sourceId,masters,
   selection:[{sourceId,selectionRef:'all'}],
   config,overrides:config.overrides||{},
   originalStagedBlob:source.blob,
   originalStagedSourceReceipt:source.receipt,
   requestId:'xml229-p4-'+source.generationId+'-'+sourceId,
   isCurrent};
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
 const previous=sessionByBase.get(key);
 if(previous){sessionByBase.delete(key);previous.cancel();}
 const inputs=await resolveInputs();
 const session=await openXml229WorkerHeldOriginalWeightReview({...inputs,onProgress});
 sessionByBase.set(key,session);
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
}={}){
 if(!container)throw new Error('Weight review container required');
 container.innerHTML=`<section data-p4-weight-root
  style="border:1px solid #64748b;border-radius:8px;padding:12px;margin:12px 0;">
  <strong>Original-source Weight review (GC-PW)</strong>
  <p style="font-size:12px;color:#94a3b8;">Independent original XML census + full staged JSON Blob verification in separate Workers.
  Proposed weights are editable evidence only. Match-1 and Final are distinct explicit
  decisions. Native CII Run is NOT authorized by this panel.</p>
  <button type="button" data-p4-weight-build>Build verified original-source Weight review</button>
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
 build.addEventListener('click',async()=>{
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
 if(active)void render().then(()=>say('Existing verified Preview facts and Weight review loaded.'))
   .catch(error=>say('Existing source review is stale: '+String(error?.message||error),true));
 return {cancel:()=>{active?.cancel();if(key)sessionByBase.delete(key);}};
}
