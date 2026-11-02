import test from 'node:test';
import assert from 'node:assert/strict';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {bindXml229JsonToPhysicalVertices}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-json-physical-vertex-binding.mjs';
import {planXml229ReviewedNodalPlacements}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-reviewed-vertex-slot-plan.mjs';

installWeightBasisXmlDom(globalThis);
const node=(id,pos,type='PIPE',extra='')=>
  '<Node><NodeNumber>'+id+'</NodeNumber><Position>'+pos+'</Position>'+
  '<ComponentType>'+type+'</ComponentType>'+extra+'</Node>';
const branch=(name,rows)=>'<Branch><Branchname>'+name+'</Branchname>'+
  rows.join('')+'</Branch>';
const xml=(...branches)=>'<PipeStressExport><Pipe>'+branches.join('')+'</Pipe></PipeStressExport>';
const sourceMembers=()=>JSON.stringify([{type:'BRANCH',name:'/A',children:[
  {type:'DTXR_POS',attributes:{POSI:'100 0 0'},children:[
    {type:'REST',attributes:{DTXR:'REST',NODETYPE:'17',CMPSUPGAP:0}},
    {type:'GT500',attributes:{DTXR:'GUIDE',NODETYPE:'10',CMPSUPGAP:5}},
    {type:'ST500',attributes:{DTXR:'LINE STOP',NODETYPE:'7',CMPSUPGAP:8}},
  ]},
]}]);
const original=()=>xml(branch('/A/B1',[
  node(10,'0 0 0'),node(-1,'100 0 0','ATTA'),node(-1,'100 0 0','PIPE'),
  node(20,'200 0 0'),
]));
const finalize=(rows,retained=[[0,1,2,3]])=>({
  xmlText:xml(branch('/A/B1',rows)),
  retainedSourceOrdinalsByBranch:retained,
});
const bind=(orig=original(),json=sourceMembers())=>
  bindXml229JsonToPhysicalVertices({
    originalXmlText:orig,stagedJsonText:json,
  });
const plan=(bound,geometry)=>planXml229ReviewedNodalPlacements({
  sourceBinding:bound,finalizedGeometry:geometry,
});

test('two -1 original source aliases given different positive Final IDs require second-pass renumber',()=>{
  const b=bind();
  const g=finalize([
    node(10,'0 0 0'),node(110,'100 0 0','ATTA'),
    node(120,'100 0 0','PIPE'),node(20,'200 0 0')]);
  const result=plan(b,g);
  assert.equal(result.placements.length,1);
  assert.equal(result.placements[0].slotCount,3);
  assert.equal(result.placements[0].canonicalNodeNumber,110);
  assert.deepEqual(result.placements[0].finalAliasNodeNumbers,[110,120]);
  assert.equal(result.placements[0].requiresCanonicalRenumber,true);
  assert.equal(result.placements[0].readyForNativeTransfer,false);
  assert.equal(result.summary.verticesRequiringCanonicalRenumber,1);
  assert.equal(result.summary.nativeReleaseAuthorized,false);
  assert.equal(result.summary.postFinalMutationAuthorized,false);
});

test('two already canonical positive alias rows admit one nodal REST/GUI/LIM placement',()=>{
  const b=bind();
  const g=finalize([
    node(10,'0 0 0'),node(110,'100 0 0','ATTA'),
    node(110,'100 0 0','PIPE'),node(20,'200 0 0')]);
  const result=plan(b,g);
  assert.equal(result.placements[0].readyForNativeTransfer,true);
  assert.equal(result.placements[0].slotCount,3);
  assert.deepEqual(result.placements[0].slots.map(s=>s.ciiTypeCode),[14,8,9]);
  assert.equal(result.summary.verticesRequiringCanonicalRenumber,0);
  assert.equal(result.summary.plannedSlotCount,3);
});

test('source and Final endpoint positions must remain byte-identical',()=>{
  const b=bind();
  const changed=finalize([
    node(10,'0 0 0'),node(110,'100.000 0 0','ATTA'),
    node(120,'100 0 0','PIPE'),node(20,'200 0 0')]);
  assert.throws(()=>plan(b,changed),{code:'XML229_PASS2_ORIGINAL_POSITION_MUTATED'});
});

