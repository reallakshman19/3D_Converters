/**
 * XML229 P4-A — independent original-XML / actual Preview computation
 * -> canonical GC-PW engineering FactRecords. This is NOT a source-only index.
 *
 * Single Mode A original XML, full original branch selection only. The
 * upstream legacy Worker may report NOT_ASSESSED; only this independent
 * source/mapping/coverage verification may produce a VERIFIED model.
 * Final/Match-1 engineering DECISIONS remain separate and NEVER automatic.
 *
 * Caller must execute this in an isolated Worker for large source data.
 */
import {
  attestLiveBasis,physicalOccurrenceId,
} from '../../../contracts/gc-pw-v1/occurrence-bridge.mjs';
import {assertBasisDigest,canonicalJson,digestCanonical,validateFactRecord,validatePage}
  from '../../../contracts/gc-pw-v1/contract.mjs';
import {isolatedOriginalPreviewWorkConfig} from './xml229-original-preview-work-config.mjs';
import {projectXmlCiiOccurrences}
  from '../ui-adapted/xml-cii-adapted-preview-facts-xml-source.js';
import {preparePreviewNodeOccurrenceDocument}
  from '../ui-adapted/xml-cii-adapted-preview-node-occurrence-ledger.js';
import {openPreviewFactReadModel}
  from '../ui-adapted/xml-cii-adapted-preview-facts-read-model.js';
import {isXmlCiiWeightReviewNode,isXmlCiiWeightReviewConnectionEligible}
  from '../../../converters/xml-cii2019-core/weight-match-model.js';

const good=v=>typeof v==='string'&&v.trim().length>0;
const num=v=>v===null||v===undefined||String(v).trim()===''?null:
  Number.isFinite(Number(v))?Number(v):null;
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
const name=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const children=(p,n)=>[...(p?.childNodes||[])].filter(x=>x.nodeType===1&&name(x)===n);
const field=(p,n)=>String(children(p,n)[0]?.textContent??'').trim();
const fail=(code,message)=>{const e=new Error(message);e.code=code;e.retryable=false;throw e;};
const recordsFor=(basis,occurrence,fieldId,value,authority,unit=null,detail='')=>{
  const unresolved=value===null||value===undefined||value==='';
  return {schemaVersion:'gc-pw/1.0',domainId:basis.domainId,basisId:basis.basisId,
    subjectType:occurrence.subjectType,sourceId:occurrence.sourceId,
    occurrenceId:occurrence.occurrenceId,fieldId,
    value:unresolved?null:value,unit,
    authority:unresolved?'unresolved':authority,
    provenance:[{sourceRef:occurrence.sourceId,
      locator:occurrence.provenance?.[0]?.locator||'original/ordinal'}],
    diagnostics:unresolved?['ENGINEERING_FIELD_UNRESOLVED:'+fieldId]:[],
    extensions:{producer:'XML229.P4.SourceAttestedEngineeringFacts.v1',
      detail:detail||'original source and Preview computation'},
  };
};
export const XML229_ENGINEERING_FIELDS=Object.freeze([
 'source.occurrence','bore.mm','length.mm','rating','mass.kg',
 'component.type','component.ref',
]);

/**
 * source inputs are from the actual original-XML importer and master buffers,
 * not from an indexed JSON receipt, a Preview cache, or a visible node table.
 * Original Preview worker result MUST be the real source computation; it is
 * checked independently against source ordinals including dropped nodes.
 */
