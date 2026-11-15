/** Inspect actual CII pointers/slots; never use a whole-file value search. */
import {digestUtf8,digestCanonical} from '../../contracts/gc-pw-v1/contract.mjs';
import {restraintTypeToCaesarCode} from '../../converters/xml-cii2019-core/restraint-type-codes.js';
import {parseCiiEngineeringFields} from './ui-adapted/xml-cii-adapted-propagation-proof.mjs';
import {validateRestraintAuditSource,restraintAuditTarget} from './xml-cii-restraint-audit-source.js';

const finite=v=>v!==''&&v!=null&&Number.isFinite(Number(v));
function tolerance(expected,field) {
  if(field==='stiffness') {
    const magnitude=Math.abs(expected);
    if(magnitude<1e-12)return 1e-12;
    const precision=magnitude>=1e9||magnitude<0.1?6:5;
    return 0.5*10**(Math.floor(Math.log10(magnitude))-precision)+Number.EPSILON*magnitude;
  }
  return field==='directionZ'?0.500001e-5:0.500001e-6;
}
const matches=(expected,actual,field)=>Number.isFinite(actual)&&Math.abs(expected-actual)<=tolerance(expected,field);

function expectedValues(row) {
  const r=row.after,code=restraintTypeToCaesarCode(r.Type);
  if(code===null)throw new Error('RESTRAINT_AUDIT_TYPE_UNSUPPORTED');
  const stiffness=finite(r.Stiffness)?Number(r.Stiffness):0;
  const gap=finite(r.Gap)?Number(r.Gap):0;
  const rawFriction=finite(r.Friction)?Number(r.Friction):0;
  const friction=Math.abs(rawFriction-(-1.0101))<1e-6?0:rawFriction;
  const direction=['X','Y','Z'].map(k=>r['DirectionCosine'+k]);
  const explicit=direction.every(finite)&&Math.hypot(...direction.map(Number))>1e-9;
  let vector;
  if(explicit) {
    const size=Math.hypot(...direction.map(Number));vector=direction.map(v=>Number(v)/size);
  } else vector=({13:[1,0,0],14:[0,1,0],15:[0,0,1],16:[-1,0,0],17:[0,-1,0],18:[0,0,-1]})[code]||[0,0,1];
  return {typeCode:code,stiffness,gap,friction,direction:vector,
    normalization:{numericFormat:'native .6E scientific / #.6G ordinary stiffness; fixed 6 decimals gap/friction; direction Z 5 decimals when nonzero',
      frictionSentinelToZero:rawFriction===-1.0101&&friction===0,
      direction:explicit?'normalized-explicit-vector':'native-type-default'}};
}

function compare(expected,actual) {
  const mismatches=['stiffness','gap','friction'].filter(k=>!matches(expected[k],actual[k],k));
  for(const [i,axis] of ['X','Y','Z'].entries())
    if(!matches(expected.direction[i],actual.direction[i],'direction'+axis))mismatches.push('direction'+axis);
  return mismatches;
}

function inspectRecord(record,context,cache) {
  const mapping=restraintAuditTarget(record,context,cache);
  if(mapping.status!=='BOUND')return {...record,status:mapping.status,mapping,observed:null};
  if(!record.after) {
    const expected=expectedValues({...record,after:record.before});
    const present=context.parsed.restraints.some(r=>r.node===mapping.node&&r.typeCode===expected.typeCode&&
      compare(expected,r).length===0&&context.parsed.elements.some(e=>e.branch===record.target.branch&&e.restraintPointer===r.blockIndex));
    return {...record,mapping,expected:null,observed:null,status:present?'REMOVED_SLOT_PRESENT':'VERIFIED'};
  }
  const expected=expectedValues(record);
  const slots=context.parsed.restraints.filter(r=>r.node===mapping.node&&r.typeCode===expected.typeCode);
  const owned=slots.filter(r=>context.parsed.elements.some(e=>e.branch===record.target.branch&&
    [e.from,e.to].includes(r.node)&&e.restraintPointer===r.blockIndex));
  const qualified=record.physicalPlacement?owned.filter(r=>r.slotIndex===record.physicalPlacement.slotOrdinal):owned;
  const address=qualified.length===1?qualified[0]:null;
  const base={...record,mapping,expected};
  if(!address)return {...base,status:qualified.length?'DUPLICATE_SLOT':slots.length?'UNREFERENCED_SLOT':'MISSING_SLOT',
    observed:null,candidates:slots};
  const observed={...address,elements:context.parsed.elements.filter(e=>e.restraintPointer===address.blockIndex&&
    e.branch===record.target.branch&&[e.from,e.to].includes(address.node)).map(e=>({index:e.index,from:e.from,to:e.to,branch:e.branch}))};
  const mismatches=compare(expected,address);
  return {...base,status:mismatches.length?'VALUE_MISMATCH':'VERIFIED',mismatches,observed};
}

