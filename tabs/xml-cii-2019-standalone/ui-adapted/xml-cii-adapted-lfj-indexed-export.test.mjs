import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createIndexedExportReceipt,verifyIndexedProductCsv
} from './xml-cii-adapted-lfj-indexed-export.js';
import {
  bindResolverEvents,downloadResolverTraceCsvFromUi
} from './xml-cii-adapted-events.js';
import {updateWorkflowState,currentResolverTraceRevision} from './xml-cii-adapted-state.js';
import {
  XML_NODE_TRACE_HEADERS,EVIDENCE_TREE_HEADERS,serializeRowsToCsv
} from '../xml-cii-trace-export.js';

const sha=async text=>[...new Uint8Array(
  await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))]
  .map(x=>x.toString(16).padStart(2,'0')).join('');
const raw='[{"type":"BRANCH","name":"original","children":[]}]';
const xml='<Root><Node>Original</Node></Root>';
const nodes=[{xmlNode:'1',xmlBranch:'A',componentType:'SUPPORT',status:'RESOLVED_POS'}];
const evidence=[{branch:'A',sourceNodeNo:'1',sourcePath:'$[0].children[0]'}];
async function fixture(){
  const nodeCsv=serializeRowsToCsv(XML_NODE_TRACE_HEADERS,nodes);
  const evidenceCsv=serializeRowsToCsv(EVIDENCE_TREE_HEADERS,evidence);
  const originalSha256=await sha(raw),xmlSha256=await sha(xml);
  const preview={
    mode:'lfj-indexed-preview',status:'SOURCE_PINNED_PREVIEW_ONLY',
    sourceOnly:true,engineeringReady:false,downloadAuthorized:false,
    originalSha256,xmlSha256,nodeWiseCsvSha256:await sha(nodeCsv),
    evidenceTreeCsvSha256:await sha(evidenceCsv),
    xmlNodes:1,matchedXmlNodes:1,
    nodeWiseRows:structuredClone(nodes),evidenceTreeRows:structuredClone(evidence)
  };
  const sourceFile=new Blob([raw],{type:'application/json'});
  const config={};
  const revision=1;
  const receipt=createIndexedExportReceipt({preview,config,revision,sourceFile});
  return {preview,sourceFile,config,receipt,revision,nodeCsv,evidenceCsv};
}
const args=(f,kind='node-wise-trace')=>({
  ...f,kind,xmlText:xml,optIn:true,isCurrent:()=>true
});

test('product receipt requires original research flags and complete row census',async()=>{
  const f=await fixture();
  assert.equal(f.receipt.originalSha256,f.preview.originalSha256);
  assert.equal(Object.isFrozen(f.receipt),true);
  assert.throws(()=>createIndexedExportReceipt({
    ...f,preview:{...f.preview,downloadAuthorized:true}}),
  e=>e.code==='LFJ_EXPORT_RECEIPT');
  assert.throws(()=>createIndexedExportReceipt({
    ...f,preview:{...f.preview,nodeWiseRows:[]}}),
  e=>e.code==='LFJ_EXPORT_RECEIPT');
});

test('original source and both local CSV bytes admit with exact hashes/BOM',async()=>{
  const f=await fixture();
  for(const [kind,expected] of [
    ['node-wise-trace',f.nodeCsv],['evidence-tree',f.evidenceCsv]
  ]){
    const result=await verifyIndexedProductCsv(args(f,kind));
    assert.equal(result.content,expected);
    assert.equal(result.content.charCodeAt(0),0xFEFF);
    assert.equal(result.sha256,await sha(expected));
    assert.equal(result.downstreamEngineeringAuthorized,false);
  }
});

test('deny no consent, wrong mode, altered rows, altered source, wrong config, changed rev',async()=>{
  const f=await fixture();
  for(const changed of [
    {optIn:false},
    {preview:{...f.preview,downloadAuthorized:true}},
    {sourceFile:new Blob([raw+' '])},
    {xmlText:xml+'<Node/>'},
    {config:{coordinateTolerance:99}},
    {revision:f.revision+1},
    {kind:'unrecognized'},
    {isCurrent:()=>false},
    {receipt:{...f.receipt}}
  ]){
    await assert.rejects(verifyIndexedProductCsv({...args(f),...changed}),
      e=>/^LFJ_EXPORT_/.test(e?.code));
  }
  f.preview.nodeWiseRows[0].xmlNode='tampered';
  await assert.rejects(verifyIndexedProductCsv(args(f)),
    e=>e.code==='LFJ_EXPORT_CSV_DIGEST');
});

test('source replacement, config change and mode change revoke consent/receipt',async()=>{
  const f=await fixture();
  const state={
    activePhaseId:'json-trace',sourceKind:'xml',sourceText:xml,sourceFile:null,
    resolverSourceMode:'lfj-indexed-preview',stagedJsonFile:f.sourceFile,
    stagedJsonText:'',resolverJsonTraceConfig:{},supportConfigJson:'{}',
    resolverJsonTraceInputRevision:1,resolverJsonTraceAcceptedRevision:null,
    lfjIndexedPreview:f.preview,lfjIndexedExportReceipt:f.receipt,
    lfjIndexedExportOptIn:true,masterContext:null
  };
  for(const patch of [
    {sourceText:'<New />'},
    {stagedJsonFile:new Blob([raw])},
    {resolverJsonTraceConfig:{coordinateTolerance:7}},
    {resolverSourceMode:'legacy'}
  ]){
    const updated=updateWorkflowState(state,patch);
    assert.equal(updated.lfjIndexedExportReceipt,null);
    assert.equal(updated.lfjIndexedExportOptIn,false);
    assert.equal(updated.lfjIndexedPreview,null);
    assert.ok(currentResolverTraceRevision(updated)>1);
  }
});

