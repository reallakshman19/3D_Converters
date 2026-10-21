/** Resolve exact governed native XML; O1 JSON bytes remain in the Worker when UI has no file.
 * The current source-bound Worker Final packet, not UI JSON, is the authority.
 */
import {digestUtf8} from '../../../contracts/gc-pw-v1/contract.mjs';

const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const text=value=>typeof value==='string'?value:'';
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);

export async function resolveXml229NativeCandidateSource({state,packet,readFile}={}){
 if(!state||!packet||!sha(packet.sourceXmlSha256)||
    !sha(packet.originalJsonSha256)||typeof readFile!=='function')
   fail('NATIVE_CANDIDATE_SOURCE_CUSTODY_REQUIRED');
 const sourceFileText=state.sourceFile?text(await readFile(state.sourceFile)):null;
 const sourceStateText=text(state.sourceText);
 if(state.sourceFile&&!sourceFileText)
   fail('NATIVE_CANDIDATE_SOURCE_XML_FILE_UNREADABLE');
 if(sourceFileText&&sourceStateText&&sourceFileText!==sourceStateText)
   fail('NATIVE_CANDIDATE_SOURCE_XML_CONFLICT');
 const sourceText=sourceFileText||sourceStateText;
 if(!sourceText.trim())fail('NATIVE_CANDIDATE_SOURCE_XML_REQUIRED');
 if(await digestUtf8(sourceText)!==packet.sourceXmlSha256)
   fail('NATIVE_CANDIDATE_SOURCE_XML_SHA_DRIFT');

 // JSON raw bytes are an OPTIONAL converter input here, not the source of
 // authority: the private O1 Blob and its SHA are independently attested by
 // the active GC-PW Worker which produced packet.originalJsonSha256.
 const stagedFileText=state.stagedJsonFile?text(await readFile(state.stagedJsonFile)):null;
 const stagedStateText=text(state.stagedJsonText);
 if(state.stagedJsonFile&&!stagedFileText)
   fail('NATIVE_CANDIDATE_STAGED_JSON_FILE_UNREADABLE');
 if(stagedFileText&&stagedStateText&&stagedFileText!==stagedStateText)
   fail('NATIVE_CANDIDATE_STAGED_JSON_CONFLICT');
 const stagedJsonText=stagedFileText||stagedStateText;
 if(stagedJsonText&&await digestUtf8(stagedJsonText)!==packet.originalJsonSha256)
   fail('NATIVE_CANDIDATE_STAGED_JSON_SHA_DRIFT');
 return Object.freeze({sourceText,stagedJsonText});
}
