import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom}
  from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {proposeXml229PreFinalCanonicalNodeNumbers}
  from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-canonical-numbering-proposal.mjs';

installWeightBasisXmlDom(globalThis);
const node=(id,xyz)=>'<Node><NodeNumber>'+id+'</NodeNumber>'+
  '<Position>'+xyz+'</Position><ComponentType>ATTA</ComponentType></Node>';
const xml=(...branches)=>'<PipeStressExport><Pipe>'+branches.map((nodes,i)=>
  '<Branch><Branchname>/A/B'+(i+1)+'</Branchname>'+nodes.join('')+
  '</Branch>').join('')+'</Pipe></PipeStressExport>';
const propose=(original,final,retained)=>
  proposeXml229PreFinalCanonicalNodeNumbers({
    originalXmlText:original,finalizedXmlText:final,
    retainedSourceOrdinalsByBranch:retained,sourceXmlSha256:'source-sha256-test',
  });
function pyBridge(original,final,retained,proposal){
  const cwd=fileURLToPath(new URL('../',import.meta.url));
  const r=spawnSync('python3',['tests/xml229-canonical-node-native-parity-bridge.py'],{
    cwd,encoding:'utf8',timeout:25000,input:JSON.stringify({
      originalXmlText:original,finalizedXmlText:final,
      retainedSourceOrdinalsByBranch:retained,sourceXmlSha256:'source-sha256-test',
      canonicalNodeNumberProposal:proposal,
    }),
  });
  return r;
}

test('two original -1 aliases at one connected XYZ get one proposed ID and independent Python parity',()=>{
  const src=xml([node(10,'0 0 0'),node(-1,'100 0 0'),node(-1,'100.0 0 0'),
    node(20,'200 0 0')]);
  const dst=xml([node(10,'0 0 0'),node(30,'100 0 0'),node(40,'100.0 0 0'),
    node(20,'200 0 0')]);
  const retained=[[0,1,2,3]],receipt=propose(src,dst,retained);
  assert.equal(receipt.groups.length,1);
  assert.deepEqual(receipt.groups[0].sourceNodeOrdinals,[1,2]);
  assert.deepEqual(receipt.groups[0].currentFinalNodeNumbers,[30,40]);
  assert.equal(receipt.groups[0].proposedCanonicalNodeNumber,30);
  assert.equal(receipt.summary.proposedNativeNodeRelabels,1);
  assert.equal(receipt.summary.finalGeometryModified,false);
  assert.equal(receipt.summary.acceptedKgModified,false);
  const py=pyBridge(src,dst,retained,receipt);
  assert.equal(py.status,0,py.stderr);
  assert.equal(JSON.parse(py.stdout).parityVerified,true);
});

test('one original authored positive node ID remains the proposed identity',()=>{
  const src=xml([node(-1,'100 0 0'),node(150,'100 0 0')]);
  const dst=xml([node(200,'100 0 0'),node(150,'100 0 0')]);
  const receipt=propose(src,dst,[[0,1]]);
  assert.equal(receipt.groups[0].proposedCanonicalNodeNumber,150);
  assert.equal(pyBridge(src,dst,[[0,1]],receipt).status,0);
});

test('two different original positive IDs are not automatically welded',()=>{
  const src=xml([node(70,'100 0 0'),node(80,'100 0 0')]);
  const dst=src;
  const receipt=propose(src,dst,[[0,1]]);
  assert.equal(receipt.groups[0].proposedCanonicalNodeNumber,null);
  assert.equal(receipt.groups[0].reason,'DISTINCT_AUTHORED_POSITIVE_IDS');
  assert.equal(receipt.summary.needsEngineeringIdentityDecision,1);
  assert.equal(pyBridge(src,dst,[[0,1]],receipt).status,0);
});

test('unrelated disconnected node reusing canonical number blocks automatic proposal',()=>{
  const src=xml(
    [node(-1,'100 0 0'),node(-1,'100 0 0')],
    [node(30,'0 0 0'),node(80,'50 0 0')]);
  const dst=xml(
    [node(30,'100 0 0'),node(40,'100 0 0')],
    [node(30,'0 0 0'),node(80,'50 0 0')]);
  const receipt=propose(src,dst,[[0,1],[0,1]]);
  assert.equal(receipt.groups[0].reason,'CANONICAL_ID_OWNED_OUTSIDE_CONNECTED_VERTEX');
  assert.equal(receipt.groups[0].proposedCanonicalNodeNumber,null);
  assert.equal(pyBridge(src,dst,[[0,1],[0,1]],receipt).status,0);
});

