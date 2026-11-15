import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {digestCanonical} from '../contracts/gc-pw-v1/contract.mjs';

// Explicit test-only lightweight XML DOM, reused from the qualified closure
// fixture. This does not claim real-browser or native-application acceptance.
const fixture=fs.readFileSync(new URL('./xml-cii-mds-position-restraints.test.mjs',import.meta.url),'utf8');
vm.runInThisContext(fixture.slice(fixture.indexOf('class SimpleElement'),
  fixture.indexOf('const { closeGovernedMdsPositionRestraintsXml }')));
const {prepareXml229PrefinalRestraints}=await import('../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs');
const {verifyRestraintAudit}=await import('../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-verify.js');
const {restraintAuditRows,restraintAuditCsv,restraintAuditHtml}=await import('../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-export.js');
const {governedSupportKind}=await import('../converters/xml-cii2019-core/support-kind-precedence.js');
const {inventoryRestraintAudit,collectRestraintAudit}=await import('../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit.js');

const XML=`<PipeStressExport><Branch><Branchname>/P/B1</Branchname>
<Node><NodeNumber>3600</NodeNumber><ComponentType>PIPE</ComponentType><Position>0 200 300</Position></Node>
<Node><NodeNumber>3610</NodeNumber><NodeName>PS-1.3.1</NodeName><ComponentType>ANCI</ComponentType><Position>100 200 300</Position>
<Restraint><Type>+Y</Type><Stiffness>1751270031350</Stiffness><Gap>0</Gap><Friction>0.3</Friction></Restraint></Node>
<Node><NodeNumber>3620</NodeNumber><NodeName>PS-1.1.1</NodeName><ComponentType>ANCI</ComponentType><Position>100 200 300</Position></Node>
</Branch></PipeStressExport>`;
const stage=[{type:'BRANCH',name:'/P/B1',children:[
  {type:'SUPPORT',attributes:{NAME:'/PS-1.3.1',POS:{x:100,y:200,z:300},NODETYPE:'14',NODEGAP:'0',DTXR:'REST'}},
  {type:'SUPPORT',attributes:{NAME:'/PS-1.1.1',POS:{x:100,y:200,z:300},MDSDTXR:'LINE STOP ON BARE PIPE',
    CMPSUPGAP:'25MM GAP',MDSSUPPTYPE:'ST572',SUPPORT_KIND:'REST',SUPPORT_TYPE:'REST'}},
]}];
const JSON_TEXT=JSON.stringify(stage);
const CONFIG={defaultStiffness:1751270000000,defaultGap:0,defaultFriction:0.3,
  supportMapping:{version:2,rules:[{id:'owner-line-stop',source:'staged-json',priority:1,
    field:'MDSDTXR',match:'contains',pattern:'LINE STOP',kind:'LINESTOP'}]}};

// Independent literal CII oracle: one element points to one six-slot block.
// No production writer is used to generate expected values or addresses.
function cii({gap=25,limType=9,pointer=1,lim=true,stiffness=1.751270e12,friction=0,direction=[0,0,1]}={}) {
  const row=a=>a.join(' '),zero=row([0,0,0,0,0,0]);
  const element=[row([3600,3610,100,0,0,60.3]),...Array(9).fill(zero),'0 /P/B1',zero,
    row([0,0,0,pointer,0,0]),zero,'0 0 0'];
  const rest=[row([3610,14,1.751270e12,0,0.3,0]),'0 1 0','0','0'];
  const stop=lim?[row([3610,limType,stiffness,gap,friction,0]),row(direction),'0','0']:[zero,'0 0 0','0','0'];
  const empty=[zero,'0 0 0','0','0'];
  return ['#$ CONTROL','1','#$ ELEMENTS',...element,'#$ RIGID','#$ RESTRANT',
    ...rest,...stop,...Array(4).fill(empty).flat(),'#$ MISCEL_1','0'].join('\n');
}

async function recorded() {
  const result=await prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:JSON_TEXT,config:CONFIG});
  return {audit:result.proof.restraintAudit,xmlText:XML,stagedJsonText:JSON_TEXT,config:CONFIG,
    nativeXmlText:new XMLSerializer().serializeToString(result.document),ciiText:cii()};
}

