import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {digestXmlCiiParityText}
 from '../tabs/xml-cii-2019-standalone/xml-cii-run-parity-evidence.js';
import {observeXml229NativeEngineBoundary,XML229_NATIVE_EVIDENCE_SCHEMA}
 from '../tabs/xml-cii-2019-standalone/xml-cii-native-output-consumption-evidence.js';
import {runXmlCii2019WorkflowService}
 from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js';

const sha=s=>createHash('sha256').update(s).digest('hex');
const original='<Plant><Branch><Branchname>/OWNER-S8811000-91261M7/B1</Branchname></Branch></Plant>';
const enriched=original.replace('</Branch>','<Node><Weight>35</Weight></Node></Branch>');
const cii='CII RESULTS\nMASS=35\n';
const configured={regexTester:{formats:[{lineKey:{regex:'(S8811000)'},
 pipingClass:{regex:'(91261M7)'}}]}};
const job={sourceKind:'xml',sourceText:original,sourceName:'owner.xml',
 supportConfigJson:JSON.stringify(configured),options:{outputMode:'both'}};
function parity(digest=digestXmlCiiParityText(enriched)){
 return {applied:true,xmlText:enriched,error:null,logs:[],stats:{},
  branchRows:[{branchName:'/OWNER-S8811000-91261M7/B1',extractionStatus:'MATCHED',
    lineKey:'S8811000',pipingClass:'91261M7',matchedFormatIndex:0}],
  evidence:{ok:true,engineInputDigest:digest,mismatchCount:0,comparisons:1}};
}
function engineResult(text=cii){
 return {ok:true,sourceKind:'xml',outputKind:'enrichedXML',ciiText:text,
  ciiName:'owner.cii',logs:[],diagnostics:{warnings:[]}};
}
test('SHA-256 observation binds the *exact* native engine call input and returned output',async()=>{
 let calls=0;
 const result=await runXmlCii2019WorkflowService(job,{
  captureNativeEngineBoundary:true,
  runParityEnricher:async()=>parity(),
  engineRunner:async input=>{
   calls++;
   assert.equal(input.sourceText,enriched);
   return engineResult();
  },
 });
 assert.equal(calls,1);
 assert.equal(result.ok,true);
 const proof=result.diagnostics.xml229NativeEngineBoundary;
 assert.equal(proof.schema,XML229_NATIVE_EVIDENCE_SCHEMA);
 assert.equal(proof.engineBoundaryVerified,true);
 assert.equal(proof.nativeCiiProduced,true);
 assert.equal(proof.actualEngineInputEqualsVerifiedParity,true);
 assert.equal(proof.originalSourceSha256,sha(original));
 assert.equal(proof.engineInputSha256,sha(enriched));
 assert.equal(proof.parityInputSha256,sha(enriched));
 assert.equal(proof.ciiOutputSha256,sha(cii));
 assert.equal(proof.status,'INPUT_AND_OUTPUT_SHA256_OBSERVED');
 assert.equal(proof.physicalMatch2ConsumptionVerified,false);
 assert.equal(proof.nativeCiiReleaseAuthorized,false);
 assert.match(proof.reason,/NOT YET ATTESTED/);
});
test('matching original/engine hash alone never attests per-physical Final weight',async()=>{
 const witness=await observeXml229NativeEngineBoundary({
  originalSourceText:original,parityXmlText:enriched,
  parityEvidence:parity().evidence,
  engineJob:{sourceText:enriched},engineResult:engineResult(),
 });
 assert.equal(witness.nativeCiiReleaseAuthorized,false);
 assert.equal(witness.physicalMatch2ConsumptionVerified,false);
});
test('altered converter source bytes fail parity-to-engine provenance',async()=>{
 const witness=await observeXml229NativeEngineBoundary({
  originalSourceText:original,parityXmlText:enriched,
  parityEvidence:parity().evidence,
  engineJob:{sourceText:enriched+'\n'},engineResult:engineResult(),
 });
 assert.equal(witness.engineBoundaryVerified,false);
 assert.equal(witness.status,'BLOCKED_INPUT_PARITY_OR_IDENTITY');
 assert.equal(witness.nativeCiiReleaseAuthorized,false);
});
test('a bogus old parity digest cannot be promoted by current engine output',async()=>{
 const witness=await observeXml229NativeEngineBoundary({
  originalSourceText:original,parityXmlText:enriched,
  parityEvidence:parity('fnv1a32:deadbeef:999').evidence,
  engineJob:{sourceText:enriched},engineResult:engineResult(),
 });
 assert.equal(witness.actualEngineInputEqualsVerifiedParity,false);
 assert.equal(witness.nativeCiiReleaseAuthorized,false);
});
test('empty, failed or missing CII output has no positive native boundary',async()=>{
 for(const out of [engineResult(''),{...engineResult(),ok:false},
   {...engineResult(),ciiName:''},{...engineResult(),ciiText:null}]){
  const witness=await observeXml229NativeEngineBoundary({
   originalSourceText:original,parityXmlText:enriched,
   parityEvidence:parity().evidence,
   engineJob:{sourceText:enriched},engineResult:out,
  });
  assert.equal(witness.engineBoundaryVerified,false);
  assert.equal(witness.nativeCiiReleaseAuthorized,false);
 }
});
test('legacy converter remains opt-in; default results do not claim R2 native attestation',async()=>{
 const result=await runXmlCii2019WorkflowService(job,{
  runParityEnricher:async()=>parity(),
  engineRunner:async()=>engineResult(),
 });
 assert.equal(result.ok,true);
 assert.equal(result.diagnostics.xml229NativeEngineBoundary,undefined);
});
test('original and docs native consumption code is exactly mirrored',async()=>{
 for(const p of [
  'tabs/xml-cii-2019-standalone/xml-cii-native-output-consumption-evidence.js',
  'tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js']){
  assert.deepEqual(await readFile(new URL('../'+p,import.meta.url)),
    await readFile(new URL('../docs/'+p,import.meta.url)));
 }
});