test('nonadjacent original ordinals cannot fake a connected same-XYZ pair',()=>{
  const src=xml([node(-1,'0 0 0'),node(20,'100 0 0'),node(-1,'0 0 0')]);
  const dst=xml([node(30,'0 0 0'),node(40,'0 0 0')]);
  const receipt=propose(src,dst,[[0,2]]);
  assert.equal(receipt.groups.length,0);
  assert.equal(pyBridge(src,dst,[[0,2]],receipt).status,0);
});

test('0.5mm-near points are not merged; exact 100 and 100.000 are',()=>{
  const src=xml([node(-1,'100 0 0'),node(-1,'100.2 0 0'),
    node(-1,'100.000 0 0')]);
  const dst=xml([node(300,'100 0 0'),node(310,'100.2 0 0'),
    node(320,'100.000 0 0')]);
  const receipt=propose(src,dst,[[0,1,2]]);
  assert.equal(receipt.groups.length,0);
});

test('native rejects a proposal with one node ID or source ordinal tampered',()=>{
  const src=xml([node(-1,'100 0 0'),node(-1,'100 0 0')]);
  const dst=xml([node(110,'100 0 0'),node(120,'100 0 0')]);
  const receipt=propose(src,dst,[[0,1]]);
  const falsified=structuredClone(receipt);
  falsified.groups[0].proposedCanonicalNodeNumber=9999;
  const py=pyBridge(src,dst,[[0,1]],falsified);
  assert.notEqual(py.status,0);
  assert.match(py.stderr,/NATIVE_CANONICAL_PROPOSAL_PARITY_DRIFT/);
  const forged=structuredClone(receipt);
  forged.groups[0].sourceNodeOrdinals=[0,0];
  assert.notEqual(pyBridge(src,dst,[[0,1]],forged).status,0);
});

test('both verifiers reject original coordinate movement disguised by numeric formatting',()=>{
  const src=xml([node(-1,'100 0 0'),node(-1,'100 0 0')]);
  const dst=xml([node(110,'100.0 0 0'),node(120,'100 0 0')]);
  assert.throws(()=>propose(src,dst,[[0,1]]),
    {code:'XML229_CANONICAL_PROPOSAL_ORIGINAL_POSITION_DRIFT'});
  const valid=propose(src,xml([node(110,'100 0 0'),node(120,'100 0 0')]),[[0,1]]);
  const result=pyBridge(src,dst,[[0,1]],valid);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/NATIVE_CANONICAL_PROPOSAL_ORIGINAL_POSITION_DRIFT/);
});

test('authentic public BM2 source index allows only explicit original occurrence IDs',()=>{
  const file=fileURLToPath(new URL(
    '../Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml',
    import.meta.url));
  const original=readFileSync(file,'utf8');
  const doc=new DOMParser().parseFromString(original,'application/xml');
  const branches=[...doc.getElementsByTagName('Branch')];
  let next=10000000,oldCount=0;
  const retained=branches.map(b=>{
    const nodes=[...b.childNodes].filter(n=>n.nodeType===1&&n.localName==='Node');
    oldCount+=nodes.length;
    for(const node of nodes){
      const id=node.getElementsByTagName('NodeNumber')[0];
      if(Number(id.textContent)<=0)id.textContent=String(next++);
    }
    return nodes.map((_,i)=>i);
  });
  const review=new XMLSerializer().serializeToString(doc);
  const receipt=propose(original,review,retained);
  assert.equal(receipt.originalNodeCount,1196);
  assert.equal(receipt.retainedFinalNodeOccurrences,1196);
  assert.equal(receipt.summary.sourcePositionsChanged,0);
  assert.equal(receipt.summary.acceptedKgModified,false);
  assert.equal(pyBridge(original,review,retained,receipt).status,0);
});
