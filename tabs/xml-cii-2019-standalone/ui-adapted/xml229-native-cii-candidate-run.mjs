/**
 * Governed XML229 native-weight consumption diagnostic.
 * This deliberately runs the ACTUAL native converter in-memory, then a second
 * JS parser over its ACTUAL CII output; it does not release CII bytes.
 */
import {readTextFile,enrichSupportConfigJson,workflowOptionsFromState,sourceNameFromState}
 from '../xml-cii-workflow-ui-adapter.js';
import {runXmlCii2019StandaloneEngineJob}
 from '../xml-cii-workflow-engine-client.js';
import {reconcileXml229ActualCiiAgainstFinal}
 from '../../../converters/xml-cii2019-core/xml229-native-cii-independent-reconciliation.mjs';

const fail=(code)=>{const error=new Error(code);error.code=code;throw error;};

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
 const sourceText=String((await readTextFile(state.sourceFile))??state.sourceText??'');
 const stagedJsonText=String((await readTextFile(state.stagedJsonFile))??
   state.stagedJsonText??'');
 if(!sourceText.trim()||!stagedJsonText.trim())
  fail('NATIVE_CANDIDATE_ORIGINAL_SOURCE_REQUIRED');
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
 if(native?.ok!==true||!native.ciiText||!native.xml229NativeMassDiagnostic)
  fail('NATIVE_CANDIDATE_CONVERTER_FAILED');
 const independent=await reconcileXml229ActualCiiAgainstFinal({
  originalXmlText:sourceText,packet,ciiText:native.ciiText,
  writerDiagnostic:native.xml229NativeMassDiagnostic,
 });
 const after=await session.readNativeFinalIntent();
 if(!isCurrent()||after?.intentSha256!==packet.finalIntentSha256)
  fail('NATIVE_CANDIDATE_FINAL_CHANGED_DURING_OUTPUT');
 // Never return the raw candidate CII or a downloadable result. The output is
 // a non-releasing diagnostic until a separately authored G5 child lineage
 // and release policy are supported.
 return Object.freeze({
  schema:'XML229.GovernedNativeCandidateResult.v1',
  status:independent.status,
  physicalCount:independent.physicalCount,
  nativeRigidCount:independent.nativeRigidCount,
  actualCiiSha256:independent.actualCiiSha256,
  massConsumptionVerified:independent.massConsumptionVerified===true,
  nativeCiiReleaseAuthorized:false,
  reason:'Strict one-to-one mass consumption verified; independent post-split child geometry lineage and native release remain unverified.',
 });
}
