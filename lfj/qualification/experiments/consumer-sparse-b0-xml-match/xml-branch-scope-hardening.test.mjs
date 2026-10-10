/**
 * H02 author regression: explicit XML Pipe/Branch scope cannot inherit a
 * previous sibling's Branchname, even when the legacy regex parser does.
 * Preserves root-flat sequential labels and authentic nested branches.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseStandaloneDtxrXmlNodes} from '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';
import {assertResearchXmlDocument,assertResearchXmlConsumerPopulation} from './xml-input-integrity.mjs';
import {independentXmlSemanticView,assertResearchXmlSemanticLedger} from './xml-semantic-attestor.mjs';
const n=(id=10)=>'<Node><NodeNumber>'+id+'</NodeNumber><Position>1 2 3</Position></Node>';
const wrap=inner=>'<Root>'+inner+'</Root>';
const pipe=(inner)=>'<Pipe>'+inner+'</Pipe>';
const br=(inner)=>'<Branch>'+inner+'</Branch>';
const bn=v=>'<Branchname>'+v+'</Branchname>';
function verify(xml){
  const population=assertResearchXmlDocument(xml);
  const nodes=parseStandaloneDtxrXmlNodes(xml);
  assertResearchXmlConsumerPopulation(population,nodes.length);
  const records=nodes.map(node=>({...structuredClone(node),
    nodeNumber:node.xmlNodeNumber,nodeName:node.xmlNodeName}));
  assertResearchXmlSemanticLedger(xml,nodes,records);
  return nodes;
}
const positives=[
 ['real_nested_pipe_branches',wrap(pipe(br(bn('A')+n(10))+br(bn('B')+n(20)))),['A','B']],
 ['sibling_named_pipes',wrap(pipe(bn('A')+n(10))+pipe(bn('B')+n(20))),['A','B']],
 ['same_label_in_separate_pipes',wrap(pipe(bn('A')+n(10))+pipe(bn('A')+n(20))),['A','A']],
 ['flat_sequential_labels',wrap(bn('A')+n(10)+bn('B')+n(20)),['A','B']],
 ['flat_repeated_labels',wrap(bn('A')+n(10)+bn('A')+n(20)),['A','A']],
 ['unnamed_flat_no_guess',wrap(n()),['']],
 ['pipe_branch_single',wrap(pipe(br(bn('C')+n()))),['C']],
 ['direct_attribute_branch_in_pipe',
   wrap(pipe('<PIPINGELEMENT NODE="10" POS="1 2 3" BRANCH="A"/>')),['A']]
];
for(const [name,xml,branches] of positives)
  test('H02 source accepted: '+name,()=>{
    const records=verify(xml);
    assert.deepEqual(records.map(n=>n.xmlBranch),branches);
  });
const bad=[
 ['unnamed_sibling_pipe',wrap(pipe(bn('A')+n(10))+pipe(n(20)))],
 ['unnamed_sibling_branch',wrap(pipe(br(bn('A')+n(10))+br(n(20))))],
 ['late_branch_inside_pipe',wrap(pipe(n(10)+bn('A')+n(20)))],
 ['late_branch_inside_branch',wrap(br(n(10)+bn('A')+n(20)))],
 ['root_name_cannot_authorize_new_pipe',wrap(bn('A')+pipe(n()))],
 ['duplicate_same_label_in_one_pipe',wrap(pipe(bn('A')+bn('A')+n()))],
 ['duplicate_conflicting_label_in_one_branch',wrap(br(bn('A')+bn('B')+n()))],
 ['node_embedded_branch',wrap(pipe(bn('A')+'<Node><NodeNumber>10</NodeNumber><Branchname>B</Branchname><Position>1 2 3</Position></Node>'))],
 ['metadata_nested_branch',wrap('<Metadata>'+bn('A')+'</Metadata>'+n())],
 ['metadata_line_key',wrap('<Metadata><LineKey>A</LineKey></Metadata>'+n())],
 ['empty_named_pipe',wrap(pipe(bn('')+n()))],
 ['unnamed_attribute_inside_pipe',wrap(
   pipe(bn('A')+'<PIPINGELEMENT NODE="10" POS="1 2 3" BRANCH="A"/>')+
   pipe('<PIPINGELEMENT NODE="20" POS="4 5 6"/>'))]
];
for(const [name,xml] of bad)
  test('H02 scoped identity fails closed: '+name,()=>{
    assert.throws(()=>verify(xml),{code:'XML_SEMANTIC_DOCUMENT_INVALID'});
  });
test('H02 orphan after a scoped branch cannot inherit the closed scope',()=>{
  const xml=wrap(pipe(br(bn('A')+n(10)))+n(20));
  const legacy=parseStandaloneDtxrXmlNodes(xml);
  assert.deepEqual(legacy.map(n=>n.xmlBranch),['A','A']);
  assert.throws(()=>verify(xml),{code:'XML_SEMANTIC_MISMATCH'});
});
test('H02 real legacy cross-pipe error proven, rather than invented ledger',()=>{
  const xml=wrap(pipe(bn('A')+n(10))+pipe(n(20)));
  const legacy=parseStandaloneDtxrXmlNodes(xml);
  assert.deepEqual(legacy.map(n=>n.xmlBranch),['A','A']);
  assert.throws(()=>independentXmlSemanticView(xml),
    {code:'XML_SEMANTIC_DOCUMENT_INVALID'});
});
