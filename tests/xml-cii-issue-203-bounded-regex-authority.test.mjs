import test from 'node:test';
import assert from 'node:assert/strict';
import {
  materializeRegexSmartMasterContext,
  regexSmartEvidenceRequestBasis,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-smart-evidence.js';

const SOURCE_COUNT=10699;
const DATASET_ID='issue203:pipingClass:cold-r7';
function sourceState(samples=[]) {
  return {
    regexTesterConfig:{
      activeFormatIndex:0,
      formats:[{tokenDelimiter:'-'}],
    },
    regexTesterResult:{branchSamples:samples,matchedRows:[],rejectedRows:samples},
    masterContext:{
      config:{pipingClass:{fieldMap:{pipingClass:'Piping Class'}}},
      pipingClassRows:[],
      datasetRefs:{
        pipingClass:{
          datasetId:DATASET_ID,datasetRevision:7,masterKey:'pipingClass',
          rowCount:SOURCE_COUNT,fieldMap:{pipingClass:'Piping Class'},
        },
      },
      rowCounts:{pipingClass:SOURCE_COUNT},
      appliedMappingRevision:{pipingClass:12},
    },
  };
}
const sample={branchName:'/AREA-DN100-P4110003-93833/B1'};

test('no branch samples: current J02 must NOT hydrate 10,699 Piping Class rows without evidence queries',async()=>{
  const state=sourceState();
  let searches=0,fetches=0;
  const result=await materializeRegexSmartMasterContext(state,{
    search:async()=>{searches++;throw Error('no query authorized');},
    getRowsByIndexes:async()=>{fetches++;throw Error('no indexes authorized');},
  });
  assert.equal(result.pipingClassRowCount,0);
  assert.equal(result.masterContext.pipingClassRows.length,0);
  assert.equal(result.boundedEvidence.mode,'BOUNDED_MASTER_EVIDENCE');
  assert.equal(result.boundedEvidence.complete,true);
  assert.equal(searches,0);
  assert.equal(fetches,0);
  assert.match(result.evidenceBasis,new RegExp(DATASET_ID));
  assert.match(regexSmartEvidenceRequestBasis(state),new RegExp(DATASET_ID));
  assert.equal(state.masterContext.datasetRefs.pipingClass.rowCount,SOURCE_COUNT);
  assert.equal(state.masterContext.pipingClassRows.length,0);
});

test('real selected structural sample selects indexed master evidence without full-table materialization',async()=>{
  const state=sourceState([sample]);
  const searchCalls=[],indexedCalls=[];
  const result=await materializeRegexSmartMasterContext(state,{
    search:async(key,datasetId,query)=>{
      searchCalls.push({key,datasetId,query});
      return {indexes:[0,1]};
    },
    getRowsByIndexes:async(key,datasetId,indexes,ref)=>{
      indexedCalls.push({key,datasetId,indexes:[...indexes],ref});
      assert.equal(ref.datasetRevision,7);
      assert.equal(ref.masterKey,'pipingClass');
      return {rows:indexes.map(i=>({'Piping Class':i===0?'P4110003':'93833'}))};
    },
  });
  assert.ok(searchCalls.length>=1,'expected selected-bucket bounded search');
  assert.ok(searchCalls.every(x=>x.key==='pipingClass'&&x.datasetId===DATASET_ID));
  assert.ok(indexedCalls.length===1);
  assert.deepEqual(indexedCalls[0].indexes,[0,1]);
  assert.equal(result.pipingClassRowCount,2);
  assert.equal(result.masterContext.pipingClassRows.length,2);
  assert.equal(result.boundedEvidence.mode,'BOUNDED_MASTER_EVIDENCE');
  assert.equal(result.boundedEvidence.complete,true);
  assert.match(result.evidenceBasis,new RegExp(DATASET_ID));
  assert.match(result.evidenceBasis,/"mappingRevision":12/);
  assert.equal(state.masterContext.pipingClassRows.length,0,'transient materialization must not retain rows in master state');
});

test('indexed authority rejection propagates: do not substitute stale revision rows',async()=>{
  const state=sourceState([sample]);
  await assert.rejects(
    materializeRegexSmartMasterContext(state,{
      search:async()=>({indexes:[0]}),
      getRowsByIndexes:async()=>{throw Error('Dataset revision mismatch for pipingClass: expected 7, received 6');},
    }),
    /Dataset revision mismatch for pipingClass/,
  );
});

test('large index returns stay bounded rather than allocating an entire 10,699-row master',async()=>{
  const state=sourceState([sample]);
  let fetched=0;
  const result=await materializeRegexSmartMasterContext(state,{
    maxIndexesPerQuery:8,maxTotalIndexes:10,
    search:async()=>({indexes:Array.from({length:1500},(_,i)=>i)}),
    getRowsByIndexes:async(key,id,indexes)=>{
      assert.equal(key,'pipingClass');
      assert.equal(id,DATASET_ID);
      assert.ok(indexes.length<=10);
      fetched+=indexes.length;
      return {rows:indexes.map(i=>({'Piping Class':String(i)}))};
    },
  });
  assert.ok(fetched>0&&fetched<=10);
  assert.ok(result.pipingClassRowCount<=10);
  assert.ok(result.boundedEvidence.pipingClass.truncatedQueryCount>0);
  assert.equal(state.masterContext.pipingClassRows.length,0);
});
