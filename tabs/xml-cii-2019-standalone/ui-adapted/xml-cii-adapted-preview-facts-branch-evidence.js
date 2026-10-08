// P4-A2 provisional evidence: never an accepted engineering FactRecord.
export class PreviewBranchEvidenceError extends Error {
  constructor(code, message) { super(message); this.code=code; this.name='PreviewBranchEvidenceError'; }
}
function check(ok,code,message){if(!ok)throw new PreviewBranchEvidenceError(code,message);}
const fields={
  lineKey:'lineKeyMethod',pipingClass:'pipingClassMethod',sizeMm:'boreSource',
  rating:'ratingSource',material:'materialSource',materialCode:'materialCodeMethod',
  p1:'p1Source',hydroPressure:'hydroPressureSource',t1:'t1Source',
  t2:'t2Source',t3:'t3Source',density:'densitySource',
  wallThickness:'wallThicknessSource',corrosion:'corrosionSource',
};
function frozen(v){if(v&&typeof v==='object'){Object.values(v).forEach(frozen);Object.freeze(v);}return v;}
export function reconcilePreviewBranchEvidence({basisId,sourceOccurrences,branchRows}={}){
  check(typeof basisId==='string'&&/^[a-f0-9]{64}$/i.test(basisId),
    'BASIS_REQUIRED','Canonical full-content basis required');
  const sources=sourceOccurrences?.branches;
  check(sourceOccurrences?.schemaVersion==='gc-pw/1.0'&&Array.isArray(sources)
    &&sourceOccurrences.branchCount===sources.length&&sources.length>0,
    'SOURCE_CENSUS_REQUIRED','Independent source branch census required');
  check(Array.isArray(branchRows)&&branchRows.length===sources.length,
    'BRANCH_POPULATION_MISMATCH','Computed branches are missing or extra');
  const seen=new Set(),branches=[];
  sources.forEach((original,index)=>{
    const computed=branchRows[index];
    check(original?.subjectType==='branch'&&original.sourceId&&original.occurrenceId
      &&Number.isSafeInteger(original.branchOrdinal)&&original.branchOrdinal>=0
      &&original.branchOccurrenceIndex===index,
      'ORIGINAL_IDENTITY_INVALID','Source/branch ordinal missing or reordered');
    check(!seen.has(original.occurrenceId),'DUPLICATE_ORIGINAL','Original identity duplicated');
    seen.add(original.occurrenceId);
    check(computed&&String(computed.branchName||'')===original.branchName,
      'BRANCH_IDENTITY_DRIFT','Computed branch differs from original at ordinal');
    check(computed.branchOccurrenceIndex==null||computed.branchOccurrenceIndex===index,
      'BRANCH_ORDINAL_DRIFT','Computed branch ordinal differs');
    const status=String(computed.extractionStatus||'UNASSESSED');
    const ambiguous=status==='AMBIGUOUS'||status==='UNMATCHED';
    const evidence={};
    for(const [field,method] of Object.entries(fields)){
      const raw=computed[field]??null;
      evidence[field]={candidate:raw,method:String(computed[method]||'not-reported'),
        value:ambiguous?null:raw,verification:'NOT_ASSESSED'};
    }
    branches.push({sourceId:original.sourceId,occurrenceId:original.occurrenceId,
      branchOrdinal:original.branchOrdinal,combinedBranchOrdinal:index,
      branchName:original.branchName,provenance:original.provenance||[],
      extractionStatus:status,conflictReason:String(computed.branchIdentityConflict||''),
      formatIndex:status==='MATCHED'?computed.matchedFormatIndex??null:null,fields:evidence});
  });
  return frozen({schema:'xml-cii-preview-branch-evidence/1',basisId,
    engineeringReady:false,engineeringAcceptance:'NOT_ASSESSED',
    sourceBranchCount:branches.length,branches});
}
