// Agent P P2.2-A local-only engineering execution endpoint.
// One job per dedicated Worker. This does NOT define shared GC-PW worker protocol.
// P2.2-B owns cross-job queue, cancellation, retries and stale-result fencing.
import {installWeightBasisXmlDom} from '../workers/weight-basis-xml-dom.js';
import {projectXmlCiiOccurrences} from './xml-cii-adapted-preview-facts-xml-source.js';
import {xmlCiiDryRunPreview} from './xml-cii-adapted-preview-dryrun.js';

if (typeof DOMParser !== 'function') installWeightBasisXmlDom(globalThis);
const PROTOCOL='xml-cii-preview-local/1';
const clock=()=>globalThis.performance?.now?.() ?? Date.now();
let used=false;
function errorInfo(error,stage) {
  return {code:String(error?.code||'PREVIEW_COMPUTE_FAILURE'),
    message:String(error?.message||error), stage, retryable:false};
}
function post(body,requestId,basisId) {
  globalThis.postMessage({protocol:PROTOCOL,requestId,basisId,...body});
}
// XML229 B1 shadow audit: original physical source observations, NOT resolved
// engineering fields. Opt-in and hard bounded until the genuine paged worker
// transport and independent Owner master/Line List oracle have been approved.
const MAX_AUDIT_NODES=2500, SOURCE_FACT_PAGE_SIZE=200;
// Opt-in page transport pilot; existing input DOM/dry-run remain O(source size).
// This bound is for page transfer, not for the full application memory budget.
const MAX_STREAM_NODES=10000, PAGE_ACK_TIMEOUT_MS=10000;
let pendingPageAck=null;
function pageAck(request,requestId,basisId) {
  if(!pendingPageAck)return;
  if(request.requestId!==requestId||request.basisId!==basisId)return;
  const current=pendingPageAck;
  pendingPageAck=null;clearTimeout(current.timeout);
  if(request.cursor!==current.cursor)
    current.reject(Object.assign(new Error('Page ACK cursor mismatch'),{code:'PHYSICAL_PAGE_ACK_MISMATCH'}));
  else current.resolve();
}
function publishPage(page,requestId,basisId) {
  if(pendingPageAck)throw Object.assign(new Error('Already waiting for page ACK'),{code:'PHYSICAL_PAGE_BACKPRESSURE'});
  return new Promise((resolve,reject)=>{
    const cursor=page.nextCursor??'END';
    const timeout=setTimeout(()=>{
      if(pendingPageAck?.cursor!==cursor)return;
      pendingPageAck=null;
      reject(Object.assign(new Error('Source physical page ACK timed out'),{code:'PHYSICAL_PAGE_ACK_TIMEOUT'}));
    },PAGE_ACK_TIMEOUT_MS);
    pendingPageAck={cursor,resolve,reject,timeout};
    post({state:'source-physical-page',stage:'source-physical',page},requestId,basisId);
  });
}
const xmlName=node=>String(node?.localName||node?.nodeName||'').replace(/^.*:/,'');
const direct=(node,key)=>[...(node?.childNodes||[])].filter(child=>
  child.nodeType===1&&xmlName(child)===key);
