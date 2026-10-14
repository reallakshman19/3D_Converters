/**
 * XML229 P3B.2A: SOURCE-ONLY calculation-input projection.
 *
 * Must run inside a Worker in browsers. Consumes a complete, source-attested
 * bounded batch from P3B.1, reuses the existing DTXR, wall and geometry
 * builders, and returns a small source-derived evidence projection.
 *
 * This is NOT an accepted 4 Preview, B1 fact, rating snapshot, GC-PW decision,
 * or CII release right. The protected B1 consumer is intentionally NOT wired.
 */
import {buildStagedDtxrIndex} from '../../../converters/xml-cii2019-core/dtxr-resolver.js';
import {buildStagedBranchWallEvidenceIndex} from '../ui-adapted/xml-cii-adapted-preview-wall-evidence.js';
import {buildXmlCiiStagedGeometryIndex} from '../../../converters/xml-cii2019-core/staged-geometry-authority.js';
import {
  XML229_BOUNDED_READ_SCHEMA,XML229_BOUNDED_READ_MAX_BATCH_BYTES,
  XML229_BOUNDED_READ_MAX_VALUE_BYTES,XML229_BOUNDED_READ_MAX_VALUES,
} from './xml229-bounded-original-read.mjs';

export const XML229_PREVIEW_PROJECTION_SCHEMA='XML229.StagedPreviewSourceProjection.v1';
const MAX_CONFIG_BYTES=1048576,MAX_OUTPUT_BYTES=1048576;
const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const encoder=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const selectedShaKeys=['xmlSha256','selectionSha256','configSha256','mastersSha256'];
const provenanceKeys=[
  'generationId','sourceRefId','sourceRevision','sha256','byteLength',
  'pageCount','occurrenceCount',...selectedShaKeys,
];
const text=x=>x===undefined||x===null?'':String(x);
const limited=x=>text(x).slice(0,1000);

async function attestConfig(config,manifest){
  if(!config||typeof config!=='object'||Array.isArray(config))
    fail('P3B_PROJECT_CONFIG_REQUIRED');
  let serial;
  try{serial=JSON.stringify(config);}catch{fail('P3B_PROJECT_CONFIG_UNSERIALIZABLE');}
  if(typeof serial!=='string'||encoder.encode(serial).byteLength>MAX_CONFIG_BYTES)
    fail('P3B_PROJECT_CONFIG_BOUND');
  if(!globalThis.crypto?.subtle)fail('P3B_PROJECT_CRYPTO_UNAVAILABLE');
  const digest=hex(await globalThis.crypto.subtle.digest('SHA-256',encoder.encode(serial)));
  if(digest!==manifest.configSha256)fail('P3B_PROJECT_CONFIG_STALE');
}
function validateManifest(m,values){
  if(m?.schema!==XML229_BOUNDED_READ_SCHEMA||m.complete!==true||
     m.rightsBasis!=='SOURCE_FACTS_ONLY'||m.engineeringReady!==false||
     !sha(m.sha256)||!m.sourceRevision?.endsWith(':sha256:'+m.sha256)||
     selectedShaKeys.some(k=>!sha(m[k]))||
     !Number.isSafeInteger(m.byteLength)||m.byteLength<1||
     !Number.isSafeInteger(m.pageCount)||m.pageCount<1||
     !Number.isSafeInteger(m.occurrenceCount)||m.occurrenceCount<1||
     !Array.isArray(m.requestedPaths)||m.requestedPaths.length<1||
     m.requestedPaths.length>XML229_BOUNDED_READ_MAX_VALUES||
     m.valueCount!==m.requestedPaths.length||
     !Array.isArray(values)||values.length!==m.valueCount)
    fail('P3B_PROJECT_MANIFEST_INVALID');
  if(new Set(m.requestedPaths).size!==m.requestedPaths.length)
    fail('P3B_PROJECT_DUPLICATE_SELECTION');
  let countBytes=0;
  for(let i=0;i<values.length;i++){
    const item=values[i],path=m.requestedPaths[i];
    if(item?.schema!==XML229_BOUNDED_READ_SCHEMA||
       item.complete!==false||item.engineeringReady!==false||
       item.rightsBasis!=='SOURCE_FACTS_ONLY'||
       provenanceKeys.some(k=>item[k]!==m[k])||
       item.path!==path||!/^\/(?:0|[1-9]\d*)$/.test(path)||
       item.sourceType!=='object'||
       item.occurrenceId!==JSON.stringify(['lfj-json-value/v1',m.sourceRefId,m.sourceRevision,path])||
       !(item.bytes instanceof Uint8Array)||
       item.valueByteLength!==item.bytes.length||
       item.valueByteLength<1||item.valueByteLength>XML229_BOUNDED_READ_MAX_VALUE_BYTES||
       !Number.isSafeInteger(item.startByte)||item.startByte<0||
       item.endByteExclusive-item.startByte!==item.valueByteLength||
       item.endByteExclusive>m.byteLength)
      fail('P3B_PROJECT_VALUE_INVALID');
    countBytes+=item.valueByteLength;
    if(countBytes>XML229_BOUNDED_READ_MAX_BATCH_BYTES)
      fail('P3B_PROJECT_BATCH_BOUND');
  }
  if(countBytes!==m.byteCount)fail('P3B_PROJECT_BYTE_CENSUS');
}

