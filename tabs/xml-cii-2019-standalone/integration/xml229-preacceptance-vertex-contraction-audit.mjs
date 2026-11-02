/**
 * XML229 #391 WBS 3/4: original graph-aware canonical CII numbering gate.
 * One physical vertex is not necessarily one surviving XML row: adjacent
 * same-XYZ source rows form a zero-length source edge which MUST be contracted
 * before sharing a native NodeNumber. No final kg or topology is mutated.
 */
import {indexXml229OriginalPhysicalVertices}
  from './xml229-original-physical-vertices.mjs';

export const XML229_VERTEX_CONTRACTION_SCHEMA=
  'XML229.PreAcceptanceVertexContractionAudit.v1';
const tag=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const nodes=(p,n)=>[...(p?.childNodes||[])].filter(v=>v.nodeType===1&&tag(v)===n);
const field=(p,n)=>String(nodes(p,n)[0]?.textContent??'').trim();
function fail(code){const e=new Error(code);e.code=code;throw e;}
const ordKey=(branch,ordinal)=>JSON.stringify([branch,ordinal]);

export function auditXml229PreacceptanceVertexContractions({
  originalXmlText,finalizedXmlText,retainedSourceOrdinalsByBranch,
  branchConnectionAliases=[],sourceXmlSha256='',
}={}){
  const graph=indexXml229OriginalPhysicalVertices({
    xmlText:originalXmlText,sourceXmlSha256,branchConnectionAliases,
  });
  if(typeof finalizedXmlText!=='string'||!Array.isArray(retainedSourceOrdinalsByBranch))
    fail('XML229_CONTRACTION_FINAL_REQUIRED');
  const document=new DOMParser().parseFromString(finalizedXmlText,'application/xml');
  if(document.getElementsByTagName('parsererror').length)
    fail('XML229_CONTRACTION_FINAL_XML_INVALID');
  const branches=[...document.getElementsByTagName('Branch')];
  if(branches.length!==graph.summary.originalBranchCount||
      branches.length!==retainedSourceOrdinalsByBranch.length)
    fail('XML229_CONTRACTION_BRANCH_CENSUS');
  const originals=graph.sourceOccurrences;
  const originalIndex=new Map(originals.map((x,i)=>[
    ordKey(x.branchOccurrenceIndex,x.sourceNodeOrdinal),i,
  ]));
  const finalLookup=new Map(),finalNumberOwners=new Map();
  for(const [bi,branch] of branches.entries()){
    const finalNodes=nodes(branch,'Node');
    const retained=retainedSourceOrdinalsByBranch[bi];
    if(!Array.isArray(retained)||retained.length!==finalNodes.length)
      fail('XML229_CONTRACTION_RETAINED_CENSUS');
    let previous=-1;
    for(const [i,node] of finalNodes.entries()){
      const ordinal=retained[i];
      const idx=originalIndex.get(ordKey(bi,ordinal));
      if(!Number.isSafeInteger(ordinal)||idx===undefined||ordinal<=previous)
        fail('XML229_CONTRACTION_ORDINAL_DRIFT');
      previous=ordinal;
      const original=originals[idx];
      if(field(node,'Position')!==original.positionRaw)
        fail('XML229_CONTRACTION_ORIGINAL_POSITION_DRIFT');
      const raw=field(node,'NodeNumber');
      const number=Number(raw);
      if(!/^[0-9]+$/.test(raw)||!Number.isSafeInteger(number)||number<1||
         number>2147483647)fail('XML229_CONTRACTION_FINAL_ID_INVALID');
      const key=ordKey(bi,ordinal);
      const row=Object.freeze({
        branchOccurrenceIndex:bi,sourceNodeOrdinal:ordinal,
        finalNodeNumber:number,
        finalComponentType:field(node,'ComponentType'),
        finalizedAuthoredRestraints:nodes(node,'Restraint').length,
      });
      finalLookup.set(key,row);
      if(!finalNumberOwners.has(number))finalNumberOwners.set(number,new Set());
      finalNumberOwners.get(number).add(graph.vertexOfOccurrence[idx]);
    }
  }
  const violations=[];
  let retainedZeroLengthEdges=0,unretainedZeroLengthEdges=0;
  const candidates=[],groups=new Map();
  for(const [i,row] of originals.entries()){
    const vertex=graph.vertexOfOccurrence[i];
    if(!groups.has(vertex))groups.set(vertex,[]);
    groups.get(vertex).push(row);
  }
  for(const [vertex,rows] of groups.entries()){
    if(rows.length<2)continue;
    const byBranch=new Map();
    for(const row of rows){
      if(!byBranch.has(row.branchOccurrenceIndex))byBranch.set(row.branchOccurrenceIndex,[]);
      byBranch.get(row.branchOccurrenceIndex).push(row);
    }
    for(const [bi,occurrences] of byBranch.entries()){
      const sorted=[...occurrences].sort((a,b)=>a.sourceNodeOrdinal-b.sourceNodeOrdinal);
      let run=[];
      const flush=()=>{
        if(run.length<2){run=[];return;}
        const ids=run.map(r=>r.sourceNodeOrdinal);
        const finals=ids.map(id=>finalLookup.get(ordKey(bi,id))).filter(Boolean);
        const finalIds=finals.map(r=>r.finalNodeNumber);
        const authoredPositive=[...new Set(run.map(r=>Number(r.sourceNodeNumber))
          .filter(n=>Number.isSafeInteger(n)&&n>0))];
        const status=finals.length===run.length
          ?'SOURCE_ZERO_EDGE_RETAINED'
          :'SOURCE_ZERO_EDGE_ALREADY_PRUNED';
        if(status==='SOURCE_ZERO_EDGE_RETAINED')retainedZeroLengthEdges+=run.length-1;
        else unretainedZeroLengthEdges+=run.length-1;
        const reasons=[];
        if(authoredPositive.length>1)reasons.push('CONFLICTING_AUTHORED_POSITIVE_IDENTITIES');
        if(finals.length===run.length)reasons.push('ZERO_LENGTH_SOURCE_EDGE_MUST_CONTRACT');
        if(run.some(r=>['VALV','FLAN','INST','RIGID'].includes(r.sourceComponentType)||
          r.sourceEndpoint==='1'||r.sourceEndpoint==='2'))
          reasons.push('RIGID_OR_COMPONENT_ENDPOINT_REVIEW_REQUIRED');
        if(finals.some(f=>f.finalizedAuthoredRestraints>0))
          reasons.push('NODAL_SLOTS_REQUIRE_CANONICAL_REBIND');
        const finalUnique=[...new Set(finalIds)];
        if(finals.length===run.length&&finalUnique.length===1)
          reasons.push('SELF_EDGE_FROM_PREMATURE_NATIVE_ID_WELD');
        const candidate=Object.freeze({
          physicalVertexId:vertex,branchOccurrenceIndex:bi,
          sourceNodeOrdinals:Object.freeze(ids),
          retainedSourceNodeOrdinals:Object.freeze(finals.map(f=>f.sourceNodeOrdinal)),
          finalNativeNodeNumbers:Object.freeze(finalIds),
          authoredPositiveSourceNodeNumbers:Object.freeze(authoredPositive),
          status,requiredContractions:run.length-1,
          nativeNodeNumberReuseAllowedNow:false,
          reasons:Object.freeze(reasons),
        });
        candidates.push(candidate);
        if(reasons.includes('SELF_EDGE_FROM_PREMATURE_NATIVE_ID_WELD'))
          violations.push('SELF_EDGE_FROM_PREMATURE_NATIVE_ID_WELD');
        run=[];
      };
      for(const row of sorted){
        if(run.length&&row.sourceNodeOrdinal!==run[run.length-1].sourceNodeOrdinal+1)
          flush();
        run.push(row);
      }
      flush();
    }
  }
  const crossVertexNativeIdCollisions=[...finalNumberOwners.values()]
    .filter(group=>group.size>1).length;
  if(crossVertexNativeIdCollisions)
    violations.push('DISCONNECTED_VERTICES_SHARE_NATIVE_ID');
  const originalNodeOccurrences=originals.length;
  const retainedNodeOccurrences=finalLookup.size;
  return Object.freeze({
    schema:XML229_VERTEX_CONTRACTION_SCHEMA,
    sourceXmlSha256,originalNodeOccurrences,retainedNodeOccurrences,
    candidates:Object.freeze(candidates),
    summary:Object.freeze({
      exactSourcePhysicalVertices:graph.summary.physicalVertexCount,
      zeroLengthRunsRequiringTopologyReview:candidates.length,
      retainedZeroLengthSourceEdges:retainedZeroLengthEdges,
      alreadyPrunedZeroLengthSourceEdges:unretainedZeroLengthEdges,
      disconnectedNativeIdCollisions:crossVertexNativeIdCollisions,
      prematureNativeIdSelfEdges:violations.filter(x=>
        x==='SELF_EDGE_FROM_PREMATURE_NATIVE_ID_WELD').length,
      originalPositionsChanged:0,physicalMassOwnersReassigned:0,
      topologyContracted:false,
      nativeCiiReleaseAuthorized:false,
    }),
  });
}
