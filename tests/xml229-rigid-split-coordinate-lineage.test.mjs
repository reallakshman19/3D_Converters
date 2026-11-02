import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {proposeXml229PreFinalRigidSplitCoordinates}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-rigid-split-coordinate-lineage.mjs';

installWeightBasisXmlDom(globalThis);
function node(number,pos,type='FLAN',ref='=F1',endpoint='1'){
  return '<Node><NodeNumber>'+number+'</NodeNumber>'+
    '<ComponentType>'+type+'</ComponentType>'+
    '<ComponentRefNo>'+ref+'</ComponentRefNo>'+
    '<Endpoint>'+endpoint+'</Endpoint>'+
    '<Position>'+pos+'</Position><Weight>0</Weight></Node>';
}
const xml=(a='100 200 300',b='200 200 300')=>
  '<PipeStressExport><Pipe><Branch><Branchname>/A/B1</Branchname>'+
  node(-1,a,'FLAN','=F1','1')+node(-1,b,'FLAN','=F1','2')+
  '</Branch></Pipe></PipeStressExport>';
const request=(fractions,aliases=[])=>({
  branchOccurrenceIndex:0,fromSourceNodeOrdinal:0,
  toSourceNodeOrdinal:1,fractions,aliases,
});
const plan=(source,requests,more={})=>
  proposeXml229PreFinalRigidSplitCoordinates({
    originalXmlText:source,sourceXmlSha256:'test-source-sha',
    splitRequests:requests,...more,
  });

test('midpoint split preserves A/B exactly and produces source-edge-attested 150,200,300',()=>{
  const source=xml();
  const result=plan(source,[request(['0.5'])]);
  const edge=result.edgePlans[0],interior=edge.generatedInterior[0];
  assert.deepEqual(interior.position,['150','200','300']);
  assert.equal(interior.t,'0.5');
  assert.equal(interior.type,'INTERIOR');
  assert.equal(interior.physicalVertexId,null);
  assert.equal(interior.receivesOriginalEndpointRestraints,false);
  assert.equal(interior.receivesNewPhysicalMassOwner,false);
  assert.equal(edge.sourceFromPositionRaw,'100 200 300');
  assert.equal(edge.sourceToPositionRaw,'200 200 300');
  assert.equal(edge.originalEndpointCoordinatesUnchanged,true);
  assert.equal(result.summary.originalSourceNodesMoved,0);
  assert.equal(result.summary.acceptedWeightOwnersChanged,0);
  assert.equal(result.summary.nativeReleaseAuthorized,false);
});

test('quarter and three-quarter points conserve componentwise signed vector sum',()=>{
  const result=plan(xml(),[request(['0.75','0.25'])]);
  const p=result.edgePlans[0].generatedInterior.map(row=>row.position);
  assert.deepEqual(p,[['125','200','300'],['175','200','300']]);
  assert.equal(result.edgePlans[0].segmentsCreated,3);
  const points=[[100,200,300],...p.map(row=>row.map(Number)),[200,200,300]];
  const delta=[0,1,2].map(axis=>points.slice(1).reduce(
    (sum,p,i)=>sum+p[axis]-points[i][axis],0));
  assert.deepEqual(delta,[100,0,0]);
});

test('fractional positions add exactly, avoiding IEEE-754 0.1 + 0.2 drift',()=>{
  const result=plan(xml('100.1 20.1 -0.01','200.1 20.1 -0.01'),
    [request(['0.1'])]);
  assert.deepEqual(result.edgePlans[0].generatedInterior[0].position,
    ['110.1','20.1','-0.01']);
});

test('split alias copies exact endpoint Position strings, not snapped decimal coordinates',()=>{
  const result=plan(xml('100.000 200.0 300','200.000 200 300'),
    [request([],['FROM','TO'])]);
  const aliases=result.edgePlans[0].generatedAliases;
  assert.equal(aliases.length,2);
  assert.equal(aliases[0].positionRaw,'100.000 200.0 300');
  assert.equal(aliases[1].positionRaw,'200.000 200 300');
  assert.notEqual(aliases[0].physicalVertexId,null);
  assert.equal(result.summary.newEndpointAliases,2);
});

test('zero-length original rigid span cannot produce an interior new physical node',()=>{
  assert.throws(()=>plan(xml('100 0 0','100 0 0'),[request(['0.5'])]),
    {code:'XML229_SPLIT_ZERO_LENGTH_EDGE'});
});

test('source t=0, t=1, negative or >1 cannot silently create a cloned endpoint as interior',()=>{
  for(const fraction of ['0','1','-0.01','1.01']){
    assert.throws(()=>plan(xml(),[request([fraction])]),
      {code:'XML229_SPLIT_FRACTION_OUTSIDE_INTERIOR'});
  }
});

test('duplicate fractions and duplicate edge requests cannot manufacture extra split points',()=>{
  assert.throws(()=>plan(xml(),[request(['0.5','0.50'])]),
    {code:'XML229_SPLIT_DUPLICATED_INTERIOR_FRACTION'});
  assert.throws(()=>plan(xml(),[request(['0.5']),request(['0.25'])]),
    {code:'XML229_SPLIT_SOURCE_EDGE_DUPLICATED'});
});

test('nonadjacent original ordinals or absent source edges are not accepted',()=>{
  assert.throws(()=>plan(xml(),[{
    branchOccurrenceIndex:0,fromSourceNodeOrdinal:0,toSourceNodeOrdinal:3,
    fractions:['0.5'],
  }]),{code:'XML229_SPLIT_SOURCE_EDGE_REQUIRED'});
  assert.throws(()=>plan(xml(),[{
    branchOccurrenceIndex:1,fromSourceNodeOrdinal:0,toSourceNodeOrdinal:1,
    fractions:['0.5'],
  }]),{code:'XML229_SPLIT_SOURCE_EDGE_NOT_FOUND'});
});

test('ref/class/port incidence must prove the rigid 1-to-2 original segment',()=>{
  const mismatched=xml().replace('<ComponentRefNo>=F1</ComponentRefNo><Endpoint>2</Endpoint>',
    '<ComponentRefNo>=F2</ComponentRefNo><Endpoint>2</Endpoint>');
  assert.throws(()=>plan(mismatched,[request(['0.5'])]),
    {code:'XML229_SPLIT_RIGID_EDGE_WITNESS_INVALID'});
  const pipe=xml().replaceAll('<ComponentType>FLAN</ComponentType>',
    '<ComponentType>PIPE</ComponentType>');
  assert.throws(()=>plan(pipe,[request(['0.5'])]),
    {code:'XML229_SPLIT_RIGID_EDGE_WITNESS_INVALID'});
});

test('splitting after accepted Final is prohibited before any geometry mutation',()=>{
  assert.throws(()=>plan(xml(),[request(['0.5'])],{
    acceptedFinalPacket:{accepted:true},
  }),{code:'XML229_POST_FINAL_SPLIT_FORBIDDEN'});
});

test('no split requests preserve authentic public BM2 original occurrence census',()=>{
  const src=readFileSync(fileURLToPath(new URL(
    '../Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml',
    import.meta.url)),'utf8');
  const result=plan(src,[]);
  assert.equal(result.originalNodeCount,1196);
  assert.equal(result.summary.newInteriorVertices,0);
  assert.equal(result.summary.originalSourceNodesMoved,0);
  assert.equal(result.summary.sourceXmlMutated,false);
  assert.equal(result.summary.nativeReleaseAuthorized,false);
});
