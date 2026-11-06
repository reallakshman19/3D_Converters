import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {canonicalXml229Decimal,exactXml229Position,indexXml229OriginalPhysicalVertices}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-original-physical-vertices.mjs';

installWeightBasisXmlDom(globalThis);
const node=(n,pos,additional='')=>
  `<Node><NodeNumber>${n}</NodeNumber><Position>${pos}</Position>${additional}</Node>`;
const branch=(name,...ns)=>`<Branch><Branchname>${name}</Branchname>${ns.join('')}</Branch>`;
const xml=(...branches)=>`<PipeStressExport><Pipe>${branches.join('')}</Pipe></PipeStressExport>`;
const index=(s,aliases=[])=>indexXml229OriginalPhysicalVertices({
  xmlText:s,sourceXmlSha256:'original-xml-test',branchConnectionAliases:aliases,
});

test('exact decimal equality never converts near-coincident positions into identical XYZ',()=>{
  assert.equal(canonicalXml229Decimal('01.000e+0'),canonicalXml229Decimal('1'));
  assert.equal(canonicalXml229Decimal('-0.0000'),'0');
  assert.notEqual(canonicalXml229Decimal('1.000000000000000001'),canonicalXml229Decimal('1'));
  assert.equal(exactXml229Position('1.0 2e0 -0'),exactXml229Position('1 02 0'));
  assert.notEqual(exactXml229Position('1.000000000000000001 2 0'),exactXml229Position('1 2 0'));
  assert.equal(exactXml229Position('1 2'),null);
  assert.equal(exactXml229Position('1 inf 3'),null);
});

test('two repeated -1 XML rows linked by consecutive exact position are one physical vertex',()=>{
  const a=index(xml(branch('A',
    node(-1,'100 200 300'),node(-1,'100.0 200 300.000'),
    node(10,'150 200 300'))));
  assert.equal(a.summary.originalNodeOccurrences,3);
  assert.equal(a.summary.physicalVertexCount,2);
  assert.equal(a.summary.intrabranchZeroSpanUnions,1);
  assert.equal(a.vertexForOriginal(0,0),a.vertexForOriginal(0,1));
  assert.notEqual(a.vertexForOriginal(0,1),a.vertexForOriginal(0,2));
  assert.deepEqual(a.sourceOccurrences.map(x=>x.sourceNodeNumber),['-1','-1','10']);
  assert.equal(a.summary.positionsRewritten,0);
  assert.equal(a.summary.nodeNumbersRewritten,0);
  assert.equal(a.summary.nativeReleaseAuthorized,false);
});

test('disconnected crossing pipe with exact same XYZ remains an independent physical vertex',()=>{
  const a=index(xml(
    branch('A',node(-1,'0 0 0'),node(20,'100 0 0')),
    branch('B',node(-1,'0 0 0'),node(21,'0 100 0'))));
  assert.notEqual(a.vertexForOriginal(0,0),a.vertexForOriginal(1,0));
  assert.equal(a.summary.physicalVertexCount,4);
  assert.equal(a.summary.distinctSameCoordinateStations,1);
});

test('one positive shared endpoint is joined only by reviewed typed branch alias',()=>{
  const s=xml(
    branch('A',node(10,'0 0 0'),node(110,'100 0 0')),
    branch('B',node(110,'100 0 0'),node(120,'100 100 0')));
  const alone=index(s);
  assert.equal(alone.summary.physicalVertexCount,4);
  const withWitness=index(s,[{
    aliasBranchOccurrenceIndex:1,aliasSourceNodeOrdinal:0,
    terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:1,
  }]);
  assert.equal(withWitness.summary.physicalVertexCount,3);
  assert.equal(withWitness.summary.reviewedCrossBranchAliasUnions,1);
  assert.equal(withWitness.vertexForOriginal(0,1),withWitness.vertexForOriginal(1,0));
});

test('alias coordinate mismatch cannot merge vertices',()=>{
  const s=xml(
    branch('A',node(10,'0 0 0'),node(110,'100 0 0')),
    branch('B',node(110,'100.000000000000000001 0 0'),node(120,'100 100 0')));
  assert.throws(()=>index(s,[{
    aliasBranchOccurrenceIndex:1,aliasSourceNodeOrdinal:0,
    terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:1,
  }]),{code:'XML229_VERTEX_ALIAS_COORDINATE_DRIFT'});
});

test('duplicate or unknown typed branch alias refuses untrustworthy graph change',()=>{
  const s=xml(branch('A',node(-1,'0 0 0'),node(-1,'0 0 0')));
  const alias={aliasBranchOccurrenceIndex:0,aliasSourceNodeOrdinal:1,
    terminalBranchOccurrenceIndex:0,terminalSourceNodeOrdinal:0};
  assert.throws(()=>index(s,[alias,alias]),{code:'XML229_VERTEX_ALIAS_DUPLICATED'});
  assert.throws(()=>index(s,[{...alias,terminalSourceNodeOrdinal:9}]),
    {code:'XML229_VERTEX_ALIAS_UNKNOWN_SOURCE'});
});

test('a real interior split coordinate is a new vertex, not an alias of the endpoint',()=>{
  const s=xml(branch('A',node(10,'100 200 300'),node(11,'150 200 300'),
    node(12,'200 200 300')));
  const out=index(s);
  assert.equal(out.summary.physicalVertexCount,3);
  assert.notEqual(out.vertexForOriginal(0,0),out.vertexForOriginal(0,1));
});

test('a missing or invalid original coordinate is recorded, not a distance-based guess',()=>{
  const s=xml(branch('A',node(-1,''),node(-1,'0 0 0'),
    node(-1,'0 0 0')));
  const out=index(s);
  assert.equal(out.summary.invalidOrMissingPositions,1);
  assert.equal(out.summary.physicalVertexCount,2);
});

test('authentic BM2 original XML is indexed without losing node occurrences or coordinates',()=>{
  const file=fileURLToPath(new URL('../Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml',import.meta.url));
  const original=readFileSync(file,'utf8');
  const out=index(original);
  // This is a real public source fixture, NOT the Owner private 21-claim XML.
  assert.equal(out.summary.originalNodeOccurrences,1196);
  assert.equal(out.sourceOccurrences.length,1196);
  assert.equal(out.vertexOfOccurrence.length,1196);
  assert.equal(out.summary.positionsRewritten,0);
  assert.equal(out.summary.nodeNumbersRewritten,0);
  assert.equal(out.summary.originalNodeOccurrences,
    [...out.vertexSizes.values()].reduce((n,value)=>n+value,0));
});
