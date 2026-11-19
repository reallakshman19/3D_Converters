// Group 1 (Owner 19 Nov 2026): with "UXML route" ticked, step 10's Enriched XML keeps the transfer protection note.
// Measured before: section 5's EF-05 XML (note lists supports 50/90/240) lost the note in step 10's Enriched XML, so a
// second step 10 run on that file put node 90's removed support back. The vendored supports stage writes plain XML
// (no comments); the route now carries the source's note into the XML it hands on, as the unticked route does.
import assert from 'node:assert/strict';
import test from 'node:test';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {enrichStandaloneXmlForUxmlRoute} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js';

installWeightBasisXmlDom(globalThis);

const node=(id,type,x)=>`<Node><NodeNumber>${id}</NodeNumber><NodeName>PS-${id}.1</NodeName><ComponentType>${type}</ComponentType><Position>${x} 0 0</Position><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness></Node>`;
const xml=`<PipeStressExport><Pipe><Branch><Branchname>/KEEP/B1</Branchname>${node(10,'PIPE',0)}${node(20,'ATTA',100)}${node(30,'PIPE',200)}</Branch></Pipe></PipeStressExport>`;
const source={type:'SUPPORT',attributes:{NAME:'/PS-20.1',DTXR:'LINE STOP',CMPSUPGAP:'25MM GAP',POS:{x:100,y:0,z:0}}};
const staged=JSON.stringify([{type:'BRANCH',name:'/KEEP/B1',children:[source]}]);
const config={weight:{enabled:false},pipingClass:{enabled:false},material:{enabled:false},dropGasketNodes:false,
  supportMapping:{version:2,rules:[{id:'keep-stop',source:'staged-json',field:'DTXR',match:'contains',pattern:'LINE STOP',kind:'LINESTOP',priority:1}]}};
const note=`<!--TOPOFIX-TRANSFER-PROTECT ${JSON.stringify({v:1,branches:{'/KEEP/B1':['Temperature/Temperature1']},nodes:{},supports:['/KEEP/B1|20']})}-->`;
const run=(sourceText)=>enrichStandaloneXmlForUxmlRoute({sourceKind:'xml',sourceName:'keep.xml',sourceText,stagedJsonText:staged,
  supportConfigJson:JSON.stringify(config),options:{outputMode:'both',splitCondensedValveFlange:false}});
function restraintsAt(xmlText,n){
  const doc=new DOMParser().parseFromString(xmlText,'application/xml');
  const hit=[...doc.getElementsByTagName('Node')].find((el)=>el.getElementsByTagName('NodeNumber')[0]?.textContent===String(n));
  return [...hit.getElementsByTagName('Restraint')].map((r)=>r.getElementsByTagName('Type')[0]?.textContent);
}
const NOTES=/<!--\s*TOPOFIX-TRANSFER-PROTECT[\s\S]*?-->/g;

test('UXML route: the note (with supports) is in the XML step 10 hands on, once, and node 20 keeps no support',async()=>{
  const out=await run(note+xml);
  assert.equal(out.applied,true,out.error);
  assert.equal(out.uxmlRoute?.parityOk,true,'the UXML route ran');
  assert.deepEqual(out.xmlText.match(NOTES),[note]);
  assert.deepEqual(restraintsAt(out.xmlText,20),[],'node 20 keeps no support (the stage would add a LIM)');
  assert.equal(out.evidence.ok,true);
});

test('control: without a note there is no note in the output',async()=>{
  const out=await run(xml);
  assert.equal(out.applied,true,out.error);
  assert.equal(out.xmlText.match(NOTES),null);
  assert.deepEqual(restraintsAt(out.xmlText,20),['LIM'],'without the note the stage adds the LIM (so the first test is not empty)');
});
