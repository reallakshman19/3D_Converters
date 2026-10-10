/**
 * Author-side source regression tests for #140; not the protected golden harness.
 * Runs real shipping XML discovery and compares its values with an independent
 * semantic scanner, rather than mutating an invented ledger only.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseStandaloneDtxrXmlNodes} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';
import {assertResearchXmlDocument,assertResearchXmlConsumerPopulation} from './xml-input-integrity.mjs';
import {independentXmlSemanticView,assertResearchXmlSemanticLedger} from './xml-semantic-attestor.mjs';
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1 as golden} from './authentic-original-output-goldens.mjs';

const root='<PipeStressExport><Branchname>TRUE</Branchname>';
const tail='</PipeStressExport>';
const start='<Node><NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>';
const original=root+start+tail;
const failures=[
  ['comment_number',root+'<Node><!-- <NodeNumber>999</NodeNumber> --><NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['comment_position',root+'<Node><!-- <Position>100 200 300</Position> --><NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['comment_branch',root+'<!-- <Branchname>FAKE</Branchname> -->'+start+tail],
  ['cdata_number',root+'<Node><![CDATA[<NodeNumber>777</NodeNumber>]]><NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['pi_number',root+'<Node><?shadow <NodeNumber>888</NodeNumber> ?><NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['numeric_node_number',root+'<Node><NodeNumber>&#49;0</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['hex_numeric_node_number',root+'<Node><NodeNumber>&#x31;0</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['numeric_position',root+'<Node><NodeNumber>10</NodeNumber><Position>&#49; 2 3</Position></Node>'+tail],
  ['numeric_branch','<PipeStressExport><Branchname>TR&#85;E</Branchname>'+start+tail],
  ['shadow_name',root+'<Node><!-- <NodeName>FAKE</NodeName> --><NodeName>PS10</NodeName><NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['shadow_componentref',root+'<Node><!-- <ComponentRefNo>FAKE</ComponentRefNo> --><ComponentRefNo>REF10</ComponentRefNo><NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>'+tail],
  ['piping_numeric_attr','<CAESARII><PIPINGMODEL><PIPINGELEMENT NODE="&#49;0" POS="1 2 3" BRANCH="TRUE"/></PIPINGMODEL></CAESARII>'],
  ['piping_hex_attr','<CAESARII><PIPINGMODEL><PIPINGELEMENT NODE="&#x31;0" POS="1 2 3" BRANCH="TRUE"/></PIPINGMODEL></CAESARII>']
];
const rows=nodes=>nodes.map(n=>({...structuredClone(n),
  nodeNumber:n.xmlNodeNumber,nodeName:n.xmlNodeName}));
const compare=xml=>{
  const population=assertResearchXmlDocument(xml);
  const nodes=parseStandaloneDtxrXmlNodes(xml);
  assertResearchXmlConsumerPopulation(population,nodes.length);
  return assertResearchXmlSemanticLedger(xml,nodes,rows(nodes));
};
test('positive control: source-to-ledger semantic identity',()=>{
  assert.equal(compare(original).length,1);
});
for(const [id,xml] of failures)
  test('fail-closed before CSV: '+id,()=>{
    assert.throws(()=>compare(xml),{code:'XML_SEMANTIC_MISMATCH'});
  });
test('fake closing tag cannot defeat structural preflight',()=>{
  const xml=root+'<Node><!-- </Node> --><NodeNumber>10</NodeNumber></Node>'+tail;
  assert.throws(()=>assertResearchXmlDocument(xml),{code:'XML_INPUT_INVALID'});
});
test('record-only corruption, reorder and omission are detected',()=>{
  const xml=root+start+start.replace('<NodeNumber>10</NodeNumber>','<NodeNumber>20</NodeNumber>')+tail;
  const nodes=parseStandaloneDtxrXmlNodes(xml);
  const records=rows(nodes);
  assert.equal(assertResearchXmlSemanticLedger(xml,nodes,records).length,2);
  records[1].xmlPosition='CORRUPTED';
  assert.throws(()=>assertResearchXmlSemanticLedger(xml,nodes,records),
    {code:'XML_SEMANTIC_MISMATCH'});
  assert.throws(()=>assertResearchXmlSemanticLedger(xml,nodes,[rows(nodes)[0]]),
    {code:'XML_SEMANTIC_MISMATCH'});
  const reversed=rows(nodes).reverse();
  reversed[0].xmlIndex=1;reversed[1].xmlIndex=2;
  assert.throws(()=>assertResearchXmlSemanticLedger(xml,nodes,reversed),
    {code:'XML_SEMANTIC_MISMATCH'});
});
test('malformed and unsupported XML forms fail closed',()=>{
  for(const xml of ['<R><Node></R>','<R>&bogus;</R>','<!DOCTYPE R><R/>',
    '<R><Node><NodeNumber>10</NodeNumber><NodeNumber>20</NodeNumber></Node></R>',
    '<R><Node><NodeNumber>&#x0;</NodeNumber></Node></R>'])
    assert.throws(()=>independentXmlSemanticView(xml),
      {code:'XML_SEMANTIC_DOCUMENT_INVALID'});
});
test('valid namespace, branch scoping, numeric entities and optional aliases',()=>{
  const xml='<R xmlns="urn:example"><Branch><Branchname>A</Branchname>'+
    '<Node><NodeNumber>10</NodeNumber><NodeName>PS10</NodeName></Node></Branch>'+
    '<Branch><Branchname>B</Branchname>'+
    '<Node><NodeNumber>&#50;0</NodeNumber></Node></Branch></R>';
  const view=independentXmlSemanticView(xml);
  assert.equal(view[0].xmlBranch,'A');
  assert.equal(view[1].xmlBranch,'B');
  assert.equal(view[1].xmlNodeNumber,'20');
  assert.throws(()=>independentXmlSemanticView(xml.replace(
    '<Branchname>B</Branchname>','')),
    {code:'XML_SEMANTIC_DOCUMENT_INVALID'});
  const n=structuredClone(view[0]),r=rows([n])[0];
  delete r.posPoint;delete r.posKey;
  const single='<R><Node><NodeNumber>10</NodeNumber></Node></R>';
  const element=independentXmlSemanticView(single)[0];
  const record=rows([element])[0];
  delete record.posPoint;delete record.posKey;
  assert.equal(assertResearchXmlSemanticLedger(single,[element],[record]).length,1);
});
function authentic(path,bytes,sha){
  const data=readFileSync(new URL('../../../../'+path,import.meta.url));
  assert.equal(data.byteLength,bytes,'authentic file length: '+path);
  assert.equal(createHash('sha256').update(data).digest('hex'),sha,
    'authentic SHA256: '+path);
  return data.toString('utf8');
}
for(const [id,expect] of [['firstpass',golden.firstpass],['largeNegative',golden.largeNegative]])
  test('authentic original XML source semantic preservation: '+id,()=>{
    const xml=authentic(expect.xmlPath,expect.xmlBytes,expect.xmlSha256);
    const nodes=parseStandaloneDtxrXmlNodes(xml);
    assert.equal(nodes.length,expect.xmlNodes);
    const population=assertResearchXmlDocument(xml);
    assert.equal(assertResearchXmlConsumerPopulation(population,nodes.length),
      expect.xmlNodes);
    assert.equal(assertResearchXmlSemanticLedger(xml,nodes,rows(nodes)).length,
      expect.xmlNodes);
    // Full ledger/CSV golden replay lives in independent child #141.
  });
