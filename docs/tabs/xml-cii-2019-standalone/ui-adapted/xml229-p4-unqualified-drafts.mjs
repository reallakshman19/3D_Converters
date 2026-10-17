/**
 * Source-wide, read-only unqualified Weight draft planning.
 * This never calls the GC-PW review decision writer. No draft is a mass fact.
 * Returned entries live only in the UI's current Worker/session memory.
 */
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const whole=x=>Number.isSafeInteger(x)&&x>=0;
const deny=code=>{const e=new Error(code);e.code=code;throw e;};
const safeCount=x=>whole(x)?x:0;

export function formatXml229Match1Exclusions(plan){
 const x=plan?.exclusions||{};
 return [
  'Match-1 source-wide plan — '+safeCount(plan?.qualified)+' ready for explicit confirmation',
  'Original source mass: '+safeCount(x.sourceMassPresent),
  'Existing Match-1 decision (accepted/rejected/deferred): '+safeCount(x.match1DecisionPresent),
  'No rank-1 proposal: '+safeCount(x.noRank1Proposal),
  'Rank-1 not qualified: '+safeCount(x.topRankUnqualified),
  '  Of those, qualified only at lower rank: '+safeCount(x.lowerRankQualified),
  'Invalid rank-1 kg: '+safeCount(x.topRankInvalidMass),
  'Wrong rank-1 unit: '+safeCount(x.topRankInvalidUnit),
  'Existing Final decision: '+safeCount(x.finalDecisionPresent),
  'Conflicting qualified values: '+safeCount(x.conflictingQualifiedCandidates),
  'Source-proposal mismatch: '+safeCount(x.planProjectionMismatch),
  'Review decisions are unchanged until separately confirmed. Final/native CII remain independent.',
 ].join('\n');
}

export async function planXml229UnqualifiedDrafts(session,{
 existingDrafts=new Map(),isCurrent=()=>true,
}={}){
 if(!session?.receipt?.basisId||typeof session.readPage!=='function'||
    !(existingDrafts instanceof Map)||typeof isCurrent!=='function')
   deny('UNQUALIFIED_DRAFT_SOURCE_REQUIRED');
 const basisId=session.receipt.basisId,sourceId=session.receipt.sourceId;
 const limit=25,limitPhysical=10000;
 const drafts=new Map();
 const counts={blankRigid:0,withoutProposal:0,qualifiedPresent:0,
   unqualifiedInvalid:0,alreadyDrafted:0,prepared:0};
 let total=null,offset=0;
 do{
   if(!isCurrent())deny('UNQUALIFIED_DRAFT_STALE_SOURCE');
   const page=await session.readPage({offset,limit,filter:'blank-rigid',query:''});
   if(!isCurrent())deny('UNQUALIFIED_DRAFT_STALE_SOURCE');
   if(page?.basisId!==basisId||page?.complete!==true||page.offset!==offset||
      !whole(page.totalCount)||page.totalCount>limitPhysical||
      !Array.isArray(page.rows)||page.rows.length!==Math.min(limit,page.totalCount-offset)||
      (total!==null&&total!==page.totalCount))
     deny('UNQUALIFIED_DRAFT_PAGE_DRIFT');
   if(total===null)total=page.totalCount;
   for(const row of page.rows){
     if(!row||row.sourceId!==sourceId||typeof row.occurrenceId!=='string'||
        !row.occurrenceId||!/^RIGID/i.test(String(row.componentType||''))||
        positive(row.sourceKg)||positive(row.match1Kg)||positive(row.finalKg)||
        drafts.has(row.occurrenceId))
       deny('UNQUALIFIED_DRAFT_ROW_DRIFT');
     counts.blankRigid++;
     if(existingDrafts.has(row.occurrenceId)){counts.alreadyDrafted++;continue;}
     const proposals=Array.isArray(row.proposals)?row.proposals:[];
     if(!proposals.length){counts.withoutProposal++;continue;}
     if(proposals.some(p=>p.qualified===true)){counts.qualifiedPresent++;continue;}
     const top=proposals.find(p=>p.ranking===1);
     if(!top||top.qualified!==false||!positive(top.value)||
        typeof top.proposalId!=='string'||!top.proposalId){
       counts.unqualifiedInvalid++;continue;
     }
     drafts.set(row.occurrenceId,Object.freeze({
       proposalId:top.proposalId,value:String(top.value),reason:'',
       autoUnqualified:true,
     }));
     counts.prepared++;
   }
   offset+=page.rows.length;
 }while(offset<total);
 if(!isCurrent())deny('UNQUALIFIED_DRAFT_STALE_SOURCE');
 return Object.freeze({basisId,sourceId,counts:Object.freeze(counts),
   drafts,reviewDecisionsAuthorized:false,finalAcceptedAutomatically:false,
   nativeCiiReleaseAuthorized:false});
}
