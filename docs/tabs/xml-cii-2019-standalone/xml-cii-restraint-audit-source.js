/** Original-source and run-basis checks, separate from classification and writing. */
import {digestCanonical,digestUtf8} from '../../contracts/gc-pw-v1/contract.mjs';
import {RESTRAINT_AUDIT_SCHEMA,inventoryRestraintAudit,restraintAuditConfig} from './xml-cii-restraint-audit.js';
import {checkRestraintCoordinateEvidence} from './xml-cii-restraint-audit-coordinate.js';
import {checkRestraintAttachmentDelegation} from './xml-cii-restraint-audit-attachments.js';

const deny=code=>{throw new Error(code);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const local=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const children=(p,k)=>[...(p?.childNodes||[])].filter(n=>n.nodeType===1&&local(n)===k);
const field=(p,k)=>String(children(p,k)[0]?.textContent??'').trim();

export function parseAuditXml(text) {
  if(typeof DOMParser!=='function')deny('RESTRAINT_AUDIT_DOM_REQUIRED');
  const doc=new DOMParser().parseFromString(String(text),'application/xml');
  if(doc.getElementsByTagName('parsererror').length)deny('RESTRAINT_AUDIT_XML_INVALID');
  return doc;
}

function sourceObject(root,path) {
  if(typeof path!=='string'||!path.startsWith('$'))deny('RESTRAINT_AUDIT_SOURCE_PATH_MISSING');
  let item=root,offset=1;
  const pattern=/\.([A-Za-z_][A-Za-z0-9_]*)|\[(\d+)\]/g;
  for(const match of path.slice(1).matchAll(pattern)) {
    if(match.index!==offset-1)deny('RESTRAINT_AUDIT_SOURCE_PATH_INVALID');
    const key=match[1]??match[2];
    if(!item||!Object.hasOwn(item,key))deny('RESTRAINT_AUDIT_SOURCE_PATH_MISSING');
    item=item[key];offset+=match[0].length;
  }
  if(offset!==path.length)deny('RESTRAINT_AUDIT_SOURCE_PATH_INVALID');
  return item;
}

function checkMember(member,json) {
  if(!member)return;
  const item=sourceObject(json,member.path),attrs=item?.attributes||item;
  for(const [key,raw] of Object.entries(member.fields||{}))
    if(!Object.hasOwn(attrs||{},key)||!same(attrs[key],raw))deny('RESTRAINT_AUDIT_SOURCE_VALUE_DRIFT');
}

function checkExplicitValues(record){
  if(!record.after||record.disposition==='PRESERVED')return;
  for(const f of record.fields||[])if(['Stiffness','Friction'].includes(f.name)&&
    f.evidence?.authority==='original-json'){
    const raw=Number(f.evidence.raw),after=Number(record.after[f.name]);
    if(!Number.isFinite(raw)||!Number.isFinite(after)||raw!==after)
      deny('RESTRAINT_AUDIT_SOURCE_FIELD_CONFLICT');
  }
  if(record.source?.member?.reason!=='physical-vertex-source-member')return;
  const values=record.source?.member?.fields||{};
  const axes=['X','Y','Z'].map(axis=>values['DirectionCosine'+axis]??values['DIRECTIONCOSINE'+axis]);
  if(axes.every(v=>v!==undefined)){
    const vector=axes.map(Number),norm=Math.hypot(...vector);
    if(!norm||!vector.every(Number.isFinite))deny('RESTRAINT_AUDIT_SOURCE_DIRECTION_CONFLICT');
    for(const [i,axis] of ['X','Y','Z'].entries())if(!Number.isFinite(Number(record.after['DirectionCosine'+axis]))||
      Math.abs(Number(record.after['DirectionCosine'+axis])-vector[i]/norm)>0.500001e-9)
      deny('RESTRAINT_AUDIT_SOURCE_DIRECTION_CONFLICT');
  }
}

function checkOriginalRecords(audit,original,json) {
  const byIndex=new Map(original.map(row=>[row.target.xmlIndex,row])),ids=new Set(),covered=new Set(),kinds=new Set();
  for(const record of audit.records) {
    if(ids.has(record.id))deny('RESTRAINT_AUDIT_DUPLICATE_ID');
    ids.add(record.id);
    const row=byIndex.get(record.target?.xmlIndex);
    if(!row||!same(row.target,record.target))deny('RESTRAINT_AUDIT_SOURCE_OCCURRENCE_DRIFT');
    if(record.before&&!row.restraints.some(r=>same(r,record.before)))deny('RESTRAINT_AUDIT_ORIGINAL_VALUE_DRIFT');
    if(record.before) {
      if(!Number.isSafeInteger(record.beforeOrdinal)||!same(row.restraints[record.beforeOrdinal],record.before))
        deny('RESTRAINT_AUDIT_ORIGINAL_ORDINAL_DRIFT');
      covered.add(record.target.xmlIndex+'|'+record.beforeOrdinal);
    }
    for(const source of [record.source?.member,record.source?.corroboration])
      if(source?.decision?.kind)kinds.add(record.target.xmlIndex+'|'+source.decision.kind);
    if(record.disposition==='PRESERVED'&&!same(record.before,record.after))deny('RESTRAINT_AUDIT_PRESERVATION_DRIFT');
    if(record.source?.kind==='staged-json'&&!record.source.member)deny('RESTRAINT_AUDIT_MEMBER_UNRESOLVED');
    checkMember(record.source?.member,json);checkMember(record.source?.corroboration,json);
    checkMember(record.source?.attachment,json);
    checkExplicitValues(record);
    const gap=record.fields?.find(f=>f.name==='Gap');
    if(record.disposition!=='PRESERVED'&&gap?.evidence?.authority==='original-json') {
      const raw=String(gap.evidence.raw).match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?/);
      if(!raw||Number(raw[0])!==Number(record.after.Gap))deny('RESTRAINT_AUDIT_SOURCE_GAP_CONFLICT');
    }
  }
  for(const row of original)
    for(const [ordinal] of row.restraints.entries())
      if(!covered.has(row.target.xmlIndex+'|'+ordinal))
        deny('RESTRAINT_AUDIT_ORIGINAL_COVERAGE_MISSING');
  for(const evaluation of audit.evaluations||[])
    if(['REST','GUIDE','LINESTOP'].includes(evaluation.kind)&&
      !kinds.has(evaluation.xmlIndex+'|'+evaluation.kind))
      deny('RESTRAINT_AUDIT_DECISION_COVERAGE_MISSING');
}

