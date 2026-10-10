/** A3.U03 source/session safety regressions for the REAL standalone state
 * and CSV download handlers. No mocked output oracle or production consent. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  currentResolverTraceRevision,updateWorkflowState,
  applyStandaloneResolverJsonTraceResult
} from './xml-cii-adapted-state.js';
import {
  downloadResolverTraceCsvFromUi,runResolverJsonTraceFromUi
} from './xml-cii-adapted-events.js';

const trace={traceResolutionLedger:{records:[{xmlIndex:1,status:'RESOLVED_POS'}]}};
const state=()=>({
  activePhaseId:'json-trace',sourceKind:'xml',
  sourceText:'<Root><Node /></Root>',sourceFile:null,
  stagedJsonText:'[]',stagedJsonFile:null,branchSelection:null,
  supportConfigJson:'{}',resolverJsonTraceConfig:{},
  resolverJsonTraceInputRevision:0,resolverJsonTraceAcceptedRevision:0,
  resolverJsonTraceResult:trace,resolverJsonTraceJsonResult:trace,
  resolverJsonTraceRunning:false,resolverJsonTraceExportStatus:'',
  result:null,masterContext:null
});
const changed=[
  ['sourceKind',{sourceKind:'auto'}],
  ['sourceText',{sourceText:'<Root><Other /></Root>'}],
  ['sourceFile',{sourceFile:{name:'another.xml'}}],
  ['stagedJsonText',{stagedJsonText:'[{"type":"BRANCH"}]'}],
  ['stagedJsonFile',{stagedJsonFile:{name:'new-json.json'}}],
  ['branchSelection',{branchSelection:['B2']}],
  ['supportConfigJson',{supportConfigJson:'{"resolverJsonTrace":{"mode":"changed"}}'}],
  ['resolverJsonTraceConfig',{resolverJsonTraceConfig:{coordinateTolerance:7}}]
];
for(const [kind,patch] of changed){
  test('A3 stale trace and both CSVs revoked on changed '+kind,()=>{
    const s=updateWorkflowState(state(),patch);
    assert.equal(currentResolverTraceRevision(s),1,kind);
    assert.equal(s.resolverJsonTraceResult,null);
    assert.equal(s.resolverJsonTraceJsonResult,null);
    assert.equal(s.resolverJsonTraceAcceptedRevision,null);
    assert.match(s.resolverJsonTraceExportStatus,/rebuild before exporting/);
    let renders=0;
    const ref={current:s};
    assert.equal(downloadResolverTraceCsvFromUi(ref,()=>renders++,'node-wise-trace'),null);
    assert.equal(downloadResolverTraceCsvFromUi(ref,()=>renders++,'evidence-tree'),null);
    assert.equal(renders,2);
    assert.match(ref.current.resolverJsonTraceExportStatus,/blocked/);
  });
}
test('A3 harmless phase and view changes preserve source-fenced trace',()=>{
  const s=updateWorkflowState(state(),{activePhaseId:'source',
    jsonTraceActiveSubTabId:'trace',result:null});
  assert.equal(s.resolverJsonTraceResult,trace);
  assert.equal(s.resolverJsonTraceJsonResult,trace);
  assert.equal(s.resolverJsonTraceAcceptedRevision,0);
  assert.equal(s.resolverJsonTraceInputRevision,0);
});
test('A3 applying newly saved Resolver config accepts only new build epoch',()=>{
  const old=state();
  const computed={...trace,supportConfigJson:'{"resolverJsonTrace":{"foo":1}}'};
  const next=applyStandaloneResolverJsonTraceResult(old,computed);
  assert.equal(next.resolverJsonTraceResult,computed);
  assert.equal(next.resolverJsonTraceJsonResult,computed);
  assert.equal(next.resolverJsonTraceAcceptedRevision,
    next.resolverJsonTraceInputRevision);
  assert.ok(next.resolverJsonTraceInputRevision>0,
    'auto-saved new support config must move epoch');
  const later=updateWorkflowState(next,{resolverJsonTraceConfig:{foo:2}});
  assert.equal(later.resolverJsonTraceResult,null);
  assert.equal(later.resolverJsonTraceAcceptedRevision,null);
});
test('A3 old in-flight FileReader Build cannot publish after new source',async()=>{
  const previousReader=globalThis.FileReader;
  let pendingReader=null,renders=0;
  class DeferredReader{
    readAsText(file){this.file=file;pendingReader=this;}
  }
  globalThis.FileReader=DeferredReader;
  try{
    const old=state();
    old.sourceText='';
    old.sourceFile={name:'old.xml'};
    old.resolverJsonTraceResult=null;
    old.resolverJsonTraceJsonResult=null;
    old.resolverJsonTraceAcceptedRevision=null;
    const ref={current:old};
    const work=runResolverJsonTraceFromUi({
      querySelector:()=>null
    },ref,()=>renders++,false);
    assert.ok(pendingReader,'real handler must read old source file');
    ref.current=updateWorkflowState(ref.current,{
      sourceFile:{name:'new.xml'},sourceText:'<Root>new source</Root>'
    });
    pendingReader.result='<Root>old source</Root>';
    pendingReader.onload();
    const outcome=await work;
    assert.equal(outcome,null);
    assert.equal(ref.current.resolverJsonTraceResult,null);
    assert.equal(ref.current.resolverJsonTraceJsonResult,null);
    assert.equal(ref.current.resolverJsonTraceAcceptedRevision,null);
    assert.match(ref.current.resolverJsonTraceExportStatus,/inputs changed during Build/);
    assert.equal(ref.current.resolverJsonTraceRunning,false);
    assert.ok(renders>=2);
  }finally{
    if(previousReader===undefined)delete globalThis.FileReader;
    else globalThis.FileReader=previousReader;
  }
});