test('real opt-in event only consents to completed receipt, never before Build',async()=>{
  const f=await fixture(),callbacks={};
  let renders=0;
  const ref={current:{
    activePhaseId:'json-trace',sourceKind:'xml',sourceText:xml,
    stagedJsonFile:f.sourceFile,stagedJsonText:'',
    resolverSourceMode:'lfj-indexed-preview',resolverJsonTraceInputRevision:1,
    resolverJsonTraceConfig:{},lfjIndexedPreview:null,
    lfjIndexedExportReceipt:null,lfjIndexedExportOptIn:false,
    resolverJsonTraceRunning:false,masterContext:null
  }};
  const ui={
    querySelector(selector){
      return {addEventListener(type,callback){
        if(type==='change')callbacks[selector]=callback;
      }};
    }
  };
  bindResolverEvents(ui,ref,()=>renders++);
  callbacks['[data-field="lfj-indexed-export-consent"]']({target:{checked:true}});
  assert.equal(ref.current.lfjIndexedExportOptIn,false);
  ref.current=updateWorkflowState(ref.current,{
    lfjIndexedPreview:f.preview,lfjIndexedExportReceipt:f.receipt
  });
  callbacks['[data-field="lfj-indexed-export-consent"]']({target:{checked:true}});
  assert.equal(ref.current.lfjIndexedExportOptIn,true);
  assert.ok(renders>0);
});

test('real indexed download handlers generate both exact Blob bytes',async()=>{
  const f=await fixture();
  const previousDocument=globalThis.document;
  const oldUrl=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
  const captures=[];
  globalThis.document={
    createElement(){return {click(){}};}
  };
  URL.createObjectURL=blob=>{captures.push(blob);return 'blob:test';};
  URL.revokeObjectURL=()=>{};
  try{
    const ref={current:{
      activePhaseId:'json-trace',sourceKind:'xml',sourceText:xml,sourceFile:null,
      resolverSourceMode:'lfj-indexed-preview',stagedJsonFile:f.sourceFile,
      stagedJsonText:'',resolverJsonTraceConfig:{},supportConfigJson:'{}',
      resolverJsonTraceInputRevision:1,resolverJsonTraceAcceptedRevision:null,
      resolverJsonTraceResult:null,resolverJsonTraceJsonResult:null,
      resolverJsonTraceRunning:false,lfjIndexedPreview:f.preview,
      lfjIndexedExportReceipt:f.receipt,lfjIndexedExportOptIn:true,
      masterContext:null,result:null
    }};
    const ui={querySelector:()=>({value:'{}'})};
    const one=await downloadResolverTraceCsvFromUi(ref,()=>{},'node-wise-trace',ui);
    const two=await downloadResolverTraceCsvFromUi(ref,()=>{},'evidence-tree',ui);
    assert.equal(one.sha256,await sha(f.nodeCsv));
    assert.equal(two.sha256,await sha(f.evidenceCsv));
    assert.equal(captures.length,2);
    const texts=await Promise.all(captures.map(x=>x.text()));
    assert.deepEqual(texts,[f.nodeCsv,f.evidenceCsv]);
    assert.deepEqual(await Promise.all(captures.map(async b=>
      Array.from(new Uint8Array(await b.arrayBuffer()).slice(0,3)))),
      [[239,187,191],[239,187,191]]);
    ref.current=updateWorkflowState(ref.current,{sourceText:'<Replaced />'});
    assert.equal(await downloadResolverTraceCsvFromUi(ref,()=>{},'node-wise-trace',ui),null);
    assert.equal(captures.length,2);
  }finally{
    if(previousDocument===undefined)delete globalThis.document;
    else globalThis.document=previousDocument;
    URL.createObjectURL=oldUrl;URL.revokeObjectURL=oldRevoke;
  }
});

test('invalid unsaved config prevents even the first indexed download',async()=>{
  const f=await fixture();
  const oldUrl=URL.createObjectURL;
  let downloaded=0;
  URL.createObjectURL=()=>{downloaded++;return 'blob:no';};
  try {
    const ref={current:{
      resolverSourceMode:'lfj-indexed-preview',resolverJsonTraceInputRevision:1,
      sourceText:xml,stagedJsonFile:f.sourceFile,resolverJsonTraceConfig:{},
      lfjIndexedPreview:f.preview,lfjIndexedExportReceipt:f.receipt,
      lfjIndexedExportOptIn:true,resolverJsonTraceRunning:false,
      masterContext:null,activePhaseId:'json-trace'
    }};
    const ui={querySelector:()=>({value:'{invalid'})};
    assert.equal(await downloadResolverTraceCsvFromUi(ref,()=>{},'evidence-tree',ui),null);
    assert.equal(downloaded,0);
    assert.match(ref.current.resolverJsonTraceExportStatus,/blocked/);
  }finally{URL.createObjectURL=oldUrl;}
});
