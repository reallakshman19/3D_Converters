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
    try{req=api.open(databaseName,1);}catch{
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
    ...(row.ownAttributes?{ownAttributes:row.ownAttributes}:{})};
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
    try{
      const tx=db.transaction('pairs','readonly');
      const index=tx.objectStore('pairs').index('byOrdinal');
      const rows=[];
      // At most 64 occurrences, with R05 max path ~=65KiB: finite memory.
      const req=index.getAll(bounds(ns,gen,start,Number.MAX_SAFE_INTEGER),64);
      req.onsuccess=()=>rows.push(...req.result);
      req.onerror=()=>reject(new UnifiedSourceIndexError('UNIFIED_READ_FAILED','bounded ordered read failed'));
      tx.oncomplete=()=>resolve(rows);
      tx.onabort=()=>reject(new UnifiedSourceIndexError('UNIFIED_READ_FAILED','bounded ordered read aborted'));
      tx.onerror=()=>reject(new UnifiedSourceIndexError('UNIFIED_READ_FAILED','bounded ordered read transaction failed'));
    }catch(error){reject(error);}
  });
}

/**
 * Single port implements the R07 source-index methods and exact original pair
 * lookup. Selection pages still use their separate, explicit R09/STORE port.
 */
export async function openUnifiedIndexedSourceStore({
  databaseName,namespace,generation,basis,
  indexedDB:provided=globalThis.indexedDB,beforeHeadCommit
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
  let state='STAGING',activeTx=null,buffer=[],bufferBytes=0;
  let stagedEvents=0,opens=0,seals=0,nextOrdinal=0,busy=false;
  function usable(){
    if(state==='ABORTED')fail('UNIFIED_ABORTED','source generation revoked');
    if(state==='CLOSED')fail('UNIFIED_CLOSED','source store closed');
  }
  async function head(){
    usable();
    const h=await get(db,'heads',namespace);
    if(h?.generation!==generation||!same(h?.manifest,basis)||
      h?.manifest?.complete!==true||h.manifest.engineeringReady!==false||
      h.manifest.rightsBasis!=='SOURCE_FACTS_ONLY')
      fail('UNIFIED_NOT_COMMITTED','exact committed original source HEAD required');
    return h;
  }
  async function rollback(){
    const tx=db.transaction(['pairs','heads'],'readwrite');
    const done=txDone(tx,'UNIFIED_ROLLBACK_FAILED');
    tx.objectStore('pairs').delete(bounds(namespace,generation,'','\uffff'));
    const heads=tx.objectStore('heads');
    const request=heads.get(namespace);
    request.onsuccess=()=>{
      if(request.result?.generation===generation)heads.delete(namespace);
    };
    await done;
  }
  async function abort(){
    if(state==='CLOSED')return;
    state='ABORTED';
    buffer=[];bufferBytes=0;
    try{activeTx?.abort();}catch{}
    await rollback();
  }
  async function flush(){
    if(!buffer.length)return;
    usable();
    const events=buffer;
    const tx=db.transaction('pairs','readwrite');
    activeTx=tx;
    const done=txDone(tx,'UNIFIED_STAGE_FAILED');
    const pairs=tx.objectStore('pairs');
    let invalid=null;
    try{
      const sealed=new Set();
      for(const row of events){
        const key=eventsKey(namespace,generation,row.occurrenceId);
        if(row.kind==='OPEN'){
          // One native persisted compact row, never duplicate OPEN+SEAL copies.
          pairs.add({namespace,generation,occurrenceId:row.occurrenceId,
            ordinal:row.ordinal,path:row.path,parentId:row.parentId,
            type:row.type,startByte:row.startByte});
        }else{
          if(sealed.has(row.occurrenceId))
            fail('UNIFIED_DUPLICATE_SEAL','source occurrence sealed twice in batch');
          sealed.add(row.occurrenceId);
          const req=pairs.get(key);
          req.onsuccess=()=>{
            const old=req.result;
            if(!old||old.ordinal!==row.ordinal||
               old.endByteExclusive!==undefined||
               !integer(row.endByteExclusive)||row.endByteExclusive<=old.startByte){
              invalid=new UnifiedSourceIndexError('UNIFIED_PAIR_CORRUPT',
                'SEAL without exact original OPEN or duplicate SEAL');
              try{tx.abort();}catch{}
              return;
            }
            pairs.put({...old,endByteExclusive:row.endByteExclusive,
              ...(row.ownAttributes?{ownAttributes:row.ownAttributes}:{})});
          };
        }
      }
      await done;
      if(state!=='STAGING'&&state!=='FLUSHING')
        fail('UNIFIED_ABORTED','staging completed after cancellation');
      buffer=[];bufferBytes=0;
    }catch(error){
      state='ABORTED';buffer=[];bufferBytes=0;
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
      // Return Worker ACK while at most 768KiB/1024 events are buffered;
      // flush to real IDB synchronously at each bounded frontier.
      if(buffer.length+rows.length>MAX_STAGE_EVENTS||
        bufferBytes+pageBytes>MAX_STAGE_BYTES)await flush();
      if(rows.length>MAX_STAGE_EVENTS||pageBytes>MAX_STAGE_BYTES){
        // Genuine oversized single transport page is not buffered unchecked.
        // One bounded native transaction can stage it directly.
        buffer=rows.slice();bufferBytes=pageBytes;
        await flush();
      }else{buffer.push(...rows);bufferBytes+=pageBytes;}
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
      await flush();state='VERIFYING';
      const complete=await census(db,namespace,generation,basis,manifest);
      if(complete!==opens)fail('UNIFIED_PAIR_CENSUS','not all pairs committed in original ordinal order');
      if(state!=='VERIFYING')fail('UNIFIED_ABORTED','generation superseded before HEAD');
      state='COMMITTING';
      const tx=db.transaction('heads','readwrite');
      activeTx=tx;
      const done=txDone(tx,'UNIFIED_HEAD_ABORTED');
      const heads=tx.objectStore('heads');
      const req=heads.get(namespace);
      let changed=false;
      req.onsuccess=()=>{
        if((req.result?.generation??null)!==expectedHead){changed=true;tx.abort();return;}
        heads.put({namespace,generation,count:opens,manifest});
        try{beforeHeadCommit?.(tx);}catch{tx.abort();}
      };
      await done;
      if(changed)fail('UNIFIED_HEAD_SUPERSEDED','concurrent generation replaced original source');
      if(state!=='COMMITTING')fail('UNIFIED_ABORTED','late cancellation after HEAD');
      state='COMMITTED';
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
        if(record.ordinal!==start++)fail('UNIFIED_INDEX_GAP','missing/repeated source ordinal');
        verifyRecord(record,basis,active.manifest.byteLength);
        yield Object.freeze(asOpen(record,basis));
      }
    }
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
  function close(){db.close();state='CLOSED';buffer=[];bufferBytes=0;}
  return Object.freeze({schema:'LFJ.UnifiedSourceIndex.v1',
    stagePage,commit,commitDurably,readOrdered,lookupCommittedPair,
    abort,close,mode:'SINGLE_INDEXEDDB_SOURCE_HEAD'});
}
