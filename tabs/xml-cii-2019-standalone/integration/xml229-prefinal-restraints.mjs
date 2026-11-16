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

import {restraintPrecedence} from '../../../converters/xml-cii2019-core/restraint-precedence-policy.js';
import {mappedCodePrecedenceEnabled} from '../../../converters/xml-cii2019-core/support-kind-precedence.js';

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
// Final and native replay remain strict. Only the explicitly identified
// nonreleasing Preview policy may quarantine conflicting source members.
export async function prepareXml229PrefinalRestraints({
 xmlText,stagedJsonText='',config={},policy='final',
}){
  if(config.xml229PhysicalVertexPrefinal===true&&(restraintPrecedence(config)||Object.values(config.xml229SourceFieldPrecedence||{}).some(v=>v===true)))
    throw Object.assign(new Error('Source-field precedence is not qualified for physical-vertex V2'),{code:'PREFINAL_RESTRAINT_CONFIG_INVALID'});
  if(!['final','preview'].includes(policy))
    throw Object.assign(new Error('Unknown restraint pre-Final policy'),
      {code:'PREFINAL_RESTRAINT_POLICY_INVALID'});
  const original=parse(xmlText);
  const before=inventoryRestraintAudit(original);
  const originalShape=JSON.stringify(sourceShape(original));
  const enabled=config.xml229PhysicalVertexPrefinal===true&&stagedJsonText.trim()&&
    migrateSupportMappingConfig(config).useJsonForRestraints!==false;
  const vertex=enabled?materializeXml229PhysicalVertexRestraints({
    originalXmlText:xmlText,stagedJsonText,config,document:original}):null;
  const resolved=enabled?null:closeGovernedMdsPositionRestraintsXml(
    xmlText,stagedJsonText,config,{requireUnambiguous:true,
      ...(policy==='preview'?{conflictPolicy:'quarantine'}:{})});
  const document=vertex?.document||(resolved.changed?parse(resolved.xmlText):original);
  const captured=enabled?physicalAudit(vertex,before,document,config):resolved.restraintAudit;
  const warnings=policy==='preview' ? [...(resolved?.warnings||[])] : [];
  const skipNodes=new Set(vertex?.skipDefaultAtta||[]);
  // An unresolved member is not permission to synthesize a new restraint at
  // its XML node via the generic ATTA fallback. Preserve any original +Y.
  if(warnings.length){
    const skipped=new Set(warnings.map(w=>w.xmlIndex).filter(Number.isSafeInteger));
    [...document.getElementsByTagName('Node')].forEach((node,i)=>{
      if(skipped.has(i+1))skipNodes.add(node);
    });
  }
  const fallback=closeGovernedAttaDefaultRestraints(document,config,{skipNodes});
  if(originalShape!==JSON.stringify(sourceShape(document)))
    throw Object.assign(new Error('Support staging changed unrelated source fields'),
      {code:'PREFINAL_RESTRAINT_SOURCE_DRIFT'});
  const restraintAudit=await bindRestraintAudit(
    recordXml229AttachmentDelegation(completeRestraintAudit(captured,before,document,config),vertex,document),
    {xmlText,stagedJsonText,config,preparedXmlText:new XMLSerializer().serializeToString(document)});
  const decisions=(restraintAudit.evaluations||[]).filter(row=>
    row.source?.decision?.source==='explicit-staged-field-precedence');
  const policySummary=Object.freeze({
    precedence:restraintPrecedence(config),
    flags:Object.fromEntries(['type','gap','stiffness','friction','mappedCodes'].map(key=>[key,key==='mappedCodes'?mappedCodePrecedenceEnabled(config):config.xml229SourceFieldPrecedence?.[key]===true])),
    savedGaps:Object.fromEntries(['REST','GUIDE','LINESTOP'].map(kind=>[kind,config.supportMapping?.kindProfiles?.[kind]?.gap??null])),
    typeDecisionOccurrences:decisions.length,
    mappedCodeDecisionOccurrences:decisions.filter(row=>row.source.decision.rule?.policy==='xml229SourceFieldPrecedence.mappedCodes'||(row.source.decision.rule?.policy==='xml229RestraintPrecedence.nodeType'&&Array.isArray(row.source.decision.rule?.mappedCodes))).length,
    uniqueTypeDecisionMembers:new Set(decisions.map(row=>row.source.path).filter(Boolean)).size,
    warningReasons:Object.freeze(warnings.reduce((out,row)=>{const key=row.resolutionReason||row.code;out[key]=(out[key]||0)+1;return out;},{})),
    authority:'CURRENT_STEP7_CONFIG',
    configSha256:restraintAudit.basis.configSha256,
  });
  const restraintReview=Object.freeze({
    sourceBasis:Object.freeze({xmlSha256:restraintAudit.basis.xmlSha256,jsonSha256:restraintAudit.basis.jsonSha256}),
    policySummary,
    schema:'XML229.PreviewRestraintReview.v1',
    status:warnings.length?'FOR_REVIEW':'CLEAR',
    engineeringRestraintAcceptance:warnings.length?'HOLD':'NOT_ASSESSED',
    quarantinedXmlNodeCount:new Set(warnings.map(w=>w.xmlIndex)).size,
    warnings:Object.freeze(warnings),
  });
  return {document,restraintReview,
    proof:Object.freeze({schema:enabled?'XML229.PrefinalRestraints.v2':'XML229.PrefinalRestraints.v1',
    originalJsonSha256:await digestUtf8(stagedJsonText),restraintAudit,
    ...(enabled?{physicalVertexMemberCensus:vertex.proofSummary}:{})}),
    stats:{...resolved?.stats,...fallback.stats,...(enabled?vertex.proofSummary:{})}};
}
