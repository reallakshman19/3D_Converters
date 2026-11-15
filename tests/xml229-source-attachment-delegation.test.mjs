import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {nativeTestPython} from './helpers/native-python.mjs';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {restraintAuditConfig} from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit.js';
import {validateRestraintAuditSource} from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-source.js';
import {digestCanonical} from '../contracts/gc-pw-v1/contract.mjs';
import {restraintAuditCsv} from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-export.js';
installWeightBasisXmlDom(globalThis);
const policy={schema:'XML229.SourceAttachmentPolicy.v1',unclassifiedAtta:'existing-xml-default'};
const cfg={xml229PhysicalVertexPrefinal:true,defaultStiffness:123456,defaultGap:7,defaultFriction:0,
 xml229SourceCoordinatePolicy:{schema:'XML229.SourceCoordinatePolicy.v1',positionField:'POS',
  translationMm:['0','0','0'],xmlQuantumMm:'0.01',identityMode:'exact-branch-member'},
 xml229SourceAttachmentPolicy:policy};
const node=(number,ref,pos='100.00 0.00 0.00',rest='',kind='ATTA')=>
 `<Node><NodeNumber>${number}</NodeNumber><ComponentRefNo>${ref}</ComponentRefNo><NodeName></NodeName>`+
 `<ComponentType>${kind}</ComponentType><Position>${pos}</Position>${rest}</Node>`;
const xml=(...nodes)=>'<PipeStressExport><Pipe><Branch><Branchname>/L/B1</Branchname>'+nodes.join('')+'</Branch></Pipe></PipeStressExport>';
const source=()=>xml(node(10,'=1/1'));
const attachment=(overrides={})=>({type:'SUPPORT',attributes:{TYPE:'ATTA',RAW_TYPE:'ATTA',
 NAME:'=1/1',REF:'=1/1',SPRE:'/CAT/ATTA-80',DTXR:'---',POS:{x:100,y:0,z:0},...overrides}});
