/**
 * Cold-restart cleanup of OUR versioned, Web-Lock-owned temporary LFJ databases.
 *
 * Only r2 UUID generations are eligible. Pre-r2 databases had no cross-tab
 * lifetime lock and MUST NOT be deleted by this cleaner. This is deliberately
 * an orphan-only recovery procedure, never a cached-generation resume.
 */
import {deleteIndexedBuildDatabases} from './xml-cii-adapted-lfj-db-cleanup.js';

const fail=(code,message)=>Object.assign(new Error(message),{code});
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_RE=new RegExp('^'+UUID+'$');
const NAME_RE=new RegExp('^lfj-ui-preview-(?:source|projection)-r2-('+UUID+')$');
export const MAX_RECOVERY_GENERATIONS=32;
export const indexedGenerationNames=uuid=>{
  if(typeof uuid!=='string'||!UUID_RE.test(uuid))
    throw fail('LFJ_RECOVERY_GENERATION','Original indexed generation must use UUID');
  return Object.freeze([
    'lfj-ui-preview-source-r2-'+uuid,
    'lfj-ui-preview-projection-r2-'+uuid
  ]);
};
export const indexedGenerationLockName=uuid=>{
  indexedGenerationNames(uuid);
  return 'lfj-a3-indexed-r2-'+uuid;
};
const nativeLocks=()=>globalThis.navigator?.locks;
const nativeDb=()=>globalThis.indexedDB;

/**
 * This lock must be held from BEFORE the first source Worker through completed
 * deletion in finally. Closing/killing the tab releases the Web Lock. No
 * wall-clock lease or timestamp is used to guess whether a tab is alive.
 */
export async function withIndexedGenerationCustody(uuid,fn,{
  locks=nativeLocks()
}={}){
  if(typeof fn!=='function')throw fail('LFJ_RECOVERY_INPUT','Build callback required');
  const name=indexedGenerationLockName(uuid);
  if(!locks?.request){
    // Node-only test harness without a browser; never a browser fallback.
    if(typeof window==='undefined')return await fn();
    throw fail('LFJ_RECOVERY_LOCKS_REQUIRED',
      'Browser Web Locks are required before creating recoverable indexed generations');
  }
  return locks.request(name,{mode:'exclusive'},async lock=>{
    if(!lock)throw fail('LFJ_RECOVERY_LOCK_LOST','Cannot own original indexed generation');
    return await fn();
  });
}

/**
 * Enumerate first, then obtain each UUID's nonwaiting exclusive Web Lock.
 * Other live tabs remain untouched. If enumeration or locking is unavailable,
 * FAIL CLOSED; no destructive best-effort cross-tab cleanup.
 */
export async function recoverAbandonedIndexedGenerations({
  locks=nativeLocks(),databaseFactory=nativeDb(),
  maxGenerations=MAX_RECOVERY_GENERATIONS,timeoutMs=15000
}={}){
  if(!databaseFactory?.databases || !databaseFactory?.deleteDatabase)
    throw fail('LFJ_RECOVERY_ENUMERATION',
      'IndexedDB name enumeration and deletion are required');
  if(!locks?.request)
    throw fail('LFJ_RECOVERY_LOCKS_REQUIRED','Browser Web Locks required for safe cold recovery');
  if(!Number.isSafeInteger(maxGenerations)||maxGenerations<1||
     maxGenerations>MAX_RECOVERY_GENERATIONS)
    throw fail('LFJ_RECOVERY_INPUT','Recovery enumeration must have bounded budget');
  const databases=await databaseFactory.databases();
  if(!Array.isArray(databases))
    throw fail('LFJ_RECOVERY_ENUMERATION','IndexedDB returned no database name census');
  const found=new Set();
  for(const item of databases){
    const match=NAME_RE.exec(item?.name||'');
    if(match)found.add(match[1]);
  }
  if(found.size>maxGenerations)
    throw fail('LFJ_RECOVERY_BUDGET',
      'Too many abandoned generations to recover in one bounded admission');
  let recovered=0,liveSkipped=0;
  for(const uuid of [...found].sort()){
    const outcome=await locks.request(
      indexedGenerationLockName(uuid),{mode:'exclusive',ifAvailable:true},
      async lock=>{
        if(!lock)return 'LIVE';
        // Delete BOTH names even when only one partially written store exists.
        // Only completed IDB onsuccess is evidence of recovered custody.
        const names=indexedGenerationNames(uuid);
        const result=await deleteIndexedBuildDatabases(names,{
          databaseFactory,timeoutMs
        });
        if(result?.verified!==true||result.deleted!==2)
          throw fail('LFJ_RECOVERY_INCOMPLETE',
            'Cold recovery did not verify both source and projection deletions');
        return 'RECOVERED';
      });
    if(outcome==='LIVE')liveSkipped++;
    else if(outcome==='RECOVERED')recovered++;
    else throw fail('LFJ_RECOVERY_PROTOCOL','Unexpected browser lock result');
  }
  return Object.freeze({
    schema:'LFJ.A3.ColdGenerationRecovery.v1',
    inspected:found.size,recovered,liveSkipped,
    oldUnownedGenerationsIgnored:true,
    safeToStartNewBuild:true
  });
}
