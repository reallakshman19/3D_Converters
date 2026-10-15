/**
 * XML229 W3-B1: one GC-PW source-attested proposal read model for BOTH
 * Match-1 and Final. Pure, read-only, no DOM, cache, scorer or decision writes.
 * MUST receive the completed session returned by openGcPwPreviewWeightSession
 * .awaitReady(), never an issue.key/NodeNumber reconstructed "session".
 */
import { readVerifiedModeAFinalRows } from './weight-facts-mode-a-final-read.js';

export const SHARED_WEIGHT_RECONCILIATION_SCHEMA='gc-pw-weight-shared-reconciliation/1.0';
const DIGEST=/^[a-f\d]{64}$/i;
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
function fail(code,message){const error=new Error(message);error.code=code;error.retryable=false;throw error;}
function freeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const x of Object.values(value))freeze(x);
    Object.freeze(value);
  }
  return value;
}
function signature(view){
  return JSON.stringify([view.basisId,view.sources,view.revisionBySource,
    view.verifiedFactCount,view.physicalCount,view.rows]);
}
function proposalRows(review,basisId,ids){
  const output=[],seenIds=new Set();
  const pageSize=500;
  // Pages are bounded; never rely on the visible UI page or first 5 rows.
  for(let start=0;start<ids.length;start+=64){
    const selected=ids.slice(start,start+64);
    let cursor=null,total=null,observed=0;
    const visited=new Set();
    do{
      const page=review.getProposals({basisId,occurrenceIds:selected,cursor,limit:pageSize});
      if(!page||page.complete!==true||page.basisId!==basisId||
        !Array.isArray(page.items)||!Number.isSafeInteger(page.totalCount)||
        page.totalCount<0||(total!==null&&total!==page.totalCount))
        fail('INCOMPLETE_PROPOSAL_PAGE','Selected original physical proposal page missing or stale');
      total=page.totalCount;
      for(const p of page.items){
        if(p.basisId!==basisId||!selected.includes(p.occurrenceId)||
          !DIGEST.test(p.basisId)||typeof p.proposalId!=='string'||!p.proposalId||
          seenIds.has(p.proposalId)||!positive(p.value)||p.unit!=='kg'||
          !Number.isSafeInteger(p.ranking)||p.ranking<1||
          typeof p.qualified!=='boolean')
          fail('INVALID_SOURCE_PROPOSAL','Proposal has duplicate, foreign or invalid physical identity or kg');
        seenIds.add(p.proposalId);
        output.push({
          basisId:p.basisId,occurrenceId:p.occurrenceId,proposalId:p.proposalId,
          ranking:p.ranking,kg:p.value,unit:'kg',qualified:p.qualified,
          method:p.method,scoringRevision:p.scoringRevision,
          eligibilityReasons:p.eligibilityReasons||[],evidenceRefs:p.evidenceRefs||[],
        });
      }
      observed+=page.items.length;cursor=page.nextCursor;
      if(cursor!==null&&(typeof cursor!=='string'||visited.has(cursor)))
        fail('STALE_PROPOSAL_CURSOR','Source proposal cursor repeats or is not a string');
      if(cursor!==null)visited.add(cursor);
    }while(cursor!==null);
    if(observed!==total)
      fail('INCOMPLETE_PROPOSAL_PAGE','Proposal ranking was truncated across source pages');
  }
  return output;
}
function consistentGroup(group){
  const ranks=new Set(),ids=new Set();
  const ordered=[...group].sort((a,b)=>a.ranking-b.ranking||a.proposalId.localeCompare(b.proposalId));
  for(const p of ordered){
    if(ranks.has(p.ranking)||ids.has(p.proposalId))
      fail('DUPLICATE_CANDIDATE_RANK','One physical source occurrence has duplicate ranking/id');
    ranks.add(p.ranking);ids.add(p.proposalId);
  }
  return ordered;
}
/** Source projection is complete before scoring: missing proposed weights
 * result in NO_PROPOSAL, never a guessed or accepted 0 kg.
 */
