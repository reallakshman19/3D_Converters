import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {capturePreviewOriginalNodeOrdinals} from
  '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js';

installWeightBasisXmlDom(globalThis);
const source=`<PipeStressExport><Pipe><Branch><Branchname>/REPEATED/B1</Branchname>
  <Node><NodeNumber>-1</NodeNumber><ComponentType>GASK</ComponentType></Node>
  <Node><NodeNumber>-1</NodeNumber><ComponentType>VALV</ComponentType><ElementLengthMm>100</ElementLengthMm></Node>
  <Node><NodeNumber>201</NodeNumber><ComponentType>PIPE</ComponentType><ElementLengthMm>3</ElementLengthMm></Node>
  <Node><NodeNumber>-1</NodeNumber><ComponentType>VALV</ComponentType><ElementLengthMm>120</ElementLengthMm></Node>
</Branch></Pipe></PipeStressExport>`;

test('working-document source ordinal does not collapse when GASK and short nodes are removed',()=>{
  const doc=new DOMParser().parseFromString(source,'application/xml');
  const branch=doc.getElementsByTagName('Branch')[0];
  const nodes=[...branch.getElementsByTagName('Node')];
  assert.equal(nodes.length,4);
  const ordinal=capturePreviewOriginalNodeOrdinals(doc);
  assert.deepEqual(nodes.map(n=>ordinal.get(n)),[0,1,2,3]);
  nodes[0].parentNode.removeChild(nodes[0]); // existing dryrun gasket cleanup
  nodes[2].parentNode.removeChild(nodes[2]); // existing dryrun short-element cleanup
  const surviving=[...branch.getElementsByTagName('Node')];
  assert.equal(surviving.length,2);
  assert.deepEqual(surviving.map(n=>ordinal.get(n)),[1,3]);
  assert.deepEqual(surviving.map(n=>n.getElementsByTagName('NodeNumber')[0].textContent),['-1','-1']);
  assert.notDeepEqual(surviving.map((_,i)=>i),[1,3]);
});

test('new identity source marks are immutable only in the scoped working-document clone',()=>{
  const original=new DOMParser().parseFromString(source,'application/xml');
  const copy=original.cloneNode(true);
  const byOriginal=capturePreviewOriginalNodeOrdinals(original);
  const byWorking=capturePreviewOriginalNodeOrdinals(copy);
  const nodes=[...original.getElementsByTagName('Node')];
  const copies=[...copy.getElementsByTagName('Node')];
  assert.deepEqual(copies.map(n=>byWorking.get(n)),[0,1,2,3]);
  assert.ok(copies.every(n=>byOriginal.get(n)===undefined));
  copies[0].parentNode.removeChild(copies[0]);
  assert.equal(original.getElementsByTagName('Node').length,4);
  assert.equal(copy.getElementsByTagName('Node').length,3);
});

test('source and docs original node-ordinal code is byte identical, and strict drift gate remains intact',async()=>{
  const base=new URL('../tabs/xml-cii-2019-standalone/ui-adapted/',import.meta.url);
  const a=await readFile(new URL('xml-cii-adapted-preview-dryrun-core.js',base),'utf8');
  const b=await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js',import.meta.url),'utf8');
  assert.equal(a,b);
  assert.match(a,/capturePreviewOriginalNodeOrdinals\(document\)/);
  assert.match(a,/nodeOrdinal: originalNodeOrdinal/);
  assert.match(a,/Preview original source Node ordinal missing after cleanup; conversion blocked/);
  const wall=await readFile(new URL('xml-cii-adapted-preview-bore-wall-authority.js',base),'utf8');
  assert.match(wall,/Combined Preview node occurrence identity drift; conversion blocked/);
});
