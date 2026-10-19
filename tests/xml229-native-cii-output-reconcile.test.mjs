import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {reconcileXml229NonreleasingNativeOutput} from
  '../tabs/xml-cii-2019-standalone/integration/xml229-native-cii-output-reconcile.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(value))).toString('hex');
const basis='a'.repeat(64),inputSha='b'.repeat(64);
function nativeCii({pointers=[1,0],forces=['350 0']}={}){
  const lines=['#$ CONTROL','2 0 0 0 0 0',
    '0 '+forces.length+' 0 0 0 0','0 0 0 0 0 0','0',
    '#$ ELEMENTS'];
  for(const [i,pointer] of pointers.entries()){
    const from=10+i*10,to=20+i*10;
    for(let row=0;row<15;row++){
      if(row===0)lines.push(from+' '+to+' 0 0 0 0');
      else if(row===12)lines.push('0 '+pointer+' 0 0 0 0');
      else if(row===14)lines.push('0 0 0');
      else lines.push('0 0 0 0 0 0');
    }
  }
  lines.push('#$ RIGID',...forces,'#$ UNITS','N.');
  return lines.join('\n')+'\n';
}
const node=(num,kind,ref,kg,x)=>({
  nativeNodeNumber:num,sourceNodeNumber:num,componentType:kind,
  componentRefNo:ref,endpoint:2,position:[x,0,0],
  rigid:kind==='RIGID'?2:null,weightKg:kg,
});
async function fixture(){
  const ciiText=nativeCii();
  const transfer={schema:'XML229.R2.OriginalPhysicalEngineInputTransfer.v1',
    complete:true,nativeCiiReleaseAuthorized:false,
    engineInputSha256:inputSha,originalPhysicalCount:2,
    matches:[
      {branchName:'B1',engineNodeNumber:'20',componentType:'RIGID',
       componentRefNo:'R1',endpoint:'2',enginePosition:'100 0 0',engineWeightKg:35},
      {branchName:'B1',engineNodeNumber:'30',componentType:'VALV',
       componentRefNo:'V1',endpoint:'2',enginePosition:'200 0 0',engineWeightKg:45},
    ],
  };
  const witness={schema:'XML229.NativeRetainedCandidateWitness.v1',
    evidenceKind:'FIRST_PARTY_RUNTIME_NOT_INDEPENDENT_AUTHORITY',
    engineInputSha256:inputSha,ciiSha256:await hash(ciiText),
    weightScale:'10',modelElementCount:2,modelRigidCount:1,
    nativeCiiReleaseAuthorized:false,nativeCiiPhysicalSlotVerified:false,
    physicalMatch2ConsumptionVerified:false,
    edges:[
      {nativeElementIndex:0,ciiFromNode:10,ciiToNode:20,
       branchName:'B1',rigidRecordIndex:0,rigidForce:'350',
       from:node(10,'BRAN','B0',0,0),to:node(20,'RIGID','R1',35,100)},
      {nativeElementIndex:1,ciiFromNode:20,ciiToNode:30,
       branchName:'B1',rigidRecordIndex:null,
       from:node(20,'RIGID','R1',35,100),to:node(30,'VALV','V1',45,200)},
    ],
  };
  return {ciiText,transfer,witness};
}
const run=x=>reconcileXml229NonreleasingNativeOutput(x);
test('real CII RIGID pointer reconciles RIGID; VALV stays unresolved, no release',async()=>{
  const x=await fixture(),got=await run(x);
  assert.equal(got.nativeRigidObserved,1);
  assert.equal(got.unresolved,1);
  assert.equal(got.unresolvedKg,45);
  assert.equal(got.actualNativeRigidRecords,1);
  assert.equal(got.byType.RIGID.nativeRigidObserved,1);
  assert.equal(got.byType.VALV.unresolved,1);
  assert.equal(got.reasons.NATIVE_MASS_RULE_REQUIRED,1);
  assert.equal(got.nativeCiiPhysicalSlotVerified,false);
  assert.equal(got.nativeCiiReleaseAuthorized,false);
  assert.equal(got.physicalMatch2ConsumptionVerified,false);
  assert.equal('ciiText' in got,false);
  assert.equal('edges' in got,false);
});
test('incorrect R2 Final kg vs actual native slot refuses',async()=>{
  const x=await fixture();
  x.transfer.matches[0].engineWeightKg=40;
  await assert.rejects(run(x),{code:'XML229_NATIVE_PHYSICAL_MASS_DRIFT'});
});
test('swapped/native-element pointer and source-owner collision refuse',async()=>{
  const x=await fixture();
  x.witness.edges[0].rigidRecordIndex=null;
  await assert.rejects(run(x),{code:'XML229_NATIVE_WITNESS_ELEMENT_DRIFT'});
  const y=await fixture();
  y.transfer.matches[1]={...y.transfer.matches[0]};
  const out=await run(y);
  assert.equal(out.nativeRigidObserved,1);
  assert.equal(out.reasons.DUPLICATE_NATIVE_PHYSICAL_OWNER,1);
});
test('original source owner dropped or split is diagnosed, not invented',async()=>{
  const x=await fixture();
  x.witness.edges[1].to.componentRefNo='CHANGED';
  const out=await run(x);
  assert.equal(out.reasons.RETAINED_OWNER_NOT_FOUND,1);
  assert.equal(out.nativeCiiReleaseAuthorized,false);
});
test('byte-swapped actual CII, orphan or duplicated RIGID pointer refuses',async()=>{
  const x=await fixture();
  x.ciiText+='DRIFT';
  await assert.rejects(run(x),{code:'XML229_NATIVE_CII_SHA_DRIFT'});
  const y=await fixture();
  y.ciiText=nativeCii({pointers:[0,0]});
  y.witness.ciiSha256=await hash(y.ciiText);
  await assert.rejects(run(y),{code:'XML229_NATIVE_CII_RIGID_ORPHAN'});
  const z=await fixture();
  z.ciiText=nativeCii({pointers:[1,1]});
  z.witness.ciiSha256=await hash(z.ciiText);
  await assert.rejects(run(z),{code:'XML229_NATIVE_CII_POINTER_DUPLICATE'});
});
test('forged release authority or model count cannot qualify witness',async()=>{
  const x=await fixture();x.witness.nativeCiiReleaseAuthorized=true;
  await assert.rejects(run(x),{code:'XML229_NATIVE_WITNESS_UNQUALIFIED'});
  const y=await fixture();y.witness.modelElementCount=3;
  await assert.rejects(run(y),{code:'XML229_NATIVE_WITNESS_COUNT_DRIFT'});
});