function candidate(item){
  const a=item.attrs||{};
  return {
    // Traversal path is NOT a qualified original JSON Pointer.
    traversalPath:limited(item._path),
    ref:limited(a.ComponentRefNo||a.COMPONENTREFNO||a.REF||a.NAME||item.component?.name),
    owner:limited(item.owner),
    stagedType:limited(item.type),
    dtxr:limited(item.dtxr),dtxrPs:limited(item.dtxrPs),
    supportGap:limited(item.cmpSupGap),
    boreText:limited(a.ABORE||a.LBORE||a.HBOR||a.TBOR||a.BORE),
  };
}
function mapProjection(map){
  return [...map.entries()].map(([key,val])=>({key,
    values:val.map(x=>({...x})),
  }));
}

/**
 * Requires exact root-level selected branch JSON Pointers such as "/0" or "/12".
 * Arbitrary child slices, overlapping branch/child, and implicit ALL scope are
 * refused. Membership in the user's selected XML Owner/site/zone is NOT
 * established by this function and must be proved by the protected B1 caller.
 */
export async function projectXml229SelectedPreviewSource({manifest,values,config={}}={}){
  if(typeof document!=='undefined')
    fail('P3B_PROJECT_BROWSER_MAIN_THREAD_FORBIDDEN');
  validateManifest(manifest,values);
  await attestConfig(config,manifest);
  const decoded=[];
  const decoder=new TextDecoder('utf-8',{fatal:true});
  for(const value of values){
    let branch;
    try{branch=JSON.parse(decoder.decode(value.bytes));}
    catch{fail('P3B_PROJECT_SOURCE_JSON_INVALID');}
    if(!branch||typeof branch!=='object'||Array.isArray(branch)||
       String(branch.type).toUpperCase()!=='BRANCH'||!Array.isArray(branch.children)||
       typeof branch.name!=='string'||!branch.name)
      fail('P3B_PROJECT_NOT_ORIGINAL_BRANCH');
    decoded.push(branch);
  }
  // Existing implementation is the ONLY engineering source interpretation.
  // This projection does not rebuild those algorithms or synthesize Match-1.
  const dtxr=buildStagedDtxrIndex(decoded,config);
  const wall=buildStagedBranchWallEvidenceIndex(decoded);
  const geometry=buildXmlCiiStagedGeometryIndex(decoded);
  const result={
    schema:XML229_PREVIEW_PROJECTION_SCHEMA,
    sourceManifestSchema:manifest.schema,
    ...Object.fromEntries(provenanceKeys.map(k=>[k,manifest[k]])),
    selectedOriginalPointers:manifest.requestedPaths.slice(),
    selectedOriginalOccurrenceIds:values.map(x=>x.occurrenceId),
    originalValueBytes:manifest.byteCount,
    // No implicit selection membership, no engineering approval.
    scopeMembershipVerified:false,consumerReady:false,
    completeSelectedSourceInputs:true,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
    dtxr:{count:dtxr.items.length,candidates:dtxr.items.map(candidate)},
    wall:{groupCount:wall.size,groups:mapProjection(wall)},
    geometry:{count:geometry.count,byRef:[...geometry.byRef.entries()].map(([ref,g])=>({
      ref,stagedType:limited(g.stagedType),branchName:limited(g.branchName),
      lengthMm:g.lengthMm,boreMm:g.boreMm,dtxr:limited(g.dtxr),
    }))},
  };
  const n=encoder.encode(JSON.stringify(result)).byteLength;
  if(n>MAX_OUTPUT_BYTES)fail('P3B_PROJECT_OUTPUT_BOUND');
  return Object.freeze({...result,outputByteLength:n});
}
