/** Seals observations of the existing converter; grants no engineering authority. */
import {digestUtf8,digestCanonical} from '../../contracts/gc-pw-v1/contract.mjs';
import {activeRestraintRecords,recordActiveRestraintStage} from './xml-cii-active-restraint-journal.js';
import {verifyRecordedRestraintFields} from './xml-cii-restraint-audit-verify.js';
import {activeSourceCoverage} from './xml-cii-active-restraint-coverage.js';
import {attachSourceNativeTrace} from './xml-cii-source-native-trace.js';

export {activeAuditJobIdentity,activeAuditJobManifest,inspectActiveRestraintAudit,currentActiveRestraintAudit} from './xml-cii-active-audit-currency.js';

function memberAt(json,path) {
  const parts=String(path).match(/\$|\.[A-Za-z_][A-Za-z_0-9]*|\[\d+\]/g)||[];
  if(parts.join('')!==path||parts.shift()!=='$')throw Error('ACTIVE_AUDIT_SOURCE_PATH_INVALID');
  return parts.reduce((value,key)=>value?.[key[0]==='.'?key.slice(1):Number(key.slice(1,-1))],json);
}

function validateSelectedSources(journal) {
  const json=JSON.parse(journal.stagedJsonText||'null');
  for(const event of journal.events)for(const source of event.sources||[]) {
    const original=memberAt(json,source.path);
    if(!original||JSON.stringify(original.attributes||{})!==JSON.stringify(source.fields))
      throw Error('ACTIVE_AUDIT_SOURCE_FIELDS_MISMATCH');
  }
}

async function sealJournal(journal,records,coverage) {
  const [xmlSha256,jsonSha256,configSha256]=await Promise.all([
    digestUtf8(journal.sourceText),digestUtf8(journal.stagedJsonText),digestUtf8(journal.configJson)]);
  const stages=await Promise.all(journal.stages.map(async({xmlText,...stage})=>
    ({...stage,xmlSha256:await digestUtf8(xmlText)})));
  const recorded={schema:journal.schema,producer:'active-v06-existing-pipeline',privateOwnerLocalOnly:true,
    basis:{xmlSha256,jsonSha256,configSha256},stages,events:journal.events,records,coverage};
  return {...recorded,auditSha256:await digestCanonical(recorded)};
}

export async function finishActiveRestraintAudit(journal,result) {
  if(!journal)return {schema:'XML229.RestraintAuditResult.v1',status:'NOT_RECORDED',
    reason:'The active enrichment did not record its decisions.',records:[]};
  if(result.enrichedText)recordActiveRestraintStage(journal,'native-engine-enrichment',result.enrichedText);
  let records=activeRestraintRecords(journal),errors=[];
  try {
    validateSelectedSources(journal);
    if(result.ciiInputSource==='topofix')throw Error('ACTIVE_AUDIT_TOPOFIX_RECONCILIATION_NOT_QUALIFIED');
    if(result.ciiText)({records,errors}=verifyRecordedRestraintFields(records,{
      ciiText:result.ciiText,nativeXmlText:journal.stages.at(-1).xmlText}));
  }catch(error){errors.push({code:String(error.message)});}
  const coverage=attachSourceNativeTrace(activeSourceCoverage(journal,records),records,Boolean(result.ciiText));
  const recorded=await sealJournal(journal,records,coverage);
  const failed=records.filter(row=>result.ciiText&&row.status!=='VERIFIED').length;
  const provenanceGaps=records.filter(row=>row.after&&(!row.originalTarget||row.source.kind==='pipeline-stage')).length;
  return {schema:'XML229.RestraintAuditResult.v1',privateOwnerLocalOnly:true,
    scope:'Active v0.6 restraint transformations and CII fields; observational evidence, not engineering acceptance',
    status:errors.length||failed||coverage.summary.failed?'FAILED':provenanceGaps||coverage.status!=='COMPLETE'?'PARTIAL':result.ciiText?'VERIFIED':'CII_NOT_RUN',recorded,records,errors,coverage,
    summary:{recorded:records.length,verified:records.filter(row=>row.status==='VERIFIED').length,failed,provenanceGaps},
    output:{ciiSha256:await digestUtf8(result.ciiText||''),enrichedSha256:await digestUtf8(result.enrichedText||'')},
    run:{mode:'active-v06-compatibility'}};
}

export async function captureActiveRestraintAudit(journal,result) {
  try{return await finishActiveRestraintAudit(journal,result);}
  catch(error){return {schema:'XML229.RestraintAuditResult.v1',status:'FAILED',privateOwnerLocalOnly:true,
    scope:'Active restraint audit failed; conversion output was retained.',records:[],
    errors:[{code:'ACTIVE_AUDIT_CAPTURE_FAILED',message:String(error.message)}],
    output:{ciiSha256:await digestUtf8(result.ciiText||''),enrichedSha256:await digestUtf8(result.enrichedText||'')},
    run:{mode:'active-v06-compatibility'}};}
}
