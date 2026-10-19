import test from 'node:test';
import assert from 'node:assert/strict';
import {openXml229SessionWeightDrafts,inspectXml229SessionWeightDrafts}
  from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-session-weight-drafts.mjs';
import {captureXml229WeightDraft}
  from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-two-click-confirmation.mjs';
const mk=(basis='a',gen='generation-1')=>({receipt:{basisId:basis.repeat(64),
 sourceId:'PUBLIC',sourceGenerationId:gen,originalJsonSha256:'f'.repeat(64)}});
test('same session/lease/verified basis holds typed, suggested and skip drafts',()=>{
 const ref={},session=mk(),entry={session,lease:'public-source-lease-1'};
 const first=openXml229SessionWeightDrafts(ref,entry);
 first.drafts.set('occ-manual',{value:'91.25',autoFilled:false});
 first.drafts.set('occ-auto',{value:'12',proposalId:'top',autoFilled:true});
 first.drafts.set('occ-skip',{value:'0',skippedWeight:true,autoFilled:false});
 const returnToWeight=openXml229SessionWeightDrafts(ref,entry);
 assert.equal(returnToWeight,first);
 assert.equal(returnToWeight.drafts.get('occ-manual').value,'91.25');
 assert.equal(returnToWeight.drafts.get('occ-auto').autoFilled,true);
 assert.equal(returnToWeight.drafts.get('occ-skip').skippedWeight,true);
 assert.equal(inspectXml229SessionWeightDrafts(ref).activeCount,3);
 assert.deepEqual(inspectXml229SessionWeightDrafts(ref).archivedCounts,[]);
});
test('different Worker, generation, lease or source basis never adopts stale drafts',()=>{
 const ref={},session=mk(),first=openXml229SessionWeightDrafts(ref,{session,lease:'L1'});
 first.drafts.set('occ',{value:'8.25'});
 const replacement=openXml229SessionWeightDrafts(ref,{session:mk(),lease:'L1'});
 assert.notEqual(replacement,first);assert.equal(replacement.drafts.size,0);
 replacement.drafts.set('occ',{value:'7'});
 const next=openXml229SessionWeightDrafts(ref,{session:mk('a','generation-2'),lease:'L1'});
 assert.equal(next.drafts.size,0);
 const configChanged=openXml229SessionWeightDrafts(ref,{session:mk('b','generation-2'),lease:'L2'});
 assert.equal(configChanged.drafts.size,0);
 assert.deepEqual(inspectXml229SessionWeightDrafts(ref).archivedCounts,[1,1,0]);
 first.drafts.set('late',{value:'13'});
 assert.deepEqual(inspectXml229SessionWeightDrafts(ref).archivedCounts,[1,1,0],
   'stale asynchronous mutation must not enter a newer basis archive');
});
test('manually editing a skipped input removes misleading Skip provenance',()=>{
 const drafts=new Map([['canonical-occ',{value:'0',skippedWeight:true}]]);
 const tr={dataset:{p4Row:'0',p4Occurrence:'canonical-occ'},
  querySelector:selector=>({
    '[data-p4-candidate]':{value:''},'[data-p4-proposal]':{value:'5.25'},
    '[data-p4-reason]':{value:'manual for later review'},
  })[selector]};
 const rows=[{occurrenceId:'canonical-occ',proposals:[]}];
 assert.equal(captureXml229WeightDraft(tr,rows,drafts),'canonical-occ');
 assert.equal(drafts.get('canonical-occ').value,'5.25');
 assert.equal(drafts.get('canonical-occ').autoFilled,false);
 assert.equal(Object.hasOwn(drafts.get('canonical-occ'),'skippedWeight'),false);
});
test('invalid/closed session is rejected without overwriting active drafts',()=>{
 const ref={},session=mk(),entry={session,lease:'L1'};
 const current=openXml229SessionWeightDrafts(ref,entry);
 current.drafts.set('id',{value:'6'});
 assert.throws(()=>openXml229SessionWeightDrafts(ref,{session:{...mk(),closed:true},lease:'L2'}),
  /XML229_SESSION_DRAFT_BASIS_REQUIRED/);
 assert.equal(openXml229SessionWeightDrafts(ref,entry).drafts.get('id').value,'6');
});
test('stale drafts are not silently evicted during repeated input-basis changes',()=>{
 const ref={};
 for(let i=0;i<7;i++){
   const slot=openXml229SessionWeightDrafts(ref,{
     session:mk(String.fromCharCode(97+i),'generation-'+i),lease:'L-'+i,
   });
   slot.drafts.set('source-bound-'+i,{value:String(i+1),autoFilled:false});
 }
 assert.equal(inspectXml229SessionWeightDrafts(ref).activeCount,1);
 assert.deepEqual(inspectXml229SessionWeightDrafts(ref).archivedCounts,[1,1,1,1,1,1]);
});


