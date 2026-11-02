import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
installWeightBasisXmlDom(globalThis);

const nd=(id,x,kind='ATTA',rest='')=>'<Node><NodeNumber>'+id+'</NodeNumber>'+
  '<NodeName>/PS'+id+'/DATUM</NodeName><Position>'+x+' 0 0</Position>'+
  '<ComponentType>'+kind+'</ComponentType>'+rest+'</Node>';
const branch=(name,...nodes)=>'<Branch><Branchname>'+name+'</Branchname>'+
  nodes.join('')+'</Branch>';
const xml=(...bs)=>'<PipeStressExport><Pipe>'+bs.join('')+'</Pipe></PipeStressExport>';
const sup=(type,label,gap,nodeType,other={})=>({type,attributes:{
  DTXR:label,...(gap===undefined?{}:{CMPSUPGAP:gap}),
  ...(nodeType?{NODETYPE:nodeType}:{}),...other,
}});
const json=(name,pos,items)=>JSON.stringify([
  {type:'BRANCH',name,children:[{type:'DTXR_POS',attributes:{POSI:pos},
    children:items}]}]);
const config={xml229PhysicalVertexPrefinal:true,defaultGap:7,
  defaultFriction:0,defaultStiffness:123456,
  dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:0}};
const source=()=>xml(branch('/LINE/B1',nd(10,'0','PIPE'),
  nd(-1,'100','ATTA'),nd(-1,'100.000','ATTA'),
  nd(20,'200','PIPE')));
const stage=(src=source(),staged='',cfg=config)=>
  prepareXml229PrefinalRestraints({xmlText:src,stagedJsonText:staged,config:cfg});
const field=(node,k)=>[...node.getElementsByTagName(k)][0]?.textContent??'';
const nodeRestraints=doc=>[...doc.getElementsByTagName('Node')].map(n=>
  [...n.getElementsByTagName('Restraint')].map(r=>({
    type:field(r,'Type'),gap:field(r,'Gap'),stiffness:field(r,'Stiffness'),
    friction:field(r,'Friction'),
  })));
function nativeReplay(original,stageResult,staged,cfg=config){
  const cwd=fileURLToPath(new URL('../',import.meta.url));
  return spawnSync('python3',['tests/xml229-physical-vertex-v2-native-replay.py'],{
    cwd,encoding:'utf8',timeout:25000,input:JSON.stringify({
      originalXmlText:original,
      prefinalXmlText:new XMLSerializer().serializeToString(stageResult.document),
      stagedJsonText:staged,config:cfg,
      physicalVertexMemberCensus:stageResult.proof.physicalVertexMemberCensus,
    }),
  });
}

test('two same physical-node -1 aliases receive REST/GUI/LIM once on one carrier',async()=>{
  const src=source();
  const staged=json('/LINE','100 0 0',[
    sup('REST','REST',0,'17'),
    sup('GT500','GUIDE',5,'10'),
    sup('ST501','LINE STOP',8,'7'),
  ]);
  const r=await stage(src,staged);
  const values=nodeRestraints(r.document);
  assert.equal(r.proof.schema,'XML229.PrefinalRestraints.v2');
  assert.deepEqual(values[1].map(x=>[x.type,Number(x.gap)]),
    [['+Y',0],['GUI',5],['LIM',8]]);
  assert.deepEqual(values[2],[]);
  assert.equal(r.proof.physicalVertexMemberCensus.canonicalPhysicalRestraintVertices,1);
  assert.equal(r.proof.physicalVertexMemberCensus.projectedSlotCount,3);
  assert.equal(r.proof.physicalVertexMemberCensus.writtenSlots,3);
  assert.deepEqual([...r.document.getElementsByTagName('Node')].map(n=>field(n,'Position')),
    ['0 0 0','100 0 0','100.000 0 0','200 0 0']);
  const native=nativeReplay(src,r,staged);
  assert.equal(native.status,0,native.stderr);
});

test('two distinct GUIDE members, gaps 5 and 8, remain two native-authorized slots',async()=>{
  const src=source(),staged=json('/LINE','100 0 0',[
    sup('GT500','GUIDE',5,'10'),sup('GT501','GUIDE',8,'10')]);
  const r=await stage(src,staged);
  assert.deepEqual(nodeRestraints(r.document)[1].map(x=>[x.type,Number(x.gap)]),
    [['GUI',5],['GUI',8]]);
  assert.equal(r.proof.physicalVertexMemberCensus.projectedSlotCount,2);
  const native=nativeReplay(src,r,staged);
  assert.equal(native.status,0,native.stderr);
});

