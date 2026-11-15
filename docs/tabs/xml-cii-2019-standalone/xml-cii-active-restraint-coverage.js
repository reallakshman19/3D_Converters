/** Source-first census. Field agreement on surviving XML is a separate check. */
const text=value=>String(value??'').trim();
const copy=value=>JSON.parse(JSON.stringify(value));
const supportTypes=new Set(['SUPPORT','ANCI','ATTA']);

export function inventoryActiveSourceSupports(stagedJsonText) {
  if(!text(stagedJsonText))return {status:'NO_STAGED_JSON',sources:[]};
  try {
    const sources=[];
    const visit=(value,path,branch)=>{
      if(Array.isArray(value)){value.forEach((child,i)=>visit(child,`${path}[${i}]`,branch));return;}
      if(!value||typeof value!=='object')return;
      const attrs=value.attributes||{},type=text(value.type||attrs.TYPE).toUpperCase();
      const currentBranch=type==='BRANCH'?text(value.name||attrs.NAME):branch;
      if(supportTypes.has(type)||supportTypes.has(text(attrs.RAW_TYPE||attrs.TYPE).toUpperCase()))
        sources.push({path,name:text(attrs.NAME||value.name),branch:currentBranch,fields:copy(attrs)});
      if(Array.isArray(value.children))value.children.forEach((child,i)=>visit(child,`${path}.children[${i}]`,currentBranch));
    };
    visit(JSON.parse(stagedJsonText),'$','');
    return {status:'RECORDED',sources};
  }catch(error){return {status:'SOURCE_JSON_INVALID',sources:[],error:String(error.message)};}
}

const sourcePaths=record=>[record.source?.member,...(record.source?.members||[]),
  ...(record.source?.corroboratingMembers||[])].filter(Boolean).map(source=>source.path);
const type=value=>text(value).toUpperCase();
const sameTarget=(record,target)=>{
  const original=record.originalTarget||record.target;
  return original.branchOccurrenceIndex===target.branchOccurrenceIndex&&
    original.sourceNodeOrdinal===target.sourceNodeOrdinal&&original.nodeNumber===target.nodeNumber;
};

function checkCandidates(candidates,records) {
  const matched=[],missing=[],gaps=[];
  for(const candidate of candidates) {
    const rows=records.filter(record=>record.after&&sameTarget(record,candidate.target));
    matched.push(...rows);
    for(const entry of candidate.entries) {
      const typed=rows.filter(record=>type(record.after.Type)===type(entry.type));
      if(!typed.length)missing.push({target:candidate.target,...entry});
      else if(!typed.some(record=>Number(record.after.Gap||0)===Number(entry.gap||0)))
        gaps.push({target:candidate.target,...entry});
    }
  }
  return {matched,missing,gaps};
}

function reconcileSource(source,plan,records,journal) {
  const observed=records.filter(row=>row.after&&sourcePaths(row).includes(source.path));
  if(!plan)return {...source,status:'UNACCOUNTED_SOURCE',reason:'No pre-enrichment policy/target evaluation recorded.',recordIds:observed.map(row=>row.id)};
  const row={...source,...plan};
  if(plan.status!=='EVALUATED')return row;
  if(!plan.candidates.length)return {...row,status:'SOURCE_UNBOUND',reason:'Existing source resolver found no target in the selected XML.'};
  // The compatibility resolver can intentionally expose one source at several
  // original nodes. Check every target; never pick one by matching output value.
  const {matched:targetRecords,missing,gaps}=checkCandidates(plan.candidates,records);
  if(missing.length)return {...row,status:'MISSING_RESTRAINT',missing,reason:'Current configured source policy expects a restraint absent from enriched XML.'};
  if(gaps.length)return {...row,status:'SOURCE_GAP_MISMATCH',missing:gaps,reason:'The current source-policy gap is absent at the resolved target.'};
  const event=journal.events.some(event=>event.sources?.some(member=>member.path===source.path));
  const status=observed.length?'RECORDED_SOURCE':targetRecords.every(record=>record.disposition==='PRESERVED')?
    'PRESENT_IN_ORIGINAL_XML':event?'PRESENT_IN_RESOLVED_GROUP':'PRESENT_WITHOUT_PRODUCER_WITNESS';
  return {...row,status,recordIds:targetRecords.map(record=>record.id),reason:
    'Source-policy expectation checked against recorded XML; this does not establish engineering design acceptance.'};
}

export function activeSourceCoverage(journal,records) {
  const census=journal.sourceCensus||inventoryActiveSourceSupports(journal.stagedJsonText);
  const plans=new Map((journal.sourceExpectations?.sources||[]).map(row=>[row.path,row]));
  const sources=census.sources.map(source=>reconcileSource(source,plans.get(source.path),records,journal));
  const count=status=>sources.filter(row=>row.status===status).length;
  const accounted=new Set(['RECORDED_SOURCE','PRESENT_IN_ORIGINAL_XML','PRESENT_IN_RESOLVED_GROUP','EXCLUDED_BRANCH']);
  const failed=count('MISSING_RESTRAINT')+count('SOURCE_GAP_MISMATCH');
  const unresolved=sources.filter(row=>!accounted.has(row.status)).length;
  const summary={supportOccurrences:sources.length,applicable:sources.length-count('EXCLUDED_BRANCH'),
    accounted:sources.length-unresolved,unaccounted:count('UNACCOUNTED_SOURCE'),disabled:count('JSON_RESTRAINTS_DISABLED'),
    unbound:count('SOURCE_UNBOUND'),ambiguous:count('AMBIGUOUS_TARGET'),missing:count('MISSING_RESTRAINT'),failed,
    excluded:count('EXCLUDED_BRANCH'),unresolved};
  const error=journal.sourceExpectations?.error||census.error;
  const status=census.status!=='RECORDED'?census.status:error||unresolved?'INCOMPLETE':
    sources.length&&summary.applicable===0?'NO_APPLICABLE_SUPPORTS':'COMPLETE';
  return {schema:'XMLCII.SourceSupportCoverage.v1',status,summary,sources,
    policyBasis:'Existing active compatibility policy, evaluated before enrichment; no engineering authority granted.',
    resolution:journal.sourceExpectations?.resolution||null,...(error?{error}:{})};
}
