/** XML229 W1: read-only, source-attested Weight Match / Final reconciliation.
 *
 * This is a projection of ALREADY-VERIFIED GC-PW individual views, not a
 * scoring algorithm, persistence store, acceptance command, or converter
 * output. The caller must derive expectedOccurrenceIds from the original
 * independently verified selected physical source population.
 */
import {decodePhysicalOccurrenceId} from '../../contracts/gc-pw-v1/occurrence-bridge.mjs';

export const WEIGHT_RECONCILIATION_SCHEMA='XML229.WeightReconciliation.v1';
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const kg=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function fail(code,message){
  const error=new Error(message);
  error.code=code;error.retryable=false;throw error;
}
function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function acceptedMass(value,label){
  if(value==null)return null;
  if(!kg(value))fail('INVALID_ACCEPTED_MASS',label+' must be positive kg');
  return value;
}
function safePositiveProposal(value){
  if(!kg(value))fail('INVALID_PROPOSAL_MASS','Weight proposal must be positive kg');
  return value;
}
function viewToRow(view,sourceId,basisId){
  if(!plain(view)||view.basisId!==basisId||view.sourceId!==sourceId||
    view.stage!=='RigidMatch1'&&view.stage!=='Rigidmatch2')
    fail('STALE_OR_FOREIGN_WEIGHT_VIEW','Source/stage/basis of reviewed weight is incompatible');
  const identity=decodePhysicalOccurrenceId(view.occurrenceId);
  if(identity.sourceId!==sourceId)
    fail('SOURCE_OCCURRENCE_DRIFT','Physical source identity differs from verified source');
  if(!Number.isSafeInteger(view.match1Revision)||view.match1Revision<0||
    !Number.isSafeInteger(view.finalRevision)||view.finalRevision<0)
    fail('MISSING_DECISION_REVISION','Match-1 and Final decision revisions are required');
  const sourceKg=acceptedMass(view.sourceKg,'Source weight');
  const match1Kg=acceptedMass(view.match1Kg,'Match-1 weight');
  const finalKg=acceptedMass(view.finalKg,'Final weight');
  if(!Array.isArray(view.proposals))
    fail('MISSING_CANDIDATES','A verified complete proposal list is required');
  const seen=new Set();
  let previousRank=0;
  const proposals=view.proposals.map((p)=>{
    if(!plain(p)||typeof p.proposalId!=='string'||!p.proposalId.trim()||
      seen.has(p.proposalId)||!Number.isSafeInteger(p.ranking)||
      p.ranking<1||p.ranking<=previousRank||p.unit!=='kg'||
      typeof p.qualified!=='boolean')
      fail('INVALID_PROPOSAL','Ranked proposals are duplicated, unordered or unverified');
    seen.add(p.proposalId);previousRank=p.ranking;
    return {
      proposalId:p.proposalId,ranking:p.ranking,
      kg:safePositiveProposal(p.value),unit:'kg',qualified:p.qualified,
      method:String(p.method||''),
      eligibilityReasons:Array.isArray(p.eligibilityReasons)?
        p.eligibilityReasons.map(x=>String(x)):[],
    };
  });
  const qualified=proposals.filter(p=>p.qualified);
  const uniqueMasses=new Set(proposals.map(p=>p.kg));
  // A preferred chip alone is not a confidence threshold. Competing 166/218
  // is shown but NOT auto-drafted. Accepted source/Match1/Final isn't replaced.
  const canStage=sourceKg==null&&match1Kg==null&&finalKg==null&&
    qualified.length>0&&qualified[0].ranking===1&&uniqueMasses.size===1;
  const best=proposals[0]??null;
  const status=finalKg!=null?'FINAL_REVIEWED'
    :match1Kg!=null?'MATCH1_ACCEPTED'
    :sourceKg!=null?'SOURCE_WEIGHT_PRESENT'
    :proposals.length===0?'NO_PROPOSAL'
    :canStage?'PROPOSED_EDITABLE_DRAFT':'PROPOSAL_REQUIRES_REVIEW';
  return {
    sourceId,occurrenceId:view.occurrenceId,
    branchOccurrenceIndex:identity.branchOccurrenceIndex,
    originalNodeOrdinal:identity.nodeOrdinal,
    componentSignature:identity.componentSignature,
    basisId,match1Revision:view.match1Revision,finalRevision:view.finalRevision,
    sourceKg,match1Kg,finalKg,
    effectiveAcceptedKg:finalKg??match1Kg??sourceKg??null,
    candidateProposals:proposals,
    proposedKg:best?.kg??null,
    draftKg:canStage?best.kg:null,
    draftEditable:true,draftPersistence:'NONE',
    status,acceptance:'READ_ONLY_NO_MATCH1_OR_FINAL_WRITE',
    needsReview:status==='PROPOSAL_REQUIRES_REVIEW',
  };
}

/** expectedOccurrenceIds must be supplied from an independent *original*
 * source census, never inferred from view array or visible UI page count.
 */
export function projectVerifiedXmlCiiWeightReconciliation({
  basisId,sourceId,expectedOccurrenceIds,verifiedViews,
}={}){
  if(!sha(basisId)||typeof sourceId!=='string'||!sourceId.trim())
    fail('CURRENT_BASIS_REQUIRED','A current GC-PW source ID and basis digest are required');
  if(!Array.isArray(expectedOccurrenceIds)||!expectedOccurrenceIds.length||
    !Array.isArray(verifiedViews))
    fail('INDEPENDENT_CENSUS_REQUIRED','Source physical occurrence census and complete verified views required');
  const expected=new Set();
  for(const id of expectedOccurrenceIds){
    const source=decodePhysicalOccurrenceId(id).sourceId;
    if(source!==sourceId||expected.has(id))
      fail('INVALID_SOURCE_CENSUS','Foreign or duplicate original physical source occurrence');
    expected.add(id);
  }
  if(verifiedViews.length!==expected.size)
    fail('INCOMPLETE_VERIFIED_WEIGHT_POPULATION','Full original selected source population required');
  const actual=new Set(),rows=[];
  for(const view of verifiedViews){
    const row=viewToRow(view,sourceId,basisId);
    if(!expected.has(row.occurrenceId)||actual.has(row.occurrenceId))
      fail('UNKNOWN_OR_DUPLICATE_WEIGHT_OCCURRENCE','Unselected or duplicate physical component');
    actual.add(row.occurrenceId);
    rows.push(row);
  }
  if(actual.size!==expected.size)
    fail('INCOMPLETE_VERIFIED_WEIGHT_POPULATION','Missing one or more physical original occurrences');
  return deepFreeze({
    schema:WEIGHT_RECONCILIATION_SCHEMA,basisId,sourceId,
    expectedCount:expected.size,verifiedCount:rows.length,
    engineeringAccepted:false,acceptance:'READ_ONLY',
    rows,
  });
}
