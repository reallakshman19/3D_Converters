/**
 * #1105 / #1120 W2 candidate: LFJ.UnifiedSourceIndex.v1.
 *
 * Source events and committed OPEN+SEAL occurrence lookup share one IndexedDB
 * database and one authoritative HEAD. There is no second source copy.
 * R07 source index commit publishes exactly one generation HEAD after:
 *  1. all bounded staged batches have completed native IDB transactions
 *  2. an independently iterated complete source occurrence census passes.
 *
 * ACK to an event stage means BOUNDED STAGED acceptance, never committed HEAD.
 * Failures/cancellation leave no authorized head; no foreground JSON parser,
 * no synthetic row reconstruction, no app/engineering export authority.
 */
import {createGenerationCustody} from './unified-generation-custody.mjs';

export class UnifiedSourceIndexError extends Error {
  constructor(code,message){super(code+': '+message);this.name='UnifiedSourceIndexError';this.code=code;}
}
const fail=(code,msg)=>{throw new UnifiedSourceIndexError(code,msg);};
const valid=s=>typeof s==='string'&&s.length>0&&s.length<=1024;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const same=(a,b)=>a?.sourceRefId===b?.sourceRefId&&
  a?.sourceSha256===b?.sourceSha256&&a?.sourceRevision===b?.sourceRevision;
