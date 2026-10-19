import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {openXml229WeightDraftWorkspace}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-draft-workspace.mjs';

function receipt(c='a'){
 return {basisId:c.repeat(64),sourceId:'SOURCE',sourceGenerationId:'GEN-'+c,
  originalJsonSha256:c.repeat(64)};
}
function storage(){
 const items=new Map();
 return {items,getItem(k){return items.get(k)??null;},
  setItem(k,v){items.set(k,v);}};
}
const suggested={value:'42.125',proposalId:'qualified-rank1',reason:'',
 autoFilled:true,autoUnqualified:false};
const skip={value:'0',proposalId:'',reason:'',skippedWeight:true,autoFilled:false};

test('navigation reuses source-bound drafts without accepting Match-1/Final',()=>{
 const store=storage();
 const one=openXml229WeightDraftWorkspace(receipt('a'),{storage:store});
 one.drafts.set('physical-1',suggested);
 one.drafts.set('physical-2',skip);
 assert.equal(one.save(),2);
 const two=openXml229WeightDraftWorkspace(receipt('a'),{storage:store});
 assert.equal(two.drafts,one.drafts,'new panel must share the external workspace');
 assert.equal(two.drafts.get('physical-1').value,'42.125');
 assert.equal(two.drafts.get('physical-2').skippedWeight,true);
 const checkpoint=JSON.parse([...store.items.values()][0]);
 assert.equal(checkpoint.schema,'XML229.SourceBoundWeightDraftWorkspace.v1');
 assert.equal(checkpoint.reviewDecisionsAuthorized,false);
 assert.equal(checkpoint.nativeCiiReleaseAuthorized,false);
 assert.equal(checkpoint.entries.length,2);
});

test('reload recovers an entire atomic checkpoint, but never other source/masters',async()=>{
 const store=storage();
 const one=openXml229WeightDraftWorkspace(receipt('b'),{storage:store});
 one.drafts.set('physical-3',{value:'16.25',proposalId:'',reason:'Manual review pending'});
 one.save();
 const fresh=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-draft-workspace.mjs?reload=1');
 const again=fresh.openXml229WeightDraftWorkspace(receipt('b'),{storage:store});
 assert.equal(again.drafts.get('physical-3').value,'16.25');
 assert.equal(again.drafts.get('physical-3').reason,'Manual review pending');
 assert.equal(fresh.openXml229WeightDraftWorkspace(receipt('c'),{storage:store})
  .drafts.size,0,'different verified basis cannot recover prior drafts');
 assert.equal(again.isFor({...receipt('b'),sourceGenerationId:'WRONG'}),false);
});

test('private backup restore requires exact basis and never mixes reviewed ledgers',()=>{
 const store=storage();
 const source=openXml229WeightDraftWorkspace(receipt('d'),{storage:store});
 source.drafts.set('id-1',suggested);
 source.save();
 const backup=source.exportBackup();
 const target=openXml229WeightDraftWorkspace(receipt('e'),{storage:store});
 target.drafts.set('existing',{value:'29',proposalId:'',reason:'keep'});
 assert.throws(()=>target.restoreBackup(backup),{code:'WEIGHT_DRAFT_BASIS_OR_FORMAT_MISMATCH'});
 assert.equal(target.drafts.get('existing').value,'29');
 assert.equal(target.drafts.has('id-1'),false);
 assert.equal(source.restoreBackup(backup),1);
 assert.equal(source.drafts.get('id-1').proposalId,'qualified-rank1');
});

test('reject corrupt saved values, duplicate occurrences and forged skip zeros',()=>{
 const w=openXml229WeightDraftWorkspace(receipt('f'),{storage:storage()});
 const base=w.exportBackup();
 for(const entries of [
  [['id',{value:'NaN'}]],
  [['id',{value:'-1'}]],
  [['id',{value:'9',skippedWeight:true}]],
  [['same',{value:'3'}],['same',{value:'4'}]],
  [['id',{value:'5',autoFilled:true,proposalId:''}]],
 ]){
  assert.throws(()=>w.restoreBackup({...base,entries}));
 }
 assert.equal(w.drafts.size,0);
});

test('storage failure does not turn unsaved drafts into reviewed masses and restore rolls back',()=>{
 const base=storage();
 const w=openXml229WeightDraftWorkspace(receipt('1'),{storage:base});
 w.drafts.set('original',{value:'10'});
 const saved=w.exportBackup();
 w.save();
 const failing=storage();failing.setItem=()=>{throw Error('quota');};
 const other=openXml229WeightDraftWorkspace(receipt('2'),{storage:failing});
 other.drafts.set('old',{value:'17'});
 assert.throws(()=>other.save(),{code:'WEIGHT_DRAFT_STORAGE_WRITE_FAILED'});
 assert.throws(()=>other.restoreBackup({...saved,...receipt('2')}),
  {code:'WEIGHT_DRAFT_STORAGE_WRITE_FAILED'});
 assert.equal(other.drafts.get('old').value,'17');
});

test('Weight panel and workspace are identically served under docs and leave native HOLD alone',async()=>{
 for(const path of [
  'tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-draft-workspace.mjs',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-review-presentation.mjs',
 ]){
  const [root,served]=await Promise.all([
   readFile(new URL('../'+path,import.meta.url),'utf8'),
   readFile(new URL('../docs/'+path,import.meta.url),'utf8')]);
  assert.equal(root,served,path);
 }
 const panel=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js',import.meta.url),'utf8');
 assert.match(panel,/data-p4-save-drafts/);
 assert.match(panel,/data-p4-import-drafts/);
 assert.match(panel,/openXml229WeightDraftWorkspace\(session.receipt\)/);
 assert.match(panel,/persistDrafts\(\)/);
 assert.doesNotMatch(panel,/commitXml229TwoClickMatch1\(/);
 const gate=await readFile(new URL('../tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js',import.meta.url),'utf8');
 assert.match(gate,/xml229-original-json-engineering-authority/);
 assert.match(gate,/status:'held'/);
});
