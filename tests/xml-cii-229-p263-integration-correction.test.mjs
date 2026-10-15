import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {resolveXml229FourMasterCustody} from '../tabs/xml-cii-2019-standalone/integration/xml229-four-master-custody.mjs';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const keys=['lineList','pipingClass','materialMap','weight'];
const section={lineList:'linelist',pipingClass:'pipingClass',materialMap:'material',weight:'weight'};
const field={lineList:'masterRows',pipingClass:'masterRows',materialMap:'mapRows',weight:'masterRows'};
const rowsOf=kind=>[{id:kind+'-0',value:11},{id:kind+'-1',value:19}];
const fixture=()=>{
 const config={},context={datasetRefs:{},rowCounts:{},
   sourceMetadata:{},appliedMappingRevision:{}};
 for(const kind of keys){
   config[section[kind]]={[field[kind]]:rowsOf(kind),fieldMap:{tag:'id'}};
   context.rowCounts[kind]=2;
   context.appliedMappingRevision[kind]=2;
   context.sourceMetadata[kind]={status:'loaded',source:kind+'.csv',sourceType:'manual'};
 }
 return {config,context};
};
const rejectCode=(code)=>error=>(assert.equal(error?.code,code,error?.stack),true);
test('valid resident localStorage masters become exact content-attested P4 masters without invented dataset IDs',async()=>{
 const {config,context}=fixture();
 const {masters,attestations}=await resolveXml229FourMasterCustody(config,context);
 assert.deepEqual(Object.keys(masters),keys);
 for(const kind of keys){
   assert.equal(masters[kind].rows.length,2);
   assert.match(masters[kind].datasetId,new RegExp('^resident:'+kind+':sha256:[0-9a-f]{64}$'));
   assert.equal(attestations[kind].storage,'resident');
   assert.equal(attestations[kind].rowCount,2);
   assert.equal(attestations[kind].revision,2);
   assert.match(attestations[kind].mappingSha256,/^[0-9a-f]{64}$/);
 }
 const first=attestations.lineList.contentSha256;
 config.linelist.masterRows[0].value=12;
 const next=await resolveXml229FourMasterCustody(config,context);
 assert.notEqual(first,next.attestations.lineList.contentSha256);
 assert.notEqual(masters.lineList.datasetId,next.masters.lineList.datasetId);
});
test('dataset-backed masters retain dataset identity and still challenge complete rows',async()=>{
 const {config,context}=fixture();
 for(const kind of keys){
   context.datasetRefs[kind]={datasetId:'id-'+kind,rowCount:2,datasetRevision:2};
 }
 const out=await resolveXml229FourMasterCustody(config,context);
 assert.equal(out.masters.lineList.datasetId,'id-lineList');
 assert.equal(out.attestations.lineList.storage,'dataset');
 context.datasetRefs.lineList.rowCount=3;
 await assert.rejects(()=>resolveXml229FourMasterCustody(config,context),
   rejectCode('MASTER_DATASET_DRIFT'));
});
test('never accept partial preview samples, corrupt restores, stale counts or embedded default weight',async()=>{
 const {config,context}=fixture();
 config.linelist.masterRows=[];
 await assert.rejects(()=>resolveXml229FourMasterCustody(config,context),
   rejectCode('MASTER_CONTENT_UNAVAILABLE'));
 config.linelist.masterRows=rowsOf('lineList');
 context.rowCounts.lineList=1;
 await assert.rejects(()=>resolveXml229FourMasterCustody(config,context),
   rejectCode('MASTER_ROWCOUNT_DRIFT'));
 context.rowCounts.lineList=2;
 await assert.rejects(()=>resolveXml229FourMasterCustody(config,context,{
   restoreFailures:{lineList:{code:'MISSING_DB',message:'Corrupt IndexedDB'}}}),
   rejectCode('MASTER_RESTORE_FAILED'));
 context.sourceMetadata.weight.sourceType='default';
 await assert.rejects(()=>resolveXml229FourMasterCustody(config,context),
   rejectCode('WEIGHT_MASTER_NOT_IMPORTED'));
});
test('active existing Preview/Weight/Run routes use the shared session without duplicate build panels',async()=>{
 const paths=[
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-button-session.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit-v7.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',
 ];
 const src=await Promise.all(paths.map(x=>readFile(new URL('../'+x,import.meta.url),'utf8')));
 assert.doesNotMatch(src[0],/installXml229P4PreviewBridge\(|installXml229WorkerHeldWeightPanel\(/);
 assert.match(src[1],/openVerifiedEngineeringSession/);
 assert.match(src[1],/session\.controller=null/);
 assert.match(src[2],/openXml229P4VerifiedSession\(stateRef/);
 assert.match(src[3],/existingWorkflow:true/);
 assert.doesNotMatch(src[4],/installXml229P4RunAdvisory\(/);
 for(const file of paths){
   assert.equal(await readFile(new URL('../'+file,import.meta.url),'utf8'),
     await readFile(new URL('../docs/'+file,import.meta.url),'utf8'),
     'served mirror drift '+file);
 }
});
