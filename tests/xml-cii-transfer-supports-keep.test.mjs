// Support locks in step 10, step 3 (Owner 18 Nov 2026): with "UXML route" unticked, step 10's own route keeps the
// supports of the nodes the transfer protection note names ("supports": ["<Branchname>|<NodeNumber>"]), as the
// vendored UXML supports stage does. Measured before: the route's default-support steps put back a support CAESAR II
// removed (EF-05 node 90). Here the route's support rules add a LIM on node 20; the note says node 20 keeps its own.
import assert from 'node:assert/strict';
import test from 'node:test';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {enrichStandaloneXmlForRun} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity-mds-restraints.js';

installWeightBasisXmlDom(globalThis);

const node=(id,type,x,extra='')=>`<Node><NodeNumber>${id}</NodeNumber><NodeName>PS-${id}.1</NodeName><ComponentType>${type}</ComponentType><Position>${x} 0 0</Position><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.2</WallThickness>${extra}</Node>`;
const plusY='<Restraint><Type>+Y</Type><Stiffness>2.000000E+12</Stiffness><Gap>0</Gap><Friction>0.3</Friction></Restraint>';
const xml=(at20='')=>`<PipeStressExport><Pipe><Branch><Branchname>/KEEP/B1</Branchname>${node(10,'PIPE',0)}${node(20,'ATTA',100,at20)}${node(30,'PIPE',200)}</Branch></Pipe></PipeStressExport>`;
const source={type:'SUPPORT',attributes:{NAME:'/PS-20.1',DTXR:'LINE STOP',CMPSUPGAP:'25MM GAP',POS:{x:100,y:0,z:0}}};
const staged=JSON.stringify([{type:'BRANCH',name:'/KEEP/B1',children:[source]}]);
const config={weight:{enabled:false},pipingClass:{enabled:false},material:{enabled:false},dropGasketNodes:false,
  supportMapping:{version:2,rules:[{id:'keep-stop',source:'staged-json',field:'DTXR',match:'contains',pattern:'LINE STOP',kind:'LINESTOP',priority:1}]}};
const note=(extra)=>`<!--TOPOFIX-TRANSFER-PROTECT ${JSON.stringify({v:1,branches:{'/KEEP/B1':['Temperature/Temperature1']},nodes:{},...extra})}-->`;
const run=(sourceText)=>enrichStandaloneXmlForRun({sourceKind:'xml',sourceName:'keep.xml',sourceText,stagedJsonText:staged,
  supportConfigJson:JSON.stringify(config),options:{outputMode:'both',splitCondensedValveFlange:false}});
const NOTE_RE=/<!--\s*TOPOFIX-TRANSFER-PROTECT[\s\S]*?-->\r?\n?/;

function restraintsAt(xmlText,n){
  const doc=new DOMParser().parseFromString(xmlText,'application/xml');
  const hit=[...doc.getElementsByTagName('Node')].find((el)=>el.getElementsByTagName('NodeNumber')[0]?.textContent===String(n));
  return [...hit.getElementsByTagName('Restraint')].map((r)=>['Type','Stiffness'].map((k)=>r.getElementsByTagName(k)[0]?.textContent).join(' '));
}
const kept=(out)=>(out.diagnostics||[]).filter((d)=>d?.type==='transfer-supports');

test('control: without the note the route puts a LIM on node 20 (so the checks below are not empty)',async()=>{
  const out=await run(xml());
  assert.equal(out.applied,true,out.error);
  assert.deepEqual(restraintsAt(out.xmlText,20).map((r)=>r.split(' ')[0]),['LIM']);
  assert.equal(kept(out).length,0);
  assert.equal(out.stats.transferSupportsKept,undefined);
});

test('the note names node 20, which has no support in CAESAR II: the route keeps it without one, and says so',async()=>{
  const out=await run(note({supports:['/KEEP/B1|20']})+xml());
  assert.equal(out.applied,true,out.error);
  assert.deepEqual(restraintsAt(out.xmlText,20),[]);
  assert.equal(out.stats.transferSupportsKept,1);
  assert.deepEqual(kept(out).map((d)=>[d.severity,d.count]),[['info',1]]);
  assert.ok(out.logs.some((l)=>/^1 node\(s\) keep the supports transferred from CAESAR II/.test(l)),out.logs.join('\n'));
  assert.equal(out.evidence.ok,true);
  assert.match(out.xmlText,NOTE_RE,'the protection note is carried into the output');
});

test('the note names node 20 with a CAESAR II +Y: the route keeps exactly that +Y',async()=>{
  const out=await run(note({supports:['/KEEP/B1|20']})+xml(plusY));
  assert.equal(out.applied,true,out.error);
  assert.deepEqual(restraintsAt(out.xmlText,20),['+Y 2.000000E+12']);
  assert.match(out.xmlText,NOTE_RE);
});

test('a note without "supports" (today\'s note) gives the same output as before: nothing kept',async()=>{
  const [plain,todays]=await Promise.all([run(xml()),run(note({})+xml())]);
  assert.equal(kept(todays).length,0);
  assert.equal(todays.stats.transferSupportsKept,undefined);
  assert.equal(todays.xmlText.replace(NOTE_RE,''),plain.xmlText);
});

test('a note naming a node that is not there is reported, and nothing else changes',async()=>{
  const out=await run(note({supports:['/KEEP/B1|99999']})+xml());
  assert.equal(out.applied,true,out.error);
  assert.deepEqual(kept(out).map((d)=>d.code),['TRANSFER_SUPPORTS_NODE_NOT_FOUND']);
  assert.deepEqual(restraintsAt(out.xmlText,20).map((r)=>r.split(' ')[0]),['LIM']);
});
