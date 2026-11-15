/** Explicit source-query policy. Never changes XML coordinates or topology. */
import {canonicalXml229Decimal} from './xml229-original-physical-vertices.mjs';
const schema='XML229.SourceCoordinatePolicy.v1';
const str=v=>String(v??'').trim();
const identity=v=>str(v).toUpperCase().replace(/^\//,'');
const fail=code=>{throw Object.assign(new Error(code),{code});};
function parts(value){
 const canonical=canonicalXml229Decimal(value);
 if(canonical===null)fail('XML229_COORDINATE_POLICY_INVALID');
 if(canonical==='0')return [0n,0];
 const m=canonical.match(/^(-?\d+)e(-?\d+)$/);
 if(m[1].length>128||Math.abs(Number(m[2]))>128)fail('XML229_COORDINATE_POLICY_INVALID');
 return [BigInt(m[1]),Number(m[2])];
}
function combine(a,b,sign=1n){
 const [x,ex]=parts(a),[y,ey]=parts(b),e=Math.min(ex,ey);
 if(Math.max(ex-e,ey-e)>128)fail('XML229_COORDINATE_POLICY_INVALID');
 return canonicalXml229Decimal((x*10n**BigInt(ex-e)+sign*y*10n**BigInt(ey-e))+'e'+e);
}
const difference=(a,b)=>combine(a,b,-1n);
function withinHalfQuantum(delta){
 const [d,e]=parts(delta),n=d<0n?-d:d;
 // Exact comparison against 0.005 mm; no Number rounding or epsilon.
 return e>=-3?n*10n**BigInt(e+3)<=5n:n<=5n*10n**BigInt(-3-e);
}
function onXmlQuantum(value){
 const [n,e]=parts(value);
 return e>=-2||n%10n**BigInt(-2-e)===0n;
}
export function readXml229SourceCoordinatePolicy(config={}){
 const p=config.xml229SourceCoordinatePolicy;
 if(p===undefined)return null;
 if(!p||Array.isArray(p)||p.schema!==schema||!['POS','POSI'].includes(p.positionField)||
  p.identityMode!=='exact-branch-member'||canonicalXml229Decimal(p.xmlQuantumMm)!=='1e-2'||
  !Array.isArray(p.translationMm)||p.translationMm.length!==3)
  fail('XML229_COORDINATE_POLICY_INVALID');
 const allowed=['schema','positionField','translationMm','xmlQuantumMm','identityMode'];
 if(Object.keys(p).some(k=>!allowed.includes(k)))fail('XML229_COORDINATE_POLICY_INVALID');
 p.translationMm.forEach(parts);
 if(config.dtxrPositionOffset?.enabled===true)fail('XML229_COORDINATE_POLICY_DATUM_CONFLICT');
 return Object.freeze({...p,translationMm:p.translationMm.map(v=>canonicalXml229Decimal(v))});
}
function sourceIdentity(member){
 const attrs=member.raw?.attributes||{};
 const key=Object.keys(attrs).find(k=>k.toUpperCase()==='NAME');
 const name=str(key===undefined?'':attrs[key])||(/^=\d+\/\d+$/.test(str(member.raw?.name))?str(member.raw.name):'');
 return {value:identity(name),reference:/^=\d+\/\d+$/.test(name)};
}
export function resolveXml229PolicyVertex(index,member,policy){
 if(member.coordinateKey===null)return {status:'SOURCE_POSITION_MISSING',vertex:null};
 const id=sourceIdentity(member),branch=identity(member.branch);
 const matches=index.sourceOccurrences.map((r,i)=>({r,i})).filter(({r})=>
  branch&&identity(r.sourceBranchName)===branch&&id.value&&
  identity(id.reference?r.sourceComponentRefNo:r.sourceNodeName)===id.value);
 if(matches.length!==1)return {status:matches.length?'SOURCE_IDENTITY_AMBIGUOUS':'SOURCE_IDENTITY_MISSING',vertex:null};
 const {r,i}=matches[0],source=JSON.parse(member.coordinateKey);
 const shifted=source.map((n,j)=>combine(n,policy.translationMm[j]));
 const target=r.coordinateKey===null?null:JSON.parse(r.coordinateKey);
 const residual=target?.map((v,j)=>difference(v,shifted[j]));
 if(!target||!target.every(onXmlQuantum)||!residual.every(withinHalfQuantum))
  return {status:'SOURCE_IDENTITY_COORDINATE_MISMATCH',vertex:null};
 return {status:'PHYSICAL_VERTEX_BOUND',vertex:index.vertexOfOccurrence[i],
  coordinateEvidence:{policySchema:schema,positionField:member.positionField,
   sourceCoordinateKey:member.coordinateKey,translationMm:policy.translationMm,
   xmlQuantumMm:'0.01',residualMm:residual,
   identityBasis:id.reference?'branch-and-unnamed-object-reference':'branch-and-full-support-name',
   matchedOriginalOccurrence:{branchOccurrenceIndex:r.branchOccurrenceIndex,sourceNodeOrdinal:r.sourceNodeOrdinal}}};
}
