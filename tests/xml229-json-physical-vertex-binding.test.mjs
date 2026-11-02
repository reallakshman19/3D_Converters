import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {bindXml229JsonToPhysicalVertices}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-json-physical-vertex-binding.mjs';

installWeightBasisXmlDom(globalThis);
const node=(id,pos,extra='')=>'<Node><NodeNumber>'+id+'</NodeNumber>'+
  '<Position>'+pos+'</Position>'+extra+'</Node>';
const branch=(name,...rows)=>'<Branch><Branchname>'+name+'</Branchname>'+
  rows.join('')+'</Branch>';
const xml=(...parts)=>'<PipeStressExport><Pipe>'+parts.join('')+'</Pipe></PipeStressExport>';
const at=(pos,children)=>({type:'DTXR_POS',attributes:{POSI:pos},children});
const support=(type,dtxr,gap,attrs={})=>({type,attributes:{
  DTXR:dtxr,...(gap===undefined?{}:{CMPSUPGAP:gap}),...attrs,
}});
const staged=(name,...groups)=>JSON.stringify([{type:'BRANCH',name,children:groups}]);
const bind=(originalXmlText,stagedJsonText,config={},aliases=[])=>
  bindXml229JsonToPhysicalVertices({originalXmlText,stagedJsonText,config,
    sourceXmlSha256:'source-sha-in-test',branchConnectionAliases:aliases});

test('connected coincident XML -1 / -1 rows produce ONE physical vertex with REST|GUIDE|LINESTOP',()=>{
  const source=xml(branch('/LINE/B1',
    node(-1,'100 200 300'),node(-1,'100.000 200 300.0'),
    node(20,'200 200 300')));
  const json=staged('/LINE',at('100 200 300',[
    support('REST','REST',0,{NODETYPE:'17'}),
    support('GT500','GUIDE',5,{NODETYPE:'10'}),
    support('ST501','LINE STOP',8,{NODETYPE:'7'}),
  ]));
  const out=bind(source,json);
  assert.equal(out.vertexIndex.summary.originalNodeOccurrences,3);
  assert.equal(out.vertexIndex.summary.physicalVertexCount,2);
  assert.equal(out.summary.sourceSupportMembers,3);
  assert.equal(out.summary.boundSourceSupportMembers,3);
  assert.equal(out.summary.unboundSourceSupportMembers,0);
  assert.equal(out.summary.distinctPhysicalVertexTargets,1);
  assert.equal(out.nodalSlots.nodeSets.length,1);
  assert.deepEqual(out.nodalSlots.nodeSets[0].slots.map(x=>[x.ciiTypeCode,x.sourceGapMm]),
    [[14,0],[8,5],[9,8]]);
  assert.equal(new Set(out.bindingRows.map(x=>x.physicalVertexId)).size,1);
  assert.deepEqual(out.vertexIndex.sourceOccurrences.slice(0,2).map(x=>x.sourceNodeNumber),
    ['-1','-1']);
  assert.equal(out.summary.nativeReleaseAuthorized,false);
});

test('disconnected crossing lines at identical XYZ remain two physical vertices',()=>{
  const source=xml(
    branch('/A/B1',node(-1,'0 0 0'),node(10,'100 0 0')),
    branch('/B/B1',node(-1,'0 0 0'),node(20,'0 100 0')));
  const a=bind(source,staged('/A',at('0 0 0',[support('REST','REST',0)])));
  assert.equal(a.summary.boundSourceSupportMembers,1);
  assert.equal(a.nodalSlots.nodeSets.length,1);
  const unknown=bind(source,JSON.stringify([at('0 0 0',[
    support('REST','REST',0)])]));
  assert.equal(unknown.summary.boundSourceSupportMembers,0);
  assert.equal(unknown.summary.reasonCounts.MULTIPLE_PHYSICAL_VERTICES,1);
});

test('same pipe, two disconnected branches at XYZ are distinct when source is unqualified',()=>{
  const source=xml(
    branch('/A/B1',node(10,'10 0 0'),node(20,'100 0 0')),
    branch('/A/B2',node(30,'10 0 0'),node(40,'0 100 0')));
  const ambiguous=bind(source,staged('/A',at('10 0 0',[
    support('GT500','GUIDE',5)])));
  assert.equal(ambiguous.summary.boundSourceSupportMembers,0);
  assert.equal(ambiguous.summary.reasonCounts.MULTIPLE_PHYSICAL_VERTICES,1);
  const qualified=bind(source,staged('/A/B2',at('10 0 0',[
    support('GT500','GUIDE',5)])));
  assert.equal(qualified.summary.boundSourceSupportMembers,1);
});

