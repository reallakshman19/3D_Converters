/** Reconstruct source-role coverage without the binder or materializer. */
const deny=()=>{throw new Error('RESTRAINT_AUDIT_ATTACHMENT_DELEGATION_CONFLICT');};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const str=v=>String(v??'').trim();
const norm=v=>str(v).toUpperCase().replace(/^\//,'');
const types=new Set(['SUPPORT','ATTA','ANCI','REST','GUIDE','LINESTOP']);
function originalMembers(root){
 const found=new Map();
 function visit(item,path,branch,depth){
  if(depth>256)deny();
  if(Array.isArray(item)){item.forEach((v,i)=>visit(v,path+'['+i+']',branch,depth+1));return;}
  if(!item||typeof item!=='object')return;
  const attrs=item.attributes||{},type=str(item.type||attrs.TYPE).toUpperCase();
  if(type==='BRANCH')branch=str(item.name||attrs.OWNER||attrs.BRANCH||attrs.PIPE||branch);
  const code=str(attrs.MDSSUPPTYPE||attrs.CMPSUPTYPE).toUpperCase();
  const structural=['BRANCH','DTXR_POS','PIPE','ELBO','TEE','OLET','VALV','FLAN','GASK'].includes(type);
  if(types.has(type)||/^(GT|ST|AT)\d+/.test(type)||
    (!structural&&(types.has(code)||/^(GT|ST|AT)\d+/.test(code))))found.set(path,{attrs,branch});
  if(Array.isArray(item.children))visit(item.children,path+'.children',branch,depth+1);
 }
 visit(root,'$','',0);return found;
}
function eligible(attrs){
 const fields={};
 for(const [k,v] of Object.entries(attrs)){
  const key=k.toUpperCase();if(key in fields)return false;fields[key]=v;
 }
 if(str(fields.TYPE)!=='ATTA'||str(fields.RAW_TYPE)!=='ATTA'||str(fields.REF)!==str(fields.NAME)||
  !/^=\d+\/\d+$/.test(str(fields.REF))||!/(?:^|\/)ATTA-\d+(?:\.\d+)?$/i.test(str(fields.SPRE)))return false;
 const prohibited=['NODETYPE','NODEGAP','CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS',
  'STIFFNESS','NODESTIFFNESS','NODESTIFF','FRICTION','NODEFRICTION',
  'DIRECTIONCOSINEX','DIRECTIONCOSINEY','DIRECTIONCOSINEZ','NODEDIRX','NODEDIRY','NODEDIRZ',
  'MDSSUPPTYPE','CMPSUPTYPE','SUPPORT_KIND','SUPPORT_MAPPER_KIND','SUPPORT_TYPE','MDSSUPPFUNC','CMPSTRESSN'];
 const descriptions=['DTXR','DESC','DESCRIPTION','MDSDTXR','MDSDTXS','MDSDTXT','ISONOTE','RTEXT'];
 return !prohibited.some(k=>str(fields[k]))&&descriptions.every(k=>['','---'].includes(str(fields[k])));
}
function verifyDelegatedMember(d,audit,original,source){
 if(!source||!eligible(source.attrs)||d.source?.reason!=='xml-atta-default-delegation')deny();
 if(d.source.decision?.source!=='atta-default-policy'||
  d.source.decision?.rule?.id!=='delegate-generic-atta-to-existing-xml'||d.source.decision?.kind)deny();
 for(const k of ['NAME','REF','TYPE','RAW_TYPE','SPRE','DTXR','POS','POSI'])
  if(source.attrs[k]!=null&&(!Object.hasOwn(d.source.fields||{},k)||!same(source.attrs[k],d.source.fields[k])))deny();
 const row=original.find(r=>r.target.xmlIndex===d.target?.xmlIndex);
 if(!row||!same(row.target,d.target)||row.target.componentType!=='ATTA'||row.target.nodeName||
  row.target.componentRefNo!==str(source.attrs.REF)||norm(row.target.branch)!==norm(source.branch))deny();
 const records=audit.records.filter(r=>r.target.xmlIndex===row.target.xmlIndex&&r.after);
 if(!records.length||!same(records.map(r=>r.restraintOrdinal),d.restraintOrdinals)||
  d.authority!=='original-xml/atta-default-policy')deny();
 const expected=records.some(r=>r.source.kind==='config-default')?'EXISTING_ATTA_DEFAULT':'ORIGINAL_XML_PRESERVED';
 if(d.disposition!==expected)deny();
 for(const r of records){
  if(!['config-default','original-xml'].includes(r.source.kind)||!same(r.source.attachment,d.source)||
   !same(r.attachmentRole,{disposition:d.disposition,authority:d.authority}))deny();
  if(r.source.kind==='config-default'&&(r.decision?.source!=='atta-default'||
   r.decision?.rule?.id!=='atta-default-restraint'||
   r.fields.some(f=>f.evidence?.authority!=='atta-default/config')))deny();
 }
 for(const [k,v] of Object.entries(d.source.fields||{}))if(!same(source.attrs[k],v))deny();
}
export function checkRestraintAttachmentDelegation(audit,original,json,config){
 const policy=config.xml229SourceAttachmentPolicy,payload=audit.attachmentDelegation;
 const active=config.xml229PhysicalVertexPrefinal===true&&config.supportMapping?.useJsonForRestraints!==false&&policy;
 if(!active){if(payload||audit.records.some(r=>r.source?.attachment))deny();return;}
 if(!payload||payload.schema!=='XML229.SourceAttachmentDelegationAudit.v1'||!Array.isArray(payload.members)||
  Object.keys(policy).length!==2||policy.schema!=='XML229.SourceAttachmentPolicy.v1'||
  policy.unclassifiedAtta!=='existing-xml-default')deny();
 const source=originalMembers(json),projected=new Set(),delegated=new Set(),targets=new Set();
 for(const r of audit.records)for(const m of [r.source?.member,r.source?.corroboration])
  if(m?.reason==='physical-vertex-source-member')projected.add(m.path);
 for(const d of payload.members){
  const path=d.source?.path;
  if(delegated.has(path)||projected.has(path)||targets.has(d.target?.xmlIndex))deny();
  delegated.add(path);targets.add(d.target?.xmlIndex);
  verifyDelegatedMember(d,audit,original,source.get(path));
 }
 if(payload.sourceMembers!==source.size||payload.projectedRestraintMembers!==projected.size||
  payload.delegatedAttachmentMembers!==delegated.size||source.size!==projected.size+delegated.size)deny();
 for(const path of [...projected,...delegated])if(!source.has(path))deny();
 for(const r of audit.records)if(r.source?.attachment&&!delegated.has(r.source.attachment.path))deny();
}
