/** Allowlisted, non-authorizing failure evidence for XML229 native CII.
 * Original stderr, tracebacks, file paths and model contents never escape.
 */
const NATIVE_GUARDS=Object.freeze([
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
]);
const STAGES=new Set([
 'PYODIDE_INITIALIZE','SCRIPT_LOAD','BASE_MODULE_RESET',
 'INPUT_PREPARATION','TOPOLOGY_STAGE','ENRICH_XML',
 'CII_CONVERSION','MASS_PROOF_READ','MASS_PROOF_VERIFY',
]);
export const XML229_NATIVE_FAILURE_SCHEMA='XML229.NativeConverterFailure.v1';
export function diagnoseXml229NativeConverterFailure(native){
 const category=native?.ok!==true?'ENGINE_FAILED':
   !native?.ciiText?'CII_OUTPUT_MISSING':'NATIVE_MASS_PROOF_MISSING';
 const phase=category==='ENGINE_FAILED'&&STAGES.has(native?.nativeFailurePhase)
   ?native.nativeFailurePhase:
   category==='CII_OUTPUT_MISSING'?'CII_CONVERSION':
   category==='NATIVE_MASS_PROOF_MISSING'?'MASS_PROOF_READ':'UNKNOWN';
 const messages=[native?.error,...(Array.isArray(native?.logs)?native.logs:[])]
   .filter(x=>typeof x==='string').join('\n');
 const code=NATIVE_GUARDS.find(x=>messages.includes(x))||
   'NATIVE_CANDIDATE_CONVERTER_FAILED';
 return Object.freeze({
   schema:XML229_NATIVE_FAILURE_SCHEMA,code,category,phase,
   candidatePublished:false,nativeCiiReleaseAuthorized:false,
 });
}
