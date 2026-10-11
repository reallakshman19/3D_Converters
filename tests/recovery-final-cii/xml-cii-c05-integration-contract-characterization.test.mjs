/**
 * NEXT-04 — C05 integration policy-neutral characterization.
 * Compare live implementation behavior with competing unchanged #880 / #893
 * historic expectations. This does not decide D-212-7 or D-212-2 for Owner #203,
 * waive old REDs, or change any product source, protected golden or browser gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hydratePersistedMasterDatasets } from '../../tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js';
import { createMasterDatasetService } from '../../tabs/xml-cii-2019-standalone/workers/master-dataset-service.js';
import { createMasterDatasetImportCoordinator } from '../../tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js';
import { MASTER_DATASET_COMMAND, MASTER_DATASET_EVENT } from '../../tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js';
import { materializeXmlCiiDatasetBackedConfig } from '../../tabs/xml-cii-2019-standalone/xml-cii-dataset-backed-config.js';

const observed=(t,subject,details)=>t.diagnostic(JSON.stringify({task:'NEXT-04',subject,...details}));
const clone=x=>JSON.parse(JSON.stringify(x));
function withStorage(data,fn) {
  const previous=globalThis.localStorage;
  const entries=new Map(Object.entries(data));
  globalThis.localStorage={
    getItem:k=>entries.has(k)?entries.get(k):null,
    setItem:(k,v)=>entries.set(k,String(v)),
    removeItem:k=>entries.delete(k),
  };
  return Promise.resolve().then(fn).finally(()=>{globalThis.localStorage=previous});
}
function custody(masterKey,rev) {
  return JSON.stringify({
    source:masterKey==='pipingClass'?'Piping_class_master.json':'PCF_MAT_MAP.TXT',
    datasetId:'next04:'+masterKey+':r'+rev,
    datasetRevision:rev,
    rowCount:2,fieldMap:{},appliedRevision:rev,
    persistenceMode:'indexeddb'
  });
}
function originalActiveWeight(){
  const context={
    config:{weight:{masterRevision:11,masterFingerprint:'original-session-fp'}},
    datasetRefs:{weight:{datasetId:'active:weight',datasetRevision:5,
      rowCount:2,masterKey:'weight',masterFingerprint:'original-session-fp',persistence:'session'}},
    rowCounts:{weight:2},previewRows:{weight:[{Marker:'active'}]},
    sourceMetadata:{weight:{source:'active-session',status:'loaded',rowCount:2}},
    appliedMappingRevision:{weight:11},rawRows:{weight:[]},mappingRows:{weight:[]}
  };
  return {current:{masterContext:context,supportConfigJson:JSON.stringify(context.config)}};
}

test('D-212-7 characterization: corrupt material is isolated; valid piping sibling restores, original active Weight unchanged',async t=>{
  const state=originalActiveWeight();
  const weightBefore=clone(state.current.masterContext.datasetRefs.weight);
  const originalPiping=[{Marker:'PC-1'},{Marker:'PC-2'}];
  let rowRequests=0;
  await withStorage({
    'xml-cii-master-source-pipingClass':custody('pipingClass',4),
    'xml-cii-master-source-materialMap':custody('materialMap',3)
  },async()=>{
    const returned=await hydratePersistedMasterDatasets(state,{store:{
      async getMetadata(id){
        if(id==='next04:pipingClass:r4')return {
          datasetId:id,datasetRevision:4,rowCount:2,fileName:'Piping_class_master.json',mappingRows:originalPiping
        };
        return null; // materialMap original persisted dataset missing
      },
      async getRowsRange(id,offset,limit){
        rowRequests++;
        if(id==='next04:pipingClass:r4')return originalPiping.slice(offset,offset+limit);
        throw Error('Corrupt materialMap must not be loaded');
      },
      async getRows(id){if(id==='next04:pipingClass:r4')return originalPiping;throw Error('Corrupt materialMap full rows must not be read');}
    }});
    assert.equal(returned,true);
  });
  assert.equal(state.current.masterContext.datasetRefs.pipingClass.datasetId,'next04:pipingClass:r4');
  assert.equal(state.current.masterContext.datasetRefs.materialMap,undefined);
  assert.deepEqual(state.current.masterContext.datasetRefs.weight,weightBefore);
  assert.match(state.current.masterRestoreFailures.materialMap.message,/Persisted materialMap dataset is unavailable/);
  assert.equal(state.current.masterRestoreFailures.materialMap.stage,'startup-hydration');
  assert.ok(rowRequests>0);
  observed(t,'global-vs-isolated-corrupt-restore',{
    implementation:'RESOLVE_PER_MASTER_WITH_ERROR_RECEIPT',historic880:'GLOBAL_REJECTION_EXPECTED',
    validSiblingRestored:true,corruptMaterialAttached:false,activeWeightPreserved:true,
    ownerDecision:'D-212-7',authority:'CHARACTERIZATION_ONLY_NOT_POLICY_ADJUDICATION'
  });
});

function serviceWith(rows,metadata) {
  return createMasterDatasetService({
    getXlsx:async()=>{throw Error('No XLSX needed');},
    store:{
      async persistDataset(){},
      async getMetadata:id=>metadata[id]||null,
      async getRows:id=>rows[id]||null
    },
    prepareDataset:(_key,items)=>({fieldMap:{},rows:items,
      searchCorpus:items.map(x=>JSON.stringify(x).toLowerCase())}),
    buildSearchCorpus:items=>items.map(x=>JSON.stringify(x).toLowerCase()),
    searchCorpusIndexes:()=>[]
  });
}

test('D-212-2 companion: low-level worker returns actual cross-key/revision authority, coordinator rejects mismatch',async t=>{
  const datasetId='next04:materialMap:r3';
  const item={Material:'CS',Code:'A106B'};
  const service=serviceWith({[datasetId]:[item]},{
    [datasetId]:{datasetId,datasetRevision:3,masterKey:'materialMap',rowCount:1,masterFingerprint:''}
  });
  const raw=await service.handle({
    type:MASTER_DATASET_COMMAND.GET_ROWS,requestId:'next04-raw',
    datasetId,masterKey:'pipingClass',datasetRevision:2,offset:0,limit:1
  });
  assert.equal(raw.type,MASTER_DATASET_EVENT.ROWS_RESULT);
  assert.equal(raw.datasetId,datasetId);
  assert.equal(raw.masterKey,'materialMap');
  assert.equal(raw.datasetRevision,3);
  assert.deepEqual(raw.rows,[item]);
  const coordinator=createMasterDatasetImportCoordinator({client:{
    getRows:async()=>clone(raw),getRowsByIndexes:async()=>clone(raw),dispose(){}
  }});
  try{
    await assert.rejects(()=>coordinator.materializeRows(
      'pipingClass',1,datasetId,{datasetId,masterKey:'pipingClass',datasetRevision:2,rowCount:1}
    ),/Dataset authority mismatch for pipingClass/);
  }finally{coordinator.dispose();}
  observed(t,'worker-vs-consumer-authority',{
    lowLevelGetRows:'RETURNS_ACTUAL_METADATA_WITHOUT_REQUESTED_KEY_REVISION_VETO',
    downstreamCoordinator:'REJECTS_CROSS_MASTER_MATERIAL_RESULT',
    historic893:'CONSUMER_AUTHORITY_AND_BROWSER_FULL_ROW_EXPECTATIONS',
    ownerDecision:'D-212-2',authority:'CHARACTERIZATION_ONLY'
  });
});

test('D-212-2 original full Piping Class: materializer demands complete 10699 rows; 150-row bound fails explicitly',async t=>{
  const source='docs/Masters/Piping_class_master.json';
  const original=JSON.parse(await readFile(new URL('../../'+source,import.meta.url),'utf8'));
  assert.ok(Array.isArray(original), 'original full Piping Class master is array');
  assert.equal(original.length,10699,'exact original source census');
  const ref={datasetId:'next04:real:piping',datasetRevision:7,masterKey:'pipingClass',rowCount:original.length};
  const state={masterContext:{config:{},datasetRefs:{pipingClass:ref},
    pipingClassRows:[],appliedMappingRevision:{pipingClass:7}}};
  const calls=[];
  const config=await materializeXmlCiiDatasetBackedConfig({},state,{
    materializeRows:async(key,actual)=>{
      calls.push([key,actual.datasetId]);
      return original;
    }
  });
  assert.deepEqual(calls,[['pipingClass',ref.datasetId]]);
  assert.equal(config.pipingClass.masterRows.length,10699);
  assert.deepEqual(config.pipingClass.masterRows[10698],original[10698]);
  await assert.rejects(
    ()=>materializeXmlCiiDatasetBackedConfig({},state,{
      materializeRows:async()=>original.slice(0,150)
    }),
    /Dataset-backed pipingClass materialization mismatch: expected 10699, received 150/
  );
  // A deliberately limited preview/page subset must not masquerade as the
  // full source; this test does not decide whether future consumers should page.
  observed(t,'full-resident-vs-bounded-original',{
    originalFile:source,expectedRows:10699,
    currentConfigConsumer:'FULL_RESIDENT_REQUIRED',bounded150:'REJECTS_WITH_TYPED_MISMATCH',
    browser893:'SEPARATE_REAL_CHROMIUM_GATE_REMAINS_RED',
    ownerDecision:'D-212-2',authority:'CHARACTERIZATION_ONLY'
  });
});

test('NEXT-04 read-only implementation and docs mirror parity for C05 observed contracts',async t=>{
  const base='tabs/xml-cii-2019-standalone/';
  const source=[
    base+'workers/master-dataset-startup-hydration.js',
    base+'workers/master-dataset-service.js',
    base+'workers/master-dataset-import-coordinator.js',
    base+'xml-cii-dataset-backed-config.js'
  ];
  for(const path of source){
    const [a,b]=await Promise.all([
      readFile(new URL('../../'+path,import.meta.url),'utf8'),
      readFile(new URL('../../docs/'+path,import.meta.url),'utf8'),
    ]);
    assert.equal(a,b,'current integrated source/docs unchanged: '+path);
  }
  observed(t,'source-docs-parity',{mirrors:source,pass:true,authority:'READ_ONLY'});
});
