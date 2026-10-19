import test from 'node:test';
import assert from 'node:assert/strict';
import {runXmlCii2019Workflow} from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js';

const source='<PipeStressExport><Pipe><Branch><Branchname>/SYNTH/B1</Branchname>'+
 '<Node><NodeNumber>10</NodeNumber><Position>0 0 0</Position></Node>'+
 '<Node><NodeNumber>20</NodeNumber><Position>100 0 0</Position></Node>'+
 '</Branch></Pipe></PipeStressExport>';
const parity={applied:true,error:null,
 evidence:{schema:'xml-cii-standalone-run-parity-evidence/v1',
   ok:true,engineInputDigest:'FIXED-PARITY-INPUT'},
 xmlText:'<PipeStressExport><Pipe><Branch><Branchname>/SYNTH/B1</Branchname>'+
 '<Node><NodeNumber>10</NodeNumber><Position>0 0 0</Position></Node>'+
 '<Node><NodeNumber>20</NodeNumber><Position>100 0 0</Position>'+
 '<Weight>99</Weight></Node></Branch></Pipe></PipeStressExport>',
 stats:{},logs:[],branchRows:[]};
function job(){return {sourceKind:'xml',sourceText:source,
 sourceName:'source.xml',supportConfigJson:'{}',options:{outputMode:'cii-only'}}}
test('REAL API→service→injected engine callback is called once on exact parity XML',async()=>{
 let calls=0;
 const result=await runXmlCii2019Workflow(job(),{
   runParityEnricher:async()=>parity,
   engineRunner:async actual=>{
     calls++;
     assert.equal(actual.sourceText,parity.xmlText);
     assert.equal(actual.sourceKind,'xml');
     // Source-bound candidate would rebind the erroneous 99 here, not let
     // the built-in native runner race ahead of its callback.
     return {ok:true,sourceKind:'xml',ciiText:'CII TEST-ONLY',
       ciiName:'fixture.cii',logs:[],diagnostics:{warnings:[]}};
   },
 });
 assert.equal(calls,1,'real service skipped current Worker custody engine port');
 assert.equal(result.ok,true);
 assert.equal(result.ciiText,'CII TEST-ONLY');
});
test('REAL API prevents native callback on parity refusal',async()=>{
 let calls=0;
 const result=await runXmlCii2019Workflow(job(),{
   runParityEnricher:async()=>({...parity,applied:false,error:'PARITY_HELD'}),
   engineRunner:async()=>{calls++;throw new Error('must not execute')},
 });
 assert.equal(calls,0);
 assert.equal(result.ok,false);
 assert.match(result.error,/PARITY_HELD/);
});
test('default ordinary Run engine import remains unchanged; override is explicit runtime-only',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=await readFile(new URL('../tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js',import.meta.url),'utf8');
 assert.match(src,/typeof runtime\.engineRunner === 'function'/);
 assert.match(src,/runXmlCii2019StandaloneEngineJob/);
 assert.match(src,/engineRunner\(engineJob, runtime\)/);
});
