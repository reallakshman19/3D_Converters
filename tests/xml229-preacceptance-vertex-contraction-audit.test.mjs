import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {auditXml229PreacceptanceVertexContractions}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-preacceptance-vertex-contraction-audit.mjs';

installWeightBasisXmlDom(globalThis);
const node=(id,x,component='PIPE',extra='')=>'<Node><NodeNumber>'+id+'</NodeNumber>'+
  '<Position>'+x+'</Position><ComponentType>'+component+'</ComponentType>'+
  extra+'</Node>';
const branch=(name,...rows)=>'<Branch><Branchname>'+name+'</Branchname>'+
  rows.join('')+'</Branch>';
const xml=(...bs)=>'<PipeStressExport><Pipe>'+bs.join('')+'</Pipe></PipeStressExport>';
function audit(originalXmlText,finalizedXmlText,retainedSourceOrdinalsByBranch,aliases=[]){
  return auditXml229PreacceptanceVertexContractions({
    originalXmlText,finalizedXmlText,retainedSourceOrdinalsByBranch,
    branchConnectionAliases:aliases,sourceXmlSha256:'source-sha',
  });
}
function native(originalXmlText,finalizedXmlText,retained,claimed,aliases=[]){
  const cwd=fileURLToPath(new URL('../',import.meta.url));
  return spawnSync('python3',['tests/xml229-preacceptance-contraction-native-parity.py'],{
    cwd,encoding:'utf8',timeout:30000,input:JSON.stringify({
      originalXmlText,finalizedXmlText,
      retainedSourceOrdinalsByBranch:retained,
      canonicalVertexContractionAudit:claimed,
      branchConnectionAliases:aliases,sourceXmlSha256:'source-sha',
    }),
  });
}
const source=()=>xml(branch('/A/B1',
  node(10,'0 0 0'),node(-1,'100 0 0','ATTA'),
  node(-1,'100.000 0 0','ATTA'),node(20,'200 0 0')));
const final=()=>xml(branch('/A/B1',
  node(10,'0 0 0'),node(110,'100 0 0','ATTA'),
  node(120,'100.000 0 0','ATTA'),node(20,'200 0 0')));

test('two original -1 aliases have ONE vertex but a retained zero-length XML edge',()=>{
  const original=source(),finalized=final(),retained=[[0,1,2,3]];
  const r=audit(original,finalized,retained);
  assert.equal(r.summary.zeroLengthRunsRequiringTopologyReview,1);
  assert.equal(r.summary.retainedZeroLengthSourceEdges,1);
  assert.equal(r.summary.topologyContracted,false);
  assert.equal(r.candidates[0].requiredContractions,1);
  assert.equal(r.candidates[0].nativeNodeNumberReuseAllowedNow,false);
  assert(r.candidates[0].reasons.includes('ZERO_LENGTH_SOURCE_EDGE_MUST_CONTRACT'));
  assert.equal(r.summary.nativeCiiReleaseAuthorized,false);
  const py=native(original,finalized,retained,r);
  assert.equal(py.status,0,py.stderr);
});

test('welding adjacent source rows before contracting the edge is a native self-edge violation',()=>{
  const original=source(),finalized=xml(branch('/A/B1',
    node(10,'0 0 0'),node(110,'100 0 0','ATTA'),
    node(110,'100.000 0 0','ATTA'),node(20,'200 0 0')));
  const r=audit(original,finalized,[[0,1,2,3]]);
  assert.equal(r.summary.prematureNativeIdSelfEdges,1);
  assert(r.candidates[0].reasons.includes('SELF_EDGE_FROM_PREMATURE_NATIVE_ID_WELD'));
  assert.equal(native(original,finalized,[[0,1,2,3]],r).status,0);
});

test('when preview already pruned redundant original alias, no retained self-edge exists',()=>{
  const original=source(),finalized=xml(branch('/A/B1',
    node(10,'0 0 0'),node(110,'100 0 0','ATTA'),node(20,'200 0 0')));
  const r=audit(original,finalized,[[0,1,3]]);
  assert.equal(r.summary.retainedZeroLengthSourceEdges,0);
  assert.equal(r.summary.alreadyPrunedZeroLengthSourceEdges,1);
  assert.equal(r.candidates[0].status,'SOURCE_ZERO_EDGE_ALREADY_PRUNED');
  assert.equal(r.candidates[0].nativeNodeNumberReuseAllowedNow,false);
  assert.equal(native(original,finalized,[[0,1,3]],r).status,0);
});