test('typed reviewed branch alias makes two branch-level XML rows one physical vertex',()=>{
  const source=xml(
    branch('/A/B1',node(10,'0 0 0'),node(20,'100 0 0')),
    branch('/A/B2',node(20,'100 0 0'),node(30,'100 100 0')));
  const group=staged('/A',at('100 0 0',[support('GT500','GUIDE',5)]));
  const a=bind(source,group);
  assert.equal(a.summary.reasonCounts.MULTIPLE_PHYSICAL_VERTICES,1);
  const aliases=[{aliasBranchOccurrenceIndex:1,aliasSourceNodeOrdinal:0,
    terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:1}];
  const b=bind(source,group,{},aliases);
  assert.equal(b.summary.boundSourceSupportMembers,1);
  assert.equal(b.summary.distinctPhysicalVertexTargets,1);
  assert.equal(b.vertexIndex.summary.reviewedCrossBranchAliasUnions,1);
});

test('no 0.5 mm snap: near but unequal source coordinate cannot bind',()=>{
  const source=xml(branch('/A/B1',node(-1,'100 0 0'),
    node(10,'200 0 0')));
  const json=staged('/A',at('100.2 0 0',[support('REST','REST',0)]));
  const out=bind(source,json,{resolverJsonTrace:{coordinateTolerance:0.5}});
  assert.equal(out.summary.boundSourceSupportMembers,0);
  assert.equal(out.summary.reasonCounts.NO_XML_VERTEX_AT_COORDINATE,1);
});

test('POSI Datum offset is applied exactly once with decimal arithmetic',()=>{
  const source=xml(branch('/A/B1',node(-1,'100.3 20.1 0'),
    node(10,'200 20.1 0')));
  const json=staged('/A',at('100.1 20 0',[support('REST','REST',0)]));
  const out=bind(source,json,{dtxrPositionOffset:{
    enabled:true,xOffset:'0.2',yOffset:'0.1',zOffset:'0'}});
  assert.equal(out.summary.boundSourceSupportMembers,1);
  const noOffset=bind(source,json);
  assert.equal(noOffset.summary.boundSourceSupportMembers,0);
});

test('non-inherited malformed child position never borrows valid parent position',()=>{
  const source=xml(branch('/A/B1',node(10,'0 0 0'),
    node(20,'100 0 0')));
  const malformed=staged('/A',at('0 0 0',[
    {...support('REST','REST',0),attributes:{
      DTXR:'REST',POSI:'not-a-coordinate',CMPSUPGAP:0}},
  ]));
  const out=bind(source,malformed);
  assert.equal(out.summary.boundSourceSupportMembers,0);
  assert.equal(out.summary.reasonCounts.SOURCE_POSITION_MISSING,1);
});

test('two independent same-kind members retain two distinct physical-node slots',()=>{
  const source=xml(branch('/A/B1',node(-1,'0 0 0'),
    node(-1,'0 0 0'),node(20,'100 0 0')));
  const json=staged('/A',at('0 0 0',[
    support('GT500','GUIDE',5),support('GT500','GUIDE',8)]));
  const out=bind(source,json);
  assert.deepEqual(out.nodalSlots.nodeSets[0].slots.map(s=>s.sourceGapMm),[5,8]);
  assert.notEqual(out.nodalSlots.nodeSets[0].slots[0].sourceOccurrenceId,
    out.nodalSlots.nodeSets[0].slots[1].sourceOccurrenceId);
});

test('six distinct support members survive; seventh is a capacity exception',()=>{
  const source=xml(branch('/A/B1',node(-1,'0 0 0'),node(-1,'0 0 0')));
  const json=n=>staged('/A',at('0 0 0',Array.from({length:n},
    (_,i)=>support('GT500','GUIDE',i))));
  assert.equal(bind(source,json(6)).nodalSlots.nodeSets[0].slotCount,6);
  assert.throws(()=>bind(source,json(7)),{
    code:'XML229_NODAL_SIX_SLOT_CAPACITY_EXCEEDED'});
});

test('XML-only needs no staged JSON and must not fabricate a support ledger',()=>{
  const source=xml(branch('/A/B1',node(-1,'0 0 0'),node(20,'100 0 0')));
  const out=bind(source,'');
  assert.equal(out.mode,'XML_ONLY_NO_JSON');
  assert.equal(out.nodalSlots,null);
  assert.equal(out.summary.unboundSourceSupportMembers,0);
});

test('non-support PIPING component cannot become an XML nodal support',()=>{
  const source=xml(branch('/A/B1',node(10,'0 0 0'),node(20,'100 0 0')));
  const json=staged('/A',at('0 0 0',[
    {type:'PIPE',attributes:{DTXR:'REST'}},
    {type:'ELBO',attributes:{DTXR:'GUIDE'}},
    support('REST','REST',0)]));
  const out=bind(source,json);
  assert.equal(out.summary.sourceSupportMembers,1);
});

test('source 0,0,0 and repeated source -1 placeholders survive real BM2 original XML index',()=>{
  const input=fileURLToPath(new URL(
    '../Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml',import.meta.url));
  const source=readFileSync(input,'utf8');
  const out=bind(source,'');
  assert.equal(out.vertexIndex.summary.originalNodeOccurrences,1196);
  assert.equal(out.vertexIndex.summary.positionsRewritten,0);
  assert.equal(out.vertexIndex.summary.nodeNumbersRewritten,0);
  assert.equal(out.summary.nativeReleaseAuthorized,false);
});
