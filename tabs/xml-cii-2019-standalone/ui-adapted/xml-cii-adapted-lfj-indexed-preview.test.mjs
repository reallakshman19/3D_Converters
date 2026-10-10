import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIndexedResolverPreview, verifyIndexedPreviewHandoff
} from './xml-cii-adapted-lfj-indexed-preview.js';
import {
  XML_NODE_TRACE_HEADERS, EVIDENCE_TREE_HEADERS, serializeRowsToCsv
} from '../xml-cii-trace-export.js';
import {
  bindSourceEvents, bindResolverEvents, runResolverJsonTraceFromUi,
  downloadResolverTraceCsvFromUi
} from './xml-cii-adapted-events.js';
import { updateWorkflowState } from './xml-cii-adapted-state.js';

const xml = '<Root><Node><NodeNumber>1</NodeNumber></Node></Root>';
const json = '[{"type":"BRANCH","name":"B","children":[]}]';
const sha = async value => Array.from(new Uint8Array(
  await crypto.subtle.digest('SHA-256', typeof value === 'string' ?
    new TextEncoder().encode(value) : value)),
  b => b.toString(16).padStart(2,'0')).join('');
const byteLength = value => new TextEncoder().encode(value).byteLength;
const rows = [{ xmlNode:'1', xmlBranch:'B', componentType:'SUPPORT',
  status:'RESOLVED_POS' }];
const evidence = [{ branch:'B', sourceNodeNo:'1', sourcePath:'$[0].children[0]' }];

async function completeHandoff(blobText=json, xmlText=xml) {
  const nodeWiseCsv=serializeRowsToCsv(XML_NODE_TRACE_HEADERS, rows);
  const evidenceTreeCsv=serializeRowsToCsv(EVIDENCE_TREE_HEADERS, evidence);
  const nodeWiseCsvSha256=await sha(nodeWiseCsv);
  const evidenceTreeCsvSha256=await sha(evidenceTreeCsv);
  const nodeWiseCsvBytes=byteLength(nodeWiseCsv);
  const evidenceTreeCsvBytes=byteLength(evidenceTreeCsv);
  const originalSha256=await sha(blobText), xmlSha256=await sha(xmlText);
  const handoff={
    schema:'LFJ.B0.ResearchHandoff.v1',
    basis:{originalSha256,xmlSha256,xmlNodes:1,xmlRecordsSha256:'a'.repeat(64)},
    nodeWiseRows:rows,evidenceTreeRows:evidence,
    nodeWiseCsv,evidenceTreeCsv,
    nodeWiseCsvSha256,evidenceTreeCsvSha256,
    nodeWiseCsvBytes,evidenceTreeCsvBytes,payloadBytes:1000,
    sourceOnly:true,engineeringReady:false,
    downloadAuthorized:false,appWired:false
  };
  return {
    originalSha256,xmlSha256,xmlNodes:1,matchedXmlNodes:1,
    sourceOccurrenceCount:10,projectionFacts:1,xmlRecordsSha256:'a'.repeat(64),
    nodeWiseCsvSha256,evidenceTreeCsvSha256,
    nodeWiseCsvBytes,evidenceTreeCsvBytes,researchHandoff:handoff
  };
}
const copy = value => structuredClone(value);
function state() {
  return {
    activePhaseId:'json-trace',sourceKind:'xml',
    sourceText:xml,sourceFile:null,stagedJsonText:'',
    stagedJsonFile:new Blob([json],{type:'application/json'}),
    supportConfigJson:'{}',resolverJsonTraceConfig:{},
    resolverSourceMode:'lfj-indexed-preview',
    lfjIndexedPreview:null,lfjIndexedPreviewStatus:'',
    resolverJsonTraceInputRevision:0,resolverJsonTraceAcceptedRevision:null,
    resolverJsonTraceResult:null,resolverJsonTraceJsonResult:null,
    resolverJsonTraceRunning:false,resolverJsonTraceExportStatus:'',
    masterContext:null,result:null
  };
}
function container() {
  const handlers = new Map();
  return {
    querySelector(sel) {
      if(sel === '[data-field="resolver-json-config"]') return null;
      return {addEventListener(type,callback) {
        if(type==='change') handlers.set(sel,callback);
      }};
    },
    change(name,value,files) {
      const listener=handlers.get('[data-field="'+name+'"]');
      assert.ok(listener,'expected real event listener '+name);
      return listener({target:{value,files}});
    }
  };
}
async function mockedWorkers(fn, options={}) {
  const old = globalThis.Worker;
  const messages=[],terminated=[];
  const result=await completeHandoff();
  globalThis.Worker=class {
    constructor(url) { this.url=String(url); }
    postMessage(data) {
      messages.push(data);
      options.onMessage?.(data);
      queueMicrotask(()=>{
        let output;
        if(data.type==='START') output={occurrenceCount:10,sourceSha256:result.originalSha256};
        else if(data.type==='PROJECT') output={factCount:1,sourceSha256:result.originalSha256,sourceOccurrences:10};
        else output=result;
        this.onmessage?.({data:{type:'DONE',result:output}});
      });
    }
    terminate() { terminated.push(this.url); }
  };
  try { return await fn({messages,terminated,result}); }
  finally {
    if(old===undefined)delete globalThis.Worker;
    else globalThis.Worker=old;
  }
}

