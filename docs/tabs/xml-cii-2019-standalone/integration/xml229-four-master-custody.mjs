/**
 * XML229: reconcile the SAME four masters used by Source & Master, Preview
 * and Weight. Dataset-backed and restored resident rows are two storage
 * representations, not two different engineering authorities.
 *
 * Historic localStorage rows are attested to their CURRENT full content,
 * mapping and applied revision here; this is not an assertion that an
 * unprovided original file has been re-imported. Missing/corrupt restoration
 * still fails closed. A synthetic preview sample or embedded default Weight
 * master cannot silently stand in for an Owner-imported master.
 */
import {digestCanonical} from '../../../contracts/gc-pw-v1/contract.mjs';

export const XML229_FOUR_MASTER_DEFS=Object.freeze([
  Object.freeze({kind:'lineList',section:'linelist',property:'masterRows'}),
  Object.freeze({kind:'pipingClass',section:'pipingClass',property:'masterRows'}),
  Object.freeze({kind:'materialMap',section:'material',property:'mapRows'}),
  Object.freeze({kind:'weight',section:'weight',property:'masterRows'}),
]);
const fail=(code,message,kind)=>{
  const error=new Error(message);error.code=code;error.masterKey=kind;
  error.retryable=false;throw error;
};
const asObject=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};

export async function resolveXml229FourMasterCustody(config,context={},{
  restoreFailures={},
}={}){
  const masters={},attestations={};
  for(const {kind,section,property} of XML229_FOUR_MASTER_DEFS){
    const ref=asObject(context.datasetRefs?.[kind]);
    const meta=asObject(context.sourceMetadata?.[kind]);
    const rows=config?.[section]?.[property];
    const revision=context.appliedMappingRevision?.[kind];
    const count=context.rowCounts?.[kind];
    const broken=restoreFailures?.[kind];
    if(broken)fail('MASTER_RESTORE_FAILED',
      kind+' restored data has a custody failure: '+String(broken.message||broken.code||'restore failed'),kind);
    if(!Array.isArray(rows)||rows.length===0)
      fail('MASTER_CONTENT_UNAVAILABLE',
        kind+' has no complete current normalized rows. Inspect Source & Master load/restore status.',kind);
    if(count!==undefined&&(!Number.isSafeInteger(Number(count))||Number(count)!==rows.length))
      fail('MASTER_ROWCOUNT_DRIFT',
        kind+' displayed count '+count+' differs from '+rows.length+' actual normalized rows',kind);
    if(ref.datasetId){
      if(!Number.isSafeInteger(Number(ref.rowCount))||Number(ref.rowCount)!==rows.length)
        fail('MASTER_DATASET_DRIFT',
          kind+' dataset '+ref.datasetId+' does not match complete materialized row count',kind);
    }else{
      // LocalStorage restores use full resident rows, not IndexedDB refs.
      // A positive applied revision and explicit loaded source are required.
      if(meta.status!=='loaded'||!String(meta.source||'').trim()||
        !Number.isSafeInteger(Number(revision))||Number(revision)<1)
        fail('LEGACY_MASTER_CUSTODY_UNVERIFIED',
          kind+' has resident rows but no applied mapping revision and loaded source custody',kind);
      if(kind==='weight'&&meta.sourceType==='default')
        fail('WEIGHT_MASTER_NOT_IMPORTED',
          'Embedded default Weight rows cannot replace the imported Owner Weight master',kind);
    }
    const digest=await digestCanonical(rows);
    const mapping=asObject(config?.[section]?.fieldMap);
    const mappingSha256=await digestCanonical(mapping);
    const datasetId=ref.datasetId?
      String(ref.datasetId):'resident:'+kind+':sha256:'+digest;
    const effectiveRevision=Number.isSafeInteger(Number(revision))&&Number(revision)>0?
      Number(revision):(Number(ref.datasetRevision)||0);
    if(!effectiveRevision)
      fail('MASTER_MAPPING_REVISION_MISSING',
        kind+' does not have an applied mapping revision',kind);
    masters[kind]={datasetId,revision:effectiveRevision,rows,mapping};
    attestations[kind]=Object.freeze({
      kind,datasetId,revision:effectiveRevision,rowCount:rows.length,
      contentSha256:digest,mappingSha256,
      storage:ref.datasetId?'dataset':'resident',
      source:String(meta.source||ref.fileName||''),
    });
  }
  return {masters,attestations};
}
