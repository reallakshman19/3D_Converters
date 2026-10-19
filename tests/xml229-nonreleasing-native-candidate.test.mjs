import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {runXml229NonreleasingNativeCandidate} from
  '../tabs/xml-cii-2019-standalone/integration/xml229-nonreleasing-native-candidate.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const sha=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(s))).toString('hex');
const basis='a'.repeat(64),intentSha='b'.repeat(64);
function fixture(){
  let changed=false,closed=false,engineCalls=0;
  const session={
    receipt:{basisId:basis,sourceId:'SRC',sourceGenerationId:'G1'},
    get closed(){return closed},
    async readNativeFinalIntent(){
      return {schema:'XML229.NativeFinalPhysicalIntent.v1',
        eligibleForEngineBinding:true,nativeCiiReleaseAuthorized:false,
        basisId:basis,sourceGenerationId:'G1',physicalCount:2,
        intentSha256:changed?'c'.repeat(64):intentSha};
    },
    async attestEngineInput({engineInputXmlText}){
      return {schema:'XML229.R2.OriginalPhysicalEngineInputTransfer.v1',
        status:'ENGINE_INPUT_MASS_TRANSFER_VERIFIED_ONLY',
        mappingKind:'STRICT_EXACT_PRE_SPLIT',complete:true,transferObserved:true,
        basisId:basis,sourceGenerationId:'G1',finalIntentSha256:intentSha,
        engineInputSha256:await sha(engineInputXmlText),
        nativeCiiReleaseAuthorized:false,nativeCiiPhysicalSlotVerified:false,
        originalPhysicalCount:2,verifiedEnginePhysicalCount:2,
        matches:[{originalOccurrenceId:'A'},{originalOccurrenceId:'B'}]};
    },
  };
  const job={sourceKind:'xml',sourceText:'<original/>',
    stagedJsonText:'{"source":"original"}',options:{outputMode:'both'}};
  const runWorkflow=async(j,{engineRunner})=>engineRunner({
    ...j,sourceKind:'xml',sourceText:'<parity-engine-input/>',
    options:{outputMode:'both'},
  });
  const runEngine=async j=>{
    engineCalls++;
    assert.equal(j.sourceText,'<parity-engine-input/>');
    assert.equal(j.stagedJsonText,'');
    assert.equal(j.options.outputMode,'cii-only');
    return {ok:true,ciiText:'native CII bytes',ciiName:'candidate.cii'};
  };
  const run=()=>runXml229NonreleasingNativeCandidate({
    job,session,runWorkflow,runEngine,
    assertCurrent(){if(closed)throw Error('STALE_WORKER')},
  });
  return {session,job,run,engineCalls:()=>engineCalls,
    changeFinal:()=>{changed=true},close:()=>{closed=true},
    setRunner:fn=>{runWorkflow=fn}};
}
test('attests parity XML before running real engine and returns digest, never CII',async()=>{
  const x=fixture(),result=await x.run();
  assert.equal(x.engineCalls(),1);
  assert.equal(result.status,'ACTUAL_NATIVE_CONVERTER_EXECUTED_NOT_RELEASED');
  assert.equal(result.originalPhysicalCount,2);
  assert.equal(result.ciiSha256,await sha('native CII bytes'));
  assert.equal(result.nativeCiiPhysicalSlotVerified,false);
  assert.equal(result.physicalMatch2ConsumptionVerified,false);
  assert.equal(result.nativeCiiReleaseAuthorized,false);
  assert.equal(result.ciiDownloadAuthorized,false);
  assert.equal('ciiText' in result,false);
  assert.equal('matches' in result,false);
});
test('a forged SHA or incomplete original physical transfer blocks Python invocation',async()=>{
  for(const forged of [
    evidence=>({...evidence,engineInputSha256:'f'.repeat(64)}),
    evidence=>({...evidence,verifiedEnginePhysicalCount:1}),
    evidence=>({...evidence,nativeCiiReleaseAuthorized:true}),
  ]){
    const x=fixture(),old=x.session.attestEngineInput;
    x.session.attestEngineInput=async a=>forged(await old(a));
    await assert.rejects(x.run(),{code:'XML229_CANDIDATE_ENGINE_TRANSFER_REJECTED'});
    assert.equal(x.engineCalls(),0);
  }
});
test('unqualified Final and closed Worker fail without native converter',async()=>{
  const x=fixture(),old=x.session.readNativeFinalIntent;
  x.session.readNativeFinalIntent=async()=>({
    ...await old(),eligibleForEngineBinding:false,
  });
  await assert.rejects(x.run(),{code:'XML229_CANDIDATE_FINAL_INTENT_UNQUALIFIED'});
  assert.equal(x.engineCalls(),0);
  const y=fixture();y.close();
  await assert.rejects(y.run(),{code:'XML229_CANDIDATE_LIVE_SOURCE_REQUIRED'});
  assert.equal(y.engineCalls(),0);
});
test('Final review drift after converter refuses candidate summary',async()=>{
  const x=fixture(),old=x.session.readNativeFinalIntent;let n=0;
  x.session.readNativeFinalIntent=async()=>{const value=await old();if(++n===2)return {
    ...value,intentSha256:'c'.repeat(64),
  };return value;};
  await assert.rejects(x.run(),{code:'XML229_CANDIDATE_FINAL_CHANGED'});
  assert.equal(x.engineCalls(),1);
});
test('workflow that never reaches native engine cannot report success',async()=>{
  const job={sourceKind:'xml',sourceText:'<source/>',options:{}};
  const x=fixture();
  await assert.rejects(runXml229NonreleasingNativeCandidate({
    job,session:x.session,runWorkflow:async()=>({ok:false,ciiText:null}),
  }),{code:'XML229_CANDIDATE_NATIVE_OUTPUT_UNAVAILABLE'});
  assert.equal(x.engineCalls(),0);
});
