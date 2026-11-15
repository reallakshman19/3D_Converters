/** Resolve source-bound JSON supports before Final, then fill genuine gaps.
 * Never borrow UI XML or change source geometry/physical identity here.
 */
import {digestUtf8} from '../../../contracts/gc-pw-v1/contract.mjs';
import {closeGovernedMdsPositionRestraintsXml}
  from '../xml-cii-mds-restraint-closure.js';
import {closeGovernedAttaDefaultRestraints}
  from '../../../converters/xml-cii2019-core/atta-default-restraint-closure.js';
import {inventoryRestraintAudit,collectRestraintAudit,completeRestraintAudit,bindRestraintAudit}
  from '../xml-cii-restraint-audit.js';
import {materializeXml229PhysicalVertexRestraints} from './xml229-physical-vertex-prefinal-materializer.mjs';
import {recordXml229AttachmentDelegation} from './xml229-source-attachment-policy.mjs';
import {migrateSupportMappingConfig} from '../../../converters/xml-cii2019-core/support-mapping-config.js';

const local=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const elements=n=>[...(n?.childNodes||[])].filter(x=>x.nodeType===1);
function sourceShape(node){
  const children=elements(node).filter(n=>local(n)!=='Restraint');
  const attrs=[...(node?.attributes||[])].map(a=>[a.name??a[0],a.value??a[1]])
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  return [local(node),attrs,children.length?children.map(sourceShape):String(node?.textContent??'')];
}
function parse(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)
    throw Object.assign(new Error('Invalid original support XML'),{code:'PREFINAL_RESTRAINT_XML_INVALID'});
  return doc;
}
function physicalAudit(vertex,before,document,config){
  const notes=new Map();
  for(const placement of vertex.placements){
    const target=placement.canonicalSourceOccurrence;
    const row=before.find(r=>r.target.branchOccurrenceIndex===target.branchOccurrenceIndex&&
      r.target.sourceNodeOrdinal===target.sourceNodeOrdinal);
    notes.set(row.target.xmlIndex,{selections:placement.restraintSources,
      match:{method:'connected-original-physical-vertex',physicalVertexId:placement.physicalVertexId},
      physicalPlacement:{physicalVertexId:placement.physicalVertexId,
        sourceOccurrences:placement.sourceOccurrences}});
  }
  return collectRestraintAudit(before,document,notes,[],config);
}
export async function prepareXml229PrefinalRestraints({xmlText,stagedJsonText='',config={}}){
  const original=parse(xmlText);
  const before=inventoryRestraintAudit(original);
  const originalShape=JSON.stringify(sourceShape(original));
  const enabled=config.xml229PhysicalVertexPrefinal===true&&stagedJsonText.trim()&&
    migrateSupportMappingConfig(config).useJsonForRestraints!==false;
  const vertex=enabled?materializeXml229PhysicalVertexRestraints({
    originalXmlText:xmlText,stagedJsonText,config,document:original}):null;
  const resolved=enabled?null:closeGovernedMdsPositionRestraintsXml(
    xmlText,stagedJsonText,config,{requireUnambiguous:true});
  const document=vertex?.document||(resolved.changed?parse(resolved.xmlText):original);
  const captured=enabled?physicalAudit(vertex,before,document,config):resolved.restraintAudit;
  const fallback=closeGovernedAttaDefaultRestraints(document,config,{skipNodes:vertex?.skipDefaultAtta});
  if(originalShape!==JSON.stringify(sourceShape(document)))
    throw Object.assign(new Error('Support staging changed unrelated source fields'),
      {code:'PREFINAL_RESTRAINT_SOURCE_DRIFT'});
  const restraintAudit=await bindRestraintAudit(
    recordXml229AttachmentDelegation(completeRestraintAudit(captured,before,document,config),vertex,document),
    {xmlText,stagedJsonText,config,preparedXmlText:new XMLSerializer().serializeToString(document)});
  return {document,proof:Object.freeze({schema:enabled?'XML229.PrefinalRestraints.v2':'XML229.PrefinalRestraints.v1',
    originalJsonSha256:await digestUtf8(stagedJsonText),restraintAudit,
    ...(enabled?{physicalVertexMemberCensus:vertex.proofSummary}:{})}),
    stats:{...resolved?.stats,...fallback.stats,...(enabled?vertex.proofSummary:{})}};
}