export async function openXml229EngineeringFactModel({
  basis,live,xmlText,sourceId,previewResult,
  expectedOriginalCount,maxPhysical=10000,
}={}){
  if(!good(sourceId)||typeof xmlText!=='string'||!xmlText.trim()||
    !basis||!live||!previewResult||typeof previewResult!=='object')
    fail('ORIGINAL_INPUT_REQUIRED','Original XML, basis, live master bytes and real Preview result required');
  if(!Number.isSafeInteger(maxPhysical)||maxPhysical<1||maxPhysical>100000)
    fail('INVALID_BOUNDED_POPULATION','Physical Worker window cap must be 1..100000');
  await attestLiveBasis({...live,basis});
  if(live.sources?.[sourceId]!==xmlText||basis.sourceRefs?.length!==1||
    basis.sourceRefs[0]?.sourceId!==sourceId||basis.scope?.length!==1||
    basis.scope[0]?.sourceId!==sourceId||
    !['all','ALL','*'].includes(basis.scope[0]?.selectionRef))
    fail('UNSUPPORTED_SOURCE_SCOPE','P4 only admits one complete original XML source, no partial/Mode B scope');
  if(previewResult.engineeringAcceptance!=='NOT_ASSESSED'||
    previewResult.fullFactPopulationAccepted!==false)
    fail('PREVIEW_INPUT_AUTHORITY_DRIFT','P4 must verify source-only Preview computation itself');
  const projection=projectXmlCiiOccurrences({xmlText,mode:'A',sourceId});
  const sourceOriginals=[...projection.branches,...projection.nodes];
  if(expectedOriginalCount!==sourceOriginals.length)
    fail('INDEPENDENT_CENSUS_MISMATCH','Original XML branch/node count is not independently attested');
  if(!Array.isArray(previewResult?.sourceOccurrences?.branches)||
    !Array.isArray(previewResult?.sourceOccurrences?.nodes)||
    !Array.isArray(previewResult.branchRows)||!Array.isArray(previewResult.nodeRows)||
    previewResult.branchRows.length!==projection.branchCount)
    fail('PREVIEW_COMPUTATION_INCOMPLETE','Real Preview branch+node records missing');
  const matching=(source,actual)=>source.length===actual.length&&
    source.every((x,i)=>x.sourceId===actual[i].sourceId&&
      x.occurrenceId===actual[i].occurrenceId);
  if(!matching(projection.branches,previewResult.sourceOccurrences.branches)||
     !matching(projection.nodes,previewResult.sourceOccurrences.nodes))
    fail('ORIGINAL_OCCURRENCE_ID_DRIFT','Preview source identity is different from original XML');
  // Independent source-cleanup calculation cannot mutate the original
 // master/config buffers whose full content is attested by GC-PW.
 const prepared=preparePreviewNodeOccurrenceDocument({
   xmlText,config:isolatedOriginalPreviewWorkConfig(live.config||{}),
 });
  if(!prepared.document||prepared.ledger.originalCount!==projection.nodeCount)
    fail('SOURCE_CLEANUP_DRIFT','Original source cleanup census incomplete');
  const branches=[...prepared.document.getElementsByTagName('Branch')];
  const sourceNodeByOrdinal=new Map(projection.nodes.map(row=>[
    JSON.stringify([row.branchOccurrenceIndex,row.nodeOrdinal]),row]));
  const weightRows=new Map();
  for(const row of previewResult.nodeRows){
    if(!Number.isSafeInteger(row.branchOccurrenceIndex)||
      !Number.isSafeInteger(row.sourceNodeOrdinal)||
      row.branchOccurrenceIndex<0||row.branchOccurrenceIndex>=projection.branchCount)
      fail('NONCANONICAL_PREVIEW_NODE','Preview weight row lacks pre-clean original source ordinal');
    const key=JSON.stringify([row.branchOccurrenceIndex,row.sourceNodeOrdinal]);
    if(weightRows.has(key))fail('DUPLICATE_PREVIEW_NODE','Duplicate physical original occurrence');
    const original=sourceNodeByOrdinal.get(key);
    if(!original||original.nodeNumber!==row.nodeNumber||
      original.componentType!==row.componentType||
      original.componentRefNo!==row.componentRefNo||
      original.endpoint!==row.endpoint)
      fail('PREVIEW_SOURCE_JOIN_DRIFT','Computed weight row does not match original physical component');
    weightRows.set(key,row);
  }
  const originalCensus=[],physical=[],expected=[];
  const records=[];
  const add=(occ,fieldId,val,authority,unit,detail)=>records.push(
    recordsFor(basis,occ,fieldId,val,authority,unit,detail));
  // Original branch/node population is ALWAYS complete and independently
  // counted, even where no weight candidate exists.
  for(const branch of projection.branches){
    const index=branch.branchOccurrenceIndex;
    const computed=previewResult.branchRows[index];
    if(computed?.branchName!==branch.branchName)
      fail('BRANCH_COMPUTATION_DRIFT','Preview branch calculation is misordered or wrong-source');
    expected.push(branch);
    add(branch,'source.occurrence',true,'source');
    add(branch,'branch.engineering',true,'derived',null,'verified branch process computation');
  }
  for(const node of projection.nodes){
    expected.push(node);
    add(node,'source.occurrence',true,'source');
    add(node,'node.engineering',true,'derived',null,'verified original-node assessment');
  }
  for(const [branchIndex,branch] of branches.entries()){
    const sourceBranch=projection.branches[branchIndex];
    const computed=previewResult.branchRows[branchIndex];
    const effectiveNodes=children(branch,'Node');
    const ledger=prepared.ledger.retainedByBranch[branchIndex];
    if(effectiveNodes.length!==ledger.length)
      fail('RETAINED_NODE_CENSUS_DRIFT','Effective cleaned source/ledger mismatch');
    for(const [effectiveIndex,node] of effectiveNodes.entries()){
      const origin=ledger[effectiveIndex];
      if(!isXmlCiiWeightReviewNode(node)||
        !isXmlCiiWeightReviewConnectionEligible(node))continue;
      if(physical.length>=maxPhysical)
        fail('PHYSICAL_POPULATION_LIMIT','Too many selected physical facts for bounded P4 Worker; no main-thread fallback');
      const src=sourceNodeByOrdinal.get(
        JSON.stringify([branchIndex,origin.sourceNodeOrdinal]));
      if(!src||src.componentType!==field(node,'ComponentType')||
         src.componentRefNo!==field(node,'ComponentRefNo')||
         src.endpoint!==field(node,'Endpoint'))
        fail('ORIGINAL_PHYSICAL_IDENTITY_DRIFT','Cleaned physical component cannot be tied to original XML');
      const componentSignature=canonicalJson([
        src.componentType,src.componentRefNo,src.endpoint,field(node,'NodeName')]);
      const identity={sourceId,branchOccurrenceIndex:branchIndex,
        nodeOrdinal:origin.sourceNodeOrdinal,componentSignature};
      const occurrenceId=physicalOccurrenceId(identity);
      const owner={subjectType:'physical-component',sourceId,occurrenceId,
        provenance:src.provenance};
      physical.push({...identity,occurrenceId});
      expected.push(owner);
      const matched=weightRows.get(JSON.stringify([branchIndex,origin.sourceNodeOrdinal]))||null;
      const xmlWeight=positive(num(field(node,'Weight')));
      const bore=positive(num(computed.sizeMm));
      const rating=String(computed.rating??'').trim();
      // Only use length that was actually computed for the SAME original
      // component or explicitly present in its source. Never guess length.
      const explicitLength=positive(num(field(node,'ElementLengthMm')));
      const derivedLength=matched?positive(num(matched.lengthMm)):null;
      if(derivedLength!==null&&explicitLength!==null&&
        Math.abs(derivedLength-explicitLength)>0.000001)
        fail('PHYSICAL_LENGTH_DRIFT','Preview and original source ElementLengthMm disagree');
      const length=derivedLength??explicitLength;
      add(owner,'source.occurrence',true,'source');
      add(owner,'bore.mm',bore,'derived','mm','Preview resolved branch bore');
      add(owner,'length.mm',length,derivedLength===null?'source':'derived','mm',
        derivedLength===null?'Original explicit ElementLengthMm':'Preview computed original source geometry');
      add(owner,'rating',rating||null,'derived',null,'Preview resolved branch rating');
      add(owner,'mass.kg',xmlWeight,'source','kg','Original XML Weight; zero is unresolved, never accepted');
      add(owner,'component.type',src.componentType||null,'source');
      add(owner,'component.ref',src.componentRefNo||null,'source');
    }
  }
  const physicalSet=new Set(physical.map(row=>
    JSON.stringify([row.branchOccurrenceIndex,row.nodeOrdinal])));
  for(const key of weightRows.keys()){
    if(!physicalSet.has(key))
      fail('UNSELECTED_WEIGHT_COMPUTATION','Preview computed a candidate for a dropped or ineligible physical component');
  }
  // Input may contain components with no ranked suggestions: still emit a
  // complete unresolved FactRecord for them; omission is never a success.
  if(!physical.length)fail('NO_PHYSICAL_WEIGHT_OWNERS','Selected original XML has no physical Weight owner');
  if(records.length!==2*sourceOriginals.length+
    XML229_ENGINEERING_FIELDS.length*physical.length)
    fail('FIELD_POPULATION_DRIFT','Original source physical fields are incomplete');
  const requiredEngineeringFields={
    branch:['branch.engineering'],node:['node.engineering'],
    'physical-component':['bore.mm','length.mm','rating','mass.kg','component.type','component.ref'],
  };
  const ports={assertBasisDigest,canonicalJson,digestCanonical,validateFactRecord,validatePage};
  const model=await openPreviewFactReadModel({
    basis,expectedOccurrences:expected,records,ports,requiredEngineeringFields,
    verifyEngineeringComplete:({records:verified,expectedOccurrences:originals})=>
      verified.length===records.length&&
      originals.length===sourceOriginals.length+physical.length&&
      projection.branchCount===previewResult.branchRows.length,
  });
  if(!model.info.engineeringReady||model.info.computationStage!=='engineering-verified')
    fail('ENGINEERING_NOT_VERIFIED','Independent original/physical population verification did not succeed');
  const workerResult=Object.freeze({
    ...previewResult,
    coverage:{
      sourceBranchCount:projection.branchCount,
      originalNodeCount:projection.nodeCount,
      engineeringBranchCount:previewResult.branchRows.length,
      legacyReviewNodeCount:previewResult.nodeRows.length,
      verifiedOriginalOccurrenceCount:sourceOriginals.length,
      verifiedPhysicalOwnerCount:physical.length,
      verifiedPhysicalFactCount:physical.length*XML229_ENGINEERING_FIELDS.length,
    },
    engineeringAcceptance:'VERIFIED',
    fullFactPopulationAccepted:true,
    engineeringFactSnapshotId:model.info.snapshotId,
    engineeringFactCount:records.length,
  });
  return Object.freeze({model,workerResult,
    sourceOccurrenceCensus:sourceOriginals,
    workerOriginalCount:sourceOriginals.length,
    originalOccurrences:projection.nodes.map(({sourceId,branchOccurrenceIndex,nodeOrdinal})=>({
      sourceId,branchOccurrenceIndex,nodeOrdinal,
    })),
    physicalOccurrences:physical,
    expectedOriginalCount:projection.nodeCount,
    expectedModelOccurrenceCount:expected.length,
    expectedPhysicalFactCount:physical.length*XML229_ENGINEERING_FIELDS.length,
    requiredFieldIds:XML229_ENGINEERING_FIELDS,
  });
}