test('two disconnected pipes crossing same XYZ are NOT candidates for welding',()=>{
  const original=xml(
    branch('/A/B1',node(-1,'0 0 0','ATTA'),node(10,'100 0 0')),
    branch('/B/B1',node(-1,'0 0 0','ATTA'),node(20,'0 100 0')));
  const finalized=xml(
    branch('/A/B1',node(110,'0 0 0','ATTA'),node(10,'100 0 0')),
    branch('/B/B1',node(120,'0 0 0','ATTA'),node(20,'0 100 0')));
  const r=audit(original,finalized,[[0,1],[0,1]]);
  assert.equal(r.summary.zeroLengthRunsRequiringTopologyReview,0);
  assert.equal(r.summary.exactSourcePhysicalVertices,4);
  assert.equal(native(original,finalized,[[0,1],[0,1]],r).status,0);
});

test('disconnected physical vertices accidentally sharing a native ID remain distinct',()=>{
  const original=xml(
    branch('/A/B1',node(-1,'0 0 0','ATTA'),node(10,'100 0 0')),
    branch('/B/B1',node(-1,'0 0 0','ATTA'),node(20,'0 100 0')));
  const finalized=xml(
    branch('/A/B1',node(110,'0 0 0','ATTA'),node(10,'100 0 0')),
    branch('/B/B1',node(110,'0 0 0','ATTA'),node(20,'0 100 0')));
  const r=audit(original,finalized,[[0,1],[0,1]]);
  assert.equal(r.summary.disconnectedNativeIdCollisions,1);
  assert.equal(native(original,finalized,[[0,1],[0,1]],r).status,0);
});

test('original distinct positive node identities stay distinct and require review',()=>{
  const original=xml(branch('/A/B1',
    node(70,'100 0 0','ATTA'),node(80,'100 0 0','ATTA')));
  const finalized=original;
  const r=audit(original,finalized,[[0,1]]);
  assert(r.candidates[0].reasons.includes('CONFLICTING_AUTHORED_POSITIVE_IDENTITIES'));
  assert.equal(native(original,finalized,[[0,1]],r).status,0);
});

test('native rejects a forged Worker candidate or altered edge contraction count',()=>{
  const original=source(),finalized=final(),retained=[[0,1,2,3]];
  const r=audit(original,finalized,retained);
  const forged=structuredClone(r);
  forged.summary.retainedZeroLengthSourceEdges=0;
  const py=native(original,finalized,retained,forged);
  assert.notEqual(py.status,0);
  assert.match(py.stderr,/NATIVE_CONTRACTION_AUDIT_DRIFT/);
  const forgedIds=structuredClone(r);
  forgedIds.candidates[0].sourceNodeOrdinals=[0,2];
  assert.notEqual(native(original,finalized,retained,forgedIds).status,0);
});

test('a changed source Position is rejected by both Worker and independent native',()=>{
  const original=source(),finalized=final().replace(
    '<Position>100 0 0</Position>','<Position>100.0 0 0</Position>');
  assert.throws(()=>audit(original,finalized,[[0,1,2,3]]),
    {code:'XML229_CONTRACTION_ORIGINAL_POSITION_DRIFT'});
  const valid=audit(original,final(),[[0,1,2,3]]);
  const py=native(original,finalized,[[0,1,2,3]],valid);
  assert.notEqual(py.status,0);
  assert.match(py.stderr,/NATIVE_CONTRACTION_ORIGINAL_POSITION_DRIFT/);
});

test('BM2 authentic XML source node census is verified with no invented geometry',()=>{
  const original=readFileSync(fileURLToPath(new URL(
    '../Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml',
    import.meta.url)),'utf8');
  const doc=new DOMParser().parseFromString(original,'application/xml');
  let counter=9000000;
  const retained=[...doc.getElementsByTagName('Branch')].map(b=>{
    const rows=[...b.childNodes].filter(v=>v.nodeType===1&&v.localName==='Node');
    for(const row of rows){
      const child=row.getElementsByTagName('NodeNumber')[0];
      if(Number(child.textContent)<=0)child.textContent=String(counter++);
    }
    return rows.map((_,i)=>i);
  });
  const finalized=new XMLSerializer().serializeToString(doc);
  const r=audit(original,finalized,retained);
  assert.equal(r.originalNodeOccurrences,1196);
  assert.equal(r.retainedNodeOccurrences,1196);
  assert.equal(r.summary.originalPositionsChanged,0);
  assert.equal(r.summary.physicalMassOwnersReassigned,0);
  assert.equal(native(original,finalized,retained,r).status,0);
});
