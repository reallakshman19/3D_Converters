/**
 * WBS #391 F18/F19: non-authorizing ORIGINAL-XML component-port witness audit.
 *
 * This is deliberately NOT used to change a physical vertex, approve a
 * canonical node number, transfer a restraint, split a rigid or accept kg.
 * A candidate link is NOT an engineering-approved graph weld.
 *
 * Evidence: original TEE ports 1/3/0/2 and an exact-positive-ID / exact-XYZ
 * BRAN boundary, with the pair as the only two occurrences of that source
 * positive ID at the station. Source ref numbers differ between TEE and BRAN
 * in public BM2, so requiring equal ComponentRefNo would be incorrect.
 */
import {exactXml229Position}
  from './xml229-original-physical-vertices.mjs';
import {xml229TeeBranchPortWitnesses}
  from './xml229-tee-port-route.mjs';

export const XML229_SOURCE_PORT_EVIDENCE_SCHEMA='XML229.SourcePortEvidence.v1';
const tag=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const children=(p,n)=>[...(p?.childNodes||[])].filter(x=>x.nodeType===1&&tag(x)===n);
const field=(p,n)=>String(children(p,n)[0]?.textContent??'').trim();
const oid=(b,n)=>JSON.stringify([b,n]);
const err=c=>{const e=new Error(c);e.code=c;throw e;};
const positive=s=>/^[1-9][0-9]*$/.test(s)&&Number.isSafeInteger(Number(s));
const normalizedRef=s=>String(s??'').replace(/^=/,'').replace(/\s+/g,'').toUpperCase();
const signature=r=>JSON.stringify([r.id,r.coordinateKey]);
const portRef=r=>normalizedRef(r.ref);
function isAnonymousBranchPort(n){
  const nonzero=v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)!==0);
  return field(n,'NodeNumber')==='-1'&&!field(n,'NodeName')&&
    !children(n,'Restraint').length&&!nonzero(field(n,'Weight'))&&
    !nonzero(field(n,'SIF'))&&
    !nonzero(field(n,'Rigid'));
}

/**
 * Original bytes only. Status labels are source-witness qualifications, NOT
 * independent mechanical approval and NOT an authorized native topology.
 */
