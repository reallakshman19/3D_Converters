import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRegexBoundedDatasetEvidence} from '../tabs/xml-cii-2019-standalone/xml-cii-regex-bounded-evidence.js';
import {materializeRegexSmartMasterContext} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-smart-evidence.js';

const datasetRef={datasetId:'c05-203:pipingClass:r7',masterKey:'pipingClass',
  datasetRevision:7,rowCount:10699};
const makeRows=indexes=>indexes.map(i=>({'Piping Class':'11210',_rowIndex:i+1}));
const realFetch=async(_key,id,indexes,ref)=>({
  datasetId:id,masterKey:'pipingClass',datasetRevision:ref.datasetRevision,
  rowCount:10699,indexes:[...indexes],rows:makeRows(indexes),
});
const one=({search,getRowsByIndexes=realFetch})=>resolveRegexBoundedDatasetEvidence({
  masterKey:'pipingClass',datasetRef,queries:['11210'],search,getRowsByIndexes,
});
const currentState=()=>({
  regexTesterConfig:{activeFormatIndex:0,formats:[{tokenDelimiter:'-'}]},
  regexTesterResult:{branchSamples:[{branchName:'/AREA-DN100-11210/B1'}],
    matchedRows:[],rejectedRows:[]},
  masterContext:{datasetRefs:{pipingClass:{...datasetRef}},
    rowCounts:{pipingClass:10699},pipingClassRows:[],
    appliedMappingRevision:{pipingClass:12},
    config:{pipingClass:{fieldMap:{pipingClass:'Piping Class'}}}},
});

test('T25 provider-declared matchCount above returned indexes is incomplete, never a full-coverage pass',async()=>{
  const answer=await materializeRegexSmartMasterContext(currentState(),{
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:7,indexes:[1277,1278,1279]}),
    getRowsByIndexes:realFetch,maxIndexesPerQuery:12,maxTotalIndexes:24,
  });
  assert.equal(answer.pipingClassRowCount,3);
  assert.equal(answer.boundedEvidence.pipingClass.truncatedQueryCount,1);
  assert.equal(answer.boundedEvidence.complete,false);
});

test('T25 advertized hits with zero delivered indexes is incomplete and fetches nothing',async()=>{
  let fetches=0;
  const answer=await materializeRegexSmartMasterContext(currentState(),{
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:4,indexes:[]}),
    getRowsByIndexes:async()=>{fetches++;throw Error('must not fetch absent indexes');},
  });
  assert.equal(fetches,0);
  assert.equal(answer.pipingClassRowCount,0);
  assert.equal(answer.boundedEvidence.complete,false);
});

test('T25 rejected forged search matchCount below returned index count',async()=>{
  await assert.rejects(one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:1,indexes:[1277,1278]}),
  }),/matchCount.*(mismatch|invalid|less)/i);
});

test('T25 rejects malformed negative / noninteger search matchCount',async()=>{
  await assert.rejects(one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:-1,indexes:[]}),
  }),/matchCount.*(mismatch|invalid)/i);
  await assert.rejects(one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:'not-a-number',indexes:[]}),
  }),/matchCount.*(mismatch|invalid)/i);
});

test('T26 fail closed on search index beyond persisted source row census',async()=>{
  await assert.rejects(one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:1,indexes:[10699]}),
  }),/index.*(range|census|invalid)/i);
});

test('T26 fail closed on negative or noninteger search index rather than silently skipping',async()=>{
  await assert.rejects(one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:1,indexes:[-1]}),
  }),/index.*(range|census|invalid)/i);
  await assert.rejects(one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:1,indexes:['bad-index']}),
  }),/index.*(range|census|invalid)/i);
});

test('T26 indexed worker response rowCount must match the source authority ref',async()=>{
  await assert.rejects(one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:2,indexes:[1277,1278]}),
    getRowsByIndexes:async(_key,id,indexes)=>({
      datasetId:id,masterKey:'pipingClass',datasetRevision:7,
      rowCount:10698,indexes:[...indexes],rows:makeRows(indexes),
    }),
  }),/rowCount.*(mismatch|census)/i);
});

test('T25/T26 accepts native Worker-shaped complete matchCount, indexed rows and source census',async()=>{
  const answer=await one({
    search:async(_key,id,query)=>({datasetId:id,query,matchCount:3,indexes:[1277,1278,1279]}),
  });
  assert.equal(answer.matchedQueryCount,1);
  assert.equal(answer.rowIndexCount,3);
  assert.equal(answer.truncatedQueryCount,0);
  assert.deepEqual(answer.rows.map(row=>row._rowIndex),[1278,1279,1280]);
});

test('T25/T26 optional metadata remains backward compatible with existing synthetic providers',async()=>{
  const answer=await one({
    search:async()=>({indexes:[1277,1278]}),
    getRowsByIndexes:async(_key,_id,indexes)=>({rows:makeRows(indexes)}),
  });
  assert.equal(answer.rows.length,2);
  assert.equal(answer.truncatedQueryCount,0);
});
