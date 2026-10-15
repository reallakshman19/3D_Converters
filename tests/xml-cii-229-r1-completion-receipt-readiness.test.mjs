import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  RUN_STAGE_COMPLETION_SCHEMA,assessXmlCiiRunStageCompletion,
  xmlCiiRunStageReceiptMessage,
} from '../tabs/xml-cii-2019-standalone/xml-cii-run-completion-receipt.mjs';
import {
  buildOutputRunChecklist,buildStandaloneOutputRunReadiness,
} from '../tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js';

const D = char => char.repeat(64);
const B = Object.freeze({
  basisId:D('a'),sourceSha256:D('b'),selectionSha256:D('c'),
  expectedCount:41,
});
function receipt(stage='PREVIEW', basis=B) {
  return {
    schema:RUN_STAGE_COMPLETION_SCHEMA,stage,state:'COMPLETED',
    authority:'READ_ONLY',
    completionKind:stage==='PREVIEW'
      ?'ENGINEERING_PREVIEW_PROJECTION':'WEIGHT_CANDIDATE_RANKING',
    basisId:basis.basisId,sourceSha256:basis.sourceSha256,
    selectionSha256:basis.selectionSha256,
    expectedCount:basis.expectedCount,processedCount:basis.expectedCount,
    sourceRightsBasis:'SOURCE_FACTS_ONLY',
    sourcePhase:'INDEX_COMMITTED',
    engineeringAcceptance:'ACCEPTED', // cannot promote authority via a label
  };
}
function inspect(stage,rcpt,current=B) {
  return assessXmlCiiRunStageCompletion({stage,receipt:rcpt,currentBasis:current});
}
function readiness(preview=undefined,weight=undefined,prevBasis=B,weightBasis=B) {
  return buildOutputRunChecklist({
    sourceKind:'xml',sourceText:'<PipeStressExport/>',
    supportConfigJson:'{}',options:{outputMode:'both'},
    runStageCompletionReceipts:{preview,weight},
    runStageCurrentBases:{preview:prevBasis,weight:weightBasis},
  });
}
const row=(rows,id)=>rows.find(x=>x.id===id);

test('source-index receipt alone cannot assert Preview or Weight computation',()=>{
  const index={...receipt(),completionKind:undefined};
  const a=inspect('PREVIEW',index);
  assert.equal(a.status,'UNVERIFIED');
  assert.equal(a.reason,'SOURCE_INDEX_IS_NOT_ENGINEERING_BUILD');
  assert.equal(a.built,false);
  assert.equal(a.engineeringAccepted,false);
  const w=inspect('WEIGHT_MATCH',{...receipt('WEIGHT_MATCH'),completionKind:'SOURCE_INDEX'});
  assert.equal(w.status,'UNVERIFIED');
  assert.equal(w.built,false);
});

test('real completed Preview and Weight ranking may be *built* but never engineering accepted',()=>{
  const preview=inspect('PREVIEW',receipt());
  assert.equal(preview.status,'BUILT');
  assert.equal(preview.built,true);
  assert.equal(preview.engineeringAccepted,false);
  assert.match(xmlCiiRunStageReceiptMessage(preview),/does not authorize CII/);
  const weight=inspect('WEIGHT_MATCH',receipt('WEIGHT_MATCH'));
  assert.equal(weight.status,'BUILT_PROPOSED');
  assert.equal(weight.built,true);
  assert.equal(weight.engineeringAccepted,false);
  assert.match(xmlCiiRunStageReceiptMessage(weight),/not accepted Match-1 or Final/);
  // Index rights are a property of the input, not of the completed computation.
});

test('Run preflight recognizes current verified completed stages without authorizing Run',()=>{
  const rows=readiness(receipt(),receipt('WEIGHT_MATCH'));
  assert.equal(row(rows,'preview-audit').status,'ready');
  assert.equal(row(rows,'weight-match').status,'ready');
  assert.equal(row(rows,'preview-audit').blocking,false);
  assert.equal(row(rows,'weight-match').blocking,false);
  assert.match(row(rows,'weight-match').message,/proposals built/);
  const report=buildStandaloneOutputRunReadiness({
    sourceKind:'xml',sourceText:'<PipeStressExport/>',
    supportConfigJson:'{}',options:{outputMode:'both'},
    runStageCompletionReceipts:{preview:receipt(),weight:receipt('WEIGHT_MATCH')},
    runStageCurrentBases:{preview:B,weight:B},
  });
  assert.equal(report.checklistRows.find(x=>x.id==='run-result').status,'pending');
  assert.equal(report.summary.sourceMode,'xml');
});

