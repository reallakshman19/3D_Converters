import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {runXml229NonreleasingNativeCandidate} from
  '../tabs/xml-cii-2019-standalone/integration/xml229-nonreleasing-native-candidate.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const sha=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(s))).toString('hex');
const basis='a'.repeat(64),intentSha='b'.repeat(64),jsonSha='d'.repeat(64);
const candidateCii=()=>{
 const rows=['#$ CONTROL','2 0 0 0 0 0','0 1 0 0 0 0',
   '0 0 0 0 0 0','0','#$ ELEMENTS'];
 for(let i=0;i<2;i++){
   for(let row=0;row<15;row++){
     if(row===0)rows.push((10+i*10)+' '+(20+i*10)+' 0 0 0 0');
     else if(row===12)rows.push('0 '+(i===0?1:0)+' 0 0 0 0');
     else if(row===14)rows.push('0 0 0');
     else rows.push('0 0 0 0 0 0');
   }
 }
 rows.push('#$ RIGID','350 0','#$ UNITS','N.');
 return rows.join('\n')+'\n';
};
const sampleNode=(num,kind,ref,kg,x)=>({
 nativeNodeNumber:num,sourceNodeNumber:num,componentType:kind,
 componentRefNo:ref,endpoint:2,position:[x,0,0],
 rigid:kind==='RIGID'?2:null,weightKg:kg,
});
async function witnessFor(cii){
 return {schema:'XML229.NativeRetainedCandidateWitness.v1',
   evidenceKind:'FIRST_PARTY_RUNTIME_NOT_INDEPENDENT_AUTHORITY',
   engineInputSha256:await sha('<final-weight-bound-engine-input/>'),
   ciiSha256:await sha(cii),weightScale:'10',
   modelElementCount:2,modelRigidCount:1,
   physicalMatch2ConsumptionVerified:false,
   nativeCiiPhysicalSlotVerified:false,nativeCiiReleaseAuthorized:false,
   edges:[
     {nativeElementIndex:0,branchName:'B1',ciiFromNode:10,ciiToNode:20,
       rigidRecordIndex:0,rigidForce:'350',
       from:sampleNode(10,'BRAN','B0',0,0),
       to:sampleNode(20,'RIGID','R1',35,100)},
     {nativeElementIndex:1,branchName:'B1',ciiFromNode:20,ciiToNode:30,
       rigidRecordIndex:null,
       from:sampleNode(20,'RIGID','R1',35,100),
       to:sampleNode(30,'VALV','V1',45,200)},
   ]};
}

function fixture(){
  let changed=false,closed=false,engineCalls=0;
  const session={
    receipt:{basisId:basis,sourceId:'SRC',sourceGenerationId:'G1',originalJsonSha256:jsonSha},
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
        basisId:basis,originalJsonSha256:jsonSha,sourceGenerationId:'G1',finalIntentSha256:intentSha,
        engineInputSha256:await sha(engineInputXmlText),
        nativeCiiReleaseAuthorized:false,nativeCiiPhysicalSlotVerified:false,
        originalPhysicalCount:2,verifiedEnginePhysicalCount:2,
        matches:[
          {branchName:'B1',engineNodeNumber:'20',componentType:'RIGID',
           componentRefNo:'R1',endpoint:'2',enginePosition:'100 0 0',
           engineWeightKg:35},
          {branchName:'B1',engineNodeNumber:'30',componentType:'VALV',
           componentRefNo:'V1',endpoint:'2',enginePosition:'200 0 0',
           engineWeightKg:45},
        ]};
    },
    async prepareEngineInputMasses({engineInputXmlText}){
      assert.equal(engineInputXmlText,'<parity-engine-input/>');
      const enriched='<final-weight-bound-engine-input/>';
      return {
        schema:'XML229.ReviewedEngineMassCandidate.v1',
        engineInputXmlText:enriched,
        transfer:await this.attestEngineInput({engineInputXmlText:enriched}),
        nativeCiiPhysicalSlotVerified:false,nativeCiiReleaseAuthorized:false,
      };
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
    assert.equal(j.sourceText,'<final-weight-bound-engine-input/>');
    assert.equal(j.stagedJsonText,'');
    assert.equal(j.options.outputMode,'cii-only');
    assert.equal(j.xml229NativeCandidateWitness,true);
    const ciiText=candidateCii();
    return {ok:true,ciiText,ciiName:'candidate.cii',
      nativeCandidateWitness:await witnessFor(ciiText)};
  };
  const run=()=>runXml229NonreleasingNativeCandidate({
    job,session,runWorkflow,runEngine,
    assertCurrent(){if(closed)throw Error('STALE_WORKER')},
  });
  return {session,job,run,engineCalls:()=>engineCalls,
    changeFinal:()=>{changed=true},close:()=>{closed=true}};
}
test('attests parity XML before running real engine and returns digest, never CII',async()=>{
  const x=fixture(),result=await x.run();
  assert.equal(x.engineCalls(),1);
  assert.equal(result.status,'ACTUAL_NATIVE_CONVERTER_EXECUTED_NOT_RELEASED');
  assert.equal(result.originalPhysicalCount,2);
  assert.equal(result.ciiSha256,await sha(candidateCii()));
  assert.equal(result.nativeRigidObserved,1);
  assert.equal(result.unresolvedNativeOwners,1);
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
test('a forged applied-mass output cannot enter converter',async()=>{
  const x=fixture(),old=x.session.prepareEngineInputMasses;
  x.session.prepareEngineInputMasses=async a=>({
    ...await old.call(x.session,a),engineInputXmlText:'<forged/>',
  });
  await assert.rejects(x.run(),{code:'XML229_CANDIDATE_ENGINE_TRANSFER_REJECTED'});
  assert.equal(x.engineCalls(),0);
});
test('original staged JSON hash drift blocks Python',async()=>{
  const x=fixture(),old=x.session.attestEngineInput;
  x.session.attestEngineInput=async a=>({...await old(a),
    originalJsonSha256:'e'.repeat(64)});
  await assert.rejects(x.run(),{code:'XML229_CANDIDATE_ENGINE_TRANSFER_REJECTED'});
  assert.equal(x.engineCalls(),0);
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

test('normal production job builder still refuses governed JSON Run',async()=>{
  const {buildXmlCiiWorkflowJobFromUiState}=
    await import('../tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js');
  await assert.rejects(buildXmlCiiWorkflowJobFromUiState({
    sourceKind:'xml',sourceText:'<root/>',
    xml229StagedSourceReceipt:{schema:'XML229.OriginalStagedSourceReceipt.v1'},
  }),/XML229_GOVERNED_NATIVE_CII_HELD/);
});
