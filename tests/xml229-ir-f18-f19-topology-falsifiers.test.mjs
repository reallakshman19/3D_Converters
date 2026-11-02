/**
 * WBS #391 — reviewer F18/F19 topology falsifiers, exact frozen #399 code.
 *
 * PASS on an unsafe or incomplete route means the defect is REPRODUCED.
 * Synthetic port facts are NOT a qualified Owner component-port witness.
 * Do not interpret successful assertions as production acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {indexXml229OriginalPhysicalVertices}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-original-physical-vertices.mjs';
import {auditXml229PreacceptanceVertexContractions}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-preacceptance-vertex-contraction-audit.mjs';
import {xml229TeeBranchPortWitnesses}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-tee-port-route.mjs';
import {preparePreviewNodeOccurrenceDocument}
  from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-node-occurrence-ledger.js';
import {bindXml229JsonToPhysicalVertices}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-json-physical-vertex-binding.mjs';
import {prepareXml229PrefinalRestraints}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';

installWeightBasisXmlDom(globalThis);
const field=(n,k)=>n.getElementsByTagName(k)[0]?.textContent??'';
const children=(p,k)=>[...p.childNodes].filter(n=>n.nodeType===1&&n.localName===k);
const nd=(id,position,kind,more='')=>
  '<Node><NodeNumber>'+id+'</NodeNumber><Position>'+position+
  '</Position><ComponentType>'+kind+'</ComponentType>'+more+'</Node>';
const cmp=(ref,endpoint)=>
  '<ComponentRefNo>'+ref+'</ComponentRefNo><Endpoint>'+endpoint+'</Endpoint>';
const branch=(name,...nodes)=>
  '<Branch><Branchname>'+name+'</Branchname>'+nodes.join('')+'</Branch>';
const xml=(...branches)=>
  '<PipeStressExport><Pipe>'+branches.join('')+'</Pipe></PipeStressExport>';
const idx=(source,aliases=[])=>indexXml229OriginalPhysicalVertices({
  xmlText:source,sourceXmlSha256:'IR-F18-F19-SYNTHETIC-SOURCE',
  branchConnectionAliases:aliases,
});
const inputConfig={xml229PhysicalVertexPrefinal:true,defaultGap:7,
  defaultFriction:0,defaultStiffness:123456,
  dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:0}};
const trace=(branchName,position,kind='GT500')=>JSON.stringify([{
  type:'BRANCH',name:branchName,children:[{
    type:'DTXR_POS',attributes:{POSI:position},children:[{
      type:kind,attributes:{DTXR:'GUIDE',CMPSUPGAP:5,NODETYPE:10},
    }],
  }],
}]);
const bind=(source,staged,aliases=[])=>bindXml229JsonToPhysicalVertices({
  originalXmlText:source,stagedJsonText:staged,config:inputConfig,
  branchConnectionAliases:aliases,
});
const stage=(source,staged)=>prepareXml229PrefinalRestraints({
  xmlText:source,stagedJsonText:staged,config:inputConfig,
});
const gaps=(doc)=>[...doc.getElementsByTagName('Restraint')]
  .filter(r=>field(r,'Type')==='GUI').map(r=>Number(field(r,'Gap')));

/** Two explicitly different original rigid component ports at EXACT XYZ. */
function conflictingRigidPorts(incidentPosition='100 0 0'){
  return xml(branch('/RIGID/B1',
    nd(10,'0 0 0','PIPE'),
    nd(101,'100 0 0','RIGID',cmp('R17',1)),
    nd(202,incidentPosition,'RIGID',cmp('R17',2)),
    nd(20,'200 0 0','PIPE')));
}
/**
 * Source TEE 1/3/0/2 group, source branch inlet on same ref+node ID+position
 * and a third, deliberately disconnected cross-line. These are synthetic
 * evidence candidates, not externally approved source topology.
 */
