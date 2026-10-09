/**
 * #1126 / LFJ.GenerationCustody.v1 — one native IDB namespace writer.
 * Claims and fences are transactional, and no lease grants a committed HEAD.
 */
export class SourceCustodyError extends Error {
  constructor(code,message){super(code+': '+message);this.code=code;this.name='SourceCustodyError';}
}
const fail=(code,msg)=>{throw new SourceCustodyError(code,msg);};
const BYTES=1048576,ROWS=256;
const size=x=>new TextEncoder().encode(JSON.stringify(x)).byteLength;
const done=(tx,code)=>new Promise((resolve,reject)=>{
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(new SourceCustodyError(code,'transaction error'));
  tx.onabort=()=>reject(new SourceCustodyError(code,'transaction aborted'));
});
const range=(ns,gen,after)=>after===null
  ?IDBKeyRange.bound([ns,gen,''],[ns,gen,'\uffff'])
  :IDBKeyRange.bound([ns,gen,after],[ns,gen,'\uffff'],true);
const pending=ns=>IDBKeyRange.bound([ns,''],[ns,'\uffff']);
export function createGenerationCustody({db,namespace,generation,now=()=>Date.now(),
  ttlMs=600000,nonce=globalThis.crypto?.randomUUID?.(),beforeReclaim}={}){
  if(!db||typeof namespace!=='string'||!namespace||
    typeof generation!=='string'||!generation||
    typeof nonce!=='string'||!nonce||typeof now!=='function'||
    !Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>3600000)
    fail('CUSTODY_INVALID','finite generation, source and lease required');
  let claimed=false,ready=false,expiresAt=0,closed=false,joining=null;
  function clock(){
    const t=now();
    if(!Number.isSafeInteger(t)||t<0)fail('CUSTODY_CLOCK','invalid custody clock');
    return t;
  }
  const owns=row=>row?.namespace===namespace&&row.generation===generation&&
    row.nonce===nonce&&row.expiresAt>clock();
  const active=()=>{if(closed)fail('CUSTODY_CLOSED','source writer closed');};
  async function claim(){
    active();
    const t=clock(),tx=db.transaction(['leases','recoveries','heads'],'readwrite');
    const finished=done(tx,'CUSTODY_CLAIM_ABORTED');
    const store=tx.objectStore('leases'),head=tx.objectStore('heads').get(namespace);
    let busy=false,already=false;
    head.onsuccess=()=>{
      if(head.result?.generation===generation){
        already=true;tx.abort();return;
      }
      const req=store.get(namespace);
      req.onsuccess=()=>{
        const prior=req.result;
        if(prior&&prior.nonce!==nonce&&prior.expiresAt>t){
          busy=true;tx.abort();return;
        }
        if(prior&&prior.nonce!==nonce)
          tx.objectStore('recoveries').put({namespace,
            generation:prior.generation,cursor:null});
        store.put({namespace,generation,nonce,expiresAt:t+ttlMs});
      };
    };
    try{await finished;}catch(error){
      if(already)fail('CUSTODY_ALREADY_COMMITTED','exact source generation already has a HEAD');
      if(busy)fail('CUSTODY_WRITER_BUSY','a live writer holds the source namespace');
      throw error;
    }
    claimed=true;expiresAt=t+ttlMs;
  }
  async function renew(){
    active();
    const t=clock(),tx=db.transaction('leases','readwrite');
    const finished=done(tx,'CUSTODY_RENEW_ABORTED');
    const leases=tx.objectStore('leases'),req=leases.get(namespace);
    let revoked=false;
    req.onsuccess=()=>{
      if(!owns(req.result)){revoked=true;tx.abort();return;}
      leases.put({...req.result,expiresAt:t+ttlMs});
    };
    try{await finished;}catch(error){
      if(revoked)fail('CUSTODY_REVOKED','writer lost or expired lease');
      throw error;
    }
    expiresAt=t+ttlMs;
  }
  // Caller must include 'leases' in the SAME native write transaction as
  // the source rows or HEAD. No preflight-only lease authorization counts.
  function fence(tx,after,{release=false}={}){
    const leases=tx.objectStore('leases'),req=leases.get(namespace);
    req.onsuccess=()=>{
      if(!owns(req.result)){try{tx.abort();}catch{};return;}
      try{after();if(release)leases.delete(namespace);}
      catch{try{tx.abort();}catch{}}
    };
  }
  // An old losing writer must never roll back another writer's staged
  // generation or the current HEAD. Explicit local abort may revoke only
  // when there is no different active namespace writer.
  function revoke(tx,after,{allowCommitted=false}={}){
    const leases=tx.objectStore('leases'),req=leases.get(namespace);
    req.onsuccess=()=>{
      if(req.result?.nonce===nonce){
        try{after();leases.delete(namespace);}
        catch{try{tx.abort();}catch{}}
        return;
      }
      if(req.result||!allowCommitted)return;
      // A reopened read-only HEAD may never delete its generation after
      // being denied write admission. Only the session which actually
      // published this HEAD can explicitly revoke it.
      const head=tx.objectStore('heads').get(namespace);
      head.onsuccess=()=>{
        if(head.result?.generation!==generation)return;
        try{after();}catch{try{tx.abort();}catch{}}
      };
    };
  }
  async function nextRecovery(){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('recoveries','readonly');
      const req=tx.objectStore('recoveries').openCursor(pending(namespace));
      req.onsuccess=()=>resolve(req.result?.value??null);
      req.onerror=()=>reject(new SourceCustodyError(
        'CUSTODY_RECOVERY_READ','recovery cursor unavailable'));
    });
  }
  // Deletions and the resume cursor share one native transaction.
  // One batch visits <=256 rows/1MiB; no unbounded JavaScript index.
  async function reclaimOnce(target){
    const tx=db.transaction(['pairs','heads','leases','recoveries'],'readwrite');
    const finished=done(tx,'CUSTODY_RECOVERY_ABORTED');
    const req=tx.objectStore('leases').get(namespace);
    let deleted=0,weight=0,rejection=null;
    req.onsuccess=()=>{
      if(!owns(req.result)){rejection='CUSTODY_REVOKED';tx.abort();return;}
      const head=tx.objectStore('heads').get(namespace);
      head.onsuccess=()=>{
        const recoveries=tx.objectStore('recoveries');
        if(head.result?.generation===target.generation){
          recoveries.delete([namespace,target.generation]);return;
        }
        const cursor=tx.objectStore('pairs').openCursor(
          range(namespace,target.generation,target.cursor??null));
        let last=target.cursor??null;
        cursor.onsuccess=()=>{
          const row=cursor.result;
          if(!row){recoveries.delete([namespace,target.generation]);return;}
          const n=size(row.value);
          if(n>BYTES){rejection='CUSTODY_ROW_OVERSIZE';tx.abort();return;}
          if(deleted>=ROWS||(deleted>0&&weight+n>BYTES)){
            recoveries.put({namespace,generation:target.generation,cursor:last});
            return;
          }
          deleted++;weight+=n;last=row.primaryKey[2];
          row.delete();row.continue();
        };
        cursor.onerror=()=>{rejection='CUSTODY_RECOVERY_READ';tx.abort();};
      };
    };
    try{beforeReclaim?.({tx,namespace,generation:target.generation});}
    catch{try{tx.abort();}catch{}}
    try{await finished;}catch(error){
      if(rejection)fail(rejection,'recovery requires current writer lease');
      throw error;
    }
    return deleted;
  }
  async function reclaim(){
    active();
    let batches=0,rows=0;
    for(;;){
      const target=await nextRecovery();
      if(!target)return {batches,rows};
      if(clock()>=expiresAt)fail('CUSTODY_REVOKED','lease expired during recovery');
      if(clock()+ttlMs/3>=expiresAt)await renew();
      rows+=await reclaimOnce(target);
      if(++batches>1000000)
        fail('CUSTODY_RECOVERY_LIMIT','source recovery iteration ceiling exceeded');
    }
  }
  // Claim and recover BEFORE first provisional event ACK; every actual
  // source write must additionally use fence() in the same IDB transaction.
  async function ensure(){
    active();
    if(ready){
      if(clock()>=expiresAt)fail('CUSTODY_REVOKED','source writer lease expired');
      if(clock()+ttlMs/3>=expiresAt)await renew();
      return;
    }
    if(joining)return joining;
    joining=(async()=>{
      if(!claimed)await claim();
      await reclaim();
      ready=true;
    })();
    try{await joining;}finally{joining=null;}
  }
  function closedNotice(){closed=true;}
  return Object.freeze({ensure,fence,revoke,reclaim,closedNotice,
    nonce,generation,leaseExpires:()=>expiresAt});
}
