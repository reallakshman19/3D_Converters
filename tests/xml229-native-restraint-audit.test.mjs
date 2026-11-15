import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {digestUtf8} from '../contracts/gc-pw-v1/contract.mjs';
import * as auditApi from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-verify.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';

// Explicit transport/mass/UI stubs isolate the production native-candidate
// restraint gate. The source producer, source checks and CII parser are real.
const fixture=fs.readFileSync(new URL('./xml-cii-mds-position-restraints.test.mjs',import.meta.url),'utf8');
vm.runInThisContext(fixture.slice(fixture.indexOf('class SimpleElement'),fixture.indexOf('const { closeGovernedMdsPositionRestraintsXml }')));
const xml='<PipeStressExport><Branch><Branchname>/P/B1</Branchname><Node><NodeNumber>3600</NodeNumber><ComponentType>PIPE</ComponentType><Position>0 0 0</Position></Node><Node><NodeNumber>3610</NodeNumber><NodeName>PS-9.1</NodeName><ComponentType>ANCI</ComponentType><Position>10 0 0</Position><Restraint><Type>+Y</Type><Stiffness>1000</Stiffness><Gap>0</Gap><Friction>0.3</Friction></Restraint></Node></Branch></PipeStressExport>';
const json=JSON.stringify([{type:'BRANCH',name:'/P/B1',children:[{type:'SUPPORT',attributes:{
  NAME:'/PS-9.1',POS:{x:10,y:0,z:0},MDSDTXR:'LINE STOP',CMPSUPGAP:'25MM GAP'}}]}]);
const config={defaultStiffness:1000,defaultFriction:0.3,defaultGap:0};
function cii(gap=25) {
  const zero='0 0 0 0 0 0';
  const element=['3600 3610 10 0 0 50',...Array(9).fill(zero),'0 /P/B1',zero,'0 0 0 1 0 0',zero,'0 0 0'];
  const slots=['3610 14 1000 0 0.3 0','0 1 0','0','0',`3610 9 1000 ${gap} 0 0`,'0 0 1','0','0',
    ...Array(4).fill([zero,'0 0 0','0','0']).flat()];
  return ['#$ CONTROL','1','#$ ELEMENTS',...element,'#$ RIGID','#$ RESTRANT',...slots,'#$ MISCEL_1','0'].join('\n');
}

