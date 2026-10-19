/**
 * XML229 governed Final -> actual native converter candidate. NONRELEASING.
 * Normal Run/ZIP and engineering release remain HELD.
 * Returns aggregate proof only, never private CII bytes or original identities.
 */
import {runXmlCii2019Workflow} from '../xml-cii-workflow-api-atta-default.js';
import {runXmlCii2019StandaloneEngineJob} from '../xml-cii-workflow-engine-client.js';
import {reconcileXml229NonreleasingNativeOutput}
  from './xml229-native-cii-output-reconcile.mjs';

const HEX=/^[a-f0-9]{64}$/i;
function deny(code) {
  const error=new Error(code);
  error.code=code;error.retryable=false;
  throw error;
}
async function digest(value) {
  if(!globalThis.crypto?.subtle?.digest)deny('XML229_CANDIDATE_CRYPTO_UNAVAILABLE');
  const bytes=new TextEncoder().encode(value);
  const data=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(data)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function acceptedIntent(intent,receipt) {
  return intent?.schema==='XML229.NativeFinalPhysicalIntent.v1' &&
    intent.eligibleForEngineBinding===true &&
    intent.nativeCiiReleaseAuthorized===false &&
    intent.basisId===receipt.basisId &&
    intent.sourceGenerationId===receipt.sourceGenerationId &&
    HEX.test(intent.intentSha256||'') &&
    Number.isSafeInteger(intent.physicalCount) && intent.physicalCount>0;
}
function acceptedTransfer(proof,intent,receipt,sha) {
  return proof?.schema==='XML229.R2.OriginalPhysicalEngineInputTransfer.v1' &&
    proof.status==='ENGINE_INPUT_MASS_TRANSFER_VERIFIED_ONLY' &&
    proof.complete===true && proof.transferObserved===true &&
    proof.mappingKind==='STRICT_EXACT_PRE_SPLIT' &&
    proof.basisId===intent.basisId &&
    proof.originalJsonSha256===receipt.originalJsonSha256 &&
    proof.sourceGenerationId===receipt.sourceGenerationId &&
    proof.finalIntentSha256===intent.intentSha256 &&
    proof.engineInputSha256===sha &&
    proof.nativeCiiReleaseAuthorized===false &&
    proof.nativeCiiPhysicalSlotVerified===false &&
    proof.originalPhysicalCount===intent.physicalCount &&
    proof.verifiedEnginePhysicalCount===intent.physicalCount &&
    Array.isArray(proof.matches) && proof.matches.length===intent.physicalCount;
}

/**
 * Execute the existing full branch-format + parity + native Python workflow
 * with an R2 Worker attestation inserted at its actual engine-job boundary.
 * The caller must NOT store or export CII. No normal Run authorization changes.
 */
export async function runXml229NonreleasingNativeCandidate({
  job,session,assertCurrent=()=>{},
  runWorkflow=runXmlCii2019Workflow,
  runEngine=runXmlCii2019StandaloneEngineJob,
}={}) {
  if(!job||!['xml','auto'].includes(job.sourceKind)||
     typeof job.sourceText!=='string'||!job.sourceText.trim()||
     !session||session.closed===true||
     typeof session.readNativeFinalIntent!=='function'||
     typeof session.prepareEngineInputMasses!=='function'||
     typeof assertCurrent!=='function')
    deny('XML229_CANDIDATE_LIVE_SOURCE_REQUIRED');
  assertCurrent();
  const receipt=session.receipt;
  if(!receipt||!HEX.test(receipt.basisId||'')||
     !HEX.test(receipt.originalJsonSha256||'')||
     !receipt.sourceId||!receipt.sourceGenerationId)
    deny('XML229_CANDIDATE_RECEIPT_INVALID');
  const intent=await session.readNativeFinalIntent();
  assertCurrent();
  if(!acceptedIntent(intent,receipt))
    deny('XML229_CANDIDATE_FINAL_INTENT_UNQUALIFIED');
  let count=0,transfer=null,privateWitness=null;
  const native=await runWorkflow(job,{
    engineRunner:async engineJob=>{
      assertCurrent();
      count++;
      if(count!==1||engineJob?.sourceKind!=='xml'||
         typeof engineJob.sourceText!=='string'||!engineJob.sourceText.trim())
        deny('XML229_CANDIDATE_ENGINE_INPUT_INVALID');
      // Actual source-bound Final masses are written inside the SAME current
      // GC-PW Worker to the ordinary parity XML by original occurrence ID.
      // Worker reruns R2 on those EXACT bytes before returning them.
      const prepared=await session.prepareEngineInputMasses({
        engineInputXmlText:engineJob.sourceText,
      });
      assertCurrent();
      if(prepared?.schema!=='XML229.ReviewedEngineMassCandidate.v1'||
         typeof prepared.engineInputXmlText!=='string'||
         prepared.nativeCiiReleaseAuthorized!==false||
         prepared.nativeCiiPhysicalSlotVerified!==false)
        deny('XML229_CANDIDATE_ENGINE_MASS_WRITE_REJECTED');
      const inputSha=await digest(prepared.engineInputXmlText);
      const proof=prepared.transfer;
      if(!acceptedTransfer(proof,intent,receipt,inputSha))
        deny('XML229_CANDIDATE_ENGINE_TRANSFER_REJECTED');
      transfer=proof;
      // Exact attested engine input is now native CLI input. No SECOND
      // staged-JSON pass; later Python transformations still need G5 proof.
      const nativeResult=await runEngine({
        ...engineJob,sourceText:prepared.engineInputXmlText,
        stagedJsonText:'',xml229NativeCandidateWitness:true,
        options:{...engineJob.options,outputMode:'cii-only'},
      });
      privateWitness=nativeResult?.nativeCandidateWitness;
      return nativeResult;
    },
  });
  assertCurrent();
  if(count!==1||!transfer||native?.ok!==true||
     typeof native.ciiText!=='string'||!native.ciiText.trim())
    deny('XML229_CANDIDATE_NATIVE_OUTPUT_UNAVAILABLE');
  const after=await session.readNativeFinalIntent();
  assertCurrent();
  if(!acceptedIntent(after,receipt)||after.intentSha256!==intent.intentSha256)
    deny('XML229_CANDIDATE_FINAL_CHANGED');
  const reconciled=await reconcileXml229NonreleasingNativeOutput({
    transfer,witness:privateWitness,ciiText:native.ciiText,
  });
  assertCurrent();
  const ciiSha=await digest(native.ciiText);
  if(ciiSha!==reconciled.ciiSha256)
    deny('XML229_CANDIDATE_OUTPUT_SHA_CHANGED');
  return Object.freeze({
    schema:'XML229.NonreleasingNativeProductionCandidate.v1',
    status:'ACTUAL_NATIVE_CONVERTER_EXECUTED_NOT_RELEASED',
    basisId:intent.basisId,finalIntentSha256:intent.intentSha256,
    engineInputSha256:transfer.engineInputSha256,ciiSha256:ciiSha,
    originalPhysicalCount:transfer.originalPhysicalCount,
    verifiedEnginePhysicalCount:transfer.verifiedEnginePhysicalCount,
    actualNativeCiiProduced:true,
    nativeOutputStatus:reconciled.status,
    nativeElements:reconciled.actualNativeElements,
    nativeRigidRecords:reconciled.actualNativeRigidRecords,
    nativeRigidObserved:reconciled.nativeRigidObserved,
    unresolvedNativeOwners:reconciled.unresolved,
    unresolvedByCause:reconciled.reasons,
    byComponentType:reconciled.byType,
    physicalMatch2ConsumptionVerified:false,
    nativeCiiPhysicalSlotVerified:false,
    independentOriginalToNativeGeometryVerified:false,
    nativeCiiReleaseAuthorized:false,
    ciiDownloadAuthorized:false,
  });
}
