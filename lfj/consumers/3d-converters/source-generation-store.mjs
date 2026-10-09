/**
 * #1104 A02-P2: consumer-owned, bounded, SOURCE_ONLY generation publication.
 *
 * Not a test-double transaction: the first-party app sink enforces admission,
 * staging invisibility, defensive byte custody, exact receipt and synchronous
 * basis-CAS + single-pointer promotion itself. No arbitrary callback can
 * publish staged rows. Its app read must recheck the CURRENT live basis.
 *
 * In-memory/volatile by design. It is NOT durable IndexedDB, not a large-file
 * result store, not live Resolver UI adoption or an engineering authority.
 * Real 30/90MB release needs a durable generation spool and approved R12–15.
 */
export class SourceGenerationError extends Error {
  constructor(code,detail){super(code+': '+detail);this.name='SourceGenerationError';this.code=code;}
}
const fail=(code,detail)=>{throw new SourceGenerationError(code,detail);};
const KEYS=Object.freeze(['sourceRefId','sourceSha256','sourceRevision',
  'selectionDigest','jobId','dependencyRevision','byteLength']);
const SOURCE=Object.freeze(['sourceRefId','sourceSha256','sourceRevision']);
const scalar=new Set(['string','number','boolean','null']);
const validString=s=>typeof s==='string'&&s.length>0&&s.length<=1024;
const nat=n=>Number.isSafeInteger(n)&&n>=0;
const same=(a,b)=>KEYS.every(k=>a?.[k]===b?.[k]);
const sameSource=(a,b)=>SOURCE.every(k=>a?.[k]===b?.[k]);
const sourceOnly=x=>x?.rightsBasis==='SOURCE_FACTS_ONLY'&&x.engineeringReady===false;
function copyBasis(b){
  if(!b||KEYS.some(k=>k==='byteLength'?!nat(b[k]):!validString(b[k])))
    fail('APP_BASIS_REQUIRED','the real app basis must contain exact original, scope, job and dependency revisions');
  return Object.freeze(Object.fromEntries(KEYS.map(k=>[k,b[k]])));
}
function defensive(f){
  const r=f?.row;
  if(f?.sourceOnly!==true||!r||r.kind!=='OPEN'||
    !nat(r.ordinal)||!nat(r.startByte)||
    typeof r.path!=='string'||r.path.length>65536||
    !validString(r.sourceRefId)||!validString(r.sourceSha256)||
    !validString(r.sourceRevision)||
    typeof r.occurrenceId!=='string'||r.occurrenceId.length>67584||
    !['object','array','string','number','boolean','null'].includes(r.type)||
    !(r.parentId===null||typeof r.parentId==='string')||
    (scalar.has(r.type)?!(f.bytes instanceof Uint8Array):f.bytes!==null)||
    (f.bytes!==null&&(!f.bytes.byteLength||f.bytes.byteLength>1048576)))
    fail('GENERATION_FACT_INVALID','only bounded original source-only OPEN/SEAL facts are stageable');
  if(r.occurrenceId!==JSON.stringify([
    'lfj-json-value/v1',r.sourceRefId,r.sourceRevision,r.path
  ]))fail('GENERATION_FACT_INVALID','original occurrence ID must preserve pointer/revision identity');
  return Object.freeze({row:Object.freeze({...r}),
    bytes:f.bytes===null?null:new Uint8Array(f.bytes),sourceOnly:true});
}
function publicCopy(entry){
  return Object.freeze({
    receipt:entry.receipt,
    facts:Object.freeze(entry.facts.map(f=>Object.freeze({
      row:f.row,bytes:f.bytes===null?null:new Uint8Array(f.bytes),sourceOnly:true
    }))),
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false
  });
}
export function createSourceFactsGenerationStore({getCurrentBasis,maxFacts=4096,maxTotalBytes=8388608}={}){
  if(typeof getCurrentBasis!=='function')
    fail('APP_BASIS_REQUIRED','actual app source/scope/dependency getter is mandatory');
  if(!Number.isSafeInteger(maxFacts)||maxFacts<1||maxFacts>4096||
    !Number.isSafeInteger(maxTotalBytes)||maxTotalBytes<1||maxTotalBytes>8388608)
    fail('SOURCE_LIMIT','bounded fact count 1..4096 and cumulative source bytes 1..8MiB required');
  let active=null,visible=null;
  const live=(getter)=>{
    let value;
    try{value=getter();}catch{fail('APP_GENERATION_STALE','live application basis getter failed');}
    return copyBasis(value);
  };
  function requireLive(expected,getter=getCurrentBasis){
    if(!same(live(getCurrentBasis),expected)||!same(live(getter),expected))
      fail('APP_GENERATION_STALE','source, selection, job or master changed before promotion');
  }
  const transaction=Object.freeze({
    begin({expectedBasis,selectedCount,rightsBasis,engineeringReady}={}){
      if(active)fail('GENERATION_BUSY','overlapping generation staging is denied');
      const expected=copyBasis(expectedBasis);
      if(!sourceOnly({rightsBasis,engineeringReady})||
        !nat(selectedCount)||selectedCount>maxFacts)
        fail('SOURCE_LIMIT','bounded source-only declared selected count required');
      requireLive(expected);
      active={expected,selectedCount,rows:[],lastOrdinal:-1,totalBytes:0};
    },
    stage(fact){
      if(!active)fail('GENERATION_NOT_OPEN','no uncommitted consumer generation');
      requireLive(active.expected);
      if(active.rows.length>=active.selectedCount||
         active.rows.length>=maxFacts)
        fail('SOURCE_LIMIT','stage cannot exceed receipt or bounded generation ceiling');
      const f=defensive(fact),r=f.row;
      const extra=f.bytes?.byteLength??0;
      if(active.totalBytes+extra>maxTotalBytes)
        fail('SOURCE_LIMIT','combined original UTF-8 scalar bytes exceed generation budget');
      if(!sameSource(r,active.expected)||r.ordinal<=active.lastOrdinal||
        r.startByte>=active.expected.byteLength)
        fail('GENERATION_FACT_INVALID','staged facts must match exact original source and increase in ordinal');
      active.lastOrdinal=r.ordinal;
      active.totalBytes+=extra;
      active.rows.push(f);
    },
    // Intentionally synchronous: no await or independent JS task may interleave
    // app source mutation between compare-and-swap and this pointer assignment.
    commit({receipt,expectedBasis,getCurrentBasis:receiptLive}={}){
      if(!active)fail('GENERATION_NOT_OPEN','cannot publish without an exclusive generation');
      const expected=active.expected;
      if(!same(copyBasis(expectedBasis),expected)||
        receipt?.schema!=='LFJ.3D.ConsumerSourceFactsReceipt.v1'||
        receipt.complete!==true||!sourceOnly(receipt)||
        !same(receipt,expected)||
        !nat(receipt.selectedCount)||
        receipt.selectedCount!==active.selectedCount||
        receipt.selectedCount!==active.rows.length)
        fail('GENERATION_RECEIPT_INVALID','receipt, original basis and complete staged count must agree');
      if(typeof receiptLive!=='function')
        fail('APP_BASIS_REQUIRED','receiver live-basis callback required in commit');
      requireLive(expected,receiptLive);
      const stamp=Object.freeze({...receipt});
      const ready=Object.freeze({receipt:stamp,facts:Object.freeze(active.rows.slice())});
      const result=Object.freeze({
        schema:'LFJ.3D.SourceFactsPublication.v1',committed:true,...expected,
        selectedCount:receipt.selectedCount,
        rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false
      });
      visible=ready; // ONLY publication: single synchronous pointer assignment.
      active=null;
      return result;
    },
    abort(){
      // A failed or revoked generation never alters the last committed pointer.
      active=null;
    }
  });
  return Object.freeze({
    transaction,
    readPublished(){
      if(!visible)return null;
      // No stale generation read, including a master-only or scope-only change.
      if(!same(live(getCurrentBasis),visible.receipt))return null;
      return publicCopy(visible);
    }
  });
}
