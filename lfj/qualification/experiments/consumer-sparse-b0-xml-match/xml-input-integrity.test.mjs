import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assertResearchXmlDocument} from './xml-input-integrity.mjs';
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
];
for(const [index,xml] of broken.entries()){
  test('malformed input rejected '+index,()=>{
    assert.throws(()=>assertResearchXmlDocument(xml),
      e=>e?.code==='XML_INPUT_INVALID');
  });
}
test('valid XML prolog, nesting, attributes, comments and CDATA accepted',()=>{
  const xml='<?xml version="1.0"?><Root xmlns="URN"><!-- ok --><Node tag="&quot;"/>'+
    '<Node><V><![CDATA[x<y &z]]></V><T>&amp; &#x3e;</T></Node></Root>';
  assert.deepEqual(assertResearchXmlDocument(xml),{rootCount:1,elementCount:5,
    nodeElementCount:2,pipingElementCount:0});
});
