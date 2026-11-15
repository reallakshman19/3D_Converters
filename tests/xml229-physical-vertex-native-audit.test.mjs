import test from 'node:test';
import {verifyRestraintAudit} from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-verify.js';
import {digestCanonical} from '../contracts/gc-pw-v1/contract.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {indexXml229ComponentBodyBores} from '../tabs/xml-cii-2019-standalone/integration/xml229-component-body-bore.mjs';
import {xmlCiiDryRunPreview} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun.js';
import {projectXmlCiiOccurrences} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-xml-source.js';
import {createPreviewBasis} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-basis.js';
import {digestUtf8} from '../contracts/gc-pw-v1/contract.mjs';
import {openXml229EngineeringFactModel} from '../tabs/xml-cii-2019-standalone/integration/xml229-preview-engineering-fact-producer.mjs';
installWeightBasisXmlDom(globalThis);
const field=(n,k)=>n.getElementsByTagName(k)[0]?.textContent??'';
const node=(id,type,x,extra='')=>`<Node><NodeNumber>${id}</NodeNumber><NodeName>PS${id}/DATUM</NodeName><ComponentType>${type}</ComponentType><Position>${x} 0 0</Position><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness>${extra}</Node>`;
const branch='/TRANSFER-3"-CLASS';
const XML=`<PipeStressExport><Pipe><Branch><Branchname>${branch}/B1</Branchname>${node(10,'PIPE',0)}${node(20,'RIGID',100,'<Rigid>2</Rigid><Endpoint>2</Endpoint><ComponentRefNo>R1</ComponentRefNo><Weight>0</Weight><ElementLengthMm>100</ElementLengthMm>')}${[30,40,50,60].map((n,i)=>node(n,'ATTA',200+i*100)).join('')}</Branch></Pipe></PipeStressExport>`;
const staged=()=>[{type:'BRANCH',name:branch,children:[
 {type:'DTXR_POS',attributes:{POSI:'200 0 0'},children:[{type:'REST',attributes:{MDSSUPPTYPE:'PIPE-REST',DTXR:'REST',NAME:'/PS30/DATUM'}}]},
 {type:'DTXR_POS',attributes:{POSI:'300 0 0'},children:[{type:'GT500',attributes:{MDSSUPPTYPE:'GT500',NAME:'/PS40/DATUM',CMPSUPGAP:6}}]},
 {type:'DTXR_POS',attributes:{POSI:'400 0 0'},children:[{type:'ST501',attributes:{MDSSUPPTYPE:'ST501',NAME:'/PS50/DATUM',CMPSUPGAP:8}}]},
]}];
const config={defaultGap:7,defaultFriction:0,defaultStiffness:123456,
 useJsonTraceStagedSource:false,dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:0}};
const rows=doc=>[...doc.getElementsByTagName('Node')].map(n=>({id:field(n,'NodeNumber'),
 restraints:[...n.getElementsByTagName('Restraint')].map(r=>[field(r,'Type'),field(r,'Gap'),field(r,'Friction')])}));
const stage=(xmlText=XML,source=staged(),cfg=config)=>prepareXml229PrefinalRestraints({xmlText,
 stagedJsonText:JSON.stringify(source),config:structuredClone(cfg)});
async function rehashAudit(audit){
 audit.recordsSha256=await digestCanonical(audit.records);
 const {auditSha256,...body}=audit;audit.auditSha256=await digestCanonical(body);
 return audit;
}

