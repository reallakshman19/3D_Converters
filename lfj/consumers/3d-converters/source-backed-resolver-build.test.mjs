/** A3 product LFJ Worker preview state/routing regression, no fixture rewriting. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  createXmlCiiAdaptedWorkflowState,updateWorkflowState,
  currentResolverTraceRevision
} from '../../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js';
import {runSourceBackedResolverPreviewFromUi} from
  '../../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js';
import {projectionCaptureDigest,runProductSourceBackedResolver} from
  './source-backed-resolver-build.mjs';
import {configuredJsonTraceFieldNames} from
  '../../../tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js';
import {resolveSourceSchema} from
  '../../../converters/xml-cii2019-core/source-schema-adapter.js';

const originalView=Object.freeze({schema:'LFJ.A3.VerifiedResearchView.v1',
  xmlNodes:216,nodeWiseRows:[{xmlNode:'1'}],evidenceTreeRows:[]});
const basis=()=>({...createXmlCiiAdaptedWorkflowState(),
  sourceKind:'xml',sourceText:'<Root />',
  stagedJsonText:'[{"type":"BRANCH"}]',
  supportConfigJson:'{}',resolverJsonTraceConfig:{},
  resolverJsonTraceInputRevision:1,
  resolverResearchView:originalView});
const edits=[
  ['XML',{sourceText:'<Root><Node /></Root>'}],
  ['JSON',{stagedJsonText:'[{"type":"BRANCH","name":"B"}]'}],
  ['scope',{jsonTraceScopeId:'site-1'}],
  ['sourceFile',{sourceFile:{name:'other.xml'}}],
  ['stagedFile',{stagedJsonFile:{name:'other.json'}}],
  ['resolver config',{resolverJsonTraceConfig:{coordinateTolerance:1}}],
  ['branchSelection',{branchSelection:['BR-2']}],
  ['support config',{supportConfigJson:'{"sourceSchema":{}}'}]
];
for(const [name,patch] of edits)test('A3 pending Worker view invalidated on '+name,()=>{
  const old=basis(),next=updateWorkflowState(old,patch);
  assert.ok(currentResolverTraceRevision(next)>currentResolverTraceRevision(old));
  assert.equal(next.resolverResearchView,null);
  assert.equal(next.resolverResearchBuildToken,null);
});
test('A3 view-only navigation does not revoke pending Worker view',()=>{
  const old=basis(),next=updateWorkflowState(old,
    {activeSubTabId:'loader',jsonTraceActiveSubTabId:'tree'});
  assert.equal(next.resolverResearchView,originalView);
  assert.equal(currentResolverTraceRevision(next),1);
});
test('A3 independently computes exact H09 projection config capture SHA',async()=>{
  const config={captureFields:[{name:'SPREF',enabled:true}]};
  const actual=await projectionCaptureDigest(config);
  const expected=createHash('sha256').update(JSON.stringify({
    schema:'LFJ.B0.ResolverProjection.v1',config,toleranceMm:6,
    enabledFields:configuredJsonTraceFieldNames(config),
    resolvedSchema:resolveSourceSchema(config)
  })).digest('hex');
  assert.equal(actual,expected);
});
test('A3 product native chain refuses missing source or revision',async()=>{
  await assert.rejects(()=>runProductSourceBackedResolver({
    xmlText:'<Root/>',revision:0,currentRevision:()=>0
  }),e=>e?.code==='A3_PRODUCT_INPUT');
});
test('A3 product native chain refuses missing browser Worker with NO sync fallback',async()=>{
  if(typeof globalThis.Worker==='function')return;
  await assert.rejects(()=>runProductSourceBackedResolver({
    blob:new Blob(['[]']),xmlText:'<Root/>',revision:0,
    currentRevision:()=>0
  }),e=>e?.code==='A3_WORKER_REQUIRED');
});
test('A3 native UI refuses scoped Build before Worker publication',async()=>{
  const ref={current:{...basis(),jsonTraceScopeId:'site-1',
    resolverResearchView:null}},seen=[];
  const result=await runSourceBackedResolverPreviewFromUi(ref,()=>seen.push(true));
  assert.equal(result,null);
  assert.match(ref.current.resolverJsonTraceExportStatus,/A3_SCOPE_UNSUPPORTED/);
  assert.equal(ref.current.resolverResearchView,null);
  assert.equal(ref.current.resolverJsonTraceAcceptedRevision,null);
  assert.equal(ref.current.resolverJsonTraceRunning,false);
  assert.ok(seen.length>=2);
});