function teeCrossing(){
  const tee=(id,pos,endpoint)=>
    nd(id,pos,'TEE',cmp('=TEE-17',endpoint));
  return xml(
    branch('/MAIN/B1',
      tee(2680,'0 0 0',1),
      tee(-1,'100 0 60',3),
      tee(2690,'100 0 0',0),
      tee(2700,'200 0 0',2)),
    branch('/MAIN/B2',
      nd(2690,'100 0 0','BRAN',cmp('=TEE-17',3)),
      nd(-1,'100.000 0 0','ATTA'),
      nd(2710,'100 100 0','PIPE')),
    branch('/OTHER/B1',
      nd(3450,'100 0 0','PIPE'),
      nd(3460,'100 -100 0','PIPE')),
  );
}
const teeAlias={
  aliasBranchOccurrenceIndex:1,aliasSourceNodeOrdinal:0,
  terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:2,
};
const hostileCrossingAlias={
  aliasBranchOccurrenceIndex:2,aliasSourceNodeOrdinal:0,
  terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:2,
};

test('F18: consecutive equal-XYZ RIGID endpoint1/2 with distinct authored positive IDs are united without a port witness',()=>{
  const s=conflictingRigidPorts();
  const graph=idx(s);
  assert.equal(graph.summary.intrabranchZeroSpanUnions,1);
  assert.equal(graph.vertexForOriginal(0,1),graph.vertexForOriginal(0,2),
    'UNSAFE SOURCE ASSUMPTION: distinct original component ports automatically share a physical vertex');
  const ports=graph.sourceOccurrences.slice(1,3);
  assert.deepEqual(ports.map(x=>[x.sourceComponentRefNo,x.sourceEndpoint,x.sourceNodeNumber]),
    [['R17','1','101'],['R17','2','202']]);
  const review=auditXml229PreacceptanceVertexContractions({
    originalXmlText:s,finalizedXmlText:s,
    retainedSourceOrdinalsByBranch:[[0,1,2,3]],
    sourceXmlSha256:'IR-F18-F19-SYNTHETIC-SOURCE',
  });
  assert.equal(review.summary.zeroLengthRunsRequiringTopologyReview,1);
  assert(review.candidates[0].reasons.includes('CONFLICTING_AUTHORED_POSITIVE_IDENTITIES'));
  assert(review.candidates[0].reasons.includes('RIGID_OR_COMPONENT_ENDPOINT_REVIEW_REQUIRED'));
  assert.equal(review.summary.topologyContracted,false);
  // The later audit notices risk; it cannot undo the earlier graph union.
});

test('F18 control: exact decimal mismatch retains both rigid component-port occurrences',()=>{
  const graph=idx(conflictingRigidPorts('100.000000000000000001 0 0'));
  assert.notEqual(graph.vertexForOriginal(0,1),graph.vertexForOriginal(0,2));
  assert.equal(graph.summary.intrabranchZeroSpanUnions,0);
});

test('F19: real TEE 1/3/0/2 source witness is recognized and anonymous port3 removed, without inventing a crossing connection',()=>{
  const s=teeCrossing();
  const doc=new DOMParser().parseFromString(s,'application/xml');
  const branches=[...doc.getElementsByTagName('Branch')];
  const main=children(branches[0],'Node');
  const witness=xml229TeeBranchPortWitnesses(main);
  assert.equal(witness.size,1);
  assert(witness.has(main[1]));
  assert.deepEqual(main.map(n=>field(n,'Endpoint')),['1','3','0','2']);
  const cleaned=preparePreviewNodeOccurrenceDocument({xmlText:s,config:inputConfig});
  assert.equal(cleaned.ledger.allByBranch[0][1].dropReason,'TEE_BRANCH_PORT_WITNESS');
  assert.deepEqual(children(cleaned.document.getElementsByTagName('Branch')[0],'Node')
    .map(n=>field(n,'Endpoint')),['1','0','2']);
  assert.equal(cleaned.ledger.allByBranch[1][0].status,'retained');
  assert.equal(cleaned.ledger.allByBranch[2][0].status,'retained');
  const graph=idx(s);
  assert.notEqual(graph.vertexForOriginal(0,2),graph.vertexForOriginal(1,0));
  assert.notEqual(graph.vertexForOriginal(0,2),graph.vertexForOriginal(2,0));
  assert.notEqual(graph.vertexForOriginal(1,0),graph.vertexForOriginal(2,0));
});