function unexplainedSlots(records,parsed) {
  const nodes=new Set(records.filter(r=>r.mapping?.status==='BOUND').map(r=>r.mapping.node));
  const matched=new Set(records.filter(r=>r.observed).map(r=>r.observed.recordIndex));
  return parsed.restraints.filter(r=>nodes.has(r.node)&&!matched.has(r.recordIndex));
}

// Field/pointer comparison shared with the observational active compatibility
// journal. Full pre-Final verification still requires validateRestraintAuditSource.
export function verifyRecordedRestraintFields(records,{ciiText,nativeXmlText,config={},finalizedGeometry=null}) {
  const parsed=parseCiiEngineeringFields(ciiText);
  if(!Number.isSafeInteger(parsed.restraintBlockCount))throw new Error('RESTRAINT_AUDIT_AUX_BLOCK_INVALID');
  if(parsed.elements.some(e=>!Number.isSafeInteger(e.restraintPointer)||e.restraintPointer<0||e.restraintPointer>parsed.restraintBlockCount))
    throw new Error('RESTRAINT_AUDIT_POINTER_INVALID');
  const context={parsed,config,nativeXmlText,finalizedGeometry},cache={};
  const checked=records.map(row=>inspectRecord(row,context,cache));
  const extra=unexplainedSlots(checked,parsed);
  return {records:checked,errors:extra.length?[{code:'RESTRAINT_AUDIT_UNEXPLAINED_SLOT',slots:extra}]:[]};
}

export async function verifyRestraintAudit({audit,xmlText,stagedJsonText='',config={},nativeXmlText,
  ciiText='',finalizedGeometry=null}) {
  if(!audit)return {schema:'XML229.RestraintAuditResult.v1',status:'NOT_RECORDED',
    scope:'source XML/JSON restraints',privateOwnerLocalOnly:true,records:[],
    reason:'This run has no recorded enrichment decisions; historical provenance is unavailable.'};
  let records=[],errors=[];
  try {
    await validateRestraintAuditSource(audit,{xmlText,stagedJsonText,config});
    if(!ciiText)return {schema:'XML229.RestraintAuditResult.v1',status:'CII_NOT_RUN',
      privateOwnerLocalOnly:true,recorded:audit,records:audit.records};
    const parsed=parseCiiEngineeringFields(ciiText);
    if(!Number.isSafeInteger(parsed.restraintBlockCount))throw new Error('RESTRAINT_AUDIT_AUX_BLOCK_INVALID');
    if(parsed.elements.some(e=>!Number.isSafeInteger(e.restraintPointer)||e.restraintPointer<0||e.restraintPointer>parsed.restraintBlockCount))
      throw new Error('RESTRAINT_AUDIT_POINTER_INVALID');
    const context={parsed,config,nativeXmlText,finalizedGeometry},cache={};
    records=audit.records.map(row=>inspectRecord(row,context,cache));
    const extra=unexplainedSlots(records,parsed);
    if(extra.length)errors.push({code:'RESTRAINT_AUDIT_UNEXPLAINED_SLOT',slots:extra});
  }catch(error){errors.push({code:String(error.message)});}
  const failed=records.filter(r=>r.status!=='VERIFIED').length;
  const status=errors.length||failed?'FAILED':'VERIFIED';
  const [ciiSha256,nativeXmlSha256,runConfigSha256]=await Promise.all([
    digestUtf8(ciiText),digestUtf8(nativeXmlText||''),digestCanonical(config),
  ]);
  return {schema:'XML229.RestraintAuditResult.v1',status,scope:'source XML/JSON restraints',
    privateOwnerLocalOnly:true,recorded:audit,output:{ciiSha256,nativeXmlSha256,runConfigSha256},
    summary:{recorded:audit.records.length,verified:records.filter(r=>r.status==='VERIFIED').length,
      failed,errors:errors.length},errors,records};
}
