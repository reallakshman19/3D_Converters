/** Currency diagnostics never turn a recorded report into current engineering evidence. */
import {digestUtf8,digestCanonical} from '../../contracts/gc-pw-v1/contract.mjs';
import {restraintAuditConfig} from './xml-cii-restraint-audit.js';
import {inventoryActiveSourceSupports} from './xml-cii-active-restraint-coverage.js';

const projection=job=>({...job,supportConfigJson:JSON.parse(job.supportConfigJson||'{}')});
export const ACTIVE_RESTRAINT_AUDIT_REVISION='2026-11-15-source-coverage-1';

export async function activeAuditJobIdentity(job) {
  return digestCanonical(projection(job));
}

export async function activeAuditJobManifest(job) {
  const input=projection(job),entries=await Promise.all(Object.entries(input).map(async([key,value])=>
    [key,await digestCanonical(value)]));
  return {revision:ACTIVE_RESTRAINT_AUDIT_REVISION,fields:Object.fromEntries(entries),
    sourceKind:job.sourceKind,sourceName:job.sourceName,options:job.options,
    consumed:{xmlSha256:await digestUtf8(job.sourceText),jsonSha256:await digestUtf8(job.stagedJsonText||''),
      hasStagedJson:Boolean(String(job.stagedJsonText||'').trim())},
    configuration:restraintAuditConfig(input.supportConfigJson),
    rawJsonRestraintSettings:{legacySwitch:input.supportConfigJson.useRestraintTypeBasedOnJson??null,
      mappingVersion:input.supportConfigJson.supportMapping?.version??null,
      mappingSwitch:input.supportConfigJson.supportMapping?.useJsonForRestraints??null}};
}

async function integrity(report) {
  if(!report.recorded)return report.status==='FAILED'?null:'AUDIT_NOT_RECORDED';
  const {auditSha256,...recorded}=report.recorded;
  if(await digestCanonical(recorded)!==auditSha256)return 'AUDIT_SEAL_MISMATCH';
  if(await digestCanonical(report.records)!==await digestCanonical(recorded.records))return 'AUDIT_RECORDS_CHANGED';
  if(recorded.coverage&&await digestCanonical(report.coverage)!==await digestCanonical(recorded.coverage))return 'AUDIT_COVERAGE_CHANGED';
  return null;
}

async function requestChange(job,report) {
  if(await activeAuditJobIdentity(job)===report.run.requestSha256)return null;
  const current=await activeAuditJobManifest(job),saved=report.run.requestManifest;
  const changed=saved?Object.keys({...saved.fields,...current.fields}).filter(key=>saved.fields[key]!==current.fields[key]):[];
  return {current:false,code:'RUN_INPUTS_CHANGED',changed,
    savedManifest:saved||null,currentManifest:current};
}

async function sourceCensusChanged(job,report) {
  if(!report.coverage)return false;
  const census=inventoryActiveSourceSupports(job.stagedJsonText);
  const actual=report.coverage.sources.map(({path,name,branch,fields})=>({path,name,branch,fields}));
  return await digestCanonical(census.sources)!==await digestCanonical(actual);
}

export async function inspectActiveRestraintAudit(stateRef,report,buildJob,normalizeJob) {
  try {
    const initial=stateRef.current,result=initial.result;
    const damaged=await integrity(report);
    if(damaged)return {current:false,code:damaged};
    if(result?.restraintAudit!==report||report.run?.mode!=='active-v06-compatibility')
      return {current:false,code:'RESULT_REPLACED'};
    const normalized=normalizeJob(await buildJob(initial));
    if(!normalized.ok)return {current:false,code:'CURRENT_JOB_INVALID',reason:normalized.error};
    const changed=await requestChange(normalized.job,report);
    if(changed)return changed;
    if(await sourceCensusChanged(normalized.job,report))return {current:false,code:'SOURCE_CENSUS_MISMATCH'};
    const current=stateRef.current;
    if(current.result!==result)return {current:false,code:'RESULT_CHANGED_DURING_CHECK'};
    if(await digestUtf8(result.ciiText||'')!==report.output.ciiSha256)return {current:false,code:'CII_OUTPUT_CHANGED'};
    if(await digestUtf8(result.enrichedText||'')!==report.output.enrichedSha256)return {current:false,code:'XML_OUTPUT_CHANGED'};
    const latest=normalizeJob(await buildJob(current));
    if(!latest.ok)return {current:false,code:'CURRENT_JOB_INVALID',reason:latest.error};
    const finalChange=await requestChange(latest.job,report);
    return finalChange||(current.result===stateRef.current.result?{current:true,code:'CURRENT'}:
      {current:false,code:'RESULT_CHANGED_DURING_CHECK'});
  }catch(error){return {current:false,code:'AUDIT_CURRENCY_CHECK_FAILED',reason:String(error.message)};}
}

export async function currentActiveRestraintAudit(...args) {
  return (await inspectActiveRestraintAudit(...args)).current;
}