test('stale Preview receipt beats a historically present legacy v5/v6 cache',()=>{
  const old=globalThis.localStorage;
  globalThis.localStorage={getItem:key=>key==='xml-cii-pv-cache-v6'
    ?JSON.stringify({data:{branchRows:[{branchName:'OLD'}]}})
    :key==='xml-cii-wm-cache-v1'
      ?JSON.stringify({data:[{weight:35}]})
      :null};
  try {
    const changed={...B,basisId:D('d')};
    const rows=readiness(receipt(),receipt('WEIGHT_MATCH'),changed,changed);
    assert.equal(row(rows,'preview-audit').status,'stale');
    assert.equal(row(rows,'weight-match').status,'stale');
    assert.match(row(rows,'preview-audit').message,/changed/);
  } finally {
    if(old===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
});

test('source SHA and selection digest changes invalidate complete same-count result',()=>{
  assert.equal(inspect('PREVIEW',receipt(),{...B,sourceSha256:D('e')}).status,'STALE');
  assert.equal(inspect('PREVIEW',receipt(),{...B,selectionSha256:D('f')}).status,'STALE');
  assert.equal(inspect('PREVIEW',receipt(),{...B,basisId:D('3')}).status,'STALE');
});

test('selected 41 vs original 28 branches cannot claim a complete population',()=>{
  assert.equal(inspect('PREVIEW',receipt(),{...B,expectedCount:28}).status,'INCOMPLETE');
  assert.equal(inspect('PREVIEW',{...receipt(),processedCount:28}).status,'INCOMPLETE');
  assert.equal(inspect('WEIGHT_MATCH',{...receipt('WEIGHT_MATCH'),expectedCount:28}).status,'INCOMPLETE');
  assert.equal(inspect('PREVIEW',{...receipt(),processedCount:42}).status,'INCOMPLETE');
});

test('no current independently recomputed basis cannot trust a cached self-claim',()=>{
  assert.equal(inspect('PREVIEW',receipt(),null).status,'UNVERIFIED');
  assert.equal(inspect('PREVIEW',receipt(),{...B,basisId:'not-sha'}).status,'UNVERIFIED');
  assert.equal(inspect('PREVIEW',{...receipt(),basisId:'not-sha'}).status,'UNVERIFIED');
  assert.equal(inspect('PREVIEW',{...receipt(),sourceSha256:'BAD'}).status,'UNVERIFIED');
});

test('wrong stage/schema or non-readonly authority fails closed',()=>{
  assert.equal(inspect('PREVIEW',receipt('WEIGHT_MATCH')).status,'UNVERIFIED');
  assert.equal(inspect('PREVIEW',{...receipt(),authority:'FINAL_ACCEPTED'}).status,'UNVERIFIED');
  assert.equal(inspect('PREVIEW',{...receipt(),schema:'XML229.RunCompletionReceipt.v0'}).status,'UNVERIFIED');
  assert.equal(inspect('INVALID',receipt()).status,'UNVERIFIED');
});

test('cancelled/uncommitted run, zero-count and partial source pages never count as done',()=>{
  assert.equal(inspect('PREVIEW',{...receipt(),state:'RUNNING'}).status,'INCOMPLETE');
  assert.equal(inspect('PREVIEW',{...receipt(),expectedCount:0,processedCount:0},
    {...B,expectedCount:0}).status,'INCOMPLETE');
  assert.equal(inspect('PREVIEW',{...receipt(),processedCount:-1}).status,'INCOMPLETE');
});

test('Run never fabricates receipts from old v1 cache or a positive weight',()=>{
  const old=globalThis.localStorage;
  const onlyNewCache={data:[{weight:35,candidates:[{suggestedWeight:35}]}]};
  globalThis.localStorage={getItem:key=>key==='xml-cii-wm-cache-v2-preview-rating'
    ?JSON.stringify(onlyNewCache):null};
  try{
    const rows=buildOutputRunChecklist({
      sourceKind:'xml',sourceText:'<PipeStressExport/>',
      supportConfigJson:'{}',options:{outputMode:'both'},
      masterContext:{rowCounts:{weight:1595}},
    });
    assert.equal(row(rows,'weight-match').status,'missing');
    assert.equal(row(rows,'weight-match').blocking,false);
    assert.match(row(rows,'weight-match').message,/not been published/);
  }finally{
    if(old===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=old;
  }
});

test('identical original tabs/docs scripts are served for receipt and Readiness',async()=>{
  for(const name of ['xml-cii-run-completion-receipt.mjs',
    'xml-cii-output-run-readiness.js']){
    const tab=await readFile(new URL('../tabs/xml-cii-2019-standalone/'+name,import.meta.url),'utf8');
    const docs=await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/'+name,import.meta.url),'utf8');
    assert.equal(docs,tab);
  }
});
