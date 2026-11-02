/**
 * XML229 #391: original JSON Trace members -> physical vertex (read-only).
 * No XML row scoring, nearest-node guess, Final or CII release authority.
 */
import {canonicalStandaloneDtxrBranch} from '../xml-cii-trace-resolution-ledger.js';
import {canonicalXml229Decimal,exactXml229Position,indexXml229OriginalPhysicalVertices}
  from './xml229-original-physical-vertices.mjs';
import {projectXml229NodalRestraintSlots} from './xml229-nodal-restraint-slots.mjs';

export const XML229_JSON_VERTEX_BINDING_SCHEMA='XML229.JsonPhysicalVertexBinding.v1';
const POSITION_KEYS=['SUPPORTCOORD','SUPPORT_COORD','POS','POSI','BPOS','APOS',
 'LPOS','CPOS','HPOS','TPOS','SPOS','EPOS','DTXR_POS'];
const SUPPORT_TYPES=new Set(['SUPPORT','ATTA','ANCI','REST','GUIDE','LINESTOP']);
const SOURCE_CODE=/^(?:GT|ST|AT)\d+/;
const str=v=>String(v??'').trim();
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const normalized=v=>str(v).toUpperCase().replace(/[^A-Z0-9_]/g,'');
function fail(code){const e=new Error(code);e.code=code;throw e;}
function attribute(attrs,names){
  for(const name of names){
    const k=Object.keys(attrs).find(x=>normalized(x)===normalized(name));
    if(k!==undefined&&str(attrs[k]))return attrs[k];
  }
  return null;
}
function rawPosition(raw){
  if(Array.isArray(raw)&&raw.length===3)
    return exactXml229Position(raw.map(str).join(' '));
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    const v=obj(raw),xyz=[
      attribute(v,['x','E','east']),attribute(v,['y','N','north']),
      attribute(v,['z','Z','U','EL','elev','elevation'])];
    return xyz.some(x=>x===null)?null:exactXml229Position(xyz.map(str).join(' '));
  }
  const s=str(raw);
  if(!s)return null;
  const direct=exactXml229Position(s.replace(/[,;]+/g,' '));
  if(direct!==null)return direct;
  const matches=[...s.matchAll(/\b(EL|E|W|N|S|U|D)\s*[:=]?\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/gi)];
  if(matches.length!==3)return null;
  const xyz=[];
  for(const m of matches){
    const axis=m[1].toUpperCase();
    const slot=['E','W'].includes(axis)?0:['N','S'].includes(axis)?1:2;
    if(xyz[slot]!==undefined)return null;
    if(['W','S','D'].includes(axis)&&str(m[2]).startsWith('-'))return null;
    xyz[slot]=canonicalXml229Decimal(
      ['W','S','D'].includes(axis)?'-'+m[2]:m[2]);
  }
  return xyz.every(v=>v!==null&&v!==undefined)
    ?JSON.stringify(xyz):null;
}
function addDecimal(a,b){
  const x=canonicalXml229Decimal(a),y=canonicalXml229Decimal(b);
  if(x===null||y===null)fail('XML229_BIND_DATUM_INVALID');
  const asParts=s=>{const m=s.match(/^(-?\d+)e(-?\d+)$/);return [BigInt(m[1]),Number(m[2])];};
  const [mx,ex]=asParts(x),[my,ey]=asParts(y),e=Math.min(ex,ey);
  if(Math.max(ex-e,ey-e)>128)fail('XML229_BIND_DATUM_RANGE');
  const sum=mx*10n**BigInt(ex-e)+my*10n**BigInt(ey-e);
  return canonicalXml229Decimal(sum.toString()+'e'+e);
}
function directPoint(value,attrs,config){
  for(const k of POSITION_KEYS){
    const v=attribute(attrs,[k]);
    if(v===null)continue;
    let key=rawPosition(v);
    const datum=obj(config?.dtxrPositionOffset);
    if(key!==null&&k==='POSI'&&datum.enabled===true){
      const p=JSON.parse(key);
      key=JSON.stringify(p.map((n,i)=>addDecimal(n,
        str(datum[['xOffset','yOffset','zOffset'][i]])||'0')));
    }
    return {declared:true,key};
  }
  if(value.position!==undefined||value.point!==undefined)
    return {declared:true,key:rawPosition(value.position??value.point)};
  return {declared:false,key:null};
}
function isSupport(type,attrs){
  const t=str(type).toUpperCase();
  if(SUPPORT_TYPES.has(t)||SOURCE_CODE.test(t))return true;
  if(['BRANCH','DTXR_POS','PIPE','ELBO','TEE','OLET','VALV','FLAN','GASK'].includes(t))
    return false;
  const code=str(attribute(attrs,['MDSSUPPTYPE','CMPSUPTYPE'])).toUpperCase();
  return !!code&&(SUPPORT_TYPES.has(code)||SOURCE_CODE.test(code));
}
function sourceMembers(staged,config){
  const all=[];
  function visit(value,parent,path,depth){
    if(depth>256)fail('XML229_BIND_HIERARCHY_DEPTH');
    if(Array.isArray(value)){
      value.forEach((v,i)=>visit(v,parent,path+'/'+i,depth+1));return;
    }
    if(!value||typeof value!=='object')return;
    const attrs=obj(value.attributes),type=str(value.type||attrs.TYPE).toUpperCase();
    const branch=type==='BRANCH'
      ?str(value.name||attribute(attrs,['OWNER','BRANCH','PIPE'])||parent.branch)
      :parent.branch;
    const found=directPoint(value,attrs,config);
    const point=found.declared?found.key:parent.point;
    if(isSupport(type,attrs))all.push({
      sourceOccurrenceId:path,sourceType:type,branch,coordinateKey:point,
      raw:value,description:str(attribute(attrs,['DTXR','DESC','DESCRIPTION','SPRE'])||value.name),
    });
    if(Array.isArray(value.children)){
      value.children.forEach((v,i)=>visit(v,{branch,point},
        path+'/children/'+i,depth+1));
    }
  }
  visit(staged,{branch:'',point:null},'$',0);
  return all;
}
function compatibleBranch(xml,source){
  if(!str(source))return true;
  const a=canonicalStandaloneDtxrBranch(xml),
    b=canonicalStandaloneDtxrBranch(source);
  if(b.suffix)return a.full===b.full;
  return a.root===b.root;
}

