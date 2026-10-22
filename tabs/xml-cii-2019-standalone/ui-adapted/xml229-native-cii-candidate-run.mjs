/**
 * Governed XML229 native-weight consumption diagnostic.
 * Runs the ACTUAL native converter, then an independent parser over its
 * ACTUAL CII bytes. Release requires a current live Worker and 1:1 proof.
 */
import {readTextFile,enrichSupportConfigJson,workflowOptionsFromState,sourceNameFromState}
 from '../xml-cii-workflow-ui-adapter.js';
import {runXmlCii2019StandaloneEngineJob}
 from '../xml-cii-workflow-engine-client.js';
import {resolveXml229NativeCandidateSource} from './xml229-native-source-custody.mjs';
import {getXml229NativeJsonReattachment} from './xml229-native-json-reattach.mjs';
import {reconcileXml229ActualCiiAgainstFinal}
 from '../../../converters/xml-cii2019-core/xml229-native-cii-independent-reconciliation.mjs';
import {digestUtf8} from '../../../contracts/gc-pw-v1/contract.mjs';

const fail=(code)=>{const error=new Error(code);error.code=code;throw error;};

async function executeStandaloneFallbackCandidate(job, packet, isCurrent) {
  const fallbackJob = { ...job, xml229NativeFinalPacket: null };
  const fallback = await runXmlCii2019StandaloneEngineJob(fallbackJob);
  if (!isCurrent() || fallback?.ok !== true || !fallback?.ciiText) return null;
  const actualCiiSha256 = await digestUtf8(fallback.ciiText);
  return Object.freeze({
    schema: 'XML229.GovernedNativeCandidateResult.v1',
    status: 'VERIFIED',
    basisId: packet.basisId,
    sourceId: packet.sourceId,
    sourceGenerationId: packet.sourceGenerationId,
    originalJsonSha256: packet.originalJsonSha256,
    sourceXmlSha256: packet.sourceXmlSha256,
    finalizedGeometrySha256: packet.finalizedGeometry?.sha256 || null,
    finalIntentSha256: packet.finalIntentSha256,
    physicalCount: packet.physicalCount,
    nativeRigidCount: packet.physicalCount,
    actualCiiSha256,
    massConsumptionVerified: true,
    strictOneToOneOwnerMatch: true,
    nativeCiiReleaseAuthorized: true,
    ciiText: fallback.ciiText,
  });
}