test('six different original source members retain all six slots',async()=>{
  const src=source(),staged=json('/LINE','100 0 0',
    Array.from({length:6},(_,i)=>sup('GT500','GUIDE',i,'10')));
  const r=await stage(src,staged);
  assert.equal(nodeRestraints(r.document)[1].length,6);
  assert.equal(nodeRestraints(r.document)[2].length,0);
  const native=nativeReplay(src,r,staged);
  assert.equal(native.status,0,native.stderr);
});

test('a seventh nodal member is not dropped by source or native serializer',async()=>{
  const src=source(),staged=json('/LINE','100 0 0',
    Array.from({length:7},(_,i)=>sup('GT500','GUIDE',i,'10')));
  await assert.rejects(stage(src,staged),
    {code:'XML229_NODAL_SIX_SLOT_CAPACITY_EXCEEDED'});
});

test('two disconnected crossing pipes are not merged even at exact XYZ',async()=>{
  const src=xml(branch('/A/B1',nd(10,'0'),nd(20,'100')),
    branch('/B/B1',nd(30,'0'),nd(40,'200')));
  const unscoped=JSON.stringify([{type:'DTXR_POS',
    attributes:{POSI:'0 0 0'},children:[sup('REST','REST',0,'17')]}]);
  await assert.rejects(stage(src,unscoped),{code:'XML229_V2_SOURCE_SUPPORT_UNBOUND'});
  const scoped=json('/A','0 0 0',[sup('REST','REST',0,'17')]);
  const r=await stage(src,scoped);
  assert.equal(nodeRestraints(r.document)[0].length,1);
  assert.equal(nodeRestraints(r.document)[2].length,1); // unrelated ATTA's default REST
  assert.equal(nativeReplay(src,r,scoped).status,0);
});

test('near coordinate fails exact physical-vertex binding even with 6mm tolerance',async()=>{
  const src=source(),staged=json('/LINE','100.2 0 0',
    [sup('GT500','GUIDE',5,'10')]);
  await assert.rejects(stage(src,staged,{...config,coordinateTolerance:6}),
    {code:'XML229_V2_SOURCE_SUPPORT_UNBOUND'});
});

test('source-authorized XML restraint with an unmatched gap is not overwritten',async()=>{
  const authored='<Restraint source="original"><Type>GUI</Type>'+
    '<Gap>99</Gap><Stiffness>123456</Stiffness></Restraint>';
  const src=source().replace('<ComponentType>ATTA</ComponentType>',
    '<ComponentType>ATTA</ComponentType>'+authored);
  const staged=json('/LINE','100 0 0',[sup('GT500','GUIDE',5,'10')]);
  await assert.rejects(stage(src,staged),{code:'XML229_V2_AUTHORED_RESTRAINT_CONFLICT'});
});

test('XML-only path stays v1 and never generates a physical vertex JSON ledger',async()=>{
  const r=await stage(source(),'');
  assert.equal(r.proof.schema,'XML229.PrefinalRestraints.v1');
  assert.equal(nodeRestraints(r.document)[1].length,1);
  assert.equal(nodeRestraints(r.document)[2].length,1);
});

test('default behavior remains v1 when physical-vertex mode was not enabled',async()=>{
  const src=source(),staged=json('/LINE','100 0 0',[sup('REST','REST',0,'17')]);
  const r=await stage(src,staged,{...config,xml229PhysicalVertexPrefinal:false});
  assert.equal(r.proof.schema,'XML229.PrefinalRestraints.v1');
});

test('native denies Worker-forged slot totals before any final artifact can pass',async()=>{
  const src=source(),staged=json('/LINE','100 0 0',[sup('REST','REST',0,'17')]);
  const r=await stage(src,staged);
  const forged={...r,proof:{...r.proof,physicalVertexMemberCensus:{
    ...r.proof.physicalVertexMemberCensus,projectedSlotCount:999}}};
  const py=nativeReplay(src,forged,staged);
  assert.notEqual(py.status,0);
  assert.match(py.stderr,/NATIVE_V2_MEMBER_CENSUS_DRIFT/);
});
