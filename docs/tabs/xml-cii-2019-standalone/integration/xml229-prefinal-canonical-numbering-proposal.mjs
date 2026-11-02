/**
 * XML229 #391: first native-verified PRE-FINAL canonical numbering contract.
 * Observational ONLY: source-connected coincident XML node occurrences are
 * proposed for one CII node ID; no graph or accepted Final kg is mutated.
 * A future reviewed V2 writer must independently revalidate native topology.
 */
import {exactXml229Position} from './xml229-original-physical-vertices.mjs';

export const XML229_CANONICAL_NODE_PROPOSAL_SCHEMA=
  'XML229.PreFinalCanonicalNodeNumberProposal.v1';
const tag=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const children=(p,k)=>[...(p?.childNodes||[])].filter(n=>n.nodeType===1&&tag(n)===k);
const field=(n,k)=>String(children(n,k)[0]?.textContent??'').trim();
function fail(code){const e=new Error(code);e.code=code;throw e;}
function parse(text){
  if(typeof DOMParser!=='function'||typeof text!=='string'||!text.trim())
    fail('XML229_CANONICAL_PROPOSAL_XML_REQUIRED');
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)
    fail('XML229_CANONICAL_PROPOSAL_XML_INVALID');
  return [...doc.getElementsByTagName('Branch')].map(b=>children(b,'Node'));
}
const positive=n=>/^[0-9]+$/.test(n)&&Number.isSafeInteger(Number(n))&&
  Number(n)>0&&Number(n)<=2147483647;

export function proposeXml229PreFinalCanonicalNodeNumbers({
  originalXmlText,finalizedXmlText,retainedSourceOrdinalsByBranch,
  sourceXmlSha256='',
}={}){
  const source=parse(originalXmlText),final=parse(finalizedXmlText);
  if(!Array.isArray(retainedSourceOrdinalsByBranch)||
    source.length!==final.length||
    final.length!==retainedSourceOrdinalsByBranch.length)
    fail('XML229_CANONICAL_PROPOSAL_BRANCH_CENSUS');
  const allFinalIds=new Map(),runs=[];
  let total=0;
  for(const [bi,original] of source.entries()){
    const actual=final[bi],ordinals=retainedSourceOrdinalsByBranch[bi];
    if(!Array.isArray(ordinals)||actual.length!==ordinals.length)
      fail('XML229_CANONICAL_PROPOSAL_RETAINED_CENSUS');
    let previous=-1;
    for(const [i,n] of actual.entries()){
      const oi=ordinals[i];
      if(!Number.isSafeInteger(oi)||oi<=previous||oi>=original.length)
        fail('XML229_CANONICAL_PROPOSAL_SOURCE_ORDINAL');
      previous=oi;
      const a=field(original[oi],'Position'),b=field(n,'Position');
      if(a!==b)fail('XML229_CANONICAL_PROPOSAL_ORIGINAL_POSITION_DRIFT');
      const no=field(n,'NodeNumber');
      if(!positive(no))fail('XML229_CANONICAL_PROPOSAL_FINAL_ID');
      const id=Number(no);
      if(!allFinalIds.has(id))allFinalIds.set(id,[]);
      allFinalIds.get(id).push(JSON.stringify([bi,oi]));
      total++;
    }
    // Intra-branch graph edges: adjacent ORIGINAL source occurrences only.
    // No unproved across-branch union and no near-X/Y/Z union. Distinct
    // source positive IDs remain authored authority, not reassignable.
    let start=0;
    const maybeEmit=(end)=>{
      if(end-start<2)return;
      const ords=ordinals.slice(start,end);
      const actualIds=actual.slice(start,end).map(n=>Number(field(n,'NodeNumber')));
      if(new Set(actualIds).size===1)return; // already one native representation
      const originalIds=ords.map(j=>Number(field(original[j],'NodeNumber')));
      const authored=[...new Set(originalIds.filter(id=>Number.isSafeInteger(id)&&id>0))];
      const reason=authored.length>1?'DISTINCT_AUTHORED_POSITIVE_IDS':
        'CONSECUTIVE_ORIGINAL_COINCIDENT_NODE_ALIASES';
      const candidate=authored.length>1?null:
        authored.length===1?authored[0]:actualIds[0];
      runs.push({
        branchOccurrenceIndex:bi,
        sourceNodeOrdinals:ords,
        currentFinalNodeNumbers:actualIds,
        proposedCanonicalNodeNumber:candidate,
        reason,
      });
    };
    for(let i=1;i<=actual.length;i++){
      const prevIndex=i-1;
      let continues=false;
      if(i<actual.length){
        const prevSource=ordinals[prevIndex],curSource=ordinals[i];
        const ap=exactXml229Position(field(original[prevSource],'Position'));
        const bp=exactXml229Position(field(original[curSource],'Position'));
        continues=curSource===prevSource+1&&ap!==null&&ap===bp;
      }
      if(!continues){maybeEmit(i);start=i;}
    }
  }
  let unsupported=0,remap=0;
  const groups=runs.map(group=>{
    const chosen=group.proposedCanonicalNodeNumber;
    const own=new Set(group.sourceNodeOrdinals.map(oi=>
      JSON.stringify([group.branchOccurrenceIndex,oi])));
    const hasOutside=chosen!==null&&
      (allFinalIds.get(chosen)||[]).some(id=>!own.has(id));
    const reason=hasOutside?'CANONICAL_ID_OWNED_OUTSIDE_CONNECTED_VERTEX':group.reason;
    const proposed=hasOutside?null:chosen;
    const blocked=proposed===null;
    if(blocked)unsupported++;else remap+=
      group.currentFinalNodeNumbers.filter(n=>n!==proposed).length;
    return Object.freeze({...group,
      proposedCanonicalNodeNumber:proposed,reason,
      requiresReviewedNativeGraphChange:true,
    });
  });
  return Object.freeze({
    schema:XML229_CANONICAL_NODE_PROPOSAL_SCHEMA,
    sourceXmlSha256,
    originalBranchCount:source.length,
    originalNodeCount:source.reduce((n,rows)=>n+rows.length,0),
    retainedFinalNodeOccurrences:total,
    groups:Object.freeze(groups),
    summary:Object.freeze({
      connectedCoincidentGroupsRequiringReview:groups.length,
      locallyProposableGroups:groups.length-unsupported,
      needsEngineeringIdentityDecision:unsupported,
      proposedNativeNodeRelabels:remap,
      sourcePositionsChanged:0,
      finalGeometryModified:false,
      acceptedKgModified:false,
      nativeReleaseAuthorized:false,
    }),
  });
}
