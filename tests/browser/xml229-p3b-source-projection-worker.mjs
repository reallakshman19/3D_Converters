/** P3B.0 test-only Worker: consume ONE verified, bounded original BRANCH span.
 * Reuse the existing calculation index builders; never grant Preview or CII rights.
 */
import {buildStagedDtxrIndex} from '../../converters/xml-cii2019-core/dtxr-resolver.js';
import {buildStagedBranchWallEvidenceIndex} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js';
import {buildXmlCiiStagedGeometryIndex} from '../../converters/xml-cii2019-core/staged-geometry-authority.js';
self.onmessage=({data:m})=>{
  try{
    if(m?.kind!=='PROJECT_SINGLE_SOURCE_BRANCH'||!(m.bytes instanceof Uint8Array)||
      m.bytes.length<1||m.bytes.length>1048576||!m.sourceSha256||!m.occurrenceId||
      m.sourcePath!=='/0')throw Error('P3B_TEST_UNVERIFIED_SOURCE_SPAN');
    const branch=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(m.bytes));
    if(branch?.type!=='BRANCH'||!Array.isArray(branch.children))
      throw Error('P3B_TEST_NOT_ORIGINAL_BRANCH');
    const input=[branch];
    const dtxr=buildStagedDtxrIndex(input,{});
    const wall=buildStagedBranchWallEvidenceIndex(input);
    const geometry=buildXmlCiiStagedGeometryIndex(input);
    const key='1006649732/51228';
    const matches=dtxr.byComponentRefNo.get(key)||[];
    const witness=matches.find(item=>item?.dtxr==='ELBOW 90 DEG LR BW Sch 80');
    self.postMessage({kind:'SOURCE_BRANCH_PROJECTED',sourceSha256:m.sourceSha256,
      occurrenceId:m.occurrenceId,sourcePath:m.sourcePath,
      dtxrCount:dtxr.items.length,wallGroupCount:wall.size,
      geometryCount:geometry.count,componentRef:key,
      witnessedDtxr:witness?.dtxr||null,witnessBore:witness?.attrs?.ABORE||null,
      engineeringReady:false,rightsBasis:'SOURCE_FACTS_ONLY'});
  }catch(error){self.postMessage({kind:'FAILED',code:String(error?.message||error)});}
};
