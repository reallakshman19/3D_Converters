import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assertResearchXmlDocument,assertResearchXmlConsumerPopulation} from
  './xml-input-integrity.mjs';
const broken=[
  '<Root><Node><X>unclosed</Node></Root>',
  '<Root><Node><X>bad</Node>',
  '<Root><Node></Node></Root>garbage',
  '<Root><Node></Node><Node></Root>',
  '<Root><Node></Node></Root><Again/>',
  '<Root><Node attr=nope/></Root>',
  '<Root><Node attr="one" attr="two"/></Root>',
  '<Root><Node attr="unterminated/></Root>',
  '<Root><!-- unclosed comment</Root>',
  '<Root><![CDATA[unclosed</Root>',
  '<Root>AT&T<Node/></Root>',
  '<!DOCTYPE Root [<!ENTITY x SYSTEM "file:///etc/passwd">]><Root>&x;</Root>',
  '<Root>before &unknown; after<Node/></Root>',
  '<Root><Node/><!unknown></Root>',
  '<Root><Node/></Root>tail',
  '<Root><Node/></Root><?xml version="1.0"?>',
  '<Root><!-- <Node></Node> --></Root>',
  '<Root><![CDATA[<Node></Node>]]></Root>',
  '<Root><!-- <PIPINGELEMENT/> --></Root>',
  '<Root><Node><T><![CDATA[</Node>]]></T></Node></Root>',
  '<Root><Node><!-- </Node> --><NodeNumber>10</NodeNumber></Node></Root>',
  '<Root><Node><?instruction </Node> ?><NodeNumber>10</NodeNumber></Node></Root>',
  '<Root><Node>text</Node ></Root>',
  '<Root><Node/><Node><NodeNumber>10</NodeNumber></Node></Root>',
  '<Root><Node/></Root>',
];
for(const [index,xml] of broken.entries()){
  test('malformed input rejected '+index,()=>{
    assert.throws(()=>assertResearchXmlDocument(xml),
      e=>e?.code==='XML_INPUT_INVALID');
  });
}
test('supported XML prolog, nesting, attributes, comments and CDATA accepted',()=>{
  const xml='<?xml version="1.0"?><Root xmlns="URN"><!-- ok --><Node tag="&quot;"></Node>'+
    '<Node><V><![CDATA[x<y &z]]></V><T>&amp; &#x3e;</T></Node></Root>';
  assert.deepEqual(assertResearchXmlDocument(xml),{rootCount:1,elementCount:5,
    nodeElementCount:2,pipingElementCount:0});
});

test('true Node / PIPINGELEMENT XML counts independently match legacy parsed count',()=>{
  assert.equal(assertResearchXmlConsumerPopulation(
    {nodeElementCount:216,pipingElementCount:0},216),216);
  assert.equal(assertResearchXmlConsumerPopulation(
    {nodeElementCount:0,pipingElementCount:3429},3429),3429);
});
test('valid nested XML whose regex parser omitted a Node must fail closed',()=>{
  const source=assertResearchXmlDocument(
    '<Root><Node><Node><NodeNumber>10</NodeNumber></Node></Node></Root>');
  assert.equal(source.nodeElementCount,2);
  assert.throws(()=>assertResearchXmlConsumerPopulation(source,1),
    error=>error?.code==='XML_LEDGER_CENSUS');
});
test('complete-looking derived ledger that lost one original Node rejects',()=>{
  assert.throws(()=>assertResearchXmlConsumerPopulation(
    {nodeElementCount:216,pipingElementCount:0},215),
    error=>error?.code==='XML_LEDGER_CENSUS');
});
test('unrecognized/mixed document forms fail rather than certify empty output',()=>{
  for(const src of [
    {nodeElementCount:0,pipingElementCount:0},
    {nodeElementCount:1,pipingElementCount:1}
  ])assert.throws(()=>assertResearchXmlConsumerPopulation(src,1),
    error=>error?.code==='XML_INPUT_INVALID');
});
