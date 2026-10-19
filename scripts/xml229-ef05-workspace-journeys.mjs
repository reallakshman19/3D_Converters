import assert from 'node:assert/strict';
import {makeXml229PublicBc4LineListRevision} from './xml229-ef05-line-list-revision.mjs';

export async function installXml229WorkspaceRegistryWitness(page){
  // Test-only capture of the actual source-bound Worker registry publication.
  await page.addInitScript(()=>{
    const nativeSet=WeakMap.prototype.set;
    WeakMap.prototype.set=function(key,value){
      try{
        if(value?.lease&&value.session?.receipt?.basisId&&
           value.session?.receipt?.sourceGenerationId)
          window.__xml229WorkspaceLiveReview={session:value.session,lease:value.lease};
      }catch{}
      return nativeSet.call(this,key,value);
    };
  });
}

export async function verifyXml229SameBasisJourney({page,waitWeightIdle,pageCount,manualId,manualKg,record}){
 // T-WORKSPACE-01: real Worker and ordinary UI, not a mock.
 // Capture every canonical occurrence's actual editable input after Apply,
 // Skip and a manual conflict. This fixture is public; no IDs are logged.
 await page.locator('[data-p4-skip-weight]').click();
 await waitWeightIdle();
 assert.match(await page.locator('[data-p4-weight-status]').textContent(),/Skip Weight:/);
 const collectEditable=async()=>{
   await page.locator('[data-p4-scope="blank-rigid"]').click();
   await waitWeightIdle();
   const result=new Map();
   for(let index=0;index<pageCount;index++){
     const actual=await page.evaluate(()=>[...document.querySelectorAll('tr[data-p4-row]')]
       .map(tr=>({id:tr.dataset.p4Occurrence,
         value:tr.querySelector('[data-p4-applied-weight]')?.value??null})));
     for(const r of actual){assert(!result.has(r.id));result.set(r.id,r.value);}
     if(index+1===pageCount)break;
     const previous=await page.locator('tr[data-p4-row]').first().getAttribute('data-p4-occurrence');
     await page.locator('[data-p4-next]').click();await waitWeightIdle();
     await page.waitForFunction(old=>document.querySelector('tr[data-p4-row]')?.dataset.p4Occurrence!==old,
       previous,{timeout:90000});
   }
   return result;
 };
 const beforeNav=await collectEditable();
 assert.equal(beforeNav.get(manualId),manualKg);
 const skipIds=[...beforeNav].filter(([,kg])=>kg==='0').map(([id])=>id);
 assert(skipIds.length>0,'public fixture did not exercise Skip');
 const proposedIds=[...beforeNav].filter(([id,kg])=>
   kg!==''&&kg!==null&&kg!=='0'&&id!==manualId).map(([id])=>id);
 assert(proposedIds.length>0,'public fixture did not exercise suggestions');
 await page.locator('[data-p4-scope="all"]').click();await waitWeightIdle();
 const samePanel=await collectEditable();
 assert.deepEqual([...samePanel],[...beforeNav],
   'Same-panel scope filter/pagination changed canonical editable kg');
 const beforeWorker=await page.evaluate(async()=>{
   const witness=window.__xml229WorkspaceLiveReview;
   if(!witness?.session)throw Error('Current verified Worker registry witness missing');
   window.__xml229WorkspaceFirstSession=witness.session;
   const proof=await witness.session.readCompletion();
   return {basisId:witness.session.receipt.basisId,
     sourceGenerationId:witness.session.receipt.sourceGenerationId,
     lease:witness.lease,stageRevisions:proof.stageRevisions,counts:proof.counts};
 });
 assert.equal(beforeWorker.basisId,record.stages.preview.basisId);
 const beforeRevisions=await page.evaluate(()=>{
   const row=document.querySelector('[data-p4-weight-root]')?.__p4VisibleRows?.[0];
   return {match1:row?.match1View?.match1Revision??null,
     final:row?.finalView?.finalRevision??null};
 });
 await page.locator('[data-phase="preview"]').click();
 await page.locator('[data-phase="run"]').click();
 await page.locator('[data-action="xml229-output-participation"]').waitFor();
 assert.equal(await page.locator('[data-action="xml229-output-participation"]').inputValue(),'governed');
 assert.equal(await page.locator('[data-action="run"]').isDisabled(),true);
 await page.locator('[data-phase="weight-match"]').click();
 await page.locator('[data-p4-weight-status]').waitFor();
 const afterNav=await collectEditable();
 const afterWorker=await page.evaluate(async()=>{
   const witness=window.__xml229WorkspaceLiveReview;
   if(!witness?.session)throw Error('Returned verified Worker registry witness missing');
   const proof=await witness.session.readCompletion();
   return {basisId:witness.session.receipt.basisId,
     sourceGenerationId:witness.session.receipt.sourceGenerationId,
     lease:witness.lease,stageRevisions:proof.stageRevisions,counts:proof.counts,
     sameSession:witness.session===window.__xml229WorkspaceFirstSession};
 });
 assert.equal(afterWorker.sameSession,true,'ordinary navigation replaced the Worker');
 assert.equal(afterWorker.basisId,beforeWorker.basisId,'InputBasis changed during navigation');
 assert.equal(afterWorker.sourceGenerationId,beforeWorker.sourceGenerationId,
   'source generation changed during navigation');
 assert.equal(afterWorker.lease,beforeWorker.lease,'Input lease changed during navigation');
 assert.deepEqual(afterWorker.stageRevisions,beforeWorker.stageRevisions,'review stage CAS changed');
 assert.deepEqual(afterWorker.counts,beforeWorker.counts,'accepted review category counts changed');
 const afterRevisions=await page.evaluate(()=>{
   const row=document.querySelector('[data-p4-weight-root]')?.__p4VisibleRows?.[0];
   return {match1:row?.match1View?.match1Revision??null,
     final:row?.finalView?.finalRevision??null};
 });
 assert.deepEqual(afterRevisions,beforeRevisions,'review CAS revisions changed on navigation');
 const lost=[...beforeNav].filter(([id,kg])=>afterNav.get(id)!==kg);
 record.stages.workspaceNavigation={eligibleOccurrences:beforeNav.size,
   filledBefore:[...beforeNav.values()].filter(x=>x!=='').length,
   skippedBefore:skipIds.length,suggestionsBefore:proposedIds.length,
   manualBefore:manualKg,samePanelPreserved:true,changedAfterRemount:lost.length,
   appliedAfter:afterNav.get(manualId)||'',reviewRevisionsUnchanged:true,
   basisUnchanged:true,generationUnchanged:true,leaseUnchanged:true,
   workerSessionSame:true,reviewCountsUnchanged:true,governedStillHeld:true};
 assert.equal(lost.length,0,'Applied Weight drafts lost across phase navigation: '+lost.length+' canonical occurrences');
 record.passes.push('same-basis Weight->Preview->Run->Weight retains editable manual/suggestion/Skip values');


 return {beforeWorker,beforeNav,collectEditable};
}

