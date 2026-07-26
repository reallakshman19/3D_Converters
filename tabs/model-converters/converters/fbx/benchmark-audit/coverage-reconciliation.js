import { deepFreeze, fail, requireArray, requireClosedObject, requireText, sortedUniqueText, stableCompare } from './audit-utils.js';
import { requireDiagnosticState, requireLedgerSchema, requirePopulationKind, requireTerminalState, terminalClassForState } from './ledger-vocabularies.js';

const INPUT_KEYS=['schema','populationId','populationKind','ledgerSchema','referencePopulation','actualPopulation','terminalRecords','diagnosticRecords'];
const OCCURRENCE_KEYS=['occurrenceId','identityKey'];
const TERMINAL_KEYS=['recordId','state','referenceOccurrenceIds','actualOccurrenceIds','originalReferenceCandidateIds','originalActualCandidateIds'];
const DIAGNOSTIC_KEYS=['diagnosticId','state','referenceOccurrenceIds','actualOccurrenceIds'];
const ONE_TO_ONE=new Set(['EXACT_MATCH','APPROVED_EQUIVALENT','TOPOLOGY_MISMATCH','GEOMETRY_MISMATCH','ATTRIBUTE_MISMATCH','TYPE_MISMATCH','POSITION_MISMATCH','ORIENTATION_MISMATCH','PROPERTY_MISMATCH','HOST_MISMATCH','ENDPOINT_MISMATCH','RELATIONSHIP_KIND_CONFLICT','RECIPROCITY_MISMATCH','ZONE_BOUNDARY_MISMATCH','DEGREE_MISMATCH']);
const REF_ONLY=new Set(['MISSING_ACTUAL','ORPHAN_SUPPORT']);
const ACTUAL_ONLY=new Set(['UNEXPECTED_ACTUAL']);
const COLLISION=new Set(['AMBIGUOUS_MATCH','BLOCKED_IDENTITY','BLOCKED','DUPLICATE_IDENTITY','DUPLICATE_EDGE','SELF_CONNECTION']);