export async function validateRestraintAuditSource(audit,{xmlText,stagedJsonText='',config={}}) {
  if(audit?.schema!==RESTRAINT_AUDIT_SCHEMA||!Array.isArray(audit.records)||!audit.basis)
    deny('RESTRAINT_AUDIT_NOT_RECORDED');
  const {auditSha256,...body}=audit;
  const [xmlSha,jsonSha,configSha,recordsSha,auditSha,recordedConfigSha]=await Promise.all([
    digestUtf8(xmlText),digestUtf8(stagedJsonText),digestCanonical(restraintAuditConfig(config)),
    digestCanonical(audit.records),digestCanonical(body),
    digestCanonical(audit.recordedConfig||{}),
  ]);
  if(xmlSha!==audit.basis.xmlSha256||jsonSha!==audit.basis.jsonSha256||configSha!==audit.basis.configSha256)
    deny('RESTRAINT_AUDIT_BASIS_STALE');
  if(recordsSha!==audit.recordsSha256||auditSha!==auditSha256||recordedConfigSha!==configSha)
    deny('RESTRAINT_AUDIT_EVIDENCE_DRIFT');
  let json=[];
  try {json=stagedJsonText.trim()?JSON.parse(stagedJsonText):[];}catch{deny('RESTRAINT_AUDIT_JSON_INVALID');}
  checkOriginalRecords(audit,inventoryRestraintAudit(parseAuditXml(xmlText)),json);
  checkRestraintAttachmentDelegation(audit,inventoryRestraintAudit(parseAuditXml(xmlText)),json,config);
  checkRestraintCoordinateEvidence(audit,parseAuditXml(xmlText),json,config);
  return true;
}