test('F19: independently supplied synthetic TEE alias unites main and branch, leaves same-XYZ crossing disconnected',()=>{
  const s=teeCrossing(),staged=trace('/MAIN','100 0 0');
  const without=bind(s,staged);
  assert.equal(without.summary.boundSourceSupportMembers,0);
  assert.equal(without.summary.reasonCounts.MULTIPLE_PHYSICAL_VERTICES,1);
  const withWitness=bind(s,staged,[teeAlias]);
  assert.equal(withWitness.summary.sourceSupportMembers,1);
  assert.equal(withWitness.summary.boundSourceSupportMembers,1);
  assert.equal(withWitness.vertexIndex.summary.reviewedCrossBranchAliasUnions,1);
  assert.equal(withWitness.nodalSlots.nodeSets[0].slotCount,1);
  const graph=withWitness.vertexIndex;
  assert.equal(graph.vertexForOriginal(0,2),graph.vertexForOriginal(1,0));
  assert.equal(graph.vertexForOriginal(1,0),graph.vertexForOriginal(1,1));
  assert.notEqual(graph.vertexForOriginal(0,2),graph.vertexForOriginal(2,0));
  // Critically this is a candidate alias supplied by the test. The index
  // itself has NOT independently established true component-port authority.
});

test('F19: current V2 pre-Final rejects the candidate TEE junction because it never consumes the alias used by shadow',async()=>{
  const s=teeCrossing(),staged=trace('/MAIN','100 0 0');
  const shadow=bind(s,staged,[teeAlias]);
  assert.equal(shadow.summary.boundSourceSupportMembers,1);
  await assert.rejects(stage(s,staged),{
    code:'XML229_V2_SOURCE_SUPPORT_UNBOUND',
  });
  // Scoped branch-only support is a positive control, but not equivalent
  // to the unresolved cross-branch support at a genuine tee.
  const local=await stage(s,trace('/MAIN/B2','100 0 0'));
  assert.deepEqual(gaps(local.document),[5]);
});

test('F19: unscoped same-XYZ crossing is rejected when no alias is supplied',()=>{
  const s=teeCrossing();
  const staged=JSON.stringify([{type:'DTXR_POS',
    attributes:{POSI:'100 0 0'},children:[{
      type:'GT500',attributes:{DTXR:'GUIDE',CMPSUPGAP:5,NODETYPE:10},
    }],
  }]);
  const b=bind(s,staged);
  assert.equal(b.summary.boundSourceSupportMembers,0);
  assert.equal(b.summary.reasonCounts.MULTIPLE_PHYSICAL_VERTICES,1);
});

test('F19: forged alias across an unrelated same-XYZ pipe is accepted as a union without an independently validated port relation',()=>{
  const s=teeCrossing();
  const baseline=idx(s);
  assert.notEqual(baseline.vertexForOriginal(0,2),baseline.vertexForOriginal(2,0));
  const contaminated=idx(s,[hostileCrossingAlias]);
  assert.equal(contaminated.summary.reviewedCrossBranchAliasUnions,1);
  assert.equal(contaminated.vertexForOriginal(0,2),contaminated.vertexForOriginal(2,0),
    'UNSAFE TRUST BOUNDARY: arbitrary caller-supplied same-XYZ alias can weld an unrelated pipe');
  assert.equal(contaminated.summary.nativeReleaseAuthorized,false);
});

test('F19 control: invalid XYZ alias is rejected instead of welding mismatched pipes',()=>{
  const s=teeCrossing();
  assert.throws(()=>idx(s,[{
    ...hostileCrossingAlias,
    aliasSourceNodeOrdinal:1,
  }]),{code:'XML229_VERTEX_ALIAS_COORDINATE_DRIFT'});
});