const encoded=x=>new TextEncoder().encode(JSON.stringify(x)).byteLength;
const MAX_STAGE_EVENTS=1024,MAX_STAGE_BYTES=786432,MAX_SOURCE_EVENT_BYTES=1048576;
const schema='LFJ.JSON.OccurrenceEvent.v1';
const eventsKey=(ns,gen,id)=>[ns,gen,id];
const bounds=(ns,gen,low,high)=>IDBKeyRange.bound([ns,gen,low],[ns,gen,high]);
const txDone=(tx,code)=>{
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(new UnifiedSourceIndexError(code,'native IndexedDB transaction failed'));
    tx.onabort=()=>reject(new UnifiedSourceIndexError(code,'native IndexedDB transaction aborted'));
  });
};
function get(db,store,key){
  return new Promise((resolve,reject)=>{
    try{
      const req=db.transaction(store,'readonly').objectStore(store).get(key);
      req.onsuccess=()=>resolve(req.result??null);
      req.onerror=()=>reject(new UnifiedSourceIndexError('UNIFIED_READ_FAILED','native IDB get refused'));
    }catch{reject(new UnifiedSourceIndexError('UNIFIED_READ_FAILED','native IDB not readable'));}
  });
}
function openDb(databaseName,api){
  return new Promise((resolve,reject)=>{
    let req;
    try{req=api.open(databaseName,2);}catch{
      reject(new UnifiedSourceIndexError('UNIFIED_IDB_REQUIRED','real IndexedDB open refused'));return;
    }
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('pairs')){
        const store=db.createObjectStore('pairs',{
          keyPath:['namespace','generation','occurrenceId']});
        store.createIndex('byOrdinal',['namespace','generation','ordinal'],{unique:true});
      }
      if(!db.objectStoreNames.contains('heads'))
        db.createObjectStore('heads',{keyPath:'namespace'});
      if(!db.objectStoreNames.contains('leases'))
        db.createObjectStore('leases',{keyPath:'namespace'});
      if(!db.objectStoreNames.contains('recoveries'))
        db.createObjectStore('recoveries',{keyPath:['namespace','generation']});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(new UnifiedSourceIndexError('UNIFIED_IDB_REQUIRED','native IDB unavailable'));
    req.onblocked=()=>reject(new UnifiedSourceIndexError('UNIFIED_IDB_BLOCKED','schema creation blocked'));
  });
}
function asOpen(row,basis){
  return {schema,kind:'OPEN',...basis,occurrenceId:row.occurrenceId,
    ordinal:row.ordinal,path:row.path,parentId:row.parentId,
    type:row.type,startByte:row.startByte};
}
function asSeal(row,basis){
  return {schema,kind:'SEAL',...basis,occurrenceId:row.occurrenceId,
    ordinal:row.ordinal,path:row.path,parentId:row.parentId,
    type:row.type,endByteExclusive:row.endByteExclusive,
    ...(row.ownAttributes?{ownAttributes:Object.freeze({...row.ownAttributes})}:{})};
}
function verifyRecord(row,basis,byteLength=Number.MAX_SAFE_INTEGER){
  if(!row||!integer(row.ordinal)||typeof row.path!=='string'||
    row.path.length>65536||typeof row.occurrenceId!=='string'||
    row.occurrenceId!==JSON.stringify([
      'lfj-json-value/v1',basis.sourceRefId,basis.sourceRevision,row.path])||
    !integer(row.startByte)||!integer(row.endByteExclusive)||
    row.endByteExclusive<=row.startByte||row.endByteExclusive>byteLength||
    !['object','array','string','number','boolean','null'].includes(row.type)||
    (row.parentId!==null&&(typeof row.parentId!=='string'||row.parentId.length>67584)))
    fail('UNIFIED_PAIR_CORRUPT','invalid committed original source pair/span');
  // Original R05 identities encode RFC6901 paths: the parent is the exact
  // pointer prefix, never an arbitrary same-source ancestor claim.
  const parentPath=row.path===''?null:row.path.slice(0,row.path.lastIndexOf('/'));
  const expectedParent=parentPath===null?null:JSON.stringify([
    'lfj-json-value/v1',basis.sourceRefId,basis.sourceRevision,parentPath]);
  if((row.path===''&&row.ordinal!==0)||
    (row.path!==''&&(!row.path.startsWith('/')||row.ordinal===0))||
    row.parentId!==expectedParent)
    fail('UNIFIED_PAIR_CORRUPT','original source ancestry/ordinal does not match pointer identity');
  if(row.ownAttributes!==undefined){
    const attrs=row.ownAttributes;
    if(!attrs||typeof attrs!=='object'||Array.isArray(attrs)||
      row.type!=='object'||!row.path.endsWith('/attributes')||
      attrs.ownerOccurrenceId!==row.parentId||
      attrs.startByte!==row.startByte||
      attrs.endByteExclusive!==row.endByteExclusive)
      fail('UNIFIED_PAIR_CORRUPT','R05 own-attributes source projection has inconsistent byte span or owner');
  }
}
function census(db,ns,gen,basis,manifest){
  return new Promise((resolve,reject)=>{
    let tx,req,ordinal=0,invalid=null;
    try{
      tx=db.transaction('pairs','readonly');
      const index=tx.objectStore('pairs').index('byOrdinal');
      req=index.openCursor(bounds(ns,gen,0,Number.MAX_SAFE_INTEGER));
      req.onsuccess=()=>{
        const cursor=req.result;
        if(!cursor)return;
        try{
          const record=cursor.value;
          verifyRecord(record,basis,manifest.byteLength);
          if(record.ordinal!==ordinal++)fail('UNIFIED_PAIR_CENSUS',
            'out-of-order or missing source ordinal');
          cursor.continue();
        }catch(error){invalid=error;try{tx.abort();}catch{}}
      };
      req.onerror=()=>{invalid=new UnifiedSourceIndexError('UNIFIED_CENSUS_READ','indexed census read failed');};
      tx.oncomplete=()=>invalid?reject(invalid):resolve(ordinal);
      tx.onerror=()=>reject(invalid||new UnifiedSourceIndexError('UNIFIED_CENSUS_READ','indexed census transaction failed'));
      tx.onabort=()=>reject(invalid||new UnifiedSourceIndexError('UNIFIED_CENSUS_READ','indexed census aborted'));
    }catch(error){reject(error);}
  });
}
function readOrdinalChunk(db,ns,gen,start){
  return new Promise((resolve,reject)=>{
    let tx,req,failed=null,rows=[],byteCount=0;
    const PAGE_ROWS=64,PAGE_BYTES=1048576;
    try{
      tx=db.transaction('pairs','readonly');
      const index=tx.objectStore('pairs').index('byOrdinal');
      req=index.openCursor(bounds(ns,gen,start,Number.MAX_SAFE_INTEGER));
      req.onsuccess=()=>{
        const cursor=req.result;
        if(!cursor)return;
        try{
          const record=cursor.value;
          const bytes=encoded(record);
          if(bytes>PAGE_BYTES)
            fail('UNIFIED_READ_LIMIT','one stored original occurrence exceeds bounded read');
          // A full or byte-limited page stops this native cursor in its
          // current transaction, without loading a second page or source map.
          if(rows.length>0&&byteCount+bytes>PAGE_BYTES)return;
          rows.push(record);byteCount+=bytes;
          if(rows.length<PAGE_ROWS)cursor.continue();
        }catch(error){failed=error;try{tx.abort();}catch{}}
      };
      req.onerror=()=>{
        failed=new UnifiedSourceIndexError('UNIFIED_READ_FAILED',
          'native indexed ordinal cursor failed');
      };
      tx.oncomplete=()=>failed?reject(failed):resolve(rows);
      tx.onerror=()=>reject(failed||new UnifiedSourceIndexError(
        'UNIFIED_READ_FAILED','indexed ordinal read transaction failed'));
      tx.onabort=()=>reject(failed||new UnifiedSourceIndexError(
        'UNIFIED_READ_FAILED','indexed ordinal read aborted'));
    }catch(error){reject(error);}
  });
}

