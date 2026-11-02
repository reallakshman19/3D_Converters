/**
 * XML229 #391: opt-in V2 SOURCE-BOUND nodal member materialization BEFORE
 * preview cleanup, renumbering, rigid promotion, Weight Final or native CII.
 *
 * The vertex owner is a connected original-source XYZ equivalence class, not
 * a source NodeNumber or a selected spatial candidate XML row.
 */
import {bindXml229JsonToPhysicalVertices} from './xml229-json-physical-vertex-binding.mjs';
import {applyXmlRestraints,restraintEntriesFromSupportKind}
  from '../../../converters/xml-cii2019-core/support-mapping.js';
import {isZeroInformationLimitRestraintElement}
  from '../../../converters/xml-cii2019-core/atta-default-restraint-closure.js';

export const XML229_PHYSICAL_PREFINAL_SCHEMA='XML229.PrefinalRestraints.v2';
const tag=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const children=(p,k)=>[...(p?.childNodes||[])].filter(n=>n.nodeType===1&&tag(n)===k);
const field=(p,k)=>String(children(p,k)[0]?.textContent??'').trim();
const code=(x)=>{const e=new Error(x);e.code=x;throw e;};
const path=(bi,ni)=>JSON.stringify([bi,ni]);
const numericFields=new Set(['Stiffness','Gap','Friction','CMPSUPGAP',
 'DirectionCosineX','DirectionCosineY','DirectionCosineZ']);
