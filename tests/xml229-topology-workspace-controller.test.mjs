import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';

installWeightBasisXmlDom(globalThis);
globalThis.window={devicePixelRatio:1};
globalThis.document={querySelector:()=>null};
const {mountTopologyWorkspace}=await import('../tabs/topology-workspace/workspace-app.mjs');

const xml='<Doc><Branch><Branchname>A</Branchname>'+
'<Node><NodeNumber>2050</NodeNumber><Position>0 0 0</Position>'+
'<ComponentType>PIPE</ComponentType></Node>'+
'<Node><NodeNumber>2060</NodeNumber><Position>10 0 0</Position>'+
'<ComponentType>PIPE</ComponentType></Node></Branch></Doc>';
const hash=value=>createHash('sha256').update(value).digest('hex');
const file=(body,name)=>({name,arrayBuffer:async()=>{
  const bytes=Buffer.from(body,'utf8');
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
}});
function fakeView(){
  const ctx={setTransform(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},
    stroke(){},arc(){},fill(){},fillText(){},setLineDash(){}};
  const canvas={
    handlers:{},getContext:()=>ctx,
    getBoundingClientRect:()=>({width:800,height:500,left:0,top:0}),
    addEventListener(name,callback){this.handlers[name]=callback;},
    removeEventListener(name){delete this.handlers[name];},
    setPointerCapture(){},
  };
  const names=['occurrences','occ-summary','plan-summary','issues','selection',
    'inspector','hits','analyze','cancel','status','source-meta','search'];
  const fields=Object.fromEntries(names.map(name=>
    ['[data-'+name+']',{innerHTML:'',textContent:'',disabled:false}]));
  fields['[data-canvas]']=canvas;
  const handlers={};
  const root={
    handlers,querySelector:selector=>fields[selector],
    querySelectorAll:()=>[],contains:()=>true,
    addEventListener(name,fn){handlers[name]=fn;},
    removeEventListener(name){delete handlers[name];},
  };
  return {root,canvas,fields,handlers};
}
const engineResponse=sourceText=>({
  ok:true,outputKind:'topology-sidecars',nativeCiiReleaseAuthorized:false,
  acceptedFinalTransferred:false,topoFixCommitted:false,topoFixXmlText:'',ciiText:null,
  topologyFixPlanText:JSON.stringify({source:{sha256:hash(sourceText)},actions:[
    {action_id:'ACT-1',disposition:'KEEP',status:'PROPOSED'},
    {action_id:'ACT-2',disposition:'SAFE_DROP_PIPE_GEOMETRY',status:'PROPOSED',finding_ids:['F-1']},
  ]}),
  topologyFindingsText:JSON.stringify({source:{sha256:hash(sourceText)},findings:[
    {finding_id:'F-1',node_keys:['B0:N2050:S0']},
  ]}),
});
function click(root,which,field,value) {
  const button={dataset:{[field]:value},hasAttribute:name=>name===which,
    closest(){return this;}};
  root.handlers.click({target:button});
}
test('admit an exact source and bind real engine contract without masters or Final',async()=>{
  const {root,fields}=fakeView(),calls=[];
  const work=mountTopologyWorkspace(root,{runEngine:async job=>{
    calls.push(job);return engineResponse(job.sourceText);
  }});
  try{
    await work.load(file(xml,'first.xml'));
    assert.equal(work.getState().occurrences,2);
    assert.match(fields['[data-source-meta]'].textContent,new RegExp(hash(xml)));
    assert.equal(fields['[data-analyze]'].disabled,false);
    await work.analyze();
    assert.equal(calls.length,1);
    assert.equal(calls[0].topologyPreFinalOnly,true);
    assert.equal(calls[0].sourceKind,'xml');
    assert.equal(calls[0].options.generateTopoFix,false);
    assert.equal(calls[0].options.analyzeTopology,true);
    assert.equal(calls[0].options.useTopoFixForCii,false);
    assert.equal('stagedJsonText' in calls[0],false);
    assert.equal('xml229NativeFinalPacket' in calls[0],false);
    assert.equal(work.getState().actions,2);
    assert.match(fields['[data-plan-summary]'].textContent,/1 KEEP/);
    assert.doesNotMatch(fields['[data-issues]'].innerHTML,/ACT-1/);
    assert.match(fields['[data-issues]'].innerHTML,/ACT-2/);
    click(root,'data-action-id','actionId','ACT-2');
    assert.equal(work.getState().selected.length,1);
    assert.match(work.getState().selected[0],/B0:N2050:S0$/);
    assert.match(fields['[data-selection]'].textContent,/1 source occurrence/);
    assert.equal(fields['[data-hits]'].textContent,'Source-qualified action witnesses: 1');
    click(root,'data-occ-id','occId',hash(xml)+':B0:N2060:S1');
    assert.equal(fields['[data-hits]'].textContent,'','Selecting an occurrence must clear stale action witness message');
  }finally{work.dispose();}
});
test('reject stale topology analysis after explicit source replacement',async()=>{
  const {root,fields}=fakeView();
  let resolveOld;
  const work=mountTopologyWorkspace(root,{runEngine:()=>new Promise(resolve=>{
    resolveOld=resolve;
  })});
  try{
    await work.load(file(xml,'first.xml'));
    const pending=work.analyze();
    await work.load(file(xml.replace('2060','2070'),'second.xml'));
    resolveOld(engineResponse(xml));
    await pending;
    assert.equal(work.getState().actions,0);
    assert.match(fields['[data-source-meta]'].textContent,/second.xml/);
    assert.equal(work.getState().busy,false);
  }finally{work.dispose();}
});
test('fail closed when a returned real-engine source SHA differs',async()=>{
  const {root,fields}=fakeView();
  const work=mountTopologyWorkspace(root,{runEngine:async()=>engineResponse(xml+' drift')});
  try{
    await work.load(file(xml,'first.xml'));
    await work.analyze();
    assert.equal(work.getState().actions,0);
    assert.match(fields['[data-status]'].textContent,/TOPOFIX_PLAN_SOURCE_DRIFT/);
  }finally{work.dispose();}
});

test('fail closed on an unexpected committed TopoFix or accepted Final',async()=>{
  for(const contamination of [
    {topoFixCommitted:true,topoFixXmlText:'<XML/>'},
    {acceptedFinalTransferred:true},
    {nativeCiiReleaseAuthorized:true},
    {ciiText:'NOT_ALLOWED'},
  ]){
    const {root,fields}=fakeView();
    const work=mountTopologyWorkspace(root,{runEngine:async()=>({
      ...engineResponse(xml),...contamination,
    })});
    try{
      await work.load(file(xml,'first.xml'));
      await work.analyze();
      assert.equal(work.getState().actions,0,'Rejected unexpected engineering authority');
      assert.match(fields['[data-status]'].textContent,/contract rejected/);
    }finally{work.dispose();}
  }
});
