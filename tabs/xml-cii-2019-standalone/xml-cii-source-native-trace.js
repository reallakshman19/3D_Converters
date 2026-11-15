/** Observational source-coverage to existing verified native slots. No writer or ownership changes. */
import {restraintTypeToCaesarCode} from '../../converters/xml-cii2019-core/restraint-type-codes.js';

const text=v=>String(v??'').trim();
const name=v=>text(v).replace(/^[/]+/,'').toUpperCase();
const key=s=>[s.node,s.blockIndex,s.slotIndex].join(':');
const sameTarget=(r,t)=>{
  const o=r.originalTarget;
  return Boolean(o&&t&&['branch','branchOccurrenceIndex','sourceNodeOrdinal','nodeNumber','nodeName','componentRefNo']
    .every(k=>o[k]===t[k]));
};
const validNumber=v=>v!==''&&v!=null&&Number.isFinite(Number(v));
const pathOf=r=>r.source?.kind==='staged-json'?r.source.member?.path:null;

function candidateWitness(candidate,entry,records) {
  const code=restraintTypeToCaesarCode(entry.type);
  const rows=records.filter(r=>sameTarget(r,candidate.target)&&r.after&&
    text(r.after.Type).toUpperCase()===text(entry.type).toUpperCase()&&
    validNumber(r.after.Gap)&&validNumber(entry.gap)&&Number(r.after.Gap)===Number(entry.gap));
  const verified=rows.filter(r=>r.status==='VERIFIED'&&r.mapping?.status==='BOUND'&&
    r.observed&&r.observed.node===r.mapping.node&&r.observed.typeCode===code&&
    r.expected?.typeCode===code&&Number(r.expected?.gap)===Number(entry.gap)&&
    Number.isSafeInteger(r.observed.blockIndex)&&r.observed.blockIndex>0&&
    Number.isSafeInteger(r.observed.slotIndex)&&r.observed.slotIndex>0);
  const slots=new Map();
  for(const r of verified){
    const address=key(r.observed);
    if(!slots.has(address))slots.set(address,{observed:r.observed,rows:[]});
    slots.get(address).rows.push(r);
  }
  if(slots.size!==1)return {target:candidate.target,entry,status:slots.size?'AMBIGUOUS_NATIVE_SLOT':'NO_VERIFIED_NATIVE_SLOT',
    recordIds:rows.map(r=>r.id)};
  const slot=[...slots.values()][0];
  return {target:candidate.target,entry,status:'VERIFIED_NATIVE_FIELDS',
    recordIds:slot.rows.map(r=>r.id),sourcePaths:slot.rows.map(pathOf).filter(Boolean),observed:slot.observed,
    attributed:slot.rows.length===1&&slot.rows[0].identity==='EXACT_ORIGINAL_IDENTITY'&&
      slot.rows[0].disposition!=='PRESERVED'&&Boolean(pathOf(slot.rows[0]))};
}

function sourceTrace(source,records,sources,hasCii) {
  if(!hasCii)return {status:'CII_NOT_RUN',slots:[],checks:[]};
  const candidates=source.candidates||[];
  if(!candidates.length)return {status:'NO_RESOLVED_SOURCE_TARGET',slots:[],checks:[]};
  const ids=new Set(source.recordIds||[]);
  const available=records.filter(r=>ids.has(r.id));
  const checks=candidates.flatMap(c=>(c.entries||[]).map(e=>candidateWitness(c,e,available)));
  const verified=checks.filter(c=>c.status==='VERIFIED_NATIVE_FIELDS');
  const slots=[...new Map(verified.map(c=>[key(c.observed),c.observed])).values()];
  if(!checks.length||verified.length!==checks.length)return {status:'SOURCE_NATIVE_FIELDS_UNVERIFIED',slots,checks};
  // Only a single named source occurrence and exact writer-attributed record
  // can claim source attribution. A shared legacy group proves fields, not
  // independent physical/source ownership.
  const unique=sources.filter(s=>name(s.name)===name(source.name)&&text(s.branch)===text(source.branch)).length===1;
  const exact=unique&&candidates.length===1&&name(source.name)&&
    name(candidates[0].target.nodeName)===name(source.name)&&verified.every(c=>
      c.attributed&&c.sourcePaths.length===1&&c.sourcePaths[0]===source.path);
  return {status:exact?'SOURCE_ATTRIBUTED_CII_FIELDS_VERIFIED':'RESOLVED_GROUP_CII_FIELDS_VERIFIED',
    slots,checks,independentPhysicalOwnershipProven:false,
    reason:exact?'Exact recorded source path and native field address; engineering physical ownership remains separate.':
      'All resolved legacy candidates agree with verified native fields. Shared slots are not proof of unique source ownership.'};
}

export function attachSourceNativeTrace(coverage,records,hasCii) {
  const sources=coverage.sources||[];
  return {...coverage,sources:sources.map(s=>({...s,ciiTrace:sourceTrace(s,records,sources,hasCii)}))};
}