const point=value=>{
  const p=String(value).trim().split(/\s+/).map(Number);
  return p.length===3&&p.every(Number.isFinite)?p:null;
};
function coincident(a,b) {
  const x=point(a),y=point(b);
  return x&&y&&Math.hypot(...x.map((v,i)=>v-y[i]))<=0.5;
}

function connectedTarget(record,context,cache,referenced){
  const candidates=[];
  for(const occurrence of record.physicalPlacement.sourceOccurrences){
    const branch=cache.branches[occurrence.branchOccurrenceIndex];
    if(!branch)continue;
    const ordinals=context.finalizedGeometry?.retainedSourceOrdinalsByBranch?.[occurrence.branchOccurrenceIndex];
    if(!Array.isArray(ordinals))continue;
    const index=ordinals.indexOf(occurrence.sourceNodeOrdinal);
    const node=index<0?null:children(branch,'Node')[index];
    if(node&&referenced(field(node,'NodeNumber')))candidates.push(field(node,'NodeNumber'));
  }
  const numbers=[...new Set(candidates)];
  return numbers.length===1?{status:'BOUND',node:numbers[0],method:'connected-original-physical-vertex'}
    :{status:numbers.length?'OWNER_AMBIGUOUS':'OWNER_MISSING',candidates:numbers};
}

export function restraintAuditTarget(record,{nativeXmlText,finalizedGeometry,parsed},cache) {
  if(!cache.branches)cache.branches=[...parseAuditXml(nativeXmlText).getElementsByTagName('Branch')];
  const target=record.target,branch=cache.branches[target.branchOccurrenceIndex];
  if(!branch||field(branch,'Branchname')!==target.branch)return {status:'BRANCH_UNRESOLVED'};
  const nodes=children(branch,'Node');
  const ordinals=finalizedGeometry?.retainedSourceOrdinalsByBranch?.[target.branchOccurrenceIndex];
  let selected;
  if(Array.isArray(ordinals)) {
    const index=ordinals.indexOf(target.sourceNodeOrdinal);
    if(index>=0)selected=nodes[index];
  } else {
    const direct=nodes.filter(n=>field(n,'NodeNumber')===target.nodeNumber);
    if(direct.length===1)selected=direct[0];
  }
  const referenced=number=>parsed.elements.some(e=>e.branch===target.branch&&
    [e.from,e.to].includes(number)&&(!record.after||
      parsed.restraints.some(r=>r.node===number&&r.blockIndex===e.restraintPointer)));
  if(selected&&referenced(field(selected,'NodeNumber')))
    return {status:'BOUND',node:field(selected,'NodeNumber'),method:Array.isArray(ordinals)?'retained-source-ordinal':'original-node'};
  if(record.physicalPlacement)return connectedTarget(record,{finalizedGeometry},cache,referenced);
  // Follow only already retained native XML occurrences in the exact original
  // branch. Never guess a new edge/owner or select a candidate by its value.
  const aliases=nodes.filter(n=>coincident(target.position,field(n,'Position'))&&referenced(field(n,'NodeNumber')));
  const numbers=[...new Set(aliases.map(n=>field(n,'NodeNumber')))];
  return numbers.length===1?{status:'BOUND',node:numbers[0],method:'coincident-retained-source',sourceNode:target.nodeNumber}
    :{status:numbers.length?'OWNER_AMBIGUOUS':'OWNER_MISSING',candidates:numbers};
}
