// XML229 A2 SHADOW ONLY — immutable original-source fact custody, never engineering review.
// No active Preview/Run routing, no legacy nodeRows promotion, no implicit ALL fallback.
import {createPreviewBasis} from '../ui-adapted/xml-cii-adapted-preview-facts-basis.js';
import {projectXmlCiiOccurrences} from '../ui-adapted/xml-cii-adapted-preview-facts-xml-source.js';
import {buildXmlCiiSourceFactRecords,openPreviewFactReadModel}
  from '../ui-adapted/xml-cii-adapted-preview-facts-read-model.js';
import {assertBasisDigest,canonicalJson,digestCanonical,digestUtf8,
  validateFactRecord,validatePage} from '../../../contracts/gc-pw-v1/contract.mjs';

export class Xml229ShadowError extends Error {
  constructor(code,message) {super(message);this.name='Xml229ShadowError';this.code=code;}
}
const fail=(code,message)=>{throw new Xml229ShadowError(code,message);};
const check=(ok,code,message)=>{if(!ok)fail(code,message);};
const keyed=(x)=>JSON.stringify([x?.subjectType,x?.sourceId,x?.occurrenceId]);
const isOrdinal=(n)=>Number.isSafeInteger(n)&&n>=0;
const own=(o,key)=>Object.prototype.hasOwnProperty.call(o,key);
// Authenticate the real Worker's original physical SOURCE facts, without
// converting them into reviewed engineering facts. Independent second parser
// is deliberate here: a shadow verifier must not attest the Worker's own data.
const direct=(node,key)=>[...(node?.childNodes||[])].filter(x=>
  x.nodeType===1&&String(x.localName||x.nodeName).replace(/^.*:/,'')===key);
function verifyPhysicalAudit({audit,basis,source,projection,parseXml}) {
  check(audit?.schema==='xml229-physical-source-audit/v1'
    &&audit.sourceOnly===true&&audit.engineeringReady===false
    &&Array.isArray(audit.pages)&&audit.originalNodeCount===projection.nodeCount
    &&audit.sourceFactCount===projection.nodeCount*4,
    'UNVERIFIED_PHYSICAL_AUDIT','Worker source observation counts or authority not verified');
  const xml=(parseXml||((value)=>new DOMParser().parseFromString(value,'application/xml')))(source.text);
  const originalNodes=direct(xml.documentElement,'Pipe')
    .flatMap(p=>direct(p,'Branch').flatMap(b=>direct(b,'Node')));
  check(originalNodes.length===projection.nodes.length,'PHYSICAL_ORIGINAL_MISMATCH',
    'Independent raw XML occurrence census disagrees with Worker');
  const spec=[['source.position.xyz','Position'],['source.outsideDiameter.mm','OutsideDiameter'],
    ['source.wallThickness.mm','WallThickness'],['source.weight.kg','Weight']];
  const all=[];let offset=0;
  for(const page of audit.pages){
    check(page?.basisId===basis.basisId&&page.schemaVersion==='gc-pw/1.0'
      &&page.complete===false&&page.totalCount===audit.sourceFactCount
      &&Array.isArray(page.items)&&page.items.length>0&&page.items.length<=200,
      'PHYSICAL_PAGE_INVALID','Source-only page or basis signature is invalid');
    offset+=page.items.length;
    check(page.nextCursor===(offset<audit.sourceFactCount?String(offset):null),
      'PHYSICAL_PAGE_ORDER','Physical source pages are reordered/truncated');
    all.push(...page.items);
  }
  check(all.length===audit.sourceFactCount,'PHYSICAL_PAGE_TRUNCATED','Source physical facts are missing');
  for(let index=0;index<projection.nodes.length;index++){
    const occurrence=projection.nodes[index],node=originalNodes[index];
    for(let field=0;field<spec.length;field++){
      const [fieldId,tag]=spec[field],record=all[index*4+field];
      const raw=String(direct(node,tag)[0]?.textContent||'').trim();
      const parsed=tag==='Position'
        ?(raw?raw.split(/\s+/).map(Number):[])
        :raw===''?null:Number(raw);
      const expected=tag==='Position'
        ?parsed.length===3&&parsed.every(Number.isFinite)?parsed:null
        :parsed!==null&&Number.isFinite(parsed)?parsed:null;
      check(record?.subjectType==='node'&&record?.sourceId===occurrence.sourceId
        &&record.occurrenceId===occurrence.occurrenceId
        &&record.basisId===basis.basisId&&record.fieldId===fieldId
        &&record.extensions?.originalText===(raw||null)
        &&JSON.stringify(record.value)===JSON.stringify(expected)
        &&record.authority===(expected===null?'unresolved':'source')
        &&record.provenance?.[0]?.sourceRef===occurrence.sourceId,
        'PHYSICAL_FIELD_MISMATCH','Source observation does not match independent original node '
          +JSON.stringify([index,fieldId]));
    }
  }
  return all;
}

/**
 * An additive, source-only GC-PW custody probe for one exact Mode-A XML source.
 * The independent expected census MUST be produced outside this projection
 * (original XML walk or an owner-verified selection receipt), never inferred
 * from the returned FactRecords or review-eligible legacy nodeRows.
 *
 * There is intentionally NO openWeightReview() success path here. The active
 * Worker still reports NOT_ASSESSED/false; only an independently verified
 * full physical engineering producer may later use the existing GC-PW
 * openGcPwPreviewWeightSession() boundary.
 */