export function inspectXml229OriginalPortEvidence({originalXmlText,sourceXmlSha256=''}={}){
  if(typeof DOMParser!=='function')err('XML229_PORT_ORIGINAL_DOM_REQUIRED');
  if(typeof originalXmlText!=='string'||!originalXmlText.trim())
    err('XML229_PORT_ORIGINAL_REQUIRED');
  const document=new DOMParser().parseFromString(originalXmlText,'application/xml');
  if(document.getElementsByTagName('parsererror').length)
    err('XML229_PORT_ORIGINAL_XML_INVALID');
  const sourceBranches=[...document.getElementsByTagName('Branch')];
  const branchRows=sourceBranches.map((branch,bi)=>{
    const elements=children(branch,'Node');
    return elements.map((node,ni)=>Object.freeze({
      bi,ni,node,branchName:field(branch,'Branchname'),
      id:field(node,'NodeNumber'),coordinateKey:exactXml229Position(field(node,'Position')),
      positionRaw:field(node,'Position'),kind:field(node,'ComponentType').toUpperCase(),
      ref:field(node,'ComponentRefNo'),endpoint:field(node,'Endpoint'),
      hasRestraint:children(node,'Restraint').length>0,
      hasName:!!field(node,'NodeName'),
      branchBoundary:ni===0||ni===elements.length-1,
    }));
  });
  const all=branchRows.flat(),byStationAndId=new Map(),byTee=new Map();
  for(const row of all){
    if(!positive(row.id)||row.coordinateKey===null)continue;
    const key=signature(row);
    if(!byStationAndId.has(key))byStationAndId.set(key,[]);
    byStationAndId.get(key).push(row);
  }
  let teePort3Witnesses=0;
  for(const [bi,branch] of sourceBranches.entries()){
    const nodes=children(branch,'Node'),qualified=xml229TeeBranchPortWitnesses(nodes);
    for(const witness of qualified){
      const i=nodes.indexOf(witness),list=branchRows[bi];
      const start=list[i-1],port3=list[i],junction=list[i+1],end=list[i+2];
      if(!start||!end||!junction||!port3)continue;
      if([start,port3,junction,end].some(r=>r.kind!=='TEE')||
         ![start,port3,junction,end].every(r=>portRef(r)===portRef(start))||
         [start.endpoint,port3.endpoint,junction.endpoint,end.endpoint].join(',')!=='1,3,0,2'||
         !positive(junction.id)||junction.coordinateKey===null||
         !isAnonymousBranchPort(witness))continue;
      teePort3Witnesses++;
      const k=signature(junction);
      if(!byTee.has(k))byTee.set(k,[]);
      byTee.get(k).push(Object.freeze({
        sourceTeeBranchOccurrenceIndex:bi,
        sourceTeeJunctionOrdinal:junction.ni,
        sourceTeePort3Ordinal:port3.ni,
        sourceTeeRef:start.ref,
        sourceJunctionPositiveId:junction.id,
        exactCoordinateKey:junction.coordinateKey,
      }));
    }
  }
  const branRows=all.filter(r=>r.kind==='BRAN'&&['1','2'].includes(r.endpoint)&&r.branchBoundary);
  const candidateLinks=[],unresolvedBran=[];
  for(const bran of branRows){
    const k=signature(bran),tees=byTee.get(k)||[],peers=byStationAndId.get(k)||[];
    const tee=tees[0];
    const uniquelySourceWitnessed=positive(bran.id)&&bran.coordinateKey!==null&&
      tees.length===1&&peers.length===2&&
      peers.some(r=>r.bi===bran.bi&&r.ni===bran.ni)&&
      peers.some(r=>r.bi===tee.sourceTeeBranchOccurrenceIndex&&
        r.ni===tee.sourceTeeJunctionOrdinal)&&
      bran.bi!==tee.sourceTeeBranchOccurrenceIndex;
    if(uniquelySourceWitnessed){
      candidateLinks.push(Object.freeze({
        schema:'XML229.TeeBranSourceLinkCandidate.v1',
        aliasBranchOccurrenceIndex:bran.bi,
        aliasSourceNodeOrdinal:bran.ni,
        terminalBranchOccurrenceIndex:tee.sourceTeeBranchOccurrenceIndex,
        terminalSourceNodeOrdinal:tee.sourceTeeJunctionOrdinal,
        sourceBranEndpoint:bran.endpoint,
        sourceBranRef:bran.ref,
        sourceTeeRef:tee.sourceTeeRef,
        teePort3SourceNodeOrdinal:tee.sourceTeePort3Ordinal,
        authoredPositiveId:bran.id,
        coordinateKey:bran.coordinateKey,
        status:'ORIGINAL_XML_TEE_BRAN_CANDIDATE_ONLY',
        mechanicalApproval:false,
      }));
    }else{
      unresolvedBran.push(Object.freeze({
        branchOccurrenceIndex:bran.bi,sourceNodeOrdinal:bran.ni,
        reason:tees.length>1?'MULTIPLE_TEE_JUNCTIONS':
          tees.length===1?'SOURCE_JUNCTION_IDENTITY_MULTIPLE_OR_INVALID':
          'NO_EXACT_SOURCE_TEE_JUNCTION',
      }));
    }
  }
  const zeroSpanRows=[],sourceConflictingPositiveRows=[];
  for(const list of branchRows){
    for(let i=1;i<list.length;i++){
      const prev=list[i-1],next=list[i];
      if(prev.coordinateKey===null||prev.coordinateKey!==next.coordinateKey)continue;
      const distinctPositive=positive(prev.id)&&positive(next.id)&&prev.id!==next.id;
      const sameComponentTwoPorts=portRef(prev)&&portRef(prev)===portRef(next)&&
        prev.kind===next.kind&&
        ['1','2'].includes(prev.endpoint)&&['1','2'].includes(next.endpoint)&&
        prev.endpoint!==next.endpoint;
      const row=Object.freeze({
        branchOccurrenceIndex:prev.bi,
        firstSourceNodeOrdinal:prev.ni,secondSourceNodeOrdinal:next.ni,
        sourceNodeNumberPair:Object.freeze([prev.id,next.id]),
        sourceComponentTypePair:Object.freeze([prev.kind,next.kind]),
        sourceComponentEndpointPair:Object.freeze([prev.endpoint,next.endpoint]),
        exactCoordinateKey:prev.coordinateKey,
        status:distinctPositive||sameComponentTwoPorts?
          'SOURCE_PORT_IDENTITY_REVIEW_REQUIRED':'ZERO_SPAN_NOT_GRAPH_APPROVED',
        sameComponentTwoPorts:!!sameComponentTwoPorts,
        conflictingAuthoredPositiveId:distinctPositive,
        nativeContractionAuthorized:false,
      });
      zeroSpanRows.push(row);
      if(distinctPositive)sourceConflictingPositiveRows.push(row);
    }
  }
  return Object.freeze({
    schema:XML229_SOURCE_PORT_EVIDENCE_SCHEMA,
    sourceXmlSha256,
    candidateLinks:Object.freeze(candidateLinks),
    unresolvedBran:Object.freeze(unresolvedBran),
    zeroSpanRows:Object.freeze(zeroSpanRows),
    authoredPositiveConflicts:Object.freeze(sourceConflictingPositiveRows),
    summary:Object.freeze({
      originalBranchCount:sourceBranches.length,
      originalNodeOccurrences:all.length,
      teePort3Witnesses,
      originalBranBoundaryOccurrences:branRows.length,
      uniqueTeeBranSourceCandidates:candidateLinks.length,
      unresolvedBranBoundaries:unresolvedBran.length,
      exactConsecutiveZeroSpanSourceEdges:zeroSpanRows.length,
      zeroSpanDistinctPositiveIds:sourceConflictingPositiveRows.length,
      graphUnionAuthorized:false,finalGeometryModified:false,
      nativeReleaseAuthorized:false,
    }),
  });
}

