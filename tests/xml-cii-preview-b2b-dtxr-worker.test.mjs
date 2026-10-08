import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runPreviewDtxrRatingTransaction} from
  '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-dtxr-transaction.js';
const rows=[
 {branchName:'MANUAL',ratingDtxr:'150'},
 {branchName:'AUTO',ratingDtxr:'300'},
 {branchName:'CONFLICT',ratingDtxrRatings:['150','600']},
];
const seed=()=>({overrides:{
 rating:{MANUAL:'900'},
 __previewFillDown:{rating:{MANUAL:{fillState:'manual'}}},
 processData:{MANUAL:{rating:'900'}},
}});
test('explicit DTXR fetch changes only unambiguous nonmanual Rating and awaits Worker',async()=>{
 const config=seed();let persisted=0,rebuilt=0;
 const r=await runPreviewDtxrRatingTransaction({config,branchRows:rows,
   persist:async()=>{persisted++;},
   rebuild:async()=>{rebuilt++;return {branchRows:[]};},
 });
 assert.equal(r.committed,true);assert.equal(r.applied,1);
 assert.equal(r.conflicts,1);assert.equal(r.manualProtected,1);
 assert.equal(config.overrides.rating.MANUAL,'900');
 assert.equal(config.overrides.processData.MANUAL.rating,'900');
 assert.equal(config.overrides.rating.AUTO,'300');
 assert.equal(config.overrides.__dtxrRatingKeys.AUTO,true);
 assert.equal(persisted,1);assert.equal(rebuilt,1);
});
test('failed staged/Worker rebuild restores prior manual authority, retries rollback via Worker',async()=>{
 const config=seed(),baseline=structuredClone(config.overrides);
 const attempts=[];let persists=0,reported;
 try{await runPreviewDtxrRatingTransaction({config,branchRows:rows,
  persist:async()=>{persists++;},
  rebuild:async({rollback})=>{
    attempts.push(rollback);
    if(!rollback)throw Object.assign(new Error('STAGED_SOURCE_FAILED'),{code:'STAGED_SOURCE_FAILED'});
    return {branchRows:[]};
  },
 });}catch(e){reported=e;}
 assert.equal(reported?.code,'STAGED_SOURCE_FAILED');
 assert.equal(reported?.ratingOverridesRestored,true);
 assert.deepEqual(config.overrides,baseline);
 assert.deepEqual(attempts,[false,true]);assert.equal(persists,2);
});
test('null Worker completion must not commit a fetched Rating',async()=>{
 const config=seed(),prior=structuredClone(config.overrides),steps=[];
 await assert.rejects(runPreviewDtxrRatingTransaction({config,branchRows:rows,
   persist:async()=>steps.push('persist'),
   rebuild:async({rollback})=>{steps.push(rollback?'rollback':'run');return rollback?{}:null;},
 }),{code:'PREVIEW_REBUILD_INCOMPLETE'});
 assert.deepEqual(config.overrides,prior);
 assert.deepEqual(steps,['persist','run','persist','rollback']);
});
test('concurrent later manual edit is never overwritten by stale failure rollback',async()=>{
 const config=seed();let error;
 try{await runPreviewDtxrRatingTransaction({config,branchRows:rows,
  persist:async()=>{},
  rebuild:async()=>{
    config.overrides.rating.LATER_MANUAL='600';
    throw new Error('STALE_INPUT_BASIS');
  },
 });}catch(e){error=e;}
 assert.equal(error?.concurrentEdit,true);
 assert.equal(config.overrides.rating.LATER_MANUAL,'600');
 assert.equal(config.overrides.rating.MANUAL,'900');
});
test('no matching DTXR Rating never triggers persistence or Worker',async()=>{
 const config=seed();let touched=0;
 const result=await runPreviewDtxrRatingTransaction({config,branchRows:[],
   persist:async()=>touched++,
   rebuild:async()=>{touched++;return {};},
 });
 assert.equal(result.changed,false);
 assert.equal(result.committed,false);
 assert.equal(touched,0);
});
test('V7 actual DTXR button no longer uses synchronous forceBuild path',async()=>{
 const source=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-renderer-v7.js',import.meta.url),'utf8');
 const idx=source.indexOf("button.dataset.mcDtxrRatingFetch");
 const tail=source.slice(idx,source.indexOf('\n}',idx));
 assert.ok(idx>0,'explicit DTXR Rating button missing');
 assert.match(tail,/runPreviewDtxrRatingTransaction/);
 assert.match(tail,/xmlCiiRebuildPreviewThroughWorker/);
 assert.doesNotMatch(tail,/xmlCiiBuildAndRenderPreview\(rootEl/);
});
test('P3-B2-B source and deployed docs are byte-identical',async()=>{
 for(const name of ['xml-cii-adapted-preview-facts-dtxr-transaction.js',
  'xml-cii-adapted-preview-renderer-v7.js']){
  const base='../tabs/xml-cii-2019-standalone/ui-adapted/'+name;
  const deployed='../docs/tabs/xml-cii-2019-standalone/ui-adapted/'+name;
  assert.equal(await readFile(new URL(base,import.meta.url),'utf8'),
    await readFile(new URL(deployed,import.meta.url),'utf8'),name);
 }
});
