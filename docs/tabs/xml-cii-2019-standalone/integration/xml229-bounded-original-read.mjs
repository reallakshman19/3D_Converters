/**
 * XML229 P3B.1: narrow source-only original JSON value read adapter.
 *
 * Reuses the existing *committed* O1 IndexedDB OPEN/SEAL pages and original
 * File/Blob. Neither a cached SHA nor a source path licenses Preview/Weight/CII.
 * This module does not parse JSON, choose engineering values, or change Run.
 *
 * A selected batch is scanned ONCE through committed pages, O(selected paths)
 * memory plus one existing <=1 MiB source page. A caller's transactional sink
 * must keep all stage() payloads provisional until commit(); abort() revokes
 * partial batches on any failure. Importable on main thread or in a Worker.
 */
import {
  XML229_STAGED_SOURCE_SCHEMA,
  XML229_MAX_ORIGINAL_JSON_BYTES,
} from './xml229-staged-source-receipt.mjs';

export const XML229_BOUNDED_READ_SCHEMA='XML229.BoundedOriginalRead.v1';
export const XML229_BOUNDED_READ_MAX_VALUES=32;
export const XML229_BOUNDED_READ_MAX_VALUE_BYTES=1048576;
export const XML229_BOUNDED_READ_MAX_BATCH_BYTES=8388608;

const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=1024;
const error=(code)=>Object.assign(new Error(code),{code});
const fail=code=>{throw error(code);};
const POINTER=/^\/(?:[^~/]|~[01])*(?:\/(?:[^~/]|~[01])*)*$/;
const BASIS_KEYS=['xmlSha256','selectionSha256','configSha256','mastersSha256'];

function copyBasis(x){
  if(!x||BASIS_KEYS.some(key=>!sha(x[key])))fail('P3B_READ_DEPENDENCY_BASIS_REQUIRED');
  return Object.freeze(Object.fromEntries(BASIS_KEYS.map(key=>[key,x[key]])));
}
function sameBasis(a,b){
  return !!b&&BASIS_KEYS.every(key=>a[key]===b[key]);
}
function receiptFields(r){
  if(r?.schema!==XML229_STAGED_SOURCE_SCHEMA||
     r.phase!=='INDEX_COMMITTED'||r.engineeringReady!==false||
     r.rightsBasis!=='SOURCE_FACTS_ONLY'||!validId(r.generationId)||
     !validId(r.sourceRefId)||!validId(r.sourceRevision)||!sha(r.sha256)||
     !r.sourceRevision.endsWith(':sha256:'+r.sha256)||
     !Number.isSafeInteger(r.byteLength)||r.byteLength<1||
     r.byteLength>XML229_MAX_ORIGINAL_JSON_BYTES||
     !Number.isSafeInteger(r.pageCount)||r.pageCount<1||
     !Number.isSafeInteger(r.occurrenceCount)||r.occurrenceCount<1)
    fail('P3B_READ_SOURCE_RECEIPT_REQUIRED');
  return Object.freeze(Object.fromEntries([
    'generationId','sourceRefId','sourceRevision','sha256',
    'byteLength','pageCount','occurrenceCount',
  ].map(key=>[key,r[key]])));
}
function sameReceipt(a,b){
  return !!b&&b.schema===XML229_STAGED_SOURCE_SCHEMA&&
    b.phase==='INDEX_COMMITTED'&&b.engineeringReady===false&&
    b.rightsBasis==='SOURCE_FACTS_ONLY'&&
    Object.keys(a).every(key=>a[key]===b[key]);
}
function selectedPaths(paths){
  if(!Array.isArray(paths)||paths.length<1||
     paths.length>XML229_BOUNDED_READ_MAX_VALUES)
    fail('P3B_READ_SELECTION_BOUND');
  const seen=new Set();
  for(const p of paths){
    if(typeof p!=='string'||p.length>65536||!POINTER.test(p)||seen.has(p))
      fail('P3B_READ_ORIGINAL_POINTER_INVALID');
    seen.add(p);
  }
  return [...paths];
}
function validateRow(row,id,basis,kind){
  if(row?.schema!=='LFJ.JSON.OccurrenceEvent.v1'||
     row.sourceRefId!==basis.sourceRefId||
     row.sourceSha256!==basis.sha256||
     row.sourceRevision!==basis.sourceRevision||
     row.occurrenceId!==id||row.kind!==kind||
     !Number.isSafeInteger(row.ordinal)||row.ordinal<0)
    fail('P3B_READ_SOURCE_EVENT_INVALID');
}
async function reattestHead(store){
  const iterator=store.readCommittedPages()[Symbol.asyncIterator]();
  try{
    const first=await iterator.next();
    if(first.done||!first.value||first.value.page!==0)
      fail('P3B_READ_SOURCE_HEAD_MISSING');
  }finally{await iterator.return?.();}
}

/**
 * @param {object} args
 * @param {File|Blob} args.blob - Exact original File held by the O1 job
 * @param {object} args.store - O1 committed source record store, kind=source
 * @param {object} args.receipt - Full P1B committed source receipt
 * @param {object} args.dependencyBasis - Four exact SHA-256 dependency digests
 * @param {string[]} args.paths - Explicit selected *non-root* JSON Pointers
 * @param {function} args.getCurrentContext - Return live
 *  {blob,store,receipt,dependencyBasis,cancelled:false} from the same O1 job.
 * @param {object} args.sink - Transactional stage(value), commit(manifest),
 *  abort(error) port. Never publish staged values as engineering approved.
 * @param {function} [args.yieldControl] - Optional cooperative yield after each
 *  page, without changing source selection. Host can schedule a frame if needed.
 */