/**
 * Read-only challenge of *proposed* cross-branch aliases. Reject an unrelated
 * crossing even when it shares the same XYZ, or a fabricated witness key.
 * This does NOT amend the existing V2 binder or grant it alias authority.
 */
export function challengeXml229TeeBranConnectionAliases({originalXmlText,proposedAliases=[]}={}){
  if(!Array.isArray(proposedAliases))
    err('XML229_PORT_ALIAS_LIST_INVALID');
  const evidence=inspectXml229OriginalPortEvidence({originalXmlText});
  const accepted=new Map(evidence.candidateLinks.map(c=>[
    oid(c.aliasBranchOccurrenceIndex,c.aliasSourceNodeOrdinal),
    c,
  ]));
  const seen=new Set();
  for(const alias of proposedAliases){
    const k=oid(alias?.aliasBranchOccurrenceIndex,alias?.aliasSourceNodeOrdinal);
    if(seen.has(k))err('XML229_PORT_ALIAS_DUPLICATED');
    seen.add(k);
    const valid=accepted.get(k);
    if(!valid||valid.terminalBranchOccurrenceIndex!==alias?.terminalBranchOccurrenceIndex||
       valid.terminalSourceNodeOrdinal!==alias?.terminalSourceNodeOrdinal)
      err('XML229_PORT_ALIAS_SOURCE_WITNESS_REQUIRED');
  }
  return Object.freeze({
    validatedOriginalSourceCandidates:proposedAliases.length,
    engineeringGraphApproved:false,
    nativeReleaseAuthorized:false,
  });
}
