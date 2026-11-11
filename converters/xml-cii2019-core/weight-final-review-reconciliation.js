/** XML229 W3-A: read-only Final review projection.
 * Reuses the popup's existing ranked candidates, never rescoring them.
 * Until a canonical verified W1 producer is connected, the ranking origin
 * must remain "Final review local" and MUST NOT claim a shared Match-1 basis.
 */
import {isXmlCiiDirectQualifiedCandidate} from './weight-facts-xml-cii-adapter.js';

const pos=value=>{
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  return Number.isFinite(n)&&n>0?n:null;
};
const own=(value,key)=>value&&Object.hasOwn(value,key)?value[key]:null;
const candidateKg=c=>pos(c?.selectedWeight??c?.suggestedWeight??c?.weight);
export function projectXmlCiiFinalReviewRow(issue={},config={}){
  const key=String(issue.key??'').trim();
  const overrides=config?.overrides||{};
  const sourceKg=pos(issue.originalWeight);
  const finalKg=pos(own(overrides.rigidWeightFinal,key));
  const match1StoredKg=pos(own(overrides.rigidWeightMatch1,key));
  const match1Stale=Boolean(issue.staleMatch1);
  const match1Kg=match1Stale?null:match1StoredKg;
  const legacyStoredKg=pos(own(overrides.rigidWeight,key));
  const ranked=(Array.isArray(issue.candidates)?issue.candidates:[]).filter(
    c=>c&&!c.zeroFallback&&!c.rejectedReason&&!c.oddEntry&&candidateKg(c)!==null);
  const alternatives=ranked.map(c=>candidateKg(c));
  const proposedKg=alternatives[0]??null;
  const eligible=ranked.length>0&&ranked[0]===issue.candidates?.[0]
    &&isXmlCiiDirectQualifiedCandidate(ranked[0])
    &&new Set(alternatives).size===1
    &&!match1Stale&&sourceKg===null&&match1Kg===null
    &&finalKg===null&&legacyStoredKg===null;
  return Object.freeze({
    sourceKg,match1Kg,finalKg,
    legacyStoredKg,match1Stale,match1StoredKg,
    proposedKg,draftKg:eligible?proposedKg:null,
    proposalStatus:eligible?'UNACCEPTED_DRAFT'
      :proposedKg===null?'NO_PROPOSAL'
        :alternatives.length>1&&new Set(alternatives).size>1
          ?'CONFLICTING_CANDIDATES':'REVIEW_REQUIRED',
    alternatives:Object.freeze(alternatives),
    proposalOrigin:'FINAL_REVIEW_LOCAL_RANKING_UNVERIFIED_MATCH1_PARITY',
    engineeringAccepted:false,
  });
}
