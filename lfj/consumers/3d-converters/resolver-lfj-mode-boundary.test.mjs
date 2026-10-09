/**
 * #1104 A06 RED: the actual event module must fence an in-flight legacy Build
 * when the user repicks source or explicitly switches to LFJ during await.
 * Node source-level harness evaluates unchanged event functions with injected
 * file readers and result writer. It is not browser/IDB acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=new URL('../../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',import.meta.url);
function eventHarness(){
  const actual=readFileSync(path,'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm,'')
    .replace(/\bexport\s+/g,'');
  let release;
  let reads=0,computes=0,renders=0;
  const xml=new Promise(resolve=>{release=resolve;});
  const update=(state,patch)=>({...state,...patch});
  const fn=new Function('updateWorkflowState','updateResolverJsonTraceConfig',
    'readTextFile','runStandaloneResolverJsonTrace','applyStandaloneResolverJsonTraceResult',
    'compareTraceResultsByComponentRef',
    actual+'\nreturn {runResolverJsonTraceFromUi};');
  const api=fn(update,(s,value)=>({...s,resolverJsonTraceConfig:value}),
    async file=>{reads++;return file.id==='XML'?xml:'[{"type":"VALVE"}]';},
    ()=>{computes++;return {resolvedFacts:[{id:1}]};},
    (state,result)=>({...state,resolverJsonTraceResult:result}),
    ()=>({}));
  const stateRef={current:{
    resolverLfjMode:'LEGACY',resolverLfjJobToken:'',
    sourceFile:{id:'XML'},stagedJsonFile:{id:'JSON'},
    sourceText:'',stagedJsonText:'',resolverJsonTraceConfig:{},
    resolverJsonTraceResult:null,resolverJsonTraceJsonResult:null
  }};
  const start=()=>api.runResolverJsonTraceFromUi(
    {querySelector:()=>null},stateRef,()=>{renders++;},false);
  return {start,stateRef,finishXml:()=>release('<Original/>'),
    stats:()=>({reads,computes,renders})};
}
test('A06/U06 RED: legacy Build must not publish engineering rows after LFJ mode replaces its source',async()=>{
  const v=eventHarness(),pending=v.start();
  v.stateRef.current={...v.stateRef.current,
    resolverLfjMode:'LFJ',resolverLfjJobToken:'lfj-new',
    resolverJsonTraceResult:null,resolverJsonTraceJsonResult:null};
  v.finishXml();
  await pending;
  assert.equal(v.stats().computes,0,
    'a delayed legacy build cannot execute domain processing after LFJ revokes it');
  assert.equal(v.stateRef.current.resolverJsonTraceResult,null);
  assert.equal(v.stateRef.current.resolverJsonTraceJsonResult,null);
});
test('A06/U06 RED: legacy Build must not publish if original staged file changed during await',async()=>{
  const v=eventHarness(),pending=v.start();
  v.stateRef.current={...v.stateRef.current,stagedJsonFile:{id:'REPLACEMENT'}};
  v.finishXml();
  await pending;
  assert.equal(v.stats().computes,0);
  assert.equal(v.stateRef.current.resolverJsonTraceResult,null);
});
test('A06/U06 already-LFJ Build still denies synchronous legacy engine and CSV authorization',async()=>{
  const v=eventHarness();
  v.stateRef.current={...v.stateRef.current,resolverLfjMode:'LFJ'};
  await v.start();
  assert.equal(v.stats().computes,0);
  assert.equal(v.stateRef.current.resolverJsonTraceResult,null);
});


test('A06/U07 committed LFJ source-only ready report invalidated by XML/master/config/scope edits',()=>{
  const actual=readFileSync(path,'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm,'')
    .replace(/\bexport\s+/g,'');
  const inspect=new Function('updateWorkflowState',
    actual+'\nreturn {basis:resolverLfjCurrentBasis,ready:resolverLfjReady,'+
    'cache:resolverLfjAttestations,render:renderResolverLfjSourceControl};')(
    (s,p)=>({...s,...p})
  );
  const invalidators=[
    {sourceText:'<XML-CHANGED/>'},
    {supportConfigJson:'{"changed":true}'},
    {masterContext:{name:'NEW-MASTER'}},
    {jsonTraceScopeId:'ZONE-OTHER'},
    {dependencyRevisions:{sourceRevision:3}}
  ];
  for(const changed of invalidators){
    const report={schema:'LFJ.3D.ResolverSourceAdmission.v1'};
    const state={resolverLfjMode:'LFJ',resolverLfjReport:report,
      stagedJsonFile:{name:'file.json'},sourceFile:{name:'file.xml'},
      sourceText:'<ORIGINAL/>',supportConfigJson:'{}',
      masterContext:{name:'MASTER-1'},dependencyRevisions:{sourceRevision:2},
      resolverJsonTraceConfig:{join:'unique'},jsonTraceScopeId:'ALL',
      branchSelection:[],resolverLfjJobToken:'original-job'};
    const stateRef={current:state};
    inspect.cache.set(stateRef,{report,basis:inspect.basis(state)});
    assert.equal(inspect.ready(stateRef),true);
    stateRef.current={...state,...changed};
    assert.equal(inspect.ready(stateRef),false,
      'a changed engineering dependency cannot retain SOURCE_ONLY READY');
    inspect.render({querySelector:()=>null},stateRef,()=>{});
    assert.equal(stateRef.current.resolverLfjReport,null,
      'stale original source report must be removed from application state');
  }
});