const sourceText=(node,key)=>String(direct(node,key)[0]?.textContent||'').trim();
function originalPhysicalAudit(document,projection,basisId) {
  if(projection.nodeCount>MAX_AUDIT_NODES) {
    const err=new Error('Original physical source audit exceeds 2500 nodes; full paged producer not yet available');
    err.code='PHYSICAL_AUDIT_BOUNDED_LIMIT';throw err;
  }
  const sourceNodes=direct(document.documentElement,'Pipe')
    .flatMap(pipe=>direct(pipe,'Branch').flatMap(branch=>direct(branch,'Node')));
  if(sourceNodes.length!==projection.nodes.length) {
    const err=new Error('Physical source node population differs from original ordinal census');
    err.code='PHYSICAL_AUDIT_POPULATION_MISMATCH';throw err;
  }
  const fields=[
    ['source.position.xyz','Position','mm',raw=>{
      const parts=raw.trim().split(/\s+/).map(Number);
      return parts.length===3&&parts.every(Number.isFinite)?parts:null;
    }],
    ['source.outsideDiameter.mm','OutsideDiameter','mm',raw=>
      Number.isFinite(Number(raw))?Number(raw):null],
    ['source.wallThickness.mm','WallThickness','mm',raw=>
      Number.isFinite(Number(raw))?Number(raw):null],
    ['source.weight.kg','Weight','kg',raw=>
      Number.isFinite(Number(raw))?Number(raw):null],
  ];
  const records=[];
  for(const [i,node] of sourceNodes.entries()){
    const occurrence=projection.nodes[i];
    for(const [fieldId,tag,unit,parse] of fields){
      const raw=sourceText(node,tag);
      const value=raw?parse(raw):null;
      records.push({
        schemaVersion:'gc-pw/1.0',domainId:'xml-cii/2019',basisId,
        subjectType:'node',sourceId:occurrence.sourceId,
        occurrenceId:occurrence.occurrenceId,fieldId,value,unit,
        authority:value===null?'unresolved':'source',
        provenance:occurrence.provenance.map(p=>({...p,
          ruleId:'xml229-original-physical-source-only/v1'})),
        diagnostics:value===null?['SOURCE_FIELD_MISSING_OR_INVALID:'+tag]:[],
        extensions:{valueKind:'physical-source-only',originalTag:tag,
          originalText:raw||null},
      });
    }
  }
  const pages=[];
  for(let offset=0;offset<records.length;offset+=SOURCE_FACT_PAGE_SIZE) {
    const next=offset+SOURCE_FACT_PAGE_SIZE;
    pages.push({schemaVersion:'gc-pw/1.0',basisId,
      items:records.slice(offset,next),totalCount:records.length,
      nextCursor:next<records.length?String(next):null,complete:false});
  }
  return {schema:'xml229-physical-source-audit/v1',sourceOnly:true,
    engineeringReady:false,originalNodeCount:projection.nodeCount,
    sourceFactCount:records.length,pages};
}
// Acknowledged transfer: at most 200 source observations are held in the
// pending page at a time. The source DOM and legacy preview still exist,
// so this is not a multi-million-occurrence streaming claim.
async function streamOriginalPhysicalAudit(document,projection,basisId,requestId) {
  if(projection.nodeCount>MAX_STREAM_NODES)
    throw Object.assign(new Error('Paced physical-source pilot exceeds 10000 original nodes'),
      {code:'PHYSICAL_STREAM_BOUNDED_LIMIT'});
  const totalCount=projection.nodeCount*4;
  const fields=[
    ['source.position.xyz','Position','mm',raw=>{
      const parts=raw.trim().split(/\s+/).map(Number);
      return parts.length===3&&parts.every(Number.isFinite)?parts:null;
    }],
    ['source.outsideDiameter.mm','OutsideDiameter','mm',raw=>Number.isFinite(Number(raw))?Number(raw):null],
    ['source.wallThickness.mm','WallThickness','mm',raw=>Number.isFinite(Number(raw))?Number(raw):null],
    ['source.weight.kg','Weight','kg',raw=>Number.isFinite(Number(raw))?Number(raw):null],
  ];
  let count=0,pageCount=0,items=[];
  const flush=async()=>{
    if(!items.length)return;
    const next=count<totalCount?String(count):null;
    await publishPage({schemaVersion:'gc-pw/1.0',basisId,items,
      totalCount,nextCursor:next,complete:false},requestId,basisId);
    pageCount++;
    items=[]; // no accumulation across acknowledged page boundaries
  };
  let ordinal=0;
  for(const pipe of direct(document.documentElement,'Pipe')){
    for(const branch of direct(pipe,'Branch')){
      for(const node of direct(branch,'Node')){
        const occurrence=projection.nodes[ordinal++];
        if(!occurrence)throw Object.assign(new Error('Missing original node ordinal'),{code:'PHYSICAL_AUDIT_POPULATION_MISMATCH'});
        for(const [fieldId,tag,unit,parse] of fields){
          const raw=sourceText(node,tag),value=raw?parse(raw):null;
          items.push({schemaVersion:'gc-pw/1.0',domainId:'xml-cii/2019',basisId,
            subjectType:'node',sourceId:occurrence.sourceId,
            occurrenceId:occurrence.occurrenceId,fieldId,value,unit,
            authority:value===null?'unresolved':'source',
            provenance:occurrence.provenance.map(p=>({...p,
              ruleId:'xml229-original-physical-source-only/v1'})),
            diagnostics:value===null?['SOURCE_FIELD_MISSING_OR_INVALID:'+tag]:[],
            extensions:{valueKind:'physical-source-only',originalTag:tag,
              originalText:raw||null}});
          count++;
          if(items.length===SOURCE_FACT_PAGE_SIZE)await flush();
        }
      }
    }
  }
  if(ordinal!==projection.nodeCount||count!==totalCount)
    throw Object.assign(new Error('Source ordinal population changed while streaming'),{code:'PHYSICAL_AUDIT_POPULATION_MISMATCH'});
  await flush();
  return {schema:'xml229-physical-page-stream/v1',sourceOnly:true,engineeringReady:false,
    originalNodeCount:projection.nodeCount,sourceFactCount:totalCount,
    pageCount,pageSize:SOURCE_FACT_PAGE_SIZE,transfer:'acknowledged'};
}
globalThis.addEventListener('message',async (event)=>{
  const request=event.data||{},requestId=request.requestId,basisId=request.basisId;
  if(request.protocol===PROTOCOL&&request.kind==='physical-page-ack'){
    pageAck(request,requestId,basisId);
    return;
  }
  if(used) {
    post({state:'failed',error:errorInfo({code:'WORKER_ALREADY_USED',message:'Dedicated local worker accepts only one job'},'dispatch')},requestId,basisId);
    return;
  }
  used=true;
  let stage='validate',result;
  const timings={};
  const progress=(stage,completed,total=3)=>post({state:'running',stage,completed,total},requestId,basisId);
  try {
    if(request.protocol!==PROTOCOL||request.kind!=='execute'
      ||typeof requestId!=='string'||!requestId.trim()
      ||typeof basisId!=='string'||!/^[a-f0-9]{64}$/.test(basisId))
      throw Object.assign(new Error('Invalid local execution envelope'),{code:'INVALID_ENVELOPE'});
    if(typeof request.xmlText!=='string'||!request.xmlText.trim()
      ||!request.config||typeof request.config!=='object'||Array.isArray(request.config)
      ||typeof request.stagedJsonText!=='string')
      throw Object.assign(new Error('XML/config/staged JSON missing or nonserializable'),{code:'INVALID_INPUT'});
    if(request.sourcePhysicalAuditMode!==undefined
      &&request.sourcePhysicalAuditMode!=='paced-pages')
      throw Object.assign(new Error('Unsupported physical source transport mode'),{code:'INVALID_PHYSICAL_AUDIT_MODE'});
    if(request.sourcePhysicalAudit===true&&request.sourcePhysicalAuditMode==='paced-pages')
      throw Object.assign(new Error('Paced pages and the legacy bulk source audit are mutually exclusive'),
        {code:'PHYSICAL_AUDIT_MODE_CONFLICT'});
    if(request.scope?.selection != null)
      throw Object.assign(new Error('Selected subpopulation engineering compute needs an explicit scoped adapter'),{code:'SCOPED_ENGINEERING_PENDING'});
    const started=clock();
    stage='source-occurrences';progress(stage,0);
    let originalDocument=null;
    const original=projectXmlCiiOccurrences({xmlText:request.xmlText,
      mode:request.scope?.mode||'A',sourceId:request.scope?.sourceId||null,
      manifest:request.scope?.manifest||null,selection:null,
      parseXml:xml=>{originalDocument=new DOMParser().parseFromString(xml,'application/xml');
        return originalDocument;},
    });
    if(request.sourcePhysicalAuditMode==='paced-pages'&&original.nodeCount>MAX_STREAM_NODES)
      throw Object.assign(new Error('Paced physical-source pilot exceeds 10000 original nodes'),
        {code:'PHYSICAL_STREAM_BOUNDED_LIMIT'});
    // The same parsed original XML tree drives the ordinal source audit.
    // No second source parse, reinterpretation of NodeNumber, or silent
    // promotion of legacy review-eligible rows into all-source facts.
    const sourcePhysicalAudit=request.sourcePhysicalAudit===true
      ?originalPhysicalAudit(originalDocument,original,basisId):null;
    timings.sourceOccurrenceMs=Number((clock()-started).toFixed(3));
    progress(stage,1);
    stage='engineering-dryrun';
    const computedAt=clock();progress(stage,1);
    // Retain existing Format1/2, LineList, PipingClass, bore, Rating, Material,
    // B31.3 and DTXR logic. Never rewrite, relax or hardcode engineering values.
    result=xmlCiiDryRunPreview(request.xmlText,request.config,request.stagedJsonText);
    timings.engineeringDryRunMs=Number((clock()-computedAt).toFixed(3));
    progress(stage,2);
    stage='source-coverage';
    const checkedAt=clock();
    if(!result||!Array.isArray(result.branchRows)||!Array.isArray(result.nodeRows))
      throw Object.assign(new Error('Dryrun did not emit branch/node arrays'),{code:'INVALID_DRYRUN_RESULT'});
    if(result.branchRows.length!==original.branchCount)
      throw Object.assign(new Error('Expected '+original.branchCount+' original Branch occurrences but computed '+result.branchRows.length),
        {code:'SOURCE_BRANCH_COVERAGE_MISMATCH'});
    const ordinals=new Set(result.branchRows.map((row,index)=>Number.isSafeInteger(row.branchOccurrenceIndex)
      ? row.branchOccurrenceIndex:index));
    if(ordinals.size!==original.branchCount)
      throw Object.assign(new Error('Computed duplicate/missing branch occurrence'),{code:'BRANCH_OCCURRENCE_ALIAS'});
    timings.sourceCoverageMs=Number((clock()-checkedAt).toFixed(3));
    timings.totalWorkerMs=Number((clock()-started).toFixed(3));
    progress(stage,3);
    // Emit physical facts ONLY after the existing engineering-dryrun/source
    // coverage checks have succeeded. ACKs are transfer control, NOT review.
    const streamSummary=request.sourcePhysicalAuditMode==='paced-pages'
      ?await streamOriginalPhysicalAudit(originalDocument,original,basisId,requestId):null;
    // Legacy nodeRows are only review-eligible nodes: never equate their count to
    // all source nodes. Original sourceOccurrences survive separately, losslessly.
    post({state:'completed',stage:'local-engineering',completed:3,total:3,
      result:{branchRows:result.branchRows,nodeRows:result.nodeRows,
        sourceOccurrences:original,
        ...(sourcePhysicalAudit?{sourcePhysicalAudit}:{}),
        ...(streamSummary?{sourcePhysicalAuditStream:streamSummary}:{}),
        coverage:{sourceBranchCount:original.branchCount,
          originalNodeCount:original.nodeCount,
          engineeringBranchCount:result.branchRows.length,
          legacyReviewNodeCount:result.nodeRows.length},
        timings,engineeringAcceptance:'NOT_ASSESSED',
        fullFactPopulationAccepted:false}},
      requestId,basisId);
  }catch(error){
    post({state:'failed',error:errorInfo(error,stage)},requestId,basisId);
  }finally{
    if(pendingPageAck){
      const ack=pendingPageAck;pendingPageAck=null;clearTimeout(ack.timeout);
    }
    // Dedicated worker has no source/master cache or second-job authority.
    globalThis.close?.();
  }
});