test('new XML node without reviewed split lineage is not invented after Final',()=>{
  const b=bind();
  const changed=finalize([
    node(10,'0 0 0'),node(110,'100 0 0','ATTA'),
    node(115,'150 0 0','RIGID'),node(20,'200 0 0')],
    [[0,1,99,3]]);
  assert.throws(()=>plan(b,changed),{code:'XML229_PASS2_UNREVIEWED_GENERATED_NODE'});
});

test('if all source aliases are removed from reviewed geometry, the nodal slots are orphaned',()=>{
  const b=bind();
  const g=finalize([node(10,'0 0 0'),node(20,'200 0 0')],[[0,3]]);
  const result=plan(b,g);
  assert.equal(result.summary.orphanedVertexSlotSets,1);
  assert.equal(result.placements[0].readyForNativeTransfer,false);
  assert.equal(result.placements[0].canonicalNodeNumber,null);
});

test('original-authored source restraint on other alias is a separate reconciliation',()=>{
  const rest='<Restraint source="original"><Type>GUI</Type><Gap>5</Gap></Restraint>';
  const b=bind();
  const g=finalize([
    node(10,'0 0 0'),node(110,'100 0 0','ATTA'),
    node(110,'100 0 0','PIPE',rest),node(20,'200 0 0')]);
  const result=plan(b,g);
  assert.equal(result.summary.authoredRestraintsOnOtherAliases,1);
  assert(result.placements[0].reasons.includes(
    'ORIGINAL_AUTHORED_RESTRAINT_ON_OTHER_ALIAS'));
  assert.equal(result.placements[0].readyForNativeTransfer,false);
});

test('unbound original support member is not mistaken for an approved slot transfer',()=>{
  const b=bind(original(),JSON.stringify([{type:'BRANCH',name:'/A',children:[
    {type:'DTXR_POS',attributes:{POSI:'500 0 0'},children:[
      {type:'REST',attributes:{DTXR:'REST',CMPSUPGAP:0}},
    ]},
  ]}]));
  assert.equal(b.summary.unboundSourceSupportMembers,1);
  const g=finalize([
    node(10,'0 0 0'),node(110,'100 0 0','ATTA'),
    node(120,'100 0 0','PIPE'),node(20,'200 0 0')]);
  const result=plan(b,g);
  assert.equal(result.summary.unboundSourceMembers,1);
  assert.equal(result.summary.reasonCounts.UNBOUND_ORIGINAL_JSON_SOURCE_MEMBER,1);
  assert.equal(result.summary.plannedSlotCount,0);
});

test('different disconnected physical vertices sharing one native CII number are not welded',()=>{
  const orig=xml(
    branch('/A/B1',[node(10,'0 0 0'),node(20,'100 0 0')]),
    branch('/B/B1',[node(30,'0 0 0'),node(40,'0 100 0')]));
  const json=JSON.stringify([{type:'BRANCH',name:'/A',children:[
    {type:'DTXR_POS',attributes:{POSI:'0 0 0'},children:[
      {type:'REST',attributes:{DTXR:'REST'}},
    ]},
  ]}]);
  const b=bind(orig,json);
  const g={xmlText:xml(
    branch('/A/B1',[node(10,'0 0 0'),node(20,'100 0 0')]),
    branch('/B/B1',[node(10,'0 0 0'),node(40,'0 100 0')])),
    retainedSourceOrdinalsByBranch:[[0,1],[0,1]]};
  const result=plan(b,g);
  assert.equal(result.summary.disconnectedVertexIdCollisions,1);
  assert.equal(result.summary.nativeReleaseAuthorized,false);
});

test('missing source JSON follows XML-only without fabricating a nodal plan',()=>{
  const b=bind(original(),'');
  const result=plan(b,{});
  assert.equal(result.mode,'XML_ONLY_NO_JSON');
  assert.equal(result.summary.plannedSlotCount,0);
});
