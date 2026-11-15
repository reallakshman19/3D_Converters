/** Original-source check of coordinate evidence; no binder/writer imports. */
const deny=()=>{throw new Error('RESTRAINT_AUDIT_COORDINATE_EVIDENCE_CONFLICT');};
const name=v=>String(v??'').trim().toUpperCase().replace(/^\//,'');
const local=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const kids=(n,k)=>[...(n?.childNodes||[])].filter(c=>c.nodeType===1&&local(c)===k);
const field=(n,k)=>String(kids(n,k)[0]?.textContent??'').trim();
function decimal(v){
 const m=String(v).trim().match(/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
 if(!m||!(m[2]||m[3]))deny();
 let digits=(m[2]+(m[3]||'')).replace(/^0+/,'');
 const exponent=Number(m[4]||0)-(m[3]||'').length;
 if(digits.length>128||!Number.isSafeInteger(exponent)||Math.abs(exponent)>128)deny();
 if(!digits)return ['0',0];
 let e=exponent;
 while(digits.endsWith('0')){digits=digits.slice(0,-1);e++;}
 return [(m[1]==='-'?'-':'')+digits,e];
}
const key=v=>{const [n,e]=decimal(v);return n==='0'?'0':n+'e'+e;};
function triple(raw){
 if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
  const value=aliases=>{for(const a of aliases){const k=Object.keys(raw).find(k=>k.toUpperCase()===a);if(k!==undefined)return raw[k];}return undefined;};
  raw=[value(['X','E','EAST']),value(['Y','N','NORTH']),value(['Z','U','EL','ELEV','ELEVATION'])];
 }
 if(typeof raw==='string'){
  const directional=[...raw.matchAll(/\b(EL|E|W|N|S|U|D)\s*[:=]?\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/gi)];
  if(directional.length===3){
   const result={};for(const m of directional){
    const a=m[1].toUpperCase(),axis=['E','W'].includes(a)?'E':['N','S'].includes(a)?'N':'Z';
    if(axis in result)deny();
    const negative=['W','S','D'].includes(a);if(negative&&m[2].startsWith('-'))deny();
    result[axis]=negative?'-'+m[2]:m[2];
   }
   raw=[result.E,result.N,result.Z];
  }else raw=raw.trim().split(/[\s,;]+/);
 }
 if(!Array.isArray(raw)||raw.length!==3)deny();
 return raw.map(key);
}
function originalQuery(root,path,positionField){
 let item=root,branch='',point=null;
 const inspect=()=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return;
  if(String(item.type).toUpperCase()==='BRANCH')branch=item.name||'';
  const attrs=item.attributes||{},k=Object.keys(attrs).find(k=>k.toUpperCase()===positionField);
  if(k!==undefined)point=triple(attrs[k]);
 };
 inspect();
 for(const m of path.slice(1).matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)|\[(\d+)\]/g)){
  item=item?.[m[1]??m[2]];inspect();
 }
 const sourceName=item?.attributes?.NAME||(/^=\d+\/\d+$/.test(item?.name||'')?item.name:'');
 if(!point||!branch||!sourceName)deny();
 return {branch,point,sourceName};
}
function residual(target,source,offset){
 const p=[target,source,offset].map(decimal),e=Math.min(...p.map(x=>x[1]));
 if(p.some(x=>x[1]-e>128))deny();
 const [a,b,c]=p.map(([n,x])=>BigInt(n)*10n**BigInt(x-e));
 const delta=a-b-c,abs=delta<0n?-delta:delta;
 if(e>=-3?abs*10n**BigInt(e+3)>5n:abs>5n*10n**BigInt(-3-e))deny();
 return key(delta+'e'+e);
}
export function checkRestraintCoordinateEvidence(audit,document,json,config){
 const policy=config.xml229SourceCoordinatePolicy;
 if(!policy)return;
 const branches=[...document.getElementsByTagName('Branch')];
 for(const record of audit.records)for(const member of [record.source?.member,record.source?.corroboration,record.source?.attachment]){
  if(!['physical-vertex-source-member','xml-atta-default-delegation'].includes(member?.reason))continue;
  const w=member.coordinateEvidence,query=originalQuery(json,member.path,policy.positionField);
  if(!w||w.policySchema!==policy.schema||w.positionField!==policy.positionField||w.xmlQuantumMm!=='0.01'||
   JSON.stringify(w.translationMm)!==JSON.stringify(policy.translationMm.map(key))||
   w.sourceCoordinateKey!==JSON.stringify(query.point))deny();
  if(w.identityBasis!==(String(query.sourceName).startsWith('=')?'branch-and-unnamed-object-reference':'branch-and-full-support-name'))deny();
  const matches=[];
  for(const [bi,b] of branches.entries())if(name(field(b,'Branchname'))===name(query.branch))
   for(const [ni,n] of kids(b,'Node').entries())if(name(field(n,String(query.sourceName).startsWith('=')?'ComponentRefNo':'NodeName'))===name(query.sourceName))matches.push({bi,ni,n});
  if(matches.length!==1)deny();
  const {bi,ni,n}=matches[0],occ=w.matchedOriginalOccurrence;
  if(occ?.branchOccurrenceIndex!==bi||occ?.sourceNodeOrdinal!==ni||record.target.branchOccurrenceIndex!==bi)deny();
  const target=triple(field(n,'Position')),nodes=kids(branches[bi],'Node');
  for(let i=Math.min(ni,record.target.sourceNodeOrdinal);i<=Math.max(ni,record.target.sourceNodeOrdinal);i++)
   if(JSON.stringify(triple(field(nodes[i],'Position')))!==JSON.stringify(target))deny();
  const expected=target.map((v,i)=>residual(v,query.point[i],policy.translationMm[i]));
  if(JSON.stringify(w.residualMm)!==JSON.stringify(expected))deny();
 }
}
