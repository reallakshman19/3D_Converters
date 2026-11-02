/**
 * XML229 #391 WBS 3.2: reviewed pre-Final rigid split coordinate math.
 *
 * Proposal ONLY: produces source-edge-attested new-node coordinates and
 * endpoint-alias copies but does not modify XML, physical mass, or Final.
 * This module must run BEFORE an accepted Weight Final, never after one.
 */
import {canonicalXml229Decimal,indexXml229OriginalPhysicalVertices}
  from './xml229-original-physical-vertices.mjs';

export const XML229_SPLIT_COORDINATE_SCHEMA='XML229.PreFinalRigidSplitCoordinatePlan.v1';
function fail(code){const e=new Error(code);e.code=code;throw e;}
function decimal(v){
  const s=canonicalXml229Decimal(v);
  if(s===null)fail('XML229_SPLIT_DECIMAL_INVALID');
  if(s==='0')return {n:0n,e:0};
  const m=s.match(/^(-?\d+)e(-?\d+)$/);
  if(!m)fail('XML229_SPLIT_DECIMAL_INVALID');
  return {n:BigInt(m[1]),e:Number(m[2])};
}
function compact({n,e}){
  if(n===0n)return {n:0n,e:0};
  while(n%10n===0n){n/=10n;e++;}
  if(!Number.isSafeInteger(e)||Math.abs(e)>256)
    fail('XML229_SPLIT_DECIMAL_RANGE');
  return {n,e};
}
function add(a,b){
  const e=Math.min(a.e,b.e);
  if(Math.max(a.e-e,b.e-e)>256)fail('XML229_SPLIT_DECIMAL_RANGE');
  return compact({n:a.n*10n**BigInt(a.e-e)+b.n*10n**BigInt(b.e-e),e});
}
function minus(a,b){return add(a,{n:-b.n,e:b.e});}
function multiply(a,b){return compact({n:a.n*b.n,e:a.e+b.e});}
function compare(a,b){const d=minus(a,b);return d.n<0n?-1:d.n>0n?1:0;}
function toText(d){
  if(d.n===0n)return '0';
  const negative=d.n<0n;
  const digits=(d.n<0n?-d.n:d.n).toString(),ex=d.e;
  if(ex>256||ex< -256)fail('XML229_SPLIT_DECIMAL_RANGE');
  const sign=negative?' -'.trim():'';
  if(ex>=0)return sign+digits+'0'.repeat(ex);
  const pivot=digits.length+ex;
  return sign+(pivot>0
    ?digits.slice(0,pivot)+'.'+digits.slice(pivot)
    :'0.'+'0'.repeat(-pivot)+digits);
}
function xyz(raw){
  const pieces=String(raw??'').trim().split(/\s+/);
  if(pieces.length!==3)fail('XML229_SPLIT_POSITION_INVALID');
  return pieces.map(decimal);
}
function originalKey(b,i){return JSON.stringify([b,i]);}
function edgeKey(b,i){return JSON.stringify([b,i,i+1]);}