async function captureXml229ChangedBasisDiagnostic(page,at,oldBasis){
  return page.evaluate(({at,oldBasis})=>{
    const host=document.querySelector('#mc-preview-table-host');
    const root=document.querySelector('[data-p4-weight-root]');
    const witness=window.__xml229WorkspaceLiveReview;
    const status=root?.querySelector('[data-p4-weight-status]')?.textContent||'';
    return {at,previewHasNewBasis:Boolean(host?.dataset.mcPreviewBasisId&&
       host.dataset.mcPreviewBasisId!==oldBasis),
      previewVerified:host?.dataset.mcPreviewJsonSource==='P4_ENGINEERING_VERIFIED',
      previewBuildDisabled:host?.querySelector('[data-mc-preview-build]')?.disabled??null,
      previewStatus:(host?.textContent||'').slice(0,450),
      panelPresent:Boolean(root),panelBusy:root?.dataset.p4Busy??null,
      panelRows:root?.__p4VisibleRows?.length??null,
      panelStatus:status.slice(0,550),
      newWorkerPublished:Boolean(witness?.session?.receipt?.basisId&&
        witness.session.receipt.basisId!==oldBasis)};
  },{at,oldBasis});
}

export async function verifyXml229ChangedBasisJourney({page,lineListVariant,record,beforeWorker,beforeNav,collectEditable}){
  // Real public-data changed-input contrast after normal output readback.
  // No manufactured Worker, review decision or private engineering fixture.
  // Preserve the 419 prior canonical-ID edits as an in-process oracle.
  const alternateLineList=lineListVariant==='bc4-json'
    ?await makeXml229PublicBc4LineListRevision()
    :'tests/fixtures/xml229/BC4.LineList.json';
  await page.locator('[data-phase="source"]').click();
  await page.locator('[data-sub-tab="linelist"]').click();
  await page.locator('input[data-master-file="lineList"]').setInputFiles(alternateLineList);
  await page.locator('[data-master-mapping-status="lineList"]')
    .filter({hasText:'Mapping status: APPLIED'}).waitFor({timeout:120000});
  await page.locator('[data-phase="preview"]').click();
  const expectedAlternateRows=385;
  await page.waitForFunction(expected=>{
    const inventory=document.querySelector('#mc-preview-table-host')?.parentElement?.textContent||'';
    return inventory.includes('Line List: '+expected+' row(s)');
  },expectedAlternateRows,{timeout:120000});
  await page.locator('#mc-preview-table-host [data-mc-preview-build]').first().click();
  try{
  await page.waitForFunction(oldBasis=>{
    const host=document.querySelector('#mc-preview-table-host');
    return host?.dataset.mcPreviewJsonSource==='P4_ENGINEERING_VERIFIED'&&
      host.dataset.mcPreviewBasisId&&host.dataset.mcPreviewBasisId!==oldBasis&&
      host.querySelector('[data-mc-preview-build]')?.disabled===false;
  },beforeWorker.basisId,{timeout:420000});
  }catch(error){
    const info=await captureXml229ChangedBasisDiagnostic(page,'preview-rebuild',beforeWorker.basisId);
    record.stages.workspaceChangedBasisDiagnostic=info;
    throw new Error('Changed public Line List Preview verification incomplete: '+
      JSON.stringify(info)+'; '+String(error?.message||error));
  }
  await page.locator('[data-phase="weight-match"]').click();
  try{
  await page.waitForFunction(oldBasis=>{
    const root=document.querySelector('[data-p4-weight-root]');
    const witness=window.__xml229WorkspaceLiveReview;
    return root?.isConnected&&
      root?.__p4VisibleRows?.length>0&&
      witness?.session?.receipt?.basisId!==oldBasis;
  },beforeWorker.basisId,{timeout:120000});
  }catch(error){
    const info=await captureXml229ChangedBasisDiagnostic(page,'weight-mount',beforeWorker.basisId);
    record.stages.workspaceChangedBasisDiagnostic=info;
    throw new Error('Changed public Line List Weight verification incomplete: '+
      JSON.stringify(info)+'; '+String(error?.message||error));
  }
  const changedWorker=await page.evaluate(async()=>{
    const witness=window.__xml229WorkspaceLiveReview;
    const proof=await witness.session.readCompletion();
    return {sameSession:witness.session===window.__xml229WorkspaceFirstSession,
      basisId:witness.session.receipt.basisId,
      lease:witness.lease,sourceGenerationId:witness.session.receipt.sourceGenerationId,
      counts:proof.counts,stageRevisions:proof.stageRevisions};
  });
  assert.equal(changedWorker.sameSession,false,'changed master retained old Worker');
  assert.notEqual(changedWorker.basisId,beforeWorker.basisId,'changed master reused stale InputBasis');
  assert.notEqual(changedWorker.lease,beforeWorker.lease,'changed master reused stale input lease');
  assert.deepEqual(changedWorker.counts,beforeWorker.counts,
    'changed Line List import unexpectedly committed engineering decisions');
  const onChangedBasis=await collectEditable();
  const overlapping=[...beforeNav].filter(([id])=>onChangedBasis.has(id));
  assert(overlapping.length>0,'changed-basis fixture has no comparable canonical occurrences');
  const leaked=overlapping.filter(([id])=>onChangedBasis.get(id)!=='');
  record.stages.workspaceChangedBasis={
    inputChange:lineListVariant==='bc4-json'
      ?'deterministic public BC4 Line List cell revision via Source & Master'
      :'opposite public BC4 Line List imported through Source & Master',
    beforeFocused:beforeNav.size,afterFocused:onChangedBasis.size,
    overlapping:overlapping.length,staleDraftsVisible:leaked.length,
    workerReplaced:true,basisChanged:true,leaseChanged:true,
    acceptedReviewCountsUnchanged:true,nativeCiiReleaseAuthorized:false};
  assert.equal(leaked.length,0,
    'Stale Applied Weight drafts activated in replacement Worker basis: '+leaked.length);
  await page.locator('[data-phase="run"]').click();
  await page.locator('[data-action="xml229-output-participation"]').waitFor();
  assert.equal(await page.locator('[data-action="xml229-output-participation"]').inputValue(),'governed');
  assert.equal(await page.locator('[data-action="run"]').isDisabled(),true);
  record.passes.push('real alternate public Line List rebuild replaces Worker/basis and never reactivates old drafts');
}