test('actual evaluator reports the selected row without changing its public decision',()=>{
  const decisions=[];
  assert.deepEqual(governedSupportKind(stage[0].children[1].attributes,CONFIG,undefined,d=>decisions.push(d)),
    {kind:'LINESTOP',source:'step7-support-table'});
  assert.equal(decisions[0].rule.id,'owner-line-stop');
  assert.equal(decisions[0].rule.field,'MDSDTXR');
  assert.equal(decisions[0].rule.matchEvidence.sourceField,'MDSDTXR');
  const defaults=[];
  governedSupportKind(stage[0].children[1].attributes,{},undefined,d=>defaults.push(d));
  assert.equal(defaults[0].rule.matchEvidence.field,'DESCRIPTION');
  assert.equal(defaults[0].rule.matchEvidence.sourceField,'MDSDTXR');
});

test('pre-Final preserves original +Y and records the line-stop member, rule and raw gap',async()=>{
  const {audit}=await recorded();
  const original=audit.records.find(r=>r.target.nodeNumber==='3610'&&r.after.Type==='+Y');
  const stop=audit.records.find(r=>r.target.nodeNumber==='3610'&&r.after.Type==='LIM');
  assert.equal(original.disposition,'PRESERVED');
  assert.equal(original.source.kind,'original-xml');
  assert.deepEqual(original.before,original.after);
  assert.equal(stop.disposition,'ADDED');
  assert.equal(stop.source.member.path,'$[0].children[1]');
  assert.equal(stop.source.member.name,'/PS-1.1.1');
  assert.equal(stop.decision.rule.id,'owner-line-stop');
  const typeEvidence=stop.fields.find(f=>f.name==='Type').evidence;
  assert.equal(typeEvidence.raw,stop.decision.rule.matchEvidence.value);
  assert.equal(typeEvidence.attribute,stop.decision.rule.matchEvidence.sourceField);
  assert.equal(stop.fields.find(f=>f.name==='Gap').evidence.raw,'25MM GAP');
  assert.equal(Number(stop.after.Gap),25);
  assert.match(audit.basis.xmlSha256,/^[a-f0-9]{64}$/);
  assert.match(audit.auditSha256,/^[a-f0-9]{64}$/);
  assert.ok(audit.resolutions.length);
  assert.equal(audit.matching.toleranceMm,6);
});

test('identical original restraint occurrences retain separate XML ordinals after removal',()=>{
  const parser=new DOMParser(),document=parser.parseFromString(XML,'application/xml');
  const node=[...document.getElementsByTagName('Node')][1];
  const restraint=[...node.childNodes].find(n=>n.nodeName==='Restraint');
  const originalXml=XML.replace('</Restraint>','</Restraint>'+new XMLSerializer().serializeToString(restraint));
  const before=inventoryRestraintAudit(parser.parseFromString(originalXml,'application/xml'));
  const audit=collectRestraintAudit(before,document);
  const records=audit.records.filter(r=>r.target.nodeNumber==='3610');
  assert.deepEqual(records.map(r=>[r.disposition,r.beforeOrdinal]),[['PRESERVED',0],['REMOVED',1]]);
});

test('actual CII element pointer and distinct slots are verified through coincident retention',async()=>{
  const result=await verifyRestraintAudit(await recorded());
  assert.equal(result.status,'VERIFIED',JSON.stringify(result.errors));
  const stop=result.records.find(r=>r.target.nodeNumber==='3610'&&r.after.Type==='LIM');
  assert.equal(stop.observed.blockIndex,1);assert.equal(stop.observed.slotIndex,2);
  assert.equal(stop.observed.elements[0].index,1);assert.equal(stop.observed.gap,25);
  const alias=result.records.find(r=>r.target.nodeNumber==='3620'&&r.after.Type==='LIM');
  assert.equal(alias.mapping.node,'3610');assert.equal(alias.mapping.method,'coincident-retained-source');
});

test('removal, wrong type, wrong pointer and populated numeric corruption fail audit',async()=>{
  const input=await recorded();
  for(const broken of [{lim:false},{gap:0},{limType:8},{pointer:0},{pointer:2},
    {stiffness:1.8e12},{stiffness:1.751274e12},{friction:0.3},{direction:[1,0,0]}]) {
    const result=await verifyRestraintAudit({...input,ciiText:cii(broken)});
    assert.equal(result.status,'FAILED',JSON.stringify(broken));
  }
});