test('each identity field independently fences a stale draft while Worker stays fixed',async t=>{
 const modifications=[
   ['workerObject',(entry)=>({...entry,session:{...entry.session}})],
   ['lease',(entry)=>({...entry,lease:'another-verified-lease'})],
   ['basisId',(entry)=>({...entry,session:{...entry.session,receipt:{...entry.session.receipt,basisId:'b'.repeat(64)}}})],
   ['sourceId',(entry)=>({...entry,session:{...entry.session,receipt:{...entry.session.receipt,sourceId:'ANOTHER_PUBLIC_SOURCE'}}})],
   ['sourceGenerationId',(entry)=>({...entry,session:{...entry.session,receipt:{...entry.session.receipt,sourceGenerationId:'generation-2'}}})],
   ['originalJsonSha256',(entry)=>({...entry,session:{...entry.session,receipt:{...entry.session.receipt,originalJsonSha256:'c'.repeat(64)}}})],
 ];
 for(const [field,change] of modifications){
   await t.test(field,()=>{
     const ref={},entry={session:mk(),lease:'public-lease'};
     const old=openXml229SessionWeightDrafts(ref,entry);
     old.drafts.set('same-canonical-occurrence',{value:'91.25',skippedWeight:false});
     const variant=change(entry);
     if(field!=='workerObject'){
       // Test each receipt/lease guard while keeping the original Worker
       // object fixed: replacement of the object itself can mask omissions.
       if(field!=='lease'){
         entry.session.receipt=variant.session.receipt;
         variant.session=entry.session;
       }
       assert.strictEqual(variant.session,entry.session);
     }
     const current=openXml229SessionWeightDrafts(ref,variant);
     assert.notStrictEqual(current,old,field+' failed to create a new active workspace');
     assert.deepEqual([...current.drafts],[]);
     assert.deepEqual(inspectXml229SessionWeightDrafts(ref).archivedCounts,[1]);
     old.drafts.set('late-reply',{value:'33'});
     assert.equal(current.drafts.has('late-reply'),false);
     assert.deepEqual(inspectXml229SessionWeightDrafts(ref).archivedCounts,[1]);
   });
 }
});

test('Mode A wrappers reuse the same stable base stateRef and exact session',()=>{
 const baseRef={},first={modeABaseRef:baseRef,current:{activePhaseId:'weight-match'}};
 const second={modeABaseRef:baseRef,current:{activePhaseId:'preview'}};
 const entry={session:mk(),lease:'one-verified-lease'};
 const original=openXml229SessionWeightDrafts(first,entry);
 original.drafts.set('canonical',{value:'17',proposalId:'p',autoFilled:true});
 const next=openXml229SessionWeightDrafts(second,entry);
 assert.strictEqual(next,original);
 assert.equal(next.drafts.get('canonical').value,'17');
 assert.deepEqual(inspectXml229SessionWeightDrafts(second).archivedCounts,[]);
});

test('different application base refs never share draft workspace, even with identical Worker',()=>{
 const session=mk(),entry={session,lease:'shared-test-lease'};
 const left={modeABaseRef:{}},right={modeABaseRef:{}};
 const first=openXml229SessionWeightDrafts(left,entry);
 first.drafts.set('same-id',{value:'19',skippedWeight:true});
 const other=openXml229SessionWeightDrafts(right,entry);
 assert.notStrictEqual(other,first);
 assert.equal(other.drafts.has('same-id'),false);
 assert.equal(inspectXml229SessionWeightDrafts(right).activeCount,0);
 assert.equal(inspectXml229SessionWeightDrafts(left).activeCount,1);
});