export function bindXml229JsonToPhysicalVertices({
  originalXmlText,stagedJsonText='',config={},sourceXmlSha256='',
  branchConnectionAliases=[],
}={}){
  const index=indexXml229OriginalPhysicalVertices({
    xmlText:originalXmlText,sourceXmlSha256,branchConnectionAliases,
  });
  const absent=stagedJsonText===''||stagedJsonText===null||stagedJsonText===undefined;
  let source=[];
  if(!absent){
    let parsed;
    try{parsed=typeof stagedJsonText==='string'?JSON.parse(stagedJsonText):stagedJsonText;}
    catch{fail('XML229_BIND_JSON_INVALID');}
    source=sourceMembers(parsed,config);
  }
  const stations=new Map();
  index.sourceOccurrences.forEach((row,i)=>{
    if(row.coordinateKey===null)return;
    if(!stations.has(row.coordinateKey))stations.set(row.coordinateKey,[]);
    stations.get(row.coordinateKey).push({
      vertex:index.vertexOfOccurrence[i],branch:row.sourceBranchName,
    });
  });
  const bindings=[],bound=[],counts={},physical=new Set();
  for(const member of source){
    let status='',vertex=null;
    if(member.coordinateKey===null)status='SOURCE_POSITION_MISSING';
    else{
      const at=stations.get(member.coordinateKey)||[];
      const inBranch=at.filter(r=>compatibleBranch(r.branch,member.branch));
      const vertices=[...new Set(inBranch.map(r=>r.vertex))];
      if(!at.length)status='NO_XML_VERTEX_AT_COORDINATE';
      else if(!inBranch.length)status='BRANCH_SCOPE_NO_VERTEX';
      else if(vertices.length!==1)status='MULTIPLE_PHYSICAL_VERTICES';
      else{
        status='PHYSICAL_VERTEX_BOUND';vertex=vertices[0];
        physical.add(vertex);bound.push({...member,physicalVertexId:vertex});
      }
    }
    counts[status]=(counts[status]||0)+1;
    bindings.push(Object.freeze({
      sourceOccurrenceId:member.sourceOccurrenceId,
      physicalVertexId:vertex,status,
    }));
  }
  const nodalSlots=absent?null:projectXml229NodalRestraintSlots({members:bound,config});
  return Object.freeze({
    schema:XML229_JSON_VERTEX_BINDING_SCHEMA,
    mode:absent?'XML_ONLY_NO_JSON':'JSON_GOVERNED_SHADOW',
    vertexIndex:index,nodalSlots,
    sourceMembers:Object.freeze(bound),bindingRows:Object.freeze(bindings),
    summary:Object.freeze({
      sourceSupportMembers:source.length,boundSourceSupportMembers:bound.length,
      unboundSourceSupportMembers:source.length-bound.length,
      distinctPhysicalVertexTargets:physical.size,
      reasonCounts:Object.freeze(counts),nativeReleaseAuthorized:false,
    }),
  });
}
