/** Explicit delegation of generic source attachments to existing XML defaults. */
import {supportKindFromMember} from '../xml-cii-mds-restraint-closure.js';
import {restraintAuditMember,inventoryRestraintAudit} from '../xml-cii-restraint-audit.js';
const str=v=>String(v??'').trim();
const norm=v=>str(v).toUpperCase().replace(/^\//,'');
const fail=code=>{throw Object.assign(new Error(code),{code});};
const stress=['NODETYPE','NODEGAP','CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS',
 'STIFFNESS','NODESTIFFNESS','NODESTIFF','FRICTION','NODEFRICTION',
 'DIRECTIONCOSINEX','DIRECTIONCOSINEY','DIRECTIONCOSINEZ','NODEDIRX','NODEDIRY','NODEDIRZ',
 'MDSSUPPTYPE','CMPSUPTYPE','SUPPORT_KIND','SUPPORT_MAPPER_KIND','SUPPORT_TYPE','MDSSUPPFUNC','CMPSTRESSN'];
const descriptions=['DTXR','DESC','DESCRIPTION','MDSDTXR','MDSDTXS','MDSDTXT','ISONOTE','RTEXT'];
export function readXml229SourceAttachmentPolicy(config={}){
 const p=config.xml229SourceAttachmentPolicy;
 if(p===undefined)return false;
 if(!p||Array.isArray(p)||Object.keys(p).length!==2||p.schema!=='XML229.SourceAttachmentPolicy.v1'||
  p.unclassifiedAtta!=='existing-xml-default')fail('XML229_ATTACHMENT_POLICY_INVALID');
 if(!config.xml229SourceCoordinatePolicy)fail('XML229_ATTACHMENT_POLICY_COORDINATES_REQUIRED');
 return true;
}
function genericOccurrence(index,member){
 const raw=member.raw?.attributes||{},attrs={};
 for(const [k,v] of Object.entries(raw)){
  const key=k.toUpperCase();if(Object.hasOwn(attrs,key))return null;attrs[key]=v;
 }
 if(str(attrs.TYPE)!=='ATTA'||str(attrs.RAW_TYPE)!=='ATTA'||!/^=\d+\/\d+$/.test(str(attrs.NAME))||
  str(attrs.REF)!==str(attrs.NAME)||!/(?:^|\/)ATTA-\d+(?:\.\d+)?$/i.test(str(attrs.SPRE)))return null;
 if(stress.some(k=>str(attrs[k]))||descriptions.some(k=>!['','---'].includes(str(attrs[k]))))return null;
 const rows=index.sourceOccurrences.filter(r=>r.sourceComponentType==='ATTA'&&!str(r.sourceNodeName)&&
  r.sourceComponentRefNo===str(attrs.REF)&&norm(r.sourceBranchName)===norm(member.branch));
 if(rows.length!==1)return null;
 const r=rows[0];
 if(index.vertexForOriginal(r.branchOccurrenceIndex,r.sourceNodeOrdinal)!==member.physicalVertexId)return null;
 return {branchOccurrenceIndex:r.branchOccurrenceIndex,sourceNodeOrdinal:r.sourceNodeOrdinal};
}
export function partitionXml229SourceAttachments({index,members,config}){
 const enabled=readXml229SourceAttachmentPolicy(config),restraintMembers=[],delegations=[],seen=new Set();
 for(const member of members){
  const target=enabled&&!supportKindFromMember(member,config)?genericOccurrence(index,member):null;
  if(!target){restraintMembers.push(member);continue;}
  const key=JSON.stringify(target);
  if(seen.has(key))fail('XML229_ATTACHMENT_IDENTITY_REUSED');
  seen.add(key);delegations.push({member,target});
 }
 const vertices=new Set(restraintMembers.map(m=>m.physicalVertexId));
 if(delegations.some(d=>vertices.has(d.member.physicalVertexId)))
  fail('XML229_ATTACHMENT_ROLE_OVERLAP_REVIEW_REQUIRED');
 return {enabled,restraintMembers,delegations};
}
export function recordXml229AttachmentDelegation(audit,vertex,document){
 if(!vertex?.attachmentDelegations)return audit;
 const inventory=inventoryRestraintAudit(document),links=new Map();
 const members=vertex.attachmentDelegations.map(({member,target})=>{
  const row=inventory.find(r=>r.target.branchOccurrenceIndex===target.branchOccurrenceIndex&&
   r.target.sourceNodeOrdinal===target.sourceNodeOrdinal);
  const records=audit.records.filter(r=>r.target.xmlIndex===row.target.xmlIndex&&r.after);
  if(!records.length)fail('XML229_ATTACHMENT_DEFAULT_UNRESOLVED');
  if(records.some(r=>!['config-default','original-xml'].includes(r.source.kind)))
   fail('XML229_ATTACHMENT_ROLE_OVERLAP_REVIEW_REQUIRED');
  const source=restraintAuditMember({...member,path:member.sourceOccurrenceId
   .replace(/\/(children)/g,'.$1').replace(/\/(\d+)/g,'[$1]')},
   {source:'atta-default-policy',rule:{id:'delegate-generic-atta-to-existing-xml'}},'xml-atta-default-delegation');
  const disposition=records.some(r=>r.source.kind==='config-default')?'EXISTING_ATTA_DEFAULT':'ORIGINAL_XML_PRESERVED';
  const link={source,target:row.target,disposition,authority:'original-xml/atta-default-policy',
   restraintOrdinals:records.map(r=>r.restraintOrdinal)};
  links.set(row.target.xmlIndex,link);return link;
 });
 return {...audit,attachmentDelegation:{schema:'XML229.SourceAttachmentDelegationAudit.v1',
  sourceMembers:vertex.sourceMemberSplit.sourceMembers,
  projectedRestraintMembers:vertex.sourceMemberSplit.projectedRestraintMembers,
  delegatedAttachmentMembers:members.length,members},records:audit.records.map(r=>{
   const link=links.get(r.target.xmlIndex);
   return !link||!r.after?r:{...r,source:{...r.source,attachment:link.source},
    attachmentRole:{disposition:link.disposition,authority:link.authority}};
  })};
}
