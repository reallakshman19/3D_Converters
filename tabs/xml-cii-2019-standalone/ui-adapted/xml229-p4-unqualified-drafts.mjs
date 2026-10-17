/**
 * Source-wide, read-only unqualified Weight draft planning.
 * This never calls the GC-PW review decision writer. No draft is a mass fact.
 * Returned entries live only in the UI's current Worker/session memory.
 */
import {xml229WeightReviewEligible,xml229ProposalScorePercent,xml229WeightThreshold}
 from '../integration/xml229-weight-review-focus.mjs';
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
  'Excluded by component scope or minimum score: '+safeCount(x.excludedByScope),
  'Review decisions are unchanged until separately confirmed. Final/native CII remain independent.',
 ].join('\n');
}

/** 
 * Prepare UI-only source-wide blank RIGID proposals, including qualified ones.
 * The actual qualified bulk acceptance list remains exclusively Worker-owned.
 * This function NEVER writes to the review ledger, even for qualified proposals.
 */
export async function planXml229RigidWeightDrafts(session,{
 existingDrafts=new Map(),isCurrent=()=>true,unqualifiedOnly=false,minScorePercent=0,
}={}){
 if(!session?.receipt?.basisId||typeof session.readPage!=='function'||
    !(existingDrafts instanceof Map)||typeof isCurrent!=='function')
   deny('UNQUALIFIED_DRAFT_SOURCE_REQUIRED');
 const minScore=xml229WeightThreshold(minScorePercent);
 const basisId=session.receipt.basisId,sourceId=session.receipt.sourceId;
 const limit=25,limitPhysical=10000,drafts=new Map();
 const counts={blankRigid:0,withoutProposal:0,qualifiedPresent:0,
   unqualifiedInvalid:0,existingReview:0,alreadyDrafted:0,
   conflictingQualifiedValues:0,belowThreshold:0,preparedQualified:0,preparedUnqualified:0,
   prepared:0};
 let total=null,offset=0,matchRevision=null,finalRevision=null;
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
        !row.occurrenceId||!xml229WeightReviewEligible(row)||
        positive(row.sourceKg)||positive(row.match1Kg)||positive(row.finalKg)||
        drafts.has(row.occurrenceId))
       deny('UNQUALIFIED_DRAFT_ROW_DRIFT');
     counts.blankRigid++;
     if(row.match1View?.stageDecision||row.finalView?.stageDecision){
       counts.existingReview++;continue;
     }
     if(matchRevision===null){
       matchRevision=row.match1View?.match1Revision;
       finalRevision=row.finalView?.finalRevision;
     }else if(row.match1View?.match1Revision!==matchRevision||
              row.finalView?.finalRevision!==finalRevision)
       deny('UNQUALIFIED_DRAFT_REVIEW_DRIFT');
     if(existingDrafts.has(row.occurrenceId)){counts.alreadyDrafted++;continue;}
     const proposals=Array.isArray(row.proposals)?row.proposals:[];
     if(!proposals.length){counts.withoutProposal++;continue;}
     const qualified=proposals.filter(p=>p.qualified===true);
     if(unqualifiedOnly&&qualified.length){counts.qualifiedPresent++;continue;}
     const top=proposals.find(p=>p.ranking===1);
     const pinned=Array.isArray(row.match1View?.proposals)
       ?row.match1View.proposals.find(p=>p.proposalId===top?.proposalId):null;
     if(!top||!positive(top.value)||!top.proposalId||
       typeof top.proposalId!=='string'||
       (Array.isArray(row.match1View?.proposals)&&
         (!pinned||pinned.value!==top.value||pinned.qualified!==top.qualified||
          pinned.unit!=='kg'))||
       (unqualifiedOnly&&top.qualified!==false)){
       counts.unqualifiedInvalid++;continue;
     }
     if(minScore>0&&(xml229ProposalScorePercent(top)??-1)<minScore){
       counts.belowThreshold++;continue;
     }
     if(qualified.some(p=>p.proposalId!==top.proposalId&&p.value!==top.value))
       counts.conflictingQualifiedValues++;
     drafts.set(row.occurrenceId,Object.freeze({
       proposalId:top.proposalId,value:String(top.value),reason:'',
       autoUnqualified:top.qualified!==true,autoFilled:true,
     }));
     if(top.qualified)counts.preparedQualified++;
     else counts.preparedUnqualified++;
     counts.prepared++;
   }
   offset+=page.rows.length;
 }while(offset<total);
 if(!isCurrent())deny('UNQUALIFIED_DRAFT_STALE_SOURCE');
 return Object.freeze({basisId,sourceId,counts:Object.freeze(counts),
   drafts,reviewDecisionsAuthorized:false,finalAcceptedAutomatically:false,
   nativeCiiReleaseAuthorized:false});
}

/** Backward-compatible unqualified-only convenience action. */
export async function planXml229UnqualifiedDrafts(session,options={}){
 return planXml229RigidWeightDrafts(session,{...options,unqualifiedOnly:true});
}