export function readVerifiedSharedWeightReconciliation(session) {
  const before=readVerifiedModeAFinalRows(session);
  if(!DIGEST.test(before.basisId)||typeof session.review?.getProposals!=='function')
    fail('VERIFIED_SESSION_REQUIRED','GC-PW review must provide source-bound candidate pages');
  const ids=before.rows.map(x=>x.occurrenceId);
  if(ids.length!==before.physicalCount||new Set(ids).size!==ids.length)
    fail('INVALID_ORIGINAL_CENSUS','Original physical occurrence census is incomplete/ambiguous');
  const proposalList=proposalRows(session.review,before.basisId,ids);
  const after=readVerifiedModeAFinalRows(session);
  if(signature(before)!==signature(after))
    fail('STALE_WEIGHT_RECONCILIATION','Source population or Match-1/Final revisions changed during proposal read');
  const grouped=new Map(ids.map(id=>[id,[]]));
  for(const p of proposalList){
    if(!grouped.has(p.occurrenceId))
      fail('FOREIGN_PHYSICAL_PROPOSAL','Proposal does not correspond to source physical population');
    grouped.get(p.occurrenceId).push(p);
  }
  const rows=before.rows.map(row=>{
    const proposals=consistentGroup(grouped.get(row.occurrenceId));
    const first=proposals[0]||null;
    const weights=new Set(proposals.map(p=>p.kg));
    // A higher rank is evidence, not enough to select from 166 vs 218 kg.
    const safeDraft=!!first&&first.ranking===1&&first.qualified===true&&
      weights.size===1&&!positive(row.sourceKg)&&
      !positive(row.match1Kg)&&!positive(row.finalKg);
    return {
      ...row,basisId:before.basisId,
      proposals,proposedKg:first?.kg??null,
      draftKg:safeDraft?first.kg:null,
      draftStatus:!first?'NO_PROPOSAL':safeDraft?'UNACCEPTED_DRAFT':'REVIEW_REQUIRED',
      effectiveAcceptedKg:row.effectiveKg??null,
      acceptance:'READ_ONLY_PROPOSAL_NOT_MATCH1_OR_FINAL',
      proposalOrigin:'SAME_VERIFIED_GC_PW_SESSION',
    };
  });
  return freeze({
    schema:SHARED_WEIGHT_RECONCILIATION_SCHEMA,
    basisId:before.basisId,sources:before.sources,
    revisions:before.revisionBySource,
    verifiedFactCount:before.verifiedFactCount,
    physicalCount:before.physicalCount,
    proposalCount:proposalList.length,
    engineeringAccepted:false,rows,
  });
}
/** BOTH stage consumers use this exact snapshot. It never accepts decisions.
 * Original physical occurrence identity, not NodeNumber or issue.key.
 */
export function selectVerifiedWeightReconciliation(snapshot,{stage,sourceId=null}={}){
  if(!snapshot||snapshot.schema!==SHARED_WEIGHT_RECONCILIATION_SCHEMA||
    !DIGEST.test(snapshot.basisId)||!['RigidMatch1','Rigidmatch2'].includes(stage))
    fail('VERIFIED_SHARED_SNAPSHOT_REQUIRED','A verified shared source snapshot and review stage are required');
  if(sourceId!==null&&!snapshot.sources.includes(sourceId))
    fail('UNSELECTED_WEIGHT_SOURCE','Weight view source is not part of the verified selection');
  return freeze({
    schema:snapshot.schema,basisId:snapshot.basisId,stage,
    sourceId,engineeringAccepted:false,
    rows:snapshot.rows.filter(x=>sourceId===null||x.sourceId===sourceId),
    proposalCount:snapshot.proposalCount,physicalCount:snapshot.physicalCount,
  });
}
