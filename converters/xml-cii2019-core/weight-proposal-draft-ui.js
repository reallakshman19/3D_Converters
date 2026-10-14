/** XML229 W2 — advisory-only mutable draft for Weight Match presentation.
 *
 * Accepting a proposal continues to require an explicit existing Match-1
 * command. This helper never mutates config, engineering source, or provenance.
 * The canonical source-bound GC-PW W1 projection will supersede this legacy
 * ranked-row adapter when the Worker producer supplies verified views.
 */
import {isXmlCiiDirectQualifiedCandidate} from './weight-facts-xml-cii-adapter.js';
import {selectXmlCiiBlankWeightSuggestion} from './weight-blank-fill-policy.js';

const positive = candidate => {
  const input=candidate?.selectedWeight??candidate?.suggestedWeight??candidate?.weight;
  const kg=Number(input);
  return input==null||input===''||!Number.isFinite(kg)||kg<=0?null:kg;
};
function outcome(status,props={}){
  return Object.freeze({
    status,draftKg:null,proposedKg:null,
    alternatives:[],accepted:false,editable:true,
    authority:'UNACCEPTED_DISPLAY_ONLY',...props,
  });
}
export function proposeXmlCiiWeightDraft({issue,config={}}={}){
  if(!issue||!Array.isArray(issue.candidates))
    return outcome('NO_CANDIDATE');
  const ranked=issue.candidates.filter(candidate=>
    candidate&&!candidate.zeroFallback&&!candidate.rejectedReason&&
    !candidate.oddEntry&&positive(candidate)!==null);
  if(!ranked.length)return outcome('NO_CANDIDATE');
  const best=ranked[0];
  const alternatives=ranked.map(candidate=>positive(candidate));
  const proposedKg=alternatives[0];
  // The same strict blank/stored/stale policy used by BOTH weight consumers.
  // No proposal may be displayed as a staged draft over an existing mass.
  const eligibility=selectXmlCiiBlankWeightSuggestion({
    input:{value:'',dataset:{wmAccepted:'false'}},issue,config,
  });
  if(!eligibility)return outcome('EXISTING_OR_STALE_AUTHORITY',
    {proposedKg,alternatives});
  const unique=new Set(alternatives);
  if(issue.candidates[0]!==eligibility.candidate||
    !isXmlCiiDirectQualifiedCandidate(best)||unique.size!==1)
    return outcome('NEEDS_ENGINEERING_REVIEW',{proposedKg,alternatives});
  return outcome('ELIGIBLE_DRAFT',{draftKg:proposedKg,proposedKg,alternatives});
}