async function twoGuides(secondGap,alias=false,slotCount=2,sourceOverrides=false,coordinatePolicy=false,delegation=false){
 let inputXml=alias?XML.replace(node(50,'ATTA',400),node(41,'ATTA',300)+node(50,'ATTA',400)):XML;
 if(delegation)inputXml=inputXml.replace('<NodeName>PS60/DATUM</NodeName>',
  '<NodeName></NodeName><ComponentRefNo>=99/1</ComponentRefNo>');
 const gaps=slotCount===6?[1,2,3,4,5,6]:[5,secondGap];
 const sourceId='XML229-V2-TWO-GUIDES',masters={},overrides={},
  selection=[{sourceId,selectionRef:'all'}];
 const stagedData=staged();
 if(coordinatePolicy){
  stagedData[0].name=branch+'/B1';
  for(const group of stagedData[0].children){
   const x=Number(group.attributes.POSI.split(' ')[0]);
   // Delegation's full-CII fixture uses the existing downstream zero datum.
   // The separate coordinate-policy case continues challenging translation.
   group.attributes.POSI=(x+0.005)+(delegation?' 0 0':' 0 -100000');
  }
 }
 stagedData[0].children[1].children[0].attributes.CMPSUPGAP=gaps[0];
 for(const gap of gaps.slice(1))stagedData[0].children[1].children.push({
  type:'GT501',attributes:{MDSSUPPTYPE:'GT501',NAME:'/PS40/DATUM',CMPSUPGAP:gap}});
 if(coordinatePolicy)stagedData[0].children[1].children.forEach(m=>{
  m.attributes.CMPSUPGAP=String(m.attributes.CMPSUPGAP)+'MM GAP';
 });
 if(delegation)stagedData[0].children.push({type:'SUPPORT',attributes:{TYPE:'ATTA',RAW_TYPE:'ATTA',
  NAME:'=99/1',REF:'=99/1',SPRE:'/CAT/ATTA-80',DTXR:'---',POSI:'500.005 0 0'}});
 if(sourceOverrides)stagedData[0].children[1].children.forEach((member,i)=>Object.assign(member.attributes,{
  STIFFNESS:(i+1)*1000000,FRICTION:0.2*(i+1),DirectionCosineX:1,DirectionCosineY:0,DirectionCosineZ:0}));
 const stagedSource=JSON.stringify(stagedData);
 const cfg={...config,xml229PhysicalVertexPrefinal:true};
 if(coordinatePolicy){
  cfg.dtxrPositionOffset={enabled:false};
  cfg.xml229SourceCoordinatePolicy={schema:'XML229.SourceCoordinatePolicy.v1',
   positionField:'POSI',translationMm:['0','0',delegation?'0':'100000'],xmlQuantumMm:'0.01',identityMode:'exact-branch-member'};
 }
 if(delegation)cfg.xml229SourceAttachmentPolicy={schema:'XML229.SourceAttachmentPolicy.v1',unclassifiedAtta:'existing-xml-default'};
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',
  sources:[{sourceId,mediaType:'application/xml',text:inputXml}],
  masters,selection,stagedSource,config:cfg,overrides,sha256:digestUtf8});
 const original=projectXmlCiiOccurrences({xmlText:inputXml,sourceId});
 const preview=xmlCiiDryRunPreview(inputXml,structuredClone(cfg),stagedSource);
 const opened=await openXml229EngineeringFactModel({basis,
  live:{sources:{[sourceId]:inputXml},masters,selection,stagedSource,config:cfg,overrides},
  xmlText:inputXml,sourceId,previewResult:{...preview,sourceOccurrences:original,
   engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
  expectedOriginalCount:alias?8:7});
 const ledger=opened.finalizedGeometry.prefinalRestraints;
 assert.equal(ledger.schema,'XML229.PrefinalRestraints.v2');
 assert.equal(ledger.physicalVertexMemberCensus.projectedSlotCount,2+gaps.length);
 const packet={schema:'XML229.NativeFinalPhysicalPacket.v1',
  sourceId,basisId:basis.basisId,sourceXmlSha256:await digestUtf8(inputXml),
  originalJsonSha256:await digestUtf8(stagedSource),
  finalIntentSha256:'b'.repeat(64),physicalCount:1,nativeCiiReleaseAuthorized:false,
  finalizedGeometry:opened.finalizedGeometry,
  components:opened.physicalOccurrences.map(o=>({occurrenceId:o.occurrenceId,effectiveKg:12.5}))};
 const dir=await mkdtemp(join(tmpdir(),'xml229-v2-guides-cii-'));
 try{
  await Promise.all([
   ['source.xml',inputXml],['staged.json',stagedSource],
   ['config.json',JSON.stringify(cfg)],['packet.json',JSON.stringify(packet)],['expected-guide-gaps.json',JSON.stringify(gaps)],
  ].map(([filename,data])=>writeFile(join(dir,filename),data)));
  const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
  const output=execFileSync(python,[
    fileURLToPath(new URL('./xml229-physical-v2-multislot-native-check.py',import.meta.url)),
    dir],{encoding:'utf8'});
  assert.match(output,/XML229_V2_TWO_GUIDES_ACTUAL_CII_PASS/);
  const auditInput={audit:ledger.restraintAudit,xmlText:inputXml,stagedJsonText:stagedSource,config:cfg,
    finalizedGeometry:opened.finalizedGeometry,
    nativeXmlText:await readFile(join(dir,'enriched.xml'),'utf8'),
    ciiText:await readFile(join(dir,'output.cii'),'utf8')};
  const audit=await verifyRestraintAudit(auditInput);
  assert.equal(audit.status,'VERIFIED',JSON.stringify(audit.records.filter(r=>r.status!=='VERIFIED')));
  const guides=audit.records.filter(r=>r.target.nodeNumber==='40');
  assert.deepEqual(guides.map(r=>r.observed.gap),gaps);
  assert.equal(new Set(guides.map(r=>r.source.member.path)).size,gaps.length);
  if(delegation){
   assert.equal(ledger.physicalVertexMemberCensus.sourceAttachmentMembersDelegated,1);
   const attachment=audit.records.find(r=>r.target.nodeNumber==='60');
   assert.equal(attachment.source.kind,'config-default');assert.equal(attachment.observed.typeCode,14);
   assert.equal(attachment.attachmentRole.disposition,'EXISTING_ATTA_DEFAULT');
   assert.equal(ledger.restraintAudit.attachmentDelegation.sourceMembers,3+gaps.length);
   const forged=structuredClone(auditInput.audit);forged.attachmentDelegation.members=[];
   forged.attachmentDelegation.delegatedAttachmentMembers=0;
   for(const r of forged.records){delete r.source.attachment;delete r.attachmentRole;}
   const failed=await verifyRestraintAudit({...auditInput,audit:await rehashAudit(forged)});
   assert.equal(failed.status,'FAILED');assert.equal(failed.errors[0].code,'RESTRAINT_AUDIT_ATTACHMENT_DELEGATION_CONFLICT');
  }
  if(coordinatePolicy){
   assert.equal(guides[0].source.member.coordinateEvidence.positionField,'POSI');
   assert.equal(guides[0].source.member.coordinateEvidence.residualMm[0],'-5e-3');
   const forged=structuredClone(auditInput.audit);
   forged.records.find(r=>r.target.nodeNumber==='40').source.member.coordinateEvidence.residualMm[0]='0';
   const challenged=await verifyRestraintAudit({...auditInput,audit:await rehashAudit(forged)});
   assert.equal(challenged.status,'FAILED');
   assert.equal(challenged.errors[0].code,'RESTRAINT_AUDIT_COORDINATE_EVIDENCE_CONFLICT');
  }
  const lines=auditInput.ciiText.split('\n'),index=guides[0].observed.line-1;
  lines[index]=lines[index].slice(0,41)+'9.000000'.padStart(13)+lines[index].slice(54);
  const broken=lines.join('\n');
  assert.ok(broken!==auditInput.ciiText);
  assert.equal((await verifyRestraintAudit({...auditInput,ciiText:broken})).status,'FAILED');
  if(sourceOverrides){
   assert.deepEqual(guides.map(r=>r.observed.stiffness),[1000000,2000000]);
   assert.deepEqual(guides.map(r=>r.observed.friction),[0.2,0.4]);
   const forged=structuredClone(auditInput.audit),r=forged.records.find(r=>r.target.nodeNumber==='40');
   r.after.Stiffness='3000000';r.fields.find(f=>f.name==='Stiffness').after='3000000';
   forged.recordsSha256=await digestCanonical(forged.records);
   const {auditSha256,...body}=forged;forged.auditSha256=await digestCanonical(body);
   const wrong=auditInput.ciiText.split('\n'),idx=guides[0].observed.line-1;
   wrong[idx]=wrong[idx].slice(0,28)+'3.000000E+06'.padStart(13)+wrong[idx].slice(41);
   const result=await verifyRestraintAudit({...auditInput,audit:forged,ciiText:wrong.join('\n')});
   assert.equal(result.status,'FAILED');assert.equal(result.errors[0].code,'RESTRAINT_AUDIT_SOURCE_FIELD_CONFLICT');
   const badDirection=structuredClone(auditInput.audit),directionRecord=badDirection.records.find(r=>r.target.nodeNumber==='40');
   directionRecord.after.DirectionCosineX='invalid';
   directionRecord.fields.find(f=>f.name==='DirectionCosineX').after='invalid';
   const directionLines=auditInput.ciiText.split('\n');
   directionLines[guides[0].observed.line]='0'.padStart(15)+'0'.padStart(13)+'1'.padStart(13);
   const directionResult=await verifyRestraintAudit({...auditInput,audit:await rehashAudit(badDirection),ciiText:directionLines.join('\n')});
   assert.equal(directionResult.status,'FAILED');assert.equal(directionResult.errors[0].code,'RESTRAINT_AUDIT_SOURCE_DIRECTION_CONFLICT');
   const badConfig=structuredClone(auditInput.audit);badConfig.recordedConfig.defaultStiffness=999999;
   const configResult=await verifyRestraintAudit({...auditInput,audit:await rehashAudit(badConfig)});
   assert.equal(configResult.status,'FAILED');assert.equal(configResult.errors[0].code,'RESTRAINT_AUDIT_EVIDENCE_DRIFT');
  }
 }finally{await rm(dir,{recursive:true,force:true});}

}
test('V2 emits two same-kind GUIDE slots with separate gaps and verifies actual CII',()=>twoGuides(8));
test('V2 preserves two distinct source occurrences even when every restraint value is identical',()=>twoGuides(5));

test('V2 transfers once across connected zero-span aliases before native CII',()=>twoGuides(8,true));
test('V2 serializes all six source members and independently verifies every actual slot',()=>twoGuides(8,false,6));
test('V2 verifies per-member numeric fields against original JSON even if both audit and CII are forged',()=>twoGuides(8,false,2,true));
test('explicit source-coordinate policy reaches actual native CII slots with bound source audit',()=>twoGuides(8,false,2,false,true));
test('generic attachment delegation uses existing XML default in actual native CII with complete source census',()=>twoGuides(8,false,2,false,true,true));