export async function readXml229SelectedOriginalValues({
  blob,store,receipt,dependencyBasis,paths,getCurrentContext,sink,
  maxValueBytes=XML229_BOUNDED_READ_MAX_VALUE_BYTES,
  maxBatchBytes=XML229_BOUNDED_READ_MAX_BATCH_BYTES,
  yieldControl=null,
}={}){
  const source=receiptFields(receipt);
  const dependent=copyBasis(dependencyBasis);
  const requested=selectedPaths(paths);
  if(!blob||typeof blob.slice!=='function'||blob.size!==source.byteLength||
     !store||typeof store.readCommittedPages!=='function'||
     typeof getCurrentContext!=='function'||
     !sink||typeof sink.stage!=='function'||
     typeof sink.commit!=='function'||typeof sink.abort!=='function')
    fail('P3B_READ_PORT_REQUIRED');
  if(!Number.isSafeInteger(maxValueBytes)||maxValueBytes<1||
     maxValueBytes>XML229_BOUNDED_READ_MAX_VALUE_BYTES||
     !Number.isSafeInteger(maxBatchBytes)||maxBatchBytes<maxValueBytes||
     maxBatchBytes>XML229_BOUNDED_READ_MAX_BATCH_BYTES)
    fail('P3B_READ_RESOURCE_BOUND');

  const current=()=>{
    let live;
    try{live=getCurrentContext();}catch{fail('P3B_READ_SOURCE_STALE');}
    if(live?.cancelled!==false||live.blob!==blob||live.store!==store||
       !sameReceipt(source,live.receipt)||
       !sameBasis(dependent,live.dependencyBasis))
      fail('P3B_READ_SOURCE_STALE');
  };
  const byId=new Map(requested.map(path=>[
    JSON.stringify(['lfj-json-value/v1',source.sourceRefId,source.sourceRevision,path]),
    {path,open:null,seal:null},
  ]));
  const completed=new Map();
  let pageCount=0,totalBytes=0,staged=0;
  try{
    current();
    for await(const page of store.readCommittedPages()){
      current();
      if(page?.page!==pageCount||!Array.isArray(page.rows)||!page.rows.length||
         page.rows.length>4096)
        fail('P3B_READ_COMMITTED_PAGE_INVALID');
      pageCount++;
      for(const row of page.rows){
        const expected=byId.get(row?.occurrenceId);
        if(!expected)continue;
        if(row.kind==='OPEN'){
          validateRow(row,row.occurrenceId,source,'OPEN');
          if(expected.open||row.path!==expected.path||
             !['object','array','string','number','boolean','null'].includes(row.type)||
             !Number.isSafeInteger(row.startByte)||row.startByte<0)
            fail('P3B_READ_OPEN_CONFLICT');
          expected.open=row;
        }else if(row.kind==='SEAL'){
          validateRow(row,row.occurrenceId,source,'SEAL');
          if(expected.seal||!Number.isSafeInteger(row.endByteExclusive)||
             row.endByteExclusive<=0||row.endByteExclusive>source.byteLength)
            fail('P3B_READ_SEAL_CONFLICT');
          expected.seal=row;
        }else fail('P3B_READ_EVENT_KIND');
      }
      if(typeof yieldControl==='function'){
        await yieldControl({pagesScanned:pageCount});
        current();
      }
    }
    current();
    if(pageCount!==source.pageCount)fail('P3B_READ_PAGE_CENSUS_INCOMPLETE');
    for(const [id,entry] of byId){
      const a=entry.open,b=entry.seal;
      if(!a||!b||a.ordinal!==b.ordinal||
         b.endByteExclusive<=a.startByte)
        fail('P3B_READ_ORIGINAL_PAIR_INCOMPLETE');
      const n=b.endByteExclusive-a.startByte;
      if(n>maxValueBytes||totalBytes+n>maxBatchBytes)
        fail('P3B_READ_RESOURCE_BOUND');
      totalBytes+=n;
      completed.set(entry.path,Object.freeze({
        occurrenceId:id,path:entry.path,ordinal:a.ordinal,
        sourceType:a.type,parentId:a.parentId,
        startByte:a.startByte,endByteExclusive:b.endByteExclusive,valueByteLength:n,
      }));
    }
    // All selected pointers/pairs/budgets are validated before any staging.
    for(const path of requested){
      current();
      const value=completed.get(path);
      const buffer=await blob.slice(value.startByte,value.endByteExclusive).arrayBuffer();
      current();
      if(buffer.byteLength!==value.byteLength)
        fail('P3B_READ_SOURCE_SLICE_INCOMPLETE');
      // Provisional source-only value. The consumer MUST NOT publish until
      // commit() is reached with the same source + dependencies still current.
      await sink.stage(Object.freeze({
        schema:XML229_BOUNDED_READ_SCHEMA,
        ...source,...dependent,
        ...value,bytes:new Uint8Array(buffer),
        rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
        complete:false,
      }));
      staged++;
      current();
    }
    await reattestHead(store);
    current();
    const manifest=Object.freeze({
      schema:XML229_BOUNDED_READ_SCHEMA,
      ...source,...dependent,
      requestedPaths:Object.freeze([...requested]),
      valueCount:requested.length,byteCount:totalBytes,pagesScanned:pageCount,
      complete:true,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
    });
    await sink.commit(manifest);
    current();
    return manifest;
  }catch(e){
    try{await sink.abort(e);}catch{}
    throw e;
  }
}
