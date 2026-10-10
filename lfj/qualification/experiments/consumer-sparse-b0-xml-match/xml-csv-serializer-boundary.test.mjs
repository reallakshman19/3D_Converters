/**
 * H04: prove exact function-call counts (not merely "no CSV result") from
 * the SAME qualification boundary invoked by the native XML matching Worker.
 * No fake serializer succeeds after a bad lexical/semantic XML source.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateAttestedResearchCsv} from './xml-csv-serializer-boundary.mjs';
import {assertResearchXmlDocument} from './xml-input-integrity.mjs';
import {parseStandaloneDtxrXmlNodes} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';

const n=(id='10',pos='1 2 3')=>
  '<Node><NodeNumber>'+id+'</NodeNumber><Position>'+pos+'</Position></Node>';
const xmlRoot=inner=>'<Root><Branchname>A</Branchname>'+inner+'</Root>';
const real=xmlRoot(n());
function invoke(xml,{alterNodes,alterRecords,alterPopulation,firstThrows}={}){
  let nodeCalls=0,evidenceCalls=0;
  const buildNodeCsv=()=>{
    nodeCalls++;
    if(firstThrows)throw Object.assign(new Error('node serializer failed'),
      {code:'SERIALIZER_SENTINEL'});
    return 'NODE_CSV';
  };
  const buildEvidenceCsv=()=>{evidenceCalls++;return 'EVIDENCE_CSV';};
  let code='SUCCESS',output=null,error=null;
  try{
    const originalXmlPopulation=assertResearchXmlDocument(xml);
    const parsed=parseStandaloneDtxrXmlNodes(xml);
    const nodes=alterNodes?alterNodes(parsed):parsed;
    const records=alterRecords?alterRecords(nodes.map(v=>({
      ...structuredClone(v),nodeNumber:v.xmlNodeNumber,nodeName:v.xmlNodeName
    }))):nodes.map(v=>({
      ...structuredClone(v),nodeNumber:v.xmlNodeNumber,nodeName:v.xmlNodeName
    }));
    const result={traceResolutionLedger:{nodes,records}};
    output=generateAttestedResearchCsv({
      xmlText:xml,
      originalXmlPopulation:alterPopulation?
        alterPopulation(originalXmlPopulation):originalXmlPopulation,
      result,records,buildNodeCsv,buildEvidenceCsv
    });
  }catch(e){code=e.code||e.name||'UNKNOWN';error=e;}
  return {code,output,error,nodeCalls,evidenceCalls};
}
test('valid real shipping XML invokes exactly both serializers once in order',()=>{
  const result=invoke(real);
  assert.equal(result.code,'SUCCESS');
  assert.equal(result.nodeCalls,1);
  assert.equal(result.evidenceCalls,1);
  assert.deepEqual(result.output,
    {nodeCsv:'NODE_CSV',evidenceCsv:'EVIDENCE_CSV'});
});
const bad=[
  ['shadow_comment_node',xmlRoot(
    '<Node><!-- <NodeNumber>999</NodeNumber> -->'+
    '<NodeNumber>10</NodeNumber><Position>1 2 3</Position></Node>'),
    'XML_SEMANTIC_MISMATCH'],
  ['numeric_entity_node',xmlRoot(n('&#49;0')),'XML_SEMANTIC_MISMATCH'],
  ['shadow_comment_branch','<Root><Branchname>A</Branchname>'+
    '<!-- <Branchname>FAKE</Branchname> -->'+n()+'</Root>',
    'XML_SEMANTIC_MISMATCH'],
  ['extra_coordinate_number',xmlRoot(n('10','1 2 3 999')),
    'XML_SEMANTIC_DOCUMENT_INVALID'],
  ['ambiguous_geometry',xmlRoot(n('10','ELBOW 90 SCH 80 DN 50')),
    'XML_SEMANTIC_DOCUMENT_INVALID'],
  ['missing_sibling_scope',
    '<Root><Pipe><Branch><Branchname>A</Branchname>'+n()+
    '</Branch><Branch>'+n('20')+'</Branch></Pipe></Root>',
    'XML_SEMANTIC_DOCUMENT_INVALID'],
  ['misleading_metadata',
    '<Root><Metadata><Branchname>FAKE</Branchname></Metadata>'+n()+'</Root>',
    'XML_SEMANTIC_DOCUMENT_INVALID'],
  ['bad_xml_missing_close','<Root>'+n(),'XML_INPUT_INVALID']
];
for(const [name,xml,expected] of bad){
  test('no serializer INVOCATION on '+name,()=>{
    const result=invoke(xml);
    assert.equal(result.code,expected,name+': '+result.error?.message);
    assert.equal(result.nodeCalls,0,name);
    assert.equal(result.evidenceCalls,0,name);
    assert.equal(result.output,null,name);
  });
}
test('population discrepancy prevents BOTH calls even if parser and ledger agree',()=>{
  const r=invoke(real,{alterPopulation:p=>({
    ...p,nodeElementCount:p.nodeElementCount+1
  })});
  assert.equal(r.code,'XML_LEDGER_CENSUS');
  assert.equal(r.nodeCalls,0);
  assert.equal(r.evidenceCalls,0);
});
test('ledger record semantics differ from XML: both serializers never entered',()=>{
  const r=invoke(real,{alterRecords:rows=>{
    rows[0].xmlBranch='WRONG';
    return rows;
  }});
  assert.equal(r.code,'XML_SEMANTIC_MISMATCH');
  assert.equal(r.nodeCalls,0);
  assert.equal(r.evidenceCalls,0);
});
test('first serializer failure does NOT invoke second',()=>{
  const r=invoke(real,{firstThrows:true});
  assert.equal(r.code,'SERIALIZER_SENTINEL');
  assert.equal(r.nodeCalls,1);
  assert.equal(r.evidenceCalls,0);
});