const staged=(...members)=>JSON.stringify([{type:'BRANCH',name:'/L/B1',children:members}]);
const stage=(src=source(),json=staged(attachment()),config=cfg)=>prepareXml229PrefinalRestraints({xmlText:src,stagedJsonText:json,config});
const field=(n,k)=>n.getElementsByTagName(k)[0]?.textContent||'';
function replay(src,json,result,config=cfg,census=result.proof.physicalVertexMemberCensus){
 return spawnSync(nativeTestPython,['tests/xml229-physical-vertex-v2-native-replay.py'],{encoding:'utf8',
  timeout:20000,input:JSON.stringify({originalXmlText:src,prefinalXmlText:new XMLSerializer().serializeToString(result.document),
   stagedJsonText:json,config,physicalVertexMemberCensus:census})});
}
test('explicit generic ATTA delegation retains policy-derived default and accounts for its source identity',async()=>{
 const json=staged(attachment()),r=await stage(source(),json),c=r.proof.physicalVertexMemberCensus;
 assert.equal(c.sourceSupportMembers,1);assert.equal(c.sourceAttachmentMembersDelegated,1);
 assert.equal(c.sourceRestraintMembersProjected,0);assert.equal(c.projectedSlotCount,0);
 assert.equal(field(r.document,'Type'),'+Y');assert.equal(field(r.document,'Gap'),'7');
 const a=r.proof.restraintAudit,d=a.attachmentDelegation;
 assert.equal(d.members.length,1);assert.equal(d.members[0].source.path,'$[0].children[0]');
 assert.equal(d.members[0].disposition,'EXISTING_ATTA_DEFAULT');
 assert.equal(a.records[0].source.kind,'config-default');assert.equal(a.records[0].source.attachment.reason,'xml-atta-default-delegation');
 assert.equal(a.records[0].fields.find(f=>f.name==='Type').evidence.authority,'atta-default/config');
 assert.equal(replay(source(),json,r).status,0);
});
test('absent policy keeps the unclassified member hold; policy is bound in effective audit config',async()=>{
 const {xml229SourceAttachmentPolicy,...old}=cfg;
 await assert.rejects(stage(source(),staged(attachment()),old),{code:'XML229_NODAL_SUPPORT_KIND_REQUIRED'});
 assert.deepEqual(restraintAuditConfig(cfg).xml229SourceAttachmentPolicy,policy);
});
test('original authored restraint survives delegation exactly and remains original-XML authority',async()=>{
 const rest='<Restraint source="original"><Type>LIM</Type><Gap>55</Gap><Stiffness>987</Stiffness></Restraint>';
 const src=xml(node(10,'=1/1','100.00 0.00 0.00',rest)),json=staged(attachment()),r=await stage(src,json);
 assert.equal(field(r.document,'Type'),'LIM');assert.equal(field(r.document,'Gap'),'55');
 assert.equal(r.proof.restraintAudit.records[0].source.kind,'original-xml');
 assert.equal(r.proof.restraintAudit.attachmentDelegation.members[0].disposition,'ORIGINAL_XML_PRESERVED');
 const p=replay(src,json,r);assert.equal(p.status,0,p.stderr);
});
test('explicit NODETYPE wins; invalid zero and nonblank unclassified engineering fields never delegate',async()=>{
 const json=staged(attachment({NODETYPE:'10',CMPSUPGAP:'5MM'})),r=await stage(source(),json);
 assert.equal(r.proof.physicalVertexMemberCensus.sourceAttachmentMembersDelegated,0);
 assert.equal(field(r.document,'Type'),'GUI');assert.equal(replay(source(),json,r).status,0);
 for(const extra of [{NODETYPE:'0'},{NODESTIFF:'0'},{DESCRIPTION:'FLOOR OPENING'},{MDSSUPPTYPE:'UNQUALIFIED'}]){
  await assert.rejects(stage(source(),staged(attachment(extra))));
 }
});
test('ANCI source and mismatched original XML type cannot masquerade as a generic ATTA',async()=>{
 await assert.rejects(stage(source(),staged(attachment({TYPE:'ANCI',RAW_TYPE:'ANCI'}))));
 await assert.rejects(stage(xml(node(10,'=1/1','100.00 0.00 0.00','','ANCI'))));
});
test('duplicate original attachment identity and shared projected vertex are held',async()=>{
 await assert.rejects(stage(source(),staged(attachment(),attachment())),{code:'XML229_ATTACHMENT_IDENTITY_REUSED'});
 await assert.rejects(stage(source(),staged(attachment(),attachment({NODETYPE:'10',CMPSUPGAP:'5MM'}))),
  {code:'XML229_ATTACHMENT_ROLE_OVERLAP_REVIEW_REQUIRED'});
});
test('native source census refuses omitted delegation and disabled policy even with a forged Worker claim',async()=>{
 const json=staged(attachment()),r=await stage(source(),json),c={...r.proof.physicalVertexMemberCensus,sourceAttachmentMembersDelegated:0};
 const py=replay(source(),json,r,cfg,c);assert.notEqual(py.status,0);assert.match(py.stderr,/NATIVE_V2_MEMBER_CENSUS_DRIFT/);
 const {xml229SourceAttachmentPolicy,...off}=cfg;
 assert.notEqual(replay(source(),json,r,off).status,0);
});
test('invalid attachment policy is rejected instead of silently changing role authority',async()=>{
 await assert.rejects(stage(source(),staged(attachment()),{...cfg,xml229SourceAttachmentPolicy:{...policy,unclassifiedAtta:'REST'}}),
  {code:'XML229_ATTACHMENT_POLICY_INVALID'});
});
async function rehash(a){
 a.recordsSha256=await digestCanonical(a.records);const {auditSha256,...body}=a;
 a.auditSha256=await digestCanonical(body);return a;
}
test('independent source census detects a dropped attachment even after all audit hashes are recomputed',async()=>{
 const json=staged(attachment()),r=await stage(source(),json),audit=r.proof.restraintAudit;
 const input={xmlText:source(),stagedJsonText:json,config:cfg};
 assert.equal(await validateRestraintAuditSource(audit,input),true);
 const forged=structuredClone(audit);forged.attachmentDelegation.members=[];
 forged.attachmentDelegation.delegatedAttachmentMembers=0;
 for(const record of forged.records){delete record.source.attachment;delete record.attachmentRole;}
 await assert.rejects(validateRestraintAuditSource(await rehash(forged),input),/RESTRAINT_AUDIT_ATTACHMENT_DELEGATION_CONFLICT/);
 assert.match(restraintAuditCsv(audit),/Configuration \/ ATTA default/);
 assert.match(restraintAuditCsv(audit),/EXISTING_ATTA_DEFAULT/);
});
test('a policy-derived restraint cannot be relabelled as source JSON and its coordinate witness is checked',async()=>{
 const json=staged(attachment()),r=await stage(source(),json),input={xmlText:source(),stagedJsonText:json,config:cfg};
 const forged=structuredClone(r.proof.restraintAudit);forged.records[0].source.kind='staged-json';
 forged.records[0].source.member=forged.records[0].source.attachment;
 await assert.rejects(validateRestraintAuditSource(await rehash(forged),input),/RESTRAINT_AUDIT_ATTACHMENT_DELEGATION_CONFLICT/);
 const coords=structuredClone(r.proof.restraintAudit);
 coords.records[0].source.attachment.coordinateEvidence.residualMm[0]='1e0';
 coords.attachmentDelegation.members[0].source.coordinateEvidence.residualMm[0]='1e0';
 await assert.rejects(validateRestraintAuditSource(await rehash(coords),input),/RESTRAINT_AUDIT_COORDINATE_EVIDENCE_CONFLICT/);
});
test('delegation decisions and required raw identity evidence cannot be rewritten under fresh hashes',async()=>{
 const json=staged(attachment()),r=await stage(source(),json),input={xmlText:source(),stagedJsonText:json,config:cfg};
 for(const change of [m=>{m.decision.source='original-json';},m=>{delete m.fields.DTXR;}]){
  const forged=structuredClone(r.proof.restraintAudit);
  change(forged.records[0].source.attachment);change(forged.attachmentDelegation.members[0].source);
  await assert.rejects(validateRestraintAuditSource(await rehash(forged),input),/RESTRAINT_AUDIT_ATTACHMENT_DELEGATION_CONFLICT/);
 }
});