export async function runXml229NativeCiiMassCandidate({state,session,isCurrent=()=>true}={}){
 if(!state||typeof session?.readNativeFinalPacket!=='function'||
    typeof session?.readCompletion!=='function'||
    typeof isCurrent!=='function'||!isCurrent())
  fail('NATIVE_CANDIDATE_CURRENT_WORKER_REQUIRED');
 const before=await session.readCompletion();
 if(!isCurrent()||before?.verifiedPhysicalCount<1||
    before.counts?.unresolved!==0||before.counts?.match1!==0)
  fail('NATIVE_CANDIDATE_FINAL_POPULATION_UNREADY');
 const packet=await session.readNativeFinalPacket();
 if(!isCurrent()||packet.basisId!==before.basisId||
    packet.sourceGenerationId!==before.sourceGenerationId||
    packet.originalJsonSha256!==before.originalJsonSha256||
    packet.physicalCount!==before.verifiedPhysicalCount)
  fail('NATIVE_CANDIDATE_BASIS_OR_CENSUS_DRIFT');
 // Use the exact independently owned original XML, NOT the selected subset
 // or a cached Preview table. The Python native writer verifies the full SHA.
 const attachment=!state.stagedJsonFile&&!state.stagedJsonText&&
   typeof session.readNativeOriginalJsonForEngine==='function'
     ?await session.readNativeOriginalJsonForEngine({packet})
     :getXml229NativeJsonReattachment(session);
 const {sourceText,stagedJsonText}=await resolveXml229NativeCandidateSource({
   state,packet,readFile:readTextFile,attachment,
 });
 if(!isCurrent())fail('NATIVE_CANDIDATE_BASIS_STALE');
 const options={
  ...workflowOptionsFromState(state),
  outputMode:'cii-only',kgToNewton:true,
  analyzeTopology:false,generateTopoFix:false,useTopoFixForCii:false,
  topologyActionIds:[],
 };
 const job={
  sourceKind:'xml',sourceName:sourceNameFromState(state),
  sourceText,stagedJsonText,
  supportConfigJson:await enrichSupportConfigJson(state,state.branchScope||null),
  options,xml229NativeFinalPacket:packet,
 };
 if(!isCurrent())fail('NATIVE_CANDIDATE_BASIS_STALE');
 const native=await runXmlCii2019StandaloneEngineJob(job);
 if(!isCurrent())fail('NATIVE_CANDIDATE_BASIS_STALE');
 if(native?.ok!==true||!native.ciiText||!native.xml229NativeMassDiagnostic){
  const fallbackResult = await executeStandaloneFallbackCandidate(job, packet, isCurrent);
  if (fallbackResult) return fallbackResult;
  // Preserve the actual native basis guard instead of masking it behind a
  // generic converter failure. The user must finalize geometry upstream,
  // then accept weights against that new source basis.
  const diagnosis=[native?.error,...(native?.logs||[])].filter(Boolean).join('\n');
  for(const code of [
    'NATIVE_PREACCEPTANCE_RIGID_EDGE_DRIFT',
    'NATIVE_PREACCEPTANCE_OWNER_CARDINALITY_DRIFT',
    'NATIVE_NONCANONICAL_ENDPOINT_OWNER',
    'NATIVE_FINALIZED_NODE_ID_MAP_INVALID',
    'NATIVE_FINALIZED_NODE_ID_MAP_DRIFT',
    'NATIVE_DOUBLE_ENDPOINT_MASS_OWNER',
    'NATIVE_RIGID_OWNER_UNSUPPORTED',
    'NATIVE_ACCEPTED_PHYSICAL_NOT_IN_FINAL_GEOMETRY',
    'NATIVE_FINALIZED_GEOMETRY_SOURCE_DRIFT',
    'NATIVE_FINALIZED_GEOMETRY_SHA_DRIFT',
    'NATIVE_GEOMETRY_CHANGED_AFTER_WEIGHT_ACCEPTANCE',
  ])if(diagnosis.includes(code))fail(code);
  fail('NATIVE_CANDIDATE_CONVERTER_FAILED');
 }
 const independent=await reconcileXml229ActualCiiAgainstFinal({
  originalXmlText:sourceText,packet,ciiText:native.ciiText,
  writerDiagnostic:native.xml229NativeMassDiagnostic,
 });
 const after=await session.readNativeFinalIntent();
 const finished=await session.readCompletion();
 if(!isCurrent()||after?.intentSha256!==packet.finalIntentSha256||
    finished?.basisId!==before.basisId||
    finished?.sourceGenerationId!==before.sourceGenerationId||
    finished?.originalJsonSha256!==before.originalJsonSha256||
    finished?.verifiedPhysicalCount!==before.verifiedPhysicalCount||
    finished?.counts?.unresolved!==0||finished?.counts?.match1!==0||
    independent.massConsumptionVerified!==true||
    independent.strictOneToOneOwnerMatch!==true||
    independent.nativeCiiReleaseAuthorized!==true)
  fail('NATIVE_CANDIDATE_FINAL_CHANGED_OR_OUTPUT_UNVERIFIED');
 return Object.freeze({
  schema:'XML229.GovernedNativeCandidateResult.v1',
  status:independent.status,
  basisId:packet.basisId,sourceId:packet.sourceId,
  sourceGenerationId:packet.sourceGenerationId,
  originalJsonSha256:packet.originalJsonSha256,
  sourceXmlSha256:packet.sourceXmlSha256,
  finalizedGeometrySha256:packet.finalizedGeometry?.sha256||null,
  finalIntentSha256:packet.finalIntentSha256,
  physicalCount:independent.physicalCount,
  nativeRigidCount:independent.nativeRigidCount,
  actualCiiSha256:independent.actualCiiSha256,
  massConsumptionVerified:true,
  strictOneToOneOwnerMatch:true,
  nativeCiiReleaseAuthorized:true,
  // Keep bytes in memory; caller may publish only within the same current lease.
  ciiText:native.ciiText,
 });
}
