/**
 * H01: independent source grammar must not agree with a misleading permissive
 * first-three-numbers geometry interpretation. Retain authentic source/PS-only
 * behaviors; never modify the frozen original golden fixtures.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {independentXmlSemanticView,assertResearchXmlSemanticLedger}
  from './xml-semantic-attestor.mjs';
import {assertResearchXmlDocument,assertResearchXmlConsumerPopulation}
  from './xml-input-integrity.mjs';
import {parseStandaloneDtxrXmlNodes,parseStandaloneDtxrPoint}
  from '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';

const rootStart='<Root><Branchname>/ASIM-1885/B1</Branchname>';
const rootEnd='</Root>';
const node=(fields)=>'<Node><NodeNumber>10</NodeNumber>'+fields+'</Node>';
const wrap=fields=>rootStart+node(fields)+rootEnd;
function compare(xml){
  const population=assertResearchXmlDocument(xml);
  const nodes=parseStandaloneDtxrXmlNodes(xml);
  assertResearchXmlConsumerPopulation(population,nodes.length);
  const records=nodes.map(n=>({...structuredClone(n),
    nodeNumber:n.xmlNodeNumber,nodeName:n.xmlNodeName}));
  return assertResearchXmlSemanticLedger(xml,nodes,records);
}
const bad=[
  ['description_three_numbers',wrap('<DTXR_POS>ELBOW 90 SCH 80 DN 50</DTXR_POS>')],
  ['explicit_four_numbers',wrap('<Position>1 2 3 999</Position>')],
  ['explicit_two_numbers',wrap('<Position>1 2</Position>')],
  ['explicit_free_text',wrap('<Position>ELBOW 90 SCH 80 DN 50</Position>')],
  ['explicit_partial_labels',wrap('<Position>E=1 N=2</Position>')],
  ['explicit_repeated_axis',wrap('<Position>E=1 E=2 N=3 EL=4</Position>')],
  ['explicit_floating_suffix',wrap('<Position>1 2 3kg</Position>')],
  ['description_ambiguous_directional',
    wrap('<DTXR_POS>Direction E=10 N=20 EL=30</DTXR_POS>')],
  ['attribute_four_numbers','<R><PIPINGELEMENT NODE="10" POS="1 2 3 4"/></R>'],
  ['attribute_text_fallback','<R><PIPINGELEMENT NODE="10" DTXR_POS="ELBOW 90 SCH 80 DN 50"/></R>'],
  ['attribute_partial_xyz','<R><PIPINGELEMENT NODE="10" X="1" Y="2"/></R>'],
  ['attribute_nonfinite_xyz','<R><PIPINGELEMENT NODE="10" X="1" Y="2" Z="Infinity"/></R>']
];
test('RED baseline illustrates shared permissive parser interpretation',()=>{
  assert.deepEqual(parseStandaloneDtxrPoint('ELBOW 90 SCH 80 DN 50'),
    {x:90,y:80,z:50});
  assert.deepEqual(parseStandaloneDtxrPoint('1 2 3 999'),{x:1,y:2,z:3});
});
for(const [id,xml] of bad){
  test('H01 semantic fail closed: '+id,()=>{
    assert.throws(()=>compare(xml),{code:'XML_SEMANTIC_DOCUMENT_INVALID'});
  });
}
const allowed=[
  ['blank_position_is_not_geometry',wrap('<Position></Position><NodeName>PS10</NodeName>'),null],
  ['descriptive_noncoordinate_dtxr',wrap('<DTXR_POS>ELBOW 90 DEG SCH 80</DTXR_POS>'),null],
  ['whitespace_triple',wrap('<Position> 1 -2 3.5 </Position>'),{x:1,y:-2,z:3.5}],
  ['comma_triple',wrap('<Position>1,2,3</Position>'),{x:1,y:2,z:3}],
  ['scientific_triple',wrap('<Position>1e2 -2.0E+2 3.25e-1</Position>'),{x:100,y:-200,z:0.325}],
  ['labeled_coordinate',wrap('<Position>E=1 N=-2 EL=3</Position>'),{x:1,y:-2,z:3}],
  ['directional_coordinate',wrap('<Position>W=1 S=2 D=3</Position>'),{x:-1,y:-2,z:-3}],
  ['attribute_xyz','<R><PIPINGELEMENT NODE="10" X="1" Y="-2" Z="3"/></R>',{x:1,y:-2,z:3}],
  ['description_no_geometry','<R><PIPINGELEMENT NODE="10" DTXR_POS="ELBOW 90 SCH 80"/></R>',null]
];
for(const [id,xml,expect] of allowed)
  test('H01 valid source semantics: '+id,()=>{
    const out=compare(xml);
    assert.equal(out.length,1);
    assert.deepEqual(out[0].xmlPoint,expect);
  });
test('H01 strict grammar rejects wrong fourth number before output even when original ledger agrees',()=>{
  const xml=wrap('<Position>1 2 3 999</Position>');
  const original=parseStandaloneDtxrXmlNodes(xml);
  assert.deepEqual(original[0].xmlPoint,{x:1,y:2,z:3});
  assert.throws(()=>independentXmlSemanticView(xml),
    {code:'XML_SEMANTIC_DOCUMENT_INVALID'});
});
