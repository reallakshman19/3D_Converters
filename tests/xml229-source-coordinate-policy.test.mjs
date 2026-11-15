import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {nativeTestPython} from './helpers/native-python.mjs';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {restraintAuditConfig} from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit.js';
installWeightBasisXmlDom(globalThis);
const policy={schema:'XML229.SourceCoordinatePolicy.v1',positionField:'POS',
 translationMm:['0','0','100000'],xmlQuantumMm:'0.01',identityMode:'exact-branch-member'};
const cfg={xml229PhysicalVertexPrefinal:true,xml229SourceCoordinatePolicy:policy,
 defaultStiffness:123456,defaultFriction:0};
const node=(number,name,pos)=>`<Node><NodeNumber>${number}</NodeNumber><NodeName>${name}</NodeName>`+
 `<ComponentType>ATTA</ComponentType><Position>${pos}</Position></Node>`;
const xml=(...nodes)=>'<PipeStressExport><Pipe><Branch><Branchname>/L/B1</Branchname>'+nodes.join('')+'</Branch></Pipe></PipeStressExport>';
const source=()=>xml(node(10,'PS-A','100.00 0.00 101418.40'));
const json=(extra={})=>JSON.stringify([{type:'BRANCH',name:'/L/B1',children:[{
 type:'GUIDE',attributes:{NAME:'/PS-A',DTXR:'GUIDE',NODETYPE:'10',CMPSUPGAP:'5MM',
 POS:{x:'100',y:'0',z:'1418.405'},POSI:'999 999 999',...extra}}]}]);
const stage=(src=source(),staged=json(),config=cfg)=>prepareXml229PrefinalRestraints({xmlText:src,stagedJsonText:staged,config});
function native(src,staged,result,config=cfg){
 const packet={originalXmlText:src,
   prefinalXmlText:new XMLSerializer().serializeToString(result.document),stagedJsonText:staged,
   config,physicalVertexMemberCensus:result.proof.physicalVertexMemberCensus};
 if(process.env.XML229_COORDINATE_DEBUG==='1')fs.writeFileSync('artifacts/local/xmlcii-glrd3610/coordinate-policy-native-debug.json',JSON.stringify(packet));
 return spawnSync(nativeTestPython,['tests/xml229-physical-vertex-v2-native-replay.py'],{
  encoding:'utf8',timeout:20000,input:JSON.stringify(packet)});
}
test('explicit POS datum and half-quantum envelope preserve original coordinates with native replay',async()=>{
 const r=await stage();assert.equal(r.proof.physicalVertexMemberCensus.boundSourceSupportMembers,1);
 assert.equal(r.document.getElementsByTagName('Position')[0].textContent,'100.00 0.00 101418.40');
 assert.equal(native(source(),json(),r).status,0);
 assert.equal(r.proof.restraintAudit.records[0].source.member.coordinateEvidence.positionField,'POS');
});
test('policy is included in the audit config binding',()=>{
 assert.deepEqual(restraintAuditConfig(cfg).xml229SourceCoordinatePolicy,policy);
});
test('same coordinates revisited in a branch use exact member identity without merging vertices',async()=>{
 const src=xml(node(10,'PS-OTHER','100.00 0.00 101418.40'),node(20,'MID','200.00 0.00 101418.40'),node(30,'PS-A','100.00 0.00 101418.40'));
 const r=await stage(src);const nodes=[...r.document.getElementsByTagName('Node')];
 assert.equal(nodes[2].getElementsByTagName('Restraint')[0].getElementsByTagName('Type')[0].textContent,'GUI');
 assert.equal(nodes[0].getElementsByTagName('Restraint')[0].getElementsByTagName('Type')[0].textContent,'+Y');
 assert.equal(native(src,json(),r).status,0);
});
test('missing or duplicated member identity holds despite coordinate proximity',async()=>{
 await assert.rejects(stage(source(),json({NAME:''})),{code:'XML229_V2_SOURCE_SUPPORT_UNBOUND'});
 await assert.rejects(stage(xml(node(10,'PS-A','100.00 0.00 101418.40'),node(20,'MID','200.00 0.00 101418.40'),node(30,'PS-A','100.00 0.00 101418.40'))),{code:'XML229_V2_SOURCE_SUPPORT_UNBOUND'});
});
test('one decimal beyond the declared half-quantum envelope is refused exactly',async()=>{
 await assert.rejects(stage(source(),json({POS:{x:'100',y:'0',z:'1418.405000000000000001'}})),{code:'XML229_V2_SOURCE_SUPPORT_UNBOUND'});
});
test('invalid policy and competing legacy datum are refused rather than ignored',async()=>{
 await assert.rejects(stage(source(),json(),{...cfg,xml229SourceCoordinatePolicy:{...policy,translationMm:['0','0','NaN']}}),{code:'XML229_COORDINATE_POLICY_INVALID'});
 await assert.rejects(stage(source(),json(),{...cfg,dtxrPositionOffset:{enabled:true,zOffset:100000}}),{code:'XML229_COORDINATE_POLICY_DATUM_CONFLICT'});
});
test('source field is explicit and does not silently fall back from POS to POSI',async()=>{
 await assert.rejects(stage(source(),json({POS:null})),{code:'XML229_V2_SOURCE_SUPPORT_UNBOUND'});
 const c={...cfg,xml229SourceCoordinatePolicy:{...policy,positionField:'POSI'}};
 const staged=json({POSI:'E 100 N 0 U 1418.405'}),r=await stage(source(),staged,c);
 assert.equal(native(source(),staged,r,c).status,0);
});
test('native independently rejects policy translation tampering',async()=>{
 const r=await stage();const changed={...cfg,xml229SourceCoordinatePolicy:{...policy,translationMm:['0','0','99999']}};
 const py=native(source(),json(),r,changed);assert.notEqual(py.status,0);
 assert.match(py.stderr,/NATIVE_V2_SOURCE_SUPPORT_UNBOUND/);
});
test('absent policy retains strict original exact-coordinate behavior',async()=>{
 const {xml229SourceCoordinatePolicy,...old}=cfg;
 await assert.rejects(stage(source(),json(),old),{code:'XML229_V2_SOURCE_SUPPORT_UNBOUND'});
});