export function proposeXml229PreFinalRigidSplitCoordinates({
  originalXmlText,sourceXmlSha256='',splitRequests=[],
  acceptedFinalPacket=null,
}={}){
  if(acceptedFinalPacket)fail('XML229_POST_FINAL_SPLIT_FORBIDDEN');
  if(!Array.isArray(splitRequests))fail('XML229_SPLIT_REQUESTS_INVALID');
  const source=indexXml229OriginalPhysicalVertices({
    xmlText:originalXmlText,sourceXmlSha256,
  });
  const occurrences=new Map(source.sourceOccurrences.map(row=>[
    originalKey(row.branchOccurrenceIndex,row.sourceNodeOrdinal),row,
  ]));
  const used=new Set(),results=[],one=decimal('1'),zero=decimal('0');
  for(const request of splitRequests){
    const bi=request?.branchOccurrenceIndex,from=request?.fromSourceNodeOrdinal;
    const to=request?.toSourceNodeOrdinal;
    if(!Number.isSafeInteger(bi)||!Number.isSafeInteger(from)||
       to!==from+1||bi<0||from<0)
      fail('XML229_SPLIT_SOURCE_EDGE_REQUIRED');
    const id=edgeKey(bi,from);
    if(used.has(id))fail('XML229_SPLIT_SOURCE_EDGE_DUPLICATED');
    used.add(id);
    const A=occurrences.get(originalKey(bi,from));
    const B=occurrences.get(originalKey(bi,to));
    if(!A||!B)fail('XML229_SPLIT_SOURCE_EDGE_NOT_FOUND');
    const av=xyz(A.positionRaw),bv=xyz(B.positionRaw);
    if(av.every((v,i)=>compare(v,bv[i])===0))
      fail('XML229_SPLIT_ZERO_LENGTH_EDGE');
    const fractions=request?.fractions||[];
    const aliases=request?.aliases||[];
    if(!Array.isArray(fractions)||!Array.isArray(aliases)||
       fractions.length>64||aliases.length>2)
      fail('XML229_SPLIT_REQUEST_CAPACITY');
    const sorted=[...fractions].map(decimal).sort(compare);
    for(let i=0;i<sorted.length;i++){
      const t=sorted[i];
      if(compare(t,zero)<=0||compare(t,one)>=0)
        fail('XML229_SPLIT_FRACTION_OUTSIDE_INTERIOR');
      if(i&&compare(t,sorted[i-1])===0)
        fail('XML229_SPLIT_DUPLICATED_INTERIOR_FRACTION');
    }
    const generated=sorted.map((t,i)=>Object.freeze({
      derivedId:id+':SPLIT:'+i,
      type:'INTERIOR',
      originalEdgeId:id,
      sourceFromOccurrence:Object.freeze({branchOccurrenceIndex:bi,sourceNodeOrdinal:from}),
      sourceToOccurrence:Object.freeze({branchOccurrenceIndex:bi,sourceNodeOrdinal:to}),
      t:toText(t),
      position:Object.freeze(av.map((v,j)=>
        toText(add(v,multiply(t,minus(bv[j],v)))))),
      physicalVertexId:null,
      receivesOriginalEndpointRestraints:false,
      receivesNewPhysicalMassOwner:false,
    }));
    const explicitAliases=aliases.map((which,i)=>{
      if(which!=='FROM'&&which!=='TO')fail('XML229_SPLIT_ALIAS_ENDPOINT_INVALID');
      const end=which==='FROM'?A:B;
      const ordinal=which==='FROM'?from:to;
      return Object.freeze({
        derivedId:id+':ALIAS:'+which+':'+i,
        type:'ENDPOINT_ALIAS',copyFrom:which,
        originalEdgeId:id,
        sourceOccurrence:Object.freeze({branchOccurrenceIndex:bi,sourceNodeOrdinal:ordinal}),
        // EXACT original Position text; no rounding or resnapping.
        positionRaw:end.positionRaw,
        physicalVertexId:source.vertexForOriginal(bi,ordinal),
        receivesNewPhysicalMassOwner:false,
      });
    });
    // The vector sum of subdivided edge displacements is B-A by construction.
    results.push(Object.freeze({
      originalEdgeId:id,sourceFromPositionRaw:A.positionRaw,
      sourceToPositionRaw:B.positionRaw,
      generatedInterior:Object.freeze(generated),
      generatedAliases:Object.freeze(explicitAliases),
      segmentsCreated:generated.length+1,
      originalEndpointCoordinatesUnchanged:true,
    }));
  }
  return Object.freeze({
    schema:XML229_SPLIT_COORDINATE_SCHEMA,
    sourceXmlSha256,
    originalNodeCount:source.summary.originalNodeOccurrences,
    edgePlans:Object.freeze(results),
    summary:Object.freeze({
      reviewedSourceEdges:results.length,
      newInteriorVertices:results.reduce((n,r)=>n+r.generatedInterior.length,0),
      newEndpointAliases:results.reduce((n,r)=>n+r.generatedAliases.length,0),
      originalSourceNodesMoved:0,
      acceptedWeightOwnersChanged:0,
      requiresPreFinalTopologyReview:results.length>0,
      sourceXmlMutated:false,
      nativeReleaseAuthorized:false,
    }),
  });
}