async function runner({gap=25,converterFails=false,changedConfig=false}={}) {
  const prepared=await prepareXml229PrefinalRestraints({xmlText:xml,stagedJsonText:json,config});
  const packet={basisId:'basis',sourceId:'source',sourceGenerationId:'generation',physicalCount:1,
    originalJsonSha256:await digestUtf8(json),sourceXmlSha256:await digestUtf8(xml),finalIntentSha256:'intent',
    finalizedGeometry:{prefinalRestraints:prepared.proof,xmlText:new XMLSerializer().serializeToString(prepared.document),
      retainedSourceOrdinalsByBranch:[[0,1]]}};
  const completion={...packet,verifiedPhysicalCount:1,counts:{unresolved:0,match1:0}};
  const session={readCompletion:async()=>completion,readNativeFinalPacket:async()=>packet,
    readNativeFinalIntent:async()=>({intentSha256:'intent'})};
  const counts={engineering:0,mass:0};
  const native={ok:!converterFails,ciiText:converterFails?null:cii(gap),enrichedText:packet.finalizedGeometry.xmlText,
    enrichedName:'native.xml',xml229NativeMassDiagnostic:{sourcePhysicalCount:1},
    diagnostics:{engineSourceDigests:[{script:'fixture.py',sha256:'0'.repeat(64)}]}};
  const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){
    for(const [key,value] of Object.entries(exports))this.setExport(key,value);
  });
  const modules={
    '../xml-cii-workflow-ui-adapter.js?v=20261113-x4-1':{readTextFile:async()=>'',sourceNameFromState:()=> 'case.xml',
      workflowOptionsFromState:()=>({}),enrichSupportConfigJson:async()=>JSON.stringify(changedConfig?{...config,defaultGap:1}:config)},
    '../xml-cii-workflow-engine-client.js':{runXmlCii2019StandaloneEngineJob:async()=>native},
    './xml229-native-source-custody.mjs':{resolveXml229NativeCandidateSource:async()=>({sourceText:xml,stagedJsonText:json})},
    './xml229-native-json-reattach.mjs?v=20261113-x5a-2':{getXml229NativeJsonReattachment:()=>null},
    '../../../converters/xml-cii2019-core/xml229-native-cii-independent-reconciliation.mjs':{
      reconcileXml229ActualCiiAgainstFinal:async()=>{counts.mass++;return {massConsumptionVerified:true,
        strictOneToOneOwnerMatch:true,nativeCiiReleaseAuthorized:true,status:'VERIFIED',physicalCount:1,nativeRigidCount:1,
        actualCiiSha256:await digestUtf8(native.ciiText)};}},
    './xml229-native-owner-preflight.mjs':{requireXml229NativeOwnerPreflight:()=>{}},
    './xml229-native-converter-failure-diagnostic.mjs':{diagnoseXml229NativeConverterFailure:()=>({code:'NATIVE_TEST_CONVERTER_FAILED'})},
    '../../../converters/xml-cii-2019-standalone/native-enriched-artifact.js':{
      nativeEnrichedFields:value=>value?.enrichedText?{enrichedText:value.enrichedText,enrichedName:value.enrichedName}:{}},
    './xml-cii-adapted-propagation-proof.mjs':{verifyCiiEngineeringAgainstNativeXml:()=>{
      counts.engineering++;return {status:'VERIFIED',elements:1,restraints:2};}},
    '../../../converters/xml-cii-2019-standalone/engine-progress.mjs':{reportNativeRunPhase:()=>{}},
    '../xml-cii-restraint-audit-verify.js':auditApi,
  };
  const module=new vm.SourceTextModule(fs.readFileSync(new URL(
    '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-native-cii-candidate-run.mjs',import.meta.url),'utf8'));
  await module.link(name=>{if(!modules[name])throw Error('Unexpected native dependency '+name);return synthetic(modules[name]);});
  await module.evaluate();
  return {counts,run:()=>module.namespace.runXml229NativeCiiMassCandidate({state:{stagedJsonText:json},session,isCurrent:()=>true})};
}

test('native candidate preserves verified audit, exact slot and executed script identity',async()=>{
  const f=await runner(),result=await f.run();
  assert.equal(result.restraintAudit.status,'VERIFIED');
  assert.equal(result.restraintAudit.run.finalIntentSha256,'intent');
  assert.equal(result.restraintAudit.run.engineSourceDigests[0].script,'fixture.py');
  assert.equal(result.restraintAudit.records.find(r=>r.after?.Type==='LIM').observed.slotIndex,2);
  assert.equal(f.counts.engineering,1);assert.equal(f.counts.mass,1);
});

test('wrong CII gap prevents native success before other success flags can authorize output',async()=>{
  const f=await runner({gap:0});
  await assert.rejects(f.run(),error=>error.code==='NATIVE_CII_RESTRAINT_AUDIT_FAILED'&&
    error.xml229RestraintAudit.status==='FAILED'&&error.xml229RestraintAudit.records.some(r=>r.status==='VALUE_MISMATCH'));
  assert.equal(f.counts.engineering,0);assert.equal(f.counts.mass,0);
});

test('changed effective restraint config refuses a previously recorded Final audit',async()=>{
  const f=await runner({changedConfig:true});
  await assert.rejects(f.run(),error=>error.xml229RestraintAudit?.errors[0].code==='RESTRAINT_AUDIT_BASIS_STALE');
});

test('converter failures retain recorded XML decisions without claiming CII verification',async()=>{
  const f=await runner({converterFails:true});
  await assert.rejects(f.run(),error=>error.code==='NATIVE_TEST_CONVERTER_FAILED'&&
    error.xml229RestraintAudit.status==='CII_NOT_RUN'&&error.xml229RestraintAudit.records.length===2);
});