export async function openXml229SourceShadow({
  source,sourceGeneration,scope,masters,config={},overrides={},stagedSource=null,
  expectedOccurrences,expectedSelectedPopulation,isCancelled=()=>false,
  sha256=digestUtf8,parseXml=null,workerSourcePhysicalAudit=null,
}={}) {
  check(source&&typeof source.sourceId==='string'&&!!source.sourceId.trim()
    &&source.mediaType==='application/xml'&&typeof source.text==='string'&&!!source.text.trim(),
    'SOURCE_REQUIRED','Exact original XML bytes and nonempty sourceId are required');
  check(typeof sourceGeneration==='string'&&!!sourceGeneration.trim(),
    'SOURCE_GENERATION_REQUIRED','Caller must supply per-file authenticated source generation');
  check(scope&&['all','branches'].includes(scope.mode),
    'EXPLICIT_SCOPE_REQUIRED','Explicit all/branches scope, never implicit ALL');
  check(scope.mode==='all'
    ? (!own(scope,'branches')||scope.branches===null)
    : Array.isArray(scope.branches)&&scope.branches.length>0
      &&scope.branches.every(isOrdinal)&&new Set(scope.branches).size===scope.branches.length,
    'INVALID_SCOPE','Selected branch ordinals must be unique; ALL must be explicit');
  check(masters&&typeof masters==='object'&&!Array.isArray(masters),
    'MASTERS_REQUIRED','Actual master datasets and revisions required');
  check(Array.isArray(expectedOccurrences)&&expectedOccurrences.length>0
    &&expectedSelectedPopulation&&isOrdinal(expectedSelectedPopulation.branchCount)
    &&isOrdinal(expectedSelectedPopulation.nodeCount),
    'INDEPENDENT_CENSUS_REQUIRED','An external original-source selected census is mandatory');
  check(typeof isCancelled==='function'&&typeof sha256==='function',
    'INVALID_PORT','Cancellation and SHA-256 ports required');

  const readScope=()=>scope.mode==='all'
    ?[{sourceId:source.sourceId,selectionRef:'all@generation:'+sourceGeneration}]
    :scope.branches.map(ordinal=>({
      sourceId:source.sourceId,selectionRef:'original-branch:'+ordinal+'@generation:'+sourceGeneration,
    }));
  const readInput=()=>({
    domainId:'xml-cii/2019',sources:[source],selection:readScope(),
    stagedSource,masters,config,overrides,sha256,
  });
  const cancelled=()=>check(!isCancelled(),'CANCELLED','Source shadow job superseded');
  cancelled();
  const basis=await createPreviewBasis(readInput());
  await assertBasisDigest(basis);
  cancelled();

  const projection=projectXmlCiiOccurrences({
    xmlText:source.text,mode:'A',sourceId:source.sourceId,
    selection:scope.mode==='all'?null:scope.branches.map(branchOrdinal=>({
      sourceId:source.sourceId,branchOrdinal,
    })),parseXml,
  });
  cancelled();
  check(projection.branchCount===expectedSelectedPopulation.branchCount
    &&projection.nodeCount===expectedSelectedPopulation.nodeCount,
    'SOURCE_POPULATION_MISMATCH','Actual source/selection population differs from independent oracle');

  const actual=[...projection.branches,...projection.nodes];
  const original=new Set();
  for(const row of expectedOccurrences) {
    check(['branch','node'].includes(row?.subjectType)
      &&row.sourceId===source.sourceId&&typeof row.occurrenceId==='string',
      'INDEPENDENT_ORIGINAL_ID_INVALID','Unselected/unknown original occurrence receipt');
    const id=keyed(row);
    check(!original.has(id),'DUPLICATE_ORIGINAL','Duplicate independent occurrence identity');
    original.add(id);
  }
  check(actual.length===original.size&&actual.every(item=>original.has(keyed(item))),
    'SOURCE_IDENTITY_MISMATCH','Original selected occurrence identities or ordinals disagree');

  // Keep full source field custody, including negative NodeNumber and repeated
  // Branchname. No conversion into physical engineering facts is authorized.
  const records=buildXmlCiiSourceFactRecords({basisId:basis.basisId,projection});
  if(workerSourcePhysicalAudit!==null){
    check(scope.mode==='all','PHYSICAL_SCOPED_WORKER_PENDING',
      'Current physical Worker cannot attest selected-zone original source');
    records.push(...verifyPhysicalAudit({audit:workerSourcePhysicalAudit,
      basis,source,projection,parseXml}));
  }
  const ports={assertBasisDigest,canonicalJson,digestCanonical,validateFactRecord,validatePage};
  const model=await openPreviewFactReadModel({basis,expectedOccurrences,records,ports});
  cancelled();

  // Re-read every mutable caller input after awaited work, not just the first
  // source-text/row-count snapshot. The source-generation is part of scope SHA.
  const fresh=await createPreviewBasis(readInput());
  check(fresh.basisId===basis.basisId,'STALE_INPUT_BASIS',
    'Source, selection, generation, masters, config or overrides changed after freeze');
  cancelled();
  check(model.info.engineeringReady===false
    &&model.info.computationStage==='source-custody-only',
    'UNAPPROVED_ENGINEERING','Source census must never grant engineering acceptance');

  return Object.freeze({
    status:'SOURCE_CUSTODY_ONLY',basisId:basis.basisId,
    basis,sourceId:source.sourceId,sourceGeneration,
    selectedBranchCount:projection.branchCount,
    selectedNodeCount:projection.nodeCount,
    sourceFactCount:records.length,readModel:model,
    getFacts:args=>model.getFacts({...args,basisId:basis.basisId}),
    openWeightReview(){fail('ENGINEERING_FACTS_UNVERIFIED',
      'No complete source-bound physical engineering FactRecords or independent approval');},
  });
}
