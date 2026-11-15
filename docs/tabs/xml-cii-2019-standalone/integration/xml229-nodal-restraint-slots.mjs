/**
 * XML229 WBS 2.1–2.3: physical-vertex nodal restraint member projection.
 *
 * Non-authorizing preparation: source-occurrence IDs and physicalVertexId must
 * already come from authentic original-source / connected topology extraction.
 * This module DOES NOT infer a vertex from coordinates or choose an XML row.
 * Materialization into Final EnrichedXML/native CII requires a later pass.
 */
import {supportKindFromMember,supportGapNumber,sourceNodeType,isRestHardwareMember}
  from '../xml-cii-mds-restraint-closure.js';
import {restraintAuditMember} from '../xml-cii-restraint-audit.js';

export const XML229_NODAL_SLOTS_SCHEMA='XML229.NodalRestraintSlots.v1';
export const XML229_MAX_NODAL_SLOTS=6;
const XML_TYPE=Object.freeze({REST:'+Y',GUIDE:'GUI',LINESTOP:'LIM'});
const CII_CODE=Object.freeze({'+Y':14,GUI:8,LIM:9});
const SOURCE_TYPES=new Set(['SUPPORT','ATTA','ANCI','REST','GUIDE','LINESTOP']);
const str=v=>String(v??'').trim();
function fail(code){const e=new Error(code);e.code=code;throw e;}
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
function isSupport(member){
  const type=str(member.sourceType||member.type).toUpperCase();
  return !type||SOURCE_TYPES.has(type)||/^GT\d+|^ST\d+|^AT\d+/.test(type);
}
function sourceAttributes(member){
  return obj(member?.raw?.attributes||member?.attributes||member?.capturedFields);
}
function segments(attrs,member){
  const description=str(attrs.DTXR||attrs.DESC||attrs.DESCRIPTION||member.description);
  if(description.includes('|'))fail('XML229_NODAL_COMPOUND_NOT_QUALIFIED');
  return [null];
}
function segmentAttributes(base){
  if(/CMPSUPGAP\s*=/i.test(str(base.DTXR||base.DESC||base.DESCRIPTION))&&
    !['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'].some(k=>str(base[k])))
    fail('XML229_NODAL_INLINE_GAP_NOT_QUALIFIED');
  return base;
}
function numericCode(xmlType){
  const direct=CII_CODE[xmlType];
  if(direct!==undefined)return direct;
  const n=Number(xmlType);
  return Number.isInteger(n)&&n>=1&&n<=62?n:null;
}

export function projectXml229NodalRestraintSlots({members,config={}}={}){
  if(!Array.isArray(members))fail('XML229_NODAL_MEMBERS_REQUIRED');
  const nodes=new Map(),seenSource=new Set();
  let sourceCount=0;
  for(const member of members){
    if(!member||typeof member!=='object')fail('XML229_NODAL_MEMBER_INVALID');
    if(!isSupport(member))continue;
    const vertexId=str(member.physicalVertexId),sourceId=str(member.sourceOccurrenceId);
    if(!vertexId||!sourceId)fail('XML229_NODAL_SOURCE_VERTEX_ID_REQUIRED');
    if(seenSource.has(sourceId))fail('XML229_NODAL_SOURCE_OCCURRENCE_DUPLICATED');
    seenSource.add(sourceId);
    const base=sourceAttributes(member);
    const parts=segments(base,member);
    for(const [segmentOrdinal,segment] of parts.entries()){
      const attrs=segmentAttributes(base);
      const classified={...member,description:segment===null?member.description:'',raw:{attributes:attrs}};
      let decision=null;
      const kind=supportKindFromMember(classified,config,value=>{decision=value;});
      if(isRestHardwareMember(attrs,kind))fail('XML229_NODAL_HARDWARE_ROLE_REVIEW_REQUIRED');
      if(!kind){
        // Do not fabricate a support from a non-engineering description.
        // Once the caller declares a mandatory source support occurrence,
        // silently ignoring it would violate the member-census contract.
        fail('XML229_NODAL_SUPPORT_KIND_REQUIRED');
      }
      if(!(kind in XML_TYPE))fail('XML229_NODAL_KIND_UNSUPPORTED');
      const xmlType=sourceNodeType(attrs,config)||XML_TYPE[kind];
      if(xmlType in CII_CODE&&xmlType!==XML_TYPE[kind])
        fail('XML229_NODAL_MUTATION_KIND_CONFLICT');
      const code=numericCode(xmlType);
      if(code===null)fail('XML229_NODAL_TYPE_UNSUPPORTED');
      if(code!==CII_CODE[XML_TYPE[kind]])fail('XML229_NODAL_TYPE_NOT_QUALIFIED');
      const gapMm=supportGapNumber(attrs);
      const slot=Object.freeze({
        source:restraintAuditMember({...classified,path:member.sourceOccurrenceId
          .replace(/\/(children)/g,'.$1').replace(/\/(\d+)/g,'[$1]')},decision,'physical-vertex-source-member'),
        physicalVertexId:vertexId,
        sourceOccurrenceId:sourceId,
        sourceSegmentOrdinal:segmentOrdinal,
        supportKind:kind,
        xmlType,
        ciiTypeCode:code,
        // NULL means source gap absent: do not invent 0 or overwrite a
        // configured, independently accepted fallback.
        sourceGapMm:gapMm,
        sourceGapExplicit:gapMm!==null,
        sourceFields:Object.freeze({
          stiffness:str(attrs.STIFFNESS??attrs.NODESTIFFNESS),
          friction:str(attrs.FRICTION??attrs.NODEFRICTION),
          directionX:str(attrs.DirectionCosineX??attrs.DIRECTIONCOSINEX),
          directionY:str(attrs.DirectionCosineY??attrs.DIRECTIONCOSINEY),
          directionZ:str(attrs.DirectionCosineZ??attrs.DIRECTIONCOSINEZ),
        }),
      });
      if(!nodes.has(vertexId))nodes.set(vertexId,[]);
      const slots=nodes.get(vertexId);
      if(slots.length>=XML229_MAX_NODAL_SLOTS)fail('XML229_NODAL_SIX_SLOT_CAPACITY_EXCEEDED');
      slots.push(slot);sourceCount++;
    }
  }
  const nodeSets=Object.freeze([...nodes].map(([physicalVertexId,slots])=>Object.freeze({
    physicalVertexId,slotCount:slots.length,slots:Object.freeze(slots),
  })));
  return Object.freeze({
    schema:XML229_NODAL_SLOTS_SCHEMA,
    nodeSets,
    verifiedSourceMemberSegments:sourceCount,
    transformedCoordinates:0,
    mutatedFinalXml:false,
    emittedNativeCii:false,
    nativeReleaseAuthorized:false,
  });
}