function normalizedPopulation(values,label){
  const seen=new Set();
  return requireArray(values,label).map((value,index)=>{
    const item=requireClosedObject(value,`${label}[${index}]`,OCCURRENCE_KEYS);
    const occurrenceId=requireText(item.occurrenceId,`${label}[${index}].occurrenceId`);
    if(seen.has(occurrenceId)) fail('BLOCKED_AUDIT_IDENTITY',`${label} repeats ${occurrenceId}.`);
    seen.add(occurrenceId); return {occurrenceId,identityKey:requireText(item.identityKey,`${label}[${index}].identityKey`)};
  }).sort((a,b)=>stableCompare(a.occurrenceId,b.occurrenceId));
}
function requireKnownIds(values,known,label){
  const ids=sortedUniqueText(values,label);
  for(const id of ids) if(!known.has(id)) fail('BLOCKED_AUDIT_IDENTITY',`${label} references unknown occurrence ${id}.`);
  return ids;
}
function requireShape(state,refs,actuals,label){
  const shape=`${refs.length}:${actuals.length}`;
  if(ONE_TO_ONE.has(state) && shape!=='1:1') fail('BLOCKED_AUDIT_CARDINALITY',`${label} ${state} requires 1 reference and 1 actual.`);
  if(REF_ONLY.has(state) && shape!=='1:0') fail('BLOCKED_AUDIT_CARDINALITY',`${label} ${state} requires 1 reference and 0 actual.`);
  if(ACTUAL_ONLY.has(state) && shape!=='0:1') fail('BLOCKED_AUDIT_CARDINALITY',`${label} ${state} requires 0 references and 1 actual.`);
  if(COLLISION.has(state) && refs.length+actuals.length<2) fail('BLOCKED_AUDIT_CARDINALITY',`${label} ${state} requires an explicit collision set.`);
  if(!ONE_TO_ONE.has(state)&&!REF_ONLY.has(state)&&!ACTUAL_ONLY.has(state)&&!COLLISION.has(state)&&refs.length+actuals.length!==1) {
    fail('BLOCKED_AUDIT_CARDINALITY',`${label} ${state} requires exactly one consumed occurrence.`);
  }
}
function normalizeTerminal(value,index,kind,referenceIds,actualIds,seen){
  const label=`terminalRecords[${index}]`, item=requireClosedObject(value,label,TERMINAL_KEYS);
  const recordId=requireText(item.recordId,`${label}.recordId`); if(seen.has(recordId)) fail('BLOCKED_AUDIT_IDENTITY',`terminalRecords repeats ${recordId}.`); seen.add(recordId);
  const state=requireTerminalState(kind,item.state,`${label}.state`);
  const refs=requireKnownIds(item.referenceOccurrenceIds,referenceIds,`${label}.referenceOccurrenceIds`);
  const actuals=requireKnownIds(item.actualOccurrenceIds,actualIds,`${label}.actualOccurrenceIds`); requireShape(state,refs,actuals,label);
  return {recordId,state,referenceOccurrenceIds:refs,actualOccurrenceIds:actuals,
    originalReferenceCandidateIds:requireKnownIds(item.originalReferenceCandidateIds,referenceIds,`${label}.originalReferenceCandidateIds`),
    originalActualCandidateIds:requireKnownIds(item.originalActualCandidateIds,actualIds,`${label}.originalActualCandidateIds`)};
}
function normalizeTerminalRecords(values,kind,referenceIds,actualIds){
  const seen=new Set(); return requireArray(values,'terminalRecords').map((v,i)=>normalizeTerminal(v,i,kind,referenceIds,actualIds,seen)).sort((a,b)=>stableCompare(a.recordId,b.recordId));
}
function normalizeDiagnosticRecords(values,referenceIds,actualIds){
  const seen=new Set(); return requireArray(values,'diagnosticRecords').map((value,index)=>{
    const label=`diagnosticRecords[${index}]`,item=requireClosedObject(value,label,DIAGNOSTIC_KEYS);
    const diagnosticId=requireText(item.diagnosticId,`${label}.diagnosticId`); if(seen.has(diagnosticId)) fail('BLOCKED_AUDIT_IDENTITY',`diagnosticRecords repeats ${diagnosticId}.`); seen.add(diagnosticId);
    return {diagnosticId,state:requireDiagnosticState(item.state,`${label}.state`),
      referenceOccurrenceIds:requireKnownIds(item.referenceOccurrenceIds,referenceIds,`${label}.referenceOccurrenceIds`),
      actualOccurrenceIds:requireKnownIds(item.actualOccurrenceIds,actualIds,`${label}.actualOccurrenceIds`)};
  }).sort((a,b)=>stableCompare(a.diagnosticId,b.diagnosticId));
}
function occurrenceUses(population,records,side){
  const key=side==='reference'?'referenceOccurrenceIds':'actualOccurrenceIds',uses=new Map(population.map(i=>[i.occurrenceId,[]]));
  for(const record of records) for(const id of record[key]) uses.get(id).push(record.recordId); return uses;
}
function findings(side,uses,mode){
  return [...uses.entries()].filter(([,ids])=>mode==='duplicate'?ids.length>1:ids.length===0).map(([occurrenceId,recordIds])=>
    mode==='duplicate'?{side,occurrenceId,recordIds:[...recordIds].sort(stableCompare)}:{side,occurrenceId}).sort((a,b)=>stableCompare(a.occurrenceId,b.occurrenceId));
}
function candidateEscapes(records){
  const out=[]; for(const record of records) for(const side of ['reference','actual']){
    const selected=record[`${side}OccurrenceIds`],candidates=record[`original${side[0].toUpperCase()+side.slice(1)}CandidateIds`]; if(!candidates.length) continue;
    const allowed=new Set(candidates); for(const id of selected) if(!allowed.has(id)) out.push({recordId:record.recordId,side,occurrenceId:id,originalCandidateIds:[...candidates]});
  } return out.sort((a,b)=>stableCompare(`${a.recordId}:${a.side}:${a.occurrenceId}`,`${b.recordId}:${b.side}:${b.occurrenceId}`));
}
function stateCounts(kind,records){
  const counts={},classes={PASS:0,OBSERVATION:0,FAIL:0,BLOCKED:0}; for(const record of records){ counts[record.state]=(counts[record.state]||0)+1; classes[terminalClassForState(kind,record.state)]+=1; }
  return {counts:Object.fromEntries(Object.entries(counts).sort(([a],[b])=>stableCompare(a,b))),classCounts:classes};
}
function buildCoverage(value){
  const populationKind=requirePopulationKind(value.populationKind),ledgerSchema=requireLedgerSchema(populationKind,value.ledgerSchema);
  const referencePopulation=normalizedPopulation(value.referencePopulation,'referencePopulation'),actualPopulation=normalizedPopulation(value.actualPopulation,'actualPopulation');
  const referenceIds=new Set(referencePopulation.map(i=>i.occurrenceId)),actualIds=new Set(actualPopulation.map(i=>i.occurrenceId));
  return {populationKind,ledgerSchema,referencePopulation,actualPopulation,
    terminalRecords:normalizeTerminalRecords(value.terminalRecords,populationKind,referenceIds,actualIds),
    diagnosticRecords:normalizeDiagnosticRecords(value.diagnosticRecords,referenceIds,actualIds)};
}
function buildResult(value,data){
  const referenceUses=occurrenceUses(data.referencePopulation,data.terminalRecords,'reference'),actualUses=occurrenceUses(data.actualPopulation,data.terminalRecords,'actual');
  const duplicateConsumptionAttempts=[...findings('reference',referenceUses,'duplicate'),...findings('actual',actualUses,'duplicate')];
  const unreconciledRecords=[...findings('reference',referenceUses,'missing'),...findings('actual',actualUses,'missing')],collisionEscapeAttempts=candidateEscapes(data.terminalRecords);
  const {counts:terminalStateCounts,classCounts:terminalClassCounts}=stateCounts(data.populationKind,data.terminalRecords),diagnosticStateCounts={};
  for(const record of data.diagnosticRecords) diagnosticStateCounts[record.state]=(diagnosticStateCounts[record.state]||0)+1;
  const failures=duplicateConsumptionAttempts.length+unreconciledRecords.length+collisionEscapeAttempts.length;
  const emptySupport=data.populationKind==='SUPPORT'&&!data.referencePopulation.length&&!data.actualPopulation.length;
  const status=emptySupport?'NOT_APPLICABLE':terminalClassCounts.BLOCKED?'BLOCKED':failures||terminalClassCounts.FAIL?'FAIL':terminalClassCounts.OBSERVATION?'PASS_WITH_OBSERVATIONS':'PASS';
  return {schema:'FbxCoverageReconciliation.v2',populationId:requireText(value.populationId,'populationId'),populationKind:data.populationKind,ledgerSchema:data.ledgerSchema,
    referencePopulationCount:data.referencePopulation.length,actualPopulationCount:data.actualPopulation.length,terminalRecordCount:data.terminalRecords.length,diagnosticRecordCount:data.diagnosticRecords.length,
    terminalStateCounts,terminalClassCounts,diagnosticStateCounts,duplicateConsumptionAttempts,unreconciledRecords,collisionEscapeAttempts,
    reconciliationEquations:[{name:'reference population coverage',left:[...referenceUses.values()].filter(x=>x.length===1).length,right:data.referencePopulation.length,pass:!unreconciledRecords.some(x=>x.side==='reference')&&!duplicateConsumptionAttempts.some(x=>x.side==='reference')},{name:'actual population coverage',left:[...actualUses.values()].filter(x=>x.length===1).length,right:data.actualPopulation.length,pass:!unreconciledRecords.some(x=>x.side==='actual')&&!duplicateConsumptionAttempts.some(x=>x.side==='actual')}],status};
}
export function reconcileCoverage(input){
  const value=requireClosedObject(input,'coverage input',INPUT_KEYS);
  if(value.schema!=='FbxCoverageReconciliationInput.v1') fail('BLOCKED_AUDIT_CONTRACT','schema must be FbxCoverageReconciliationInput.v1.');
  return deepFreeze(buildResult(value,buildCoverage(value)));
}
