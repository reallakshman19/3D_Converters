/**
 * WBS #391: IR F16/F17 exact production-function falsifiers.
 * These now assert conservative HOLDs on formerly reproduced safety defects.
 * PASS confirms bounded F16/F17 refusal, not CII/Owner engineering acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {preparePreviewNodeOccurrenceDocument} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-node-occurrence-ledger.js';
import {bindXml229JsonToPhysicalVertices} from '../tabs/xml-cii-2019-standalone/integration/xml229-json-physical-vertex-binding.mjs';
import {supportKindFromMember} from '../tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js';
installWeightBasisXmlDom(globalThis);

const config={xml229PhysicalVertexPrefinal:true,defaultGap:7,
  defaultFriction:0,defaultStiffness:123456,
  dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:0}};
const nd=(id,x,kind='PIPE',length=null)=>
 '<Node><NodeNumber>'+id+'</NodeNumber><NodeName>PS'+id+'/DATUM</NodeName>'+
 '<Position>'+x+' 0 0</Position><ComponentType>'+kind+'</ComponentType>'+
 (length===null?'':'<ElementLengthMm>'+length+'</ElementLengthMm>')+'</Node>';
const source=(short=false)=>
 '<PipeStressExport><Pipe><Branch><Branchname>/CASE/B1</Branchname>'+
 nd(10,0)+nd(-1,100,'ATTA',short?2:null)+nd(-1,'100.000','ATTA',80)+
 nd(20,200)+'</Branch></Pipe></PipeStressExport>';
const member=(type,gap,attrs={})=>({
 type,attributes:{DTXR:'GUIDE',CMPSUPGAP:gap,NODETYPE:'10',...attrs},
});
const trace=(members)=>JSON.stringify([{
 type:'BRANCH',name:'/CASE',children:[{
  type:'DTXR_POS',attributes:{POSI:'100 0 0'},children:members,
 }],
}]);
const rows=(document)=>[...document.getElementsByTagName('Node')].map(n=>({
 id:n.getElementsByTagName('NodeNumber')[0]?.textContent,
 restraints:[...n.getElementsByTagName('Restraint')].map(r=>({
  type:r.getElementsByTagName('Type')[0]?.textContent,
  gap:r.getElementsByTagName('Gap')[0]?.textContent,
 })),
}));
const guideGaps=(document)=>rows(document).flatMap(row=>row.restraints)
 .filter(r=>r.type==='GUI').map(r=>Number(r.gap));
function nativeReplay(original,staged,stage,cfg=config){
 const cwd=fileURLToPath(new URL('../',import.meta.url));
 return spawnSync('python3',['tests/xml229-physical-vertex-v2-native-replay.py'],{
  cwd,encoding:'utf8',timeout:30000,input:JSON.stringify({
   originalXmlText:original,stagedJsonText:staged,config:cfg,
   prefinalXmlText:new XMLSerializer().serializeToString(stage.document),
   physicalVertexMemberCensus:stage.proof.physicalVertexMemberCensus,
  }),
 });
}
function independentExplicitCandidateCensus(stagedJson){
 const result=[];
 function walk(v,path){
  if(Array.isArray(v)){v.forEach((x,i)=>walk(x,path+'/'+i));return;}
  if(!v||typeof v!=='object')return;
  const a=v.attributes||{};
  const kind=String(a.SUPPORT_KIND??a.SUPPORT_TYPE??'').toUpperCase();
  if(['GUIDE','REST','LINESTOP'].includes(kind))
   result.push({path,kind,gap:a.CMPSUPGAP,type:v.type});
  if(Array.isArray(v.children))
   v.children.forEach((x,i)=>walk(x,path+'/children/'+i));
 }
 walk(JSON.parse(stagedJson),'$');
 return result;
}
async function prepare(original,staged,cfg=config){
 return prepareXml229PrefinalRestraints({
  xmlText:original,stagedJsonText:staged,config:cfg,
 });
}

test('F16: actual Preview cleanup refuses to remove a restraint-bearing V2 original carrier',async()=>{
 const original=source(true),staged=trace([member('GT500',5),member('GT501',8)]);
 const before=await prepare(original,staged);
 assert.deepEqual(guideGaps(before.document),[5,8]);
 assert.equal(before.proof.physicalVertexMemberCensus.projectedSlotCount,2);
 assert.throws(()=>preparePreviewNodeOccurrenceDocument({
  xmlText:original,sourceDocument:before.document,config,
 }),{code:'XML229_V2_RESTRAINT_CARRIER_REMOVED_BY_CLEANUP'},
 'Conservation HOLD must precede removal of a source restraint carrier');
 assert.equal(before.proof.physicalVertexMemberCensus.boundSourceSupportMembers,2,
  'source member accounting remains exact before cleanup');
 const py=nativeReplay(original,staged,before);
 assert.equal(py.status,0,py.stderr);
 // The native check above only replays the ORIGINAL prefinal. It does not
 // certify survival through Preview cleanup or actual CII.
});

test('F16 control: disabling short-element deletion preserves both GUIDEs',async()=>{
 const original=source(true),staged=trace([member('GT500',5),member('GT501',8)]);
 const before=await prepare(original,staged);
 const cleaned=preparePreviewNodeOccurrenceDocument({
  xmlText:original,sourceDocument:before.document,
  config:{...config,dropShortElementLengthNodes:false},
 });
 assert.equal(cleaned.ledger.droppedCount,0);
 assert.deepEqual(guideGaps(cleaned.document),[5,8]);
});

test('F17: unknown explicit SUPPORT_KIND cannot be silently omitted before Step 7',async()=>{
 const original=source();
 const unrecognized=member('CUSTOM_ENGINEERING_HANGER',8,{
  SUPPORT_KIND:'GUIDE',SUPPORT_TYPE:'GUIDE'});
 const staged=trace([member('GT500',5),unrecognized]);
 const raw=independentExplicitCandidateCensus(staged);
 assert.deepEqual(raw.map(x=>[x.kind,x.gap]),[['GUIDE',8]]);
 assert.equal(supportKindFromMember({
  sourceType:unrecognized.type,raw:{attributes:unrecognized.attributes},
 },config),'GUIDE');
 assert.throws(()=>bindXml229JsonToPhysicalVertices({
  originalXmlText:original,stagedJsonText:staged,config,
 }),{code:'XML229_BIND_SOURCE_SUPPORT_CANDIDATE_UNCLASSIFIED'});
 await assert.rejects(prepare(original,staged),
  {code:'XML229_BIND_SOURCE_SUPPORT_CANDIDATE_UNCLASSIFIED'});
 const clean=trace([member('GT500',5)]);
 const valid=await prepare(original,clean);
 const py=nativeReplay(original,staged,valid);
 assert.notEqual(py.status,0,'native independently rejects the unclassified source candidate');
 assert.match(py.stderr,/NATIVE_V2_SOURCE_SUPPORT_CANDIDATE_UNCLASSIFIED/);
});

test('F17 control: changing only source type to recognized GT501 restores both slots',async()=>{
 const original=source(),staged=trace([
  member('GT500',5),member('GT501',8,{SUPPORT_KIND:'GUIDE',SUPPORT_TYPE:'GUIDE'}),
 ]);
 const stage=await prepare(original,staged);
 assert.deepEqual(guideGaps(stage.document),[5,8]);
 assert.equal(stage.proof.physicalVertexMemberCensus.sourceSupportMembers,2);
 const py=nativeReplay(original,staged,stage);
 assert.equal(py.status,0,py.stderr);
});

test('F17: a saved custom Step 8 mapping can classify a source member omitted by V2 extractor',async()=>{
 const original=source();
 const unknown={type:'CUSTOM_ENGINEERING_HANGER',attributes:{
  DESCRIPTION:'IR_F17_USER_MAPPED_GUIDE',CMPSUPGAP:8,NODETYPE:'10',
 }};
 const cfg={...config,supportMapping:{rules:[{
  id:'ir-f17-saved-rule',enabled:true,source:'staged-json',
  field:'DESCRIPTION',match:'equals',pattern:'IR_F17_USER_MAPPED_GUIDE',
  kind:'GUIDE',priority:1,
 }]}};
 assert.equal(supportKindFromMember({
  sourceType:unknown.type,raw:{attributes:unknown.attributes},
 },cfg),'GUIDE');
 const staged=trace([member('GT500',5),unknown]);
 await assert.rejects(prepare(original,staged,cfg),
  {code:'XML229_BIND_SOURCE_SUPPORT_CANDIDATE_UNCLASSIFIED'});
 const clean=trace([member('GT500',5)]),valid=await prepare(original,clean,cfg);
 const py=nativeReplay(original,staged,valid,cfg);
 assert.notEqual(py.status,0,'native independently HOLDs saved-mapped unknown type');
 assert.match(py.stderr,/NATIVE_V2_SOURCE_SUPPORT_CANDIDATE_UNCLASSIFIED/);
});
