#!/usr/bin/env node
/**
 * C05 #203 current-mode real browser positive/negative consumer oracle.
 * Reuses unchanged #892 source-checked 3-master import, IndexedDB cold-reload,
 * and actual Worker APIs. Tracked test corpus != independently attested Owner inputs.
 * This is an *additive* oracle; original #893 fixtures remain unchanged and RED.
 */
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.XML_CII_203_URL||'http://127.0.0.1:4173';
const output=process.env.XML_CII_203_OUTPUT||'ValidationRecords/xml-cii-203-cold-bounded-consumer.json';
const seedUrl=base+'/tests/browser/xml-cii-issue-892-three-master-cold-reload-e2e.html';
const ready=async()=>{
  let error='unreachable';
  for(let i=0;i<120;i++){
    try{
      const r=await fetch(seedUrl,{cache:'no-store'});
      if(r.ok)return;
      error='HTTP '+r.status;
    }catch(e){error=String(e);}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw Error('C05 #203 seed not served: '+error);
};
await ready();
const browser=await chromium.launch({headless:true});
let receipt={
  schema:'XMLCII_C05_203_COLD_BOUNDED_CONSUMER_V1',
  passed:false,sourceClass:'TRACKED_TEST_MASTER_NOT_OWNER_AUTHENTIC',
  seedUrl:'/tests/browser/xml-cii-issue-892-three-master-cold-reload-e2e.html',
};
const pageErrors=[];
try{
  const page=await browser.newPage();
  page.on('console',m=>{if(m.type()==='error')console.error('[browser:console] '+m.text());});
  page.on('pageerror',e=>{pageErrors.push(String(e.stack||e));});
  await page.goto(seedUrl,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>globalThis.__XML_CII_ISSUE_892_DONE__===true,null,{timeout:300000});
  const seeded=await page.evaluate(()=>globalThis.__XML_CII_ISSUE_892_RESULT__);
  if(!seeded?.ok)throw Error('Tracked 3-master cold-reload seed failed: '+String(seeded?.error||'unknown'));
  receipt.seed={schema:seeded.schema,rows:seeded.masters.map(x=>({key:x.key,datasetId:x.datasetId,datasetRevision:x.datasetRevision,rowCount:x.rowCount}))};

  const data=await page.evaluate(async()=>{
    const v='c05-203-current-bounded-consumer-v1';
    const [hydration,configModule,regex,runtime,weightModule]=await Promise.all([
      import('../../tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js?v='+v),
      import('../../tabs/xml-cii-2019-standalone/xml-cii-dataset-backed-config.js?v='+v),
      import('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-smart-evidence.js?v='+v),
      import('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js?v='+v),
      import('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js?v='+v),
    ]);
    const ensure=(cond,message)=>{if(!cond)throw Error(message);};
    const reject=async(fn,pattern,label)=>{
      try{await fn();}catch(error){
        const message=String(error?.message||error);
        ensure(pattern.test(message),label+': unexpected rejection '+message);
        return message;
      }
      throw Error(label+': expected fail-closed rejection');
    };
    const blank=()=>({config:{},rawRows:{},mappingRows:{},datasetRefs:{},rowCounts:{},
      previewRows:{},sourceMetadata:{},appliedMappingRevision:{}});
    const stateRef={current:{supportConfigJson:'{}',masterContext:blank()}};
    ensure(await hydration.hydratePersistedMasterDatasets(stateRef)===true,
      'fresh Worker cold hydration did not occur');
    const context=stateRef.current.masterContext,refs=context.datasetRefs;
    const expected={pipingClass:10699,materialMap:383,weight:1595};
    for(const [key,n] of Object.entries(expected)){
      ensure(refs[key]?.datasetId && refs[key]?.datasetRevision>0,key+' restored authority missing');
      ensure(refs[key].rowCount===n,key+' restored source census mismatch');
      ensure(!stateRef.current.masterRestoreFailureIdentity?.[key],key+' recorded restore failure');
    }
    const revisionSnapshot=JSON.stringify(context.appliedMappingRevision);
    const countSourceLoads=()=>performance.getEntriesByType('resource')
      .filter(x=>/Piping_class_master\.json|PCF_MAT_MAP\.TXT|wtValveweights\.json/i.test(x.name)).length;
    const loadsBefore=countSourceLoads();

    const generic=await configModule.materializeXmlCiiDatasetBackedConfig({},stateRef.current);
    ensure(generic.pipingClass?.masterRows?.length===10699,'separate full-row generic consumer broken');
    ensure(generic.material?.mapRows?.length===383,'Mat_Map generic consumer broken');
    ensure(generic.weight?.masterRows?.length===1595,'Weight generic consumer broken');
    ensure(generic.weight.masterFingerprint===refs.weight.masterFingerprint,'Weight consumer fingerprint changed');

    const noSamples={...stateRef.current,regexTesterResult:{branchSamples:[],matchedRows:[],rejectedRows:[]}};
    const empty=await regex.materializeRegexSmartMasterContext(noSamples);
    ensure(empty.pipingClassRowCount===0,'zero-sample Regex evidence must not hydrate full 10699 rows');
    ensure(empty.boundedEvidence?.complete===true,'zero-sample bounded evidence incomplete');
    ensure(context.pipingClassRows?.length===0,'Regex mutated long-lived Piping Class resident rows');

    // Sparse, bounded native Worker scans: take ONLY the normalized Piping Class
    // field, not arbitrary numeric substrings from Rating/Size/SCH/raw rows.
    // A source-specific code must hit <= 12 Worker indexes, all with EXACT class
    // equality. The candidate is discovered, not hardcoded to an expected token.
    const scanStep=128,scanCap=96;
    let positive=null,probes=0;
    const classField=row=>String(row?.['Piping Class']??row?.pipingClass??'').trim().toUpperCase();
    for(let offset=0;offset<refs.pipingClass.rowCount&&probes<scanCap;offset+=scanStep){
      probes++;
      const source=await runtime.getMasterDatasetRows(
        'pipingClass',refs.pipingClass.datasetId,offset,1,refs.pipingClass);
      const token=classField(source?.rows?.[0]);
      if(!/^[A-Z0-9]{3,24}$/.test(token))continue;
      const found=await runtime.searchMasterDatasetRows('pipingClass',refs.pipingClass.datasetId,token);
      const indexes=Array.isArray(found?.indexes)?found.indexes:[];
      if(indexes.length<1||indexes.length>12)continue;
      const original=await runtime.getMasterDatasetRowsByIndexes(
        'pipingClass',refs.pipingClass.datasetId,indexes,refs.pipingClass);
      if(!Array.isArray(original.rows)||original.rows.length!==indexes.length)continue;
      if(!original.rows.every(row=>classField(row)===token))continue;
      positive={token,indexes,matchingMasterRows:indexes.length,
        derivedFromExactClassField:true,observedWorkerOffset:offset};
      break;
    }
    ensure(positive,'No selective exact Piping Class code found in <=96 sparse Worker probes; fail rather than claim substring evidence');
    const sample={branchName:'/AREA-DN100-'+positive.token+'/B1'};
    const sampleState={...stateRef.current,regexTesterConfig:{activeFormatIndex:0,formats:[{tokenDelimiter:'-'}]},
      regexTesterResult:{branchSamples:[sample],matchedRows:[],rejectedRows:[sample]}};
    const seenSearch=[],seenFetch=[];
    const bounded=await regex.materializeRegexSmartMasterContext(sampleState,{
      maxIndexesPerQuery:12,maxTotalIndexes:24,
      search:async(key,id,query)=>{
        ensure(key==='pipingClass'&&id===refs.pipingClass.datasetId,'positive class search wrong owner authority');
        seenSearch.push(query);
        return runtime.searchMasterDatasetRows(key,id,query);
      },
      getRowsByIndexes:async(key,id,indexes,ref)=>{
        ensure(key==='pipingClass'&&id===refs.pipingClass.datasetId,'positive class row fetch wrong owner authority');
        ensure(ref.datasetRevision===refs.pipingClass.datasetRevision,'positive class revision changed');
        ensure(indexes.length<=24,'bounded evidence index cap bypassed');
        seenFetch.push([...indexes]);
        return runtime.getMasterDatasetRowsByIndexes(key,id,indexes,ref);
      },
    });
    ensure(seenSearch.includes(positive.token),'actual selected sample failed to create positive class query');
    ensure(seenFetch.length===1&&seenFetch[0].length>0,'real Worker returned no indexed evidence rows');
    ensure(bounded.pipingClassRowCount===seenFetch[0].length,'returned rows and Worker indexes diverged');
    const independent=await runtime.getMasterDatasetRowsByIndexes(
      'pipingClass',refs.pipingClass.datasetId,seenFetch[0],refs.pipingClass);
    ensure(JSON.stringify(bounded.masterContext.pipingClassRows)===JSON.stringify(independent.rows),
      'bounded evidence rows do not match separately queried Worker indexed originals');
    ensure(independent.rows.length===positive.matchingMasterRows,
      'source-indexed row count differs from selective exact class census');
    ensure(independent.rows.every(row=>classField(row)===positive.token),
      'some indexed row is merely a substring hit, not an exact Piping Class value');
    const matchingSourceFields=['Piping Class'];
    const alternateSample={branchName:'/UNRELATED-ALPHA-NOCODE/B2'};
    const twoBucketState={...sampleState,
      regexTesterResult:{branchSamples:[sample,alternateSample],
        matchedRows:[],rejectedRows:[sample,alternateSample]}};
    const twoBucket=await regex.materializeRegexSmartMasterContext(twoBucketState);
    ensure(twoBucket.selectedBucketCount===2&&twoBucket.analysisSampleCount===2,
      'two representative structural buckets were not both selected');
    ensure(twoBucket.pipingClassRowCount===positive.matchingMasterRows,
      'adding a no-class-query second structural sample changed indexed Piping Class evidence');
    ensure(twoBucket.boundedEvidence?.complete===true,
      'two-bucket bounded evidence no longer complete');
    ensure(bounded.evidenceBasis.includes(refs.pipingClass.datasetId),'evidence not bound to source dataset');
    ensure(bounded.evidenceBasis.includes('"mappingRevision":'+context.appliedMappingRevision.pipingClass),
      'evidence lost source mapping revision');
    ensure(context.pipingClassRows.length===0,'bounded consumer retained complete Piping Class rows');

    const deliberateAbsentToken='C05_203_NONEXISTENT_NOMATCH_999999999999';
    const absent=await runtime.searchMasterDatasetRows(
      'pipingClass',refs.pipingClass.datasetId,deliberateAbsentToken);
    ensure(Array.isArray(absent?.indexes)&&absent.indexes.length===0,
      'absent query unexpectedly returned Piping Class Worker evidence');
    const wrongRevision=await reject(
      ()=>runtime.getMasterDatasetRowsByIndexes('pipingClass',refs.pipingClass.datasetId,[seenFetch[0][0]],
        {...refs.pipingClass,datasetRevision:refs.pipingClass.datasetRevision+1}),
      /Dataset revision mismatch for pipingClass/i,'stale Piping Class');
    const crossMaster=await reject(
      ()=>runtime.getMasterDatasetRowsByIndexes('pipingClass',refs.materialMap.datasetId,[0],refs.materialMap),
      /dataset belongs to materialMap/i,'cross-master dataset substitution');
    const weightFingerprint=await reject(
      ()=>runtime.getMasterDatasetRowsByIndexes('weight',refs.weight.datasetId,[0],
        {...refs.weight,masterFingerprint:'wrong-fingerprint-c05-203'}),
      /Dataset fingerprint mismatch for weight/i,'Weight fingerprint substitution');
    const nonWeightRank=await reject(
      ()=>runtime.rankMasterDatasetWeightIssues('weight',refs.materialMap.datasetId,[],
        {weight:{masterFingerprint:refs.weight.masterFingerprint}},
        {ratingMode:'preview',previewRatingSnapshot:{}}),
      /Weight Match requires a weight dataset/i,'non-Weight dataset passed to Weight Rank');

    const compactWeight=await weightModule.weightMatchConfigFromState(stateRef.current,{
      materializeRows:async()=>{throw Error('unexpected Weight compatibility reimport');},
    });
    ensure(!('masterRows' in (compactWeight.weight||{})),'Weight compact configuration gained resident rows');
    ensure(compactWeight.weight.masterFingerprint===refs.weight.masterFingerprint,
      'Weight compact configuration lost fingerprint');
    ensure(revisionSnapshot===JSON.stringify(context.appliedMappingRevision),
      'consumer read changed master applied revisions');
    ensure(loadsBefore===countSourceLoads(),'consumer refetched original master input files');

    return {
      rows:expected,originalMasterDatasetRefs:Object.fromEntries(Object.entries(refs).map(([key,ref])=>
        [key,{datasetId:ref.datasetId,datasetRevision:ref.datasetRevision,rowCount:ref.rowCount}])),
      noSamples:{evidenceRows:empty.pipingClassRowCount,masterRowCount:refs.pipingClass.rowCount,
        complete:empty.boundedEvidence.complete},
      positive:{token:positive.token,queryProbeCount:probes,
        derivedFromExactClassField:positive.derivedFromExactClassField,
        observedWorkerOffset:positive.observedWorkerOffset,
        matchingMasterRows:positive.matchingMasterRows,
        matchedNormalizedSourceFields:matchingSourceFields,
        selectedSourceSample:sample.branchName,
        actualQueries:seenSearch,indexes:seenFetch[0],rowCount:bounded.pipingClassRowCount,
        fullMasterRowCount:refs.pipingClass.rowCount,
        exactClassValueInEveryIndexedRow:true,
        twoStructuralBucketsKeptPositive:true,
        sourceRowContainsQuery:true},
      negatives:{wrongRevision,crossMaster,weightFingerprint,nonWeightRank,
        deliberateAbsentToken,absentQueryNoMatches:true},
      genericFullRowConsumerSeparate:true,compactWeightNoFullRows:true,
      noSecondOriginalSourceFetch:true,appliedRevisionsUnchanged:true,
      browserProducer:'NATIVE_CHROMIUM_WORKER_INDEXEDDB_COLD_RELOAD',
      sourceAttestedIndependently:false,ownerCorpusAuthentic:false,
    };
  });
  if(pageErrors.length)throw Error('Native page errors: '+JSON.stringify(pageErrors));
  receipt={...receipt,passed:true,...data};
} catch(error) {
  receipt={...receipt,passed:false,error:String(error?.stack||error),pageErrors};
  throw error;
} finally{
  await fs.mkdir(output.substring(0,output.lastIndexOf('/'))||'.',{recursive:true});
  await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n','utf8');
  console.log('XML_CII_203_COLD_BOUNDED_CONSUMER_RESULT '+JSON.stringify(receipt));
  await browser.close();
}