/**
 * Single port implements the R07 source-index methods and exact original pair
 * lookup. Selection pages still use their separate, explicit R09/STORE port.
 */
export async function openUnifiedIndexedSourceStore({
  databaseName,namespace,generation,basis,
  indexedDB:provided=globalThis.indexedDB,beforeHeadCommit,
  now,leaseTtlMs,beforeReclaim
}={}){
  if(!provided||typeof provided.open!=='function'||typeof IDBKeyRange==='undefined')
    fail('UNIFIED_IDB_REQUIRED','native IndexedDB with ranges required; no fallback');
  if(!valid(databaseName)||!valid(namespace)||!valid(generation)||
    !valid(basis?.sourceRefId)||!valid(basis?.sourceSha256)||
    !valid(basis?.sourceRevision)||
    (beforeHeadCommit!==undefined&&typeof beforeHeadCommit!=='function'))
    fail('UNIFIED_BASIS_REQUIRED','source identity and generation required');
  const db=await openDb(databaseName,provided);
  const previous=await get(db,'heads',namespace);
  const expectedHead=previous?.generation??null;
  const custody=createGenerationCustody({db,namespace,generation,now,
    ttlMs:leaseTtlMs,beforeReclaim});
  let state='STAGING',activeTx=null,buffer=[],bufferBytes=0;
  // R05 OPEN/SEAL are a canonical nested stream. Retain only active
  // ancestors, never a whole-source map or native unsealed OPEN index.
  // R04 caps original nesting depth at 256; a terminal scalar may add one.
  const MAX_OPEN_FRAMES=257;
  let openFrames=[],openFrameBytes=0;
  const MAX_OPEN_FRAME_BYTES=48*1024*1024;
  let publishedHere=false;
  let stagedEvents=0,opens=0,seals=0,nextOrdinal=0,busy=false;
  function usable(){
    if(state==='ABORTED')fail('UNIFIED_ABORTED','source generation revoked');
    if(state==='CLOSED')fail('UNIFIED_CLOSED','source store closed');
  }
  async function head(){
    usable();
    const h=await get(db,'heads',namespace);
    // The native IDB await is a cancellation/replacement interleaving point.
    // Never grant a HEAD merely because it was current before this await.
    usable();
    if(h?.generation!==generation||!same(h?.manifest,basis)||
      h?.manifest?.complete!==true||h.manifest.engineeringReady!==false||
      h.manifest.rightsBasis!=='SOURCE_FACTS_ONLY')
      fail('UNIFIED_NOT_COMMITTED','exact committed original source HEAD required');
    return h;
  }
  async function rollback(){
    const tx=db.transaction(['pairs','heads','leases'],'readwrite');
    const done=txDone(tx,'UNIFIED_ROLLBACK_FAILED');
    custody.revoke(tx,()=>{
      // A stale client may have lost the writer lease; it cannot delete
      // another tab's same-namespace source or accepted generation.
      tx.objectStore('pairs').delete(bounds(namespace,generation,'','\uffff'));
      const heads=tx.objectStore('heads');
      const request=heads.get(namespace);
      request.onsuccess=()=>{
        if(request.result?.generation===generation)heads.delete(namespace);
      };
    },{allowCommitted:publishedHere});
    await done;
  }
  async function abort(){
    if(state==='CLOSED')return;
    state='ABORTED';
    buffer=[];bufferBytes=0;openFrames=[];openFrameBytes=0;
    try{activeTx?.abort();}catch{}
    await rollback();
  }
  async function flush(){
    if(!buffer.length)return;
    usable();
    const events=buffer;
    const tx=db.transaction(['pairs','leases'],'readwrite');
    activeTx=tx;
    const done=txDone(tx,'UNIFIED_STAGE_FAILED');
    const pairs=tx.objectStore('pairs');
    let invalid=null;
    try{
      custody.fence(tx,()=>{
      for(const row of events){
        if(row.kind==='OPEN'){
          const parent=openFrames.at(-1);
          const expectedParent=parent?.occurrenceId??null;
          const parentPath=row.path===''?null:
            row.path.slice(0,row.path.lastIndexOf('/'));
          if(row.parentId!==expectedParent||
             (parent&&parent.path!==parentPath)||
             (!parent&&row.path!=='')||
             openFrames.length>=MAX_OPEN_FRAMES)
            fail('UNIFIED_PAIR_CORRUPT',
              'OPEN is not the next canonical bounded source child');
          const frame={namespace,generation,occurrenceId:row.occurrenceId,
            ordinal:row.ordinal,path:row.path,parentId:row.parentId,
            type:row.type,startByte:row.startByte};
          const frameBytes=encoded(frame);
          if(openFrameBytes+frameBytes>MAX_OPEN_FRAME_BYTES)
            fail('UNIFIED_STAGE_LIMIT',
              'original nested OPEN stack exceeded protected memory budget');
          openFrames.push(frame);openFrameBytes+=frameBytes;
        }else{
          // R04/R05 source order requires SEAL of the most recently OPEN
          // occurrence, including when the events cross Worker ACK pages.
          const top=openFrames.at(-1);
          if(!top||top.occurrenceId!==row.occurrenceId||
             top.ordinal!==row.ordinal||
             !integer(row.endByteExclusive)||
             row.endByteExclusive<=top.startByte)
            fail('UNIFIED_PAIR_CORRUPT',
              'SEAL does not close the exact current original source frame');
          const completed={...top,endByteExclusive:row.endByteExclusive,
            ...(row.ownAttributes?{ownAttributes:row.ownAttributes}:{})};
          verifyRecord(completed,basis);
          // Exactly ONE persisted record per complete original occurrence.
          // Native unique primary key and ordinal index independently
          // reject duplicates. Never issue per-SEAL IDB get/put cycles.
          pairs.add(completed);
          openFrames.pop();openFrameBytes-=encoded(top);
        }
      }
      });
      await done;
      if(state!=='STAGING'&&state!=='FLUSHING')
        fail('UNIFIED_ABORTED','staging completed after cancellation');
      buffer=[];bufferBytes=0;
    }catch(error){
      state='ABORTED';buffer=[];bufferBytes=0;openFrames=[];openFrameBytes=0;
      try{activeTx?.abort();}catch{}
      try{await rollback();}catch{}
      throw invalid||error;
    }finally{activeTx=null;}
  }
  async function stagePage(rows){
    usable();
    if(state!=='STAGING'||busy||
      !Array.isArray(rows)||rows.length<1||rows.length>4096)
      fail('UNIFIED_STAGE_LIMIT','one bounded source event page writer required');
    busy=true;
    try{
      await custody.ensure();
      if(state!=='STAGING')
        fail('UNIFIED_ABORTED','session revoked during asynchronous lease admission');
      let pageBytes=0,opensHere=0,sealsHere=0;
      for(const row of rows){
        if(row?.schema!==schema||!same(row,basis)||
          !['OPEN','SEAL'].includes(row.kind)||!integer(row.ordinal)||
          typeof row.occurrenceId!=='string'||row.occurrenceId.length>67584)
          fail('UNIFIED_EVENT_INVALID','exact attested original source event required');
        if(row.kind==='OPEN'){
          if(row.ordinal!==nextOrdinal+opensHere||!integer(row.startByte)||
             typeof row.path!=='string'||row.path.length>65536||
             !['object','array','string','number','boolean','null'].includes(row.type)||
             row.occurrenceId!==JSON.stringify([
               'lfj-json-value/v1',basis.sourceRefId,basis.sourceRevision,row.path]))
            fail('UNIFIED_EVENT_ORDER','original OPEN ordinal and pointer required');
          opensHere++;
        }else{
          if(!integer(row.endByteExclusive))
            fail('UNIFIED_EVENT_INVALID','valid SEAL original end offset required');
          sealsHere++;
        }
        pageBytes+=encoded(row);
        if(pageBytes>MAX_SOURCE_EVENT_BYTES)fail('UNIFIED_STAGE_LIMIT','event-page serialized bytes exceed cap');
      }
      // Snapshot original source events BEFORE any await or provisional
      // Worker ACK. R05 event records are bounded, and future callers may
      // mutate their own postMessage clones. Never retain their references.
      // ownAttributes is the sole nested R05 event provenance object.
      const accepted=rows.map(row=>Object.freeze({...row,
        ...(row.ownAttributes?{ownAttributes:Object.freeze({...row.ownAttributes})}:{})
      }));
      // ACK means a bounded *owned* provisional batch, not an IDB HEAD.
      // R10 may send up to 4096 rows/1MiB in a single valid transport
      // message. Split that message into strictly <=1024/768KiB native
      // IDB transactions; never temporarily promote the transport cap
      // into a larger storage buffer just because the upstream chose it.
      if(accepted.length<=MAX_STAGE_EVENTS&&pageBytes<=MAX_STAGE_BYTES){
        if(buffer.length+accepted.length>MAX_STAGE_EVENTS||
          bufferBytes+pageBytes>MAX_STAGE_BYTES)await flush();
        buffer.push(...accepted);bufferBytes+=pageBytes;
      }else{
        for(const row of accepted){
          const bytes=encoded(row);
          if(bytes>MAX_STAGE_BYTES)
            fail('UNIFIED_STAGE_LIMIT','one original source event exceeds native stage byte cap');
          if(buffer.length>=MAX_STAGE_EVENTS||bufferBytes+bytes>MAX_STAGE_BYTES)
            await flush();
          buffer.push(row);bufferBytes+=bytes;
        }
      }
      nextOrdinal+=opensHere;opens+=opensHere;seals+=sealsHere;
      stagedEvents+=rows.length;
    }catch(error){
      state='ABORTED';buffer=[];bufferBytes=0;
      try{await rollback();}catch{}
      throw error;
    }finally{busy=false;}
  }
  async function commitDurably(manifest){
    usable();
    // A duplicated commit request cannot turn an already authorized HEAD
    // into an aborted generation or delete committed source records.
    if(state==='COMMITTED')
      fail('UNIFIED_ALREADY_COMMITTED','source HEAD was already durably published');
    if(state==='STAGING')await custody.ensure();
    if(state!=='STAGING'||busy||!same(manifest,basis)||
      manifest?.schema!=='LFJ.JSON.OccurrenceIndexSummary.v1'||
      manifest.complete!==true||manifest.rightsBasis!=='SOURCE_FACTS_ONLY'||
      manifest.engineeringReady!==false||!integer(manifest.byteLength)||
      manifest.eventCount!==stagedEvents||
      opens!==seals||opens!==manifest.occurrenceCount||
      stagedEvents!==opens*2){
      await abort();
      fail('UNIFIED_MANIFEST_MISMATCH','complete original source/OPEN/SEAL census required');
    }
    state='FLUSHING';
    try{
      // Keep FLUSHING state throughout awaited final persistence so no
      // new source page can race with the final generation census.
      await flush();
      if(openFrames.length||openFrameBytes!==0)
        fail('UNIFIED_PAIR_CENSUS','source OPEN frames remain without canonical final SEAL');
      state='VERIFYING';
      const complete=await census(db,namespace,generation,basis,manifest);
      if(complete!==opens)fail('UNIFIED_PAIR_CENSUS','not all pairs committed in original ordinal order');
      if(state!=='VERIFYING')fail('UNIFIED_ABORTED','generation superseded before HEAD');
      await custody.ensure();
      state='COMMITTING';
      const tx=db.transaction(['heads','leases','recoveries'],'readwrite');
      activeTx=tx;
      const done=txDone(tx,'UNIFIED_HEAD_ABORTED');
      let changed=false;
      custody.fence(tx,()=>{
        const heads=tx.objectStore('heads');
        const req=heads.get(namespace);
        req.onsuccess=()=>{
          if((req.result?.generation??null)!==expectedHead){changed=true;tx.abort();return;}
          // A previously committed source may remain valid until this exact
          // HEAD transaction publishes its successor. Queue the replaced
          // generation for bounded future reclamation atomically with HEAD.
          // No lease exists for a successful predecessor: queueing only in
          // expired-writer admission would leak every old committed index.
          if(req.result?.generation&&req.result.generation!==generation)
            tx.objectStore('recoveries').put({
              namespace,generation:req.result.generation,cursor:null
            });
          heads.put({namespace,generation,count:opens,manifest});
          try{beforeHeadCommit?.(tx);}catch{tx.abort();}
        };
      },{release:true});
      await done;
      if(changed)fail('UNIFIED_HEAD_SUPERSEDED','concurrent generation replaced original source');
      if(state!=='COMMITTING')fail('UNIFIED_ABORTED','late cancellation after HEAD');
      state='COMMITTED';publishedHere=true;
      return Object.freeze({...manifest});
    }catch(error){
      state='ABORTED';
      try{activeTx?.abort();}catch{}
      try{await rollback();}catch{}
      throw error;
    }finally{activeTx=null;}
  }
  async function *readOrdered(){
    const active=await head();
    let start=0;
    while(start<active.count){
      const chunk=await readOrdinalChunk(db,namespace,generation,start);
      await head();
      if(chunk.length===0)fail('UNIFIED_INDEX_GAP','committed source ordinal range incomplete');
      for(const record of chunk){
        // Paused generators retain bounded JS rows; even those prefetched
        // rows must be unusable after local abort/close.
        usable();
        if(record.ordinal!==start++)fail('UNIFIED_INDEX_GAP','missing/repeated source ordinal');
        verifyRecord(record,basis,active.manifest.byteLength);
        yield Object.freeze(asOpen(record,basis));
      }
    }
    // Another source generation may supersede HEAD while the last record is
    // handed to R08. Re-attest before exposing completion of the iterator.
    await head();
  }
  async function lookupCommittedPair(id){
    const active=await head();
    if(typeof id!=='string'||!id||id.length>67584)
      fail('UNIFIED_OCCURRENCE_INVALID','exact source occurrenceId required');
    const record=await get(db,'pairs',eventsKey(namespace,generation,id));
    if(!record)fail('UNIFIED_PAIR_MISSING','source occurrence is not committed');
    verifyRecord(record,basis,active.manifest.byteLength);
    await head();
    return Object.freeze({
      open:Object.freeze(asOpen(record,basis)),
      seal:Object.freeze(asSeal(record,basis))
    });
  }
  function commit(){fail('UNIFIED_DURABLE_REQUIRED','R07 must await native durable HEAD commit');}
  function close(){
    if(state==='CLOSED')return;
    // Closing a port during the native HEAD transaction MUST abort that
    // SAME still-open transaction: db.close() alone merely waits for it
    // and could publish a HEAD after the caller believed custody ended.
    state='CLOSED';buffer=[];bufferBytes=0;openFrames=[];openFrameBytes=0;
    custody.closedNotice();
    try{activeTx?.abort();}catch{}
    db.close();
  }
  return Object.freeze({schema:'LFJ.UnifiedSourceIndex.v1',
    stagePage,commit,commitDurably,readOrdered,lookupCommittedPair,
    abort,close,mode:'SINGLE_INDEXEDDB_SOURCE_HEAD'});
}