test('source/config/evidence changes invalidate prior proof',async()=>{
  const input=await recorded();
  const changedJson=await verifyRestraintAudit({...input,stagedJsonText:JSON_TEXT.replace('25MM','26MM')});
  assert.equal(changedJson.status,'FAILED');assert.equal(changedJson.errors[0].code,'RESTRAINT_AUDIT_BASIS_STALE');
  const changedConfig=await verifyRestraintAudit({...input,config:{...CONFIG,defaultGap:2}});
  assert.equal(changedConfig.errors[0].code,'RESTRAINT_AUDIT_BASIS_STALE');
  const changed=structuredClone(input.audit);changed.records[0].after.Gap='3';
  const changedAudit=await verifyRestraintAudit({...input,audit:changed});
  assert.equal(changedAudit.errors[0].code,'RESTRAINT_AUDIT_EVIDENCE_DRIFT');
});

test('changing both claimed gap and CII cannot replace the independent original source oracle',async()=>{
  const input=await recorded(),audit=structuredClone(input.audit);
  for(const r of audit.records)if(r.after.Type==='LIM') {
    r.after.Gap='26';r.fields.find(f=>f.name==='Gap').after='26';
  }
  audit.recordsSha256=await digestCanonical(audit.records);
  const {auditSha256,...body}=audit;audit.auditSha256=await digestCanonical(body);
  const result=await verifyRestraintAudit({...input,audit,ciiText:cii({gap:26})});
  assert.equal(result.status,'FAILED');assert.equal(result.errors[0].code,'RESTRAINT_AUDIT_SOURCE_GAP_CONFLICT');
});

test('old runs stay unrecorded and XML-only evidence never claims CII verification',async()=>{
  assert.equal((await verifyRestraintAudit({})).status,'NOT_RECORDED');
  const input=await recorded();
  assert.equal((await verifyRestraintAudit({...input,ciiText:''})).status,'CII_NOT_RUN');
});

test('removed zero-information ATTA placeholder remains explicitly accounted for',async()=>{
  const xml=XML.replace('<ComponentType>ANCI</ComponentType>','<ComponentType>ATTA</ComponentType>')
    .replace('<Type>+Y</Type><Stiffness>1751270031350</Stiffness>','<Type>LIM</Type><Stiffness>0</Stiffness>');
  const stage=await prepareXml229PrefinalRestraints({xmlText:xml,config:CONFIG});
  const report=await verifyRestraintAudit({audit:stage.proof.restraintAudit,xmlText:xml,config:CONFIG,
    nativeXmlText:new XMLSerializer().serializeToString(stage.document),ciiText:cii({lim:false})});
  assert.equal(report.status,'VERIFIED',JSON.stringify(report.errors));
  assert.ok(report.records.some(r=>r.disposition==='REMOVED'&&r.before.Type==='LIM'&&r.after===null));
});

test('removing the last restraint verifies absence at a retained element with no aux pointer',async()=>{
  const xml=XML.replace('<Type>+Y</Type><Stiffness>1751270031350</Stiffness>','<Type>LIM</Type><Stiffness>0</Stiffness>');
  const document=new DOMParser().parseFromString(xml,'application/xml');
  const before=inventoryRestraintAudit(document),node=[...document.getElementsByTagName('Node')][1];
  node.removeChild([...node.childNodes].find(n=>n.nodeName==='Restraint'));
  const {bindRestraintAudit}=await import('../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit.js');
  const audit=await bindRestraintAudit(collectRestraintAudit(before,document),{
    xmlText:xml,preparedXmlText:new XMLSerializer().serializeToString(document)});
  const output=cii({pointer:0,lim:false}).split('#$ RESTRANT')[0]+'#$ RESTRANT\n#$ MISCEL_1\n0';
  const report=await verifyRestraintAudit({audit,xmlText:xml,
    nativeXmlText:new XMLSerializer().serializeToString(document),ciiText:output});
  assert.equal(report.status,'VERIFIED',JSON.stringify(report.errors));
  assert.equal(report.records[0].disposition,'REMOVED');
});

test('CSV/readable audit retain source-to-slot evidence and safely escape private source text',async()=>{
  const report=await verifyRestraintAudit(await recorded());
  const row=restraintAuditRows(report).find(r=>r.node==='3610'&&r.field==='Gap'&&r.after==='25');
  assert.equal(row.raw,'25MM GAP');assert.equal(row.ciiSlot,2);assert.equal(row.actual,25);
  const csv=restraintAuditCsv(report);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('owner-line-stop'));
  const unsafe=structuredClone(report);unsafe.records[0].source.corroboration.name='<script>alert(1)</script>';
  const html=restraintAuditHtml(unsafe);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
