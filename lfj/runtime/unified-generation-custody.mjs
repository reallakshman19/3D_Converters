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
    const t=clock(),tx=db.transaction(['leases','recoveries'],'readwrite');
    const finished=done(tx,'CUSTODY_CLAIM_ABORTED');
    const store=tx.objectStore('leases'),req=store.get(namespace);
    let busy=false;
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
    try{await finished;}catch(error){
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