test('complete indexed handoff verifies exact shipping byte streams but stays preview-only',async()=>{
  const candidate=await completeHandoff();
  const result=await verifyIndexedPreviewHandoff(candidate,
    candidate.originalSha256,candidate.xmlSha256);
  assert.equal(result.xmlNodes,1);
  assert.equal(result.downloadAuthorized,false);
  assert.equal(result.engineeringReady,false);
  assert.deepEqual(result.nodeWiseRows,rows);
});

test('semantic or CSV tampering is rejected even with matching row count',async()=>{
  const original=await completeHandoff();
  for(const change of [
    c=>{c.researchHandoff.nodeWiseRows=[{...rows[0],xmlNode:'forged'}];},
    c=>{c.researchHandoff.evidenceTreeCsv += 'unapproved';},
    c=>{c.researchHandoff.downloadAuthorized=true;},
    c=>{c.researchHandoff.basis.xmlSha256='0'.repeat(64);},
    c=>{c.researchHandoff.nodeWiseRows=[];},
    c=>{c.researchHandoff.payloadBytes=9*1024*1024;}
  ]) {
    const modified=copy(original);change(modified);
    await assert.rejects(
      verifyIndexedPreviewHandoff(modified,original.originalSha256,original.xmlSha256),
      /LFJ_PREVIEW_/);
  }
});

test('the real Indexed Build uses three native Worker messages over original Blob',async()=>{
  await mockedWorkers(async({messages,terminated})=>{
    const value=await buildIndexedResolverPreview({
      blob:new Blob([json]),xmlText:xml,config:{}
    });
    assert.equal(value.mode,'lfj-indexed-preview');
    assert.deepEqual(messages.map(m=>m.type),['START','PROJECT','MATCH']);
    assert.equal(messages[0].blob instanceof Blob,true);
    assert.equal(messages[0].expectedSha256,await sha(json));
    assert.equal(messages[2].includeResearchHandoff,true);
    assert.equal(terminated.length,3);
  });
});

test('real UI Build publishes indexed rows but refuses both CSV buttons',async()=>{
  await mockedWorkers(async()=>{
    const ref={current:state()};
    const outcome=await runResolverJsonTraceFromUi(container(),ref,()=>{},false);
    assert.equal(outcome.xmlNodes,1);
    assert.equal(ref.current.lfjIndexedPreview.nodeWiseRows.length,1);
    assert.equal(ref.current.resolverJsonTraceResult,null);
    assert.equal(ref.current.resolverJsonTraceAcceptedRevision,null);
    assert.equal(ref.current.resolverJsonTraceRunning,false);
    assert.equal(downloadResolverTraceCsvFromUi(ref,()=>{},'node-wise-trace'),null);
    assert.equal(downloadResolverTraceCsvFromUi(ref,()=>{},'evidence-tree'),null);
  });
});

test('staged JSON selection in indexed mode never invokes foreground FileReader',async()=>{
  const old=globalThis.FileReader;
  globalThis.FileReader=class { constructor(){throw Error('Foreground read forbidden')} };
  try {
    const ref={current:state()},ui=container();
    bindSourceEvents(ui,ref,()=>{});
    const blob=new Blob([json]);
    await ui.change('staged-json-file','',[blob]);
    assert.equal(ref.current.stagedJsonFile,blob);
    assert.equal(ref.current.stagedJsonText,'');
  }finally{
    if(old===undefined)delete globalThis.FileReader;
    else globalThis.FileReader=old;
  }
});

test('switching modes invalidates source-pinned preview',()=>{
  const ref={current:state()},ui=container();
  ref.current.lfjIndexedPreview={nodeWiseRows:rows};
  bindResolverEvents(ui,ref,()=>{});
  ui.change('resolver-source-mode','legacy');
  assert.equal(ref.current.resolverSourceMode,'legacy');
  assert.equal(ref.current.lfjIndexedPreview,null);
  assert.equal(ref.current.resolverJsonTraceAcceptedRevision,null);
});

test('mid-Worker original source supersession rejects preview and both downloads',async()=>{
  const ref={current:state()};
  await mockedWorkers(async()=>{
    const result=await runResolverJsonTraceFromUi(container(),ref,()=>{},false);
    assert.equal(result,null);
    assert.equal(ref.current.lfjIndexedPreview,null);
    assert.equal(ref.current.resolverJsonTraceAcceptedRevision,null);
    assert.equal(downloadResolverTraceCsvFromUi(ref,()=>{},'evidence-tree'),null);
  },{onMessage:payload=>{
    if(payload.type==='START')
      ref.current=updateWorkflowState(ref.current,{sourceText:'<Root><Node>new</Node></Root>'});
  }});
});
