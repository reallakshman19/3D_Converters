import test from 'node:test';
import assert from 'node:assert/strict';
import {
  materializeRegexSmartMasterContext,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-smart-evidence.js';
import {resolveRegexBoundedDatasetEvidence} from '../tabs/xml-cii-2019-standalone/xml-cii-regex-bounded-evidence.js';

const ID='c05:203:pc:p16:r7';
const ref=Object.freeze({datasetId:ID,datasetRevision:7,masterKey:'pipingClass',rowCount:10699});
const positiveSample={branchName:'/AREA-DN100-11210/B1'};
const state=()=>({
  regexTesterConfig:{activeFormatIndex:0,formats:[{tokenDelimiter:'-'}]},
  regexTesterResult:{branchSamples:[positiveSample],matchedRows:[],rejectedRows:[positiveSample]},
  masterContext:{
    datasetRefs:{pipingClass:{...ref}},
    rowCounts:{pipingClass:10699},
    appliedMappingRevision:{pipingClass:12},
    pipingClassRows:[],
    config:{pipingClass:{fieldMap:{pipingClass:'Piping Class'}}},
  },
});
const rec=(index)=>({'Piping Class':'11210',_rowIndex:index+1});
const shapedSearch=(indexes)=>async(_key,id,query)=>({datasetId:id,query,indexes,matchCount:indexes.length});
const shapedFetch=async(_key,id,indexes,r)=>({
  datasetId:id,masterKey:'pipingClass',datasetRevision:r.datasetRevision,
  indexes:[...indexes],rows:indexes.map(rec),
});
const oneQuery=async({search,getRowsByIndexes})=>resolveRegexBoundedDatasetEvidence({
  masterKey:'pipingClass',datasetRef:ref,queries:['11210'],
  search,getRowsByIndexes,
});

test('current complete=true when the exact selected class has no truncation or overflow',async()=>{
  const answer=await materializeRegexSmartMasterContext(state(),{
    maxIndexesPerQuery:8,maxTotalIndexes:10,
    search:shapedSearch([1277,1278,1279]),
    getRowsByIndexes:shapedFetch,
  });
  assert.equal(answer.boundedEvidence.pipingClass.truncatedQueryCount,0);
  assert.equal(answer.boundedEvidence.complete,true);
  assert.equal(answer.pipingClassRowCount,3);
});

test('truncated per-query selected evidence must not assert complete master evidence',async()=>{
  const answer=await materializeRegexSmartMasterContext(state(),{
    maxIndexesPerQuery:2,maxTotalIndexes:10,
    search:shapedSearch([1277,1278,1279]),
    getRowsByIndexes:shapedFetch,
  });
  assert.ok(answer.boundedEvidence.pipingClass.truncatedQueryCount>=1);
  assert.equal(answer.pipingClassRowCount,2,'truncated Worker result must retain the index bound');
  assert.equal(answer.boundedEvidence.complete,false,'truncation loses required original rows');
});

test('total-index overflow marks incomplete without reading whole source',async()=>{
  let read=0;
  const both=state();
  both.regexTesterResult.branchSamples.push({branchName:'/AREA-DN100-153052/B2'});
  const answer=await materializeRegexSmartMasterContext(both,{
    maxIndexesPerQuery:1,maxTotalIndexes:1,
    search:async(_key,id,query)=>({datasetId:id,query,indexes:[query==='11210'?1:2]}),
    getRowsByIndexes:async(...args)=>{read+=args[2].length;return shapedFetch(...args);},
  });
  assert.equal(answer.boundedEvidence.pipingClass.rowIndexCount,1);
  assert.equal(answer.boundedEvidence.pipingClass.queryCount,2);
  assert.equal(read,1);
  assert.equal(answer.boundedEvidence.complete,false,'second distinct query is clipped by total bound');
});

test('fail closed when source search replies for a different dataset identity',async()=>{
  await assert.rejects(oneQuery({
    search:async(_key,_id,query)=>({datasetId:'wrong:materialMap:r9',query,indexes:[4]}),
    getRowsByIndexes:shapedFetch,
  }),/Dataset authority mismatch.*pipingClass|search.*datasetId.*mismatch/i);
});

test('fail closed when source search echoes a different query than requested',async()=>{
  await assert.rejects(oneQuery({
    search:async(_key,id)=>({datasetId:id,query:'not-11210',indexes:[4]}),
    getRowsByIndexes:shapedFetch,
  }),/search.*query.*mismatch|search.*requested query/i);
});

test('fail closed when indexed provider substitutes different indexes for requested exact row identities',async()=>{
  await assert.rejects(oneQuery({
    search:shapedSearch([1277,1278]),
    getRowsByIndexes:async(_key,id)=>({datasetId:id,masterKey:'pipingClass',
      datasetRevision:7,indexes:[0,1],rows:[rec(0),rec(1)]}),
  }),/indexed.*(mismatch|indexes)|row.*index/i);
});

test('fail closed when indexed source responds with fewer rows than its requested index list',async()=>{
  await assert.rejects(oneQuery({
    search:shapedSearch([1277,1278]),
    getRowsByIndexes:async(_key,id,indexes)=>({datasetId:id,masterKey:'pipingClass',
      datasetRevision:7,indexes:[...indexes],rows:[rec(indexes[0])]}),
  }),/indexed.*(count|length|rows)|row count mismatch/i);
});

test('accept exact provenance from the actual Worker-shaped search and indexed row envelopes',async()=>{
  const answer=await oneQuery({
    search:shapedSearch([1277,1278,1279]),
    getRowsByIndexes:shapedFetch,
  });
  assert.equal(answer.rowIndexCount,3);
  assert.equal(answer.rows.length,3);
  assert.equal(answer.truncatedQueryCount,0);
  assert.equal(answer.totalIndexOverflow,false);
});

test('legacy synthetic providers without optional search metadata still work when rows match requested indexes',async()=>{
  const answer=await oneQuery({
    search:async()=>({indexes:[2,3]}),
    getRowsByIndexes:async(_key,_id,indexes)=>({rows:indexes.map(rec)}),
  });
  assert.equal(answer.rows.length,2);
});
