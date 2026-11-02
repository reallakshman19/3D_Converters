/**
 * XML229 #391 WBS 4.1/4.2: source physical vertex -> reviewed Final geometry
 * node-number/slot-placement PLAN, not a writer.
 *
 * This is the critical second-pass diagnostic. It rejects moved original XYZ,
 * does not invent interior split points, and exposes the source-vertex aliases
 * which were accidentally assigned DIFFERENT native positive node numbers.
 * A geometry renumber/reacceptance is required before such a plan can be
 * promoted to native ownership; no old Final approval may be reused.
 */
export const XML229_REVIEWED_VERTEX_SLOT_PLAN='XML229.ReviewedVertexSlotPlan.v1';
const tag=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const children=(p,k)=>[...(p?.childNodes||[])].filter(n=>n.nodeType===1&&tag(n)===k);
const field=(n,k)=>String(children(n,k)[0]?.textContent??'').trim();
const occurrence=(branch,ordinal)=>JSON.stringify([branch,ordinal]);
function fail(code){const e=new Error(code);e.code=code;throw e;}
function number(s){
  const n=Number(s);
  return /^\d+$/.test(String(s))&&Number.isSafeInteger(n)&&n>0?n:null;
}

export function planXml229ReviewedNodalPlacements({sourceBinding,finalizedGeometry}={}){
  if(!sourceBinding?.vertexIndex||!finalizedGeometry)
    fail('XML229_PASS2_SOURCE_AND_FINAL_REQUIRED');
  if(typeof DOMParser==='undefined')fail('XML229_PASS2_DOM_UNAVAILABLE');
  const original=sourceBinding.vertexIndex;
  if(sourceBinding.mode==='XML_ONLY_NO_JSON')
    return Object.freeze({
      schema:XML229_REVIEWED_VERTEX_SLOT_PLAN,mode:'XML_ONLY_NO_JSON',
      placements:Object.freeze([]),
      summary:Object.freeze({sourceMemberCount:0,plannedSlotCount:0,
        verticesRequiringCanonicalRenumber:0,orphanedVertexSlotSets:0,
        originalPositionsChanged:0,postFinalMutationAuthorized:false,
        nativeReleaseAuthorized:false}),
    });
  if(sourceBinding.mode!=='JSON_GOVERNED_SHADOW'||!sourceBinding.nodalSlots)
    fail('XML229_PASS2_NODAL_SOURCE_REQUIRED');
  if(typeof finalizedGeometry.xmlText!=='string'||
    !Array.isArray(finalizedGeometry.retainedSourceOrdinalsByBranch))
    fail('XML229_PASS2_FINALIZED_GEOMETRY_INVALID');
  const doc=new DOMParser().parseFromString(finalizedGeometry.xmlText,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)fail('XML229_PASS2_FINAL_XML_INVALID');
  const branches=[...doc.getElementsByTagName('Branch')];
  const retained=finalizedGeometry.retainedSourceOrdinalsByBranch;
  if(branches.length!==retained.length||
    branches.length!==original.summary.originalBranchCount)
    fail('XML229_PASS2_FINAL_BRANCH_CENSUS_DRIFT');
  const originalByOccurrence=new Map(original.sourceOccurrences.map((row,i)=>[
    occurrence(row.branchOccurrenceIndex,row.sourceNodeOrdinal),
    {...row,vertexId:original.vertexOfOccurrence[i]},
  ]));
  const finalByVertex=new Map(),finalIdOwners=new Map();
  let finalNodes=0;
  for(const [bi,branch] of branches.entries()){
    const nodes=children(branch,'Node'),ordinals=retained[bi];
    if(!Array.isArray(ordinals)||nodes.length!==ordinals.length)
      fail('XML229_PASS2_RETAINED_ORDINAL_CENSUS_DRIFT');
    const seen=new Set();
    for(const [i,node] of nodes.entries()){
      const ordinal=ordinals[i];
      if(!Number.isSafeInteger(ordinal)||ordinal<0||seen.has(ordinal))
        fail('XML229_PASS2_ORIGINAL_ORDINAL_INVALID');
      seen.add(ordinal);
      const row=originalByOccurrence.get(occurrence(bi,ordinal));
      if(!row)fail('XML229_PASS2_UNREVIEWED_GENERATED_NODE');
      // The current V1 Final contract requires exact original XYZ strings.
      // True new split nodes require the separate reviewed split-lineage V2.
      if(field(node,'Position')!==row.positionRaw)
        fail('XML229_PASS2_ORIGINAL_POSITION_MUTATED');
      const nodeNo=number(field(node,'NodeNumber'));
      if(nodeNo===null)fail('XML229_PASS2_FINAL_POSITIVE_NODE_REQUIRED');
      const vertex=row.vertexId;
      if(!finalByVertex.has(vertex))finalByVertex.set(vertex,[]);
      const info=Object.freeze({
        branchOccurrenceIndex:bi,sourceNodeOrdinal:ordinal,
        nodeNumber:nodeNo,componentType:field(node,'ComponentType').toUpperCase(),
        authoredRestraintCount:children(node,'Restraint').length,
      });
      finalByVertex.get(vertex).push(info);
      if(!finalIdOwners.has(nodeNo))finalIdOwners.set(nodeNo,new Set());
      finalIdOwners.get(nodeNo).add(vertex);
      finalNodes++;
    }
  }
  const crossVertexNativeIdCollisions=[...finalIdOwners.values()]
    .filter(vertices=>vertices.size>1).length;
  const placements=[],reasons={},memberCount=sourceBinding.nodalSlots.verifiedSourceMemberSegments;
  let aliasRenumber=0,orphaned=0,authoredOnOtherAliases=0,overCapacity=0;
  for(const set of sourceBinding.nodalSlots.nodeSets){
    const candidates=finalByVertex.get(set.physicalVertexId)||[];
    const numbers=new Set(candidates.map(row=>row.nodeNumber));
    const requiresCanonicalRenumber=numbers.size>1;
    if(requiresCanonicalRenumber)aliasRenumber++;
    if(!candidates.length)orphaned++;
    const sorted=[...candidates].sort((a,b)=>{
      const rank=v=>['ANCI','ATTA'].includes(v.componentType)?0:1;
      return rank(a)-rank(b)||
        Number(b.authoredRestraintCount>0)-Number(a.authoredRestraintCount>0)||
        a.branchOccurrenceIndex-b.branchOccurrenceIndex||
        a.sourceNodeOrdinal-b.sourceNodeOrdinal;
    });
    const selected=sorted[0]||null;
    const authoredOther=sorted.filter(v=>v!==selected&&v.authoredRestraintCount>0);
    if(authoredOther.length)authoredOnOtherAliases++;
    const already=selected?.authoredRestraintCount||0;
    const requiresRestraintReconciliation=already>0;
    if(already+set.slotCount>6)overCapacity++;
    const reasonsFor=[];
    if(!selected)reasonsFor.push('SLOT_VERTEX_NOT_RETAINED');
    if(requiresCanonicalRenumber)reasonsFor.push('ALIAS_POSITIVE_NODE_NUMBERS_DIVERGE');
    if(authoredOther.length)reasonsFor.push('ORIGINAL_AUTHORED_RESTRAINT_ON_OTHER_ALIAS');
    if(requiresRestraintReconciliation)reasonsFor.push('ORIGINAL_AUTHORED_RESTRAINT_RECONCILIATION_REQUIRED');
    if(already+set.slotCount>6)reasonsFor.push('NATIVE_SIX_SLOT_RECONCILIATION_REQUIRED');
    for(const r of reasonsFor)reasons[r]=(reasons[r]||0)+1;
    placements.push(Object.freeze({
      physicalVertexId:set.physicalVertexId,
      canonicalNodeNumber:selected?.nodeNumber??null,
      canonicalSourceOccurrence:selected?Object.freeze({
        branchOccurrenceIndex:selected.branchOccurrenceIndex,
        sourceNodeOrdinal:selected.sourceNodeOrdinal,
      }):null,
      finalAliasNodeNumbers:Object.freeze([...numbers]),
      slotCount:set.slotCount,slots:set.slots,
      requiresCanonicalRenumber,requiresRestraintReconciliation,
      localAliasChecksPassed:reasonsFor.length===0,
      reasons:Object.freeze(reasonsFor),
    }));
  }
  const unbound=sourceBinding.summary.unboundSourceSupportMembers||0;
  if(unbound)reasons.UNBOUND_ORIGINAL_JSON_SOURCE_MEMBER=unbound;
  if(crossVertexNativeIdCollisions)
    reasons.CII_NODE_ID_SHARED_ACROSS_DISCONNECTED_VERTICES=crossVertexNativeIdCollisions;
  return Object.freeze({
    schema:XML229_REVIEWED_VERTEX_SLOT_PLAN,mode:'JSON_GOVERNED_SHADOW',
    placements:Object.freeze(placements),
    summary:Object.freeze({
      sourceMemberCount:memberCount,plannedSlotCount:placements.reduce((n,p)=>n+p.slotCount,0),
      finalNodeOccurrences:finalNodes,
      verticesRequiringCanonicalRenumber:aliasRenumber,
      orphanedVertexSlotSets:orphaned,
      authoredRestraintsOnOtherAliases:authoredOnOtherAliases,
      nativeCapacityReconciliations:overCapacity,
      disconnectedVertexIdCollisions:crossVertexNativeIdCollisions,
      unboundSourceMembers:unbound,
      reasonCounts:Object.freeze(reasons),
      originalPositionsChanged:0,
      postFinalMutationAuthorized:false,nativeReleaseAuthorized:false,
    }),
  });
}