function semantic(restraint){
 const output=[];
 for(const c of children(restraint)){
   let v=String(c.textContent??'').trim();
   if(numericFields.has(tag(c))&&v!==''&&Number.isFinite(Number(v)))v=String(Number(v));
   output.push([tag(c),v]);
 }
 return JSON.stringify([output,Array.from(restraint.attributes||[])
   .map(a=>[a.name??a[0],a.value??a[1]]).sort()]);
}
function materializeSlot(doc,node,slot,config){
 const attrs={};
 if(slot.sourceGapExplicit)attrs.CMPSUPGAP=String(slot.sourceGapMm);
 const profiles=restraintEntriesFromSupportKind(slot.supportKind,attrs,node,config);
 if(profiles.length!==1)code('XML229_V2_PROFILE_MUST_HAVE_ONE_SLOT');
 const entry={...profiles[0],type:slot.xmlType};
 if(slot.sourceGapExplicit)entry.gap=String(slot.sourceGapMm);
 if(slot.sourceFields.stiffness)entry.stiffness=slot.sourceFields.stiffness;
 if(slot.sourceFields.friction)entry.friction=slot.sourceFields.friction;
 const dx=slot.sourceFields.directionX,dy=slot.sourceFields.directionY,
   dz=slot.sourceFields.directionZ;
 if([dx,dy,dz].some(Boolean)){
   if(![dx,dy,dz].every(v=>v!==''&&Number.isFinite(Number(v))))
     code('XML229_V2_SOURCE_DIRECTION_INCOMPLETE');
   entry.direction={x:Number(dx),y:Number(dy),z:Number(dz)};
 }
 const tmp=doc.createElementNS?.(node.namespaceURI||null,'Node')||doc.createElement('Node');
 applyXmlRestraints(doc,tmp,[entry],config);
 const out=children(tmp,'Restraint');
 if(out.length!==1)code('XML229_V2_SLOT_MATERIALIZATION_COUNT');
 return out[0];
}
function resolveCarriers(binding,document){
 const xmlBranches=[...document.getElementsByTagName('Branch')];
 const nodeByVertex=new Map();
 for(const [bi,br] of xmlBranches.entries()){
   for(const [ni,node] of children(br,'Node').entries()){
     const vertex=binding.vertexIndex.vertexForOriginal(bi,ni);
     if(vertex===null)code('XML229_V2_ORIGINAL_ORDINAL_MISSING');
     if(!nodeByVertex.has(vertex))nodeByVertex.set(vertex,[]);
     nodeByVertex.get(vertex).push({bi,ni,node});
   }
 }
 return nodeByVertex;
}
export function materializeXml229PhysicalVertexRestraints({
 originalXmlText,stagedJsonText,config={},document=null,
}={}){
 if(typeof DOMParser!=='function')code('XML229_V2_DOM_REQUIRED');
 const source=String(originalXmlText??'');
 if(!source.trim()||!String(stagedJsonText??'').trim())
   code('XML229_V2_ORIGINAL_XML_AND_JSON_REQUIRED');
 const binding=bindXml229JsonToPhysicalVertices({
   originalXmlText:source,stagedJsonText,config,
 });
 if(binding.summary.unboundSourceSupportMembers!==0)
   code('XML229_V2_SOURCE_SUPPORT_UNBOUND');
 const doc=document||new DOMParser().parseFromString(source,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)code('XML229_V2_XML_INVALID');
 const byVertex=resolveCarriers(binding,doc);
 const skipDefaultAtta=new Set(),outputs=[];
 let written=0,reused=0,relocated=0;
 for(const set of binding.nodalSlots.nodeSets){
   const all=byVertex.get(set.physicalVertexId)||[];
   const carriers=all.filter(row=>['ATTA','ANCI'].includes(field(row.node,'ComponentType').toUpperCase()));
   if(!carriers.length)code('XML229_V2_VERTEX_HAS_NO_SUPPORT_CARRIER');
   // Prefer a carrier already holding source-authored restraints, but require
   // one canonical authored source at this vertex (no contradictory aliases).
   const authored=carriers.filter(row=>children(row.node,'Restraint').some(r=>
     !isZeroInformationLimitRestraintElement(r)));
   if(authored.length>1)code('XML229_V2_AUTHORED_RESTRAINT_ALIASES_CONFLICT');
   const selected=authored[0]||carriers[0];
   for(const row of carriers)skipDefaultAtta.add(row.node);
   const expected=set.slots.map(slot=>materializeSlot(doc,selected.node,slot,config));
   const sourceRows=children(selected.node,'Restraint').filter(r=>
     !isZeroInformationLimitRestraintElement(r));
   if(sourceRows.length>6)code('XML229_V2_AUTHORED_SLOT_CAPACITY');
   const available=expected.map(r=>semantic(r));
   // Reuse only exact authorized original XML restraint semantics. Do not
   // Map(kind) and erase two same-kind distinct engineering members.
   const used=new Set(),missing=[];
   for(const existing of sourceRows){
     const idx=available.findIndex((v,i)=>!used.has(i)&&v===semantic(existing));
     if(idx<0)code('XML229_V2_AUTHORED_RESTRAINT_CONFLICT');
     used.add(idx);reused++;
   }
   for(let i=0;i<expected.length;i++)if(!used.has(i))missing.push(expected[i]);
   for(const row of carriers)for(const r of children(row.node,'Restraint')){
     if(isZeroInformationLimitRestraintElement(r)){
       row.node.removeChild(r);relocated++;
     }else if(row!==selected)code('XML229_V2_AUTHORED_RESTRAINT_ALIASES_CONFLICT');
   }
   const remain=children(selected.node,'Restraint').length;
   if(remain+missing.length>6)code('XML229_V2_NATIVE_SIX_SLOT_CAPACITY');
   for(const restraint of missing){selected.node.appendChild(restraint);written++;}
   outputs.push(Object.freeze({
     physicalVertexId:set.physicalVertexId,
     canonicalSourceOccurrence:Object.freeze({
       branchOccurrenceIndex:selected.bi,sourceNodeOrdinal:selected.ni,
     }),
     slotCount:set.slotCount,
     writtenSlots:missing.length,
   }));
 }
 return Object.freeze({
   document:doc,skipDefaultAtta,
   proofSummary:Object.freeze({
     sourceSupportMembers:binding.summary.sourceSupportMembers,
     boundSourceSupportMembers:binding.summary.boundSourceSupportMembers,
     projectedSlotCount:binding.nodalSlots.verifiedSourceMemberSegments,
     canonicalPhysicalRestraintVertices:outputs.length,
     writtenSlots:written,reusedAuthoredSlots:reused,
     removedZeroInformationPlaceholders:relocated,
     originalPositionsModified:0,
     nativeCiiReleaseAuthorized:false,
   }),
   placements:Object.freeze(outputs),
 });
}
