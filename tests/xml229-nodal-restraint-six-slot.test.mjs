import test from 'node:test';
import assert from 'node:assert/strict';
import {projectXml229NodalRestraintSlots}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-nodal-restraint-slots.mjs';

const source=(id,physicalVertexId,DTXR,NODETYPE,CMPSUPGAP,extra={})=>({
  sourceType:'SUPPORT',sourceOccurrenceId:id,physicalVertexId,
  raw:{attributes:{DTXR,...(NODETYPE?{NODETYPE}:{}),
    ...(CMPSUPGAP!==undefined?{CMPSUPGAP}:{}),...extra}},
});
const slots=members=>projectXml229NodalRestraintSlots({members});

test('REST|GUIDE|LINESTOP stays one physical vertex with 3 native slots, explicit 0/5/8 gap',()=>{
  const result=slots([
    source('s1','v17','REST','17','0'),
    source('s2','v17','GUIDE','10','5'),
    source('s3','v17','LINE STOP','7','8'),
  ]);
  assert.equal(result.nodeSets.length,1);
  assert.equal(result.nodeSets[0].slotCount,3);
  assert.deepEqual(result.nodeSets[0].slots.map(s=>[s.xmlType,s.ciiTypeCode,s.sourceGapMm]),
    [['+Y',14,0],['GUI',8,5],['LIM',9,8]]);
  assert.equal(result.mutatedFinalXml,false);
  assert.equal(result.emittedNativeCii,false);
  assert.equal(result.nativeReleaseAuthorized,false);
});

test('same-kind independent original member occurrences are never collapsed',()=>{
  const result=slots([source('s1','v17','GUIDE','10','5'),
    source('s2','v17','GUIDE','10','8')]);
  assert.equal(result.nodeSets[0].slotCount,2);
  assert.deepEqual(result.nodeSets[0].slots.map(s=>s.sourceOccurrenceId),['s1','s2']);
  assert.deepEqual(result.nodeSets[0].slots.map(s=>s.sourceGapMm),[5,8]);
});

test('6 distinct nodal members are preserved without silent truncation',()=>{
  const result=slots(Array.from({length:6},(_,i)=>source('s'+i,'vertex',i%2?'GUIDE':'REST',
    i%2?'10':'17',String(i))));
  assert.equal(result.nodeSets[0].slotCount,6);
  assert.equal(result.verifiedSourceMemberSegments,6);
});

test('the seventh member is a capacity error instead of disappearing',()=>{
  const input=Array.from({length:7},(_,i)=>source('s'+i,'vertex','GUIDE','10',String(i)));
  assert.throws(()=>slots(input),{code:'XML229_NODAL_SIX_SLOT_CAPACITY_EXCEEDED'});
});

test('one aggregate JSON support label REST|GUIDE|LINESTOP becomes three scoped slots',()=>{
  const a=slots([source('s0','v17','REST|GUIDE|LINE STOP',undefined,undefined)]);
  assert.equal(a.nodeSets[0].slotCount,3);
  assert.deepEqual(a.nodeSets[0].slots.map(x=>x.supportKind),['REST','GUIDE','LINESTOP']);
  assert.deepEqual(a.nodeSets[0].slots.map(x=>x.sourceOccurrenceId),['s0','s0','s0']);
  assert.deepEqual(a.nodeSets[0].slots.map(x=>x.sourceSegmentOrdinal),[0,1,2]);
});

test('combined descriptor can carry its own individual source gap per slot',()=>{
  const a=slots([source('s0','v17',
    'REST(CMPSUPGAP=0mm)|GUIDE(CMPSUPGAP=5mm)|LINE STOP(CMPSUPGAP=8mm)',
    undefined,undefined)]);
  assert.deepEqual(a.nodeSets[0].slots.map(x=>x.sourceGapMm),[0,5,8]);
});

test('combined source label cannot reuse a single global NODETYPE or Gap for multiple slots',()=>{
  assert.throws(()=>slots([source('s0','v17','REST|GUIDE','17',undefined)]),
    {code:'XML229_NODAL_COMPOUND_NODETYPE_UNSCOPED'});
  assert.throws(()=>slots([source('s0','v17','REST|GUIDE',undefined,'5')]),
    {code:'XML229_NODAL_COMPOUND_GAP_UNSCOPED'});
});

test('the saved type mutation cannot reverse GUIDE into LIM',()=>{
  assert.throws(()=>projectXml229NodalRestraintSlots({
    members:[source('s0','v17','GUIDE','10','5')],
    config:{inputXmlRestraintTypeMutation:{enabled:true,rows:[{from:'10',to:'9'}]}},
  }),{code:'XML229_NODAL_MUTATION_KIND_CONFLICT'});
});

test('explicit source zero is not equivalent to absent source gap',()=>{
  const a=slots([source('s0','v17','REST','17','0'),
    source('s1','v17','GUIDE','10',undefined)]);
  assert.equal(a.nodeSets[0].slots[0].sourceGapExplicit,true);
  assert.equal(a.nodeSets[0].slots[0].sourceGapMm,0);
  assert.equal(a.nodeSets[0].slots[1].sourceGapExplicit,false);
  assert.equal(a.nodeSets[0].slots[1].sourceGapMm,null);
});

test('CMPSUPGAP=10mm overrides original NODEGAP=0 placeholder on same support member',()=>{
  const a=slots([source('s0','v17','GUIDE','10','10mm GAP',{NODEGAP:'0'})]);
  assert.equal(a.nodeSets[0].slots[0].sourceGapMm,10);
});

test('inline DTXR gap is retained when original source lacks standalone Gap',()=>{
  const a=slots([source('s0','v17','GUIDE(CMPSUPGAP=5mm)','10',undefined)]);
  assert.equal(a.nodeSets[0].slots[0].sourceGapMm,5);
});

test('two topology-distinct physical vertices never collapse solely because REST matches',()=>{
  const a=slots([source('s0','vertex-A','REST','17','0'),
    source('s1','vertex-B','REST','17','0')]);
  assert.equal(a.nodeSets.length,2);
  assert.notEqual(a.nodeSets[0].physicalVertexId,a.nodeSets[1].physicalVertexId);
});

test('one source occurrence duplicated by two paths cannot create two slots',()=>{
  assert.throws(()=>slots([source('s0','v17','REST','17','0'),
    source('s0','v17','REST','17','0')]),
    {code:'XML229_NODAL_SOURCE_OCCURRENCE_DUPLICATED'});
});

test('a non-support fitting DTXR does not become a restraint',()=>{
  const a=slots([{...source('f1','v17','GUIDE',undefined,'0'),sourceType:'PIPE'}]);
  assert.equal(a.nodeSets.length,0);
  assert.equal(a.verifiedSourceMemberSegments,0);
});

test('explicit raw friction, stiffness and directions survive source-member projection',()=>{
  const a=slots([source('s0','v17','GUIDE','10','5',{
    STIFFNESS:'1.0E+12',FRICTION:'0.2',
    DirectionCosineX:'1',DirectionCosineY:'0',DirectionCosineZ:'0',
  })]);
  assert.deepEqual(a.nodeSets[0].slots[0].sourceFields,{
    stiffness:'1.0E+12',friction:'0.2',directionX:'1',directionY:'0',directionZ:'0',
  });
});
