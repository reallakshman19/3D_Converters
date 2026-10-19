/**
 * XML229 same-tab Weight draft ownership. This is neither GC-PW review state
 * nor durable saved-project data; no session-only draft authorizes native CII.
 * Key by the stable Mode A base stateRef, then exact live Worker lease/receipt.
 */
const workspaces=new WeakMap();
const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const keyOf=ref=>ref?.modeABaseRef||ref;
const valid=x=>typeof x==='string'&&x.length>0;

function identity(entry){
 const session=entry?.session,receipt=session?.receipt;
 if(!session||session.closed===true||!valid(entry?.lease)||
    !valid(receipt?.basisId)||!valid(receipt?.sourceId)||
    !valid(receipt?.sourceGenerationId)||!valid(receipt?.originalJsonSha256))
   fail('XML229_SESSION_DRAFT_BASIS_REQUIRED');
 return {session,lease:entry.lease,basisId:receipt.basisId,
   sourceId:receipt.sourceId,sourceGenerationId:receipt.sourceGenerationId,
   originalJsonSha256:receipt.originalJsonSha256};
}

const same=(a,b)=>a?.session===b.session&&a.lease===b.lease&&
 a.basisId===b.basisId&&a.sourceId===b.sourceId&&
 a.sourceGenerationId===b.sourceGenerationId&&
 a.originalJsonSha256===b.originalJsonSha256;

/** A replaced Worker NEVER borrows prior drafts, even with the same source. */
export function openXml229SessionWeightDrafts(ref,entry){
 const key=keyOf(ref);
 if(!key||typeof key!=='object')fail('XML229_SESSION_DRAFT_REF_REQUIRED');
 const nextIdentity=identity(entry),slot=workspaces.get(key);
 if(same(slot?.current,nextIdentity))return slot.current;
 const archived=slot?.archived?[...slot.archived]:[];
 if(slot?.current){
   const previous=slot.current;
   archived.push({basisId:previous.basisId,sourceId:previous.sourceId,
     sourceGenerationId:previous.sourceGenerationId,lease:previous.lease,
     drafts:new Map(previous.drafts)});
 }
 const current={...nextIdentity,drafts:new Map()};
 workspaces.set(key,{current,archived});
 return current;
}

/** Aggregate-only diagnostic; never exports source identities or draft kg. */
export function inspectXml229SessionWeightDrafts(ref){
 const slot=workspaces.get(keyOf(ref));
 return Object.freeze({activeCount:slot?.current?.drafts.size||0,
   archivedCounts:Object.freeze((slot?.archived||[]).map(x=>x.drafts.size))});
}
